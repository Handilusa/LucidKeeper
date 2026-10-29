import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { parseUnits } from 'viem';
import { terminalFixture, connectFixtureWallet } from './terminal-fixture';

test('market selection updates mark, quantity units and native candle interval', async ({
  page,
}) => {
  const fixture = await terminalFixture(page);
  await page.goto('/');
  await expect(page.locator('.market-stat.primary .animated-value')).toHaveAccessibleName('81,000.0');
  await page.getByRole('combobox', { name: 'Select perpetual market' }).click();
  await page.getByRole('option', { name: 'ETH-PERP', exact: true }).click();
  await expect(page.locator('.market-stat.primary .animated-value')).toHaveAccessibleName('3,000.00');
  await expect(page.locator('.order-entry .input-wrap').first()).toContainText('ETH');
  await page.getByRole('button', { name: 'Timeframe 5m', exact: true }).click();
  await expect.poll(() => fixture.candleRequests.at(-1)?.interval).toBe(300);
  expect(fixture.candleRequests.at(-1)?.pool).toBe('0xd6cb1dd58580b84d76068ac21594219ce03aeddf');
  await page.getByRole('button', { name: 'Reset chart view' }).click();
  expect(fixture.pageErrors).toEqual([]);
  expect(fixture.unexpected).toEqual([]);
});

