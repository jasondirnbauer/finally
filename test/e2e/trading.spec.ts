import { test, expect } from "@playwright/test";

test.describe("Trading", () => {
  test("buy shares — cash decreases, position appears", async ({ page }) => {
    await page.goto("/");

    // Wait for prices to be streaming
    await expect(page.getByText("Live")).toBeVisible({ timeout: 15_000 });

    // Wait for portfolio to load — get initial cash value from header
    await page.waitForTimeout(2000);
    const cashLocator = page.locator("header").getByText(/\$[\d,]+\.\d{2}/).nth(1);
    await expect(cashLocator).toBeVisible({ timeout: 10_000 });
    const initialCashText = await cashLocator.textContent();
    const initialCash = parseFloat(initialCashText!.replace(/[$,]/g, ""));

    // Fill in the trade bar
    const tickerInput = page.getByPlaceholder("Ticker", { exact: true });
    const qtyInput = page.getByPlaceholder("Qty");
    await tickerInput.fill("AAPL");
    await qtyInput.fill("5");

    // Click Buy
    await page.getByRole("button", { name: "Buy" }).click();

    // Wait for trade confirmation message (green text in trade bar)
    await expect(page.getByText(/BUY 5 AAPL/)).toBeVisible({ timeout: 10_000 });

    // Wait for portfolio to refresh
    await page.waitForTimeout(2000);

    // The cash balance in the header should be less than before
    const cashAfterText = await cashLocator.textContent();
    const cashAfter = parseFloat(cashAfterText!.replace(/[$,]/g, ""));
    expect(cashAfter).toBeLessThan(initialCash);
  });

  test("sell shares — cash increases after buying", async ({ page }) => {
    // Buy shares via API first to set up state
    const buyRes = await page.request.post("/api/portfolio/trade", {
      data: { ticker: "AAPL", side: "buy", quantity: 10 },
    });
    expect(buyRes.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.getByText("Live")).toBeVisible({ timeout: 15_000 });

    // Wait for portfolio to load
    await page.waitForTimeout(3000);

    // Record cash after buying
    const cashLocator = page.locator("header").getByText(/\$[\d,]+\.\d{2}/).nth(1);
    const cashBuyText = await cashLocator.textContent();
    const cashAfterBuyValue = parseFloat(cashBuyText!.replace(/[$,]/g, ""));

    // Now sell some shares via the UI
    const tickerInput = page.getByPlaceholder("Ticker", { exact: true });
    const qtyInput = page.getByPlaceholder("Qty");
    await tickerInput.fill("AAPL");
    await qtyInput.fill("5");
    // Use JS click in case of layout overlap
    const sellButton = page.getByRole("button", { name: "Sell" });
    await sellButton.evaluate((el: HTMLElement) => el.click());

    // Wait for trade confirmation
    await expect(page.getByText(/SELL 5 AAPL/)).toBeVisible({ timeout: 10_000 });

    // Wait for portfolio to refresh
    await page.waitForTimeout(3000);

    // Cash should have increased after selling
    const cashSellText = await cashLocator.textContent();
    const cashAfterSellValue = parseFloat(cashSellText!.replace(/[$,]/g, ""));

    expect(cashAfterSellValue).toBeGreaterThan(cashAfterBuyValue);
  });
});
