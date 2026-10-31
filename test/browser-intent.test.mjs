import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeFunctionData, encodeFunctionData, erc20Abi, maxUint256, zeroAddress } from 'viem';
import { CONTRACT_ADDRESSES, marginBankAbi, perpPoolAbi } from '../src/chain/abis.ts';
import { validateBrowserIntent } from '../src/lib/browser-intent.ts';
import { assertAccountMatches } from '../src/lib/data/accountScope.ts';
import { walletError } from '../src/lib/walletError.ts';

const wallets = ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222'];
const bank = CONTRACT_ADDRESSES.MARGIN_BANK;
const token = CONTRACT_ADDRESSES.COLLATERAL_USDSO;
const nowSeconds = 1793448000;
const amount = 7n * 10n ** 18n;
function check(action, functionName, args, extra = {}) {
  const abi = action === 'approve' ? erc20Abi : ['order', 'cancel'].includes(action) ? perpPoolAbi : marginBankAbi;
  const decoded = decodeFunctionData({ abi, data: encodeFunctionData({ abi, functionName, args }) });
  return validateBrowserIntent({ action, chainId: 50383, target: action === 'approve' ? token : ['order', 'cancel'].includes(action) ? CONTRACT_ADDRESSES.BTC_PERP_POOL : bank, bank, token, allowance: amount, balance: amount, nowSeconds, ...decoded, ...extra });
}
for (const wallet of wallets) test(`arbitrary connected wallet ${wallet}: exact funding, IOC/limit, withdraw/cancel`, () => {
  assertAccountMatches(wallet, wallet, true, 50383);
  check('approve', 'approve', [bank, amount], { allowance: 1n });
  check('deposit', 'deposit', [amount]);
  check('withdraw', 'withdraw', [amount]);
  check('cancel', 'cancelOrder', [123n]);
  for (const orderType of [2, 0]) check('order', 'placeOrder', [true, 0n, 100n, 10n, BigInt(nowSeconds + 300) * 10n ** 9n, orderType, 0, zeroAddress, 0n]);
});
test('browser intent rejects wrong network, spender/target, unlimited/zero amounts and insufficient balances', () => {
  assert.throws(() => check('deposit', 'deposit', [amount], { chainId: 50312 }), /Switch/);
  assert.throws(() => check('approve', 'approve', [wallets[0], amount]), /spender/);
  assert.throws(() => check('deposit', 'deposit', [amount], { target: wallets[0] }), /official/);
  for (const value of [0n, maxUint256]) assert.throws(() => check('approve', 'approve', [bank, value]), /positive.*exact/);
  assert.throws(() => check('deposit', 'deposit', [amount], { allowance: amount - 1n }), /Allowance/);
  assert.throws(() => check('deposit', 'deposit', [amount], { balance: amount - 1n }), /Insufficient wallet/);
});
test('IOC2 and five-minute expiry stay intact; FOK1, expired and extended orders rejected', () => {
  const args = [true, 0n, 100n, 10n, BigInt(nowSeconds + 300) * 10n ** 9n, 2, 0, zeroAddress, 0n];
  check('order', 'placeOrder', args);
  assert.throws(() => check('order', 'placeOrder', args.map((value, i) => i === 5 ? 1 : value)), /parameters/);
  for (const seconds of [0, 301, 720]) assert.throws(() => check('order', 'placeOrder', args.map((value, i) => i === 4 ? BigInt(nowSeconds + seconds) * 10n ** 9n : value)), /expired|window/);
});
test('browser product has no agent policy; pending writers check their wallet lifetime', () => {
  const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  for (const path of ['src/lib/browser-policy.ts', 'src/app/App.tsx', 'src/features/trade/TradingBox.tsx', 'src/features/margin/MarginHubModal.tsx', 'src/features/portfolio/PositionsTable.tsx', 'src/features/sentinel/RiskGuardian.tsx']) assert.doesNotMatch(source(path), /operating-policy|AUTHORIZED_SIGNER|MARGIN_HOLD|0x1420cF8/);
  for (const name of ['trade/TradingBox', 'margin/MarginHubModal', 'portfolio/PositionsTable', 'sentinel/RiskGuardian']) {
    const code = source(`src/features/${name}.tsx`);
    assert.match(code, /useWalletLifetime/);
    assert.match(code, /lifetime\.assert/);
    assert.match(code, /lifetime\.current/);
  }
  assert.match(source('src/lib/browser-policy.ts'), /validate\(\);\s*assertSession\(\)/);
});
test('wallet errors explain rejection, gas, margin, allowance and uncertain submission', () => {
  assert.match(walletError({ code: 4001 }), /declined/);
  assert.match(walletError(new Error('insufficient funds')), /Tokyo STT/);
  assert.match(walletError(new Error('InsufficientMarginForOrder')), /Deposit USDso/);
  assert.match(walletError(new Error('insufficient allowance')), /approval/);
  assert.match(walletError(new Error('timeout')), /submitted hash/);
});
