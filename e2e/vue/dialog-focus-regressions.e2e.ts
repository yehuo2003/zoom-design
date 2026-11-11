import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures.js';

async function visit(page: Page, query: string) {
  await page.goto(`/regressions/dialog-focus?${query}`);
  await expect(page.locator('[data-regression-ready]')).toHaveAttribute('data-regression-ready', 'true');
}
async function trace(page: Page) {
  await page.evaluate(() => {
    const events: string[] = []; Reflect.set(window, '__focusTrace', events);
    document.addEventListener('focusin', event => events.push((event.target as HTMLElement).id));
  });
}
const focusTrace = (page: Page) => page.evaluate(() => Reflect.get(window, '__focusTrace'));

for (const position of ['before', 'after']) test(`T14.7.1 F1-${position} native Tab and Shift+Tab include external allowed portal`, async ({ page }) => {
  await visit(page, `scenario=tab-order&position=${position}`);
  const a = page.getByRole('button', { name: 'A', exact: true }), b = page.getByRole('button', { name: 'B', exact: true }), c = page.getByRole('button', { name: 'Portal C', exact: true });
  await a.focus(); await trace(page);
  for (const target of [b, c, a]) { await page.keyboard.press('Tab'); await expect(target).toBeFocused(); }
  for (const target of [c, b, a]) { await page.keyboard.press('Shift+Tab'); await expect(target).toBeFocused(); }
  expect(await focusTrace(page)).toEqual(['tab-b', 'portal-c', 'tab-a', 'portal-c', 'tab-b', 'tab-a']);
});
test('T14.7.2 F2-custom explicit return has exactly one final focus event', async ({ page }) => {
  await visit(page, 'scenario=double-focus'); await page.getByRole('button', { name: 'Open child', exact: true }).press('Enter');
  const close = page.getByRole('dialog', { name: 'Child', exact: true }).getByRole('button', { name: '关闭', exact: true });
  await close.focus(); await trace(page); await close.press('Enter');
  await expect(page.getByRole('button', { name: 'Return target', exact: true })).toBeFocused(); expect(await focusTrace(page)).toEqual(['return-target']);
});
for (const action of ['close-both', 'replace']) test(`T14.7.2 F2-${action} records only the final legal target`, async ({ page }) => {
  await visit(page, `scenario=return-batch&action=${action}`);
  const change = page.getByRole('button', { name: 'Change active tree', exact: true }); await change.focus(); await trace(page); await change.press('Enter');
  const id = action === 'close-both' ? 'outer-return' : 'new-initial'; await expect(page.locator(`#${id}`)).toBeFocused(); expect(await focusTrace(page)).toEqual([id]);
});
test('T14.7.3 F3-portal legal external return works and inert background return is refused', async ({ page }) => {
  for (const background of [false, true]) {
    await visit(page, `scenario=portal-return&background=${background}`);
    const opener = page.getByRole('button', { name: 'Open second', exact: true }); await opener.press('Enter');
    const close = page.getByRole('dialog', { name: 'Second', exact: true }).getByRole('button', { name: '关闭', exact: true }); await close.focus(); await trace(page); await close.press('Enter');
    await expect(opener).toBeFocused(); expect(await opener.evaluate(node => !!node.closest('[inert]'))).toBe(false); expect(await focusTrace(page)).toEqual(['portal-return']);
  }
});
for (const modal of [false, true]) for (const move of ['inline-to-portal', 'invalid-to-valid', 'portal-to-inline', 'host-to-host']) {
  test(`T14.7.4 F4-${modal ? 'modal' : 'nonmodal'}-${move} preserves nodes and focus during a completed move`, async ({ page }) => {
    await visit(page, `scenario=move&move=${move}&modal=${modal}`);
    const input = page.getByRole('textbox', { name: 'Moving target', exact: true }); const original = await input.elementHandle();
    const panel = await page.getByRole('dialog', { name: 'Moving', exact: true }).elementHandle();
    const prior = await input.evaluate(node => node.closest('.zoom-dialog')!.parentElement!.id);
    await input.fill('kept'); await input.press('F2'); await expect(input).toBeFocused(); await expect(input).toHaveValue('kept');
    expect(await input.evaluate((node, original) => node === original, original)).toBe(true);
    expect(await page.getByRole('dialog', { name: 'Moving', exact: true }).evaluate((node, original) => node === original, panel)).toBe(true);
    const target = move === 'portal-to-inline' ? 'regression-mount' : move === 'host-to-host' ? 'second-host' : 'first-host'; expect(prior).not.toBe(target);
    await expect.poll(() => input.evaluate(node => node.closest('.zoom-dialog')!.parentElement?.id)).toBe(target);
  });
}
for (const choice of ['select', 'combobox']) test(`T14.7.5 F5-${choice} initially open child does not swallow Dialog initial focus`, async ({ page }) => {
  await visit(page, `scenario=initial-choice&choice=${choice}`);
  await expect(page.getByRole('textbox', { name: 'Initial target', exact: true })).toBeFocused(); await expect(page.getByRole('listbox')).toBeVisible();
});
