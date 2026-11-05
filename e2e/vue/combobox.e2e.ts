import { test, expect } from '../fixtures.js';
import type { Locator, Page } from '@playwright/test';

async function visit(page: Page) {
  await page.goto('/combobox');
  await expect(page.getByRole('heading', { name: 'Combobox playground', exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Package readiness', exact: true })).toHaveText('Vue package imports ready');
}
function choice(page: Page) { return page.getByRole('combobox', { name: 'Choose searchable value', exact: true }); }
async function popup(page: Page, input: Locator) {
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  const id = await input.getAttribute('aria-controls'); expect(id).toBeTruthy();
  return page.locator(`[id="${id}"]`);
}
async function active(page: Page, input: Locator) {
  const id = await input.getAttribute('aria-activedescendant'); expect(id).toBeTruthy();
  const option = page.locator(`[id="${id}"]`); await expect(option).toHaveCount(1); return option;
}
async function choose(page: Page, input: Locator, label: string) {
  await input.fill(''); await input.press('ArrowDown');
  await (await popup(page, input)).getByRole('option', { name: label, exact: true }).click();
}
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

test('T12.12 explicit empty form owner detaches both native fields and dynamic owners follow the prop', async ({ page }) => {
  await visit(page); const probe = page.getByTestId('combobox-form-owner-probe'); const controls = probe.locator('select, input[type="hidden"]');
  const owners = () => controls.evaluateAll(nodes => nodes.map(node => ({ attribute: node.getAttribute('form'), owner: (node as HTMLInputElement | HTMLSelectElement).form?.id ?? null })));
  const data = (formId: string) => page.locator(`#${formId}`).evaluate(form => [...new FormData(form as HTMLFormElement).entries()]);
  expect(await owners()).toEqual([{ attribute: null, owner: 'combobox-form-owner-probe' }, { attribute: null, owner: 'combobox-form-owner-probe' }]);
  expect(await data('combobox-form-owner-probe')).toEqual([['probe-choice', '0']]);
  await page.getByRole('button', { name: 'Set Combobox probe to empty form', exact: true }).click();
  expect(await owners()).toEqual([{ attribute: '', owner: null }, { attribute: '', owner: null }]); expect(await data('combobox-form-owner-probe')).toEqual([]);
  await page.getByRole('button', { name: 'Set Combobox probe to external form', exact: true }).click();
  expect(await owners()).toEqual([{ attribute: 'combobox-alternative-form', owner: 'combobox-alternative-form' }, { attribute: 'combobox-alternative-form', owner: 'combobox-alternative-form' }]);
  expect(await data('combobox-alternative-form')).toEqual([['probe-choice', '0']]);
  await page.getByRole('button', { name: 'Clear Combobox probe form override', exact: true }).click();
  expect(await owners()).toEqual([{ attribute: null, owner: 'combobox-form-owner-probe' }, { attribute: null, owner: 'combobox-form-owner-probe' }]);
  expect(await data('combobox-form-owner-probe')).toEqual([['probe-choice', '0']]);
});

test('T12.1/T12.2 editing filters text without submitting a business value', async ({ page, assetEvidence }) => {
  await visit(page); const input = choice(page);
  await expect(input).toHaveJSProperty('tagName', 'INPUT'); await expect(input).toHaveAttribute('aria-autocomplete', 'list');
  await input.fill('AP'); const list = await popup(page, input); await expect(list.getByRole('option')).toHaveText(['Apple', 'Apricot']);
  const inputWidth = await input.evaluate(node => node.getBoundingClientRect().width);
  await expect.poll(() => list.evaluate(node => node.getBoundingClientRect().width)).toBeCloseTo(inputWidth, 0);
  await expect(page.getByTestId('combobox-query')).toHaveText('"AP"'); await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
  await input.fill('banana'); await expect((await popup(page, input)).getByRole('option')).toHaveText(['Banana']);
  await input.fill(''); await expect((await popup(page, input)).getByRole('option')).toHaveCount(8);
  await assetEvidence();
});

test('T12.3 prefix filtering and minQueryLength produce deterministic empty results', async ({ page }) => {
  await visit(page); const input = choice(page);
  await input.fill('p'); await expect((await popup(page, input)).getByRole('option')).toHaveText(['Empty string', 'Disabled option', 'Apple', 'Apricot']);
  await page.getByLabel('Prefix filter', { exact: true }).check(); await input.fill('p'); await expect((await popup(page, input)).getByRole('option')).toHaveCount(0);
  await page.getByLabel('Require two query characters', { exact: true }).check(); await input.fill('a'); await expect(await popup(page, input)).toHaveText(/No matching choices/); await expect(input).not.toHaveAttribute('aria-activedescendant');
  await input.fill('ap'); await expect((await popup(page, input)).getByRole('option')).toHaveText(['Apple', 'Apricot']);
});

test('T12.4 explicit selection preserves numeric/string zero, empty business value and unchanged channel omission', async ({ page }) => {
  await visit(page); const input = choice(page);
  await choose(page, input, 'String zero'); await expect(input).toHaveValue('String zero'); await expect(page.getByTestId('combobox-value')).toHaveText('string:"0"');
  await choose(page, input, 'Empty string'); await expect(page.getByTestId('combobox-value')).toHaveText('string:""');
  await choose(page, input, 'Zero'); await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
  await input.fill(''); await input.press('ArrowDown'); await page.getByRole('button', { name: 'Clear combobox events', exact: true }).evaluate(node => (node as HTMLButtonElement).click());
  await (await popup(page, input)).getByRole('option', { name: 'Zero', exact: true }).click();
  await expect(page.getByTestId('combobox-events')).not.toContainText('value:');
});

test('T12.5 all rejected channels preserve actual query/value/open and request ordering', async ({ page }) => {
  await visit(page); const input = choice(page);
  await page.getByLabel('Accept combobox value', { exact: true }).uncheck(); await page.getByLabel('Accept combobox query', { exact: true }).uncheck(); await page.getByLabel('Accept combobox open', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Force open combobox', exact: true }).click();
  await page.getByRole('button', { name: 'Clear combobox events', exact: true }).evaluate(node => (node as HTMLButtonElement).click());
  await (await popup(page, input)).getByRole('option', { name: 'Apple', exact: true }).click();
  await expect(page.getByTestId('combobox-events')).toHaveText('query:"Apple"|query-change:option:"Apple"|value:"apple"|change:option:"apple"|open:false|open-change:option:false');
  await expect(input).toHaveValue(''); await expect(input).toHaveAttribute('aria-expanded', 'true'); await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
  await expect((await popup(page, input)).getByRole('option', { name: 'Zero', exact: true })).toHaveAttribute('aria-selected', 'true');
  await input.press('Escape'); await expect(page.getByTestId('combobox-events')).toContainText('open-change:escape:false');
});

test('T12.5 accepted value with rejected query/open updates selection only without duplicate external-sync', async ({ page }) => {
  await visit(page); const input = choice(page);
  await page.getByLabel('Accept combobox query', { exact: true }).uncheck(); await page.getByLabel('Accept combobox open', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Force open combobox', exact: true }).click(); await page.getByRole('button', { name: 'Clear combobox events', exact: true }).evaluate(node => (node as HTMLButtonElement).click());
  await (await popup(page, input)).getByRole('option', { name: 'Apple', exact: true }).click();
  await expect(page.getByTestId('combobox-value')).toHaveText('string:"apple"'); await expect(input).toHaveValue(''); await expect(input).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('combobox-events')).not.toContainText('external-sync');
  await expect((await popup(page, input)).getByRole('option', { name: 'Apple', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('T12.6 external values/options synchronize query without reverse value changes', async ({ page }) => {
  await visit(page); const input = choice(page); await input.fill('unfinished');
  await page.getByRole('button', { name: 'Clear combobox events', exact: true }).click(); await page.getByRole('button', { name: 'Set combobox banana', exact: true }).click();
  await expect(input).toHaveValue('Banana'); await expect(page.getByTestId('combobox-events')).toContainText('query-change:external-sync:"Banana"'); await expect(page.getByTestId('combobox-events')).not.toContainText('|value:');
  await page.getByRole('button', { name: 'Set combobox zero', exact: true }).click(); await expect(input).toHaveValue('Zero');
  await page.getByRole('button', { name: 'Toggle combobox zero option', exact: true }).click(); await expect(input).toHaveValue(''); await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
  await page.getByRole('button', { name: 'Toggle combobox zero option', exact: true }).click(); await expect(input).toHaveValue('Zero');
});

test('T12.7 Escape, Tab and logical blur restore confirmed text without committing drafts', async ({ page }) => {
  await visit(page); const input = choice(page);
  await input.fill('ap'); await input.press('ArrowDown'); await input.press('Escape'); await expect(input).toHaveValue('Zero'); await expect(input).toHaveAttribute('aria-expanded', 'false');
  await input.fill('ap'); await input.press('Tab'); await expect(input).toHaveValue('Zero'); await expect(input).not.toBeFocused();
  await input.fill('banana'); await page.getByRole('textbox', { name: 'After combobox', exact: true }).focus(); await expect(input).toHaveValue('Zero'); await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
});

test('T12.7 clear requests query, value and close in order', async ({ page }) => {
  await visit(page); const input = choice(page); await input.fill('draft');
  await page.getByRole('button', { name: 'Clear combobox events', exact: true }).evaluate(node => (node as HTMLButtonElement).click());
  await page.getByRole('button', { name: 'Clear searchable choice', exact: true }).click();
  await expect(input).toHaveValue(''); await expect(page.getByTestId('combobox-value')).toHaveText('object:null');
  await expect(page.getByTestId('combobox-events')).toContainText('query:""|query-change:clear:""|value:null|change:clear:null|open:false|open-change:clear:false');
});

test('T12.8 composition draft is isolated and compositionend plus trailing input commit once', async ({ page }) => {
  await visit(page); const input = choice(page); await input.focus();
  await page.getByRole('button', { name: 'Clear combobox events', exact: true }).evaluate(node => (node as HTMLButtonElement).click());
  await input.dispatchEvent('compositionstart', { data: '' });
  await input.evaluate(node => { (node as HTMLInputElement).value = '中文'; node.dispatchEvent(new InputEvent('input', { data: '中文', inputType: 'insertCompositionText', isComposing: true, bubbles: true })); });
  await expect(input).toHaveValue('中文'); await expect(page.getByTestId('combobox-query')).toHaveText('""');
  await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true }); await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
  await input.dispatchEvent('compositionend', { data: '中文' }); await input.dispatchEvent('input', { data: '中文', inputType: 'insertText' });
  await expect(page.getByTestId('combobox-query')).toHaveText('"中文"');
  await expect(page.getByTestId('combobox-events')).toHaveText('query:"中文"|query-change:input:"中文"|open:true|open-change:input:true');
  await expect((await popup(page, input)).getByRole('option')).toHaveText(['中文选择']);
});

test('T12.9 Escape and external null invalidate stale composition generations', async ({ page }) => {
  await visit(page); const input = choice(page);
  for (const invalidate of ['escape', 'external'] as const) {
    await input.focus(); await input.dispatchEvent('compositionstart', { data: '' });
    await input.evaluate(node => { (node as HTMLInputElement).value = '过期'; node.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true })); });
    if (invalidate === 'escape') await input.press('Escape'); else await page.getByRole('button', { name: 'Set combobox null', exact: true }).evaluate(node => (node as HTMLButtonElement).click());
    await input.dispatchEvent('compositionend', { data: '过期' }); await input.dispatchEvent('input', { data: '过期' });
    await expect(input).toHaveValue(invalidate === 'escape' ? 'Zero' : ''); await expect(page.getByTestId('combobox-query')).not.toHaveText('"过期"');
  }
});

test('T12.10 native caret, selection, deletion and paste remain input operations', async ({ page }) => {
  await visit(page); const input = choice(page); await input.fill('Apple');
  await input.press('Home'); expect(await input.evaluate(node => (node as HTMLInputElement).selectionStart)).toBe(0);
  await input.press('ArrowRight'); expect(await input.evaluate(node => (node as HTMLInputElement).selectionStart)).toBe(1);
  await input.press('End'); expect(await input.evaluate(node => (node as HTMLInputElement).selectionStart)).toBe(5);
  await input.press('Shift+ArrowLeft'); expect(await input.evaluate(node => [(node as HTMLInputElement).selectionStart, (node as HTMLInputElement).selectionEnd])).toEqual([4, 5]);
  await input.press('Backspace'); await expect(input).toHaveValue('Appl');
  await input.press('ControlOrMeta+a'); await input.press('Backspace'); await expect(input).toHaveValue('');
  await input.evaluate(node => { const inputNode = node as HTMLInputElement; const transfer = new DataTransfer(); transfer.setData('text/plain', 'Banana'); inputNode.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true })); inputNode.setRangeText('Banana', 0, inputNode.value.length, 'end'); inputNode.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste', data: 'Banana', bubbles: true })); });
  await expect(page.getByTestId('combobox-query')).toHaveText('"Banana"'); await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
});

test('T12.11 disabled, readonly, loading and native fieldset cannot edit or clear', async ({ page }) => {
  await visit(page); const input = choice(page);
  await page.getByLabel('Readonly combobox', { exact: true }).check(); await input.focus(); await expect(input).toBeFocused(); await expect(input).not.toBeEditable(); await input.press('ArrowDown'); await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Clear searchable choice', exact: true })).toHaveCount(0);
  await page.getByLabel('Readonly combobox', { exact: true }).uncheck(); await page.getByLabel('Loading combobox', { exact: true }).check(); await input.focus(); await expect(input).toBeFocused(); await expect(input).toHaveAttribute('aria-busy', 'true'); await input.press('ArrowDown'); await expect(input).toHaveAttribute('aria-expanded', 'false');
  await page.getByLabel('Loading combobox', { exact: true }).uncheck(); await page.getByLabel('Disable combobox', { exact: true }).check(); await expect(input).toBeDisabled();
  const fieldset = page.getByRole('combobox', { name: 'Fieldset combobox', exact: true }); await expect(fieldset).toBeDisabled(); await page.getByLabel('Disable combobox fieldset', { exact: true }).uncheck(); await expect(fieldset).toBeEnabled();
});

test('T12.12 empty result Enter and composition Enter block accidental form submit', async ({ page }) => {
  await visit(page); const input = page.getByRole('combobox', { name: 'Required searchable choice', exact: true });
  await choose(page, input, 'Numeric zero'); await input.fill('no results'); await input.press('Enter'); await expect(page.getByTestId('combobox-submit-count')).toHaveText('0'); await expect(input).toHaveValue('no results');
  await input.dispatchEvent('compositionstart', { data: '' });
  expect(await input.evaluate(node => !node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })))).toBe(true);
  await expect(page.getByTestId('combobox-submit-count')).toHaveText('0'); await input.dispatchEvent('compositionend', { data: '' });
  await page.getByRole('button', { name: 'Submit combobox form', exact: true }).click(); await expect(page.getByTestId('combobox-form-data')).toHaveText('[["choice","0"],["external","0"]]');
});

