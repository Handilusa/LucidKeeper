import { test, expect } from '@playwright/test';
import { terminalFixture, assertReadOnly, assertDisconnectedAccount } from './terminal-fixture';

for (const width of [375, 1440]) {
  test(`disconnected markets stay public, account data stays empty at ${width}px`, async ({ page }, testInfo) => {
    const state = await terminalFixture(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/app');
    await expect(page.locator('.chart-ohlc time')).toBeVisible();
    await assertDisconnectedAccount(page, state, width >= 1024);
    if (width < 1024) await page.getByRole('navigation', { name: 'Trading workspace' }).getByRole('button', { name: 'Activity', exact: true }).click();
    await assertDisconnectedAccount(page, state);
    for (const tab of ['Open orders', 'Trade history', 'Positions']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.getByText('Connect your wallet to view your activity', { exact: true })).toBeVisible();
      await expect(page.locator('.history-row, .trading-table tbody tr')).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: 'Refresh activity', exact: true })).toBeDisabled();
    await page.locator('.account-summary').getByRole('button', { name: /^Manage collateral/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Manage collateral' });
    await expect(dialog.locator('.account-values dd')).toHaveText(['— USDso', '— USDso']);
    await expect(dialog.getByRole('button', { name: 'Connect your wallet first' })).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.screenshot({ path: testInfo.outputPath(`account-disconnected-${width}.png`), fullPage: true });

    await page.goto('/app/profile');
    await expect(page.getByRole('heading', { name: 'Connect your wallet to view your portfolio' })).toBeVisible();
    await expect(page.locator('.profile-identity, .account-metrics, .profile-table, .profile-chart-panel')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Download share image' })).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('0x1420');
    await page.getByRole('region', { name: 'Wallet connection required' }).getByRole('button', { name: 'Connect wallet', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.screenshot({ path: testInfo.outputPath(`profile-disconnected-${width}.png`), fullPage: true });
    expect(state.accountRequests).toEqual([]);
    await assertReadOnly(state);
  });
}

test('a legacy market-only leverage preference is neither loaded nor overwritten without a wallet', async ({ page }) => {
  const state = await terminalFixture(page);
  await page.goto('/app');
  const legacy = 'lucidkeeper_leverage_0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0';
  await page.evaluate(key => localStorage.setItem(key, '17'), legacy);
  await page.reload();
  await expect(page.locator('.leverage-field strong')).toHaveText('5×');
  await page.getByRole('button', { name: '10×', exact: true }).click();
  await expect(page.locator('.leverage-field strong')).toHaveText('10×');
  expect(await page.evaluate(key => localStorage.getItem(key), legacy)).toBe('17');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /lucidkeeper_leverage_50383_/.test(key)))).toEqual([]);
  await page.reload();
  await expect(page.locator('.leverage-field strong')).toHaveText('5×');
  expect(state.accountRequests).toEqual([]);
  await assertReadOnly(state);
});
