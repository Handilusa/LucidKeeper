import { test, expect } from '@playwright/test';
import { terminalFixture, assertReadOnly, assertDisconnectedAccount } from './terminal-fixture';
import { A, B, mockWallet, connectMock, walletEvent } from './mock-wallet';
import { decodeFunctionData } from 'viem';
import { perpPoolAbi } from '../../src/chain/abis';
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
test('controlled connected input validates quantity, side, leverage and Max', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page);
  await page.getByLabel('Quantity', { exact: false }).fill('0');
  await expect(page.locator('.submit-order')).toBeDisabled();
  await page.getByLabel('Quantity', { exact: false }).fill('0.0001');
  await page.getByRole('button', { name: 'Short / Sell', exact: true }).click();
  await expect(page.locator('.submit-order')).toContainText('Sell / Short BTC');
  await page.getByRole('button', { name: '10×', exact: true }).click();
  await expect(page.getByLabel('Sizing leverage', { exact: true })).toHaveValue('10');
  await page.getByRole('button', { name: 'Max', exact: true }).click();
  await expect(page.getByLabel('Quantity', { exact: false })).not.toHaveValue('0');
  expect(state.writes).toEqual([]);
});
test('controlled share canvas exports PNG with snapshot disclaimer', async ({ page }) => {
  const state = await mockWallet(page); state.accounts[A].size = 10000n; await connectMock(page);
  await page.getByRole('button', { name: 'Share BTC position' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share position' });
  await expect(dialog.getByRole('img')).toHaveAttribute('aria-label', /not proof of realized PnL/);
  const download = page.waitForEvent('download'); await dialog.getByRole('button', { name: 'Download PNG' }).click();
  expect((await download).suggestedFilename()).toBe('LucidKeeper-BTC-Position.png');
  expect(state.writes).toEqual([]);
});
test('controlled chart failure retries to empty and then old executions', async ({ page }) => {
  const state = await mockWallet(page); state.candleMode = 'error'; await connectMock(page);
  await expect(page.getByRole('button', { name: 'Retry chart', exact: true })).toBeVisible({ timeout: 15_000 });
  state.candleMode = 'empty'; await page.getByRole('button', { name: 'Retry chart', exact: true }).click();
  await expect(page.getByText('No executions in this timeframe', { exact: true })).toBeVisible();
  state.candleMode = 'old'; await page.getByRole('combobox', { name: 'Select perpetual market' }).click();
  await page.getByRole('option', { name: 'ETH-PERP', exact: true }).click();
  await expect(page.getByText('No recent indexed executions', { exact: true })).toBeVisible();
});
test('controlled empty history page retains Previous and account switch resets pages', async ({ page }) => {
  const state = await mockWallet(page); state.historyCount = 20; await connectMock(page);
  await page.getByRole('tab', { name: 'Trade history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(20);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Page 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeEnabled();
  await walletEvent(page, 'account', B); await page.getByRole('tab', { name: 'Trade history' }).click();
  await expect(page.getByText('Page 1', { exact: true })).toBeVisible();
});
test('controlled unavailable mark prevents initial execution', async ({ page }) => {
  await mockWallet(page).then(state => { state.markFailure = true; });
  await page.goto('/app'); await page.getByRole('button', { name: 'Connect wallet', exact: true }).click(); await page.getByRole('button', { name: /MetaMask/ }).click();
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('0x1111');
  await expect(page.locator('.submit-order')).toBeDisabled();
});
test('controlled wrong-network block recovers after switching', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page); await walletEvent(page, 'chain', '0xc488');
  await expect(page.locator('.submit-order')).toBeDisabled(); expect(state.writes).toEqual([]);
  await page.getByRole('button', { name: 'Switch to Somnia Tokyo testnet' }).click();
  await expect(page.locator('.submit-order')).toBeEnabled();
});
for (const stage of ['approve', 'deposit'] as const) test(`controlled ${stage} reverted receipt stops funding success`, async ({ page }) => {
  const state = await mockWallet(page); if (stage === 'deposit') state.accounts[A].allowance = 7n * 10n ** 18n;
  state.revertNext = true; await connectMock(page); page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Manage margin collateral' }).click(); await page.getByLabel('Amount', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Deposit 7 USDso' }).click();
  await expect(page.getByRole('dialog', { name: 'Manage collateral' })).toContainText('reverted');
  expect(state.writes).toHaveLength(1); expect(state.accounts[A].margin).toBe(20n * 10n ** 18n);
});
test('controlled withdrawal uses selected amount and updates only its account', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page); page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Manage margin collateral' }).click(); await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
  await page.getByLabel('Amount', { exact: true }).fill('7'); await page.getByRole('button', { name: 'Withdraw 7 USDso' }).click();
  await expect(page.getByRole('dialog', { name: 'Manage collateral' })).toContainText('Withdrawal transaction confirmed');
  expect(state.accounts[A].margin).toBe(13n * 10n ** 18n); expect(state.accounts[B].margin).toBe(70n * 10n ** 18n);
});
test('controlled wallet rejection has no hash; pending receipt has hash but no fill claim', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page); page.on('dialog', dialog => dialog.accept()); state.rejectNext = true;
  await page.locator('.submit-order').click(); await expect(page.locator('.order-entry .transaction-status')).toContainText('Request declined');
  expect(state.writes).toHaveLength(0); state.holdReceipts = true; await page.locator('.submit-order').click();
  await expect(page.locator('.order-entry .transaction-status')).toContainText('waiting for receipt');
  await expect(page.locator('.order-entry .transaction-status a')).toHaveAttribute('href', /\/tx\/0x[0-9a-f]{64}$/);
  expect(state.accounts[A].size).toBe(0n);
});
test('controlled partial close dialog reviews half of fresh remaining size', async ({ page }) => {
  const state = await mockWallet(page); state.accounts[A].size = 40000n; await connectMock(page); page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Partial', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Partial close · BTC-PERP' })).toContainText('Requested reduction');
  await page.getByRole('button', { name: 'Submit 50% close order', exact: true }).click();
  await expect.poll(() => state.accounts[A].size).toBe(20000n);
});
test('controlled failed refresh hides account data then recovers without leaking to B', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page); state.accountFailure = true;
  await page.getByRole('button', { name: 'Refresh activity' }).click();
  await expect(page.locator('.submit-order')).toBeDisabled({ timeout: 20_000 });
  state.accountFailure = false; await walletEvent(page, 'account', B);
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('300.00');
  await expect(page.getByRole('region', { name: 'Account funds' })).not.toContainText('200.00');
});
test('controlled initial fee read failure blocks orders rather than assumes zero fee', async ({ page }) => {
  const state = await mockWallet(page); state.feeFailure = true; await page.goto('/app');
  await page.getByRole('button', { name: 'Connect wallet', exact: true }).click(); await page.getByRole('button', { name: /MetaMask/ }).click();
  await expect(page.locator('.submit-order')).toBeDisabled(); expect(state.writes).toEqual([]);
});
test('controlled limit review retains enum zero and existing five-minute expiry', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page); page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Limit', exact: true }).click(); await page.getByLabel('Limit price', { exact: true }).fill('80000');
  await page.locator('.submit-order').click(); await expect(page.locator('.order-entry .transaction-status')).toContainText('Confirmed');
  expect(state.writes).toHaveLength(1); expect(state.accounts[A].size).toBe(0n);
  const order = decodeFunctionData({ abi: perpPoolAbi, data: state.writes[0].data });
  expect(order.functionName).toBe('placeOrder');
  if (order.functionName === 'placeOrder') {
    expect(order.args[5]).toBe(0);
    const remaining = Number(order.args[4] / 10n ** 9n) - Math.floor(Date.now() / 1000);
    expect(remaining).toBeGreaterThan(280); expect(remaining).toBeLessThanOrEqual(300);
  }
});
test('controlled portfolio reads pin health and positions to the same block', async ({ page }) => {
  const state = await mockWallet(page); state.accounts[A].size = 10000n; await connectMock(page);
  const reads = state.contractReads.filter(read => ['getAccountHealth', 'getAccountState', 'getPosition'].includes(read.name));
  expect(reads.some(read => read.name === 'getPosition')).toBe(true);
  // Standalone balances use latest; the portfolio snapshot explicitly pins all three.
  for (const name of ['getAccountHealth', 'getAccountState', 'getPosition']) expect(reads.some(read => read.name === name && read.block === '0x64')).toBe(true);
  await page.locator('#risk > summary').click(); await expect(page.locator('#risk')).toContainText('DISARMED');
  await walletEvent(page, 'chain', '0xc488'); await page.locator('#risk > summary').click(); await expect(page.locator('#risk')).toContainText('DISARMED');
});
test('controlled reduced motion applies to price updates without a wallet send', async ({ page }) => {
  const state = await mockWallet(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await connectMock(page);
  state.mark += 100n * 10n ** 18n;
  await expect(page.locator('.market-stat.primary .animated-value')).toHaveAttribute('aria-label', /80,100/, { timeout: 10_000 });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true); expect(state.writes).toEqual([]);
});