test('T12.12 real required validation, empty/zero values and query-free FormData', async ({ page }) => {
  await visit(page); const input = page.getByRole('combobox', { name: 'Required searchable choice', exact: true }); const submit = page.getByRole('button', { name: 'Submit combobox form', exact: true });
  await submit.click(); await expect(page.getByTestId('combobox-submit-count')).toHaveText('0'); await expect(input).toBeFocused(); await expect(input).toHaveAttribute('aria-invalid', 'true');
  await choose(page, input, 'Empty business value'); await submit.click(); await expect(page.getByTestId('combobox-form-data')).toHaveText('[["choice",""],["external","0"]]');
  await choose(page, input, 'Numeric zero'); await input.fill('draft'); await submit.click(); await expect(page.getByTestId('combobox-form-data')).toHaveText('[["choice","0"],["external","0"]]');
  await page.getByRole('button', { name: 'Set unknown searchable form value', exact: true }).click(); await submit.click(); await expect(page.getByTestId('combobox-submit-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Set disabled searchable form value', exact: true }).click(); await submit.click(); await expect(page.getByTestId('combobox-form-data')).toHaveText('[["choice","disabled"],["external","0"]]');
  await page.getByLabel('Disable required combobox', { exact: true }).check(); await submit.click(); await expect(page.getByTestId('combobox-form-data')).toHaveText('[["external","0"]]');
});

