"""Tests for TradeService — TDD suite covering atomic trades, watchlist sync, and snapshots."""

import pytest
import pytest_asyncio

from app.db.connection import init_db, set_db_path
from app.market.cache import PriceCache
from app.services.trade_service import TradeResult, TradeService


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


class MockSource:
    """Minimal MarketDataSource stub that tracks calls."""

    def __init__(self) -> None:
        self.add_calls: list[str] = []
        self.remove_calls: list[str] = []

    async def add_ticker(self, ticker: str) -> None:
        self.add_calls.append(ticker)

    async def remove_ticker(self, ticker: str) -> None:
        self.remove_calls.append(ticker)


@pytest_asyncio.fixture
async def test_db(tmp_path):
    """Isolated SQLite DB for each test."""
    db_path = str(tmp_path / "test.db")
    set_db_path(db_path)
    await init_db()
    yield db_path
    set_db_path(None)  # reset


@pytest.fixture
def price_cache() -> PriceCache:
    cache = PriceCache()
    cache.update("AAPL", 190.50)
    cache.update("GOOGL", 175.25)
    return cache


@pytest.fixture
def mock_source() -> MockSource:
    return MockSource()


@pytest_asyncio.fixture
async def trade_service(test_db, price_cache, mock_source) -> TradeService:
    return TradeService(price_cache=price_cache, market_source=mock_source)


# ---------------------------------------------------------------------------
# TestAtomicTrade
# ---------------------------------------------------------------------------


class TestAtomicTrade:
    @pytest.mark.asyncio
    async def test_buy(self, trade_service, price_cache):
        result = await trade_service.execute_trade("AAPL", "buy", 5)
        assert result.success is True
        assert result.ticker == "AAPL"
        assert result.side == "buy"
        assert result.quantity == 5
        assert result.price == 190.50

    @pytest.mark.asyncio
    async def test_buy_deducts_cash_and_creates_position(self, trade_service):
        from app.db.repository import get_cash_balance, get_positions

        await trade_service.execute_trade("AAPL", "buy", 5)
        cash = await get_cash_balance()
        assert abs(cash - (10000.0 - 5 * 190.50)) < 0.01

        positions = await get_positions()
        aapl = next((p for p in positions if p["ticker"] == "AAPL"), None)
        assert aapl is not None
        assert aapl["quantity"] == 5

    @pytest.mark.asyncio
    async def test_sell(self, trade_service):
        from app.db.repository import get_cash_balance

        # First buy 10 shares
        await trade_service.execute_trade("AAPL", "buy", 10)
        cash_after_buy = await get_cash_balance()

        # Then sell 5
        result = await trade_service.execute_trade("AAPL", "sell", 5)
        assert result.success is True

        cash_after_sell = await get_cash_balance()
        assert cash_after_sell > cash_after_buy  # cash increases on sell

        from app.db.repository import get_positions
        positions = await get_positions()
        aapl = next((p for p in positions if p["ticker"] == "AAPL"), None)
        assert aapl is not None
        assert aapl["quantity"] == 5

    @pytest.mark.asyncio
    async def test_sell_all_clears_position(self, trade_service):
        from app.db.repository import get_positions

        await trade_service.execute_trade("AAPL", "buy", 5)
        result = await trade_service.execute_trade("AAPL", "sell", 5)
        assert result.success is True

        positions = await get_positions()
        aapl = next((p for p in positions if p["ticker"] == "AAPL"), None)
        assert aapl is None  # position deleted

    @pytest.mark.asyncio
    async def test_buy_insufficient_cash(self, trade_service):
        from app.db.repository import get_cash_balance, get_positions

        result = await trade_service.execute_trade("AAPL", "buy", 10000)
        assert result.success is False
        assert "Insufficient cash" in result.error

        cash = await get_cash_balance()
        assert cash == 10000.0  # unchanged

        positions = await get_positions()
        assert positions == []  # no position created

    @pytest.mark.asyncio
    async def test_sell_insufficient_shares(self, trade_service):
        from app.db.repository import get_cash_balance

        result = await trade_service.execute_trade("AAPL", "sell", 999)
        assert result.success is False
        assert "Insufficient shares" in result.error

        cash = await get_cash_balance()
        assert cash == 10000.0  # unchanged

    @pytest.mark.asyncio
    async def test_no_price_available(self, trade_service):
        from app.db.repository import get_cash_balance

        result = await trade_service.execute_trade("ZZZZ", "buy", 1)
        assert result.success is False
        assert "No price" in result.error

        cash = await get_cash_balance()
        assert cash == 10000.0  # unchanged

    @pytest.mark.asyncio
    async def test_buy_avg_cost_update(self, trade_service):
        from app.db.repository import get_positions

        # Buy 10 shares at 190.50, then 10 more at same price
        await trade_service.execute_trade("AAPL", "buy", 10)
        await trade_service.execute_trade("AAPL", "buy", 10)

        positions = await get_positions()
        aapl = next(p for p in positions if p["ticker"] == "AAPL")
        assert aapl["quantity"] == 20
        assert abs(aapl["avg_cost"] - 190.50) < 0.01


# ---------------------------------------------------------------------------
# TestWatchlistSync
# ---------------------------------------------------------------------------


class TestWatchlistSync:
    @pytest.mark.asyncio
    async def test_add_ticker(self, trade_service, mock_source):
        from app.db.repository import get_watchlist

        await trade_service.add_watchlist_ticker("PYPL")

        wl = await get_watchlist()
        tickers = [e["ticker"] for e in wl]
        assert "PYPL" in tickers

        assert mock_source.add_calls == ["PYPL"]

    @pytest.mark.asyncio
    async def test_remove_ticker(self, trade_service, mock_source, price_cache):
        from app.db.repository import get_watchlist

        # AAPL is seeded in default watchlist; add to cache
        price_cache.update("AAPL", 190.50)

        result = await trade_service.remove_watchlist_ticker("AAPL")
        assert result is True

        wl = await get_watchlist()
        tickers = [e["ticker"] for e in wl]
        assert "AAPL" not in tickers

        assert mock_source.remove_calls == ["AAPL"]
        assert price_cache.get_price("AAPL") is None  # cache cleared

    @pytest.mark.asyncio
    async def test_remove_nonexistent(self, trade_service, mock_source):
        result = await trade_service.remove_watchlist_ticker("ZZZZ")
        assert result is False
        assert mock_source.remove_calls == []  # NOT called


# ---------------------------------------------------------------------------
# TestSnapshot
# ---------------------------------------------------------------------------


class TestSnapshot:
    @pytest.mark.asyncio
    async def test_snapshot_after_trade(self, trade_service):
        from app.db.repository import get_portfolio_history, get_cash_balance

        await trade_service.execute_trade("AAPL", "buy", 5)

        history = await get_portfolio_history()
        assert len(history) > 0

        cash = await get_cash_balance()
        # total_value should be close to cash + position value
        last = history[-1]
        expected = cash + 5 * 190.50
        assert abs(last["total_value"] - expected) < 1.0

    @pytest.mark.asyncio
    async def test_no_snapshot_on_failure(self, trade_service):
        from app.db.repository import get_portfolio_history

        # Try to buy 10000 shares — will fail insufficient cash
        await trade_service.execute_trade("AAPL", "buy", 10000)

        history = await get_portfolio_history()
        assert history == []  # no snapshot on failure
