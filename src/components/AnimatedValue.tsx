import NumberFlow from '@number-flow/react';
import { useEffect, useMemo, useRef } from 'react';

const timing = { duration: 200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' };
const opacityTiming = { ...timing, duration: 160 };

export function AnimatedValue({ value, digits = 2, flash = false }: {
  value: number; digits?: number; flash?: boolean;
}) {
  const flashNode = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);
  const format = useMemo(() => ({ minimumFractionDigits: digits, maximumFractionDigits: digits }), [digits]);
  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const node = flashNode.current;
    if (!flash || before === value || motionPreference.matches || !node) return;
    node.dataset.direction = value > before ? 'up' : 'down';
    const animation = node.animate([{ opacity: 0.16 }, { opacity: 0 }], timing);
    const cancel = () => animation.cancel();
    motionPreference.addEventListener('change', cancel);
    return () => {
      cancel();
      motionPreference.removeEventListener('change', cancel);
    };
  }, [value, flash]);
  const label = value.toLocaleString('en-US', format);
  return (
    <span className="animated-value" role="img" aria-label={label}>
      {flash && <span ref={flashNode} className="value-flash" aria-hidden="true" />}
      <NumberFlow aria-hidden="true" value={value} locales="en-US" format={format} transformTiming={timing} spinTiming={timing} opacityTiming={opacityTiming} />
    </span>
  );
}
