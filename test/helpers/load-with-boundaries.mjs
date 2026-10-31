import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Compile the actual entry in memory; substitute only its named import boundaries.
// No source rewriting, production override, emitted file or shared global fixture.
export async function loadWithBoundaries(url, boundaries, { now } = {}) {
  const entry = fileURLToPath(url);
  const replaced = new Set();
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: 'node',
    format: 'cjs', packages: 'external', logLevel: 'silent',
    define: { 'import.meta.url': JSON.stringify(url.href) },
    plugins: [{ name: 'test-only-boundaries', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        if (args.importer !== entry || !Object.hasOwn(boundaries, args.path)) return;
        replaced.add(args.path);
        return { path: `test-boundary:${args.path}`, external: true };
      });
    } }],
  });
  assert.deepEqual([...replaced].sort(), Object.keys(boundaries).sort(), 'Every declared boundary must be used');
  const realRequire = createRequire(url);
  const require = name => name.startsWith('test-boundary:')
    ? boundaries[name.slice('test-boundary:'.length)] : realRequire(name);
  const module = { exports: {} };
  const Clock = now === undefined ? Date : class extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  };
  new Function('require', 'module', 'exports', 'Date', result.outputFiles[0].text)(require, module, module.exports, Clock);
  return module.exports;
}
