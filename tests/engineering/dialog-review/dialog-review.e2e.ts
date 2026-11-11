// Optional diagnostic smoke; canonical F16 uses the root readiness/runtime fixtures.
import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
let server: ViteDevServer;
test.beforeAll(async () => {
  server = await createServer({ configFile: false, plugins: [vue()], root: fileURLToPath(new URL('.', import.meta.url)),
    define: { __VUE_OPTIONS_API__: false, __VUE_PROD_DEVTOOLS__: false, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false },
    optimizeDeps: { exclude: ['@zoom-design/vue', '@zoom-design/dom'] }, server: { host: '127.0.0.1', port: 5216, strictPort: true } });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });
test('legacy diagnostic delegates to the canonical mount and cleanup', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?scenario=move&modal=true'); await expect(page.locator('[data-regression-ready]')).toHaveAttribute('data-regression-ready', 'true');
  await expect(page.getByRole('dialog', { name: 'Moving', exact: true })).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Moving target', exact: true }); await input.focus(); await expect(input).toBeFocused();
  await page.getByRole('button', { name: '卸载回归场景', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('[inert]')).toHaveCount(0); expect(errors).toEqual([]);
});
