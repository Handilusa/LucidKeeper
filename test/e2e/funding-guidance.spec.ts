import { test, expect } from '@playwright/test';
import { parseUnits } from 'viem';
import { A, mockWallet, connectMock, walletEvent } from './mock-wallet';
import { BOUNTY_FUNDING, LIVE_TEST_ACCOUNT_PATH, PROJECT, PROOF } from '../../src/content/project';

for (const width of [375, 1440]) {
  test(`zero funds offers a prominent non-error read-only tour at ${width}px`, async ({ page }, testInfo) => {
    const state = await mockWallet(page);
    Object.assign(state.accounts[A], { gas: 0n, wallet: 0n, margin: 0n });
    await page.setViewportSize({ width, height: 1000 });
    await connectMock(page, false);
    const guide = page.getByRole('region', { name: 'Funding guidance' });
    await expect(guide.getByRole('heading', { name: 'Read-only — STT and USDso collateral needed' })).toBeVisible();
    await expect(guide).toContainText('not an application error');
    await expect(guide).toContainText('Missing: STT');
    await expect(guide).toContainText('Missing: program-distributed USDso');
    await expect(guide.getByRole('link', { name: 'Read-only profile & history' })).toHaveAttribute('href', `/app/profile/${A}`);
    await expect(guide.getByRole('link', { name: 'Live test account (read-only)' })).toHaveAttribute('href', LIVE_TEST_ACCOUNT_PATH);
    await guide.getByText('Trading funding requirements', { exact: true }).click();
    await expect(guide).toContainText(BOUNTY_FUNDING);
    await expect(guide).toContainText('Do not use Arena funds.');
    if (width === 375) await page.getByRole('button', { name: 'Trade', exact: true }).click();
    await expect(page.locator('.submit-order')).toHaveText('Funding needed · read-only');
    await expect(page.locator('#order-validation .form-error')).toHaveCount(0);
    await guide.getByRole('button', { name: 'Inspect Guardian' }).click();
    await expect(page.locator('#risk')).toHaveAttribute('open', '');
    await expect(page.getByText(/No active position in BTC/)).toBeVisible();
    await expect(page.getByRole('slider', { name: 'Hypothetical Stress Price Simulator' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'ARM CLIENT-SIDE REACTIVE GUARD' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await guide.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('zero-funds.png') });
    await guide.getByRole('link', { name: 'Read-only profile & history' }).click();
    await expect(page.getByRole('region', { name: 'Profile identity' })).toContainText(A);
    await expect(page.locator('[data-profile-ready="true"]')).toBeVisible();
    await expect(page.getByText('Some history reads failed.', { exact: false })).toHaveCount(0);
    expect(state.writes).toEqual([]);
  });
}

test('balance failures are unavailable, not zero or a missing-collateral conclusion', async ({ page }) => {
  const state = await mockWallet(page);
  state.gasFailure = true; state.walletFailure = true;
  await connectMock(page);
  const guide = page.getByRole('region', { name: 'Funding guidance' });
  await expect(guide).toContainText('STT balance unavailable');
  await expect(guide).toContainText('USDso wallet balance unavailable');
  await expect(guide).not.toContainText('Missing:');
  await expect(guide).not.toContainText('Read-only —');
  expect(state.writes).toEqual([]);
});

test('account read failure with zero wallet does not claim missing deposited collateral', async ({ page }) => {
  const state = await mockWallet(page);
  state.accounts[A].wallet = 0n; state.accountFailure = true;
  await connectMock(page, false);
  const guide = page.getByRole('region', { name: 'Funding guidance' });
  await expect(guide).toContainText('Margin or position reads unavailable');
  await expect(guide).not.toContainText('Missing: program-distributed');
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('Bank collateral — USDso');
  expect(state.writes).toEqual([]);
});

test('zero wallet USDso with deposited margin remains tradable and disconnect clears guidance', async ({ page }) => {
  const state = await mockWallet(page);
  state.accounts[A].wallet = 0n;
  await connectMock(page);
  const guide = page.getByRole('region', { name: 'Funding guidance' });
  await expect(guide).toContainText('Existing margin or positions detected');
  await expect(guide).not.toContainText('Read-only —');
  await expect(page.getByRole('region', { name: 'Account funds' })).toContainText('20.00');
  await walletEvent(page, 'disconnect');
  await expect(guide).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test('real-position Guardian stress remains a local preview without STT or transactions', async ({ page }) => {
  const state = await mockWallet(page);
  state.accounts[A].gas = 0n; state.accounts[A].wallet = 0n;
  state.accounts[A].size = parseUnits('0.0004', 8);
  await connectMock(page, false);
  const guide = page.getByRole('region', { name: 'Funding guidance' });
  await expect(guide).toContainText('Read-only — STT needed for gas');
  await expect(guide).not.toContainText('Missing: program-distributed');
  await guide.getByRole('button', { name: 'Inspect Guardian' }).click();
  const slider = page.getByRole('slider', { name: 'Hypothetical Stress Price Simulator' });
  await expect(slider).toBeEnabled();
  const before = await slider.inputValue();
  await slider.focus(); await page.keyboard.press('ArrowLeft');
  await expect(slider).not.toHaveValue(before);
  await expect(page.getByText('Scenario equity:')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ARM CLIENT-SIDE REACTIVE GUARD' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Panic Exit 100%', exact: true })).toBeDisabled();
  expect(state.writes).toEqual([]);
});

for (const width of [375, 1440]) {
  test(`landing live account and real Tokyo proof are read-only at ${width}px`, async ({ page }, testInfo) => {
    const state = await mockWallet(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const live = page.locator('.hero').getByRole('link', { name: 'Live test account', exact: true });
    await expect(live).toBeVisible();
    await expect(live).toHaveAttribute('href', LIVE_TEST_ACCOUNT_PATH);
    await expect(page.locator('.hero')).toContainText('Never a default signer');
    await page.screenshot({ path: testInfo.outputPath('hero.png') });
    const proof = page.locator('#proof');
    for (const record of PROOF) await expect(proof.locator(`a[href="${PROJECT.explorer}/tx/${record.hash}"]`)).toHaveCount(1);
    await expect(proof).toContainText('FOK execution; owner-relayed');
    const close = page.getByRole('complementary', { name: 'DOGE close evidence' });
    await expect(close).toContainText('not yet recorded');
    await expect(close.getByRole('link')).toHaveCount(0);
    await proof.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('proof.png') });
    await live.click();
    await expect(page.getByRole('region', { name: 'Profile identity' })).toContainText(PROJECT.account.toLowerCase());
    await expect(page.locator('[data-profile-ready="true"]')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __wallet: { requests: string[] } }).__wallet.requests)).not.toContain('eth_requestAccounts');
    await expect(page.locator('.submit-order')).toHaveCount(0);
    expect(state.writes).toEqual([]);
  });
}

test('field guide uses program-distributed funding only', async ({ page }) => {
  const state = await mockWallet(page);
  await page.goto('/app/docs');
  const funding = page.locator('#funding');
  await expect(funding).toContainText(BOUNTY_FUNDING);
  await expect(funding).toContainText('Do not use Arena funds.');
  await expect(funding).toContainText('Known limitation: independent-wallet trading requires program-distributed funds.');
  await expect(funding).not.toContainText(/faucet|voucher|paper USDso/i);
  await expect(funding.getByRole('link', { name: 'Live test account (read-only)' })).toHaveAttribute('href', LIVE_TEST_ACCOUNT_PATH);
  expect(state.writes).toEqual([]);
});
