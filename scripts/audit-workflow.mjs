import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.AUDIT_URL || 'http://127.0.0.1:4175';
const output = `.git/lucidkeeper-audit/landing-profile/${process.argv[2] || 'workflow-motion'}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const width of [375, 768, 1280, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
    const errors = [], writes = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/*', (route) => {
      if (/eth_send|eth_sign|personal_sign|wallet_|\bmutation\b/.test(route.request().postData() || '')) {
        writes.push(route.request().url()); return route.abort();
      }
      return route.continue();
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.landing[data-motion="on"]').waitFor();
    const lifecycle = page.locator('.lifecycle');
    const diagram = page.locator('.architecture-map');
    await expect(diagram).toHaveAttribute('data-flow-visible', 'false');
    await lifecycle.scrollIntoViewIfNeeded();
    await expect(lifecycle).toHaveAttribute('data-flow-visible', 'true');
    assert.equal(await lifecycle.locator('li').count(), 6);
    // Observe a full real CSS cycle: the highlighted steps must advance in order.
    const sequence = await lifecycle.evaluate((element) => new Promise((resolve, reject) => {
      const visited = [];
      const nodes = [...element.querySelectorAll('.step-wash')];
      const deadline = performance.now() + 13000;
      const sample = () => {
        const active = nodes.findIndex((node) => Number(getComputedStyle(node).opacity) > .7);
        if (active >= 0 && visited.at(-1) !== active) visited.push(active);
        if (new Set(visited).size === 6) return resolve(visited);
        if (performance.now() > deadline) return reject(new Error(`Incomplete lifecycle: ${visited}`));
        requestAnimationFrame(sample);
      };
      sample();
    }));
    assert.ok(sequence.every((step, index) => index === 0 || step === (sequence[index - 1] + 1) % 6));
    await page.screenshot({ path: `${output}/lifecycle-${width}.png` });
    await diagram.scrollIntoViewIfNeeded();
    await expect(diagram).toHaveAttribute('data-flow-visible', 'true');
    const frames = () => diagram.evaluate((element) => [...element.querySelectorAll('.flow-packet, .flow-orbit')]
      .filter((node) => getComputedStyle(node).display !== 'none')
      .map((node) => ({ transform: getComputedStyle(node).transform, opacity: getComputedStyle(node).opacity })));
    const before = await frames();
    await page.screenshot({ path: `${output}/architecture-${width}-a.png` });
    // Spaced visual samples of the actual animation, without seeking its timeline.
    await page.waitForTimeout(1400);
    const after = await frames();
    assert.notDeepEqual(after, before);
    await page.screenshot({ path: `${output}/architecture-${width}-b.png` });
    const properties = await diagram.evaluate((element) => [...new Set(element.getAnimations({ subtree: true })
      .flatMap((animation) => animation.effect.getKeyframes().flatMap(Object.keys)))]
      .filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key)));
    assert.ok(properties.length && properties.every((key) => ['transform', 'opacity'].includes(key)));
    await page.addScriptTag({ path: '.git/lucidkeeper-audit/axe.min.js' });
    const violations = await page.evaluate(async () => (await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    })).violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })));
    assert.deepEqual(violations, []);
    const pause = page.getByRole('button', { name: 'Pause workflow animation', exact: true });
    await pause.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Resume workflow animation', exact: true })).toBeFocused();
    await page.waitForFunction(() => !document.getAnimations().some((animation) => animation.playState === 'running'));
    await page.screenshot({ path: `${output}/paused-${width}.png` });
    await page.getByRole('button', { name: 'Resume workflow animation', exact: true }).click();
    await expect(diagram).toHaveAttribute('data-flow-visible', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByRole('button', { name: 'Workflow motion off (system)' })).toBeDisabled();
    await page.waitForFunction(() => !document.getAnimations().some((animation) => animation.playState === 'running'));
    await expect(diagram.getByText('Your wallet', { exact: true })).toBeVisible();
    await expect(diagram.getByText('MarginBank · PerpPools · receipts', { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/reduced-${width}.png` });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(diagram).toHaveAttribute('data-flow-visible', 'true');
    await page.locator('#hero-title').scrollIntoViewIfNeeded();
    await expect(diagram).toHaveAttribute('data-flow-visible', 'false');
    await expect(lifecycle).toHaveAttribute('data-flow-visible', 'false');
    assert.equal(await diagram.evaluate((element) => element.getAnimations({ subtree: true })
      .some((animation) => animation.playState === 'running')), false);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    report.push({ width, sequence, frames: { before, after }, properties, pause: 'keyboard pass',
      reducedMotion: 'pass', offscreen: 'paused', violations, overflow, errors, writes });
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify({ observedAt: new Date().toISOString(), report }, null, 2));
}
console.log(JSON.stringify(report.map(({ frames, ...result }) => result), null, 2));
