export function Freshness({ updatedAt, stale, label }: { updatedAt: number; stale: boolean; label?: string }) {
  return <span className={`freshness ${stale ? 'caution' : 'muted'}`} title={updatedAt ? `Last successful ${label || 'read'}: ${new Date(updatedAt).toISOString()}` : 'No successful read yet'}>
    <i aria-hidden="true" />{updatedAt ? stale ? 'Stale' : 'Live' : 'Awaiting data'}
    {updatedAt > 0 && <> · <time dateTime={new Date(updatedAt).toISOString()}>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }).format(updatedAt)} UTC</time></>}
  </span>;
}
