import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures.js';

const plan = (page: Page) => page.getByRole('combobox', { name: '服务方案', exact: true });
const point = (page: Page) => page.getByRole('combobox', { name: '已有服务点', exact: true });
const preview = (page: Page) => page.getByRole('dialog', { name: '服务偏好', exact: true });
async function choosePlan(page: Page, label: string) {
  await plan(page).click(); await page.getByRole('listbox').getByRole('option', { name: label, exact: true }).click();
}

test('T14.4.1 brand navigation loads public components and independent CSS with purple regular defaults', async ({ page }) => {
  await page.goto('/'); await page.getByRole('link', { name: '品牌服务方案', exact: true }).click();
  await expect(page.getByRole('heading', { name: '找到适合你的服务方案', exact: true })).toBeVisible();
  const root = page.locator('.brand-scenario');
  await expect(root).toHaveAttribute('data-scenario-brand', 'purple');
  await expect(root).toHaveAttribute('data-zoom-density', 'regular');
  await expect(plan(page)).toContainText('基础方案'); await expect(point(page)).toHaveValue('默认服务点');
  const css = await page.locator('style[data-vite-dev-id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-vite-dev-id')));
  for (const component of ['button', 'select', 'combobox', 'dialog']) expect(css.some(path => path?.includes(`/dist/${component}/style.css`))).toBe(true);
  expect(css.some(path => path?.endsWith('/dist/style.css'))).toBe(false);
  const response = await page.request.get('/ssr?example=brand-scenario&plan=standard&point=online');
  expect(response.ok()).toBe(true); expect(await response.text()).toContain('找到适合你的服务方案');
});

test('T14.4.2 zero and blank plans stay selected with real labels and typed selection data', async ({ page }) => {
  await page.goto('/scenarios/brand');
  await choosePlan(page, '标准方案');
  await expect(page.locator('[data-plan-id=""][data-plan-type="string"]')).toContainText('当前方案');
  await page.getByRole('button', { name: '查看服务偏好', exact: true }).click();
  await expect(preview(page).getByRole('combobox', { name: '偏好方案', exact: true })).toContainText('标准方案');
  await preview(page).getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('button', { name: '查看服务偏好', exact: true })).toBeFocused();
  await choosePlan(page, '基础方案');
  await expect(page.locator('[data-plan-id="0"][data-plan-type="number"]')).toContainText('当前方案');
});

test('T14.4.3 provisional point query never changes the confirmed selection or creates new IDs', async ({ page }) => {
  await page.goto('/scenarios/brand'); await point(page).fill('不存在的服务点');
  await expect(page.getByText('没有匹配的服务点', { exact: true })).toBeVisible();
  await point(page).press('Escape'); await expect(point(page)).toHaveValue('默认服务点');
  await page.getByRole('button', { name: '查看服务偏好', exact: true }).click();
  await expect(preview(page).getByRole('combobox', { name: '偏好服务点', exact: true })).toHaveValue('默认服务点');
  await expect(preview(page).getByText('尚未确认服务偏好', { exact: true })).toBeVisible();
});

test('T14.4.4 extended clears incompatible point/query/popup and requires a real north confirmation', async ({ page }) => {
  await page.goto('/scenarios/brand?plan=standard&point=online');
  await point(page).fill('北'); await choosePlan(page, '扩展方案');
  await expect(point(page)).toHaveValue(''); await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.getByRole('status', { name: '服务点提示' })).toHaveText('请重新选择服务点');
  await point(page).click();
  await expect(page.getByRole('option', { name: '默认服务点', exact: true })).toHaveCount(0);
  await page.getByRole('option', { name: '北区服务点', exact: true }).click();
  await expect(point(page)).toHaveValue('北区服务点');
  await expect(page.getByRole('status', { name: '服务点提示' })).toHaveCount(0);
});

test('T14.4.5 retired point remains visibly disabled and cannot replace the current choice', async ({ page }) => {
  await page.goto('/scenarios/brand'); await point(page).fill('');
  const retired = page.getByRole('option', { name: '停用服务点', exact: true });
  await expect(retired).toHaveAttribute('aria-disabled', 'true');
  const box = await retired.boundingBox(); expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(page.getByRole('listbox')).toBeVisible();
  await point(page).press('Escape'); await expect(point(page)).toHaveValue('默认服务点');
  await page.getByRole('button', { name: '查看服务偏好', exact: true }).click();
  await expect(preview(page).getByRole('combobox', { name: '偏好服务点', exact: true })).toHaveValue('默认服务点');
});

test('T14.4.6 unmatched search remains clearable; empty catalog explains missing choices', async ({ page }) => {
  await page.goto('/scenarios/brand'); await point(page).fill('无匹配项');
  await expect(page.getByText('没有匹配的服务点', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '清除已有服务点', exact: true }).click();
  await expect(point(page)).toHaveValue('');
  await point(page).fill('线上'); await page.getByRole('option', { name: '线上服务', exact: true }).click();
  await expect(point(page)).toHaveValue('线上服务');
  await page.goto('/scenarios/brand?empty=true');
  await expect(page.getByText('暂无可选服务方案', { exact: true })).toBeVisible();
  await expect(page.getByText('暂无可用服务点', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看服务偏好', exact: true })).toBeDisabled();
  await point(page).fill('搜索'); await expect(page.getByText('没有匹配的服务点', { exact: true })).toBeVisible();
});

test('T14.4.7 card headings, labeled controls and CTA expose content hierarchy without a fake confirmation', async ({ page }) => {
  await page.goto('/scenarios/brand');
  for (const label of ['基础方案', '标准方案', '扩展方案']) await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '服务方案概览' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.getByText('本地模拟数据，不连接真实业务系统。', { exact: true })).toBeVisible();
  await plan(page).focus(); await page.keyboard.press('Tab'); await expect(point(page)).toBeFocused();
  await page.getByRole('button', { name: '查看服务偏好', exact: true }).click();
  await expect(preview(page)).toBeVisible();
  await expect(preview(page).getByRole('form', { name: '偏好信息', exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: '上次本地确认' })).toHaveCount(0);
  await preview(page).getByRole('button', { name: '关闭', exact: true }).click();
  await expect(page.getByRole('button', { name: '查看服务偏好', exact: true })).toBeFocused();
  for (const empty of [false, true]) {
    await page.goto(`/scenarios/brand?open=true&empty=${empty}`);
    await preview(page).getByRole('button', { name: '取消', exact: true }).click();
    if (empty) await expect(page.getByRole('heading', { name: '找到适合你的服务方案', exact: true })).toBeFocused();
    else await expect(page.getByRole('button', { name: '查看服务偏好', exact: true })).toBeFocused();
  }
});

test('T14.4.8 two same-config mounted pages isolate browse values, query and dialog state', async ({ page, context }) => {
  const second = await context.newPage();
  try {
    for (const target of [page, second]) await target.goto('/scenarios/brand?plan=standard&point=online');
    await choosePlan(page, '扩展方案'); await point(page).fill('北');
    await expect(plan(second)).toContainText('标准方案'); await expect(point(second)).toHaveValue('线上服务');
    await expect(second.getByRole('listbox')).toHaveCount(0);
    await page.getByRole('button', { name: '查看服务偏好', exact: true }).click();
    await expect(preview(page)).toBeVisible(); await expect(preview(second)).toHaveCount(0);
    await expect(second.locator('body')).not.toHaveCSS('overflow', 'hidden');
  } finally { await second.close(); }
});
