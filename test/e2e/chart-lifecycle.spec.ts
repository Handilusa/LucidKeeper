import { test, expect } from '@playwright/test';
import { A, mockWallet, connectMock } from './mock-wallet';

test('switching away from a test position disposes chart overlays cleanly', async ({ page }) => {
  const state = await mockWallet(page); state.accounts[A].size = 10000n;
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await connectMock(page);
  const select = async (symbol: string) => {
    await page.getByRole('combobox', { name: 'Select perpetual market' }).click();
    await page.getByRole('option', { name: `${symbol}-PERP`, exact: true }).click();
    await expect(page.getByRole('group', { name: `${symbol} execution candlesticks`, exact: true })).toBeVisible();
    await expect(page.locator('.chart-ohlc time')).toBeVisible();
  };
  for (let cycle = 0; cycle < 2; cycle++) {
    await select('BTC');
    await expect(page.locator('.chart-reference [title^="Portfolio snapshot block"]')).toContainText('Entry');
    await select('ETH');
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.getByRole('button', { name: 'Reset chart view' }).click();
  }
  expect(errors).toEqual([]); expect(state.writes).toEqual([]);
});
