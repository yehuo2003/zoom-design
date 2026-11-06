import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';

let server: ViteDevServer;
test.beforeAll(async () => {
  server = await createServer({
    configFile: fileURLToPath(new URL('../../../apps/vue-smoke/vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 5196, strictPort: true },
  });
  await server.listen();
});
test.afterAll(async () => { await server?.close(); });
test.beforeEach(async ({ page }) => { await page.goto('/dialog-state.html'); });

test('T13.7.1 Escape closes a portaled Select before asking its guarded Dialog to close', async ({ page }) => {
  await page.getByRole('button', { name: 'Open composition form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Composition form' });
  const choice = dialog.getByRole('combobox', { name: 'Choice' });
  await choice.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await choice.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('composition-close-events')).toHaveText('');
  await choice.press('Escape');
  await expect(page.getByTestId('composition-close-events')).toHaveText('escape');
  await expect(dialog).toBeVisible();
});

test('T13.7.2 IME cancellation and candidate Escape stay inside Combobox and never submit', async ({ page }) => {
  await page.getByRole('button', { name: 'Open composition form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Composition form' });
  const search = dialog.getByRole('combobox', { name: 'Search' });
  await search.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await search.evaluate((node: HTMLInputElement) => {
    node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    node.value = 'Be';
    node.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, isComposing: true }));
    node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  });
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await search.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await search.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('composition-close-events')).toHaveText('');
  await expect(page.getByTestId('composition-submission')).toHaveText('');
});

test('T13.7.3 nested modal to nonmodal to popup is interactive in the shared host', async ({ page }) => {
  await page.getByRole('button', { name: 'Open modal parent', exact: true }).click();
  const parent = page.getByRole('dialog', { name: 'Modal composition parent', includeHidden: true });
  await parent.getByRole('button', { name: 'Open nonmodal child' }).click();
  const child = page.getByRole('dialog', { name: 'Nonmodal composition child' });
  const trigger = child.getByRole('combobox', { name: 'Nested choice' });
  await trigger.click();
  const popup = page.getByRole('listbox');
  await expect(popup).toBeVisible();
  await expect.poll(() => popup.evaluate(node => !!node.closest('[inert]'))).toBe(false);
  await expect.poll(() => child.evaluate(node => !!node.closest('[inert]'))).toBe(false);
  const option = popup.getByRole('option', { name: 'Two' });
  expect(await option.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    return hit === node || node.contains(hit);
  })).toBe(true);
  await option.click();
  await expect(trigger).toContainText('Two');
  await expect(trigger).toBeFocused();
  await expect(parent).toBeVisible();
});

test('T13.7.4 nested modal boundaries lock, isolate and restore the right parent focus', async ({ page }) => {
  await page.getByRole('button', { name: 'Open modal parent', exact: true }).click();
  const parent = page.getByRole('dialog', { name: 'Modal composition parent', includeHidden: true });
  const invoker = parent.getByRole('button', { name: 'Open modal child', exact: true });
  await invoker.click();
  const child = page.getByRole('dialog', { name: 'Modal composition child', exact: true });
  await expect(child).toBeVisible();
  await expect.poll(() => parent.evaluate(node => !!node.closest('[inert]'))).toBe(true);
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).toBe('hidden');
  await child.getByRole('button', { name: '关闭' }).click();
  await expect(child).toHaveCount(0);
  await expect(invoker).toBeFocused();
  await expect.poll(() => parent.evaluate(node => !!node.closest('[inert]'))).toBe(false);
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).toBe('hidden');
  await parent.getByRole('button', { name: '关闭' }).click();
  await page.getByRole('button', { name: 'Open nonmodal parent', exact: true }).click();
  const nonmodal = page.getByRole('dialog', { name: 'Nonmodal composition parent' });
  const nextInvoker = nonmodal.getByRole('button', { name: 'Open modal child from nonmodal' });
  await nextInvoker.click();
  const nextChild = page.getByRole('dialog', { name: 'Modal child of nonmodal' });
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).toBe('hidden');
  await nextChild.getByRole('button', { name: '关闭' }).click();
  await expect(nextInvoker).toBeFocused();
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).not.toBe('hidden');
});

test('T13.7.5/6 removed host falls back inline with stable dialog, popup and legal input focus', async ({ page }) => {
  await page.getByRole('button', { name: 'Open composition form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Composition form' });
  const search = dialog.getByRole('combobox', { name: 'Search' });
  await search.click(); await expect(page.getByRole('listbox')).toBeVisible();
  await search.focus();
  await page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"][aria-labelledby$="-title"]');
    const popup = document.querySelector('[role="listbox"]');
    (window as typeof window & { compositionNodes?: { panel: Element | null; popup: Element | null } }).compositionNodes = { panel, popup };
    document.querySelector('[data-testid="composition-host"]')?.remove();
  });
  await expect.poll(() => dialog.evaluate(node => node.isConnected)).toBe(true);
  await expect.poll(() => page.getByRole('listbox').evaluate(node => !!node.closest('.zoom-combobox'))).toBe(true);
  expect(await page.evaluate(() => {
    const saved = (window as typeof window & { compositionNodes?: { panel: Element | null; popup: Element | null } }).compositionNodes;
    return saved?.panel?.isConnected && saved?.panel === document.querySelector('[role="dialog"][aria-labelledby$="-title"]') &&
      saved?.popup === document.querySelector('[role="listbox"]');
  })).toBe(true);
  await expect(search).toBeFocused();
  await expect.poll(() => page.getByRole('listbox').evaluate(node => !!node.closest('[inert]'))).toBe(false);
});

test('T13.7.7 footer form owner submits and resets; rejected close does not submit', async ({ page }) => {
  await page.getByRole('button', { name: 'Open composition form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Composition form' });
  await dialog.getByRole('button', { name: '关闭' }).click();
  await expect(page.getByTestId('composition-submission')).toHaveText('');
  await dialog.getByRole('button', { name: 'Submit form' }).click();
  await expect(page.getByTestId('composition-submission')).toHaveText('{"title":"Draft","choice":"alpha"}');
  await dialog.getByRole('button', { name: 'Reset form' }).click();
  await expect.poll(() => dialog.locator('form').evaluate(node => Object.fromEntries(new FormData(node as HTMLFormElement)))).toEqual({ title: 'Draft' });
  await expect(dialog).toBeVisible();
});

test('T13.7.8 branded host keeps popup above long content with inherited font and colors', async ({ page }) => {
  await page.getByRole('button', { name: 'Open composition form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Composition form' });
  await dialog.getByTestId('composition-scroll-content').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await dialog.getByRole('combobox', { name: 'Choice' }).click();
  const popup = page.getByRole('listbox'); await expect(popup).toBeVisible();
  const values = await popup.evaluate(node => {
    const option = node.querySelector('[role="option"]')!; const rect = option.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const style = getComputedStyle(node);
    return { hit: hit === option || option.contains(hit), font: style.fontFamily, color: style.color, background: style.backgroundColor,
      host: node.parentElement?.getAttribute('data-testid'), scroll: document.querySelector('[data-testid="composition-scroll-content"]')?.scrollTop };
  });
  expect(values.hit).toBe(true);
  expect(values.host).toBe('composition-host');
  expect(values.font).toContain('Trebuchet MS');
  expect(values.color).toBe('rgb(42, 38, 82)');
  expect(values.background).toBe('rgb(252, 249, 255)');
  expect(values.scroll).toBeGreaterThan(0);
});
