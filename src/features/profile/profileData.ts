import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import type { PublicClient, Address } from 'viem';
import { formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, marginBankAbi, perpPoolAbi } from '@/chain/abis';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import { INDEXER_GRAPHQL_URL } from '@/lib/data/indexer';

// Separate read-only consumer. No wallet client, writer or trading helper is used.
export const profileClient = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: INDEXER_GRAPHQL_URL,
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
}).client;
export const HISTORY_LIMIT = 1000;
export const units = (value: bigint | string, decimals = 18) =>
  Number(formatUnits(BigInt(value), decimals));
export const marketFor = (pool: string) =>
  ALL_VERIFIED_PERP_MARKETS.find((m) => m.poolAddress.toLowerCase() === pool.toLowerCase());
export const numberText = (value: number | null | undefined, decimals = 4) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-US', { maximumFractionDigits: decimals });
export const utc = (seconds: number) =>
  new Date(seconds * 1000).toISOString().replace('T', ' ').slice(0, 19);

export async function readProfileSnapshot(account: Address, rpc: PublicClient) {
  const margin = await profileClient.getMarginAccount(CONTRACT_ADDRESSES.MARGIN_BANK, account);
  const positions = await Promise.all(
    margin.activePerpPools.map(async (pool) => {
      const market = marketFor(pool);
      if (!market) throw new Error('An active pool has no verified market metadata');
      const [position, mark] = await Promise.all([
        rpc.readContract({
          address: CONTRACT_ADDRESSES.MARGIN_BANK,
          abi: marginBankAbi,
          functionName: 'getPosition',
          args: [account, pool],
          blockNumber: margin.asOfBlock,
        }),
        rpc.readContract({
          address: pool,
          abi: perpPoolAbi,
          functionName: 'tryGetMarkPrice',
          blockNumber: margin.asOfBlock,
        }),
      ]);
      const size = units(position.size, market.baseDecimals);
      const entry = units(position.avgEntryPrice, market.quoteDecimals);
      const price = mark[0] && mark[1] > 0n ? units(mark[1], market.quoteDecimals) : null;
      return {
        id: pool,
        symbol: market.baseSymbol,
        size,
        entry,
        price,
        pnl: price === null ? null : size * (price - entry),
      };
    })
  );
  return { margin, positions: positions.filter((p) => p.size !== 0), observedAt: Date.now() };
}

export type TableCell = string | number | null;
export interface ProfileRow {
  id: string;
  time: number;
  cells: TableCell[];
  hash?: string;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRows(
  headers: string[],
  rows: ProfileRow[],
  filename: string,
  account: string
) {
  const cell = (v: TableCell) => {
    const raw = v === null ? '' : String(v);
    const safe = typeof v === 'string' && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const lines = [
    ['Account', 'Chain', ...headers, 'Transaction hash'],
    ...rows.map((r) => [account, 50383, ...r.cells, r.hash || '']),
  ];
  downloadBlob(
    new Blob(['\uFEFF', lines.map((r) => r.map(cell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    }),
    filename
  );
}

export function aliasError(value: string) {
  return value === '' || /^[A-Za-z0-9][A-Za-z0-9 _-]{1,23}$/.test(value)
    ? ''
    : 'Use 2–24 letters, numbers, spaces, underscores or hyphens. Start with a letter or number.';
}
