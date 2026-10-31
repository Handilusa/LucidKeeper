/** Public reads have no implicit owner. Never substitute the demo/bounty wallet. */
export function connectedAccount(address: string | undefined, connected: boolean): `0x${string}` | undefined {
  return connected && address && /^0x[0-9a-f]{40}$/i.test(address)
    ? address.toLowerCase() as `0x${string}`
    : undefined;
}

/** Remount transient controls, dialogs and receipt state on every identity/network change. */
export function accountSessionKey(account: string | undefined, chainId: number | undefined): string {
  return `${account ?? 'disconnected'}:${chainId ?? 'unknown'}`;
}

/** Browser preferences/caches are namespaced by the read network, owner and optional pool. */
export function accountStorageKey(kind: string, account?: string, pool?: string): string | null {
  const owner = connectedAccount(account, true);
  if (!owner) return null;
  return `lucidkeeper_${kind}_50383_${owner}${pool ? `_${pool.toLowerCase()}` : ''}`;
}

/** A pending review may outlive the component that started it. Fail closed on a wallet switch. */
export function assertAccountMatches(expected: string, address: string | undefined, connected: boolean, chainId: number | undefined): void {
  if (chainId !== 50383 || connectedAccount(address, connected) !== connectedAccount(expected, true) || !connectedAccount(expected, true)) {
    throw new Error('Wallet disconnected or account/network changed. Review again with the current wallet.');
  }
}
