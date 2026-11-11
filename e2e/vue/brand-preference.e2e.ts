import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures.js';

const dialog = (page: Page) => page.getByRole('dialog', { name: '服务偏好', exact: true });
const summary = (page: Page) => page.getByRole('status', { name: '上次本地确认', exact: true });
const cta = (page: Page) => page.getByRole('button', { name: '查看服务偏好', exact: true });
async function fillContact(page: Page, name = '张三') {
  await dialog(page).getByRole('textbox', { name: '姓名', exact: true }).fill(name);
  await dialog(page).getByRole('textbox', { name: '电子邮箱', exact: true }).fill('test@example.com');
  await dialog(page).getByRole('textbox', { name: '偏好备注', exact: true }).fill('本地备注');
}
async function confirm(page: Page) { await dialog(page).getByRole('button', { name: '本地确认', exact: true }).click(); }

test('T14.5.1 opening copies browse selection and changes in the preference form do not rewrite browse', async ({ page }) => {
  await page.goto('/scenarios/brand?plan=standard&point=online'); await cta(page).click();
  await expect(dialog(page).getByRole('textbox', { name: '姓名', exact: true })).toBeFocused();
  await expect(dialog(page).getByRole('combobox', { name: '偏好方案', exact: true })).toContainText('标准方案');
  await expect(dialog(page).getByRole('combobox', { name: '偏好服务点', exact: true })).toHaveValue('线上服务');
  await dialog(page).getByRole('combobox', { name: '偏好方案', exact: true }).click();
  await page.getByRole('option', { name: '扩展方案', exact: true }).click();
  await expect(dialog(page).getByRole('combobox', { name: '偏好服务点', exact: true })).toHaveValue('');
  await expect(dialog(page).getByRole('status', { name: '偏好服务点提示' })).toHaveText('请重新选择服务点');
  await dialog(page).getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '服务方案', exact: true })).toContainText('标准方案');
  await expect(page.getByRole('combobox', { name: '已有服务点', exact: true })).toHaveValue('线上服务');
  await cta(page).click(); await expect(dialog(page).getByRole('textbox', { name: '姓名', exact: true })).toHaveValue('');
});

test('T14.5.2 native required email whitespace and selection validation keep the form open and focus visible fields', async ({ page }) => {
  await page.goto('/scenarios/brand?open=true&delay=0'); await confirm(page);
  const name = dialog(page).getByRole('textbox', { name: '姓名', exact: true }); await expect(name).toBeFocused();
  await fillContact(page, '   '); await confirm(page); await expect(name).toBeFocused();
  expect(await name.evaluate(node => node instanceof HTMLInputElement && node.validity.customError)).toBe(true);
  await name.fill('有效姓名'); const email = dialog(page).getByRole('textbox', { name: '电子邮箱', exact: true });
  await email.fill('invalid'); await confirm(page); await expect(email).toBeFocused();
  await email.fill('test@example.com');
  await dialog(page).getByRole('button', { name: '清除偏好服务点', exact: true }).click();
  await confirm(page); await expect(dialog(page).getByRole('combobox', { name: '偏好服务点', exact: true })).toBeFocused();
  await expect(summary(page)).toHaveCount(0);
  await page.goto('/scenarios/brand?open=true&plan=extended');
  await expect(dialog(page).getByRole('textbox', { name: '姓名', exact: true })).toHaveValue('');
  await expect(dialog(page).getByRole('combobox', { name: '偏好服务点', exact: true })).toHaveValue('');
});

test('T14.5.3 native footer form captures blank and zero before disabled; success updates summary and returns CTA focus', async ({ page }) => {
  await page.goto('/scenarios/brand?open=true&plan=standard&point=default&delay=700'); await fillContact(page);
  const form = dialog(page).getByRole('form', { name: '偏好信息', exact: true });
  await form.evaluate(node => node.addEventListener('submit', () => { if (node instanceof HTMLFormElement) node.setAttribute('data-snapshot', JSON.stringify(Object.fromEntries(new FormData(node)))); }, { capture: true }));
  const button = dialog(page).getByRole('button', { name: '本地确认', exact: true });
  await expect(button).toHaveAttribute('form', await form.getAttribute('id') ?? ''); await button.dblclick();
  await expect(button).toBeDisabled(); await expect(dialog(page).getByRole('textbox', { name: '姓名', exact: true })).toBeDisabled();
  expect(JSON.parse(await form.getAttribute('data-snapshot') ?? '{}')).toMatchObject({ planId: '', servicePointId: '0', contactName: '张三', email: 'test@example.com', note: '本地备注' });
  await expect(dialog(page)).toHaveCount(0); await expect(cta(page)).toBeFocused();
  await expect(summary(page)).toContainText('标准方案'); await expect(summary(page)).toContainText('默认服务点');
  await expect(summary(page)).toContainText('张三'); await expect(summary(page)).toContainText('test@example.com');
  await expect(summary(page)).toHaveCount(1);
});

