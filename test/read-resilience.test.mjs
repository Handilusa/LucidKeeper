import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicClient, http } from 'viem';
import { createGraphqlReader, retryAfterMs } from '../src/lib/data/readResilience.ts';
import { TOKYO_HTTP_OPTIONS } from '../src/chain/readTransport.ts';
const query = 'query Test($account: String) { Fill { id } }';
const ok = () => Response.json({ data: { Fill: [] } });
const endpoint = 'https://example.invalid/graphql'; // fetch is always injected; no network.

test('read boundary deduplicates in-flight work, TTL expires and account reads have no TTL', async () => {
  let calls = 0, now = 1000;
  const reader = createGraphqlReader(endpoint, { now: () => now, fetchFn: async () => { calls++; return ok(); } });
  await Promise.all(Array.from({ length: 20 }, () => reader.read(query, { account: 'a' }, 100)));
  assert.equal(calls, 1);
  await reader.read(query, { account: 'a' }, 100); assert.equal(calls, 1);
  now += 101; await reader.read(query, { account: 'a' }, 100); assert.equal(calls, 2);
  await reader.read(query, { account: 'b' }); await reader.read(query, { account: 'b' }); assert.equal(calls, 4);
});
test('HTTP/GraphQL errors and mutations never cache successes or masquerade as empty data', async () => {
  let calls = 0;
  const reader = createGraphqlReader(endpoint, { fetchFn: async () => { calls++; return Response.json({ errors: [{ message: 'failed' }] }); } });
  await assert.rejects(reader.read('mutation Bad { write }', {}), /Only named read/); assert.equal(calls, 0);
  await assert.rejects(reader.read(query, {}, 100), /unavailable/);
  await assert.rejects(reader.read(query, {}, 100), /unavailable/); assert.equal(calls, 2);
  assert.equal(reader.stats().cached, 0);
});
test('429 respects Retry-After without premature retry and recovers after cooldown', async () => {
  let calls = 0, now = 1000;
  const reader = createGraphqlReader(endpoint, { now: () => now, fetchFn: async () => ++calls === 1 ? new Response('', { status: 429, headers: { 'Retry-After': '60' } }) : ok() });
  await assert.rejects(reader.read(query, {}), /HTTP 429/);
  await assert.rejects(reader.read(query, {}), /rate limited/); assert.equal(calls, 1);
  now += 60001; await reader.read(query, {}); assert.equal(calls, 2);
  assert.equal(retryAfterMs(new Date(120000).toUTCString(), 100000), 20000);
  assert.equal(retryAfterMs('invalid', now), 0);
});
test('503 and network failures use bounded jitter, 400 never retries', async () => {
  let calls = 0; const waits = [];
  const reader = createGraphqlReader(endpoint, { random: () => 0.5, sleep: async ms => { waits.push(ms); }, fetchFn: async () => ++calls === 1 ? new Response('', { status: 503 }) : ok() });
  await reader.read(query, {}); assert.deepEqual(waits, [250]); assert.equal(calls, 2);
  const bad = createGraphqlReader(endpoint, { fetchFn: async () => { calls++; return new Response('', { status: 400 }); } });
  await assert.rejects(bad.read(query, {}), /HTTP 400/); assert.equal(calls, 3);
});
test('429 without an exposed Retry-After still enforces a conservative cooldown', async () => {
  let calls = 0, now = 0;
  const reader = createGraphqlReader(endpoint, { now: () => now, fetchFn: async () => ++calls === 1 ? new Response('', { status: 429 }) : ok() });
  await assert.rejects(reader.read(query, {}), /HTTP 429/);
  now = 29000; await assert.rejects(reader.read(query, {}), /rate limited/); assert.equal(calls, 1);
  now = 30001; await reader.read(query, {}); assert.equal(calls, 2);
});
test('hung fetch and queued reads have a total deadline and release every slot', async () => {
  let hang = true;
  const reader = createGraphqlReader(endpoint, { timeoutMs: 30, maxInFlight: 1, maxQueued: 2, fetchFn: async () => hang ? new Promise(() => {}) : ok() });
  const results = await Promise.allSettled([reader.read(query, { n: 1 }), reader.read(query, { n: 2 }), reader.read(query, { n: 3 }), reader.read(query, { n: 4 })]);
  assert.ok(results.every(result => result.status === 'rejected'));
  assert.match(results[3].reason.message, /queue full/);
  assert.deepEqual(reader.stats(), { active: 0, queued: 0, pending: 0, cached: 0 });
  hang = false; await reader.read(query, { n: 5 });
});
test('a hung body parser is bounded; successful public cache has a finite entry cap', async () => {
  const slow = createGraphqlReader(endpoint, { timeoutMs: 20, fetchFn: async () => ({ ok: true, json: () => new Promise(() => {}) }) });
  await assert.rejects(slow.read(query, {}), /timed out/); assert.equal(slow.stats().active, 0);
  const reader = createGraphqlReader(endpoint, { fetchFn: async () => ok() });
  for (let i = 0; i < 40; i++) await reader.read(query, { i }, 10000);
  assert.equal(reader.stats().cached, 32);
});
test('configured Tokyo HTTP transport batches concurrent RPC without a live network or wallet', async () => {
  const batches = [];
  const rpc = createPublicClient({ transport: http('https://example.invalid/rpc', { ...TOKYO_HTTP_OPTIONS, fetchFn: async (_url, init) => {
    const body = JSON.parse(init.body); batches.push(body);
    return Response.json(body.map(request => ({ jsonrpc: '2.0', id: request.id, result: request.method === 'eth_chainId' ? '0xc4cf' : '0x64' })));
  } }) });
  const result = await Promise.all([rpc.request({ method: 'eth_chainId' }), rpc.request({ method: 'eth_blockNumber' })]);
  assert.deepEqual(result, ['0xc4cf', '0x64']); assert.equal(batches.length, 1); assert.equal(batches[0].length, 2);
});
