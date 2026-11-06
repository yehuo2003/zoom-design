import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';

let server: ViteDevServer;
test.beforeAll(async () => {
  server = await createServer({
    configFile: fileURLToPath(new URL('../../../apps/vue-smoke/vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 5195, strictPort: true },
  });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });

test('T13.6 browser modal confines focus, locks scroll, and returns to its invoker', async ({ page }) => {
  await page.goto('/dialog-state.html');
  const trigger = page.getByRole('button', { name: 'Open accepted dialog' });
  await trigger.click();
  const panel = page.getByRole('dialog', { name: 'Accepted request' });
  const close = panel.getByRole('button', { name: '关闭' });
  await expect(close).toBeFocused();
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).toBe('hidden');
  const backgroundTrigger = page.locator('button').filter({ hasText: 'Open accepted dialog' });
  await expect.poll(() => backgroundTrigger.evaluate(node => !!node.closest('[inert]'))).toBe(true);
  await close.press('Tab'); await expect(close).toBeFocused();
  await close.press('Shift+Tab'); await expect(close).toBeFocused();
  await close.click();
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).not.toBe('hidden');
  await expect.poll(() => backgroundTrigger.evaluate(node => !!node.closest('[inert]'))).toBe(false);
});

test('T13.6 browser rejected close keeps the modal trap and scroll lock', async ({ page }) => {
  await page.goto('/dialog-state.html');
  await page.getByRole('button', { name: 'Open guarded dialog' }).click();
  const panel = page.getByRole('dialog', { name: 'Guarded request' });
  const close = panel.getByRole('button', { name: '关闭' });
  await close.click();
  await expect(panel).toBeVisible();
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).toBe('hidden');
  await close.press('Shift+Tab');
  await expect(panel).toContainText('Allow close requests');
  await expect.poll(() => panel.evaluate(node => node.contains(document.activeElement))).toBe(true);
});