test('T12.7/T12.12 reset cancellation, accepted reset and parent defaults remain synchronized', async ({ page }) => {
  await visit(page); const input = page.getByRole('combobox', { name: 'Required searchable choice', exact: true }); const reset = page.getByRole('button', { name: 'Reset combobox form', exact: true });
  await choose(page, input, 'Blue choice'); await input.fill('draft'); await page.getByLabel('Cancel combobox reset', { exact: true }).check(); await reset.click(); await expect(page.getByTestId('combobox-form-value')).toHaveText('"blue"'); await expect(page.getByTestId('combobox-form-requests')).toHaveText('1');
  await page.getByLabel('Cancel combobox reset', { exact: true }).uncheck(); await reset.click(); await expect(input).toHaveValue(''); await expect(page.getByTestId('combobox-form-value')).toHaveText('null'); await expect(page.getByTestId('combobox-form-requests')).toHaveText('2');
  await choose(page, input, 'Numeric zero'); await page.getByLabel('Restore combobox default', { exact: true }).check(); await reset.click(); await expect(input).toHaveValue('Blue choice');
});

test('T12.12 external form owner rebind and readonly/loading validation follow native ownership', async ({ page }) => {
  await visit(page); const submit = page.getByRole('button', { name: 'Submit combobox form', exact: true });
  await page.getByLabel('Readonly required combobox', { exact: true }).check(); await submit.click(); await expect(page.getByTestId('combobox-submit-count')).toHaveText('1');
  await page.getByLabel('Readonly required combobox', { exact: true }).uncheck(); await page.getByLabel('Loading required combobox', { exact: true }).check(); await submit.click(); await expect(page.getByTestId('combobox-submit-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Set searchable form zero', exact: true }).click(); await page.getByRole('button', { name: 'Move combobox form owner', exact: true }).click();
  await page.getByRole('button', { name: 'Submit alternative combobox form', exact: true }).click(); await expect(page.getByTestId('combobox-form-data')).toHaveText('[["external","0"]]');
  await submit.click(); await expect(page.getByTestId('combobox-form-data')).toHaveText('[["choice","0"]]');
});

