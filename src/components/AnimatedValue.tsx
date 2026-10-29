import NumberFlow from '@number-flow/react';
import { useEffect, useRef } from 'react';

export function AnimatedValue({ value, digits = 2, flash = false }: {
  value: number; digits?: number; flash?: boolean;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (!flash || before === value || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const color = getComputedStyle(document.documentElement).getPropertyValue(value > before ? '--color-emerald' : '--color-rose');
    const animation = node.current?.animate([{ color, backgroundColor: `${color.trim()}20` }, { color: 'inherit', backgroundColor: 'transparent' }], { duration: 300 });
    return () => animation?.cancel();
  }, [value, flash]);
  const label = value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return <span ref={node} className="animated-value" role="img" aria-label={label}><NumberFlow aria-hidden="true" value={value} locales="en-US" format={{ minimumFractionDigits: digits, maximumFractionDigits: digits }} transformTiming={{ duration: 200, easing: 'ease-out' }} spinTiming={{ duration: 200, easing: 'ease-out' }} /></span>;
}
