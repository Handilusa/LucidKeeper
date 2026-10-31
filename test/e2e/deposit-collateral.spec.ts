import { test, expect } from '@playwright/test';
import { decodeFunctionData, erc20Abi, parseUnits } from 'viem';
import { marginBankAbi, CONTRACT_ADDRESSES } from '../../src/chain/abis';
import { BOUNTY_FUNDING } from '../../src/content/project';
import { A, B, mockWallet, connectMock, walletEvent } from './mock-wallet';

for (const width of [375, 1440]) {
  test(`deposit is discoverable on Chart, Trade and Account; canonical approval then separate deposit at ${width}px`, async ({ page }, info) => {
    const state = await mockWallet(page);
    state.accounts[A].margin = 0n;
    state.heldReceiptMethods.add('approve'); state.heldReceiptMethods.add('deposit');
    await page.setViewportSize({ width, height: 1000 });
    await connectMock(page);
    const guide = page.getByRole('region', { name: 'Funding guidance' });
    await expect(guide.getByRole('button', { name: 'Deposit collateral', exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath('terminal-button.png'), fullPage: true, animations: 'disabled' });
    if (width === 375) await page.getByRole('button', { name: 'Trade', exact: true }).click();
    await expect(page.locator('.order-entry').getByRole('button', { name: 'Deposit collateral', exact: true })).toBeVisible();
    await expect(page.locator('.submit-order')).toHaveText('Deposit collateral to trade');
    await page.locator('.submit-order').click();
    const modal = page.getByRole('dialog', { name: 'Manage collateral' });
    await expect(modal.locator('.account-values dd').nth(0)).toHaveText('200.00 USDso');
    await expect(modal.locator('.account-values dd').nth(2)).toHaveText('0.00 USDso');
    await expect(modal.locator('.account-values dd').nth(3)).toHaveText('0.00 USDso');
    await modal.getByRole('button', { name: 'Max', exact: true }).click();
    await expect(modal.getByLabel('Amount', { exact: true })).toHaveValue('200');
    await modal.getByLabel('Amount', { exact: true }).fill('7');
    await page.screenshot({ path: info.outputPath('ready.png'), animations: 'disabled' });
    page.on('dialog', dialog => dialog.accept());
    await modal.getByRole('button', { name: 'Deposit 7 USDso', exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
    const progress = modal.getByRole('list', { name: 'Collateral progress' });
    await expect(progress.locator('li').nth(0)).toHaveAttribute('data-state', 'pending');
    await expect(progress.locator('li').nth(0).getByRole('link')).toHaveAttribute('href', /tokyo\/tx\/0x0+1$/);
    expect(state.accounts[A].margin).toBe(0n);
    await page.screenshot({ path: info.outputPath('approve-pending.png'), animations: 'disabled' });
    state.heldReceiptMethods.delete('approve');
    state.mineBlock();
    await expect.poll(() => state.writes.length, { timeout: 15000 }).toBe(2);
    await expect(progress.locator('li').nth(0)).toHaveAttribute('data-state', 'confirmed');
    await expect(progress.locator('li').nth(1)).toHaveAttribute('data-state', 'pending');
    await page.screenshot({ path: info.outputPath('approve-confirmed-deposit-pending.png'), animations: 'disabled' });
    const approval = decodeFunctionData({ abi: erc20Abi, data: state.writes[0].data });
    expect(approval.functionName).toBe('approve');
    expect(approval.args).toEqual([CONTRACT_ADDRESSES.MARGIN_BANK, parseUnits('7', 18)]);
    const deposit = decodeFunctionData({ abi: marginBankAbi, data: state.writes[1].data });
    expect(deposit.functionName).toBe('deposit'); expect(deposit.args).toEqual([parseUnits('7', 18)]);
    state.heldReceiptMethods.delete('deposit');
    state.mineBlock();
    await expect(modal).toContainText('Deposit transaction confirmed', { timeout: 15000 });
    await expect(progress.locator('li').nth(1)).toHaveAttribute('data-state', 'confirmed');
    await expect(progress.getByRole('link')).toHaveCount(2);
    expect(state.accounts[A].margin).toBe(parseUnits('7', 18));
    await page.screenshot({ path: info.outputPath('deposit-confirmed.png'), animations: 'disabled' });
    await page.keyboard.press('Escape');
    if (width === 375) await page.getByRole('button', { name: 'Activity', exact: true }).click();
    const funds = page.getByRole('region', { name: 'Account funds' });
    await expect(funds.getByRole('button', { name: 'Deposit collateral', exact: true })).toBeVisible();
    await expect(funds).toContainText('Available margin');
    await funds.getByRole('button', { name: 'Withdraw', exact: true }).click();
    await expect(modal.getByRole('button', { name: 'Withdraw', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  for (const edge of ['no-stt', 'no-usdso', 'wallet-unavailable', 'margin-unavailable', 'gas-unavailable', 'wrong-network'] as const) {
    test(`visible deposit handles ${edge} without writes at ${width}px`, async ({ page }, info) => {
      const state = await mockWallet(page); state.accounts[A].margin = 0n;
      if (edge === 'no-stt') state.accounts[A].gas = 0n;
      if (edge === 'no-usdso') state.accounts[A].wallet = 0n;
      if (edge === 'wallet-unavailable') state.walletFailure = true;
      if (edge === 'margin-unavailable') state.accountFailure = true;
      if (edge === 'gas-unavailable') state.gasFailure = true;
      await page.setViewportSize({ width, height: 1000 });
      await connectMock(page, edge === 'gas-unavailable' || edge === 'wallet-unavailable' || edge === 'wrong-network');
      if (edge === 'wrong-network') await walletEvent(page, 'chain', '0xc488', true);
      const guide = page.getByRole('region', { name: 'Funding guidance' });
      await expect(guide.getByRole('button', { name: 'Deposit collateral', exact: true })).toBeVisible();
      await guide.getByRole('button', { name: 'Deposit collateral', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Manage collateral' });
      if (edge === 'no-stt') await expect(modal).toContainText('STT is needed for gas');
      if (edge === 'no-usdso') { await expect(modal).toContainText(BOUNTY_FUNDING); await expect(modal).toContainText('Do not use Arena funds.'); }
      if (edge === 'wallet-unavailable' || edge === 'margin-unavailable') await expect(modal.locator('.account-values dd').nth(0)).toHaveText('Unavailable USDso');
      if (edge === 'gas-unavailable') await expect(modal).toContainText('STT gas balance Unavailable');
      if (edge === 'wrong-network') {
        await expect(modal.getByRole('button', { name: 'Switch to Somnia Tokyo testnet' })).toBeVisible();
        await expect(modal.getByRole('button', { name: 'Switch to Tokyo first' })).toBeDisabled();
      } else await expect(modal.getByRole('button', { name: 'Deposit 2.0 USDso' })).toBeDisabled();
      if (edge.includes('unavailable')) await expect(modal.locator('.account-values')).not.toContainText('Wallet assets 0.00');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: info.outputPath(`${edge}.png`), animations: 'disabled' });
      expect(state.writes).toEqual([]);
    });
  }

  for (const failedStep of ['approve', 'deposit'] as const) {
    test(`${failedStep} failure keeps its hash and never reports success at ${width}px`, async ({ page }, info) => {
      const state = await mockWallet(page); state.accounts[A].margin = 0n;
      state.revertNext = failedStep === 'approve';
      if (failedStep === 'deposit') state.heldReceiptMethods.add('approve');
      await page.setViewportSize({ width, height: 1000 }); await connectMock(page);
      page.on('dialog', dialog => dialog.accept());
      await page.getByRole('region', { name: 'Funding guidance' }).getByRole('button', { name: 'Deposit collateral', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Manage collateral' });
      await modal.getByLabel('Amount', { exact: true }).fill('7');
      await modal.getByRole('button', { name: 'Deposit 7 USDso' }).click();
      if (failedStep === 'deposit') { await expect.poll(() => state.writes.length).toBe(1); state.revertNext = true; state.heldReceiptMethods.delete('approve'); state.mineBlock(); }
      await expect(modal).toContainText('reverted', { timeout: 15000 });
      const progress = modal.getByRole('list', { name: 'Collateral progress' });
      await expect(progress.locator('li').nth(failedStep === 'approve' ? 0 : 1)).toHaveAttribute('data-state', 'failed');
      await expect(progress.locator('li').nth(failedStep === 'approve' ? 0 : 1).getByRole('link')).toHaveAttribute('href', /tokyo\/tx\/0x/);
      expect(state.writes).toHaveLength(failedStep === 'approve' ? 1 : 2);
      expect(state.accounts[A].margin).toBe(0n);
      await page.screenshot({ path: info.outputPath(`${failedStep}-failed.png`), animations: 'disabled' });
    });
  }

  test(`portfolio funds manages connected A, never watched B, at ${width}px`, async ({ page }, info) => {
    const state = await mockWallet(page); state.accounts[A].locked = parseUnits('3', 18);
    await page.setViewportSize({ width, height: 1000 }); await connectMock(page);
    await page.goto(`/app/profile/${B}`);
    await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
    await page.getByRole('button', { name: /MetaMask/ }).click();
    const funds = page.getByRole('region', { name: 'Connected wallet collateral' });
    await expect(funds).toContainText('0x1111'); await expect(funds).not.toContainText('0x2222');
    await expect(funds.locator('.account-values dd').nth(3)).toHaveText('3.00 USDso');
    await expect(funds.getByRole('button', { name: 'Deposit collateral', exact: true })).toBeVisible();
    await funds.screenshot({ path: info.outputPath('portfolio-funds.png'), animations: 'disabled' });
    await funds.getByRole('button', { name: 'Withdraw', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Manage collateral' });
    await expect(modal.getByRole('button', { name: 'Withdraw', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(modal.locator('.account-values dd').nth(3)).toHaveText('3.00 USDso');
    expect(state.writes).toEqual([]);
  });

  test(`existing allowance requires only the separate deposit at ${width}px`, async ({ page }, info) => {
    const state = await mockWallet(page); state.accounts[A].margin = 0n; state.accounts[A].allowance = parseUnits('7', 18);
    await page.setViewportSize({ width, height: 1000 }); await connectMock(page);
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('region', { name: 'Funding guidance' }).getByRole('button', { name: 'Deposit collateral', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Manage collateral' });
    await modal.getByLabel('Amount', { exact: true }).fill('7');
    await modal.getByRole('button', { name: 'Deposit 7 USDso' }).click();
    await expect(modal).toContainText('Deposit transaction confirmed');
    await expect(modal).toContainText('Existing allowance sufficient; no new approval needed.');
    expect(state.writes).toHaveLength(1);
    expect(decodeFunctionData({ abi: marginBankAbi, data: state.writes[0].data }).functionName).toBe('deposit');
    await page.screenshot({ path: info.outputPath('existing-allowance.png'), animations: 'disabled' });
  });
}
