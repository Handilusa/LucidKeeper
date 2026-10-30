import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

// Responsive derivatives of the dated original capture, never replacement financial data.
const original = await readFile('public/assets/product/terminal.jpg');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const width of [480, 960, 1440]) {
    const image = await page.evaluate(async ({ source, width }) => {
      const img = new Image();
      img.src = source;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round(img.height * width / img.width);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/webp', .88).split(',')[1];
    }, { source: `data:image/jpeg;base64,${original.toString('base64')}`, width });
    await writeFile(`public/assets/product/terminal-${width}.webp`, Buffer.from(image, 'base64'));
  }
} finally { await browser.close(); }
