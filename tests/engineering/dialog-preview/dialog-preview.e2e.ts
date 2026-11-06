import { test, expect } from '../../../e2e/fixtures.js';
import type { Page } from '@playwright/test';

async function leaseCount(page: Page) {
  return page.evaluate(() => {
    const key = Object.getOwnPropertySymbols(document).find(symbol => symbol.description === 'zoom-overlay-session');
    return key ? (document as unknown as Record<symbol, { leaseCount: number }>)[key]?.leaseCount ?? 0 : 0;
  });
}

test('T13.8.1–3 server requests render only open Dialog content inline with isolated brand and ID', async ({ request }) => {
  const closed = await request.get('/ssr?example=dialog&brand=purple&id=purple-dialog');
  const open = await request.get('/ssr?example=dialog&brand=purple&id=purple-dialog&open=true&portal=true');
  const other = await request.get('/ssr?example=dialog&brand=teal&id=teal-dialog&open=true&portal=false');
  expect(closed.ok() && open.ok() && other.ok()).toBe(true);
  const [closedHTML, openHTML, otherHTML] = await Promise.all([closed.text(), open.text(), other.text()]);
  expect(closedHTML).not.toContain('data-testid="ssr-dialog-body"');
  expect(openHTML).toContain('Real purple dialog content is present in server HTML');
  expect(openHTML).toContain('id="purple-dialog-title"');
  expect(openHTML.indexOf('data-testid="ssr-dialog"')).toBeLessThan(openHTML.indexOf('id="ssr-dialog-host"'));
  expect(otherHTML).toContain('Real teal dialog content is present in server HTML');
  expect(otherHTML).toContain('id="teal-dialog-title"');
  expect(otherHTML).not.toContain('purple-dialog');
  expect(await (await request.get('/ssr?example=dialog&brand=purple&id=purple-dialog')).text()).toBe(closedHTML);
});

test('T13.8.4 hydrates the same panel/title and migrates only when portal is enabled', async ({ page }) => {
  const warnings: string[] = [];
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  for (const portal of [true, false]) {
    await page.goto(`/ssr?example=dialog&open=true&portal=${portal}`);
    await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
    const panel = page.getByRole('dialog', { name: 'SSR dialog purple' });
    await expect(panel).toBeVisible();
    expect(await page.evaluate(() => {
      const captured = window as typeof window & { __zoomSSRDialogRoot?: Element; __zoomSSRDialogPanel?: Element; __zoomSSRDialogTitle?: Element };
      const current = document.querySelector('[data-testid="ssr-dialog"]');
      return captured.__zoomSSRDialogRoot === current && captured.__zoomSSRDialogPanel === current?.querySelector('.zoom-dialog__panel') &&
        captured.__zoomSSRDialogTitle === current?.querySelector('.zoom-dialog__title');
    })).toBe(true);
    expect(await panel.evaluate(node => node.closest('#ssr-dialog-host') !== null)).toBe(portal);
    await expect(panel.locator('.zoom-dialog__close')).toBeFocused();
    expect(await leaseCount(page)).toBe(1);
  }
  await page.goto('/ssr?example=dialog&portal=true');
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  expect(await page.evaluate(() => (window as typeof window & { __zoomSSRDialogPanel?: Element | null }).__zoomSSRDialogPanel ?? null)).toBeNull();
  expect(await leaseCount(page)).toBe(0);
  await page.getByRole('button', { name: 'Open SSR dialog' }).click();
  await expect(page.getByRole('dialog', { name: 'SSR dialog purple' })).toBeVisible();
  expect(await leaseCount(page)).toBe(1);
  expect(warnings).toEqual([]);
});

