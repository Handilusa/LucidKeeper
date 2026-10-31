import { maxUint256, type Address } from 'viem';

export type BrowserAction = 'approve' | 'deposit' | 'withdraw' | 'order' | 'cancel';
const same = (a: unknown, b: string) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();

/** Product policy: any connected wallet; only verified Tokyo contract operations. */
export function validateBrowserIntent(input: {
  action: BrowserAction; chainId: number; target: Address; bank: Address; token: Address;
  functionName: string; args: readonly unknown[]; allowance: bigint; balance?: bigint; nowSeconds: number;
}) {
  const { action, target, bank, token, functionName, args, allowance } = input;
  if (input.chainId !== 50383) throw new Error('Switch to Somnia Tokyo testnet (50383).');
  if (action === 'order') {
    if (functionName !== 'placeOrder' || args[1] !== 0n || ![0, 2].includes(Number(args[5])) || args[6] !== 0 || !same(args[7], '0x0000000000000000000000000000000000000000') || args[8] !== 0n)
      throw new Error('Unsupported order parameters. Refresh and review again.');
    const now = BigInt(input.nowSeconds) * 1_000_000_000n;
    if (typeof args[4] !== 'bigint' || args[4] <= now || args[4] > now + 300_000_000_000n)
      throw new Error('Order expired or outside the five-minute window. Review a new order.');
    return;
  }
  if (action === 'cancel') {
    if (functionName !== 'cancelOrder' || typeof args[0] !== 'bigint' || args[0] <= 0n) throw new Error('Invalid cancellation. Refresh open orders.');
    return;
  }
  const amount = action === 'approve' ? args[1] : args[0];
  if (typeof amount !== 'bigint' || amount <= 0n || amount === maxUint256) throw new Error('Use a positive, exact USDso amount; unlimited approval is not supported.');
  if (action === 'approve') {
    if (!same(target, token) || functionName !== 'approve' || !same(args[0], bank)) throw new Error('Approval must target USDso and the official MarginBank spender.');
  } else if (!same(target, bank) || functionName !== action) throw new Error('Collateral operations must target the official MarginBank.');
  if (action === 'deposit' && allowance < amount) throw new Error('Allowance is insufficient. Confirm the exact-amount approval, then retry the deposit.');
  if (action !== 'withdraw' && (input.balance === undefined || input.balance < amount)) throw new Error('Insufficient wallet USDso. Get test collateral from the official dreamDEX app, then refresh.');
}
