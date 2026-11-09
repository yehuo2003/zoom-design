import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';

let server: ViteDevServer;
test.beforeAll(async () => {
  server = await createServer({ configFile: false, root: fileURLToPath(new URL('.', import.meta.url)),
    define: { __VUE_OPTIONS_API__: false, __VUE_PROD_DEVTOOLS__: false, __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false },
    optimizeDeps: { exclude: ['@zoom-design/vue', '@zoom-design/dom'] },
    server: { host: '127.0.0.1', port: 5216, strictPort: true } });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { window.reviewReady = false; });
  await page.exposeFunction('reviewErrors', () => errors);
});
test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as unknown as { reviewErrors: () => Promise<string[]> }).reviewErrors())).toEqual([]);
});

for (const position of ['before', 'after']) test(`F1 native Tab and Shift+Tab with portal ${position} panel`, async ({ page }) => {
  await page.goto(`/?scenario=tab-order&position=${position}`);
  await page.waitForFunction(() => window.reviewReady);
  const a = page.getByRole('button', { name: 'A', exact: true });
  const b = page.getByRole('button', { name: 'B', exact: true });
  const c = page.getByRole('button', { name: 'Portal C' });
  await a.focus();
  for (const next of [b, c, a]) { await page.keyboard.press('Tab'); await expect(next).toBeFocused(); }
  for (const next of [c, b, a]) { await page.keyboard.press('Shift+Tab'); await expect(next).toBeFocused(); }
});

test('F2 explicit return has exactly one focus event', async ({ page }) => {
  await page.goto('/?scenario=double-focus'); await page.waitForFunction(() => window.reviewReady);
  await page.getByRole('button', { name: 'Open child' }).press('Enter');
  const child = page.getByRole('dialog', { name: 'Child', exact: true }); await expect(child).toBeVisible();
  await child.getByRole('button', { name: '关闭' }).focus();
  await page.evaluate(() => { window.reviewTrace.length = 0; });
  await child.getByRole('button', { name: '关闭' }).press('Enter');
  await expect(page.getByRole('button', { name: 'Return target' })).toBeFocused();
  expect(await page.evaluate(() => window.reviewTrace)).toEqual(['return-target']);
});

test('F3 return focus reaches a legal portaled sibling', async ({ page }) => {
  await page.goto('/?scenario=portal-return'); await page.waitForFunction(() => window.reviewReady);
  const opener = page.getByRole('button', { name: 'Open second' });
  await opener.press('Enter');
  const second = page.getByRole('dialog', { name: 'Second', exact: true });
  await expect(second).toBeVisible(); await second.getByRole('button', { name: '关闭' }).press('Enter');
  await expect(opener).toBeFocused();
  expect(await opener.evaluate(node => !!node.closest('[inert]'))).toBe(false);
});

for (const action of ['close-both', 'replace']) test(`F2 final focus transaction for ${action}`, async ({ page }) => {
  await page.goto(`/?scenario=return-batch&action=${action}`); await page.waitForFunction(() => window.reviewReady);
  const button = page.getByRole('button', { name: 'Change active tree' }); await button.focus();
  await page.evaluate(() => { window.reviewTrace.length = 0; }); await button.press('Enter');
  const target = action === 'close-both' ? 'outer-return' : 'new-initial';
  await expect(page.locator(`#${target}`)).toBeFocused();
  expect(await page.evaluate(() => window.reviewTrace)).toEqual([target]);
});

for (const modal of [false, true]) for (const move of ['inline-to-portal', 'invalid-to-valid', 'portal-to-inline', 'host-to-host']) {
  test(`F4 preserves focus and node identity on ${move} modal=${modal}`, async ({ page }) => {
    await page.goto(`/?scenario=move&move=${move}&modal=${modal}`); await page.waitForFunction(() => window.reviewReady);
    const input = page.getByRole('textbox', { name: 'Moving target' });
    const original = await input.elementHandle();
    const priorParent = await input.evaluate(node => node.closest('.zoom-dialog')!.parentElement!.id);
    // Handles retain the original object across the actual Teleport DOM move.
    await input.focus(); await input.press('F2'); await expect(input).toBeFocused();
    expect(await input.evaluate((node, original) => node === original, original)).toBe(true);
    // The target change must complete; a no-op relocation cannot pass this regression.
    const expectedParent = move === 'portal-to-inline' ? 'app' : move === 'host-to-host' ? 'second-host' : 'first-host';
    expect(priorParent).not.toBe(expectedParent);
    await expect.poll(() => input.evaluate(node => node.closest('.zoom-dialog')!.parentElement?.id)).toBe(expectedParent);
  });
}

for (const choice of ['select', 'combobox']) test(`F5 nonmodal initial focus with initially open ${choice}`, async ({ page }) => {
  await page.goto(`/?scenario=initial-choice&choice=${choice}`); await page.waitForFunction(() => window.reviewReady);
  await expect(page.getByRole('textbox', { name: 'Initial target' })).toBeFocused();
  await expect(page.getByRole('listbox')).toBeVisible();
});
