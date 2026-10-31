import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read-only deploy QA. No account connection, signatures, contract simulation,
// trader calls, wallet installation, financial fixtures or transaction submission.
// Normal SDK analytics are allowed at their exact endpoint, never as RPC writes.
const root = fileURLToPath(new URL('../', import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const index = arg.indexOf('=');
  if (!arg.startsWith('--') || index < 3) throw new Error('Use --name=value arguments.');
  return [arg.slice(2, index), arg.slice(index + 1)];
}));
if (Object.keys(args).some(key => !['url', 'expected-commit', 'dist'].includes(key))) throw new Error('Unknown argument.');
const base = new URL(args.url || 'http://127.0.0.1:4175');
if (base.username || base.password || base.search || base.hash || base.pathname !== '/') throw new Error('Supply an origin only; no credentials, path or query.');
if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname))) throw new Error('HTTPS required except loopback.');
const expected = args['expected-commit'];
if (expected && !/^[a-f0-9]{40}$/i.test(expected)) throw new Error('Expected commit must be a full public Git SHA.');
const report = { observedAt: new Date().toISOString(), origin: base.origin, expectedCommit: expected || null, checks: [], httpReads: 0, browserRequests: 0 };
const record = (check, verdict, evidence) => report.checks.push({ check, verdict, evidence });
const digest = value => createHash('sha256').update(value).digest('hex');
const address = '0x2222222222222222222222222222222222222222';
const routes = ['/', '/app', '/app/docs', '/app/profile', `/app/profile/${address}`, '/app/profile/invalid', '/app/not-a-route', '/not-a-route'];
const timeout = setTimeout(() => { console.error('FAIL: smoke exceeded six-minute deadline.'); process.exit(1); }, 360000);
let browser;

async function get(relative) {
  if (++report.httpReads > 280) throw new Error('Static GET cap exceeded.');
  const url = new URL(relative, base);
  if (url.origin !== base.origin) throw new Error('Static checks cannot leave the supplied origin.');
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 12 * 1024 * 1024) throw new Error('Unexpectedly large static response.');
  return { status: response.status, headers: response.headers, bytes };
}

async function files(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) throw new Error('Refusing symlink in dist.');
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), `${name}/`));
    else if (entry.isFile()) result.push(name);
    else throw new Error('Refusing nonregular dist entry.');
    if (result.length > 256) throw new Error('dist exceeds 256-file static parity cap.');
  }
  return result;
}

