const key = 'lucidkeeper_observed_accounts_50383';
export const OBSERVED_ACCOUNT_LIMIT = 5;
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
const normalize = (address: unknown) => typeof address === 'string' && /^0x[0-9a-f]{40}$/i.test(address) ? address.toLowerCase() as `0x${string}` : null;
export function observedAccounts(storage: Storage): `0x${string}`[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.map(normalize).filter((a): a is `0x${string}` => !!a))].slice(0, OBSERVED_ACCOUNT_LIMIT) : [];
  } catch { return []; }
}
export function observeAccount(storage: Storage, address: string) {
  const account = normalize(address);
  if (!account) return;
  try { storage.setItem(key, JSON.stringify([account, ...observedAccounts(storage).filter(a => a !== account)].slice(0, OBSERVED_ACCOUNT_LIMIT))); } catch { /* Optional browser-local registry. */ }
}
export function clearObservedAccounts(storage: Storage) { try { storage.removeItem(key); } catch { /* Optional browser storage. */ } }