test('T14.5.4 fail-once keeps all inputs and unchanged or edited retries produce the accepted snapshot', async ({ page }) => {
  for (const change of [false, true]) {
    await page.goto('/scenarios/brand?open=true&save=fail-once&delay=20'); await fillContact(page); await confirm(page);
    await expect(dialog(page).getByRole('alert')).toContainText('本地模拟确认失败，请重试');
    await expect(dialog(page).getByRole('textbox', { name: '姓名', exact: true })).toHaveValue('张三');
    await expect(dialog(page).getByRole('textbox', { name: '偏好备注', exact: true })).toHaveValue('本地备注');
    if (change) await dialog(page).getByRole('textbox', { name: '偏好备注', exact: true }).fill('修改后重试');
    await confirm(page); await expect(dialog(page)).toHaveCount(0);
    await expect(summary(page)).toContainText(change ? '修改后重试' : '本地备注');
  }
});

test('T14.5.5 cancel after editing discards the draft and keeps browse and old summary for every close route', async ({ page }) => {
  await page.goto('/scenarios/brand?open=true&delay=0'); await fillContact(page); await confirm(page);
  const before = await summary(page).textContent();
  for (const reason of ['cancel', 'escape', 'outside', 'close-button']) {
    await cta(page).click(); await fillContact(page, '取消这次修改');
    if (reason === 'cancel') await dialog(page).getByRole('button', { name: '取消', exact: true }).click();
    else if (reason === 'escape') await page.keyboard.press('Escape');
    else if (reason === 'outside') await page.mouse.click(2, 2);
    else await dialog(page).getByRole('button', { name: '关闭', exact: true }).click();
    await expect(dialog(page)).toHaveCount(0); await expect(cta(page)).toBeFocused(); await expect(summary(page)).toHaveText(before ?? '');
    await expect(page.getByRole('combobox', { name: '已有服务点', exact: true })).toHaveValue('默认服务点');
  }
});

test('T14.5.6 later browse and scoped theme changes leave the prior confirmation intact', async ({ page }) => {
  await page.goto('/scenarios/brand?open=true&delay=0'); await fillContact(page); await confirm(page);
  const before = await summary(page).textContent();
  await page.getByRole('combobox', { name: '服务方案', exact: true }).click(); await page.getByRole('option', { name: '扩展方案', exact: true }).click();
  await page.getByRole('combobox', { name: '已有服务点', exact: true }).fill('北'); await page.getByRole('option', { name: '北区服务点', exact: true }).click();
  // Theme controls belong to14.6; change only the existing scoped CSS attribute here.
  await page.locator('.brand-scenario').evaluate(node => node.setAttribute('data-scenario-brand', 'teal'));
  await expect(summary(page)).toHaveText(before ?? '');
  await cta(page).click(); await expect(dialog(page).getByRole('combobox', { name: '偏好方案', exact: true })).toContainText('扩展方案');
  await expect(dialog(page).getByRole('combobox', { name: '偏好服务点', exact: true })).toHaveValue('北区服务点');
});

test('T14.5.7 pending rejects duplicate Enter and close requests and leaving creates no old result or modal lock', async ({ page }) => {
  await page.goto('/scenarios/brand?open=true&delay=1800'); await fillContact(page); await confirm(page);
  await page.keyboard.press('Enter'); await dialog(page).getByRole('button', { name: '关闭', exact: true }).click();
  await page.keyboard.press('Escape'); await page.mouse.click(2, 2);
  await expect(dialog(page)).toBeVisible(); await expect(dialog(page).getByRole('button', { name: '取消', exact: true })).toBeDisabled();
  await page.goto('/scenarios/brand'); await expect(dialog(page)).toHaveCount(0); await expect(summary(page)).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden'); await expect(cta(page)).toBeEnabled();
});

test('T14.5.8 successful confirmation is clearly local and renders user input as text', async ({ page }) => {
  await page.goto('/scenarios/brand?open=true&delay=0'); await fillContact(page, '<b>本地用户</b>'); await confirm(page);
  await expect(summary(page)).toContainText('<b>本地用户</b>'); await expect(summary(page).locator('b')).toHaveCount(0);
  await expect(summary(page)).toContainText('没有创建真实预约，也未发送邮件');
  await expect(page.getByText('本地模拟数据，不连接真实业务系统。', { exact: true })).toBeVisible();
});
