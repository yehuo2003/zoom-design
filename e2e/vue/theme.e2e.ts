import { test, expect } from '../fixtures.js';
import type { Locator, Page } from '@playwright/test';

const styles = (element: Locator) => element.evaluate(node => {
  const css = getComputedStyle(node);
  return { color: css.color, background: css.backgroundColor, font: css.fontFamily, size: css.fontSize, height: node.getBoundingClientRect().height, min: css.minBlockSize, padding: css.paddingInlineStart, outline: css.outlineColor, transition: css.transitionDuration, scroll: node.scrollHeight, client: node.clientHeight };
});

async function openTheme(page: Page) {
  await page.goto('/theme');
  await expect(page.getByRole('heading', { name: 'Theme playground' })).toBeVisible();
}
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

test('T6.2/T6.26 theme CSS is really requested and controls computed styles', async ({ page }, testInfo) => {
  const responses: { url: string; ok: boolean; css: string }[] = [];
  const pending: Promise<void>[] = [];
  page.on('response', response => {
    if (response.ok() && /\.css(?:\?|$)/.test(response.url())) pending.push(response.text().then(css => { responses.push({ url: response.url(), ok: true, css }); }, error => { responses.push({ url: response.url(), ok: false, css: String(error) }); }));
  });
  await openTheme(page);
  const sample = page.getByTestId('default-sample');
  await expect(sample).toHaveCSS('background-color', 'rgb(37, 99, 235)');
  await expect.poll(() => responses.some(response => response.ok && /--zoom-color-primary\s*:\s*#2563eb/i.test(response.css))).toBe(true);
  await Promise.all(pending); expect(responses.every(response => response.ok)).toBe(true);
  await testInfo.attach('theme-css-and-computed', { body: JSON.stringify({ requests: responses.map(({ url, ok }) => ({ url, ok })), computed: await styles(sample) }), contentType: 'application/json' });
});

test('T6.8 runtime primary changes propagate into hover, active and focus', async ({ page }) => {
  await openTheme(page);
  const sample = page.getByTestId('default-sample');
  const expected = await page.evaluate(() => {
    const target = document.createElement('span'); document.body.append(target);
    const color = (value: string) => { target.style.backgroundColor = value; return getComputedStyle(target).backgroundColor; };
    const result = { hover: color('color-mix(in srgb, #ff0000 92%, black)'), active: color('color-mix(in srgb, #ff0000 84%, black)') };
    target.remove(); return result;
  });
  await sample.evaluate(node => node.parentElement!.style.setProperty('--zoom-color-primary', '#ff0000'));
  await expect(sample).toHaveCSS('background-color', 'rgb(255, 0, 0)');
  await sample.hover();
  const hover = await styles(sample); expect(hover.background).toBe(expected.hover);
  await page.mouse.down(); const active = await styles(sample); await page.mouse.up();
  expect(active.background).toBe(expected.active);
  await sample.focus(); expect((await styles(sample)).outline).toBe('rgb(255, 0, 0)');
  await sample.evaluate(node => node.parentElement!.style.setProperty('--zoom-color-primary-hover', '#00ff00'));
  await sample.hover(); await expect(sample).toHaveCSS('background-color', 'rgb(0, 255, 0)');
});

test('T6.9 brands coexist, nested overrides inherit and removal restores the parent', async ({ page }) => {
  await openTheme(page);
  await expect(page.getByTestId('purple-sample')).toHaveCSS('background-color', 'rgb(124, 58, 237)');
  await expect(page.getByTestId('teal-sample')).toHaveCSS('background-color', 'rgb(15, 118, 110)');
  const nested = page.getByTestId('nested-brand-sample');
  await expect(nested).toHaveCSS('background-color', 'rgb(15, 118, 110)');
  await page.getByRole('button', { name: 'Clear nested brand' }).click();
  await expect(nested).toHaveCSS('background-color', 'rgb(124, 58, 237)');
});

test('T6.10 local family/base size and explicit size override stay local', async ({ page }) => {
  await openTheme(page);
  const outside = await styles(page.getByTestId('default-sample'));
  const local = await styles(page.getByTestId('local-font-sample'));
  expect(local.font).toContain('monospace'); expect(parseFloat(local.size)).toBeGreaterThan(parseFloat(outside.size));
  await expect(page.getByTestId('explicit-size-sample')).toHaveCSS('font-size', '24px');
  expect(await styles(page.getByTestId('default-sample'))).toEqual(outside);
});

test('T6.11/T6.12 compact geometry restores inside regular without changing text size', async ({ page }) => {
  await openTheme(page);
  const regular = await styles(page.getByTestId('regular-sample'));
  const compact = await styles(page.getByTestId('compact-sample'));
  const restored = await styles(page.getByTestId('restored-sample'));
  expect(compact.height).toBeLessThan(regular.height); expect(compact.size).toBe(regular.size);
  expect(restored).toEqual(regular);
});

test('T6.13 large text and 200 percent root zoom grow naturally without clipping', async ({ page }) => {
  await openTheme(page);
  const sample = page.getByTestId('default-sample'); const before = await styles(sample);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  const after = await styles(sample); expect(after.height).toBeGreaterThan(before.height); expect(after.scroll).toBeLessThanOrEqual(after.client);
  await sample.evaluate(node => node.parentElement!.style.setProperty('--zoom-font-size-base', '4rem'));
  const large = await styles(sample); expect(large.height).toBeGreaterThan(after.height); expect(large.scroll).toBeLessThanOrEqual(large.client);
});

test('T6.14 theme CSS leaves unclassified host text, button and input unchanged', async ({ page }) => {
  await openTheme(page);
  const snapshot = () => page.locator('[data-host-control]').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node); return [style.color, style.backgroundColor, style.fontFamily, style.fontSize, style.padding, style.border, style.lineHeight];
  }));
  const before = await snapshot();
  await page.evaluate(() => { for (const sheet of document.styleSheets) sheet.disabled = true; });
  expect(await snapshot()).toEqual(before);
});

