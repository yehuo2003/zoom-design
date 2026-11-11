import type { Locator, Page } from '@playwright/test';
import { expect, test } from '../fixtures.js';

async function snapshot(form: Locator) {
  await form.evaluate(node => {
    node.addEventListener('submit', () => {
      if (node instanceof HTMLFormElement) node.setAttribute('data-native-snapshot', JSON.stringify(Object.fromEntries(new FormData(node))));
    }, { capture: true });
    node.addEventListener('reset', () => node.setAttribute('data-native-resets', String(Number(node.getAttribute('data-native-resets') ?? 0) + 1)), { capture: true });
  });
}

test('T14.7.6 admin external footer reset/submit and implicit Enter use their real form with zero/blank strings', async ({ page }) => {
  for (const blank of [false, true]) {
    await page.goto(`/scenarios/admin?open=true&record=${blank ? 'blank' : 'zero'}&delay=350`);
    const dialog = page.getByRole('dialog', { name: '编辑服务记录', exact: true }), form = dialog.getByRole('form', { name: '编辑服务记录', exact: true });
    const title = dialog.getByRole('textbox', { name: '服务名称', exact: true }); const initial = await title.inputValue(); await snapshot(form);
    const reset = dialog.getByRole('button', { name: '恢复打开时内容', exact: true }), save = dialog.getByRole('button', { name: '保存', exact: true });
    for (const button of [reset, save]) expect(await button.evaluate((node, id) => (node as HTMLButtonElement).form?.id === id, await form.getAttribute('id'))).toBe(true);
    await title.fill('应恢复'); await reset.click(); await expect(title).toHaveValue(initial); await expect(form).toHaveAttribute('data-native-resets', '1');
    await title.fill(blank ? '空串记录保存' : '数字记录保存');
    if (blank) await save.click(); else await title.press('Enter');
    await expect(save).toBeDisabled();
    expect(JSON.parse(await form.getAttribute('data-native-snapshot') ?? '{}')).toMatchObject({ recordId: blank ? '' : '0', categoryId: blank ? '' : '0', servicePointId: blank ? '' : '0', title: blank ? '空串记录保存' : '数字记录保存' });
    await expect(dialog).toHaveCount(0); await expect(page.getByRole('status', { name: '保存结果', exact: true })).toContainText('本地模拟保存成功');
  }
});
test('T14.7.6 brand footer and implicit Enter preserve native zero/blank values and confirmed labels', async ({ page }) => {
  for (const blank of [false, true]) {
    await page.goto(`/scenarios/brand?open=true&plan=${blank ? 'standard' : 'base'}&point=${blank ? 'online' : 'default'}&delay=350`);
    const dialog = page.getByRole('dialog', { name: '服务偏好', exact: true }), form = dialog.getByRole('form', { name: '偏好信息', exact: true }); await snapshot(form);
    await dialog.getByRole('textbox', { name: '姓名', exact: true }).fill('表单验证'); const email = dialog.getByRole('textbox', { name: '电子邮箱', exact: true }); await email.fill('form@example.com');
    const save = dialog.getByRole('button', { name: '本地确认', exact: true }); expect(await save.evaluate((node, id) => (node as HTMLButtonElement).form?.id === id, await form.getAttribute('id'))).toBe(true);
    if (blank) await save.click(); else await email.press('Enter');
    await expect(save).toBeDisabled(); expect(JSON.parse(await form.getAttribute('data-native-snapshot') ?? '{}')).toMatchObject({ planId: blank ? '' : '0', servicePointId: blank ? '' : '0', contactName: '表单验证', email: 'form@example.com' });
    await expect(dialog).toHaveCount(0); const summary = page.getByRole('status', { name: '上次本地确认', exact: true }); await expect(summary).toContainText(blank ? '标准方案' : '基础方案'); await expect(summary).toContainText(blank ? '线上服务' : '默认服务点');
  }
});

