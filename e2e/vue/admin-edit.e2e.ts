import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures.js';

const editor = (page: Page) => page.getByRole('dialog', { name: '编辑服务记录', exact: true });
const discard = (page: Page) => page.getByRole('dialog', { name: '放弃未保存的修改？', exact: true });
const title = (page: Page) => editor(page).getByRole('textbox', { name: '服务名称', exact: true });
const rowButton = (page: Page, name: string) => page.getByRole('row').filter({ has: page.getByRole('rowheader', { name }) }).getByRole('button', { name: '编辑', exact: true });
async function choose(page: Page, trigger: Locator, label: string) {
  await trigger.click(); await page.getByRole('listbox').getByRole('option', { name: label, exact: true }).click();
}

test('T14.3.1 opening another zero/blank record starts a fresh draft and focuses the real title input', async ({ page }) => {
  await page.goto('/scenarios/admin');
  await rowButton(page, '通用服务咨询').click();
  await expect(title(page)).toBeFocused();
  await title(page).fill('未保存的修改');
  await editor(page).getByRole('button', { name: '取消', exact: true }).click();
  await discard(page).getByRole('button', { name: '放弃修改', exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await rowButton(page, '线上内容服务').click();
  await expect(title(page)).toHaveValue('线上内容服务');
  await expect(editor(page).getByRole('combobox', { name: '服务点', exact: true })).toHaveValue('线上服务');
  await expect(title(page)).toBeFocused();
  await editor(page).getByRole('button', { name: '取消', exact: true }).click();
  await expect(rowButton(page, '线上内容服务')).toBeFocused();
});

test('T14.3.2 native required/custom title validation prevents saving and focuses visible invalid controls', async ({ page }) => {
  await page.goto('/scenarios/admin?open=true&delay=0');
  await title(page).fill('   ');
  await editor(page).getByRole('button', { name: '保存', exact: true }).click();
  await expect(title(page)).toBeFocused();
  expect(await title(page).evaluate(input => input instanceof HTMLInputElement && input.validity.customError)).toBe(true);
  await expect(editor(page)).toBeVisible();
  await title(page).fill('有效标题');
  await editor(page).getByRole('button', { name: '清除编辑分类', exact: true }).click();
  await editor(page).getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor(page).getByRole('combobox', { name: '编辑分类', exact: true })).toBeFocused();
  await choose(page, editor(page).getByRole('combobox', { name: '编辑分类', exact: true }), '通用服务');
  await editor(page).getByRole('button', { name: '清除服务点', exact: true }).click();
  await editor(page).getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor(page).getByRole('combobox', { name: '服务点', exact: true })).toBeFocused();
  await choose(page, editor(page).getByRole('combobox', { name: '服务点', exact: true }), '默认服务点');
  await editor(page).getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(rowButton(page, '有效标题')).toBeVisible();
});

test('T14.3.3 footer native submit captures zero/blank FormData before disabling and repeated clicks save once', async ({ page }) => {
  await page.goto('/scenarios/admin?open=true&record=blank&delay=700');
  await title(page).fill('一次保存');
  await choose(page, editor(page).getByRole('combobox', { name: '编辑分类', exact: true }), '通用服务');
  const form = editor(page).getByRole('form', { name: '编辑服务记录' });
  await form.evaluate(node => {
    node.addEventListener('submit', () => {
      if (!(node instanceof HTMLFormElement)) throw Error('Expected form');
      const snapshot = Object.fromEntries(new FormData(node));
      node.setAttribute('data-native-snapshot', JSON.stringify(snapshot));
    }, { capture: true });
  });
  const save = editor(page).getByRole('button', { name: '保存', exact: true });
  await expect(save).toHaveAttribute('form', await form.getAttribute('id') ?? '');
  await save.dblclick();
  await expect(save).toBeDisabled();
  await expect(title(page)).toBeDisabled();
  const snapshot = JSON.parse(await form.getAttribute('data-native-snapshot') ?? '{}');
  expect(snapshot).toMatchObject({ recordId: '', categoryId: '0', servicePointId: '', title: '一次保存' });
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByRole('status', { name: '保存结果' })).toContainText('本地模拟保存成功');
  await rowButton(page, '一次保存').click();
  await expect(title(page)).toHaveValue('一次保存');
  await expect(editor(page).getByRole('combobox', { name: '编辑分类', exact: true })).toContainText('通用服务');
  await expect(editor(page).getByRole('combobox', { name: '服务点', exact: true })).toHaveValue('线上服务');
});

test('T14.3.4 saving a row out of the applied filter returns directly to the stable query button', async ({ page }) => {
  await page.goto('/scenarios/admin?category=general&selectedRecord=zero&delay=0');
  await rowButton(page, '通用服务咨询').click();
  await choose(page, editor(page).getByRole('combobox', { name: '编辑分类', exact: true }), '内容服务');
  await editor(page).getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await expect(page.getByText('没有符合筛选条件的记录', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '查询', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '重置筛选', exact: true }).click();
  const changed = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '通用服务咨询' }) });
  await expect(changed).toContainText('内容服务');
});

