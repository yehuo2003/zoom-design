import { test, expect } from '../fixtures.js';
test.beforeEach(async ({ page }) => {
  await page.goto('/layers'); await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Core and DOM package imports ready');
});
test('T10.3 real floating geometry flips, follows scroll/resize/RTL and restores cleanup', async ({ page }) => {
  await page.getByRole('button', { name: 'Open floating', exact: true }).click();
  const geometry = () => page.evaluate(() => { const a = document.querySelector('#float-trigger')!.getBoundingClientRect(); const b = document.querySelector('#floating-popup')!.getBoundingClientRect(); return { width: Math.abs(a.width - b.width), gap: Math.min(Math.abs(b.top - a.bottom - 4), Math.abs(a.top - b.bottom - 4)), x: b.left, y: b.top, bottom: b.bottom }; });
  await expect.poll(async () => (await geometry()).width).toBeLessThan(1);
  await expect.poll(async () => (await geometry()).gap).toBeLessThan(2);
  const before = await geometry(); await page.locator('#scroll-area').evaluate(node => { node.scrollTop = 60; });
  await expect.poll(async () => Math.abs((await geometry()).y - before.y)).toBeGreaterThan(20);
  await page.getByRole('button', { name: 'Resize trigger', exact: true }).click();
  await expect.poll(async () => (await geometry()).width).toBeLessThan(1); await expect(page.locator('#floating-popup')).toHaveCSS('width', '230px');
  await page.getByRole('button', { name: 'Toggle RTL', exact: true }).click();
  await expect.poll(async () => (await geometry()).gap).toBeLessThan(2);
  await page.setViewportSize({ width: 700, height: 450 });
  await expect.poll(async () => (await geometry()).bottom).toBeLessThanOrEqual(451);
  await page.locator('#float-trigger').evaluate(node => { node.style.position = 'fixed'; node.style.top = '420px'; node.style.left = '680px'; });
  await page.getByRole('button', { name: 'Toggle RTL', exact: true }).click();
  await expect.poll(() => page.locator('#floating-popup').evaluate(node => node.getBoundingClientRect().right)).toBeLessThanOrEqual(701);
  await expect.poll(() => page.locator('#floating-popup').evaluate(node => node.getBoundingClientRect().bottom)).toBeLessThanOrEqual(420);
  await page.locator('#float-trigger').evaluate(node => { node.style.left = '-20px'; node.style.top = '10px'; });
  await page.getByRole('button', { name: 'Toggle RTL', exact: true }).click();
  await expect.poll(() => page.locator('#floating-popup').evaluate(node => node.getBoundingClientRect().left)).toBeGreaterThanOrEqual(0);
  await expect.poll(async () => (await geometry()).gap).toBeLessThan(2);
  await page.getByRole('button', { name: 'Close floating', exact: true }).click(); await expect(page.locator('#floating-popup')).toHaveCount(0);
});
test('T10.6/7/8 top layer arbitrates portals, clear controls and composed shadow clicks', async ({ page }) => {
  await page.getByRole('button', { name: 'Register parent layer', exact: true }).click();
  await page.getByRole('button', { name: 'Clear control', exact: true }).click(); await page.getByRole('button', { name: 'Shadow inside', exact: true }).click();
  await expect(page.getByLabel('Dismiss requests')).toHaveText('');
  await page.keyboard.press('Escape'); await expect(page.getByLabel('Dismiss requests')).toHaveText('parent:escape');
  await page.getByRole('button', { name: 'Register child layer', exact: true }).click();
  const recorded = await page.getByLabel('Dismiss requests').textContent();
  await page.getByRole('button', { name: 'Portaled child', exact: true }).click(); await expect(page.getByLabel('Dismiss requests')).toHaveText(recorded!);
  await page.keyboard.press('Escape'); await expect(page.getByLabel('Dismiss requests')).toHaveText(`${recorded}|child:escape`);
  await page.getByRole('button', { name: 'Outside target', exact: true }).click(); await expect(page.getByLabel('Dismiss requests')).toHaveText(`${recorded}|child:escape|child:outside`);
  await page.getByRole('button', { name: 'Clean layers', exact: true }).click(); const final = await page.getByLabel('Dismiss requests').textContent(); await page.keyboard.press('Escape'); await expect(page.getByLabel('Dismiss requests')).toHaveText(final!);
});
test('T10.10 nonmodal layer retains native Tab and does not lock or inert the page', async ({ page }) => {
  await page.getByRole('button', { name: 'Register parent layer', exact: true }).click(); await page.locator('#clear-node').focus();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Shadow inside', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#after-layer')).toBeFocused();
  expect(await page.evaluate(() => ({ overflow: document.body.style.overflow, inert: !!document.querySelector('[inert]') }))).toEqual({ overflow: '', inert: false });
});
test('T10.9/11/12 nested modal owns Tab and isolation; parent resumes, original styles return', async ({ page }) => {
  await page.evaluate(() => document.body.style.setProperty('overflow', 'scroll', 'important'));
  await page.getByRole('button', { name: 'Open modal', exact: true }).click(); await expect(page.locator('#modal-first')).toBeFocused();
  expect(await page.locator('#vector-link').evaluate(node => { (node as SVGAElement).focus(); return document.activeElement === node; })).toBe(false);
  await page.locator('#vector-link').click({ force: true }); expect(await page.evaluate(() => location.hash)).toBe('');
  expect(await page.locator('#theme-host').getAttribute('inert')).toBeNull();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#modal-close')).toBeFocused(); await page.keyboard.press('Tab'); await expect(page.locator('#modal-first')).toBeFocused();
  await page.getByRole('button', { name: 'Open nested modal', exact: true }).click(); await expect(page.locator('#nested-first')).toBeFocused();
  await expect(page.locator('#modal-scope')).toHaveAttribute('inert', '');
  await page.getByRole('button', { name: 'Close nested modal', exact: true }).click(); await expect(page.locator('#nested-open')).toBeFocused();
  await page.getByRole('button', { name: 'Close modal', exact: true }).click(); await expect(page.locator('#modal-open')).toBeFocused();
  expect(await page.evaluate(() => [document.body.style.overflow, document.body.style.getPropertyPriority('overflow'), !!document.querySelector('[inert]')])).toEqual(['scroll', 'important', false]);
});
test('T10.5/9/11 reverse modal cleanup and removed return targets are safe', async ({ page }) => {
  await page.getByRole('button', { name: 'Open modal', exact: true }).click(); await page.getByRole('button', { name: 'Remove return target', exact: true }).click();
  await page.getByRole('button', { name: 'Open nested modal', exact: true }).click(); await page.getByRole('button', { name: 'Release parent first', exact: true }).click();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden'); await page.getByRole('button', { name: 'Close nested modal', exact: true }).click();
  await expect(page.locator('#return-fallback')).toBeFocused(); expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  await page.reload(); await page.getByRole('button', { name: 'Open modal', exact: true }).click(); await page.getByRole('button', { name: 'Detach modal', exact: true }).click();
  await expect.poll(() => page.evaluate(() => [document.body.style.overflow, !!document.querySelector('[inert]')])).toEqual(['', false]);
});
test('T10.13/14 native invalid, trusted reset cancellation and dynamic form/fieldset ownership', async ({ page }) => {
  const state = page.getByLabel('Form bridge state'); await page.getByRole('button', { name: 'Submit A', exact: true }).click();
  await expect(page.locator('#bridge-trigger')).toBeFocused(); await expect(state).toContainText('invalid=1');
  await page.getByRole('button', { name: 'Fill value', exact: true }).click(); await page.getByRole('button', { name: 'Cancel resets', exact: true }).click();
  await page.getByRole('button', { name: 'Reset A', exact: true }).click(); await expect(page.locator('#bridge-proxy')).toHaveValue('zero'); await expect(state).toContainText('reset=0');
  await page.getByRole('button', { name: 'Cancel resets', exact: true }).click(); await page.getByRole('button', { name: 'Reset A', exact: true }).click(); await expect(state).toContainText('reset=1'); await expect(state).toContainText('value=;');
  await page.getByRole('button', { name: 'Use form B', exact: true }).click(); await expect(state).toContainText('form-b');
  expect(await page.evaluate(() => Array.from(new FormData(document.querySelector<HTMLFormElement>('#form-b')!).entries()))).toEqual([['renamed', '']]);
  await page.getByRole('button', { name: 'Toggle fieldset', exact: true }).click(); await expect(state).toContainText('disabled=true;legend=false');
  await page.getByRole('button', { name: 'Toggle fieldset', exact: true }).click(); await page.getByRole('button', { name: 'Dispose bridge', exact: true }).click();
  await page.getByRole('button', { name: 'Reset B', exact: true }).click(); await expect(state).toContainText('reset=1');
});
test('T10.5/9/12 slotted/shadow scopes and allowed portal keep focus and release native inert', async ({ page }) => {
  await page.getByRole('button', { name: 'Open shadow modal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Shadow modal first', exact: true })).toBeFocused();
  expect(await page.locator('#shadow-modal-host').getAttribute('inert')).toBeNull(); expect(await page.locator('#shadow-modal-host slot').getAttribute('inert')).toBeNull();
  await page.locator('#allowed-modal-portal').focus(); await expect(page.locator('#allowed-modal-portal')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Shadow modal first', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Move into shadow', exact: true }).click(); await page.getByRole('button', { name: 'Detach shadow modal', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(''); await expect(page.getByRole('button', { name: 'Outside target', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => !!document.querySelector('[inert]'))).toBe(false);
});