try {
  const html = await get('/');
  if (html.status !== 200 || !/text\/html/i.test(html.headers.get('content-type') || '')) throw new Error('Root must return HTML 200, not login/redirect.');
  for (const route of routes) {
    const response = route === '/' ? html : await get(route);
    const ok = response.status === 200 && /text\/html/i.test(response.headers.get('content-type') || '') && /id=["']root["']/.test(response.bytes.toString());
    record(`HTTP reload ${route}`, ok ? 'PASS' : 'FAIL', `status=${response.status}; React root=${/id=["']root["']/.test(response.bytes.toString())}`);
  }
  const assets = [...new Set([...html.bytes.toString().matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(match => match[1]))];
  if (!assets.length || assets.length > 12) throw new Error('Unexpected entry asset list.');
  for (const asset of assets) {
    const response = await get(asset);
    const cache = response.headers.get('cache-control') || '';
    const mime = response.headers.get('content-type') || '';
    const ok = response.status === 200 && /max-age=31536000/.test(cache) && /immutable/.test(cache) && (asset.endsWith('.js') ? /javascript/.test(mime) : /text\/css/.test(mime));
    record(`Entry asset ${asset}`, ok ? 'PASS' : 'FAIL', `status=${response.status}; MIME=${mime}; Cache-Control=${cache || '(missing)'}`);
  }
  record('HTML cache', /no-cache|max-age=0/.test(html.headers.get('cache-control') || '') ? 'PASS' : 'FAIL', html.headers.get('cache-control') || '(missing)');

  if (args.dist) {
    const directory = await realpath(path.resolve(root, args.dist));
    if (!directory.startsWith(root) || path.basename(directory) !== 'dist') throw new Error('dist must be inside this project (including a local audit clone).');
    const source = execFileSync('git', ['-C', path.dirname(directory), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['-C', path.dirname(directory), 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim();
    if (!expected || source !== expected || dirty) throw new Error('Parity requires --expected-commit matching a clean local source checkout.');
    execFileSync('git', ['merge-base', '--is-ancestor', '755e6f303f56193757bbd56f54c7f24135f1b289', expected], { cwd: root });
    const names = await files(directory);
    if (!names.includes('index.html')) throw new Error('Missing dist/index.html.');
    let matches = 0;
    for (const name of names) {
      const response = name === 'index.html' ? html : await get(`/${name.split('/').map(encodeURIComponent).join('/')}`);
      if (response.status === 200 && digest(response.bytes) === digest(await readFile(path.join(directory, name)))) matches++;
    }
    record('Whole dist decoded-byte parity', matches === names.length ? 'PASS' : 'FAIL', `${matches}/${names.length} files; clean local source ${source}; rebuild provenance and Vercel Git binding must also be checked manually.`);
  } else record('Whole dist decoded-byte parity', 'UNVERIFIED', 'Supply --dist from a clean build and --expected-commit; asset names alone do not prove a commit.');
  record('Vercel Git/source binding', 'UNVERIFIED', 'Owner must verify deployment Git SHA, production alias, branch and build logs in Vercel. No release marker/header exists in 755e6f3.');

  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const errors = [];
  report.blockedRequests = [];
  report.analyticsRequests = 0;
  let blockedWrites = 0;
  await context.route('**/*', async route => {
    if (++report.browserRequests > 500) { await route.abort(); return; }
    const request = route.request();
    if (request.method() === 'POST') {
      const url = new URL(request.url());
      // WalletConnect Pulse is SDK analytics, not a wallet/chain write. Aborting
      // it manufactures console errors and cannot test normal deploy behavior.
      if (url.origin === 'https://pulse.walletconnect.org' && url.pathname === '/e') {
        report.analyticsRequests++;
        await route.continue(); return;
      }
      let body;
      try { body = request.postDataJSON(); } catch { /* disallow unknown POST */ }
      const items = Array.isArray(body) ? body : [body];
      const rpcRead = items.length > 0 && items.every(item => item && /^(?:eth_(?:call|chainId|blockNumber|getBalance|getCode|getTransactionCount|getBlockByNumber|getBlockByHash|getLogs|getTransactionReceipt|getTransactionByHash|gasPrice|maxPriorityFeePerGas|feeHistory)|net_version)$/.test(item.method || ''));
      const graphqlRead = body && typeof body.query === 'string' && !/\bmutation\b/i.test(body.query) && /\bquery\b|^\s*\{|^\s*fragment\b/.test(body.query);
      if (!rpcRead && !graphqlRead) {
        blockedWrites++;
        report.blockedRequests.push({ origin: url.origin, pathname: url.pathname, method: request.method(), rpcMethods: items.map(item => /^[a-zA-Z_]+$/.test(item?.method || '') ? item.method : '(none)'), graphqlDocument: typeof body?.query === 'string' });
        await route.abort(); return;
      }
    } else if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { blockedWrites++; await route.abort(); return; }
    await route.continue();
  });
  const page = await context.newPage();
  report.failedResources = [];
  page.on('response', response => {
    if (response.status() >= 400 && report.failedResources.length < 40) {
      const url = new URL(response.url());
      report.failedResources.push({ origin: url.origin, pathname: url.pathname, status: response.status() });
    }
  });
  page.on('requestfailed', request => {
    if (report.failedResources.length < 40) {
      const url = new URL(request.url());
      report.failedResources.push({ origin: url.origin, pathname: url.pathname, networkCode: /^net::[A-Z_]+$/.test(request.failure()?.errorText || '') ? request.failure().errorText : '(withheld)' });
    }
  });
  const errorCategory = text => /CORS/i.test(text) ? 'CORS' : /429|rate.?limit/i.test(text) ? 'rate limit' : /403|401/.test(text) ? 'authorization' : /ERR_FAILED|Failed to fetch|Failed to load resource/i.test(text) ? 'failed resource/network' : 'other (message withheld)';
  page.on('pageerror', error => errors.push(`Uncaught page error: ${errorCategory(error.message)}`));
  page.on('console', message => { if (message.type() === 'error') errors.push(`Console: ${errorCategory(message.text())}`); });
  for (const route of routes) {
    try {
      await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.getByText('Testnet – no real funds', { exact: true }).waitFor();
      const locator = route === '/' ? page.locator('#hero-title') : route === '/app' ? page.locator('#terminal') : route === '/app/docs' ? page.getByRole('heading', { name: /Know the flow/ }) : route === '/app/profile' ? page.getByRole('heading', { name: 'Connect your wallet to view your portfolio' }) : route.endsWith(address) ? page.getByRole('region', { name: 'Profile identity' }) : page.getByRole('heading', { name: route.includes('profile/invalid') ? 'Invalid public address' : 'Page not found' });
      await locator.waitFor({ timeout: 30000 });
      if (route.endsWith(address)) {
        const identity = await locator.innerText();
        const readOnly = /watch|read.only/i.test(await page.locator('main').innerText());
        const writeButtons = await page.getByRole('button', { name: /^(?:Deposit|Withdraw|Close position|Manage collateral|Execute)/i }).count();
        record('Arbitrary public profile read-only', identity.toLowerCase().includes(address) && readOnly && writeButtons === 0 ? 'PASS' : 'FAIL', `explicit address; read-only label=${readOnly}; financial write controls=${writeButtons}; data is real or explicitly unavailable, never mocked.`);
      }
      record(`Browser reload ${route}`, 'PASS', 'Expected route/invalid/not-found view and testnet badge rendered.');
    } catch { record(`Browser reload ${route}`, 'FAIL', 'Expected route view did not render within deadline; inspect browser manually.'); }
  }
  try {
    await page.goto(new URL('/app', base).href);
    await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    record('Wallet modal', 'PASS', 'Dialog opened; no connector selected and no account access requested.');
  } catch { record('Wallet modal', 'FAIL', 'Connect Wallet dialog did not open.'); }
  try {
    await page.goto(base.href);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const landing = page.locator('.landing');
    await page.locator('.architecture-map').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Pause workflow animation', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.landing')?.getAttribute('data-motion') === null && document.querySelector('.architecture-map')?.getAttribute('data-flow-visible') === null && document.querySelector('.landing')?.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'));
    record('Landing pause', 'PASS', 'data-motion/observer visibility removed and zero running animations.');
    await page.getByRole('button', { name: 'Resume workflow animation', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.landing')?.getAttribute('data-motion') === 'on');
    record('Landing resume', 'PASS', `motion attribute=${await landing.getAttribute('data-motion')}`);
  } catch { record('Landing motion', 'FAIL', 'Pause/resume state or animation cleanup failed.'); }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/', '/app', `/app/profile/${address}`]) {
    try {
      await page.goto(new URL(route, base).href);
      await page.getByText('Testnet – no real funds', { exact: true }).waitFor();
      await (route === '/' ? page.locator('#hero-title') : route === '/app' ? page.locator('#terminal') : page.getByRole('region', { name: 'Profile identity' })).waitFor({ timeout: 30000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      record(`Mobile 375px ${route}`, overflow ? 'FAIL' : 'PASS', `testnet badge rendered; document overflow=${overflow}`);
    } catch { record(`Mobile 375px ${route}`, 'FAIL', 'Mobile route failed to render.'); }
  }
  record('Console / uncaught errors', errors.length ? 'FAIL' : 'PASS', `${errors.length} errors across this read-only run; open DevTools for actual messages. No errors suppressed.`);
  report.errorCategories = errors.reduce((counts, error) => ({ ...counts, [error]: (counts[error] || 0) + 1 }), {});
  record('No financial/unknown HTTP write attempts', blockedWrites ? 'FAIL' : 'PASS', `${blockedWrites} blocked non-read/unknown requests; ${report.analyticsRequests} normal SDK Pulse analytics requests allowed; no wallet provider/connection, signing or chain sends.`);
  record('Tokyo network prompt / real injected fallback / WalletConnect', 'UNVERIFIED', 'Requires owner-controlled extension/phone and Reown origin QA; no synthetic wallet is used against deployment.');
  if (report.browserRequests > 500) record('Browser request cap', 'FAIL', '500-request cap reached; run was bounded, not a capacity test.');
} catch {
  record('Smoke execution', 'FAIL', 'HTTP/config/build/browser prerequisite failed; candidate response values withheld.');
} finally {
  if (browser) await browser.close();
  clearTimeout(timeout);
  report.verdict = report.checks.some(check => check.verdict === 'FAIL') ? 'FAIL' : report.checks.some(check => check.verdict === 'UNVERIFIED') ? 'UNVERIFIED' : 'PASS';
  const directory = path.join(root, '.git/lucidkeeper-audit');
  await mkdir(directory, { recursive: true });
  const filename = `smoke-deployed-${report.observedAt.replaceAll(':', '-').replaceAll('.', '-')}.json`;
  await writeFile(path.join(directory, filename), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...report, localReport: `.git/lucidkeeper-audit/${filename}` }, null, 2));
  process.exitCode = report.verdict === 'FAIL' ? 1 : report.verdict === 'UNVERIFIED' ? 2 : 0;
}
