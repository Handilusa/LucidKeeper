import { useState } from 'react';

// Only symbols actually bundled from cryptocurrency-icons; no remote image requests.
const available = new Set(['BTC', 'ETH', 'SOL', 'DOGE', 'BNB', 'XRP', 'ADA', 'LINK', 'XLM', 'ZEC', 'AVAX']);
export function TokenLogo({ symbol, size = 22 }: { symbol: string; size?: number }) {
  const [failed, setFailed] = useState('');
  const name = symbol.toUpperCase();
  return <span className="token-logo" style={{ width: size, height: size }} aria-hidden="true">
    {available.has(name) && failed !== name
      ? <img src={`/assets/tokens/${name.toLowerCase()}.svg`} alt="" width={size} height={size} onError={() => setFailed(name)} />
      : <span>{name.slice(0, 1)}</span>}
  </span>;
}
