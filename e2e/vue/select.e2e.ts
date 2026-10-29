import { test, expect } from '../fixtures.js';
import type { Locator, Page } from '@playwright/test';

async function visit(page: Page) {
  await page.goto('/select');
  await expect(page.getByRole('heading', { name: 'Select playground' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Package readiness', exact: true })).toHaveText('Vue package imports ready');
}
function choice(page: Page) { return page.getByRole('combobox', { name: 'Choose value', exact: true }); }
async function popup(page: Page, trigger: Locator) {
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const id = await trigger.getAttribute('aria-controls'); expect(id).toBeTruthy();
  return page.locator(`[id="${id}"]`);
}
async function highlighted(page: Page, trigger: Locator) {
  const id = await trigger.getAttribute('aria-activedescendant'); expect(id).toBeTruthy();
  return page.locator(`[id="${id}"]`);
}
async function choose(page: Page, trigger: Locator, label: string) {
  await trigger.click(); await (await popup(page, trigger)).getByRole('option', { name: label, exact: true }).click();
}
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

test('T11.1/T11.2/T11.8 public Select preserves numeric, string, empty and null values', async ({ page, assetEvidence }) => {
  await visit(page); const trigger = choice(page);
  await expect(trigger).toHaveText(/Zero/); await expect(trigger).toHaveAccessibleName('Choose value');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false'); await expect(trigger).not.toHaveAttribute('aria-controls'); await expect(trigger).not.toHaveAttribute('aria-activedescendant');
  await choose(page, trigger, 'String zero'); await expect(page.getByTestId('choice-value')).toHaveText('string:"0"');
  await choose(page, trigger, 'Empty string'); await expect(page.getByTestId('choice-value')).toHaveText('string:""');
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click(); await expect(page.getByTestId('choice-value')).toHaveText('object:null'); await expect(trigger).toHaveText(/Choose an option/);
  await page.getByRole('button', { name: 'Set numeric zero', exact: true }).click(); await expect(trigger).toHaveText(/Zero/);
  await page.getByRole('button', { name: 'Clear event log' }).click(); await page.getByRole('button', { name: 'Set unknown value', exact: true }).click();
  await expect(trigger).toHaveText(/Choose an option/); await expect(page.getByTestId('selection-events')).toHaveText(''); await assetEvidence();
});

test('T11.3 options removal and reappearance preserve confirmed value; reorder preserves option identity', async ({ page }) => {
  await visit(page); const trigger = choice(page);
  await page.getByRole('button', { name: 'Toggle zero option', exact: true }).click(); await expect(trigger).toHaveText(/Choose an option/); await expect(page.getByTestId('choice-value')).toHaveText('number:0');
  await page.getByRole('button', { name: 'Toggle zero option', exact: true }).click(); await expect(trigger).toHaveText(/Zero/);
  await trigger.press('Enter'); const originalId = await (await popup(page, trigger)).getByRole('option', { name: 'Zero', exact: true }).getAttribute('id');
  await page.getByRole('button', { name: 'Reverse options', exact: true }).click(); await trigger.press('Enter');
  await expect((await popup(page, trigger)).getByRole('option', { name: 'Zero', exact: true })).toHaveAttribute('id', originalId!);
  await page.getByRole('button', { name: 'Toggle zero disabled', exact: true }).click(); await trigger.press('Enter');
  await expect((await popup(page, trigger)).getByRole('option', { name: 'Zero', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await expect(await highlighted(page, trigger)).not.toHaveText('Zero'); await expect(trigger).toHaveText(/Zero/);
});

test('T11.1/T11.8 unbound model requests keep null, empty and all-disabled lists have no active descendant', async ({ page }) => {
  await visit(page); const unbound = page.getByRole('combobox', { name: 'Unbound select', exact: true }); await choose(page, unbound, 'Apple'); await expect(unbound).toHaveText(/No accepted value/); await expect(page.getByTestId('unbound-requests')).toHaveText('1');
  const empty = page.getByRole('combobox', { name: 'Empty select', exact: true }); await empty.press('ArrowDown'); await expect(await popup(page, empty)).toHaveText(/Nothing available/); await expect(empty).not.toHaveAttribute('aria-activedescendant');
  await empty.press('Escape'); const allDisabled = page.getByRole('combobox', { name: 'All disabled select', exact: true }); await allDisabled.press('ArrowUp'); await expect(allDisabled).not.toHaveAttribute('aria-activedescendant'); await expect((await popup(page, allDisabled)).getByRole('option')).toHaveAttribute('aria-disabled', 'true');
});

test('T11.4 rejected value/open requests keep actual selection, ARIA and outside listeners', async ({ page }) => {
  await visit(page); await page.getByLabel('Accept value requests').uncheck(); await page.getByLabel('Accept open requests').uncheck();
  await page.getByRole('button', { name: 'Force open selection' }).click(); const trigger = choice(page); const list = await popup(page, trigger);
  await page.getByRole('button', { name: 'Clear event log' }).click();
  await list.getByRole('option', { name: 'Apple', exact: true }).click();
  await expect(page.getByTestId('selection-events')).toHaveText('value:"apple"|change:option:"apple"|open:false|open-change:option:false');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true'); await expect(trigger).toHaveText(/Zero/);
  await expect(list.getByRole('option', { name: 'Zero', exact: true })).toHaveAttribute('aria-selected', 'true');
  await trigger.press('Escape'); await expect(page.getByTestId('selection-events')).toContainText('open-change:escape:false');
  await page.getByRole('heading', { name: 'Select playground' }).click(); await expect(page.getByTestId('selection-events')).toContainText('open-change:outside:false');
});

test('T11.5 navigation separates highlight from selection and skips disabled options', async ({ page }) => {
  await visit(page); const trigger = choice(page); await trigger.press('ArrowDown');
  await expect(await highlighted(page, trigger)).toHaveText('Zero'); await trigger.press('ArrowDown'); await expect(await highlighted(page, trigger)).toHaveText('String zero');
  await trigger.press('ArrowDown'); await trigger.press('ArrowDown'); await expect(await highlighted(page, trigger)).toHaveText('Apple');
  await expect((await popup(page, trigger)).getByRole('option', { name: 'Zero', exact: true })).toHaveAttribute('aria-selected', 'true'); await expect(page.getByTestId('choice-value')).toHaveText('number:0');
  await trigger.press('End'); await expect(await highlighted(page, trigger)).toHaveText('Banana'); await trigger.press('ArrowDown'); await expect(await highlighted(page, trigger)).toHaveText('Banana');
  await trigger.press('Home'); await expect(await highlighted(page, trigger)).toHaveText('Zero'); await trigger.press('Space'); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.getByLabel('Loop navigation').check(); await trigger.press('Space'); await trigger.press('Home'); await trigger.press('ArrowUp'); await expect(await highlighted(page, trigger)).toHaveText('Banana');
  await trigger.press('Enter'); await expect(page.getByTestId('choice-value')).toHaveText('string:"banana"');
});

test('T11.5 typeahead repeats and composition/modifier keys do not submit', async ({ page }) => {
  await visit(page); const trigger = choice(page); await trigger.press('Enter'); await trigger.press('a'); await expect(await highlighted(page, trigger)).toHaveText('Apple');
  await trigger.press('a'); await expect(await highlighted(page, trigger)).toHaveText('Apricot');
  await trigger.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true });
  await expect(trigger).toHaveAttribute('aria-expanded', 'true'); await expect(page.getByTestId('choice-value')).toHaveText('number:0');
  await trigger.press('Control+a'); await expect(page.getByTestId('choice-value')).toHaveText('number:0');
});

test('T11.6 Escape, outside and native Tab cancel highlight without submitting', async ({ page }) => {
  await visit(page); const trigger = choice(page);
  for (const action of ['Escape', 'Tab', 'outside']) {
    await trigger.press('Enter'); await trigger.press('End');
    if (action === 'outside') await page.getByRole('heading', { name: 'Select playground' }).click(); else await trigger.press(action);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false'); await expect(trigger).not.toHaveAttribute('aria-activedescendant'); await expect(page.getByTestId('choice-value')).toHaveText('number:0');
    if (action === 'Tab') await expect(page.getByRole('button', { name: 'Clear selection', exact: true })).toBeFocused();
  }
});

test('T11.7 disabled, readonly, loading and native fieldset have distinct focus behavior', async ({ page }) => {
  await visit(page); const trigger = choice(page);
  await page.getByLabel('Readonly selection', { exact: true }).check(); await trigger.focus(); await expect(trigger).toBeFocused(); await trigger.press('Enter'); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Clear selection', exact: true })).toHaveCount(0);
  await page.getByLabel('Readonly selection', { exact: true }).uncheck(); await page.getByLabel('Loading selection', { exact: true }).check();
  await expect(trigger).toHaveAttribute('aria-busy', 'true'); await trigger.focus(); await expect(trigger).toBeFocused(); await trigger.press('ArrowDown'); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.getByLabel('Loading selection', { exact: true }).uncheck(); await page.getByLabel('Disable selection', { exact: true }).check(); await expect(trigger).toBeDisabled();
  const inherited = page.getByRole('combobox', { name: 'Fieldset select', exact: true }); await expect(inherited).toBeDisabled();
  await page.getByLabel('Disable fieldset', { exact: true }).uncheck(); await expect(inherited).toBeEnabled(); await inherited.press('Enter'); await expect(inherited).toHaveAttribute('aria-expanded', 'true');
});

test('T11.8/T11.9 attrs, slots, focus and independent instances use actual interactive nodes', async ({ page }) => {
  await visit(page); const trigger = choice(page); await expect(trigger).toHaveAttribute('title', 'Original trigger title'); await expect(trigger).toHaveAttribute('aria-describedby', 'choice-description');
  await page.getByRole('button', { name: 'Update trigger attrs' }).click(); await expect(trigger).toHaveAttribute('title', 'Updated trigger title'); await expect(trigger).toHaveAccessibleName('Choose value');
  await page.getByRole('button', { name: 'Focus selection', exact: true }).click(); await expect(trigger).toBeFocused(); await page.getByRole('button', { name: 'Blur selection', exact: true }).click(); await expect(trigger).not.toBeFocused();
  expect(await page.getByRole('button', { name: 'Clear selection', exact: true }).evaluate(node => node.parentElement?.closest('button'))).toBeNull();
  const independent = page.getByRole('combobox', { name: 'Independent select', exact: true }); await choose(page, independent, 'Apple'); await expect(page.getByTestId('independent-value')).toHaveText('"apple"'); await expect(page.getByTestId('choice-value')).toHaveText('number:0');
  await expect(page.getByTestId('value-slot')).toHaveText('Selected Zero'); const slot = page.getByRole('combobox', { name: 'Slot select', exact: true }); await slot.click(); await expect((await popup(page, slot)).getByRole('option', { name: 'Zero · custom', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Toggle state slots' }).click(); await expect(page.getByTestId('empty-slot')).toHaveText('Custom empty content'); await expect(page.getByTestId('loading-slot')).toHaveText('Fetching choices');
});

test('T11.10 real required validation, empty/zero FormData, unknown and disabled selected values', async ({ page }) => {
  await visit(page); const trigger = page.getByRole('combobox', { name: 'Required choice', exact: true }); const submit = page.getByRole('button', { name: 'Submit selection form', exact: true });
  await submit.click(); await expect(page.getByTestId('selection-submit-count')).toHaveText('0'); await expect(trigger).toBeFocused();
  await choose(page, trigger, 'Empty business value'); await submit.click(); await expect(page.getByTestId('selection-form-data')).toHaveText('[["choice",""],["external","0"]]');
  await choose(page, trigger, 'Numeric zero'); await submit.click(); await expect(page.getByTestId('selection-form-data')).toHaveText('[["choice","0"],["external","0"]]');
  await page.getByRole('button', { name: 'Set unknown form value', exact: true }).click(); await submit.click(); await expect(page.getByTestId('selection-submit-count')).toHaveText('2');
  await page.getByRole('button', { name: 'Set disabled form value', exact: true }).click(); await submit.click(); await expect(page.getByTestId('selection-form-data')).toHaveText('[["choice","disabled"],["external","0"]]');
  await page.getByLabel('Disable required choice', { exact: true }).check(); await submit.click(); await expect(page.getByTestId('selection-form-data')).toHaveText('[["external","0"]]');
});

test('T11.10 readonly submits but bypasses required; loading keeps required and confirmed submission', async ({ page }) => {
  await visit(page); const submit = page.getByRole('button', { name: 'Submit selection form', exact: true });
  await page.getByLabel('Readonly required choice', { exact: true }).check(); await submit.click(); await expect(page.getByTestId('selection-submit-count')).toHaveText('1');
  await page.getByLabel('Readonly required choice', { exact: true }).uncheck(); await page.getByLabel('Loading required choice', { exact: true }).check(); await submit.click(); await expect(page.getByTestId('selection-submit-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Set disabled form value', exact: true }).click(); await submit.click(); await expect(page.getByTestId('selection-form-data')).toHaveText('[["choice","disabled"],["external","0"]]');
});

test('T11.10/T11.11 form owner rebind, reset cancellation and parent-owned defaults', async ({ page }) => {
  await visit(page); const trigger = page.getByRole('combobox', { name: 'Required choice', exact: true }); await choose(page, trigger, 'Blue choice');
  await page.getByLabel('Cancel form reset', { exact: true }).check(); await page.getByRole('button', { name: 'Reset selection form', exact: true }).click(); await expect(page.getByTestId('form-value')).toHaveText('"blue"'); await expect(page.getByTestId('form-requests')).toHaveText('1');
  await page.getByLabel('Cancel form reset', { exact: true }).uncheck(); await page.getByRole('button', { name: 'Reset selection form', exact: true }).click(); await expect(page.getByTestId('form-value')).toHaveText('null'); await expect(page.getByTestId('form-requests')).toHaveText('2');
  await choose(page, trigger, 'Numeric zero'); await page.getByLabel('Restore application default', { exact: true }).check(); await page.getByRole('button', { name: 'Reset selection form', exact: true }).click(); await expect(trigger).toHaveText(/Blue choice/);
  await page.getByRole('button', { name: 'Move external form owner' }).click(); await page.getByRole('button', { name: 'Submit alternative form', exact: true }).click(); await expect(page.getByTestId('selection-form-data')).toHaveText('[["external","0"]]');
  await page.getByRole('button', { name: 'Submit selection form', exact: true }).click(); await expect(page.getByTestId('selection-form-data')).toHaveText('[["choice","blue"]]');
});

test('T11.12 sizes, density, RTL and long labels follow local theme tokens', async ({ page }) => {
  await visit(page);
  for (const [density, minima] of [['regular', [28, 36, 44]], ['compact', [24, 28, 36]]] as const) {
    for (const [index, size] of ['sm', 'md', 'lg'].entries()) {
      const trigger = page.getByRole('combobox', { name: `${density} ${size} select`, exact: true }); await expect(trigger).toHaveCSS('min-block-size', `${minima[index]}px`); await expect(trigger).toHaveCSS('font-size', `${[12, 14, 16][index]}px`);
    }
  }
  await expect(page.getByRole('combobox', { name: 'RTL select', exact: true })).toHaveCSS('direction', 'rtl');
  const large = page.getByRole('combobox', { name: 'Large label select', exact: true }); await expect(large).toHaveCSS('font-family', 'monospace'); await expect(large).toHaveCSS('font-size', '28px'); await expect(large).toHaveCSS('line-height', '56px');
  const geometry = await large.evaluate(node => ({ client: node.clientHeight, scroll: node.scrollHeight, inline: node.clientWidth, scrollInline: node.scrollWidth })); expect(geometry.scroll).toBeLessThanOrEqual(geometry.client + 1); expect(geometry.scrollInline).toBeLessThanOrEqual(geometry.inline + 1);
  await expect(page.getByRole('button', { name: 'Native host control', exact: true })).toHaveCSS('border-radius', '0px');
});

test('T11.12/T11.15 themed portal follows host, keeps focus and cleans up on unmount', async ({ page }) => {
  await visit(page); const trigger = page.getByRole('combobox', { name: 'Themed portal select', exact: true }); await trigger.click(); const list = await popup(page, trigger);
  await expect(page.locator('#select-themed-host').getByRole('listbox')).toHaveCount(1); await expect(trigger).toBeFocused(); await expect(list).toHaveCSS('font-family', 'monospace'); await expect(trigger).toHaveCSS('background-color', 'rgb(250, 245, 255)'); await expect(list).toHaveCSS('background-color', 'rgb(250, 245, 255)');
  await page.getByRole('button', { name: 'Change select theme' }).click(); await trigger.click(); const themedList = await popup(page, trigger); await expect(trigger).toHaveCSS('background-color', 'rgb(240, 253, 250)'); await expect(themedList).toHaveCSS('background-color', 'rgb(240, 253, 250)');
  await page.getByRole('button', { name: 'Toggle portal select' }).click(); await expect(trigger).toHaveCount(0); await expect(page.locator('#select-themed-host').getByRole('listbox')).toHaveCount(0);
  expect(await page.evaluate(() => ({ inert: document.querySelectorAll('[inert]').length, locked: document.body.style.overflow }))).toEqual({ inert: 0, locked: '' });
  await page.getByRole('button', { name: 'Toggle portal select' }).click(); await page.getByRole('combobox', { name: 'Themed portal select', exact: true }).click(); await expect(page.locator('#select-themed-host').getByRole('listbox')).toHaveCount(1);
});

test('T11.13 SSR closed/open requests remain isolated and hydrate existing trigger/popup nodes', async ({ page, request }) => {
  const closed = await request.get('/ssr?example=select&brand=purple'); const html = await closed.text(); expect(closed.ok()).toBe(true); expect(html).toContain('id="ssr-select"'); expect(html).toContain('data-select-brand="purple"');
  expect(html).toMatch(/id="ssr-select"[^>]*aria-expanded="false"|aria-expanded="false"[^>]*id="ssr-select"/);
  const opened = await request.get('/ssr?example=select&brand=teal&open=true'); const openHtml = await opened.text(); expect(opened.ok()).toBe(true); expect(openHtml).toContain('data-select-brand="teal"'); expect(openHtml).toContain('role="listbox"'); expect(openHtml).toContain('role="option"');
  const [beforeHost] = openHtml.split('id="ssr-popup-host"'); expect(beforeHost).toContain('role="listbox"'); expect(await (await request.get('/ssr?example=select&brand=purple')).text()).toBe(html);
  const warnings: string[] = []; page.on('console', message => { if (/hydration|mismatch/i.test(message.text())) warnings.push(message.text()); });
  for (const initialOpen of [false, true]) {
    await page.goto(`/ssr?example=select&open=${initialOpen}`); await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
    expect(await page.evaluate(() => (window as unknown as { __zoomSSRSelect: Element }).__zoomSSRSelect === document.getElementById('ssr-select'))).toBe(true);
    const trigger = page.getByRole('combobox', { name: 'SSR select', exact: true }); await expect(trigger).toHaveAttribute('aria-expanded', String(initialOpen));
    if (initialOpen) {
      await expect(page.locator('#ssr-popup-host').getByRole('listbox')).toHaveCount(1);
      expect(await page.evaluate(() => (window as unknown as { __zoomSSRSelectPopup: Element }).__zoomSSRSelectPopup === document.getElementById('ssr-select')?.ownerDocument.querySelector('#ssr-popup-host [role="listbox"]'))).toBe(true);
      await trigger.press('Escape'); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
    await trigger.click(); await expect(trigger).toHaveAttribute('aria-expanded', 'true'); await page.getByRole('button', { name: 'Toggle SSR select' }).click(); await expect(page.locator('#ssr-popup-host').getByRole('listbox')).toHaveCount(0);
  }
  expect(warnings).toEqual([]);
});

test('T11.15 component public JS import failure remains inside the readiness gate', async ({ page, packageImports, runtimeErrors }) => {
  runtimeErrors.allowPageError(/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i);
  runtimeErrors.allowConsoleError(/Failed to load resource|net::ERR_FAILED|blocked|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically imported module/i);
  expect(packageImports.vueSelect).toBeTruthy(); await page.route(packageImports.vueSelect!, route => route.abort('failed')); await page.goto('/select'); await expect(page.getByRole('status', { name: 'Package readiness', exact: true })).toHaveText('Package imports failed'); await expect(page.getByRole('heading', { name: 'Select playground' })).toHaveCount(0);
});
