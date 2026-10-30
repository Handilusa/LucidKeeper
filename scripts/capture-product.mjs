import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Public reads only, in a clean browser with no wallet installed.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.route('**/*', async (route) => {
    const body = route.request().postData();
    if (body && /eth_send|eth_sign|personal_sign|wallet_|\bmutation\b/.test(body))
      throw new Error('Write request blocked');
    await route.continue();
  });
  await page.goto(process.argv[2] || 'http://127.0.0.1:4175/app', {
    waitUntil: 'domcontentloaded',
  });
  await page
    .locator('.guardian-identity h2')
    .filter({
      hasText: /Margin buffer|No maintenance exposure|Low margin buffer|Below maintenance/,
    })
    .waitFor({ timeout: 45000 });
  await page
    .locator('.market-source')
    .filter({ hasText: /On-chain mark/ })
    .waitFor({ timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  await mkdir('public/assets/product', { recursive: true });
  await page.screenshot({ path: 'public/assets/product/terminal.jpg', type: 'jpeg', quality: 85 });
  await writeFile(
    'public/assets/product/capture.json',
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        source:
          'Local production build; actual public Tokyo RPC/indexer reads; disconnected bounty-account watch view',
        viewport: { width: 1440, height: 1000 },
        note: 'Historical UI capture, not current balances or execution attribution. No wallet, signing or sends.',
      },
      null,
      2
    ) + '\n'
  );
} finally {
  await browser.close();
}
