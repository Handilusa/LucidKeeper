export function Brand({
  href = '/',
  variant = 'white',
}: {
  href?: string;
  variant?: 'white' | 'neon';
}) {
  const logoSrc =
    variant === 'neon'
      ? '/assets/brand/lucidkeeper-neon.png'
      : '/assets/brand/lucidkeeper-white.png';

  return (
    <a href={href} className="brand" aria-label="LucidKeeper home" translate="no">
      <img
        src={logoSrc}
        alt=""
        aria-hidden="true"
        className="brand-mark"
        width={32}
        height={24}
        loading="eager"
      />
      <span>LucidKeeper</span>
    </a>
  );
}

export function TestnetBadge() {
  return (
    <span className="network-disclaimer">
      <span aria-hidden="true" />
      Testnet <span aria-hidden="true">–</span> no real funds
    </span>
  );
}
