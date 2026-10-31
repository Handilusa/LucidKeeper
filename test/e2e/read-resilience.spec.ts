import { test, expect } from '@playwright/test';
import { mockWallet } from './mock-wallet';

test('HTTP 429 produces unavailable chart, respects server cooldown and polling recovers', async ({ page }) => {
  await page.clock.install();
  const state = await mockWallet(page); state.indexerStatus = 429; state.indexerRetryAfter = '60';
  await page.goto('/app');
  await expect.poll(() => state.candleCalls).toBe(1);
  await page.clock.fastForward(2000);
  await expect(page.getByRole('button', { name: 'Retry chart', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retry chart', exact: true }).click();
  expect(state.candleCalls).toBe(1);
  state.indexerStatus = 0;
  await page.clock.fastForward(61000);
  // The normal 15s poll may already have recovered after the clock advances.
  await expect(page.locator('.chart-ohlc time')).toBeVisible();
  expect(state.writes).toEqual([]);
  expect(state.rpcBatches.some(size => size > 1)).toBe(true);
});

test('hung chart read times out rather than invents prices, then retry recovers', async ({ page }) => {
  await page.clock.install();
  const state = await mockWallet(page); state.candleHang = true;
  await page.goto('/app'); await expect.poll(() => state.candleCalls).toBe(1);
  await page.clock.fastForward(13000);
  await expect(page.getByRole('button', { name: 'Retry chart', exact: true })).toBeVisible();
  await expect(page.locator('.chart-ohlc time')).toHaveCount(0);
  state.candleHang = false;
  await page.getByRole('button', { name: 'Retry chart', exact: true }).click();
  await expect(page.locator('.chart-ohlc time')).toBeVisible();
  expect(state.writes).toEqual([]);
});
