import { decodeFunctionData, encodeFunctionData, erc20Abi, parseAbi, type Abi, type Address, type PublicClient } from 'viem';
import { CONTRACT_ADDRESSES, marginBankAbi, perpPoolAbi } from '@/chain/abis';
import { assertOnchainActionAllowed } from './operating-policy.mjs';

type Request = { chainId: number; address: Address; abi: Abi; functionName: string; args?: readonly unknown[]; gas?: bigint };
/** No signing secrets. Configured browser signer receives only an explicitly reviewed envelope.
 * HOLD is checked before any preparation and again immediately before wallet dispatch.
 */
export async function reviewBrowserWrite(client: PublicClient, request: Request, action: string, wallet: Address, details: { market: string; size: string; description: string }) {
  assertOnchainActionAllowed(action, { chainId: request.chainId, wallet });
  const data = encodeFunctionData(request);
  if (await client.getChainId() !== 50383) throw new Error('RPC chain mismatch');
  const code = await client.getCode({ address: wallet });
  if (code && code !== '0x') throw new Error('Signer must be an undelegated EOA');
  const bank = CONTRACT_ADDRESSES.MARGIN_BANK;
  const token = CONTRACT_ADDRESSES.COLLATERAL_USDSO;
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const system = await client.readContract({ address: bank, abi: marginBankAbi, functionName: 'getSystemConfig' });
  if (!system.fullyWired || !same(system.marginBank, bank) || !same(system.collateralToken, token)) throw new Error('MarginBank configuration mismatch');
  const allowance = await client.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [wallet, bank] });
  if (action === 'order') {
    const order = decodeFunctionData({ abi: perpPoolAbi, data });
    if (order.functionName !== 'placeOrder') throw new Error('Only reviewed IOC orders are allowed');
    const args = order.args;
    if (args[1] !== 0n || args[5] !== 2 || args[6] !== 0 || args[7] !== '0x0000000000000000000000000000000000000000' || args[8] !== 0n) throw new Error('Order parameters outside reviewed allowlist');
    const expiry = BigInt(Math.floor(Date.now() / 1000)) * 1_000_000_000n;
    if (args[4] <= expiry || args[4] > expiry + 300_000_000_000n) throw new Error('Order review expiry must be within five minutes');
    const factoryAbi = parseAbi(['function isDeployedByFactory(address) view returns (bool)']);
    if (!await client.readContract({ address: system.perpPoolFactory, abi: factoryAbi, functionName: 'isDeployedByFactory', args: [request.address] })) throw new Error('Pool is not official');
    const grid = await client.readContract({ address: request.address, abi: perpPoolAbi, functionName: 'getOrderBookParameters' });
    if (grid.tickSize <= 0n || grid.lotSize <= 0n || args[2] <= 0n || args[2] % grid.tickSize || args[3] < grid.minQuantity || args[3] % grid.lotSize) throw new Error('Order grid mismatch');
    if (allowance !== 0n) throw new Error('Zero allowance required: owner orders must not auto-pull collateral');
  } else {
    const amount = 2n * 10n ** 18n;
    if (action === 'approve') {
      const call = decodeFunctionData({ abi: erc20Abi, data });
      if (!same(request.address, token) || call.functionName !== 'approve' || !same(call.args[0], bank) || call.args[1] !== amount || allowance !== 0n) throw new Error('Approval must be exactly 2 USDso to MarginBank from zero allowance');
    } else {
      const call = decodeFunctionData({ abi: marginBankAbi, data });
      if (!same(request.address, bank) || call.functionName !== 'deposit' || call.args[0] !== amount || allowance < amount) throw new Error('Deposit must be exactly 2 USDso after confirmed allowance');
    }
    if (await client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [wallet] }) < amount) throw new Error('Insufficient bounty USDso; request funds in Discord');
  }
  const nonce = await client.getTransactionCount({ address: wallet, blockTag: 'pending' });
  const fees = await client.estimateFeesPerGas();
  const gas = await client.estimateGas({ account: wallet, to: request.address, data, value: 0n });
  if (await client.getBalance({ address: wallet }) < gas * fees.maxFeePerGas) throw new Error('Insufficient Tokyo STT for gas');
  const envelope = { action, market: details.market, size: details.size, chainId: 50383, from: wallet, to: request.address, value: '0', data, nonce, gas: gas.toString(), fees: { maxFeePerGas: fees.maxFeePerGas.toString(), maxPriorityFeePerGas: fees.maxPriorityFeePerGas.toString() }, description: details.description };
  const printed = JSON.stringify(envelope, null, 2);
  console.info('Exact live action for approval', printed);
  if (!window.confirm(`Review the exact unsigned transaction. Cancel on any mismatch.\n\n${printed}`)) throw new Error('Transaction review declined');
  assertOnchainActionAllowed(action, { chainId: request.chainId, wallet });
  if (await client.getTransactionCount({ address: wallet, blockTag: 'pending' }) !== nonce) throw new Error('Nonce changed; stop and review again');
  assertOnchainActionAllowed(action, { chainId: request.chainId, wallet });
  // All allowed calls are nonpayable. Omitted value encodes the reviewed zero.
  return { account: wallet, nonce, gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas } as const;
}
