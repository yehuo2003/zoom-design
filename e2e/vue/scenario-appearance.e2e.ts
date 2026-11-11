import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures.js';
const root = (page: Page) => page.locator('.consumption-scenario');
async function settings(scope: Locator) { await scope.getByText('显示设置', { exact: true }).click(); }
async function hit(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  expect(await target.evaluate(node => { const r=node.getBoundingClientRect(); const top=node.ownerDocument.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return top===node||node.contains(top); })).toBe(true);
  await target.click();
}
test('T14.6.1 scoped brand and density updates reach all four components and external overlays with real geometry', async ({ page }) => {
  await page.goto('/scenarios/brand'); const scope=root(page); await settings(scope);
  const cta=scope.getByRole('button',{name:'查看服务偏好',exact:true}); const regular=(await cta.boundingBox())!.height;
  await scope.getByRole('combobox',{name:'品牌配色',exact:true}).selectOption('teal');
  await scope.getByRole('combobox',{name:'控件密度',exact:true}).selectOption('compact');
  expect((await cta.boundingBox())!.height).toBeLessThan(regular);
  await hit(page,cta); const dialog=scope.getByRole('dialog',{name:'服务偏好',exact:true});
  for(const target of [dialog,dialog.getByRole('button',{name:'本地确认',exact:true}),dialog.getByRole('combobox',{name:'偏好方案',exact:true}),dialog.getByRole('combobox',{name:'偏好服务点',exact:true})])
    expect((await target.evaluate(node=>getComputedStyle(node).getPropertyValue('--zoom-color-primary'))).trim()).toBe('#0f766e');
  await dialog.getByRole('combobox',{name:'偏好方案',exact:true}).click();
  const list=scope.getByRole('listbox'); await expect(list).toBeVisible();
  expect((await list.evaluate(node=>getComputedStyle(node).getPropertyValue('--zoom-control-gap'))).trim()).toBe((await scope.evaluate(node=>getComputedStyle(node).getPropertyValue('--zoom-control-gap'))).trim());
  await hit(page,list.getByRole('option',{name:'标准方案',exact:true}));
});
test('T14.6.2 font and large text presets affect computed typography and external popup content', async ({ page }) => {
  await page.goto('/scenarios/admin'); const scope=root(page); await settings(scope);
  const query=scope.getByRole('button',{name:'查询',exact:true}); const initial=await query.evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
  await scope.getByRole('combobox',{name:'页面字体',exact:true}).selectOption('serif'); await scope.getByRole('checkbox',{name:'大字号',exact:true}).check();
  expect(await query.evaluate(node=>parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThan(initial);
  expect(await query.evaluate(node=>getComputedStyle(node).fontFamily)).toContain('Georgia');
  await scope.getByRole('combobox',{name:'服务分类',exact:true}).click();
  expect(await scope.getByRole('listbox').evaluate(node=>getComputedStyle(node).fontFamily)).toContain('Georgia');
});
test('T14.6.3 dual brands isolate appearance, selections, IDs, preference services and open state', async ({ page }) => {
  await page.goto('/scenarios/brand?dual=true&save=fail-once&delay=20'); const scopes=root(page); await expect(scopes).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const left=scopes.nth(0),right=scopes.nth(1); await expect(left).toHaveAttribute('data-scenario-brand','purple'); await expect(right).toHaveAttribute('data-scenario-brand','teal');
  await settings(left); await left.getByRole('combobox',{name:'控件密度',exact:true}).selectOption('compact'); await expect(right).toHaveAttribute('data-zoom-density','regular');
  await left.getByRole('combobox',{name:'服务方案',exact:true}).click(); await left.getByRole('option',{name:'标准方案',exact:true}).click();
  await expect(right.getByRole('combobox',{name:'服务方案',exact:true})).toContainText('基础方案');
  for(const [scope,name] of [[left,'左侧'],[right,'右侧']] as const){
    await scope.getByRole('button',{name:'查看服务偏好',exact:true}).click(); const dialog=scope.getByRole('dialog');
    await dialog.getByRole('textbox',{name:'姓名',exact:true}).fill(name); await dialog.getByRole('textbox',{name:'电子邮箱',exact:true}).fill('local@example.com');
    await dialog.getByRole('button',{name:'本地确认',exact:true}).click(); await expect(dialog.getByRole('alert')).toContainText('本地模拟确认失败');
    await dialog.getByRole('button',{name:'本地确认',exact:true}).click(); await expect(dialog).toHaveCount(0);
    await expect(scope.getByRole('status',{name:'上次本地确认'})).toContainText(name);
  }
  const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id)); expect(new Set(ids).size).toBe(ids.length);
});
test('T14.6.4 320px long content keeps close/footer reachable and scrolls inside both page dialogs', async ({ page }) => {
  await page.setViewportSize({width:320,height:720});
  for(const kind of ['admin','brand']){
    await page.goto(`/scenarios/${kind}?open=true&long=true&delay=0`); const dialog=page.getByRole('dialog');
    await expect(dialog.locator('.zoom-dialog__title')).toContainText('跨区域');
    const content=dialog.locator('.zoom-dialog__content'); expect(await content.evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const button=dialog.getByRole('button',{name:kind==='admin'?'保存':'本地确认',exact:true}); await hit(page,button);
    if(kind==='admin') { await expect(dialog).toHaveCount(0); await page.goto('/scenarios/admin?open=true&long=true&delay=0'); }
    await hit(page,dialog.getByRole('button',{name:'关闭',exact:true})); await expect(dialog).toHaveCount(0);
  }
});
test('T14.6.5 large text RTL remains contained and supports real popup selection and footer controls', async ({ page }) => {
  await page.setViewportSize({width:360,height:800}); await page.goto('/scenarios/brand?open=true&large=true&rtl=true&long=true');
  await expect(root(page)).toHaveAttribute('dir','rtl'); const dialog=page.getByRole('dialog');
  expect(await dialog.evaluate(node=>getComputedStyle(node).direction)).toBe('rtl');
  await dialog.getByRole('combobox',{name:'偏好方案',exact:true}).click(); await hit(page,page.getByRole('option',{name:'标准方案',exact:true}));
  const r=await dialog.boundingBox(); expect(r!.x).toBeGreaterThanOrEqual(0); expect(r!.x+r!.width).toBeLessThanOrEqual(360);
  await hit(page,dialog.getByRole('button',{name:'取消',exact:true}));
});
test('T14.6.6 before and after hosts keep dialog-to-popup keyboard traversal and real clicks valid', async ({ page }) => {
  for(const position of ['before','after']){
    await page.goto(`/scenarios/brand?open=true&hostPosition=${position}`); const scope=root(page),dialog=scope.getByRole('dialog');
    await expect(scope.locator(`.scenario-overlay-host[data-position=${position}]`).getByRole('dialog')).toHaveCount(1);
    const input=dialog.getByRole('textbox',{name:'姓名',exact:true}); await expect(input).toBeFocused(); await input.press('Tab'); await expect(dialog.getByRole('textbox',{name:'电子邮箱',exact:true})).toBeFocused();
    await dialog.getByRole('combobox',{name:'偏好服务点',exact:true}).fill('线上'); await hit(page,scope.getByRole('option',{name:'线上服务',exact:true}));
    await hit(page,dialog.getByRole('button',{name:'取消',exact:true})); await expect(scope.getByRole('button',{name:'查看服务偏好',exact:true})).toBeFocused();
  }
});
test('T14.6.7 host removal and restoration preserve the same panel/input and legal focus through inline fallback', async ({ page }) => {
  await page.goto('/scenarios/brand?open=true'); const dialog=page.getByRole('dialog'),name=dialog.getByRole('textbox',{name:'姓名',exact:true});
  await name.fill('保持节点'); await name.evaluate(node=>{
    const host=node.closest('.scenario-overlay-host')!; Reflect.set(window,'__t146',{host,parent:host.parentNode,input:node,panel:node.closest('[role=dialog]')});host.remove();
  });
  await expect(name).toHaveValue('保持节点'); await expect(name).toBeFocused();
  expect(await name.evaluate(node=>node===Reflect.get(window,'__t146').input)).toBe(true);
  await page.evaluate(()=>{const state=Reflect.get(window,'__t146');state.parent.append(state.host);});
  await expect(root(page).locator('.scenario-overlay-host[data-position=after]').getByRole('dialog')).toHaveCount(1);
  expect(await dialog.evaluate(node=>node===Reflect.get(window,'__t146').panel)).toBe(true); await expect(name).toBeFocused();
  await hit(page,dialog.getByRole('button',{name:'取消',exact:true}));
});
test('T14.6.8 table actions and portaled options are actual pointer targets instead of only high z-index', async ({ page }) => {
  await page.setViewportSize({width:320,height:720}); await page.goto('/scenarios/admin');
  const edit=page.getByRole('row').filter({has:page.getByRole('rowheader',{name:'通用服务咨询'})}).getByRole('button',{name:'编辑',exact:true}); await hit(page,edit);
  const dialog=page.getByRole('dialog'); await dialog.getByRole('combobox',{name:'编辑分类',exact:true}).click(); await hit(page,page.getByRole('option',{name:'内容服务',exact:true}));
  await hit(page,dialog.getByRole('button',{name:'保存',exact:true})); await expect(dialog).toHaveCount(0); await expect(edit).toBeFocused();
});
