import type { ReadDisplay } from '@/lib/data/readDisplay';

export function ReadValue({ read, decimals = 2 }: { read: ReadDisplay; decimals?: number }) {
  return <>
    {read.value == null ? '—' : read.value.toLocaleString('en-US', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    })}
    {read.value != null && read.stale && <span className="stale-badge" title={`Last successful read: ${new Date(read.updatedAt).toISOString()}`}>Stale</span>}
  </>;
}