test('T13.8.5 closes, unmounts and reopens without stale layers or focus', async ({ page }) => {
  await page.goto('/ssr?example=dialog&open=true&portal=true');
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  const dialog = page.getByRole('dialog', { name: 'SSR dialog purple' });
  await dialog.locator('.zoom-dialog__close').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('ssr-dialog-close-count')).toHaveText('1');
  await expect.poll(() => leaseCount(page)).toBe(0);
  const open = page.getByRole('button', { name: 'Open SSR dialog' });
  await open.click();
  await expect(dialog.locator('.zoom-dialog__close')).toBeFocused();
  await expect.poll(() => leaseCount(page)).toBe(1);
  await dialog.getByRole('button', { name: 'Unmount this dialog' }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => leaseCount(page)).toBe(0);
  await open.click();
  await expect(dialog.locator('.zoom-dialog__close')).toBeFocused();
  await dialog.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('ssr-dialog-close-count')).toHaveText('2');
  await expect.poll(() => leaseCount(page)).toBe(0);
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).not.toBe('hidden');
});

test('T13.8.6 two Vue apps use distinct idPrefix values and one document session', async ({ page }) => {
  await page.goto('/dialog-multi.html');
  const first = page.getByRole('dialog', { name: 'First app dialog', includeHidden: true });
  const second = page.getByRole('dialog', { name: 'Second app dialog' });
  await expect(first).toHaveCount(1); await expect(second).toBeVisible();
  const [firstId, secondId] = await Promise.all([first.getAttribute('id'), second.getAttribute('id')]);
  expect(firstId).toMatch(/^zoom-dialog-first-/);
  expect(secondId).toMatch(/^zoom-dialog-second-/);
  expect(firstId).not.toBe(secondId);
  await expect.poll(() => leaseCount(page)).toBe(2);
  await second.locator('.zoom-dialog__close').click();
  await expect(second).toHaveCount(0);
  await expect.poll(() => leaseCount(page)).toBe(1);
  await first.locator('.zoom-dialog__close').click();
  await expect.poll(() => leaseCount(page)).toBe(0);
});

test('T13.8.7 ordinary preview exposes four Dialog views and loads public JS/CSS', async ({ page, packageImports }) => {
  const requested: string[] = [];
  const warnings: string[] = [];
  page.on('response', response => requested.push(response.url()));
  page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto('/dialog');
  await expect(page.getByRole('heading', { name: 'Dialog playground' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Vue package imports ready');
  expect(requested.some(url => (packageImports.vueDialog as RegExp).test(url))).toBe(true);
  expect(requested.some(url => /\/packages\/vue\/dist\/dialog\/style\.css(?:\?|$)/.test(url))).toBe(true);
  await page.getByRole('link', { name: 'Behavior' }).click();
  await expect(page.getByRole('heading', { name: 'Dialog controlled requests' })).toBeVisible();
  await page.goto('/dialog/appearance?brand=teal&density=compact');
  await expect(page.getByRole('dialog', { name: /A very long Dialog heading/ })).toBeVisible();
  await expect(page.locator('[data-zoom-density="compact"]')).toHaveCount(1);
  await page.goto('/dialog/composition');
  await expect(page.getByRole('heading', { name: 'Dialog composition' })).toBeVisible();
  await page.getByRole('button', { name: 'Open composition form' }).click();
  await expect(page.getByRole('dialog', { name: 'Composition form' })).toBeVisible();
  expect(warnings).toEqual([]);
});

test('T13.8 regression: existing Select and Combobox SSR still hydrate their inline popup', async ({ page }) => {
  await page.goto('/ssr?example=select&open=true');
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('#ssr-popup-host [role="listbox"]')).toHaveCount(1);
  expect(await page.evaluate(() => (window as typeof window & { __zoomSSRSelectPopup?: Element }).__zoomSSRSelectPopup === document.querySelector('#ssr-popup-host [role="listbox"]'))).toBe(true);
  await page.goto('/ssr?example=combobox&open=true');
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  await expect(page.locator('#ssr-combobox-popup-host [role="listbox"]')).toHaveCount(1);
  expect(await page.evaluate(() => (window as typeof window & { __zoomSSRComboboxPopup?: Element }).__zoomSSRComboboxPopup === document.querySelector('#ssr-combobox-popup-host [role="listbox"]'))).toBe(true);
});