test('T12.13 ARIA highlights only real filtered options and survives reorder/removal', async ({ page }) => {
  await visit(page); const input = choice(page); await input.fill('ap'); await input.press('ArrowDown'); await expect(await active(page, input)).toHaveText('Apple');
  await input.press('ArrowDown'); await expect(await active(page, input)).toHaveText('Apricot'); await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
  await input.fill('unmatched'); await expect(input).not.toHaveAttribute('aria-activedescendant');
  await input.fill(''); await input.press('ArrowDown'); const list = await popup(page, input); const id = await list.getByRole('option', { name: 'Zero', exact: true }).getAttribute('id');
  await page.getByRole('button', { name: 'Reverse combobox options', exact: true }).evaluate(node => (node as HTMLButtonElement).click()); await expect(list.getByRole('option', { name: 'Zero', exact: true })).toHaveAttribute('id', id!);
  await page.getByRole('button', { name: 'Toggle combobox zero disabled', exact: true }).evaluate(node => (node as HTMLButtonElement).click());
  const activeId = await input.getAttribute('aria-activedescendant'); if (activeId) await expect(page.locator(`[id="${activeId}"]`)).not.toHaveAttribute('aria-disabled', 'true');
  await input.press('Escape'); await expect(input).not.toHaveAttribute('aria-controls'); await expect(input).not.toHaveAttribute('aria-activedescendant');
});

