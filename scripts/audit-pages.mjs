import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.AUDIT_URL || 'http://127.0.0.1:4175';
const output = `.git/lucidkeeper-audit/landing-profile/${process.argv[2] || 'current'}`;
const paths = process.argv.includes('--p0')
  ? ['/', '/app', '/app/docs']
  : ['/', '/app', '/app/profile', '/app/docs'];
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const width of [375, 768, 1280, 1920]) {
    for (const path of paths) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce',
      });
      const errors = [];
      const writes = [];
      const requests = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.route('**/*', async (route) => {
        const request = route.request();
        requests.push(request.url());
        if (/eth_send|eth_sign|personal_sign|wallet_|\bmutation\b/.test(request.postData() || '')) {
          writes.push(request.url());
          return route.abort();
        }
        await route.continue();
      });
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      if (path === '/app')
        await page
          .locator('.market-source')
          .filter({ hasText: 'On-chain mark' })
          .waitFor({ timeout: 45000 });
      if (path === '/app/profile')
        await page.locator('[data-profile-ready="true"]').waitFor({ timeout: 60000 });
      await page.addScriptTag({ path: '.git/lucidkeeper-audit/axe.min.js' });
      const violations = await page.evaluate(async () =>
        (
          await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          })
        ).violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        }))
      );
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const name = `${path === '/' ? 'landing' : path.split('/').pop()}-${width}`;
      await page.screenshot({ path: `${output}/${name}.png` });
      if (path !== '/app')
        await page.screenshot({ path: `${output}/${name}-full.png`, fullPage: true });
      assert.ok(await page.getByText('Testnet – no real funds', { exact: true }).isVisible());
      if (path === '/') {
        assert.equal(
          requests.some((url) => /en_US.*\.js|walletconnect|hideki/.test(url)),
          false,
          'Landing loaded trading dependencies or services'
        );
        assert.equal(
          await page
            .getByRole('link', { name: 'Launch App', exact: false })
            .first()
            .getAttribute('href'),
          '/app'
        );
        await page.keyboard.press('Tab');
        assert.equal(
          await page.evaluate(() => document.activeElement?.textContent),
          'Skip to content'
        );
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'main');
        await page.getByText('Is this real-money trading?', { exact: true }).click();
        assert.ok((await page.locator('details').first().getAttribute('open')) !== null);
      }
      report.push({ path, width, overflow, violations, errors, writes, screenshot: `${name}.png` });
      await page.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ observedAt: new Date().toISOString(), base, report }, null, 2)
  );
}
console.log(
  JSON.stringify(
    report.map((r) => ({
      path: r.path,
      width: r.width,
      overflow: r.overflow,
      axe: r.violations.length,
      errors: r.errors.length,
      writes: r.writes.length,
    })),
    null,
    2
  )
);
assert.ok(
  report.every((r) => !r.overflow && !r.violations.length && !r.errors.length && !r.writes.length),
  'See report.json for failures'
);
