import type { PublicClient } from 'viem';
import { parseAbiItem, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '@/chain/abis';
import type { TradeHistoryItem } from './indexer';

export type { TradeHistoryItem };

/**
 * Transient cache helper for trade history.
 * localStorage is used strictly as a fast client-side read-through cache, NEVER as the authoritative data source.
 */
export function getTradeHistory(account: string): TradeHistoryItem[] {
  if (typeof window === 'undefined' || !account) return [];
  const normalizedAccount = account.toLowerCase();
  const key = `lucidkeeper_cache_trades_${normalizedAccount}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Ignore parse errors
    }
  }
  return [];
}

/**
 * Optimistically cache a newly submitted and confirmed trade item before the indexer has ingested the block.
 */
export function saveTradeHistoryItem(account: string, item: TradeHistoryItem): void {
  if (typeof window === 'undefined' || !account) return;
  const normalizedAccount = account.toLowerCase();
  const current = getTradeHistory(normalizedAccount);
  if (current.some((t) => t.hash.toLowerCase() === item.hash.toLowerCase())) {
    return;
  }
  const updated = [item, ...current];
  try {
    localStorage.setItem(`lucidkeeper_cache_trades_${normalizedAccount}`, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * On-chain RPC fallback using Viem getLogs.
 * Used if the GraphQL indexer is experiencing latency or downtime.
 */
export async function fetchRpcTradeHistoryFallback(
  publicClient: PublicClient,
  account: string
): Promise<TradeHistoryItem[]> {
  if (!publicClient || !account) return [];
  const normalizedAccount = account.toLowerCase() as `0x${string}`;
  const items: TradeHistoryItem[] = [];

  try {
    const currentBlock = await publicClient.getBlockNumber();
    // Scan recent 5,000 blocks for efficiency
    const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

    // 1. Scan MarginBank Deposited & Withdrawn logs
    const [deposits, withdrawals] = await Promise.all([
      publicClient.getLogs({
        address: CONTRACT_ADDRESSES.MARGIN_BANK,
        event: parseAbiItem('event Deposited(address indexed account, uint256 amount)'),
        args: { account: normalizedAccount },
        fromBlock,
      }),
      publicClient.getLogs({
        address: CONTRACT_ADDRESSES.MARGIN_BANK,
        event: parseAbiItem('event Withdrawn(address indexed account, uint256 amount)'),
        args: { account: normalizedAccount },
        fromBlock,
      }),
    ]);

    for (const log of deposits) {
      const amount = log.args.amount ? parseFloat(formatUnits(log.args.amount, 18)) : 0;
      items.push({
        id: `rpc-dep-${log.transactionHash}-${log.logIndex}`,
        hash: log.transactionHash,
        type: 'deposit',
        amountUsdso: amount,
        blockNumber: Number(log.blockNumber),
        timestamp: Date.now(), // estimated
        description: `Margin Deposit: ${amount.toFixed(2)} USDso (On-Chain Direct)`,
        source: 'rpc_fallback',
      });
    }

    for (const log of withdrawals) {
      const amount = log.args.amount ? parseFloat(formatUnits(log.args.amount, 18)) : 0;
      items.push({
        id: `rpc-wth-${log.transactionHash}-${log.logIndex}`,
        hash: log.transactionHash,
        type: 'withdraw',
        amountUsdso: amount,
        blockNumber: Number(log.blockNumber),
        timestamp: Date.now(),
        description: `Margin Withdrawal: ${amount.toFixed(2)} USDso (On-Chain Direct)`,
        source: 'rpc_fallback',
      });
    }

    // Sort newest first
    items.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
  } catch (err) {
    console.warn('[Viem Fallback] Could not fetch on-chain logs:', err);
  }

  return items;
}
