import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = `.git/lucidkeeper-audit/landing-profile/${process.argv[2] || 'app-motion'}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const width of [375, 768, 1280, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
    const errors = [], writes = [], checks = [], skipped = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/*', async (route) => {
      if (/eth_send|eth_sign|personal_sign|wallet_|\bmutation\b/.test(route.request().postData() || '')) {
        writes.push(route.request().url()); return route.abort();
      }
      return route.continue();
    });
    await page.goto(`${process.env.AUDIT_URL || 'http://127.0.0.1:4175'}/app`);
    await page.locator('.market-stat.primary .animated-value').waitFor({ timeout: 60000 });
    if (width < 1024) await page.getByRole('navigation', { name: 'Trading workspace' }).getByRole('button', { name: 'Activity', exact: true }).click();
    const positionTab = page.getByRole('tab', { name: 'Positions', exact: true });
    await positionTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Open orders' })).toHaveAttribute('aria-selected', 'true');
    checks.push('Keyboard tab selection');
    if (width < 1024) await page.getByRole('navigation', { name: 'Trading workspace' }).getByRole('button', { name: 'Trade', exact: true }).click();
    const trigger = page.getByRole('button', { name: 'Manage margin collateral' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Manage collateral' });
    await dialog.waitFor();
    assert.equal(await dialog.evaluate((e) => getComputedStyle(e).animationName), 'dialog-arrive');
    await dialog.getByRole('button', { name: 'Close dialog' }).focus();
    await page.keyboard.press('Shift+Tab');
    assert.ok(await dialog.evaluate((e) => e.contains(document.activeElement)));
    await page.screenshot({ path: `${output}/collateral-${width}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.ok(await trigger.evaluate((e) => e === document.activeElement));
    checks.push('Animated dialog, focus trap, Escape and focus restoration');
    if (width < 1024) await page.getByRole('navigation', { name: 'Trading workspace' }).getByRole('button', { name: 'Activity', exact: true }).click();
    await positionTab.click();
    // Only a genuinely connected account may expose a position; never inject a wallet/data.
    const share = page.getByRole('button', { name: /^Share .+ position$/ }).first();
    if (await share.count()) {
      await share.click();
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: /Download PNG/ }).click();
      await (await download).saveAs(`${output}/position-${width}.png`);
      await page.getByText('Position card downloaded', { exact: true }).waitFor();
      await page.screenshot({ path: `${output}/share-toast-${width}.png`, animations: 'disabled' });
      await page.keyboard.press('Escape');
      checks.push('Real-position share export and actual success toast');
    } else skipped.push('Connected-position share export/toast: no connected wallet in this audit');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (width < 1024) await page.getByRole('navigation', { name: 'Trading workspace' }).getByRole('button', { name: 'Trade', exact: true }).click();
    await trigger.click();
    await dialog.waitFor();
    assert.equal(await dialog.evaluate((e) => getComputedStyle(e).animationName), 'none');
    await page.keyboard.press('Escape');
    checks.push('Runtime reduced-motion disables dialog animation');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(writes, []);
    report.push({ width, accountState: 'disconnected', checks, skipped, errors, writes });
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify({ observedAt: new Date().toISOString(), report }, null, 2));
}
console.log(JSON.stringify(report, null, 2));
