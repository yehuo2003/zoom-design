import { test, expect } from '../fixtures.js';

test('T9.2/T9.5/T9.6/T9.12/T9.15 public API keeps value types, skips disabled and isolates callers', async ({ page }) => {
  await page.goto('/selection');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Core and DOM package imports ready');
  const first = page.locator('[data-selection-instance="first"]'); const second = page.locator('[data-selection-instance="second"]');
  await expect(first.locator('[data-field="value"]')).toHaveText('number:0');
  await first.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(first.locator('[data-field="highlight"]')).toHaveText('number:0');
  await first.getByRole('button', { name: 'Next', exact: true }).click(); await first.getByRole('button', { name: 'Confirm highlight' }).click();
  await expect(first.locator('[data-field="value"]')).toHaveText('string:""'); await expect(first.locator('[data-field="label"]')).toHaveText('ALPHA');
  await first.getByRole('button', { name: 'Next', exact: true }).click(); await first.getByRole('button', { name: 'Confirm highlight' }).click();
  await expect(first.locator('[data-field="value"]')).toHaveText('string:"0"');
  await first.getByRole('button', { name: 'Next', exact: true }).click(); await expect(first.locator('[data-field="highlight"]')).toHaveText('string:"中"');
  await first.getByRole('button', { name: 'Next', exact: true }).click(); await expect(first.locator('[data-field="highlight"]')).toHaveText('string:"中"');
  await first.getByLabel('Loop', { exact: true }).check(); await first.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(first.locator('[data-field="highlight"]')).toHaveText('number:0');
  await expect(second.locator('[data-field="value"]')).toHaveText('number:0'); await expect(second.locator('[data-field="highlight"]')).toHaveText('null');
});
test('T9.7/T9.8/T9.10/T9.15 deletion/restoration, reorder and deterministic filtering call published functions', async ({ page }) => {
  await page.goto('/selection'); const first = page.locator('[data-selection-instance="first"]');
  await first.getByRole('button', { name: 'Remove selected option' }).click();
  await expect(first.locator('[data-field="value"]')).toHaveText('number:0'); await expect(first.locator('[data-field="label"]')).toHaveText('Unmatched');
  await first.getByRole('button', { name: 'Restore options' }).click(); await expect(first.locator('[data-field="label"]')).toHaveText('Apple');
  await first.getByRole('button', { name: 'First', exact: true }).click(); await first.getByRole('button', { name: 'Reverse options' }).click();
  await expect(first.locator('[data-field="highlight"]')).toHaveText('number:0');
  await first.getByLabel('Filter', { exact: true }).fill('AP'); await expect(first.locator('[data-field="options"]')).toHaveText('Apricot | Apple');
  await first.getByLabel('Filter', { exact: true }).fill('中文'); await expect(first.locator('[data-field="options"]')).toHaveText('中文选项');
  await expect(first.locator('[data-field="highlight"]')).toHaveText('string:"中"');
  await first.getByLabel('Filter', { exact: true }).fill('no-match'); await expect(first.locator('[data-field="highlight"]')).toHaveText('null');
  await first.getByRole('button', { name: 'Clear value' }).click(); await expect(first.locator('[data-field="value"]')).toHaveText('null');
});
test('T9.11/T9.12/T9.15 typeahead cycles only the current call with no shared buffer', async ({ page }) => {
  await page.goto('/selection'); const first = page.locator('[data-selection-instance="first"]'); const second = page.locator('[data-selection-instance="second"]');
  await first.getByRole('button', { name: 'First', exact: true }).click();
  await first.getByLabel('Typeahead', { exact: true }).fill('aa'); await first.getByRole('button', { name: 'Match prefix' }).click();
  await expect(first.locator('[data-field="highlight"]')).toHaveText('string:""');
  await first.getByRole('button', { name: 'Match prefix' }).click(); await expect(first.locator('[data-field="highlight"]')).toHaveText('string:"0"');
  await second.getByLabel('Typeahead', { exact: true }).fill('中文'); await second.getByRole('button', { name: 'Match prefix' }).click();
  await expect(second.locator('[data-field="highlight"]')).toHaveText('string:"中"');
  await expect(first.locator('[data-field="highlight"]')).toHaveText('string:"0"');
  await first.getByLabel('Typeahead', { exact: true }).fill('missing'); await first.getByRole('button', { name: 'Match prefix' }).click();
  await expect(first.locator('[data-field="highlight"]')).toHaveText('null');
});
