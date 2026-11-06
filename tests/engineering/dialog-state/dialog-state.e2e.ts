import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';

let server: ViteDevServer;
test.beforeAll(async () => {
  server = await createServer({
    configFile: fileURLToPath(new URL('../../../apps/vue-smoke/vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 5194, strictPort: true },
  });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });

test('T13.5 example accepts a v-model close and keeps the event pair ordered', async ({ page }) => {
  await page.goto('/dialog-state.html');
  await page.getByRole('button', { name: 'Open accepted dialog' }).click();
  const panel = page.getByRole('dialog', { name: 'Accepted request' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: '关闭' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByTestId('accepted-events')).toHaveText('update:false|request:close-button');
});

test('T13.5 example rejects repeated requests until its controlled owner accepts one', async ({ page }) => {
  await page.goto('/dialog-state.html');
  await page.getByRole('button', { name: 'Open guarded dialog' }).click();
  const panel = page.getByRole('dialog', { name: 'Guarded request' });
  await panel.getByRole('button', { name: '关闭' }).click();
  await expect(panel).toBeVisible();
  await panel.press('Escape');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('guarded-events')).toHaveText('update:false|request:close-button|update:false|request:escape');
  await panel.getByRole('checkbox', { name: 'Allow close requests' }).check();
  await panel.getByRole('button', { name: '关闭' }).click();
  await expect(panel).toHaveCount(0);
});

test('T13.5 example holds its controlled dialog during async save and closes from owner state', async ({ page }) => {
  await page.goto('/dialog-state.html');
  await page.getByRole('button', { name: 'Open save dialog' }).click();
  const panel = page.getByRole('dialog', { name: 'Async save' });
  await panel.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByTestId('save-status')).toHaveText('Saving');
  await panel.press('Escape');
  await expect(page.getByTestId('save-events')).toHaveText('');
  await expect(panel).toHaveCount(0);
  await expect(page.getByTestId('save-status')).toHaveText('Saved');
});
