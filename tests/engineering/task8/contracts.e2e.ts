import { test, expect, type Page } from '@playwright/test';
// Test-only probes have a small documented imperative harness, not product API.
const form = (page: Page, method: string, ...args: unknown[]) => page.evaluate(({ method, args }) => (window as any).task8.form[method](...args), { method, args });
test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.locator('#ssr')).toHaveAttribute('data-hydrated', 'true'); });
test('T8.7 FormData preserves null/empty/0/string types and required uses a separate unnamed proxy', async ({ page }) => {
  expect(await form(page, 'entries')).toEqual([]); expect(await form(page, 'check')).toBe(false); expect(await form(page, 'report')).toBe(false);
  await expect(page.locator('#visible')).toBeFocused(); await expect(page.locator('#visible')).toHaveAttribute('aria-invalid', 'true');
  for (const value of ['', 0, '0', 'disabled']) {
    await form(page, 'set', { value }); expect(await form(page, 'entries')).toEqual([['choice', String(value)]]);
    expect(await form(page, 'report')).toBe(true); expect((await form(page, 'state')).value).toBe(value);
  }
  await form(page, 'set', { value: 'unknown' }); expect(await form(page, 'entries')).toEqual([]); expect(await form(page, 'report')).toBe(false);
  await page.locator('#submit').click(); expect((await form(page, 'state')).submits).toBe(0);
  await form(page, 'set', { value: '' }); await page.locator('#submit').click(); expect((await form(page, 'state')).submits).toBe(1);
  await expect(page.locator('#proxy')).not.toHaveAttribute('name');
});
test('T8.7 readonly/loading/disabled and native fieldset first legend follow form ownership', async ({ page }) => {
  await form(page, 'set', { value: 0, disabled: true }); expect(await form(page, 'entries')).toEqual([]);
  await form(page, 'set', { disabled: false, value: null, readonly: true }); expect(await form(page, 'report')).toBe(true);
  await form(page, 'set', { readonly: false, loading: true }); expect(await form(page, 'report')).toBe(false);
  await form(page, 'set', { value: '' }); expect(await form(page, 'entries')).toEqual([['choice', '']]);
  await form(page, 'fieldset', true); expect(await form(page, 'entries')).toEqual([]);
  await form(page, 'fieldset', true, true); expect(await form(page, 'entries')).toEqual([['choice', '']]);
  await form(page, 'set', { form: 'external', name: 'external-choice' }); expect(await form(page, 'entries')).toEqual([['external-choice', '']]);
  await form(page, 'set', { name: '' }); expect(await form(page, 'entries')).toEqual([]);
});
test('T8.8 late canceled reset and rejected/accepted/parent initial writes stay aligned', async ({ page }) => {
  await form(page, 'set', { value: '', reset: 'reject' }); await form(page, 'reset', true);
  expect((await form(page, 'state')).events).toEqual([]); expect(await form(page, 'entries')).toEqual([['choice', '']]);
  await form(page, 'reset'); expect((await form(page, 'state')).events).toEqual(['value:reset']);
  expect((await form(page, 'state')).proxy).toBe('__zoom_selected__'); expect(await form(page, 'entries')).toEqual([['choice', '']]);
  await form(page, 'set', { reset: 'accept' }); await form(page, 'reset'); expect((await form(page, 'state')).value).toBeNull(); expect(await form(page, 'report')).toBe(false);
  await form(page, 'set', { value: '0', reset: 'initial', form: 'external' }); await form(page, 'reset');
  expect((await form(page, 'state')).value).toBe(0); expect(await form(page, 'entries')).toEqual([['choice', '0']]);
  await form(page, 'set', { value: null }); const count = (await form(page, 'state')).events.length;
  await form(page, 'reset'); expect((await form(page, 'state')).events).toHaveLength(count);
});
test('T8.8 trusted reset button observes cancellation from a later listener', async ({ page }) => {
  await form(page, 'set', { value: '', reset: 'accept' });
  await form(page, 'cancelNextReset');
  await page.getByRole('button', { name: 'Reset fixture' }).click();
  await expect.poll(async () => (await form(page, 'state')).observedResets).toBe(1);
  expect((await form(page, 'state')).events).toEqual([]);
  expect((await form(page, 'state')).value).toBe('');
  expect(await form(page, 'entries')).toEqual([['choice', '']]);
  await page.getByRole('button', { name: 'Reset fixture' }).click();
  await expect.poll(async () => (await form(page, 'state')).observedResets).toBe(2);
  expect((await form(page, 'state')).events).toEqual(['value:reset']);
  expect((await form(page, 'state')).value).toBeNull();
});
test('T8.10 inline/portal brand, font and dynamic host responsibility are reproducible', async ({ page }) => {
  await expect(page.getByRole('listbox').first()).toHaveCSS('font-size', '28px');
  await page.goto('/ssr?portal=true'); await expect(page.locator('#ssr')).toHaveAttribute('data-hydrated', 'true');
  const popup = page.locator('#popup-host [role=listbox]').first();
  await expect(popup).toHaveCSS('color', 'rgb(123, 20, 180)'); await expect(popup).toHaveCSS('font-family', 'monospace');
  await page.locator('#popup-host').evaluate(node => { node.classList.remove('brand'); }); await expect(popup).toHaveCSS('font-size', '14px');
  await page.locator('#popup-host').evaluate(node => { node.style.setProperty('--fixture-size', '40px'); node.style.setProperty('--fixture-color', 'rgb(0, 100, 80)'); });
  await expect(popup).toHaveCSS('font-size', '40px'); await expect(popup).toHaveCSS('color', 'rgb(0, 100, 80)');
});
test('T8.11 SSR open/closed, stable IDs, node reuse, post hydration portal and request isolation', async ({ page, request }) => {
  const url = '/ssr?open=true&portal=true&brand=teal'; const html = await (await request.get(url)).text();
  expect(html).toContain('role="listbox"'); expect(html).toContain('teal-0'); expect(html).not.toContain('data-hydrated');
  const closed = await (await request.get('/ssr?open=false')).text(); expect(closed).not.toContain('role="listbox"');
  await request.get('/ssr?brand=purple'); expect(await (await request.get(url)).text()).toBe(html);
  const warnings: string[] = []; page.on('console', event => { if (/hydration|mismatch/i.test(event.text())) warnings.push(event.text()); });
  await page.goto(url); await expect(page.locator('#ssr')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('#popup-host [role=listbox]')).toHaveCount(2);
  expect(await page.evaluate(() => (window as any).task8SSRNodes.every((node: Element) => node === document.getElementById(node.id)))).toBe(true);
  const ids = await page.getByRole('combobox').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-controls'))); expect(new Set(ids).size).toBe(2);
  for (const id of ids) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  expect(warnings).toEqual([]);
  await page.evaluate(() => (window as any).task8.unmount()); await expect(page.locator('#popup-host [role=listbox]')).toHaveCount(0);
});
test('T8.12 top layer/composedPath/portaled child route once and cleanup stops routing', async ({ page }) => {
  await page.locator('#child-portal button').click(); expect(await page.evaluate(() => (window as any).task8.layers.events())).toEqual([]);
  await page.locator('#parent-trigger').click(); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).task8.layers.events())).toEqual(['child:outside', 'child:escape']);
  await page.evaluate(() => (window as any).task8.layers.pop()); await page.locator('#child-portal button').click();
  await page.locator('#outside').click(); expect(await page.evaluate(() => (window as any).task8.layers.events())).toEqual(['child:outside', 'child:escape', 'parent:outside']);
  await page.evaluate(() => (window as any).task8.layers.cleanup()); await page.keyboard.press('Escape'); await page.locator('#outside').click();
  expect(await page.evaluate(() => (window as any).task8.layers.events())).toHaveLength(3);
});
