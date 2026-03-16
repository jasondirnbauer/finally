import { test, expect } from "@playwright/test";

test.describe("Portfolio display", () => {
  test("P&L chart area renders", async ({ page }) => {
    await page.goto("/");

    // The P&L section label should be visible (uppercase span text)
    await expect(page.getByText("P&L")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("heatmap and positions areas render", async ({ page }) => {
    await page.goto("/");

    // Either the heatmap empty state or the heatmap label should be visible
    const heatmapEmpty = page.getByText("No positions to display");
    const heatmapLabel = page.getByText("Heatmap");
    await expect(heatmapEmpty.or(heatmapLabel).first()).toBeVisible({ timeout: 15_000 });
  });

  test("positions table shows data after a trade", async ({ page }) => {
    // Execute a buy via API to ensure there's at least one position
    const res = await page.request.post("/api/portfolio/trade", {
      data: { ticker: "MSFT", side: "buy", quantity: 3 },
    });
    expect(res.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.getByText("Live")).toBeVisible({ timeout: 15_000 });

    // Wait for portfolio data to load
    await page.waitForTimeout(3000);

    // The Positions label should be visible
    await expect(page.getByText("Positions")).toBeVisible({
      timeout: 10_000,
    });

    // MSFT should appear in the positions table
    const positionsTable = page.locator("table").filter({ hasText: "Qty" });
    await expect(positionsTable.getByText("MSFT")).toBeVisible({ timeout: 10_000 });
  });
});
