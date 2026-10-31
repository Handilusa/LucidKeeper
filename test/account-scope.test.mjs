import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { connectedAccount, accountSessionKey, accountStorageKey, assertAccountMatches } from '../src/lib/data/accountScope.ts';
import { capture, btc } from './fixtures/captured.mjs';

// Public captured addresses only. The pool address is a foreign read identity, not a signer.
const owner = capture.execution[0].transaction.from;
const foreign = btc.market.poolAddress;

test('disconnect, reconnecting and invalid addresses never select a default account', () => {
  assert.equal(connectedAccount(undefined, false), undefined);
  assert.equal(connectedAccount(owner, false), undefined);
  assert.equal(connectedAccount(undefined, true), undefined);
  assert.equal(connectedAccount('not-an-address', true), undefined);
  assert.equal(connectedAccount(owner, true), owner.toLowerCase());
  assert.notEqual(connectedAccount(foreign, true), connectedAccount(owner, true));
});

test('account and network transitions have distinct UI lifetimes; casing does not change owner', () => {
  const a = connectedAccount(owner, true);
  const b = connectedAccount(foreign, true);
  assert.equal(new Set([
    accountSessionKey(undefined, undefined), accountSessionKey(a, 50383),
    accountSessionKey(b, 50383), accountSessionKey(a, 50312),
    accountSessionKey(undefined, 50383),
  ]).size, 5);
  assert.equal(connectedAccount(owner.toUpperCase(), true), a);
});

test('leverage, aliases and receipt caches isolate wallets and pools; no disconnected or legacy key', () => {
  for (const kind of ['leverage', 'profile_alias', 'cache_trades', 'sltp']) {
    assert.equal(accountStorageKey(kind), null);
    assert.equal(accountStorageKey(kind, 'bad'), null);
    const a = accountStorageKey(kind, owner, foreign);
    const b = accountStorageKey(kind, foreign, foreign);
    assert.notEqual(a, b);
    assert.ok(a.includes(`_50383_${owner.toLowerCase()}`));
    assert.notEqual(a, `lucidkeeper_${kind}_${foreign.toLowerCase()}`);
    assert.notEqual(a, accountStorageKey(kind, owner, owner));
    assert.equal(a, accountStorageKey(kind, owner.toUpperCase(), foreign.toUpperCase()));
  }
});

test('a pending review rejects disconnect, another account or another chain before dispatch', () => {
  assert.doesNotThrow(() => assertAccountMatches(owner, owner, true, 50383));
  assert.doesNotThrow(() => assertAccountMatches(owner, owner.toUpperCase(), true, 50383));
  for (const state of [[owner, false, 50383], [undefined, false, undefined], [foreign, true, 50383], [owner, true, 50312], [owner, true, undefined]]) {
    assert.throws(() => assertAccountMatches(owner, ...state), /account\/network changed/);
  }
  assert.throws(() => assertAccountMatches('bad', undefined, false, 50383));
});

test('late cache completion for the previous address cannot populate a new account or disconnected observer', () => {
  const client = new QueryClient();
  const key = account => ['userPositions', 50383, account];
  const observer = new QueryObserver(client, { queryKey: key(owner), enabled: false });
  const unsubscribe = observer.subscribe(() => {});
  try {
    client.setQueryData(key(owner), capture.account.state);
    assert.deepEqual(observer.getCurrentResult().data, capture.account.state);
    observer.setOptions({ queryKey: key(foreign), enabled: false });
    client.setQueryData(key(owner), capture.account.state); // Late completion, actual captured data.
    assert.equal(observer.getCurrentResult().data, undefined);
    observer.setOptions({ queryKey: key(undefined), enabled: false });
    assert.equal(observer.getCurrentResult().data, undefined);
    observer.setOptions({ queryKey: key(owner), enabled: false });
    assert.deepEqual(observer.getCurrentResult().data, capture.account.state);
  } finally {
    unsubscribe();
    client.clear();
  }
});

test('production account views and compatibility service have no implicit bounty fallback', () => {
  const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  for (const path of ['src/app/App.tsx', 'src/features/profile/Profile.tsx']) {
    const code = source(path);
    assert.match(code, /connectedAccount\(address, isConnected\)/);
    if (path.includes('/profile/')) assert.ok(code.includes('key={`${accountSessionKey(account, chainId)}:${isOwner}`}'));
    else assert.match(code, /key=\{accountSessionKey\(/);
    assert.doesNotMatch(code, /address\s*\|\||0x1420cF8/);
  }
  const server = source('scripts/ui-server.mjs');
  assert.doesNotMatch(server, /BOUNTY_EOA/);
  assert.match(server, /Cache-Control', 'no-store'/);
  for (const path of ['src/features/trade/TradingBox.tsx', 'src/features/portfolio/PositionsTable.tsx', 'src/features/sentinel/RiskGuardian.tsx', 'src/features/margin/MarginHubModal.tsx']) {
    assert.match(source(path), /assertBrowserAccount\((?:account|address)\);\s*(?:await|const approval = await|return) writeContractAsync/);
  }
});