test('T12.13 attrs, slots, refs and multiple instances preserve names and independent state', async ({ page }) => {
  await visit(page); const input = choice(page); await expect(input).toHaveAttribute('title', 'Editable choice input'); await expect(input).toHaveAttribute('aria-describedby', 'combobox-description'); await expect(input).toHaveAccessibleName('Choose searchable value');
  await page.getByRole('button', { name: 'Focus combobox', exact: true }).click(); await expect(input).toBeFocused(); await page.getByRole('button', { name: 'Blur combobox', exact: true }).click(); await expect(input).not.toBeFocused();
  await choose(page, page.getByRole('combobox', { name: 'Independent combobox', exact: true }), 'Apple'); await expect(page.getByTestId('independent-combobox-value')).toHaveText('"apple"'); await expect(page.getByTestId('combobox-value')).toHaveText('number:0');
  const slot = page.getByRole('combobox', { name: 'Slot combobox', exact: true }); await slot.fill('ap'); await expect((await popup(page, slot)).getByRole('option')).toHaveText(['Apple · custom', 'Apricot · custom']);
  const ids = await page.locator('[role="combobox"][id]').evaluateAll(nodes => nodes.map(node => node.id)); expect(new Set(ids).size).toBe(ids.length);
  await page.getByRole('button', { name: 'Toggle combobox state slots', exact: true }).click(); await expect(page.getByTestId('combobox-empty-slot')).toHaveText('Custom empty content'); await expect(page.getByTestId('combobox-loading-slot')).toHaveText('Fetching choices');
});

