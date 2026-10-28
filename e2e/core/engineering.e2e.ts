import { test, expect } from '../fixtures.js';

test('T2.6/T2.9 Core package gates two independent zero-valued state instances', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/core');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Core and DOM package imports ready');
  await expect(page.getByLabel('First count')).toHaveText('0');
  await expect(page.getByLabel('Second count')).toHaveText('0');
  await page.getByRole('button', { name: 'Increment first', exact: true }).click();
  await expect(page.getByLabel('First count')).toHaveText('1');
  await expect(page.getByLabel('Second count')).toHaveText('0');
  await page.getByRole('button', { name: 'Increment second', exact: true }).click();
  await expect(page.getByLabel('Second count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('T2.9 a broken Core package import reports failure and keeps controls disabled', async ({ page, runtimeErrors, packageImports }) => {
  runtimeErrors.allowPageError(/Core package import failed/);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  let intercepted = false;
  await page.route(packageImports.core, async route => {
    intercepted = true; await route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("Core package import failed")' });
  });
  await page.goto('/core');
  await expect(page.getByRole('alert')).toContainText('Core package import failed');
  await expect(page.getByRole('button', { name: 'Increment first', exact: true })).toBeDisabled();
  expect(intercepted).toBe(true);
  await expect.poll(() => errors.join('\n')).toContain('Core package import failed');
});

test('T4.8 Core reload creates new zero-valued instances', async ({ page }) => {
  await page.goto('/core');
  await page.getByRole('button', { name: 'Increment first', exact: true }).click();
  await expect(page.getByLabel('First count')).toHaveText('1');
  await page.reload();
  await expect(page.getByLabel('First count')).toHaveText('0');
  await expect(page.getByLabel('Second count')).toHaveText('0');
});
