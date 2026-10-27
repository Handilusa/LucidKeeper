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

    // Market button shows BTC-PERP by default
    await expect(page.getByRole('button', { name: /BTC-PERP/i })).toBeVisible();

    // MARK PRICE HUD label — scope to the banner to avoid the table column header
    await expect(page.getByRole('banner').getByText('MARK PRICE', { exact: true })).toBeVisible();

    // Click market dropdown to open
    const marketBtn = page.getByRole('button', { name: /BTC-PERP/i }).first();
    await marketBtn.click();
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

    // Submit button — in disconnected state shows "Open Long/Short 0.00013 BTC"
    // The button is present and shows some "Open" state based on real code
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

    // Tab-must-be-open disclaimer for SL/TP
    await expect(
      page.getByText(/tab.*open|open.*tab|requires.*tab|Active Tab Required/i)
    ).toBeVisible();
  });

  test('Flow 4: Margin Hub Modal opens and closes', async ({ page }) => {
    // The header button text is "Margin Hub ⚡"
    const marginHubBtn = page.getByRole('button', { name: /Margin Hub/i });
    await expect(marginHubBtn).toBeVisible();
    await marginHubBtn.click();

    // Modal heading is "MarginBank Collateral Hub"
    await expect(page.getByRole('heading', { name: /MarginBank Collateral Hub/i })).toBeVisible();

    // "Deposit Margin" tab button is unique (the other is "Deposit 2.0 USDso" — the action btn)
    await expect(page.getByRole('button', { name: 'Deposit Margin' })).toBeVisible();

    // Close with the accessible close button
    await page.getByRole('button', { name: 'Close Margin Hub' }).click();
    await expect(page.getByRole('heading', { name: /MarginBank Collateral Hub/i })).not.toBeVisible();
  });

  test('Flow 5: Share Card – BTC Long position row and Card button visible', async ({ page }) => {
    // Positions table — cell "LONG 5.2x BTC-PERP" from actual DOM error output
    await expect(page.getByRole('cell', { name: /LONG.*BTC-PERP/i })).toBeVisible();

    // Card button in the positions table row
    const cardBtn = page.getByRole('button', { name: 'Card' });
    await expect(cardBtn.first()).toBeVisible();

    // Click it
    await cardBtn.first().click();

    // Canvas modal opens, "Share Verifiable Perp Trade on X" heading
    await expect(page.getByText('Share Verifiable Perp Trade on X')).toBeVisible({ timeout: 5000 });
    // The share canvas is uniquely identified by its class — 1200x675 px card
    const canvas = page.locator('canvas.w-full.h-auto');
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Close
    await page.getByRole('button', { name: 'Close Trade Card' }).click();
  });

  test('Flow 6: Positions and Orders tabs switch correctly', async ({ page }) => {
    // Tab buttons — these are actual button texts from PositionsTable.tsx
    const openPositionsTab = page.getByRole('button', { name: /Open Positions/i });
    const activeOrdersTab = page.getByRole('button', { name: /Active Orders/i });
    const tradeHistoryTab = page.getByRole('button', { name: /Trade History/i });

    await expect(openPositionsTab).toBeVisible();
    await expect(activeOrdersTab).toBeVisible();
    await expect(tradeHistoryTab).toBeVisible();

    // Switch to Active Orders
    await activeOrdersTab.click();
    // Exact text from PositionsTable.tsx line 205
    await expect(page.getByText('No resting limit orders on Somnia Tokyo book.')).toBeVisible({ timeout: 5000 });

    // Switch to Trade History
    await tradeHistoryTab.click();
    // Trade History section
    await expect(page.getByText(/Verified On-Chain Fills|Trade History|verified/i)).toBeVisible({ timeout: 5000 });
  });
});
