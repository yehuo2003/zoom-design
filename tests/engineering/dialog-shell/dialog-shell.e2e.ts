import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';

let server: ViteDevServer;
test.beforeAll(async () => {
  server = await createServer({
    configFile: fileURLToPath(new URL('../../../apps/vue-smoke/vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 5193, strictPort: true },
  });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });

test('T13.2.6 independent Dialog CSS renders without theme or other product styles', async ({ page }) => {
  await page.goto('/dialog-shell.html');
  const panel = page.getByRole('dialog', { name: 'A very long Dialog heading for layout verification' });
  await expect(panel).toBeVisible();
  const styles = await page.locator('style').evaluateAll(nodes => nodes.map(node => node.textContent ?? '').join('\n'));
  expect(styles).toContain('.zoom-dialog__panel');
  expect(styles).not.toMatch(/\.zoom-(?:button|select|combobox)\b/);
  await expect(panel).toHaveCSS('background-color', 'rgb(245, 243, 255)');
  await expect(panel).toHaveCSS('border-radius', '6px');
});

test('T13.2.7 ancestor brands, instance override and compact density reach computed styles', async ({ page }) => {
  await page.goto('/dialog-shell.html?brand=teal&density=compact&instance=true');
  const root = page.locator('.zoom-dialog');
  const panel = page.getByRole('dialog', { name: 'A very long Dialog heading for layout verification' });
  const close = panel.getByRole('button', { name: '关闭' });
  await expect(root).toHaveCSS('font-family', /Georgia/);
  await expect(root).toHaveCSS('font-size', '20px');
  await expect(root).toHaveCSS('color', 'rgb(15, 118, 110)');
  await expect(panel).toHaveCSS('background-color', 'rgb(255, 248, 220)');
  await expect(close).toHaveCSS('min-width', '28px');
  await expect(panel).toHaveCSS('padding-left', '18px');
});

test('T13.2.7 two brand ancestors keep their Dialog styles separate', async ({ page }) => {
  await page.goto('/dialog-shell.html?dual=true');
  const first = page.getByRole('dialog', { name: 'A very long Dialog heading for layout verification' });
  const second = page.getByRole('dialog', { name: 'Second brand dialog' });
  await expect(first).toHaveCSS('background-color', 'rgb(245, 243, 255)');
  await expect(second).toHaveCSS('background-color', 'rgb(240, 253, 250)');
  await expect(first.locator('..')).toHaveCSS('color', 'rgb(76, 29, 149)');
  await expect(second.locator('..')).toHaveCSS('color', 'rgb(15, 118, 110)');
});

test('T13.2.8 narrow, long, RTL and 200% text keep close and footer reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/dialog-shell.html?long=true&rtl=true&large=true');
  const panel = page.getByRole('dialog', { name: 'A very long Dialog heading for layout verification' });
  const close = panel.getByRole('button', { name: '关闭' });
  const footer = panel.locator('.zoom-dialog__footer');
  const content = panel.locator('.zoom-dialog__content');
  await expect(panel).toHaveCSS('direction', 'rtl');
  await expect(close).toBeInViewport();
  await expect(footer).toBeInViewport();
  const geometry = await panel.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const body = element.querySelector('.zoom-dialog__content')!;
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(320);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(600);
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
  await content.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(close).toBeInViewport();
  await expect(footer).toBeInViewport();
});
