import { test, expect } from '../fixtures.js';

test('T3.4/T3.12 Vue native props, emitted count, explicit CSS and unmount', async ({ page, assetEvidence }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Vue package imports ready');
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('0');
  await expect(page.getByLabel('Label', { exact: true })).toHaveText('Initial');
  const marker = await page.getByRole('region', { name: 'Vue engineering probe' }).evaluate(element => getComputedStyle(element).getPropertyValue('--zoom-engineering-built').trim());
  expect(marker).toBe('1');
  await page.getByRole('button', { name: 'Update label', exact: true }).click();
  await expect(page.getByLabel('Label', { exact: true })).toHaveText('Updated');
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('1');
  await expect(page.getByLabel('Emitted count')).toHaveText('1');
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Vue engineering probe' })).toHaveCount(0);
  await expect(page.getByText('unmounted', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Cleanup')).toHaveText('disposed');
  await assetEvidence();
  expect(errors).toEqual([]);
});

test('T3.13 a failed public package import prevents the private probe mounting', async ({ page, runtimeErrors, packageImports }) => {
  runtimeErrors.allowPageError(/Vue package import failed/);
  let intercepted = false;
  await page.route(packageImports.vue, async route => {
    intercepted = true;
    await route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("Vue package import failed")' });
  });
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Package imports failed');
  await expect(page.getByRole('alert')).toContainText('Vue package import failed');
  await expect(page.getByRole('button', { name: 'Increment', exact: true })).toHaveCount(0);
  expect(intercepted).toBe(true);
});

test('T4.8 Vue reload resets the probe after unmount', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('1');
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect(page.getByLabel('Cleanup')).toHaveText('disposed');
  await page.reload();
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('0');
  await expect(page.getByLabel('Label', { exact: true })).toHaveText('Initial');
});

test('Vue SSR renders native markup then hydrates the same server node', async ({ page, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/hydration/i.test(message.text())) errors.push(message.text()); });
  const response = await request.get('/ssr');
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('data-ssr="true"');
  expect(html).toContain('Vue engineering probe');
  expect(html).toContain('aria-label="Count">0</output>');
  await page.goto('/ssr');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Vue package imports ready');
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  expect(await page.evaluate(() => (window as Window & { __zoomSSRNode?: Element }).__zoomSSRNode === document.getElementById('app')?.firstElementChild)).toBe(true);
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await expect(page.getByLabel('Count', { exact: true })).toHaveText('1');
  await expect(page.getByLabel('Emitted count')).toHaveText('1');
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect(page.getByLabel('Cleanup')).toHaveText('disposed');
  expect(errors).toEqual([]);
});
