import { test, expect } from '@playwright/test';

test.describe('LucidKeeper Trading Terminal E2E Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to hydrate — the footer version string is unique
    await expect(page.getByText(/LucidKeeper v1\.0\.0/)).toBeVisible({ timeout: 10000 });
  });

  test('Flow 1: Header renders testnet badge, network, and market dropdown', async ({ page }) => {
    // Chain ID badge in header — "Somnia (50383)" is unique; use exact text
    await expect(page.getByText('Somnia (50383)', { exact: true })).toBeVisible();

    // Market button in header has aria-label="Select perpetual market"
    const headerMarketBtn = page.getByRole('button', { name: 'Select perpetual market' });
    await expect(headerMarketBtn).toBeVisible();

    // MARK PRICE HUD label — scope to the banner to avoid the table column header
    await expect(page.getByRole('banner').getByText('MARK PRICE', { exact: true })).toBeVisible();

    // Click market dropdown to open
    await headerMarketBtn.click();
    await expect(page.getByText('21 Perp Markets')).toBeVisible();

    // Close dropdown with Escape
    await page.keyboard.press('Escape');
  });

  test('Flow 2: Trading Box order controls and validation', async ({ page }) => {
    // Actual button text is "Long / Buy" and "Short / Sell"
    const buyTab = page.getByRole('button', { name: 'Long / Buy' });
    const sellTab = page.getByRole('button', { name: 'Short / Sell' });
    await expect(buyTab).toBeVisible();
    await expect(sellTab).toBeVisible();

    // Click Sell / Short
    await sellTab.click();

    // Market (IOC) and Limit buttons
    await expect(page.getByRole('button', { name: 'Market (IOC)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Limit' })).toBeVisible();

    // Switch to Limit — price input appears
    await page.getByRole('button', { name: 'Limit' }).click();
    await expect(page.getByText('Limit Price')).toBeVisible();

    // Switch back to Market
    await page.getByRole('button', { name: 'Market (IOC)' }).click();
    await expect(page.getByText('Order Size')).toBeVisible();

    // Submit button — in disconnected state shows "Open Long/Short"
    const orderBtns = page.getByRole('button', { name: /Open (Long|Short)/i });
    await expect(orderBtns.first()).toBeVisible();
  });

  test('Flow 3: LucidKeeper Risk Guardian HUD & Simulation disclaimer', async ({ page }) => {
    // Health Factor indicator
    await expect(page.getByText(/Health Factor/i)).toBeVisible();

    // What-If Simulation disclaimer
    await expect(
      page.getByText(/What-If.*Simulation|Hypothetical Only/i)
    ).toBeVisible();

    // Tab-Active Guard notice or subtitle
    await expect(
      page.getByText(/tab.*open|open.*tab|requires.*tab|Active Tab Required/i).first()
    ).toBeVisible();
  });

  test('Flow 4: Margin Hub Modal opens and closes', async ({ page }) => {
    // Click Margin Hub button in header
    await page.getByRole('button', { name: /Margin Hub/i }).click();

    // Modal title
    await expect(page.getByRole('heading', { name: /MarginBank Collateral Hub/i })).toBeVisible();

    // Tabs inside modal: Deposit Margin / Withdraw Margin
    await expect(page.getByRole('button', { name: 'Deposit Margin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Withdraw Margin' })).toBeVisible();

    // Close button
    await page.getByRole('button', { name: 'Close Margin Hub' }).click();
    await expect(page.getByRole('heading', { name: /MarginBank Collateral Hub/i })).not.toBeVisible();
  });

  test('Flow 5: Positions Table handles empty state or active position cards', async ({ page }) => {
    // Check positions table view
    const cardBtn = page.getByRole('button', { name: 'Card' });
    const hasPosition = (await cardBtn.count()) > 0;

    if (hasPosition) {
      await cardBtn.first().click();
      await expect(page.getByText('Share Verifiable Perp Trade on X')).toBeVisible({ timeout: 5000 });
      const canvas = page.locator('canvas.w-full.h-auto');
      await expect(canvas).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Close Trade Card' }).click();
    } else {
      // Truthful zero-mock display when no active positions are on-chain
      await expect(page.getByText(/No open positions/i)).toBeVisible();
    }
  });

  test('Flow 6: Positions, Active Orders and Trade History tabs switch correctly', async ({ page }) => {
    const openPositionsTab = page.getByRole('button', { name: /Open Positions/i });
    const activeOrdersTab = page.getByRole('button', { name: /Active Orders/i });
    const tradeHistoryTab = page.getByRole('button', { name: /Trade History/i });

    await expect(openPositionsTab).toBeVisible();
    await expect(activeOrdersTab).toBeVisible();
    await expect(tradeHistoryTab).toBeVisible();

    // Switch to Active Orders
    await activeOrdersTab.click();
    await expect(
      page.getByText(/No resting limit orders on Somnia Tokyo book/i)
    ).toBeVisible({ timeout: 5000 });

    // Switch to Trade History
    await tradeHistoryTab.click();
    await expect(tradeHistoryTab).toBeVisible();
  });
});
