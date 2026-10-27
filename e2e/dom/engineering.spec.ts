import { test, expect } from '../fixtures.js';

test('T2.7/T2.9 DOM package gates click registration and observable disposal', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dom');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Core and DOM package imports ready');
  await expect(page.getByLabel('Click count')).toHaveText('0');
  await page.getByRole('button', { name: 'Trigger click', exact: true }).click();
  await expect(page.getByLabel('Click count')).toHaveText('1');
  await page.getByRole('button', { name: 'Dispose listener', exact: true }).click();
  await expect(page.getByLabel('Listener state')).toHaveText('disposed');
  await page.getByRole('button', { name: 'Trigger click', exact: true }).click();
  await expect(page.getByLabel('Click count')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('T2.9 a broken DOM package import reports failure and keeps controls disabled', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  let intercepted = false;
  await page.route(/\/packages\/dom\/dist\/index\.js/, async route => {
    intercepted = true; await route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("DOM package import failed")' });
  });
  await page.goto('/dom');
  await expect(page.getByRole('alert')).toContainText('DOM package import failed');
  await expect(page.getByRole('button', { name: 'Trigger click', exact: true })).toBeDisabled();
  expect(intercepted).toBe(true);
  await expect.poll(() => errors.join('\n')).toContain('DOM package import failed');
});
