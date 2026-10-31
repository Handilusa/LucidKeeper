import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Public reads only. Transport failures are real request aborts, never response replacements.
const output = `.git/lucidkeeper-audit/landing-profile/${process.argv[2] || 'profile-interactions'}`;
const base = process.env.AUDIT_URL || 'http://127.0.0.1:4175';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
let failReads = false;
const errors = [], writes = [], checks = [], skipped = [], accountRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.route('**/*', async (route) => {
  const request = route.request();
  if (/hideki|smk\.somnia/.test(request.url())) accountRequests.push(request.url());
  if (/eth_send|eth_sign|personal_sign|wallet_|\bmutation\b/.test(request.postData() || '')) {
    writes.push(request.url());
    return route.abort();
  }
  if (failReads && /hideki|smk\.somnia/.test(request.url())) return route.abort('internetdisconnected');
  await route.continue();
});
const ready = () => page.locator('[data-profile-ready="true"]').waitFor({ timeout: 90000 });
try {
  await page.goto(`${base}/app/profile`);
  await page.getByRole('heading', { name: 'Portfolio', exact: true }).waitFor();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Skip to portfolio');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'main');
  checks.push('Keyboard skip link focuses portfolio');

  if (await page.getByRole('heading', { name: 'Connect your wallet to view your portfolio' }).count()) {
    assert.equal(await page.locator('.profile-identity, .account-metrics, .profile-table-panel').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Export CSV' }).count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Download share image' }).count(), 0);
    assert.equal(await page.getByRole('link', { name: 'Browse markets' }).getAttribute('href'), '/app');
    await page.getByRole('region', { name: 'Wallet connection required' }).getByRole('button', { name: 'Connect wallet', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(accountRequests, []);
    checks.push('Disconnected profile hides account/exports, opens connection modal and makes zero account-service requests');
    skipped.push('Connected alias validation/persistence/removal, six tables, sorting/pagination/CSV, four windows, PNG and account-read failure/retry require a real connected wallet');
  } else {
  await ready();
  const alias = page.getByLabel('Local alias', { exact: false });
  await alias.fill('@bad');
  await page.getByRole('button', { name: 'Save alias' }).click();
  assert.equal(await alias.getAttribute('aria-invalid'), 'true');
  await alias.fill('Tokyo Reader');
  await page.getByRole('button', { name: 'Save alias' }).click();
  await page.reload();
  await ready();
  assert.equal(await alias.inputValue(), 'Tokyo Reader');
  assert.ok(await page.getByRole('heading', { name: 'Tokyo Reader' }).isVisible());
  await alias.fill('');
  await page.getByRole('button', { name: 'Save alias' }).click();
  assert.ok(await page.getByRole('heading', { name: 'Connected account' }).isVisible());
  checks.push('Alias rejects invalid input, persists and removes per address');

  const tabs = page.getByRole('group', { name: 'Portfolio activity view' });
  for (const name of ['Fills', 'Order history', 'Position changes', 'Funding', 'Transfers', 'Positions']) {
    await tabs.getByRole('button', { name, exact: true }).click();
    assert.ok(await page.getByRole('region', { name, exact: true }).isVisible());
  }
  await tabs.getByRole('button', { name: 'Fills', exact: true }).click();
  await page.getByRole('button', { name: 'Notional (USDso)' }).click();
  const column = page.getByRole('columnheader', { name: 'Notional (USDso)' });
  assert.equal(await column.getAttribute('aria-sort'), 'ascending');
  const values = await page.locator('.profile-table-panel tbody tr td:nth-child(6)').allTextContents();
  const amounts = values.map((v) => Number(v.replaceAll(',', '')));
  assert.ok(amounts.length > 0);
  assert.deepEqual(amounts, [...amounts].sort((a, b) => a - b));
  if (await page.getByRole('button', { name: 'Next', exact: true }).isEnabled()) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    assert.match(await page.locator('.table-pagination').innerText(), /Page 2/);
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
  }
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const csv = await csvDownload;
  await csv.saveAs(`${output}/fills.csv`);
  const text = await readFile(`${output}/fills.csv`, 'utf8');
  const rows = text.trim().replace(/^\uFEFF/, '').split('\r\n').map((r) => r.slice(1, -1).split('","'));
  assert.equal(rows[0].at(-1), 'Transaction hash');
  assert.ok(rows.length > 1);
  const exported = rows.slice(1).map((r) => Number(r[7]));
  assert.deepEqual(exported, [...exported].sort((a, b) => a - b));
  assert.ok(rows.slice(1).every((r) => r[1] === '50383' && /^0x[\da-f]{64}$/i.test(r.at(-1))));
  checks.push(`Six history views; sorted full CSV (${rows.length - 1} fills), pagination and evidence links`);

  await page.getByRole('group', { name: 'Chart metric' }).getByRole('button', { name: 'Equity', exact: true }).click();
  assert.ok(await page.getByRole('heading', { name: 'Historical equity is not available' }).isVisible());
  for (const name of ['24H', '30D', 'All indexed', '7D']) {
    const button = page.getByRole('group', { name: 'History time window' }).getByRole('button', { name, exact: true });
    await button.click();
    await ready();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
  }
  checks.push('All time windows; explicit unavailable equity');
  const pngDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download share image' }).click();
  await (await pngDownload).saveAs(`${output}/portfolio.png`);
  const png = await readFile(`${output}/portfolio.png`);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  checks.push('Actual 1200×630 PNG download');

  failReads = true;
  await page.getByRole('button', { name: 'Refresh reads' }).click();
  await page.getByRole('heading', { name: 'Unable to read fills', exact: true }).waitFor({ timeout: 90000 });
  assert.equal(await page.getByRole('button', { name: 'Export CSV' }).isDisabled(), true);
  failReads = false;
  await page.getByRole('button', { name: 'Retry fills', exact: true }).click();
  await ready();
  await page.locator('.profile-table-panel tbody tr').first().waitFor();
  checks.push('Transport failure hides affected records, disables export; real-service retry recovers');
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify({ observedAt: new Date().toISOString(), checks, skipped, accountRequests, errors, writes }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks, skipped }, null, 2));
