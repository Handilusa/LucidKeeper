/** Inputs must be canonical and complete for the exact UTC window. Amounts are USDso atoms. */
export function windowReturn(input: {
  start: number; end: number; startingValue: bigint | null; endingValue: bigint | null;
  cashFlows: readonly { id: string; timestamp: number; blockNumber: bigint; logIndex: number; amount: bigint }[];
  completeCashFlows: boolean; verifiedBoundaryValues: boolean;
}) {
  if (!Number.isSafeInteger(input.start) || !Number.isSafeInteger(input.end) || input.end <= input.start) return { value: null, reason: 'Invalid historical window.' };
  if (input.startingValue === null || input.endingValue === null || !input.verifiedBoundaryValues) return { value: null, reason: 'Verified equity at both window boundaries is unavailable.' };
  if (!input.completeCashFlows) return { value: null, reason: 'Complete ordered cash-flow coverage is unavailable.' };
  const seen = new Set<string>();
  const positions = new Set<string>();
  let netDeposits = 0n;
  let maxNetDeposits = 0n;
  for (const flow of [...input.cashFlows].sort((a, b) => a.blockNumber < b.blockNumber ? -1 : a.blockNumber > b.blockNumber ? 1 : a.logIndex - b.logIndex)) {
    if (!Number.isSafeInteger(flow.timestamp) || flow.blockNumber < 0n || !Number.isSafeInteger(flow.logIndex) || flow.logIndex < 0) return { value: null, reason: 'Invalid cash-flow chain ordering.' };
    if (flow.timestamp < input.start || flow.timestamp >= input.end) continue;
    const position = `${flow.blockNumber}:${flow.logIndex}`;
    if (!flow.id || seen.has(flow.id) || positions.has(position)) return { value: null, reason: 'Ambiguous or duplicate cash-flow evidence.' };
    seen.add(flow.id);
    positions.add(position);
    netDeposits += flow.amount;
    if (netDeposits > maxNetDeposits) maxNetDeposits = netDeposits;
  }
  const pnl = input.endingValue - input.startingValue - netDeposits;
  const capital = input.startingValue + maxNetDeposits;
  const denominator = capital > 100n * 10n ** 18n ? capital : 100n * 10n ** 18n;
  const value = Number(pnl * 10n ** 10n / denominator) / 10 ** 10;
  return Number.isFinite(value)
    ? { value, reason: '', pnl, netDeposits, maxNetDeposits, denominator }
    : { value: null, reason: 'Return is outside the display range.' };
}

/** Recheck owner/window/market locally even when the upstream query is scoped. */
export function scopedProfileRows<T extends { id: string; timestamp: string | bigint | number; pool?: string | null; chainId?: number }>(
  rows: readonly T[], account: string, start: number, end: number, pools: readonly string[], owner: (row: T, account: string) => boolean,
): T[] {
  const allowed = new Set(pools.map(pool => pool.toLowerCase()));
  const seen = new Set<string>();
  return rows.filter(row => {
    const time = Number(row.timestamp);
    if (!row.id || seen.has(row.id) || !Number.isSafeInteger(time) || time < start || time >= end || (row.chainId !== undefined && row.chainId !== 50383) || (row.pool != null && !allowed.has(row.pool.toLowerCase())) || !owner(row, account.toLowerCase())) return false;
    seen.add(row.id); return true;
  });
}
export const ownsProfileRow = (row: { account: string }, account: string) => row.account?.toLowerCase() === account;
export const participatesInFill = (row: { maker: string | null; taker: string | null }, account: string) => row.maker?.toLowerCase() === account || row.taker?.toLowerCase() === account;
