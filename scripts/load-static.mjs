import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { cpus, platform } from 'node:os';

// No target parameter, browser, RPC, remote asset, redirects or transaction calls.
// The only target is a fresh server this script owns, bound to IPv4 loopback.
const caps = { concurrency: 12, requests: 240, totalMs: 15000, requestMs: 2000, maxBytes: 120 * 1024 * 1024 };
const label = process.argv[2] || 'after';
if (!['baseline', 'after'].includes(label)) throw new Error('Allowed labels: baseline or after. No external targets supported.');
const dist = new URL('../dist/', import.meta.url);
const files = new Map();
const html = await readFile(new URL('index.html', dist));
files.set('/index.html', { body: gzipSync(html), type: 'text/html', cache: 'no-cache' });
const assets = [];
for (const name of await readdir(new URL('assets/', dist))) {
  if (!/\.(js|css)$/.test(name)) continue;
  const raw = await readFile(new URL(`assets/${name}`, dist));
  const body = gzipSync(raw);
  files.set(`/assets/${name}`, { body, type: name.endsWith('.js') ? 'text/javascript' : 'text/css', cache: 'public, max-age=31536000, immutable' });
  assets.push({ path: `/assets/${name}`, rawBytes: raw.length, gzipBytes: body.length });
}
assets.sort((a, b) => b.gzipBytes - a.gzipBytes);
const paths = ['/', '/app', '/app/docs', '/app/profile/0x2222222222222222222222222222222222222222', ...assets.slice(0, 3).map(a => a.path)];
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = path.startsWith('/assets/') ? files.get(path) : files.get('/index.html');
  if (!file) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': file.type, 'Content-Encoding': 'gzip', 'Cache-Control': file.cache }); response.end(file.body);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let next = 0, bytes = 0, reservedBytes = 0; const latencies = [], errors = [];
const started = performance.now();
try {
  await Promise.all(Array.from({ length: caps.concurrency }, async () => {
    while (next < caps.requests && performance.now() - started < caps.totalMs && bytes < caps.maxBytes) {
      const i = next, path = paths[i % paths.length], time = performance.now();
      const expectedBytes = path.startsWith('/assets/') ? assets.find(a => a.path === path).rawBytes : html.length;
      if (reservedBytes + expectedBytes > caps.maxBytes) break;
      reservedBytes += expectedBytes; next++;
      try {
        const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(caps.requestMs) });
        if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
        const expected = path.startsWith('/assets/') ? 'immutable' : 'no-cache';
        if (!response.headers.get('cache-control')?.includes(expected)) throw new Error('Cache policy mismatch');
        const receivedBytes = (await response.arrayBuffer()).byteLength;
        bytes += receivedBytes; // Do not capture the shared counter across an await.
        latencies.push(performance.now() - time);
      } catch (error) { errors.push({ path, message: error.message }); }
    }
  }));
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
const elapsedMs = performance.now() - started;
latencies.sort((a, b) => a - b);
const percentile = p => Number((latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * p) - 1)] || 0).toFixed(2));
const report = { observedAt: new Date().toISOString(), label, scope: 'local static HTTP only; not users, wallets, RPC, CDN capacity or rendering', caps, requestsStarted: next, successful: latencies.length, errors, elapsedMs: Number(elapsedMs.toFixed(2)), requestsPerSecond: Number((latencies.length / (elapsedMs / 1000)).toFixed(2)), latencyMs: { p50: percentile(.5), p95: percentile(.95), p99: percentile(.99) }, decodedBytes: bytes, assets: assets.slice(0, 5), host: { node: process.version, platform: platform(), cpu: cpus()[0]?.model }, cachePolicy: { html: 'no-cache', hashedAssets: '1y immutable' } };
const out = new URL(`../.git/lucidkeeper-audit/static-load-${label}.json`, import.meta.url);
await mkdir(new URL('./', out), { recursive: true }); await writeFile(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (errors.length || latencies.length !== caps.requests) process.exitCode = 1;
