import { test, expect } from '@playwright/test';
import { terminalFixture, assertReadOnly } from './terminal-fixture';

for (const width of [375, 768, 1280, 1920]) {
  test(`classic terminal palette includes the order form and dialogs at ${width}px`, async ({ page }, testInfo) => {
    const state = await terminalFixture(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/app');
    await expect(page.locator('.terminal')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', '');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(7, 7, 7)');
    await expect(page.locator('body')).toHaveCSS('background-image', 'none');
    await expect(page.locator('.site-app-header')).toHaveCSS('background-color', 'rgb(7, 7, 7)');
    await expect(page.locator('.workspace')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    if (width < 1024) {
      await page.getByRole('navigation', { name: 'Trading workspace' })
        .getByRole('button', { name: 'Trade', exact: true }).click();
    }
    await expect(page.locator('.order-entry')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await expect(page.locator('.order-entry')).toHaveCSS('background-image', 'none');
    await expect(page.locator('.account-summary')).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await expect(page.locator('.submit-order')).toHaveText('Connect wallet to trade');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`terminal-${width}.png`), fullPage: true });

    const trigger = page.getByRole('button', { name: 'Manage margin collateral' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Manage collateral' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('background-color', 'rgb(17, 17, 17)');
    await expect(dialog).toHaveCSS('background-image', 'none');
    await page.screenshot({ path: testInfo.outputPath(`dialog-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await assertReadOnly(state);
  });
}

test('classic palette stays isolated through terminal and other route navigation', async ({ page }) => {
  const state = await terminalFixture(page);
  for (const path of ['/app/', '/', '/app/profile', '/app/docs', '/app']) {
    await page.goto(path);
    if (path === '/app/' || path === '/app') {
      await expect(page.locator('.terminal')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-terminal-theme', '');
      await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(7, 7, 7)');
    } else {
      await expect(page.locator('html')).not.toHaveAttribute('data-terminal-theme');
      expect(await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return [style.getPropertyValue('--bg-panel').trim(), style.getPropertyValue('--color-cyan').trim()];
      })).toEqual(['#101625', '#6ce5f2']);
    }
  }
  await assertReadOnly(state);
});
