import { test, expect } from '@playwright/test';
import { A, B, mockWallet, connectMock } from './mock-wallet';
import { CONTRACT_ADDRESSES } from '../../src/chain/abis';
import { parseUnits } from 'viem';

test('explicit public profile works disconnected, carries its address and never signs', async ({ page }) => {
  const state = await mockWallet(page); state.accounts[B].size = 20000n;
  await page.goto(`/app/profile/${B}`); await expect(page).toHaveTitle('Portfolio | LucidKeeper');
  await expect(page.getByRole('region', { name: 'Profile identity' })).toContainText(B);
  await expect(page.getByRole('region', { name: 'Profile identity' })).toContainText('ownership not verified');
  await expect(page.locator('.profile-metric').filter({ has: page.getByRole('heading', { name: 'Account equity', exact: true }) }).getByRole('img')).toHaveAttribute('aria-label', '70.0000');
  await expect(page.locator('.profile-metric').filter({ has: page.getByRole('heading', { name: 'ROI', exact: true }) })).toContainText('Verified equity at both window boundaries is unavailable');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('LucidKeeper-positions.csv');
  expect(state.writes).toEqual([]);
});

test('owned window events drive totals; foreign, duplicate and outside rows never inflate metrics', async ({ page }) => {
  const state = await mockWallet(page);
  const timestamp = String(Math.floor(Date.now() / 1000) - 3600);
  const pool = CONTRACT_ADDRESSES.BTC_PERP_POOL.toLowerCase();
  const amount = (value: string) => parseUnits(value, 18).toString();
  const common = { account: B, pool, timestamp, txHash: `0x${'ab'.repeat(32)}` };
  const fill = { ...common, id: 'fill', taker: B, maker: A, quantity: '20000', fillPrice: amount('80000'), quoteQuantity: amount('16'), takerIsBid: true, blockNumber: '90', logIndex: 1 };
  const change = { ...common, id: 'change', kind: 'REDUCE', sizeBefore: '40000', sizeAfter: '20000', closedSize: '20000', entryPriceBefore: amount('70000'), entryPriceAfter: amount('70000'), exitPrice: amount('80000'), orderId: '1', realizedPnl: amount('2'), blockNumber: '90', logIndex: 2 };
  state.profileRows.Fill = [fill, fill, { ...fill, id: 'foreign', taker: A, maker: A }, { ...fill, id: 'old', timestamp: '1' }];
  state.profileRows.PerpPositionChange = [change, { ...change, id: 'foreign', account: A }, { ...change, id: 'old', timestamp: '1' }];
  state.profileRows.FundingPayment = [{ ...common, id: 'paid', amount: amount('3') }, { ...common, id: 'received', amount: amount('-1') }, { ...common, id: 'foreign', account: A, amount: amount('99') }];
  state.profileRows.PerpFeeRecord = [{ ...common, id: 'charge', amount: amount('1'), isRebate: false }, { ...common, id: 'rebate', amount: amount('0.25'), isRebate: true }];
  await page.goto(`/app/profile/${B}`);
  const metric = (name: string) => page.locator('.profile-metric').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('img');
  await expect(metric('Realized price PnL')).toHaveAttribute('aria-label', '2.0000');
  await expect(metric('Filled volume')).toHaveAttribute('aria-label', '16.0000');
  await expect(metric('Settled funding')).toHaveAttribute('aria-label', '2.0000');
  await expect(metric('Net fees')).toHaveAttribute('aria-label', '0.7500');
  await page.getByRole('button', { name: 'Fills', exact: true }).click();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  expect(state.contractReads.filter(read => /getAccount/.test(read.name)).every(read => read.args[0] === B)).toBe(true);
  expect(state.writes).toEqual([]);
});

test('profile source failure is unavailable rather than zero; explicit retry recovers', async ({ page }) => {
  await page.clock.install();
  const state = await mockWallet(page); state.profileFailure = true;
  await page.goto(`/app/profile/${B}`);
  await expect(page.getByText('Some history reads failed.', { exact: false })).toBeVisible({ timeout: 15_000 });
  const volume = page.locator('.profile-metric').filter({ has: page.getByRole('heading', { name: 'Filled volume', exact: true }) });
  await expect(volume.getByRole('img')).toHaveCount(0);
  state.profileFailure = false;
  await page.clock.fastForward(31_000);
  await page.getByRole('button', { name: 'Refresh reads', exact: true }).click();
  await expect(volume.getByRole('img')).toHaveAttribute('aria-label', '0.0000');
  expect(state.writes).toEqual([]);
});

test('invalid address rejects reads, connected A can watch B without changing signer identity', async ({ page }) => {
  const state = await mockWallet(page); await page.goto('/app/profile/not-an-address');
  await expect(page.getByRole('heading', { name: 'Invalid public address' })).toBeVisible();
  expect(state.contractReads.filter(read => /Account|Position/.test(read.name))).toEqual([]);
  await connectMock(page); await page.goto(`/app/profile/${B}`);
  await expect(page.getByRole('region', { name: 'Profile identity' })).toContainText(B);
  await expect(page.getByRole('region', { name: 'Observed-account leaderboard' })).toContainText(A);
  await expect(page.getByRole('region', { name: 'Observed-account leaderboard' })).not.toContainText('demo traders');
  expect(state.writes).toEqual([]);
});

test('public profile aliases and window state stay scoped while switching viewed addresses', async ({ page }) => {
  const state = await mockWallet(page); await page.goto(`/app/profile/${A}`);
  await page.getByLabel('Local alias', { exact: false }).fill('Alpha'); await page.getByRole('button', { name: 'Save alias' }).click();
  await page.getByRole('button', { name: '30D', exact: true }).click();
  await page.goto(`/app/profile/${B}`); await expect(page.getByLabel('Local alias', { exact: false })).toHaveValue('');
  await expect(page.getByRole('button', { name: '7D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto(`/app/profile/${A}`); await expect(page.getByLabel('Local alias', { exact: false })).toHaveValue('Alpha');
  expect(state.writes).toEqual([]);
});
