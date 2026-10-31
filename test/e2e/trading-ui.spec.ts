import { test, expect } from '@playwright/test';
import { terminalFixture, assertReadOnly, assertDisconnectedAccount } from './terminal-fixture';
test('rendered product branding is consistently LucidKeeper', async ({ page }) => {
  const state = await terminalFixture(page); await page.goto('/app');
  await expect(page).toHaveTitle('Trade | LucidKeeper');
  await expect(page.getByRole('link', { name: 'LucidKeeper home', exact: true })).toContainText('LucidKeeper');
  await expect(page.locator('.app-footer')).toContainText('LucidKeeper');
  await assertReadOnly(state);
});
test('market selection updates mark, quantity units and native candle interval', async ({ page }) => {
  const state = await terminalFixture(page); await page.goto('/app');
  await expect(page.locator('.market-stat.primary .animated-value')).toBeVisible();
  await page.getByRole('combobox', { name: 'Select perpetual market' }).click();
  await expect(page.getByRole('option')).toHaveCount(21);
  await page.getByRole('option', { name: 'ETH-PERP', exact: true }).click();
  await expect(page.locator('.order-entry .input-wrap').first()).toContainText('ETH');
  await expect(page.locator('.market-stat.primary .animated-value')).toBeVisible();
  await page.getByRole('button', { name: 'Timeframe 5m', exact: true }).click();
  await expect.poll(() => state.candleRequests.at(-1)?.interval).toBe(300);
  expect(state.candleRequests.at(-1)?.pool).toBe('0xd6cb1dd58580b84d76068ac21594219ce03aeddf');
  await assertReadOnly(state);
});
test('collateral modal traps focus, closes with Escape, and restores its trigger', async ({ page }) => {
  const state = await terminalFixture(page); await page.goto('/app');
  const trigger = page.getByRole('button', { name: 'Manage margin collateral' }); await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Manage collateral' }); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close dialog' }).focus(); await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
  await assertReadOnly(state);
});
test('disconnected activity tabs request no account data and support keyboard navigation', async ({ page }) => {
  const state = await terminalFixture(page); await page.goto('/app');
  await assertDisconnectedAccount(page, state);
  await page.getByRole('tab', { name: 'Positions', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Open orders' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Connect your wallet to view your activity', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Trade history' }).click();
  await expect(page.getByText('Connect your wallet to view your activity', { exact: true })).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(0);
  expect(state.accountRequests).toEqual([]);
  await assertReadOnly(state);
});
for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`named chart and order groups preserve button keyboard behavior at ${width}px`, async ({ page }) => {
    const state = await terminalFixture(page); await page.setViewportSize({ width, height }); await page.goto('/app');
    for (const name of ['Chart timeframes', 'Chart price scale', 'Candle prices', 'Chart price references']) {
      const group = page.getByRole('group', { name, exact: true }); await expect(group).toHaveCount(1); await expect(group).toBeVisible();
      expect(await group.evaluate(el => el.tabIndex)).toBe(-1);
    }
    await expect(page.getByRole('group', { name: 'Candle prices', exact: true })).toHaveAttribute('aria-live', 'off');
    const button = page.getByRole('button', { name: 'Timeframe 5m', exact: true }); await button.focus(); await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'true'); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await expect(button).toBeFocused();
    if (width < 1024) await page.getByRole('navigation', { name: 'Trading workspace' }).getByRole('button', { name: 'Trade', exact: true }).click();
    for (const name of ['Order side', 'Order type']) { await expect(page.getByRole('group', { name, exact: true })).toBeVisible(); await expect(page.getByRole('group', { name, exact: true }).locator('[aria-pressed="true"]')).toHaveCount(1); }
    await page.getByRole('button', { name: 'Limit', exact: true }).focus(); await page.keyboard.press('Space');
    await expect(page.getByLabel('Limit price', { exact: false })).toBeVisible();
    await expect(page.locator('.submit-order')).toHaveText('Connect wallet to trade');
    await assertReadOnly(state);
  });
}
test('keyboard chart inspection exposes candle OHLC and UTC time', async ({ page }) => {
  const state = await terminalFixture(page); await page.goto('/app');
  const time = page.locator('.chart-ohlc time'); await expect(time).toBeVisible(); const latest = await time.getAttribute('datetime');
  await page.getByRole('group', { name: 'BTC execution candlesticks', exact: true }).focus(); await page.keyboard.press('ArrowLeft');
  await expect(time).not.toHaveAttribute('datetime', latest!); await page.keyboard.press('End'); await expect(time).toHaveAttribute('datetime', latest!);
  await assertReadOnly(state);
});
for (const [width, height] of [[1440, 900], [1280, 800], [390, 844], [768, 1024], [1024, 800]]) {
  test(`responsive workspace ${width}×${height}`, async ({ page }, testInfo) => {
    const state = await terminalFixture(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width, height }); await page.goto('/app');
    await expect(page.getByText('Indexed executions · refresh 15s', { exact: true })).toBeVisible();
    await assertDisconnectedAccount(page, state, width >= 1024);
    await expect(page.locator('.chart-ohlc time')).toBeVisible();
    if (width < 1024) {
      const nav = page.getByRole('navigation', { name: 'Trading workspace' }); await nav.getByRole('button', { name: 'Trade', exact: true }).click();
      await expect(page.locator('.submit-order')).toHaveText('Connect wallet to trade');
      await nav.getByRole('button', { name: 'Activity', exact: true }).click(); await assertDisconnectedAccount(page, state);
      await page.getByRole('tab', { name: 'Trade history' }).click(); await expect(page.getByText('Connect your wallet to view your activity', { exact: true })).toBeVisible();
    } else {
      // Short windows deliberately use document scrolling; keyboard focus must reveal the action.
      if (height <= 820) await page.locator('.submit-order').focus();
      await expect(page.locator('.submit-order')).toBeInViewport({ ratio: 1 });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath(`real-${width}.png`), fullPage: true });
    await assertReadOnly(state);
  });
}
test('standalone liquidation works without a position and follows side, leverage and input validity', async ({ page }) => {
  const state = await terminalFixture(page); await page.goto('/app'); const value = page.getByTestId('liquidation-preview');
  await expect(value.getByRole('img')).toBeVisible(); const before = await value.getByRole('img').getAttribute('aria-label');
  await page.getByRole('button', { name: '10×', exact: true }).click(); await expect(value.getByRole('img')).not.toHaveAttribute('aria-label', before!);
  await page.getByLabel('Quantity', { exact: false }).fill(''); await expect(value).toHaveText('—');
  await assertReadOnly(state);
});
test('robust scale discloses candle outliers, full range is reversible and original OHLC survives', async ({ page }) => {
  const state = await terminalFixture(page); await page.goto('/app'); const ohlc = page.locator('.chart-ohlc'); await expect(ohlc.locator('time')).toBeVisible();
  const original = await ohlc.textContent(); await page.getByRole('button', { name: 'Full range', exact: true }).click(); await expect(ohlc).toHaveText(original!);
  await page.getByRole('button', { name: 'Robust scale', exact: true }).click(); await expect(ohlc).toHaveText(original!);
  await assertReadOnly(state);
});
// Every former controlled wallet/failure/financial scenario remains explicitly listed.
for (const title of [
  'connected input validation, side, leverage, Max and minimum budget disclosure',
  'share dialog draws canvas and exports a PNG without claiming verification',
  'chart failure, retry, empty and old executions are explicit',
  'empty and failed history pages retain Previous and isolate their cache',
  'stale mark and failed account reads disable order execution',
  'wrong network blocks execution and existing switch action recovers',
  'mock collateral sequencing: successful receipts',
  'mock collateral sequencing: approve',
  'mock collateral sequencing: deposit',
  'wallet rejection, submitted receipt and confirmation stay distinct from fills',
  'partial close dialog and risk controls preserve requested-versus-filled semantics',
  'cached balances survive failed refresh, recover and stay scoped to the connected account',
  'failed initial reads show unavailable rather than stale zero and fee reads fail closed',
  'funding normalizes a four-hour contract window and simulation failure never reaches the wallet',
  'portfolio health and overlays share a pinned block; Guardian settings isolate accounts and networks',
  'price motion is directional, bounded and disabled by reduced motion; slow reads offer recovery',
]) test(title, async () => { test.skip(true, 'Needs a real connected signer/nonempty position or separately approved controlled wallet/network outcome. No provider injection, synthetic responses or live writes in this suite. See docs/TEST_DATA_SOURCES.md.'); });