for (const kind of ['admin', 'brand']) test(`T14.7.7 ${kind} composition Enter cannot submit and consecutive Escape closes popup before Dialog`, async ({ page }) => {
  await page.goto(`/scenarios/${kind}?open=true&delay=0`);
  const dialog = page.getByRole('dialog', { name: kind === 'admin' ? '编辑服务记录' : '服务偏好', exact: true });
  const form = dialog.getByRole('form');
  await form.evaluate(node => node.addEventListener('submit', () => node.setAttribute('data-submit-count', String(Number(node.getAttribute('data-submit-count') ?? 0) + 1)), { capture: true }));
  if (kind === 'brand') { await dialog.getByRole('textbox', { name: '姓名', exact: true }).fill('组合输入'); await dialog.getByRole('textbox', { name: '电子邮箱', exact: true }).fill('ime@example.com'); }
  const point = dialog.getByRole('combobox', { name: kind === 'admin' ? '服务点' : '偏好服务点', exact: true });
  await point.click(); await point.dispatchEvent('compositionstart', { data: '' });
  await point.evaluate(node => { (node as HTMLInputElement).value = '未确认'; node.dispatchEvent(new InputEvent('input', { data: '未确认', inputType: 'insertCompositionText', isComposing: true, bubbles: true })); });
  await point.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await point.press('Enter');
  expect(await form.getAttribute('data-submit-count')).toBeNull();
  expect(await form.evaluate(node => new FormData(node as HTMLFormElement).get('servicePointId'))).toBe('0');
  await expect(dialog).toBeVisible(); await expect(page.getByRole('listbox')).toBeVisible();
  await point.dispatchEvent('compositionend', { data: '未确认' }); await point.dispatchEvent('input', { data: '未确认', inputType: 'insertText' });
  await expect(point).toHaveValue('未确认'); await point.press('Escape'); await expect(page.getByRole('listbox')).toHaveCount(0); await expect(dialog).toBeVisible(); await expect(point).toHaveValue('默认服务点');
  await point.press('Escape'); await expect(dialog).toHaveCount(0); await expect(page.getByRole('dialog')).toHaveCount(0);
  if (kind === 'brand') await expect(page.getByRole('button', { name: '查看服务偏好', exact: true })).toBeFocused();
  else await expect(page.getByRole('button', { name: '查询', exact: true })).toBeFocused();
});

test('T14.7.8 actual diagnostic unmount/remount removes layers, locks, inert and document interaction listeners', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const tracked = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const add = document.addEventListener.bind(document), remove = document.removeEventListener.bind(document);
    document.addEventListener = ((type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
      if (callback && ['keydown', 'focusin', 'pointerdown', 'pointerup', 'click', 'dblclick', 'contextmenu', 'compositionstart', 'compositionend'].includes(type)) { const set = tracked.get(type) ?? new Set(); set.add(callback); tracked.set(type, set); } add(type, callback, options);
    }) as typeof document.addEventListener;
    document.removeEventListener = ((type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => { if (callback) tracked.get(type)?.delete(callback); remove(type, callback, options); }) as typeof document.removeEventListener;
    Reflect.set(window, '__interactionCounts', () => Object.fromEntries([...tracked].map(([key, value]) => [key, value.size])));
  });
  await page.goto('/regressions/dialog-focus?scenario=move&modal=true'); await expect(page.getByRole('dialog', { name: 'Moving', exact: true })).toBeVisible();
  let baseline: unknown;
  const samples: unknown[] = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.getByRole('button', { name: '卸载回归场景', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.getByRole('listbox')).toHaveCount(0); await expect(page.locator('[inert]')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden'); await expect(page.locator('#first-host, #second-host')).toHaveCount(0);
    const counts = await page.evaluate(() => Reflect.get(window, '__interactionCounts')()); expect(Object.keys(counts)).toHaveLength(9); expect(Object.values(counts).every(count => count === 0)).toBe(true); if (cycle === 0) baseline = counts; else expect(counts).toEqual(baseline);
    samples.push(counts);
    const remount = page.getByRole('button', { name: '重新挂载回归场景', exact: true }); await remount.focus(); await expect(remount).toBeFocused();
    if (cycle < 2) { await remount.press('Enter'); await expect(page.getByRole('dialog', { name: 'Moving', exact: true })).toBeVisible(); }
  }
  await testInfo.attach('document-interaction-counts-after-unmount', { body: JSON.stringify(samples), contentType: 'application/json' });
  await page.getByRole('link', { name: '返回组件示例', exact: true }).click(); await page.getByRole('link', { name: '品牌服务方案', exact: true }).click(); await page.getByRole('button', { name: '查看服务偏好', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '姓名', exact: true })).toBeFocused(); await page.getByRole('button', { name: '取消', exact: true }).click(); await expect(page.getByRole('button', { name: '查看服务偏好', exact: true })).toBeFocused();
});
