import { test, expect } from '@playwright/test';
import { mockWallet } from './mock-wallet';

for (const width of [375, 1440]) {
  test(`ambient drivers stop for pause, system preference and hidden tabs at ${width}px`, async ({ page }, testInfo) => {
    const state = await mockWallet(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const landing = page.locator('.landing');
    const canvas = page.locator('.landing-atmosphere canvas');
    await expect(landing).toHaveAttribute('data-motion', 'on');
    await expect.poll(() => canvas.evaluate(node => (node as HTMLCanvasElement).height)).toBeGreaterThan(150);
    const bitmap = await canvas.evaluate(node => ({ width: (node as HTMLCanvasElement).width, height: (node as HTMLCanvasElement).height }));
    expect(bitmap.width * bitmap.height).toBeLessThanOrEqual(2000000);
    expect(Math.max(bitmap.width, bitmap.height)).toBeLessThanOrEqual(4096);
    expect(await canvas.evaluate(async node => {
      const canvas = node as HTMLCanvasElement;
      const before = canvas.toDataURL();
      for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
      return canvas.toDataURL() !== before;
    })).toBe(true);

    const assertStatic = async () => {
      expect(await landing.evaluate(async node => {
        const snapshot = () => JSON.stringify({
          canvas: node.querySelector<HTMLCanvasElement>('canvas')!.toDataURL(),
          styles: [...node.querySelectorAll('.hero-brand-sigil [style], .ms-diagram [style]')].map(element => element.getAttribute('style')),
          hud: node.querySelector('.sigil-hud')?.textContent,
        });
        const before = snapshot();
        for (let frame = 0; frame < 12; frame++) await new Promise(requestAnimationFrame);
        return snapshot() === before;
      })).toBe(true);
    };
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await expect(landing).not.toHaveAttribute('data-motion');
    await assertStatic();
    await page.screenshot({ path: testInfo.outputPath('landing-paused.png'), animations: 'disabled' });
    await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
    await expect(landing).toHaveAttribute('data-motion', 'on');

    const diagram = page.locator('.ms-diagram');
    await diagram.scrollIntoViewIfNeeded();
    await expect.poll(() => diagram.locator('.ms-consensus-line').getAttribute('style')).not.toBeNull();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(landing).not.toHaveAttribute('data-motion');
    await assertStatic();
    await expect(diagram.locator('.ms-block').first()).toHaveCSS('opacity', '1');
    await page.screenshot({ path: testInfo.outputPath('diagram-motion-off.png'), animations: 'disabled' });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(landing).toHaveAttribute('data-motion', 'on');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(landing).toHaveAttribute('data-motion', 'off');
    await assertStatic();
    await page.evaluate(() => {
      Reflect.deleteProperty(document, 'hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(landing).toHaveAttribute('data-motion', 'on');
    await expect.poll(() => diagram.locator('.ms-consensus-line').getAttribute('style')).not.toBeNull();
    expect(state.writes).toEqual([]);
  });
}