test('connected input validation, side, leverage, Max and minimum budget disclosure', async ({
  page,
}) => {
  const fixture = await terminalFixture(page, { wallet: true });
  await page.goto('/');
  await connectFixtureWallet(page);
  const action = page.locator('.submit-order');
  await expect(action).toBeEnabled();
  await page.getByRole('button', { name: 'Short / Sell' }).click();
  await expect(action).toHaveText('Sell / Short BTC');
  await page.getByRole('button', { name: 'Limit', exact: true }).click();
  await expect(action).toBeDisabled();
  await page.getByRole('button', { name: 'Use mark' }).click();
  await expect(action).toBeEnabled();
  for (const input of ['', '-1', 'NaN', '1e4', '0.000131']) {
    await page.getByLabel('Quantity', { exact: false }).fill(input);
    await expect(action).toBeDisabled();
    await expect(page.getByLabel('Quantity', { exact: false })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  }
  await page.getByRole('button', { name: 'Market', exact: true }).click();
  await page.getByRole('button', { name: 'Max', exact: true }).click();
  await expect(page.getByLabel('Margin budget', { exact: true })).toHaveValue('10');
  await expect(action).toBeEnabled();
  const margin = await page.locator('.summary-row.total .animated-value').getAttribute('aria-label');
  expect(Number(margin!.replaceAll(',', ''))).toBeLessThanOrEqual(10);
  await page.getByLabel('Margin budget', { exact: true }).fill('20');
  await expect(action).toBeDisabled();
  await expect(page.getByText(/Insufficient margin. Add/)).toBeVisible();
  await page.getByRole('button', { name: '$2', exact: true }).click();
  await page.getByRole('button', { name: '1×', exact: true }).click();
  await expect(page.getByText(/market minimum exceeds this budget/)).toBeVisible();
  expect(fixture.sends).toHaveLength(0);
});

test('collateral modal traps focus, closes with Escape, and restores its trigger', async ({
  page,
}) => {
  await terminalFixture(page);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Manage margin collateral' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Manage collateral' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close dialog' }).focus();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'About mark price', exact: true }).focus();
  await expect(page.getByRole('tooltip')).toContainText('Execution prices can differ');
});

test('share dialog draws canvas and exports a PNG without claiming verification', async ({
  page,
}) => {
  await terminalFixture(page, { position: true });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Share BTC position' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Share position', exact: true });
  await expect(dialog).toContainText('does not independently verify');
  await expect
    .poll(() =>
      dialog
        .locator('canvas')
        .evaluate(
          (canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data[3]
        )
    )
    .toBe(255);
  await dialog.getByRole('button', { name: 'Light', exact: true }).click();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download PNG' }).click();
  expect((await download).suggestedFilename()).toBe('LucidKeeper-BTC-Position.png');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('activity tabs distinguish empty and failed reads and support keyboard navigation', async ({
  page,
}) => {
  const fixture = await terminalFixture(page);
  await page.goto('/');
  await expect(page.getByText('No open positions', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Positions (0)' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Open orders' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByText('No resting orders')).toBeVisible();
  fixture.orders = 'error';
  await page.getByRole('button', { name: 'Refresh activity' }).click();
  await expect(page.getByText('Open orders unavailable')).toBeVisible({ timeout: 15000 });
  await page.getByRole('tab', { name: 'Trade history' }).click();
  await expect(page.getByText('No history in this query window')).toBeVisible();
  fixture.historyError = true;
  await page.getByRole('button', { name: 'Refresh activity' }).click();
  await expect(page.getByText('History unavailable', { exact: true })).toBeVisible({
    timeout: 15000,
  });
});

test('chart failure, retry, empty and old executions are explicit', async ({ page }) => {
  const fixture = await terminalFixture(page);
  fixture.candles = 'error';
  await page.goto('/');
  await expect(page.getByText('Chart data unavailable')).toBeVisible();
  fixture.candles = 'empty';
  await page.getByRole('button', { name: 'Retry chart' }).click();
  await expect(page.getByText('No executions in this timeframe')).toBeVisible();
  fixture.candles = 'old';
  await page.getByRole('button', { name: 'Timeframe 5m', exact: true }).click();
  await expect(page.getByText('No recent indexed executions')).toBeVisible();
});

test('empty and failed history pages retain Previous and isolate their cache', async ({ page }) => {
  const fixture = await terminalFixture(page);
  fixture.historyCount = 20;
  await page.goto('/');
  await page.getByRole('tab', { name: 'Trade history' }).click();
  await expect(page.locator('.history-row')).toHaveCount(20);
  fixture.historyError = true;
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('History unavailable', { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(20);
  fixture.historyError = false;
  await page.getByRole('button', { name: 'Refresh activity' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('No history in this query window')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(20);
});

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`named chart and order groups preserve button keyboard behavior at ${width}px`, async ({ page }) => {
    const fixture = await terminalFixture(page);
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const group = (name: string) => page.getByRole('group', { name, exact: true });
    const checkGroup = async (name: string) => {
      const container = group(name);
      await expect(container).toHaveCount(1);
      await expect(container).toBeVisible();
      await expect(container).toHaveAccessibleName(name);
      expect(await container.evaluate(el => el.tabIndex)).toBe(-1);
    };
    const checkButtons = async (name: string, count: number) => {
      await checkGroup(name);
      const buttons = group(name).getByRole('button');
      await expect(buttons).toHaveCount(count);
      await expect(group(name).locator('[aria-pressed="true"]')).toHaveCount(1);
      await buttons.first().focus();
      for (let index = 1; index < count; index++) {
        await page.keyboard.press('Tab');
        await expect(buttons.nth(index)).toBeFocused();
      }
      for (let index = count - 2; index >= 0; index--) {
        await page.keyboard.press('Shift+Tab');
        await expect(buttons.nth(index)).toBeFocused();
      }
    };
    const activate = async (name: string, label: string, key: 'Enter' | 'Space') => {
      const button = group(name).getByRole('button', { name: label, exact: true });
      await button.focus();
      await page.keyboard.press(key);
      await expect(button).toBeFocused();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(group(name).locator('[aria-pressed="true"]')).toHaveCount(1);
    };

    await checkButtons('Chart timeframes', 6);
    await activate('Chart timeframes', 'Timeframe 5m', 'Enter');
    await expect.poll(() => fixture.candleRequests.at(-1)?.interval).toBe(300);
    await activate('Chart timeframes', 'Timeframe 15m', 'Space');
    await expect.poll(() => fixture.candleRequests.at(-1)?.interval).toBe(900);
    await checkButtons('Chart price scale', 2);
    await activate('Chart price scale', 'Full range', 'Enter');
    await activate('Chart price scale', 'Robust scale', 'Space');
    await checkGroup('Candle prices');
    await expect(group('Candle prices')).toHaveAttribute('aria-live', 'off');
    await expect(group('Candle prices')).toContainText('UTC');
    await checkGroup('Chart price references');
    await expect(group('Chart price references')).toContainText('Mark 81,000.0');

    if (width < 1024) {
      await page.getByRole('navigation', { name: 'Trading workspace' })
        .getByRole('button', { name: 'Trade', exact: true }).click();
    }
    await checkButtons('Order side', 2);
    await activate('Order side', 'Short / Sell', 'Enter');
    await activate('Order side', 'Long / Buy', 'Space');
    await checkButtons('Order type', 2);
    await activate('Order type', 'Limit', 'Enter');
    await expect(page.getByLabel('Limit price', { exact: false })).toBeVisible();
    await activate('Order type', 'Market', 'Space');
    await expect(page.getByLabel('Limit price', { exact: false })).toBeHidden();
    await expect(page.locator('.submit-order')).toHaveText('Connect wallet to trade');
    expect(fixture.walletCalls).toEqual([]);
    expect(fixture.simulationCalls).toEqual([]);
    expect(fixture.sends).toEqual([]);
    expect(fixture.pageErrors).toEqual([]);
    expect(fixture.unexpected).toEqual([]);
  });
}

test('keyboard chart inspection exposes candle OHLC and UTC time', async ({ page }) => {
  const fixture = await terminalFixture(page);
  await page.goto('/');
  const time = page.locator('.chart-ohlc time');
  await expect(time).toBeVisible();
  const latest = await time.getAttribute('datetime');
  await page.getByRole('group', { name: 'BTC execution candlesticks', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(time).not.toHaveAttribute('datetime', latest!);
  await page.keyboard.press('Home');
  await page.keyboard.press('+');
  await page.keyboard.press('-');
  await page.keyboard.press('End');
  await expect(time).toHaveAttribute('datetime', latest!);
  expect(fixture.pageErrors).toEqual([]);
});

test('stale mark and failed account reads disable order execution', async ({ page }) => {
  const fixture = await terminalFixture(page, { wallet: true });
  await page.goto('/');
  await connectFixtureWallet(page);
  await expect(page.locator('.submit-order')).toBeEnabled();
  fixture.markError = true;
  await expect(page.locator('.market-stat.primary dd')).toHaveText('—', { timeout: 20000 });
  await expect(page.locator('.submit-order')).toBeDisabled();
  await expect(page.getByText('Mark unavailable / stale')).toBeVisible();
  fixture.accountError = true;
  await expect(page.getByText('Positions unavailable', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  expect(fixture.sends).toHaveLength(0);
});

test('wrong network blocks execution and existing switch action recovers', async ({ page }) => {
  const fixture = await terminalFixture(page, { wallet: true, wrongChain: true });
  await page.goto('/');
  await connectFixtureWallet(page);
  // RainbowKit requests Tokyo on connect; exercise a subsequent wallet-side network change.
  await fixture.changeChain('0x1');
  await expect(page.locator('.submit-order')).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Wrong network');
  await page.getByRole('button', { name: 'Switch to Tokyo', exact: true }).click();
  await expect(page.locator('.submit-order')).toBeEnabled();
  expect(fixture.chain).toBe('0xc4cf');
  expect(fixture.sends).toHaveLength(0);
});

for (const revert of ['', 'approve', 'deposit'] as const) {
  test(`mock collateral sequencing: ${revert || 'successful receipts'}`, async ({ page }) => {
    const fixture = await terminalFixture(page, { wallet: true });
    fixture.revert = revert;
    await page.goto('/');
    await connectFixtureWallet(page);
    await page.getByRole('button', { name: 'Manage margin collateral' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Deposit 2.0 USDso', exact: true }).click();
    if (revert === 'approve') {
      await expect(dialog).toContainText('Approval reverted. Deposit was not submitted.');
      expect(fixture.sends.map((s) => s.functionName)).toEqual(['approve']);
    } else {
      await expect(dialog).toContainText(
        revert ? 'Transaction reverted.' : 'Deposit transaction confirmed.'
      );
      expect(fixture.sends.map((s) => s.functionName)).toEqual(['approve', 'deposit']);
      expect(fixture.sends[1].args).toEqual([parseUnits('2', 18)]);
    }
    expect(fixture.sends[0].args[1]).toBe(parseUnits('2', 18));
    expect(fixture.unexpected).toEqual([]);
  });
}

test('wallet rejection, submitted receipt and confirmation stay distinct from fills', async ({
  page,
}) => {
  const fixture = await terminalFixture(page, { wallet: true });
  await page.goto('/');
  await connectFixtureWallet(page);
  fixture.rejectWallet = true;
  await page.locator('.submit-order').click();
  await expect(page.locator('.order-entry .transaction-status')).toContainText(/rejected/i);
  expect(fixture.sends).toHaveLength(0);
  fixture.rejectWallet = false;
  fixture.receiptReady = false;
  await page.locator('.submit-order').click();
  await expect(page.locator('.order-entry .transaction-status')).toContainText('Submitted');
  await expect(page.locator('.submit-order')).toBeDisabled();
  fixture.receiptReady = true;
  await expect(page.locator('.order-entry .transaction-status')).toContainText(
    'fill outcome pending verification',
    { timeout: 15000 }
  );
  expect(fixture.sends[0].functionName).toBe('placeOrder');
  expect(fixture.sends[0].args[5]).toBe(2);
  await expect(page.getByText('No open positions', { exact: true })).toBeVisible();
});

test('partial close dialog and risk controls preserve requested-versus-filled semantics', async ({
  page,
}) => {
  const fixture = await terminalFixture(page, { wallet: true, position: true });
  await page.goto('/');
  await connectFixtureWallet(page);
  await page.getByRole('button', { name: 'Partial', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Partial close · BTC-PERP' });
  await expect(dialog).toContainText('Actual execution depends on liquidity');
  await dialog.getByRole('button', { name: 'Submit 50% close order' }).click();
  await expect(dialog).toBeHidden();
  expect(fixture.sends[0].args[3]).toBe(10000n);
  await expect(page.getByRole('tab', { name: 'Positions (1)' })).toBeVisible();
  await page.locator('#risk > summary').click();
  await expect(page.getByText(/Stress ratio/)).toBeVisible();
  await page.getByLabel('Stop-loss trigger in USDso').fill('70000');
  await page.getByRole('button', { name: 'ARM CLIENT-SIDE REACTIVE GUARD', exact: true }).click();
  await expect(page.getByText('GUARD ARMED (ACTIVE TAB REQUIRED):')).toBeVisible();
  await page.getByRole('button', { name: /CLICK TO DISARM/i }).click();
  expect(fixture.sends).toHaveLength(1);
});

for (const [width, height] of [
  [1440, 900],
  [1280, 800],
  [390, 844],
  [768, 1024],
  [1024, 800],
]) {
  test(`responsive workspace ${width}×${height}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const fixture = await terminalFixture(page, { position: true });
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByText('Indexed executions · refresh 15s', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Guardian overview' })).toBeInViewport();
    mkdirSync('.git/lucidkeeper-audit', { recursive: true });
    await page.screenshot({ path: `.git/lucidkeeper-audit/fixture-${width}.png`, fullPage: true });
    if (width < 1024) {
      const nav = page.getByRole('navigation', { name: 'Trading workspace' });
      await nav.getByRole('button', { name: 'Trade', exact: true }).click();
      await page.getByRole('button', { name: 'Limit', exact: true }).click();
      await page.getByLabel('Limit price', { exact: false }).fill('82000');
      await nav.getByRole('button', { name: 'Chart', exact: true }).click();
      await page.getByRole('button', { name: 'Timeframe 5m', exact: true }).click();
      await nav.getByRole('button', { name: 'Trade', exact: true }).click();
      await expect(page.getByLabel('Limit price', { exact: false })).toHaveValue('82000');
      await page.screenshot({
        path: `.git/lucidkeeper-audit/fixture-${width}-trade.png`,
        fullPage: true,
      });
      await nav.getByRole('button', { name: 'Activity', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Positions (1)' })).toBeVisible();
      const table = page.getByRole('region', {
        name: 'Open positions, scroll horizontally for actions',
      });
      await table.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await expect(page.getByRole('button', { name: 'Share BTC position' })).toBeInViewport();
      await page.locator('#risk > summary').click();
      await page.screenshot({
        path: `.git/lucidkeeper-audit/fixture-${width}-risk.png`,
        fullPage: true,
      });
    } else {
      await expect(page.getByLabel('Sizing leverage', { exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.locator('.submit-order')).toBeInViewport({ ratio: 1 });
      await expect(page.locator('.summary-row.total')).toBeInViewport({ ratio: 1 });
      await expect(page.getByText('Est. taker fee', { exact: false })).toBeInViewport({ ratio: 1 });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(fixture.pageErrors).toEqual([]);
    expect(fixture.sends).toHaveLength(0);
  });
}

test('standalone liquidation works without a position and follows side, leverage and input validity', async ({ page }) => {
  const fixture = await terminalFixture(page);
  await page.goto('/');
  const value = page.getByTestId('liquidation-preview');
  await expect(value.getByRole('img')).toHaveAccessibleName('66,804.12');
  await page.getByRole('button', { name: '10×', exact: true }).click();
  await expect(value.getByRole('img')).toHaveAccessibleName('75,154.64');
  await page.getByRole('button', { name: 'Short / Sell' }).click();
  await expect(value.getByRole('img')).toHaveAccessibleName('86,504.85');
  await page.getByLabel('Quantity', { exact: false }).fill('');
  await expect(value).toHaveText('—');
  await expect(page.getByRole('heading', { name: 'No maintenance exposure' })).toBeVisible();
  expect(fixture.sends).toHaveLength(0);
});

test('cached balances survive failed refresh, recover and stay scoped to the connected account', async ({ page }) => {
  test.setTimeout(60000);
  const fixture = await terminalFixture(page, { wallet: true });
  await page.goto('/');
  await connectFixtureWallet(page);
  const funds = page.getByRole('region', { name: 'Account funds' });
  await expect(funds).toContainText('40.00');
  fixture.accountError = true;
  await expect(funds.locator('.stale-badge')).toHaveCount(4, { timeout: 25000 });
  await expect(funds).toContainText('40.00');
  await expect(funds).toContainText('12.00');
  await expect(page.locator('.available-margin')).toContainText('10.00Stale');
  await expect(page.locator('.submit-order')).toBeDisabled();
  fixture.accountError = false;
  await page.getByRole('button', { name: 'Retry account reads' }).click();
  await expect(page.locator('.submit-order')).toBeEnabled();
  await expect(funds.locator('.stale-badge')).toHaveCount(0, { timeout: 20000 });
  await fixture.changeAccount('0x0000000000000000000000000000000000000001');
  await expect(funds).toContainText('0x0000…0001');
  await expect(funds).not.toContainText('40.00');
  await expect(funds).toContainText('3.00');
  expect(fixture.sends).toHaveLength(0);
});

test('failed initial reads show unavailable rather than stale zero and fee reads fail closed', async ({ page }) => {
  const fixture = await terminalFixture(page, { wallet: true });
  fixture.accountError = true;
  fixture.paramsError = true;
  await page.goto('/');
  await connectFixtureWallet(page);
  const funds = page.getByRole('region', { name: 'Account funds' });
  await expect(funds.locator('.stale-badge')).toHaveCount(0);
  await expect(funds).not.toContainText('0.00');
  await expect(page.getByTestId('liquidation-preview')).toHaveText('—');
  await expect(page.locator('.order-summary .summary-row').nth(1).locator('dd')).toHaveText('—');
  await expect(page.locator('.submit-order')).toBeDisabled();
});

test('robust scale discloses candle outliers, full range is reversible and original OHLC survives', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fixture = await terminalFixture(page, { position: true });
  fixture.outlier = true;
  await page.goto('/');
  await expect(page.getByTestId('chart-outliers')).toContainText('1 candle beyond robust bounds');
  await expect(page.locator('.chart-ohlc')).toContainText('90,000.0');
  await expect(page.getByLabel('Chart price references')).toContainText('Entry 80,000.0');
  await expect(page.getByLabel('Chart price references')).toContainText('Est. liq 24,298.97');
  await page.screenshot({ path: '.git/lucidkeeper-audit/robust-outlier.png' });
  await page.getByRole('button', { name: 'Full range', exact: true }).click();
  await expect(page.getByTestId('chart-outliers')).toBeHidden();
  await expect(page.locator('.chart-ohlc')).toContainText('90,000.0');
  await page.screenshot({ path: '.git/lucidkeeper-audit/full-outlier.png' });
  await page.getByRole('button', { name: 'Robust scale', exact: true }).click();
  await expect(page.getByTestId('chart-outliers')).toBeVisible();
  const canvas = page.getByRole('group', { name: 'BTC execution candlesticks' });
  await canvas.hover({ position: { x: 200, y: 150 } });
  await expect(page.locator('.chart-tooltip')).toBeVisible();
  fixture.accountError = true;
  await expect(page.getByLabel('Chart price references')).not.toContainText('Entry', { timeout: 20000 });
  expect(fixture.pageErrors).toEqual([]);
});

test('funding normalizes a four-hour contract window and simulation failure never reaches the wallet', async ({ page }) => {
  const fixture = await terminalFixture(page, { wallet: true });
  fixture.fundingWindow = 14400n;
  fixture.simulationError = true;
  await page.goto('/');
  await connectFixtureWallet(page);
  await expect(page.locator('.market-stats')).toContainText('+0.0200%');
  await page.locator('.submit-order').click();
  await expect(page.locator('.transaction-status').first()).toContainText('Order simulation failed');
  expect(fixture.simulationCalls.length).toBeGreaterThan(0);
  expect(fixture.sends).toHaveLength(0);
});

test('portfolio health and overlays share a pinned block; Guardian settings isolate accounts and networks', async ({ page }) => {
  const fixture = await terminalFixture(page, { wallet: true, position: true });
  await page.goto('/');
  await connectFixtureWallet(page);
  await expect(page.getByLabel('Chart price references')).toContainText('Entry');
  const positionRead = fixture.reads.find(read => read.functionName === 'getPosition')!;
  expect(positionRead.block).toMatch(/^0x/);
  for (const name of ['getAccountHealth', 'getAccountState', 'getPerpPoolParameters', 'tryGetMarkPrice']) {
    expect(fixture.reads.some(read => read.functionName === name && read.block === positionRead.block)).toBe(true);
  }
  await page.getByRole('button', { name: 'Open risk controls' }).click();
  await page.getByLabel('Stop-loss trigger in USDso').fill('70000');
  await page.getByRole('button', { name: 'ARM CLIENT-SIDE REACTIVE GUARD', exact: true }).click();
  await expect(page.getByLabel('Stop loss 5% from entry')).toBeDisabled();
  await fixture.changeChain('0x1');
  await expect(page.getByText('DISARMED', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Tokyo', exact: true }).click();
  await expect(page.getByLabel('Stop-loss trigger in USDso')).toHaveValue('70000');
  await fixture.changeAccount('0x0000000000000000000000000000000000000001');
  await expect(page.getByLabel('Stop-loss trigger in USDso')).toHaveValue('76000.00');
  await expect(page.getByText('DISARMED', { exact: true })).toBeVisible();
  expect(fixture.sends).toHaveLength(0);
});

test('price motion is directional, bounded and disabled by reduced motion; slow reads offer recovery', async ({ page }) => {
  const fixture = await terminalFixture(page);
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    (window as any).qaAnimations = [];
    Element.prototype.animate = function (frames, options) {
      if (this.classList.contains('animated-value')) (window as any).qaAnimations.push({ frames, options });
      return original.call(this, frames, options);
    };
  });
  fixture.holdCandles = true;
  await page.goto('/');
  await expect(page.getByText('Loading execution candles…')).toBeVisible();
  await expect(page.getByText('This read is taking longer than expected.')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Retry read' })).toBeVisible();
  fixture.releaseCandles();
  await expect(page.getByText('Loading execution candles…')).toBeHidden();
  const mark = page.locator('.market-stat.primary .animated-value');
  fixture.markOverride = 82000;
  await expect(mark).toHaveAccessibleName('82,000.0');
  await expect.poll(() => page.evaluate(() => (window as any).qaAnimations.length)).toBeGreaterThan(0);
  let animations = await page.evaluate(() => (window as any).qaAnimations);
  expect(animations.at(-1).options.duration).toBe(300);
  expect(animations.at(-1).frames[0].color.trim()).toBe('#60cf9f');
  fixture.markOverride = 80000;
  await expect(mark).toHaveAccessibleName('80,000.0');
  await expect.poll(() => page.evaluate(() => (window as any).qaAnimations.at(-1).frames[0].color.trim())).toBe('#f4808b');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  animations = await page.evaluate(() => (window as any).qaAnimations);
  fixture.markOverride = 83000;
  await expect(mark).toHaveAccessibleName('83,000.0');
  expect(await page.evaluate(() => (window as any).qaAnimations.length)).toBe(animations.length);
  expect(fixture.pageErrors).toEqual([]);
});