test('T6.24 theme SSR emits scoped markup, hydrates existing nodes and isolates requests', async ({ page, request }, testInfo) => {
  const purple = await request.get('/ssr?example=theme&brand=purple');
  const teal = await request.get('/ssr?example=theme&brand=teal');
  expect(purple.ok()).toBe(true); expect(teal.ok()).toBe(true);
  const purpleHTML = await purple.text(); const tealHTML = await teal.text();
  expect(purpleHTML).toContain('data-theme-brand="purple"'); expect(tealHTML).toContain('data-theme-brand="teal"');
  expect((await (await request.get('/ssr?example=theme&brand=purple')).text())).toBe(purpleHTML);
  expect(purpleHTML).toContain('--zoom-color-primary:#7c3aed'); expect(tealHTML).toContain('--zoom-color-primary:#0f766e');
  await page.goto('/ssr?example=theme&brand=teal');
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  expect(await page.evaluate(() => (window as Window & { __zoomSSRNode?: Element }).__zoomSSRNode === document.getElementById('app')?.firstElementChild)).toBe(true);
  await page.getByRole('button', { name: 'Clear nested brand' }).click();
  await testInfo.attach('theme-ssr-raw', { body: tealHTML, contentType: 'text/html' });
});

test('T6.25 default contrast, keyboard focus and reduced motion match the stated scope', async ({ page }) => {
  await openTheme(page);
  const ratio = (fg: number[], bg: number[]) => {
    const luminance = (rgb: number[]) => rgb.map(value => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const values = [luminance(fg), luminance(bg)].sort((a, b) => b - a); return (values[0] + .05) / (values[1] + .05);
  };
  for (const fg of [[17, 24, 39], [75, 85, 99], [185, 28, 28]]) expect(ratio(fg, [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
  expect(ratio([255, 255, 255], [37, 99, 235])).toBeGreaterThanOrEqual(4.5);
  const sample = page.getByTestId('default-sample'); await sample.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(sample).toBeFocused(); await expect(sample).toHaveCSS('outline-style', 'solid');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(sample).toHaveCSS('transition-duration', '0s');
});