test('T12.1 unbound value stays null while internal query accepts editing and choice requests', async ({ page }) => {
  await visit(page); const input = page.getByRole('combobox', { name: 'Unbound combobox', exact: true }); await input.fill('ap'); await input.press('ArrowDown'); await input.press('Enter'); await expect(input).toHaveValue('Apple'); await expect(input).toHaveAttribute('aria-expanded', 'false');
  await input.fill(''); await input.press('ArrowDown'); await expect((await popup(page, input)).getByRole('option', { selected: true })).toHaveCount(0);
});

test('T12.9 native reset invalidates composition without a stale end event restoring its text', async ({ page }) => {
  await visit(page); const input = page.getByRole('combobox', { name: 'Required searchable choice', exact: true }); await choose(page, input, 'Numeric zero');
  await input.dispatchEvent('compositionstart', { data: '' }); await input.evaluate(node => { (node as HTMLInputElement).value = '过期'; node.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true })); });
  await page.locator('#combobox-form').evaluate(node => (node as HTMLFormElement).reset()); await expect(page.getByTestId('combobox-form-value')).toHaveText('null');
  await input.dispatchEvent('compositionend', { data: '过期' }); await input.dispatchEvent('input', { data: '过期' }); await expect(input).toHaveValue('');
});

test('T12.11 touch confirmation requests a value exactly once', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, hasTouch: true });
  try {
    const page = await context.newPage(); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const scope = window as unknown as { __zoomTouchEvents: { type: string; target: string | null; prevented: boolean }[] };
      scope.__zoomTouchEvents = [];
      for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click', 'focusin', 'focusout']) {
        document.addEventListener(type, event => { const target = event.target as Element; scope.__zoomTouchEvents.push({ type, target: target.getAttribute('aria-label') ?? target.getAttribute('role') ?? target.tagName, prevented: event.defaultPrevented }); });
      }
    });
    await visit(page); const input = choice(page);
    await input.fill('ap'); await input.tap(); await (await popup(page, input)).getByRole('option', { name: 'Apple', exact: true }).tap();
    await testInfo.attach('touch-dom-events', { body: JSON.stringify(await page.evaluate(() => (window as unknown as { __zoomTouchEvents: unknown[] }).__zoomTouchEvents)), contentType: 'application/json' });
    await expect(page.getByTestId('combobox-value')).toHaveText('string:"apple"');
    const log = await page.getByTestId('combobox-events').textContent(); expect(log?.match(/change:option:"apple"/g)).toHaveLength(1); expect(errors).toEqual([]);
  } finally { await context.close(); }
});

test('T12.14 sizes, density, RTL, font overrides and native host styling remain isolated', async ({ page }) => {
  await visit(page);
  for (const [density, minima] of [['regular', [28, 36, 44]], ['compact', [24, 28, 36]]] as const) for (const [index, size] of ['sm', 'md', 'lg'].entries()) {
    const input = page.getByRole('combobox', { name: `${density} ${size} combobox`, exact: true }); await expect(input).toHaveCSS('min-block-size', `${minima[index]}px`); await expect(input).toHaveCSS('font-size', `${[12, 14, 16][index]}px`);
  }
  await expect(page.getByRole('combobox', { name: 'RTL combobox', exact: true })).toHaveCSS('direction', 'rtl'); const large = page.getByRole('combobox', { name: 'Large text combobox', exact: true }); await expect(large).toHaveCSS('font-family', 'monospace'); await expect(large).toHaveCSS('font-size', '28px'); await expect(large).toHaveCSS('line-height', '56px');
  await expect(page.getByRole('button', { name: 'Native combobox host control', exact: true })).toHaveCSS('border-radius', '0px');
});

