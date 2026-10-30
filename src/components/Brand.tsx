export function Brand({ href = '/' }: { href?: string }) {
  return <a href={href} className="brand" aria-label="LucidKeeper home" translate="no">
    <svg className="brand-mark" viewBox="0 0 24 28" fill="none" aria-hidden="true">
      <path d="M3 4 12 1 21 4v11c0 5-5 9-9 12-4-3-9-7-9-12V4Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8v11h8M12 8v7h4" stroke="currentColor" strokeWidth="1.5" />
    </svg>LucidKeeper
  </a>;
}

export function TestnetBadge() {
  return <span className="network-disclaimer"><span aria-hidden="true" />Testnet <span aria-hidden="true">–</span> no real funds</span>;
}
