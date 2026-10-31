import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.AUDIT_URL || 'http://127.0.0.1:4175';
const output = `.git/lucidkeeper-audit/landing-profile/${process.argv[2] || 'motion'}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const width of [375, 768, 1280, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
    const errors = [], writes = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/*', async (route) => {
      if (/eth_send|eth_sign|personal_sign|wallet_|\bmutation\b/.test(route.request().postData() || '')) {
        writes.push(route.request().url()); return route.abort();
      }
      await route.continue();
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.landing[data-motion="on"]').waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.hero-word')].every((e) => getComputedStyle(e).opacity === '1'));
    await page.screenshot({ path: `${output}/landing-${width}.png` });
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => ({
      name: a.animationName || 'WAAPI',
      properties: [...new Set(a.effect.getKeyframes().flatMap((f) => Object.keys(f)))].filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)),
    })));
    assert.ok(running.length >= 3);
    assert.ok(running.every((a) => a.properties.every((p) => ['opacity', 'transform', 'filter'].includes(p))));
    if (width >= 1024) {
      await page.waitForFunction(() => document.documentElement.classList.contains('lenis'));
      await page.locator('.product-window').scrollIntoViewIfNeeded();
      await page.locator('.product-window').hover({ position: { x: 100, y: 100 } });
      assert.match(await page.locator('.product-window').getAttribute('style'), /perspective/);
    }
    await page.locator('.lifecycle').scrollIntoViewIfNeeded();
    await page.locator('.lifecycle[data-traced="true"]').waitFor();
    await page.screenshot({ path: `${output}/lifecycle-${width}.png` });
    await page.locator('.proof-grid').scrollIntoViewIfNeeded();
    assert.ok(await page.getByRole('img', { name: '120 DOGE', exact: true }).isVisible());
    await page.screenshot({ path: `${output}/proof-${width}.png` });
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await page.waitForFunction(() => !document.getAnimations().some((a) => a.playState === 'running'));
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis')), false);
    await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
    await page.locator('.landing[data-motion="on"]').waitFor();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.getAnimations().some((a) => a.playState === 'running'));
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('lenis')), false);
    assert.ok(await page.getByRole('button', { name: 'Motion off (system)', exact: true }).isDisabled());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    report.push({ width, running, pause: 'pass', reducedMotion: 'pass', overflow, errors, writes });
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify({ observedAt: new Date().toISOString(), report }, null, 2));
}
console.log(JSON.stringify(report, null, 2));
