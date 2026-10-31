/** Read-only HTTP boundary. No wallet methods, mutation retries or persisted financial data. */
export const READ_LIMITS = Object.freeze({ timeoutMs: 12000, maxInFlight: 4, maxQueued: 32, maxAttempts: 2, maxCacheEntries: 32 });
export const queryRetryDelay = (attempt: number) => Math.floor(Math.random() * Math.min(8000, 500 * 2 ** attempt));

export function retryAfterMs(value: string | null, now: number): number {
  if (!value) return 0;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  // Long server cooldowns are refused, never shortened into premature retries.
  return Number.isFinite(delay) ? Math.max(0, delay) : 0;
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export function createGraphqlReader(endpoint: string, options: {
  fetchFn?: typeof fetch; now?: () => number; random?: () => number;
  timeoutMs?: number; maxInFlight?: number; maxQueued?: number; maxAttempts?: number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
} = {}) {
  const limits = { ...READ_LIMITS, ...options };
  const now = options.now || Date.now;
  const random = options.random || Math.random;
  const fetchFn = options.fetchFn || fetch;
  const sleep = options.sleep || ((ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  }));
  const pending = new Map<string, Promise<Awaited<ReturnType<Response['json']>>>>();
  const cache = new Map<string, { expires: number; value: Awaited<ReturnType<Response['json']>> }>();
  const queue: { admit: () => void; cancel: () => void }[] = [];
  let active = 0;
  let cooldownUntil = 0;
  const release = () => { active--; queue.shift()?.admit(); };
  function acquire(signal: AbortSignal) {
    if (active < limits.maxInFlight) { active++; return Promise.resolve(); }
    if (queue.length >= limits.maxQueued) return Promise.reject(new Error('Read queue full. Retry later.'));
    return new Promise<void>((resolve, reject) => {
      const entry = {
        admit: () => { signal.removeEventListener('abort', entry.cancel); active++; resolve(); },
        cancel: () => { const i = queue.indexOf(entry); if (i >= 0) queue.splice(i, 1); reject(signal.reason); },
      };
      queue.push(entry); signal.addEventListener('abort', entry.cancel, { once: true });
    });
  }
  async function perform(body: string, ttlMs: number) {
    const controller = new AbortController();
    const { signal } = controller;
    const timer = setTimeout(() => controller.abort(new Error('Read timed out. Data unavailable; retry later.')), limits.timeoutMs);
    let acquired = false;
    try {
      await acquire(signal); acquired = true;
      for (let attempt = 0; attempt < limits.maxAttempts; attempt++) {
        if (cooldownUntil > now()) throw new Error('Indexer rate limited. Retry after its cooldown.');
        let response: Response;
        try { response = await abortable(fetchFn(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal }), signal); }
        catch (error) {
          if (signal.aborted || attempt + 1 === limits.maxAttempts) throw error;
          await abortable(sleep(Math.floor(random() * 500 * 2 ** attempt), signal), signal); continue;
        }
        if (!response.ok) {
          const retryable = [429, 502, 503, 504].includes(response.status);
          // Cross-origin servers may not expose Retry-After. Never hot-loop on an opaque 429.
          const delay = Math.max(response.status === 429 ? 30000 : 0, retryAfterMs(response.headers.get('Retry-After'), now()));
          if (delay > 0) cooldownUntil = Math.max(cooldownUntil, now() + delay);
          if (!retryable || delay > 0 || attempt + 1 === limits.maxAttempts) throw new Error(`Indexer HTTP ${response.status}${delay > 0 ? ' — server cooldown; retry later' : ''}`);
          await abortable(sleep(Math.floor(random() * Math.min(4000, 500 * 2 ** attempt)), signal), signal); continue;
        }
        const json = await abortable(response.json(), signal);
        if (!json?.data || json.errors?.length) throw new Error('Indexer response unavailable (GraphQL error or missing data).');
        if (ttlMs > 0) {
          cache.set(body, { value: json, expires: now() + ttlMs });
          while (cache.size > limits.maxCacheEntries) cache.delete(cache.keys().next().value!);
        }
        return json;
      }
      throw new Error('Read attempts exhausted.');
    } finally { clearTimeout(timer); if (acquired) release(); }
  }
  return {
    read(query: string, variables: Record<string, unknown>, ttlMs = 0) {
      if (!/^\s*query\b/.test(query)) return Promise.reject(new Error('Only named read queries are allowed.'));
      const body = JSON.stringify({ query, variables });
      const hit = cache.get(body);
      if (hit && hit.expires > now()) return Promise.resolve(hit.value);
      cache.delete(body);
      const existing = pending.get(body); if (existing) return existing;
      const work = perform(body, ttlMs).finally(() => pending.delete(body));
      pending.set(body, work); return work;
    },
    stats: () => ({ active, queued: queue.length, pending: pending.size, cached: cache.size }),
  };
}
