import { test, expect } from '../fixtures';

test('zoneless native probe imports APF/CSS, updates input and signal, emits and destroys', async ({ page, assetEvidence }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toContainText('@zoom-design/angular APF imported');
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('0');
  await expect(page.getByLabel('Label', { exact: true })).toHaveText('Initial');
  expect(await page.getByRole('region', { name: 'Angular engineering probe' }).evaluate((node) => getComputedStyle(node).getPropertyValue('--zoom-engineering-built').trim())).toBe('1');
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('1');
  await expect(page.getByLabel('Emitted count')).toHaveText('1');
  await page.getByRole('button', { name: 'Update label', exact: true }).click();
  await expect(page.getByLabel('Label', { exact: true })).toHaveText('Updated');
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Probe mount status' })).toHaveText('unmounted');
  await expect(page.getByLabel('Cleanup count')).toHaveText('1');
  await expect(page.getByRole('region', { name: 'Angular engineering probe' })).toHaveCount(0);
  await assetEvidence();
  expect(errors).toEqual([]);
});

test('failed package import gate never enables the native probe', async ({ page, runtimeErrors, packageImports }) => {
  runtimeErrors.allowPageError(/Angular injected import failure/);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(packageImports.angular, route => route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("Angular injected import failure")' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Angular package import failed');
  await expect(page.getByRole('button', { name: 'Increment', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveCount(0);
  await expect.poll(() => errors.length).toBeGreaterThan(0);
});

test('T4.8 Angular reload resets signal state after destruction', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('1');
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect(page.getByLabel('Cleanup count')).toHaveText('1');
  await page.reload();
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('0');
  await expect(page.getByLabel('Cleanup count')).toHaveText('0');
});
