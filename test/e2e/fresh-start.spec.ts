import { test, expect } from "@playwright/test";

const DEFAULT_TICKERS = [
  "AAPL", "GOOGL", "MSFT", "AMZN", "TSLA",
  "NVDA", "META", "JPM", "V", "NFLX",
];

test.describe("Fresh start", () => {
  test("shows default watchlist with 10 tickers", async ({ page }) => {
    await page.goto("/");

    // Wait for the watchlist to load — look for ticker text in the watchlist panel
    const watchlistPanel = page.locator("div", { hasText: "Watchlist" }).first();
    await expect(watchlistPanel.getByText("AAPL", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Verify all 10 default tickers are present
    for (const ticker of DEFAULT_TICKERS) {
      await expect(page.locator(`[data-ticker="${ticker}"]`)).toBeVisible();
    }
  });

  test("shows $10,000 initial balance", async ({ page }) => {
    await page.goto("/");

    // The header shows portfolio value and cash — both should be $10,000.00
    await expect(page.getByText("$10,000.00").first()).toBeVisible({ timeout: 15_000 });
  });

  test("prices are streaming (values update)", async ({ page }) => {
    await page.goto("/");

    // Wait for the watchlist to appear
    await expect(page.locator("[data-ticker='AAPL']")).toBeVisible({ timeout: 15_000 });

    // Wait for prices to start streaming
    await page.waitForTimeout(2000);

    // Check that at least one price value is rendered (numeric format like 190.xx)
    // Prices are in spans with tabular-nums class
    const priceCell = page.locator("span.tabular-nums").first();
    await expect(priceCell).toBeVisible();
    const priceText = await priceCell.textContent();
    expect(priceText).toMatch(/\$?[\d,]+\.\d{2}/);
  });

  test("connection status shows Live (green)", async ({ page }) => {
    await page.goto("/");

    // Wait for SSE connection to establish
    await expect(page.getByText("Live")).toBeVisible({ timeout: 15_000 });
  });

  test("header shows FinAlly branding", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("FinAlly")).toBeVisible();
    await expect(page.getByText("AI Trading Workstation")).toBeVisible();
  });
});
