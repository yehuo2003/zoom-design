import { test, expect } from '../fixtures.js';

test('T3.5/T3.7/T3.12 real imports gate StrictMode state, props, CSS and cleanup', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('React package and CSS imports ready');
  await expect(page.getByLabel('Probe count', { exact: true })).toHaveText('0');
  await expect(page.getByLabel('Effect status')).toHaveText('active');
  expect(await page.getByRole('region', { name: 'React native probe' }).evaluate(node => getComputedStyle(node).getPropertyValue('--zoom-engineering-built').trim())).toBe('1');
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await expect(page.getByLabel('Probe count', { exact: true })).toHaveText('1');
  await expect(page.getByLabel('Emitted count')).toHaveText('1');
  await page.getByRole('button', { name: 'Update label' }).click();
  await expect(page.getByLabel('Probe label')).toHaveText('Updated');
  await expect(page.getByLabel('Probe count', { exact: true })).toHaveText('1');
  await page.getByRole('button', { name: 'Unmount', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Probe mount status' })).toHaveText('unmounted');
  await expect(page.getByLabel('Effect status')).toHaveText('inactive');
  await expect(page.getByRole('button', { name: 'Increment', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('failed public package import leaves the native probe unavailable', async ({ page }) => {
  let intercepted = false;
  await page.route(/\/packages\/react\/dist\/index\.js/, async route => {
    intercepted = true;
    await route.fulfill({ contentType: 'text/javascript', body: 'throw new Error("React public package unavailable")' });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('React public package unavailable');
  await expect(page.getByRole('button', { name: 'Increment', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'React native probe' })).toHaveCount(0);
  expect(intercepted).toBe(true);
});

test('SSR returns probe HTML and hydrateRoot preserves its first server node', async ({ page, request }) => {
  const response = await request.get('/ssr');
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('data-ssr="true"');
  expect(html).toContain('aria-label="Probe count">0</output>');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/ssr');
  await expect(page.getByLabel('Effect status')).toHaveText('active');
  expect(await page.evaluate(() => {
    const recorded = (window as Window & { __zoomSSRNode?: Element }).__zoomSSRNode;
    return Boolean(recorded && recorded === document.getElementById('app')?.firstElementChild);
  })).toBe(true);
  await page.getByRole('button', { name: 'Increment', exact: true }).click();
  await expect(page.getByLabel('Probe count', { exact: true })).toHaveText('1');
  expect(errors).toEqual([]);
});
