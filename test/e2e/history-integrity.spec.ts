import { test, expect } from '@playwright/test';
import { parseUnits, toHex } from 'viem';
import { A, B, mockWallet, connectMock } from './mock-wallet';
import { ALL_VERIFIED_PERP_MARKETS } from '../../src/lib/data/markets';

for (const failure of ['missing arrays', 'missing amount', 'missing fill price', 'unknown fill pool', 'indexer and RPC failure']) {
  test(`${failure} renders history unavailable, never zero/epoch or empty success`, async ({ page }) => {
    const state = await mockWallet(page);
    const common = { id: 'controlled-row', txHash: toHex(100, { size: 32 }), blockNumber: 100, timestamp: Math.floor(Date.now() / 1000) };
    const fill = { ...common, taker: A, maker: B, takerIsBid: true, pool: ALL_VERIFIED_PERP_MARKETS[0].poolAddress, quantity: '13000', fillPrice: parseUnits('80000', 18).toString() };
    state.historyData = failure === 'missing arrays' ? {} : failure === 'missing amount'
      ? { Fill: [], MarginEvent: [{ ...common, account: A, kind: 'Deposit' }] }
      : { Fill: [{ ...fill, ...(failure === 'unknown fill pool' ? { pool: B } : { fillPrice: null }) }], MarginEvent: [] };
    if (failure === 'indexer and RPC failure') { state.historyFailure = true; state.rpcLogsFailure = true; }
    await connectMock(page);
    await page.getByRole('tab', { name: 'Trade history' }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText('History unavailable');
    await expect(panel).not.toContainText('No history in this query window');
    await expect(panel).not.toContainText('1970-01-01');
    await expect(panel).not.toContainText('0.00 USDso');
    expect(state.writes).toEqual([]);
  });
}

test('genuine zero deposit renders as indexed evidence; missing later-page arrays are unavailable', async ({ page }) => {
  const state = await mockWallet(page); state.historyCount = 21;
  await connectMock(page);
  await page.getByRole('tab', { name: 'Trade history' }).click();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  state.historyData = {};
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toContainText('History unavailable');
  state.historyData = { Fill: [], MarginEvent: [{ id: 'controlled-zero', txHash: toHex(100, { size: 32 }), blockNumber: 100, timestamp: Math.floor(Date.now() / 1000), account: A, kind: 'Deposit', amount: '0' }] };
  await page.getByRole('button', { name: 'Refresh activity' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('0.00 USDso');
  await expect(page.getByRole('tabpanel')).not.toContainText('1970-01-01');
  expect(state.writes).toEqual([]);
});

test('incomplete active orders show unavailable instead of fabricated price/quantity', async ({ page }) => {
  const state = await mockWallet(page);
  state.activeOrderRows = [{ id: 'controlled-order', owner: A, pool: ALL_VERIFIED_PERP_MARKETS[0].poolAddress, orderId: '1', isBid: true, status: 'Open' }];
  await connectMock(page);
  await page.getByRole('tab', { name: 'Open orders' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Open orders unavailable');
  expect(state.writes).toEqual([]);
});

for (const width of [375, 1440]) {
  test(`literal illustrative labels render on conceptual and numerical surfaces at ${width}px`, async ({ page }, testInfo) => {
    const state = await mockWallet(page); state.accounts[A].size = 13000n;
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('.flow-caption')).toContainText('illustrative workflow');
    await expect(page.getByText('illustrative six-step trading lifecycle', { exact: true })).toBeVisible();
    await expect(page.getByText('illustrative conceptual diagram, not network telemetry.', { exact: true })).toBeVisible();
    await connectMock(page);
    const navigation = page.getByRole('navigation', { name: 'Trading workspace' });
    if (width < 1024) await navigation.getByRole('button', { name: 'Trade', exact: true }).click();
    await page.locator('#order-quantity').fill('0.00013');
    await expect(page.locator('.position-context')).toContainText('illustrative netting');
    await expect(page.locator('.estimate-context')).toContainText('illustrative liquidation');
    await expect(page.locator('.estimate-context')).toBeVisible();
    await page.locator('.risk-disclosure > summary').click();
    await expect(page.locator('.guardian-stress')).toContainText('illustrative stress preview');
    await expect(page.locator('.guardian-stress')).toContainText('illustrative · What-If Simulation Only');
    await expect(page.getByText('illustrative stress preview · not live portfolio health', { exact: true })).toBeVisible();
    await page.locator('.guardian-stress').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`illustrative-${width}.png`), fullPage: true });
    if (width < 1024) await navigation.getByRole('button', { name: 'Chart', exact: true }).click();
    await expect(page.locator('.chart-reference')).toContainText('illustrative liq');
    await expect(page.locator('.chart-reference')).toBeVisible();
    if (width < 1024) await navigation.getByRole('button', { name: 'Activity', exact: true }).click();
    await expect(page.getByText(/illustrative portfolio liquidation estimates/)).toBeVisible();
    expect(state.writes).toEqual([]);
  });
}
