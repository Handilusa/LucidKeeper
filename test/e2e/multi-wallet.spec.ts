import { test, expect } from '@playwright/test';
import { decodeFunctionData, parseUnits } from 'viem';
import { perpPoolAbi } from '../../src/chain/abis';
import { A, B, mockWallet, connectMock, walletEvent } from './mock-wallet';

test('two injected accounts connect, switch live, switch/add Tokyo and disconnect without old data', async ({ page }) => {
  const state = await mockWallet(page);
  await connectMock(page);
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('200.00');
  await walletEvent(page, 'account', B);
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('0x2222');
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('300.00');
  await expect(page.getByRole('region', { name: 'Account funds' })).not.toContainText('200.00');
  await walletEvent(page, 'chain', '0xc488', true);
  await expect(page.locator('.submit-order')).toBeDisabled();
  await page.getByRole('button', { name: 'Switch to Somnia Tokyo testnet' }).click();
  await expect(page.locator('.network-alert')).toHaveCount(0);
  await expect(page.locator('.submit-order')).toBeEnabled();
  await walletEvent(page, 'disconnect');
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('Connect your wallet');
  await expect(page.locator('.history-row')).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test('exact 7 USDso approval confirms before deposit; amounts and receiving account are not hardcoded', async ({ page }) => {
  const state = await mockWallet(page);
  await connectMock(page);
  await walletEvent(page, 'account', B);
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('0x2222');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Manage margin collateral' }).click();
  await page.getByLabel('Amount', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Deposit 7 USDso' }).click();
  await expect(page.getByRole('dialog', { name: 'Manage collateral' })).toContainText('Deposit transaction confirmed');
  expect(state.writes).toHaveLength(2);
  expect(state.writes.every(tx => tx.from.toLowerCase() === B)).toBe(true);
  expect(state.accounts[B].margin).toBe(parseUnits('77', 18));
});

test('reject wallet approval, insufficient collateral and gas never become deposits/orders', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page);
  page.on('dialog', dialog => dialog.accept());
  state.rejectNext = true;
  await page.getByRole('button', { name: 'Manage margin collateral' }).click();
  await page.getByLabel('Amount', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Deposit 7 USDso' }).click();
  await expect(page.getByRole('dialog', { name: 'Manage collateral' })).toContainText('Request declined');
  expect(state.writes).toHaveLength(0);
  await page.getByLabel('Amount', { exact: true }).fill('201');
  await expect(page.getByRole('button', { name: 'Deposit 201 USDso' })).toBeDisabled();
  await page.getByLabel('Amount', { exact: true }).fill('7');
  state.accounts[A].gas = 0n;
  await page.getByRole('button', { name: 'Deposit 7 USDso' }).click();
  await expect(page.getByRole('dialog', { name: 'Manage collateral' })).toContainText('Insufficient Tokyo STT');
  expect(state.writes).toHaveLength(0);
});

test('IOC open succeeds, confirmation stays distinct from fills, fresh 100% close does not flip', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('.submit-order').click();
  await expect(page.locator('.order-entry .transaction-status')).toContainText('Confirmed');
  await expect(page.getByRole('tab', { name: /Positions \(1\)/ })).toBeVisible();
  const order = decodeFunctionData({ abi: perpPoolAbi, data: state.writes[0].data });
  expect(order.functionName).toBe('placeOrder');
  if (order.functionName === 'placeOrder') expect(order.args[5]).toBe(2);
  await page.getByRole('tabpanel').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('tab', { name: /Positions \(0\)/ })).toBeVisible();
  expect(state.accounts[A].size).toBe(0n);
  expect(state.writes).toHaveLength(2);
});

test('simulation failure never reaches wallet; reverted receipt is not a successful order', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page);
  page.on('dialog', dialog => dialog.accept());
  state.simulationFailure = true;
  await page.locator('.submit-order').click();
  await expect(page.locator('.order-entry .transaction-status')).toContainText('simulation failed');
  expect(state.writes).toHaveLength(0);
  state.simulationFailure = false; state.revertNext = true;
  await page.locator('.submit-order').click();
  await expect(page.locator('.order-entry .transaction-status')).toContainText('Transaction reverted');
  expect(state.accounts[A].size).toBe(0n);
});

test('Guardian arms per account, reload disarms and threshold requests exactly one reviewed IOC', async ({ page }) => {
  const state = await mockWallet(page);
  state.accounts[A].size = 10000n; state.accounts[B].size = 20000n;
  await connectMock(page);
  await page.locator('#risk > summary').click();
  await page.getByLabel('Stop-loss trigger in USDso').fill('79000');
  await page.getByRole('button', { name: /ARM CLIENT-SIDE REACTIVE GUARD/ }).click();
  await expect(page.locator('#risk')).toContainText('ARMED (ACTIVE TAB REQUIRED)');
  await walletEvent(page, 'account', B);
  await page.locator('#risk > summary').click();
  await expect(page.locator('#risk')).toContainText('DISARMED');
  await expect(page.getByLabel('Stop-loss trigger in USDso')).not.toHaveValue('79000');
  await page.getByLabel('Stop-loss trigger in USDso').fill('79000');
  await page.getByRole('button', { name: /ARM CLIENT-SIDE REACTIVE GUARD/ }).click();
  page.on('dialog', dialog => dialog.accept());
  state.mark = parseUnits('78000', 18);
  await expect.poll(() => state.writes.length).toBe(1);
  await expect.poll(() => state.accounts[B].size).toBe(0n);
  expect(state.writes[0].from.toLowerCase()).toBe(B);
  await page.reload();
  await page.locator('#risk > summary').click();
  await expect(page.locator('#risk')).toContainText('DISARMED');
});

test('switch during approval receipt cancels dependent deposit, late hash and toast do not leak', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page);
  page.on('dialog', dialog => dialog.accept()); state.holdReceipts = true;
  await page.getByRole('button', { name: 'Manage margin collateral' }).click();
  await page.getByLabel('Amount', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Deposit 7 USDso' }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await walletEvent(page, 'account', B);
  await expect(page.getByRole('dialog', { name: 'Manage collateral' })).toHaveCount(0);
  state.holdReceipts = false;
  // Observe past the receipt polling boundary without touching a real endpoint.
  await page.waitForTimeout(5000);
  expect(state.writes).toHaveLength(1);
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Account funds' })).not.toContainText('200.00');
});

test('confirmed IOC without a fill leaves the position flat and never claims execution', async ({ page }) => {
  const state = await mockWallet(page); state.fillOrders = false; await connectMock(page);
  page.on('dialog', dialog => dialog.accept()); await page.locator('.submit-order').click();
  await expect(page.locator('.order-entry .transaction-status')).toContainText('Confirmed · fill outcome pending verification');
  await expect(page.getByRole('tab', { name: 'Positions (0)', exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(1); expect(state.accounts[A].size).toBe(0n);
});

test('declining unsigned review never opens a wallet transaction request', async ({ page }) => {
  const state = await mockWallet(page); await connectMock(page);
  page.on('dialog', dialog => dialog.dismiss()); await page.locator('.submit-order').click();
  await expect(page.locator('.order-entry .transaction-status')).toContainText('declined');
  expect(state.writes).toEqual([]);
});
