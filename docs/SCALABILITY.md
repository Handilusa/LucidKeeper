# Bounded scalability check — 31 October 2026

**Local static capacity tested; multi-user/RPC scale not certified.** No load requests were sent to dreamDEX, Somnia, wallets or a public deployment.

## Reproduce safely

```sh
npm run build
npm run test:load -- after
```

`scripts/load-static.mjs` creates its **own IPv4 loopback** server on an ephemeral port, serves `dist/`, runs a finite HTTP workload, then closes it. It has no URL/host argument, browser, RPC, signing or redirect support. Hard caps: **12 concurrent requests, 240 total, 15 seconds scheduling, 2 seconds/request, 120 MiB decoded response budget** (reserved before scheduling). It requests four HTML routes and the three largest gzip JS/CSS assets; assets are precompressed before timing. It checks HTTP200 and cache headers. This is **not 240 users, a render/Lighthouse check, a realistic complete session or a CDN benchmark**.

Local JSON: `.git/lucidkeeper-audit/static-load-{baseline,after}.json`. Baseline uses the pre-task5 build, after uses the accepted task5 build. The initial baseline byte-counter defect/run is retained as `static-load-baseline-accounting-initial.json`, excluded from these figures.

| Measurement | Baseline 12:35:58 UTC | After 12:42:59 UTC |
| --- | ---: | ---: |
| Successful / failed | 240 / 0 | 240 / 0 |
| Concurrent cap | 12 | 12 |
| Elapsed | 358.22 ms | 326.57 ms |
| p50 / p95 / p99 | 5.78 / 46.53 / 73.74 ms | 5.09 / 41.59 / 58.81 ms |
| Local requests/second | 669.97 | 734.91 |
| Decoded response bytes | 101,574,566 | 89,850,584 |

Host: Windows, Node24.19.0, Intel i7-13650HX. One short run each; cache-hot RAM server and changed selected asset payloads confound comparison. **Do not infer a reliable speedup, sustainable throughput or a number of simultaneous traders.** The after build keeps a large ~292kB gzip profile/SDK chunk and ~250kB locale/dependency chunk; bundle size remains a limitation.

## Implemented boundaries

| Area | Actual behavior |
| --- | --- |
| Static caching | Vercel hashed `/assets/*`: public1year immutable; HTML/other paths: no-cache/revalidate. No account API proxy or service-worker cache. Hosting headers still need deployed verification. |
| Route splitting | Terminal `App` and profile are separate lazy chunks. Opening guide/profile no longer eagerly imports trading workspace/chart. Wallet providers still load on app routes; no claim of a minimal bundle. |
| Public Tokyo RPC | viem HTTP JSON-RPC batching:10ms window,50-method cap;8s HTTP timeout,1 transport retry with500ms base delay. No unverified Multicall3 deployment assumptions. Wallet dispatch remains through the selected connector, not this read boundary. |
| Query lifetime | Existing address/network/pool/window keys deduplicate observers;5s default stale time,5min GC, no hidden-tab interval refetch. At most1 default query retry with full jitter `0…min(8s,500ms×2^attempt)`. Existing explicit source options may differ. |
| Direct GraphQL | Shared browser-local read boundary:4 in flight,32 queued; overflow fails explicitly. Total12s deadline includes queue/body/backoff; at most2 attempts for network/502/503/504, jittered backoff. GraphQL errors/400 never retry internally. Direct chart/history/orders queries disable outer retries. No mutation dispatch. |
| Rate limiting | HTTP429 enforces shared ≥30s cooldown. Exposed `Retry-After` number/date extends it; unexposed CORS header cannot be read, so conservative fallback applies. Any positive server retry delay causes fail-fast/cooldown rather than shortening it. No success zero is substituted. |
| Public market cache | Successful candles5s,24h source15s;32-entry in-memory cap. Cache key contains query and normalized pool/interval/limit. TTL caches never return expired entries on failure. |
| Accounts/orders | In-flight dedup only, **no account/order TTL** in the new boundary. Existing account-specific indexed-history fallback requires a dated snapshot ≤5min and remains labeled cached/limited. Undated old arrays are not treated as fresh. Legacy confirmed-record history remains a separate nonauthoritative account-scoped list. |
| SDK profile/history | SDK0.32.1 owns its separate HTTP governor (4 active/32 queued/1 attempt;5 failures open30s circuit) and WebSocket RPC transport/timeouts. Outer profile/history query retries remain bounded. SDK calls do **not** pass through the direct GraphQL cache or wagmi HTTP batching. |

These are per-browser/per-client controls, **not a global quota**. Direct GraphQL and SDK governors are separate. Many browsers can still exceed upstream capacity; no backend, RPC proxy or distributed cache was added. RPC batching reduces envelopes, not method cost; reads/polls still consume upstream resources.

## Tests and what remains

Eight offline unit/transport checks: in-flight dedup/TTL/account separation, errors and mutation rejection,429 header/date and opaque-header cooldown/recovery,503 jitter/400, hung fetch/body deadline, queue overflow/cleanup, cache cap and actual configured HTTP batching. Two browser tests cover chart timeout/retry and429/cooldown/poll recovery. Harness intercepts HTTP/WS; no keys or real sends. Full Chromium **55 pass / 0 skip / 0 fail**; unit/service **94 pass / 19 skip / 0 fail** (113 cases); types/E2E types/lint/build pass. Artifacts `task5-accepted/`, `task5-unit-final.log`, `task5-build-final.log`. Initial CORS fixture and automatic-poll test-timing failures retained, not counted as acceptance.

Still unverified: sustained soak/cold starts/real mobile rendering, deployed cache/header behavior, realistic simultaneous connected traders, upstream quotas and outage durations, WebSocket congestion, wallet-extension timeout UX, multi-tab Guardian behavior and post-submit receipt recovery. No guaranteed transaction latency/reduce-only behavior or trading capacity. A long outage must show stale/unavailable reads; inspect already-submitted hashes before retrying. [Human QA](MANUAL_QA.md) and [security risks](SECURITY_NOTES.md) remain release gates.
