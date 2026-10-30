import { readFileSync } from 'node:fs';
import { decodeFunctionData, erc20Abi, formatUnits, getAddress } from 'viem';
import { perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
export const capture = JSON.parse(readFileSync(new URL('./tokyo-public-reads.json', import.meta.url), 'utf8'));
export const btc = capture.snapshots.find(s => s.market.baseSymbol === 'BTC');
export const doge = capture.snapshots.find(s => s.market.baseSymbol === 'DOGE');
export const bigintGrid = snapshot => Object.fromEntries(Object.entries(snapshot.grid).map(([key, value]) => [key, BigInt(value)]));
export const approval = capture.execution[0];
export const order = capture.execution[2];
export const decodedOrder = decodeFunctionData({ abi: perpPoolWriteAbi, data: order.transaction.input });
export const amount = decodeFunctionData({ abi: erc20Abi, data: approval.transaction.input }).args[1];
export const orderInput = {
  side: decodedOrder.args[0] ? 'buy' : 'sell',
  price: formatUnits(decodedOrder.args[2], btc.market.quoteDecimals),
  quantity: formatUnits(decodedOrder.args[3], btc.market.baseDecimals),
};
export function historicalEnvelope(record = approval) {
  const tx = record.transaction;
  return Object.freeze({ chainId: tx.chainId, from: getAddress(tx.from), to: getAddress(tx.to), value: tx.value, data: tx.input, nonce: tx.nonce, gas: tx.gas, type: tx.type,
    fees: Object.freeze({ maxFeePerGas: tx.maxFeePerGas, maxPriorityFeePerGas: tx.maxPriorityFeePerGas }),
    description: 'Historical confirmed Tokyo transaction reconstructed from public RPC; not a live signing request.' });
}
