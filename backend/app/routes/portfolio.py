"""Portfolio API endpoints."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db import (
    get_cash_balance,
    get_portfolio_history,
    get_positions,
)

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class TradeRequest(BaseModel):
    ticker: str
    side: str  # "buy" or "sell"
    quantity: float


@router.get("")
async def get_portfolio(request: Request):
    """Current positions, cash balance, total value, unrealized P&L."""
    cache = request.app.state.price_cache
    positions = await get_positions()
    cash = await get_cash_balance()

    enriched = []
    total_market_value = 0.0
    total_unrealized_pnl = 0.0

    for pos in positions:
        current_price = cache.get_price(pos["ticker"]) or pos["avg_cost"]
        market_value = current_price * pos["quantity"]
        cost_basis = pos["avg_cost"] * pos["quantity"]
        unrealized_pnl = market_value - cost_basis
        pnl_percent = (unrealized_pnl / cost_basis * 100) if cost_basis else 0.0

        enriched.append({
            "ticker": pos["ticker"],
            "quantity": pos["quantity"],
            "avg_cost": pos["avg_cost"],
            "current_price": current_price,
            "market_value": round(market_value, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "pnl_percent": round(pnl_percent, 2),
        })

        total_market_value += market_value
        total_unrealized_pnl += unrealized_pnl

    total_value = cash + total_market_value

    return {
        "positions": enriched,
        "cash": round(cash, 2),
        "total_market_value": round(total_market_value, 2),
        "total_value": round(total_value, 2),
        "unrealized_pnl": round(total_unrealized_pnl, 2),
    }


@router.post("/trade")
async def execute_trade(trade: TradeRequest, request: Request):
    """Execute a market order via TradeService (atomic, race-condition-free)."""
    cache = request.app.state.price_cache
    trade_service = request.app.state.trade_service
    ticker = trade.ticker.upper()
    side = trade.side.lower()
    quantity = trade.quantity

    if side not in ("buy", "sell"):
        raise HTTPException(status_code=400, detail="side must be 'buy' or 'sell'")
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be positive")

    # Price check — fail fast before acquiring DB lock
    if cache.get_price(ticker) is None:
        raise HTTPException(status_code=400, detail=f"No price available for {ticker}")

    result = await trade_service.execute_trade(ticker, side, quantity)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    # Return same shape as before for frontend compatibility
    new_cash = await get_cash_balance()
    positions = await get_positions()
    total_value = new_cash + sum(
        (cache.get_price(p["ticker"]) or p["avg_cost"]) * p["quantity"]
        for p in positions
    )
    trade_record = {
        "id": "",
        "ticker": ticker,
        "side": side,
        "quantity": quantity,
        "price": result.price,
        "executed_at": "",
    }
    return {
        "trade": trade_record,
        "cash": round(new_cash, 2),
        "total_value": round(total_value, 2),
    }


@router.get("/history")
async def portfolio_history():
    """Portfolio value snapshots over time."""
    snapshots = await get_portfolio_history()
    return {"snapshots": snapshots}
