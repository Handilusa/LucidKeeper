import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = `.git/lucidkeeper-audit/landing-profile/${process.argv[2] || 'lighthouse'}`;
const temp = resolve('.git/lucidkeeper-audit/chrome-temp');
mkdirSync(temp, { recursive: true });
const result = spawnSync('npx', [
  '--yes', 'lighthouse@12.8.2', process.env.AUDIT_URL || 'http://127.0.0.1:4175',
  '--chrome-flags="--headless --no-sandbox"',
  '--only-categories=performance,accessibility,best-practices,seo',
  '--output=json', '--output=html', `--output-path=${output}`, '--quiet',
], {
  shell: process.platform === 'win32',
  env: { ...process.env, CHROME_PATH: chromium.executablePath(), TEMP: temp, TMP: temp },
  stdio: 'inherit',
});
if (result.error) throw result.error;
assert.equal(result.status, 0, 'Lighthouse process failed');
const report = JSON.parse(readFileSync(`${output}.report.json`, 'utf8'));
const scores = Object.fromEntries(Object.entries(report.categories).map(([key, category]) => [key, Math.round(category.score * 100)]));
console.log(JSON.stringify({ fetchTime: report.fetchTime, scores, lcp: report.audits['largest-contentful-paint'].displayValue, cls: report.audits['cumulative-layout-shift'].displayValue, tbt: report.audits['total-blocking-time'].displayValue }, null, 2));
assert.ok(scores.performance >= 85, 'Performance target missed');
assert.ok(scores.accessibility >= 95, 'Accessibility target missed');
