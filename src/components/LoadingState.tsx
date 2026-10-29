import { useEffect, useState } from 'react';

/** Initial read animation is bounded, including when a transport never settles. */
export function LoadingState({ label, onRetry }: { label: string; onRetry?: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(timer);
  }, []);
  return <div className="loading-state" role="status">
    <span className="loading-track" aria-hidden="true" />
    <strong>{slow ? 'This read is taking longer than expected.' : label}</strong>
    {slow && <span className="muted">Data is not ready.{onRetry && <> <button className="text-violet-300 underline" onClick={onRetry}>Retry read</button></>}</span>}
  </div>;
}
