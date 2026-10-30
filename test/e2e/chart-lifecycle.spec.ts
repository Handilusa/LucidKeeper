import { test, expect } from '@playwright/test';
import { ALL_VERIFIED_PERP_MARKETS } from '../../src/lib/data/markets';
import { terminalFixture, assertObservedPortfolio, assertReadOnly } from './terminal-fixture';

test('switching away from an observed position disposes chart overlays cleanly', async ({ page }, testInfo) => {
  const state = await terminalFixture(page);
  await page.goto('/app');
  const snapshot = await assertObservedPortfolio(page, state);
  const openPool = Object.entries(snapshot.positions).find(([, size]) => BigInt(size) !== 0n)?.[0];
  test.skip(!openPool, 'No real open position available to exercise overlay disposal.');
  const active = ALL_VERIFIED_PERP_MARKETS.find(market => market.poolAddress.toLowerCase() === openPool)!;
  const other = ALL_VERIFIED_PERP_MARKETS.find(market => market.poolAddress !== active.poolAddress)!;
  const select = async (symbol: string) => {
    await page.getByRole('combobox', { name: 'Select perpetual market' }).click();
    await page.getByRole('option', { name: `${symbol}-PERP`, exact: true }).click();
    await expect(page.getByRole('group', { name: `${symbol} execution candlesticks`, exact: true })).toBeVisible();
    await expect(page.locator('.chart-ohlc time')).toBeVisible();
  };
  for (let cycle = 0; cycle < 2; cycle++) {
    await select(active.baseSymbol);
    await expect(page.locator('.chart-reference [title^="Portfolio snapshot block"]')).toContainText('Entry');
    await select(other.baseSymbol);
    // A disposed series used to queue a paint that threw on the following frame.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.getByRole('button', { name: 'Reset chart view' }).click();
    await assertReadOnly(state);
  }
  await testInfo.attach('observed-pinned-portfolio', { body: JSON.stringify(snapshot, null, 2), contentType: 'application/json' });
});
