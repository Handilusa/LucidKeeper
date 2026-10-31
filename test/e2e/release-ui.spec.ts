import { test, expect } from '@playwright/test';
import { mockWallet, B } from './mock-wallet';

for (const width of [375, 768, 1280, 1920]) {
  for (const path of ['/', '/app', '/app/profile', '/app/docs', `/app/profile/${B}`]) {
    test(`release route ${path} renders without overflow or writes at ${width}px`, async ({ page }, testInfo) => {
      const state = await mockWallet(page);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      if (path === '/') await expect(page.locator('#hero-title')).toBeVisible();
      else if (path === '/app') await expect(page.locator('.chart-ohlc time')).toBeVisible();
      else if (path === '/app/profile') await expect(page.getByRole('heading', { name: 'Connect your wallet to view your portfolio' })).toBeVisible();
      else if (path.startsWith('/app/profile/')) {
        await expect(page.getByRole('region', { name: 'Profile identity' })).toContainText(B);
        await expect(page.locator('[data-profile-ready="true"]')).toBeVisible();
        await expect(page.getByText('Some history reads failed.', { exact: false })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Download share image', exact: true })).toBeEnabled();
      }
      else await expect(page.getByRole('heading', { name: /Know the flow/ })).toBeVisible();
      await expect(page.getByText('Testnet – no real funds', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(state.writes).toEqual([]); expect(errors).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('route.png'), fullPage: path !== '/app' });
    });
  }
  test(`inherited workflow preserves six steps, keyboard pause and reduced motion at ${width}px`, async ({ page }, testInfo) => {
    const state = await mockWallet(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto('/');
    await expect(page.locator('.landing')).toHaveAttribute('data-motion', 'on');
    await expect(page.getByRole('list', { name: 'Illustrated six-step trading lifecycle' }).locator('li')).toHaveCount(6);
    for (const link of await page.getByRole('link', { name: /Launch App/ }).all()) await expect(link).toHaveAttribute('href', '/app');
    const graphic = page.locator('.architecture-map'); await graphic.scrollIntoViewIfNeeded();
    await expect(graphic).toHaveAttribute('data-flow-visible', 'true');
    await expect.poll(() => graphic.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath('workflow-running.png') });
    const pause = page.getByRole('button', { name: 'Pause workflow animation', exact: true });
    await pause.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Resume workflow animation', exact: true })).toBeFocused();
    await expect.poll(() => page.locator('.landing').getAttribute('data-motion')).toBeNull();
    await expect.poll(() => graphic.getAttribute('data-flow-visible')).toBeNull();
    await expect.poll(() => page.locator('.landing').evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
    await page.getByRole('button', { name: 'Resume workflow animation', exact: true }).click();
    await expect(page.locator('.landing')).toHaveAttribute('data-motion', 'on');
    await expect(graphic).toHaveAttribute('data-flow-visible', 'true');
    await expect.poll(() => graphic.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBeGreaterThan(0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByRole('button', { name: 'Workflow motion off (system)' })).toBeDisabled();
    await expect.poll(() => page.locator('.landing').getAttribute('data-motion')).toBeNull();
    await expect.poll(() => page.locator('.landing').evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
    expect(state.writes).toEqual([]);
  });
}
