import { useEffect, useRef } from 'react';
import { assertBrowserAccount } from './browser-policy';

/** A→B→A must not revive work started in the first A component. */
export function useWalletLifetime(wallet?: string) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const current = () => {
    if (!mounted.current || !wallet) return false;
    try { assertBrowserAccount(wallet); return true; } catch { return false; }
  };
  return {
    current,
    assert: () => { if (!current()) throw new Error('Wallet account/network changed. Previous operation cancelled; review again.'); },
  };
}
