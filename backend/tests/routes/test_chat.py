"""Tests for chat endpoint."""

import pytest


class TestChat:
    @pytest.fixture(autouse=True)
    def set_mock_mode(self, monkeypatch):
        monkeypatch.setenv("LLM_MOCK", "true")

    async def test_send_message(self, client):
        resp = await client.post("/api/chat", json={"message": "Hello"})
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        assert data["trades"] == []
        assert data["watchlist_changes"] == []

    async def test_chat_history(self, client):
        await client.post("/api/chat", json={"message": "Hello"})
        resp = await client.get("/api/chat/history")
        assert resp.status_code == 200
        messages = resp.json()["messages"]
        assert len(messages) == 2  # user + assistant
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "Hello"
        assert messages[1]["role"] == "assistant"

    async def test_chat_buy_trade(self, client):
        resp = await client.post("/api/chat", json={"message": "buy 5 AAPL"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["trades"]) == 1
        assert data["trades"][0]["status"] == "executed"
        assert data["trades"][0]["ticker"] == "AAPL"

    async def test_chat_watchlist_change(self, client):
        resp = await client.post("/api/chat", json={"message": "watch PYPL"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["watchlist_changes"]) == 1
        assert data["watchlist_changes"][0]["status"] == "done"
        assert data["watchlist_changes"][0]["ticker"] == "PYPL"