test('T12.14/T12.15 portal theme updates preserve editing focus and unmount clears nodes', async ({ page }) => {
  await visit(page); const input = page.getByRole('combobox', { name: 'Themed portal combobox', exact: true }); await input.press('ArrowDown'); const list = await popup(page, input);
  await expect(page.locator('#combobox-themed-host').getByRole('listbox')).toHaveCount(1); await expect(input).toBeFocused(); await expect(list).toHaveCSS('font-family', 'monospace'); await expect(list).toHaveCSS('background-color', 'rgb(250, 245, 255)');
  await page.getByRole('button', { name: 'Change combobox theme', exact: true }).click(); await input.press('ArrowDown'); await expect(await popup(page, input)).toHaveCSS('background-color', 'rgb(240, 253, 250)'); await expect(input).toHaveCSS('background-color', 'rgb(240, 253, 250)');
  await page.getByRole('button', { name: 'Toggle portal combobox', exact: true }).click(); await expect(input).toHaveCount(0); await expect(page.locator('#combobox-themed-host').getByRole('listbox')).toHaveCount(0);
  expect(await page.evaluate(() => ({ inert: document.querySelectorAll('[inert]').length, overflow: document.body.style.overflow }))).toEqual({ inert: 0, overflow: '' });
});

test('T12.14 SSR query/value/open are request-local, hydrate original nodes and move portal afterwards', async ({ page, request }) => {
  const initial = '/ssr?example=combobox&brand=purple&value=blue&query=Bl'; const closed = await request.get(initial); const html = await closed.text(); expect(closed.ok()).toBe(true); expect(html).toContain('id="ssr-combobox"'); expect(html).toContain('data-combobox-brand="purple"'); expect(html).toContain('value="Bl"');
  const opened = await request.get('/ssr?example=combobox&brand=teal&open=true&query=Ze'); const openHtml = await opened.text(); expect(opened.ok()).toBe(true); expect(openHtml).toContain('data-combobox-brand="teal"'); expect(openHtml).toContain('value="Ze"'); expect(openHtml.split('id="ssr-combobox-popup-host"')[0]).toContain('role="listbox"'); expect(await (await request.get(initial)).text()).toBe(html);
  const warnings: string[] = []; page.on('console', message => { if (/hydration|mismatch/i.test(message.text())) warnings.push(message.text()); });
  for (const opened of [false, true]) {
    await page.goto(`/ssr?example=combobox&brand=purple&open=${opened}&query=Ze`); await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
    expect(await page.evaluate(() => (window as unknown as { __zoomSSRCombobox: Element }).__zoomSSRCombobox === document.getElementById('ssr-combobox'))).toBe(true);
    const input = page.getByRole('combobox', { name: 'SSR combobox', exact: true }); await expect(input).toHaveValue('Ze'); await expect(input).toHaveAttribute('aria-expanded', String(opened));
    if (opened) { await expect(page.locator('#ssr-combobox-popup-host').getByRole('listbox')).toHaveCount(1); expect(await page.evaluate(() => (window as unknown as { __zoomSSRComboboxPopup: Element }).__zoomSSRComboboxPopup === document.querySelector('#ssr-combobox-popup-host [role="listbox"]'))).toBe(true); }
    await page.getByRole('button', { name: 'Toggle SSR combobox', exact: true }).click(); await expect(page.locator('#ssr-combobox-popup-host').getByRole('listbox')).toHaveCount(0);
  }
  expect(warnings).toEqual([]);
});

test('T12.15 unmount during composition invalidates drafts and independent remount has clean state', async ({ page }) => {
  await visit(page); const input = choice(page); await input.dispatchEvent('compositionstart', { data: '' }); await input.evaluate(node => (node as HTMLInputElement).value = 'stale');
  await page.getByRole('button', { name: 'Toggle editable combobox', exact: true }).click(); await expect(input).toHaveCount(0); await page.getByRole('button', { name: 'Toggle editable combobox', exact: true }).click(); await expect(input).toHaveValue('');
  await input.fill('ap'); await expect((await popup(page, input)).getByRole('option')).toHaveCount(2);
});

test('T12.15 public subpath import failure stays in the readiness gate', async ({ page, packageImports, runtimeErrors }) => {
  runtimeErrors.allowPageError(/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i);
  runtimeErrors.allowConsoleError(/Failed to load resource|net::ERR_FAILED|blocked|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically imported module/i);
  expect(packageImports.vueCombobox).toBeTruthy(); await page.route(packageImports.vueCombobox!, route => route.abort('failed')); await page.goto('/combobox'); await expect(page.getByRole('status', { name: 'Package readiness', exact: true })).toHaveText('Package imports failed'); await expect(page.getByRole('heading', { name: 'Combobox playground', exact: true })).toHaveCount(0);
});