test('T14.3.5 failure keeps the complete draft and unchanged or modified retry saves the right snapshot', async ({ page }) => {
  for (const changeAfterFailure of [false, true]) {
    await page.goto('/scenarios/admin?open=true&save=fail-once&delay=20');
    await title(page).fill('失败后保留');
    await editor(page).getByRole('textbox', { name: '备注', exact: true }).fill('草稿备注');
    await editor(page).getByRole('button', { name: '保存', exact: true }).click();
    await expect(editor(page).getByRole('alert')).toContainText('本地模拟保存失败，请重试');
    await expect(title(page)).toHaveValue('失败后保留');
    await expect(editor(page).getByRole('textbox', { name: '备注', exact: true })).toHaveValue('草稿备注');
    if (changeAfterFailure) await title(page).fill('修改后重试');
    await editor(page).getByRole('button', { name: '保存', exact: true }).click();
    await expect(editor(page)).toHaveCount(0);
    await expect(rowButton(page, changeAfterFailure ? '修改后重试' : '失败后保留')).toBeVisible();
  }
});

test('T14.3.6 X/Escape/outside/cancel use one dirty gate and keep the parent form mounted', async ({ page }) => {
  await page.goto('/scenarios/admin');
  for (const reason of ['close-button', 'escape', 'outside', 'cancel']) {
    await rowButton(page, '通用服务咨询').click(); await title(page).fill(`保留-${reason}`);
    const formId = await editor(page).getByRole('form', { name: '编辑服务记录' }).getAttribute('id');
    if (reason === 'close-button') await editor(page).getByRole('button', { name: '关闭', exact: true }).click();
    else if (reason === 'escape') await title(page).press('Escape');
    else if (reason === 'outside') await page.mouse.click(2, 2);
    else await editor(page).getByRole('button', { name: '取消', exact: true }).click();
    await expect(discard(page)).toHaveCount(1);
    await expect(discard(page).getByRole('button', { name: '继续编辑', exact: true })).toBeFocused();
    expect(await page.locator(`[id="${formId}"]`).count()).toBe(1);
    await discard(page).getByRole('button', { name: '关闭', exact: true }).click();
    await expect(discard(page)).toHaveCount(0);
    await expect(title(page)).toHaveValue(`保留-${reason}`);
    await expect(editor(page).getByRole('button', { name: '取消', exact: true })).toBeFocused();
    await editor(page).getByRole('button', { name: '取消', exact: true }).click();
    await discard(page).getByRole('button', { name: '放弃修改', exact: true }).click();
    await expect(editor(page)).toHaveCount(0);
  }
});

test('T14.3.7 continue keeps the draft, reset restores baseline/validity, discard closes both without transient parent focus', async ({ page }) => {
  await page.goto('/scenarios/admin');
  const row = rowButton(page, '通用服务咨询'); await row.click();
  await title(page).fill('   ');
  await editor(page).getByRole('button', { name: '保存', exact: true }).click();
  await editor(page).getByRole('button', { name: '恢复打开时内容', exact: true }).click();
  await expect(title(page)).toHaveValue('通用服务咨询');
  expect(await title(page).evaluate(input => input instanceof HTMLInputElement && input.validity.valid)).toBe(true);
  await title(page).fill('继续编辑的草稿');
  await editor(page).getByRole('button', { name: '取消', exact: true }).click();
  await discard(page).getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(title(page)).toHaveValue('继续编辑的草稿');
  await editor(page).getByRole('button', { name: '取消', exact: true }).click();
  await page.evaluate(() => {
    const sequence: string[] = [];
    document.addEventListener('focusin', event => { if (event.target instanceof HTMLElement) sequence.push(event.target.textContent?.trim() ?? ''); });
    Reflect.set(window, '__adminCloseFocus', sequence);
  });
  await discard(page).getByRole('button', { name: '放弃修改', exact: true }).click();
  await expect(editor(page)).toHaveCount(0); await expect(discard(page)).toHaveCount(0);
  await expect(row).toBeFocused();
  const sequence = await page.evaluate(() => Reflect.get(window, '__adminCloseFocus'));
  expect(sequence).not.toContain('取消'); expect(sequence.at(-1)).toBe('编辑');
  await expect(row).toBeVisible();
});

test('T14.3.8 saving rejects parent close requests; leaving and reentering has no old result or modal locks', async ({ page }) => {
  await page.goto('/scenarios/admin?open=true&delay=1800');
  await title(page).fill('旧页面保存');
  await editor(page).getByRole('button', { name: '保存', exact: true }).click();
  await editor(page).getByRole('button', { name: '关闭', exact: true }).click();
  await page.keyboard.press('Escape'); await page.mouse.click(2, 2);
  await expect(editor(page)).toBeVisible(); await expect(discard(page)).toHaveCount(0);
  await expect(editor(page).getByRole('button', { name: '取消', exact: true })).toBeDisabled();
  await page.goto('/scenarios/admin');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(rowButton(page, '通用服务咨询')).toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await expect(page.getByRole('button', { name: '查询', exact: true })).toBeEnabled();
  await expect(page.getByRole('status', { name: '保存结果' })).toHaveCount(0);
});
