import { decodeFunctionData, encodeFunctionData, erc20Abi, parseAbi, type Abi, type Address, type PublicClient } from 'viem';
import { CONTRACT_ADDRESSES, marginBankAbi, perpPoolAbi } from '@/chain/abis';
import { validateBrowserIntent, type BrowserAction } from './browser-intent';
import { getAccount } from 'wagmi/actions';
import { wagmiConfig } from '@/chain/wagmiConfig';
import { assertAccountMatches } from './data/accountScope';

export function assertBrowserAccount(wallet: string) {
  const current = getAccount(wagmiConfig);
  assertAccountMatches(wallet, current.address, current.isConnected, current.chainId);
}

type Request = { chainId: number; address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; gas?: bigint };
/** No keys or agent policy: the user's live browser wallet reviews every write. */
export async function reviewBrowserWrite(client: PublicClient, request: Request, action: BrowserAction, wallet: Address, details: { market: string; size: string; description: string }, assertSession: () => void = () => assertBrowserAccount(wallet)) {
  assertSession();
  assertBrowserAccount(wallet);
  const data = encodeFunctionData(request);
  if (await client.getChainId() !== 50383) throw new Error('RPC chain mismatch');
  const bank = CONTRACT_ADDRESSES.MARGIN_BANK;
  const token = CONTRACT_ADDRESSES.COLLATERAL_USDSO;
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const system = await client.readContract({ address: bank, abi: marginBankAbi, functionName: 'getSystemConfig' });
  if (!system.fullyWired || !same(system.marginBank, bank) || !same(system.collateralToken, token)) throw new Error('MarginBank configuration mismatch');
  const allowance = await client.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [wallet, bank] });
  const call = decodeFunctionData({ abi: action === 'approve' ? erc20Abi : action === 'order' || action === 'cancel' ? perpPoolAbi : marginBankAbi, data });
  const balance = action === 'approve' || action === 'deposit' ? await client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [wallet] }) : undefined;
  const validate = () => validateBrowserIntent({ action, chainId: request.chainId, target: request.address, bank, token, functionName: call.functionName, args: call.args ?? [], allowance, balance, nowSeconds: Math.floor(Date.now() / 1000) });
  validate();
  if (action === 'order' || action === 'cancel') {
    const factoryAbi = parseAbi(['function isDeployedByFactory(address) view returns (bool)']);
    if (!await client.readContract({ address: system.perpPoolFactory, abi: factoryAbi, functionName: 'isDeployedByFactory', args: [request.address] })) throw new Error('Pool is not official');
    if (!same(await client.readContract({ address: request.address, abi: perpPoolAbi, functionName: 'marginBank' }), bank)) throw new Error('Pool MarginBank mismatch');
    if (action === 'order') {
      const args = decodeFunctionData({ abi: perpPoolAbi, data });
      if (args.functionName !== 'placeOrder') throw new Error('Invalid order');
      const grid = await client.readContract({ address: request.address, abi: perpPoolAbi, functionName: 'getOrderBookParameters' });
      if (grid.tickSize <= 0n || grid.lotSize <= 0n || args.args[2] <= 0n || args.args[2] % grid.tickSize || args.args[3] < grid.minQuantity || args.args[3] % grid.lotSize) throw new Error('Order grid mismatch');
    }
  }
  const nonce = await client.getTransactionCount({ address: wallet, blockTag: 'pending' });
  const fees = await client.estimateFeesPerGas();
  const gas = await client.estimateGas({ account: wallet, to: request.address, data, value: 0n });
  if (await client.getBalance({ address: wallet }) < gas * fees.maxFeePerGas) throw new Error('Insufficient Tokyo STT for gas');
   const envelope = { action, market: details.market, size: details.size, chainId: 50383, from: wallet, to: request.address, value: '0', data, nonce, gas: gas.toString(), fees: { maxFeePerGas: fees.maxFeePerGas.toString(), maxPriorityFeePerGas: fees.maxPriorityFeePerGas.toString() }, description: details.description, ...(action === 'order' && allowance > 0n ? { warning: 'Existing USDso allowance may let dreamDEX pull wallet collateral if margin is short. Revoke unused allowance in your wallet to prevent auto-pull.' } : {}) };
  const printed = JSON.stringify(envelope, null, 2);
  assertBrowserAccount(wallet);
  assertSession();
  if (!window.confirm(`Review the exact unsigned transaction. Cancel on any mismatch.\n\n${printed}`)) throw new Error('Transaction review declined');
  if (await client.getTransactionCount({ address: wallet, blockTag: 'pending' }) !== nonce) throw new Error('Nonce changed; stop and review again');
  validate();
  assertSession();
  // All allowed calls are nonpayable. Omitted value encodes the reviewed zero.
  assertBrowserAccount(wallet);
  return { account: wallet, nonce, gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas } as const;
}
