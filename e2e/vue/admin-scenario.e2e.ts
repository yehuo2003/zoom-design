import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures.js';

// Names checked against the rendered /scenarios/admin accessibility tree.
// A rowheader includes both its service title and note.

const recordTitles = ['通用服务咨询', '线上内容服务', '北区专项支持', '通用服务复核'];
const category = (page: Page) => page.getByRole('combobox', { name: '服务分类', exact: true });
const recordChoice = (page: Page) => page.getByRole('combobox', { name: '已有记录', exact: true });
const query = (page: Page) => page.getByRole('button', { name: '查询', exact: true });
const resultRows = (page: Page) => page.getByRole('table', { name: '服务目录' }).locator('tbody tr[data-record-row]');
async function choose(page: Page, trigger: Locator, label: string) {
  await trigger.click();
  await page.getByRole('listbox').getByRole('option', { name: label, exact: true }).click();
}

test('T14.2.1 opens the discoverable admin URL with real public components and independent CSS', async ({ page, request, packageImports, assetEvidence }, testInfo) => {
  const responses: string[] = [];
  page.on('response', response => { if (response.ok()) responses.push(response.url()); });
  await page.goto('/');
  const link = page.getByRole('link', { name: '服务目录管理后台' });
  await expect(link).toBeVisible();
  responses.length = 0;
  const imports = [packageImports.vueButton, packageImports.vueSelect, packageImports.vueCombobox, packageImports.vueDialog].map(url => page.waitForResponse(url));
  await Promise.all([...imports, link.click()]);
  await expect(page.getByRole('heading', { name: '服务目录管理', exact: true })).toBeVisible();
  await expect(resultRows(page)).toHaveCount(6);
  await expect(query(page)).toHaveClass('zoom-button');
  await expect(category(page)).toHaveClass('zoom-select__trigger');
  await expect(recordChoice(page)).toHaveClass('zoom-combobox__trigger');
  if (testInfo.config.metadata.mode === 'workspace') {
    for (const entry of ['theme.css', 'button/style.css', 'select/style.css', 'combobox/style.css', 'dialog/style.css']) {
      expect(responses.some(url => url.includes(`/packages/vue/dist/${entry}`)), entry).toBe(true);
    }
    expect(responses.some(url => /\/dist\/style\.css(?:\?|$)/.test(url))).toBe(false);
  }
  await assetEvidence();
  await testInfo.attach('admin-accessibility', { body: await page.getByRole('main').ariaSnapshot(), contentType: 'text/plain' });
  await testInfo.attach('admin-default', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  const ssr = await request.get('/ssr?example=admin-scenario&category=blank&selectedRecord=blank');
  expect(ssr.ok()).toBe(true);
  const markup = await ssr.text();
  expect(markup).toContain('服务目录管理');
  expect(markup).toContain('data-record-row data-record-type="string" data-record-id=""');
  expect(markup).not.toContain('data-record-row data-record-type="number"');
});

test('T14.2.2 provisional Combobox query never changes the applied result or creates a record', async ({ page }) => {
  await page.goto('/scenarios/admin');
  const input = recordChoice(page);
  await input.fill('未确认的新服务');
  await expect(input).toHaveValue('未确认的新服务');
  await expect(page.getByRole('listbox')).toContainText('没有匹配的记录');
  await expect(resultRows(page)).toHaveCount(6);
  await input.press('Escape');
  await expect(input).toHaveValue('');
  await query(page).click();
  await expect(resultRows(page)).toHaveCount(6);
});

test('T14.2.3 applies the intersection only on query and preserves number-zero/blank selections', async ({ page }) => {
  await page.goto('/scenarios/admin');
  await choose(page, category(page), '通用服务');
  await choose(page, recordChoice(page), recordTitles[0]!);
  await page.getByRole('textbox', { name: '关键词', exact: true }).fill('  基础咨询  ');
  await expect(resultRows(page)).toHaveCount(6);
  await query(page).click();
  await expect(resultRows(page)).toHaveCount(1);
  await expect(resultRows(page).first()).toContainText(recordTitles[0]!);
  await expect(resultRows(page).first()).toHaveAttribute('data-record-type', 'number');
  await page.getByRole('button', { name: '重置筛选' }).click();
  await choose(page, category(page), '内容服务');
  await choose(page, recordChoice(page), recordTitles[1]!);
  await query(page).click();
  await expect(resultRows(page)).toHaveCount(1);
  await expect(resultRows(page).first()).toHaveAttribute('data-record-type', 'string');
  await expect(resultRows(page).first()).toHaveAttribute('data-record-id', '');
});

test('T14.2.4 changing category atomically clears an incompatible confirmed record, query and popup', async ({ page }) => {
  await page.goto('/scenarios/admin?category=general&selectedRecord=zero');
  const input = recordChoice(page);
  await expect(resultRows(page)).toHaveCount(1);
  await expect(input).toHaveValue(recordTitles[0]!);
  await choose(page, category(page), '内容服务');
  await expect(input).toHaveValue('');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await expect(resultRows(page)).toHaveCount(1);
  await expect(resultRows(page)).toContainText(recordTitles[0]!);
  await query(page).click();
  await expect(resultRows(page)).toHaveCount(2);
  await expect(resultRows(page).first()).toContainText(recordTitles[1]!);
  await input.click();
  await expect(page.getByRole('option', { name: recordTitles[0]!, exact: true })).toHaveCount(0);
});

test('T14.2.5 reset restores default draft/applied filters, query and popup immediately', async ({ page }) => {
  await page.goto('/scenarios/admin?category=blank&selectedRecord=blank&keyword=线上');
  await expect(resultRows(page)).toHaveCount(1);
  await recordChoice(page).fill('temporary');
  // Native reset must also be atomic while a popup is open, without a pointer outside-close first.
  await page.getByRole('form', { name: '服务目录筛选' }).evaluate(form => {
    if (!(form instanceof HTMLFormElement)) throw Error('Expected native form');
    form.reset();
  });
  await expect(category(page)).toContainText('全部分类');
  await expect(recordChoice(page)).toHaveValue('');
  await expect(recordChoice(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('textbox', { name: '关键词', exact: true })).toHaveValue('');
  await expect(resultRows(page)).toHaveCount(6);
  await choose(page, category(page), '专项服务');
  await query(page).click();
  await expect(resultRows(page)).toHaveCount(2);
  await page.getByRole('button', { name: '重置筛选' }).click();
  await expect(resultRows(page)).toHaveCount(6);
});

test('T14.2.6 empty data and no matching result keep query/reset reachable with distinct messages', async ({ page }) => {
  await page.goto('/scenarios/admin?empty=true&open=true');
  await expect(page.getByText('暂无服务记录', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await query(page).click();
  await page.getByRole('button', { name: '重置筛选' }).click();
  await expect(query(page)).toBeEnabled();
  await page.goto('/scenarios/admin');
  await page.getByRole('textbox', { name: '关键词', exact: true }).fill('无匹配的关键字');
  await query(page).click();
  await expect(page.getByText('没有符合筛选条件的记录', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '重置筛选' }).click();
  await expect(resultRows(page)).toHaveCount(6);
});

test('T14.2.7 native form/table semantics and keyboard order are usable', async ({ page }) => {
  await page.goto('/scenarios/admin');
  await expect(page.getByRole('table', { name: '服务目录' }).getByRole('columnheader')).toHaveText(['服务名称', '分类', '服务点', '操作']);
  await expect(page.getByRole('table', { name: '服务目录' }).locator('th[scope=col]')).toHaveCount(4);
  await expect(page.getByRole('status', { name: '查询结果' })).toHaveText('共 6 条服务记录');
  await category(page).focus();
  await page.keyboard.press('Tab'); await expect(recordChoice(page)).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('textbox', { name: '关键词', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(query(page)).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: '重置筛选' })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(query(page)).toBeFocused();
});

test('T14.2.8 editing zero/blank rows passes the exact ID and returns focus to that row', async ({ page }) => {
  await page.goto('/scenarios/admin');
  for (const [title, type, id] of [[recordTitles[0]!, 'number', '0'], [recordTitles[1]!, 'string', '']]) {
    const button = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: title }) }).getByRole('button', { name: '编辑', exact: true });
    await button.click();
    const dialog = page.getByRole('dialog', { name: '编辑服务记录', exact: true });
    await expect(dialog.getByRole('textbox', { name: '服务名称', exact: true })).toHaveValue(title!);
    await expect(dialog.getByTestId('record-editor')).toHaveAttribute('data-record-type', type!);
    await expect(dialog.getByTestId('record-editor')).toHaveAttribute('data-record-id', id!);
    await dialog.getByRole('button', { name: '取消', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(button).toBeFocused();
  }
});
