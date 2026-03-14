"""Shared trade execution service — atomic transactions, snapshot recording, watchlist sync."""

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from app.db.connection import get_db_transaction
from app.db.repository import (
    add_to_watchlist,
    get_cash_balance,
    get_positions,
    insert_snapshot,
    remove_from_watchlist,
)
from app.db.schema import DEFAULT_USER_ID
from app.market.cache import PriceCache
from app.market.interface import MarketDataSource

logger = logging.getLogger(__name__)


@dataclass
class TradeResult:
    success: bool
    ticker: str
    side: str
    quantity: float
    price: float | None = None
    error: str | None = None


class TradeService:
    def __init__(self, price_cache: PriceCache, market_source: MarketDataSource) -> None:
        self._cache = price_cache
        self._source = market_source

    async def execute_trade(
        self,
        ticker: str,
        side: Literal["buy", "sell"],
        quantity: float,
        user_id: str = DEFAULT_USER_ID,
    ) -> TradeResult:
        """Execute a trade atomically using BEGIN IMMEDIATE. Returns TradeResult."""
        ticker = ticker.upper()
        side = side.lower()

        current_price = self._cache.get_price(ticker)
        if current_price is None:
            return TradeResult(
                success=False, ticker=ticker, side=side, quantity=quantity,
                error=f"No price available for {ticker}",
            )

        try:
            async with get_db_transaction() as db:
                # Read cash inside the transaction — no other writer can change it
                cursor = await db.execute(
                    "SELECT cash_balance FROM users_profile WHERE id = ?", (user_id,)
                )
                row = await cursor.fetchone()
                cash = row["cash_balance"] if row else 0.0

                now = datetime.now(timezone.utc).isoformat()
                trade_id = str(uuid.uuid4())

                if side == "buy":
                    cost = current_price * quantity
                    if cost > cash:
                        return TradeResult(
                            success=False, ticker=ticker, side=side, quantity=quantity,
                            error=f"Insufficient cash. Need ${cost:.2f}, have ${cash:.2f}",
                        )

                    await db.execute(
                        "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
                        (cash - cost, user_id),
                    )

                    # Upsert position inline (same connection — atomic)
                    cursor = await db.execute(
                        "SELECT id, quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
                        (user_id, ticker),
                    )
                    existing = await cursor.fetchone()
                    if existing:
                        total_qty = existing["quantity"] + quantity
                        total_cost = (existing["avg_cost"] * existing["quantity"]) + cost
                        new_avg = total_cost / total_qty
                        await db.execute(
                            "UPDATE positions SET quantity = ?, avg_cost = ?, updated_at = ? WHERE id = ?",
                            (total_qty, new_avg, now, existing["id"]),
                        )
                    else:
                        await db.execute(
                            "INSERT INTO positions (id, user_id, ticker, quantity, avg_cost, updated_at) "
                            "VALUES (?, ?, ?, ?, ?, ?)",
                            (str(uuid.uuid4()), user_id, ticker, quantity, current_price, now),
                        )

                else:  # sell
                    cursor = await db.execute(
                        "SELECT id, quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?",
                        (user_id, ticker),
                    )
                    existing = await cursor.fetchone()
                    held = existing["quantity"] if existing else 0
                    if not existing or held < quantity:
                        return TradeResult(
                            success=False, ticker=ticker, side=side, quantity=quantity,
                            error=f"Insufficient shares. Have {held}, trying to sell {quantity}",
                        )

                    proceeds = current_price * quantity
                    await db.execute(
                        "UPDATE users_profile SET cash_balance = ? WHERE id = ?",
                        (cash + proceeds, user_id),
                    )

                    remaining = existing["quantity"] - quantity
                    if remaining > 0:
                        await db.execute(
                            "UPDATE positions SET quantity = ?, updated_at = ? WHERE id = ?",
                            (remaining, now, existing["id"]),
                        )
                    else:
                        await db.execute(
                            "DELETE FROM positions WHERE id = ?", (existing["id"],)
                        )

                # Record trade within the same transaction
                await db.execute(
                    "INSERT INTO trades (id, user_id, ticker, side, quantity, price, executed_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (trade_id, user_id, ticker, side, quantity, current_price, now),
                )
                # commit happens on context manager exit

        except Exception:
            logger.exception("Trade execution failed for %s %s x%s", side, ticker, quantity)
            return TradeResult(
                success=False, ticker=ticker, side=side, quantity=quantity,
                error="Trade execution failed due to a database error",
            )

        # Record snapshot AFTER commit (separate connection — intentional)
        await self._record_snapshot(user_id)

        return TradeResult(
            success=True, ticker=ticker, side=side, quantity=quantity, price=current_price
        )

    async def _record_snapshot(self, user_id: str = DEFAULT_USER_ID) -> None:
        """Record portfolio value snapshot. Non-critical — errors logged, not raised."""
        try:
            cash = await get_cash_balance(user_id)
            positions = await get_positions(user_id)
            total_value = cash + sum(
                (self._cache.get_price(p["ticker"]) or p["avg_cost"]) * p["quantity"]
                for p in positions
            )
            await insert_snapshot(round(total_value, 2), user_id)
        except Exception:
            logger.exception("Failed to record portfolio snapshot after trade")

    async def add_watchlist_ticker(self, ticker: str, user_id: str = DEFAULT_USER_ID) -> dict:
        """Add ticker to DB and sync to market data source."""
        ticker = ticker.upper()
        entry = await add_to_watchlist(ticker, user_id)
        await self._source.add_ticker(ticker)
        return entry

    async def remove_watchlist_ticker(self, ticker: str, user_id: str = DEFAULT_USER_ID) -> bool:
        """Remove ticker from DB, market source, and price cache."""
        ticker = ticker.upper()
        removed = await remove_from_watchlist(ticker, user_id)
        if removed:
            await self._source.remove_ticker(ticker)
            self._cache.remove(ticker)
        return removed
