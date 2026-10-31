import type { PublicClient } from 'viem';
import { parseAbiItem } from 'viem';
import { CONTRACT_ADDRESSES } from '@/chain/abis';
import type { TradeHistoryItem } from './indexer';
import { accountStorageKey } from './accountScope';
import { observationArray, observationRecord, observationHex, observationUnits, observationInteger } from './observations';

export type { TradeHistoryItem };

function validCachedItem(value: unknown): value is TradeHistoryItem {
  try {
    const item = observationRecord(value, 'Cached history');
    observationHex(item.hash, 32, 'Cached hash');
    if (typeof item.id !== 'string' || !item.id || typeof item.description !== 'string' || !item.description ||
      typeof item.timestamp !== 'number' || !Number.isSafeInteger(item.timestamp) || item.timestamp < 0 ||
      !Number.isFinite(new Date(item.timestamp).getTime())) return false;
    for (const key of ['size', 'price', 'amountUsdso', 'blockNumber']) {
      if (item[key] !== undefined && (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0)) return false;
    }
    if (item.type === 'deposit' || item.type === 'withdraw') return typeof item.amountUsdso === 'number';
    if (item.type === 'order' || item.type === 'close') return typeof item.size === 'number' &&
      typeof item.marketSymbol === 'string' && !!item.marketSymbol && ['buy', 'sell'].includes(String(item.side));
    return item.type === 'approve';
  } catch { return false; }
}

/**
 * Transient cache helper for trade history.
 * localStorage is used strictly as a fast client-side read-through cache, NEVER as the authoritative data source.
 */
export function getTradeHistory(account: string): TradeHistoryItem[] {
  if (typeof window === 'undefined' || !account) return [];
  const normalizedAccount = account.toLowerCase();
  const key = accountStorageKey('cache_trades', normalizedAccount);
  if (!key) return [];
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.filter(validCachedItem);
    }
  } catch {
    // Storage can be blocked or contain invalid JSON.
  }
  return [];
}

/**
 * Optimistically cache a newly submitted and confirmed trade item before the indexer has ingested the block.
 */
export function saveTradeHistoryItem(account: string, item: TradeHistoryItem): void {
  if (typeof window === 'undefined' || !account || !validCachedItem(item)) return;
  const normalizedAccount = account.toLowerCase();
  const key = accountStorageKey('cache_trades', normalizedAccount);
  if (!key) return;
  const current = getTradeHistory(normalizedAccount);
  if (current.some((t) => t.hash.toLowerCase() === item.hash.toLowerCase())) {
    return;
  }
  const updated = [item, ...current];
  try {
    localStorage.setItem(key, JSON.stringify(updated));
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
  if (!publicClient || !account) throw new Error('RPC history unavailable');
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
        strict: true,
      }),
      publicClient.getLogs({
        address: CONTRACT_ADDRESSES.MARGIN_BANK,
        event: parseAbiItem('event Withdrawn(address indexed account, uint256 amount)'),
        args: { account: normalizedAccount },
        fromBlock,
        strict: true,
      }),
    ]);

    for (const [type, logs] of [['deposit', deposits], ['withdraw', withdrawals]] as const) {
      for (const value of observationArray(logs, `RPC ${type} logs`)) {
        const log = observationRecord(value, 'RPC log');
        const args = observationRecord(log.args, 'RPC decoded arguments');
        if (observationHex(args.account, 20, 'RPC log account').toLowerCase() !== normalizedAccount)
          throw new Error('RPC history account mismatch');
        const amount = observationUnits(args.amount, 18, 'RPC log amount');
        const hash = observationHex(log.transactionHash, 32, 'RPC log hash');
        items.push({
          id: `rpc-${type}-${hash}-${observationInteger(log.logIndex, 'RPC log index')}`,
          hash, type, amountUsdso: amount,
          blockNumber: observationInteger(log.blockNumber, 'RPC log block'),
          timestamp: Date.now(), // Local observation time, explicitly labeled in the UI.
          description: `Margin ${type === 'deposit' ? 'Deposit' : 'Withdrawal'}: ${amount.toFixed(2)} USDso (On-Chain Direct)`,
          source: 'rpc_fallback',
        });
      }
    }

    // Sort newest first
    items.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
  } catch (err) {
    console.warn('[Viem Fallback] Could not fetch on-chain logs:', err);
    throw err;
  }

  return items;
}
