import { test, expect } from '../fixtures';

test('zoneless native probe imports APF/CSS, updates input and signal, emits and destroys', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('import-status')).toContainText('@zoom-design/angular APF imported');
  await expect(page.getByTestId('count')).toHaveText('0');
  await expect(page.getByTestId('probe-label')).toHaveText('Initial');
  expect(await page.locator('.zoom-engineering-probe').evaluate((node) => getComputedStyle(node).getPropertyValue('--zoom-engineering-built').trim())).toBe('1');
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await expect(page.getByTestId('count')).toHaveText('1');
  await expect(page.getByTestId('emitted-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Update label', exact: true }).click();
  await expect(page.getByTestId('probe-label')).toHaveText('Updated');
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect(page.getByTestId('unmounted')).toHaveText('unmounted');
  await expect(page.getByTestId('cleanup-count')).toHaveText('1');
  await expect(page.locator('zoom-build-probe')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('failed package import gate never enables the native probe', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/chunk-*.js', (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByTestId('import-error')).toContainText('Angular package import failed');
  await expect(page.getByRole('button', { name: 'Increment', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('import-status')).toHaveCount(0);
  await expect.poll(() => errors.length).toBeGreaterThan(0);
});
