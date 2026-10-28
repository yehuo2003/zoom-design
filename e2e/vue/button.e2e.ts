import { test, expect } from '../fixtures.js';
import type { Page } from '@playwright/test';

async function open(page: Page) {
  await page.goto('/button'); await expect(page.getByRole('heading', { name: 'Button playground' })).toBeVisible();
}
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }); });

test('T7.1/T7.6/T7.7 real native default button emits once per mouse, Enter and Space', async ({ page, assetEvidence }) => {
  await open(page); const button = page.getByTestId('action');
  await expect(button).toHaveAttribute('type', 'button'); await expect(button).toHaveAccessibleName('Save changes');
  await button.click(); await expect(page.getByTestId('click-count')).toHaveText('1');
  await button.press('Enter'); await expect(page.getByTestId('click-count')).toHaveText('2');
  await button.press('Space'); await expect(page.getByTestId('click-count')).toHaveText('3');
  await expect(button).toBeEnabled(); await expect(page.getByTestId('last-mouse')).toHaveText('MouseEvent'); await assetEvidence();
});
test('T7.8/T7.9 disabled/loading are controlled, preserve text and never restore focus', async ({ page }) => {
  await open(page); const button = page.getByTestId('action');
  await page.getByLabel('Disable action').check(); await expect(button).toBeDisabled();
  await button.evaluate(node => (node as HTMLButtonElement).click()); await expect(page.getByTestId('click-count')).toHaveText('0');
  await page.getByLabel('Loading action').check(); await expect(button).toHaveAttribute('aria-busy', 'true'); await expect(button).toHaveAccessibleName('Save changes');
  await expect(button.locator('.zoom-button__spinner')).toHaveCSS('animation-name', 'none');
  await page.getByLabel('Disable action').uncheck(); await expect(button).toBeDisabled();
  await page.getByTestId('tab-before').focus(); await page.keyboard.press('Tab'); await expect(page.getByTestId('tab-after')).toBeFocused();
  await page.getByLabel('Loading action').uncheck(); await expect(button).toBeEnabled(); await expect(button).not.toBeFocused();
  await page.getByTestId('tab-before').focus(); await page.keyboard.press('Tab'); await expect(button).toBeFocused();
});
test('T7.2/T7.3 production runtime normalization rejects unsafe JS inputs', async ({ page }, info) => {
  const warnings: string[] = []; page.on('console', event => { if (event.type() === 'warning') warnings.push(event.text()); });
  await open(page); const invalid = page.getByTestId('invalid');
  await expect(invalid).toHaveAttribute('type', 'button'); await expect(invalid).toHaveAttribute('data-zoom-variant', 'solid');
  await expect(invalid).toHaveAttribute('data-zoom-size', 'md'); await expect(invalid).toBeDisabled();
  if (info.config.metadata.mode === 'packed') expect(warnings).toEqual([]);
});
test('T7.10 disabled fieldset and synthetic clicks cannot emit or bubble business actions', async ({ page }) => {
  await open(page);
  const result = await page.getByTestId('fieldset-action').evaluate(node => {
    const parent = node.parentElement!; let bubbled = 0; parent.addEventListener('click', () => bubbled++);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true }); node.dispatchEvent(event);
    return { canceled: event.defaultPrevented, bubbled };
  });
  expect(result).toEqual({ canceled: true, bubbled: 0 }); await expect(page.getByTestId('fieldset-count')).toHaveText('0');
});
test('T7.11 once/prevent/stop retain native Vue event behavior', async ({ page }) => {
  await open(page); await page.getByTestId('once').click(); await page.getByTestId('once').click(); await expect(page.getByTestId('once-count')).toHaveText('1');
  await page.getByTestId('stop').click(); await expect(page.getByTestId('stop-count')).toHaveText('1'); await expect(page.getByTestId('bubble-count')).toHaveText('0');
  await page.getByLabel('Required value').fill('valid');
  await page.getByTestId('prevent').click(); await expect(page.getByTestId('submit-count')).toHaveText('0'); await expect(page.getByTestId('prevent-count')).toHaveText('1');
});
test('T7.12/T7.13 dynamic attrs/listeners and protected state preserve zero and empty native values', async ({ page }) => {
  await open(page); const button = page.getByTestId('dynamic');
  await button.click(); await expect(page.getByTestId('dynamic-log')).toHaveText('old');
  await page.getByRole('button', { name: 'Update attrs' }).click(); await expect(button).toHaveAccessibleName('Updated name');
  await expect(button).toHaveClass(/updated/); await expect(button).toHaveAttribute('title', 'Updated title'); await expect(button).toHaveCSS('border-radius', '20px');
  await expect(button).toHaveAttribute('name', ''); await expect(button).toHaveAttribute('value', '0'); await expect(button).not.toHaveAttribute('aria-busy');
  await expect(button).toHaveAttribute('data-zoom-size', 'md'); await button.click(); await expect(page.getByTestId('dynamic-log')).toHaveText('old,new');
});
test('T7.14/T7.15/T7.17 submit uses validation, external form, submitter and native overrides', async ({ page }) => {
  await open(page); await page.getByTestId('default-in-form').click(); await expect(page.getByTestId('submit-count')).toHaveText('0');
  await page.getByTestId('submit').click(); await expect(page.getByTestId('submit-count')).toHaveText('0');
  await page.getByLabel('Required value').fill('value'); await page.getByTestId('submit').click(); await expect(page.getByTestId('submit-count')).toHaveText('1');
  await expect(page.getByTestId('submit-log')).toContainText('inside=save');
  await page.getByLabel('Required value').fill(''); await page.getByTestId('external-submit').click(); await expect(page.getByTestId('submit-count')).toHaveText('2');
  await expect(page.getByTestId('submit-log')).toContainText('external=0'); await expect(page.getByTestId('submit-log')).toContainText('post|text/plain|_self|/button-submit');
});
test('T7.16 native reset resets input default without rewriting application state', async ({ page }) => {
  await open(page); await page.getByLabel('Resettable value').fill('edited'); await expect(page.getByTestId('model-value')).toHaveText('edited');
  await page.getByTestId('reset').click(); await expect(page.getByLabel('Resettable value')).toHaveValue('initial'); await expect(page.getByTestId('model-value')).toHaveText('edited');
});
test('T7.13/T7.14 case-insensitive dynamic attrs cannot submit or enable a guarded button', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Update uppercase attrs' }).click();
  await expect(page.getByTestId('case-disabled')).toBeDisabled(); await expect(page.getByTestId('case-disabled')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('case-default')).toBeEnabled(); await expect(page.getByTestId('case-default')).toHaveAttribute('type', 'button');
  await page.getByTestId('case-default').click(); await expect(page.getByTestId('collision-submits')).toHaveText('0');
});
test('T7.4/T7.5 variants, three sizes, two densities, block and RTL use local geometry', async ({ page }) => {
  await open(page);
  for (const [density, minima] of [['regular', [28, 36, 44]], ['compact', [24, 28, 36]]] as const) {
    for (const [i, size] of ['sm', 'md', 'lg'].entries()) {
      const button = page.getByTestId(`${density}-${size}`); await expect(button).toHaveCSS('min-block-size', `${minima[i]}px`);
      await expect(button).toHaveCSS('font-size', `${[12, 14, 16][i]}px`);
    }
  }
  await expect(page.getByTestId('outline')).toHaveCSS('border-top-color', 'rgb(37, 99, 235)');
  await expect(page.getByTestId('text')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const geometry = await page.getByTestId('block').evaluate(node => ({ width: node.getBoundingClientRect().width, parent: node.parentElement!.clientWidth, direction: getComputedStyle(node).direction }));
  expect(geometry.width).toBe(geometry.parent); expect(geometry.direction).toBe('rtl');
});
test('T7.4/T7.21 states derive exact runtime colors at the button and honor overrides', async ({ page }) => {
  await open(page); const button = page.getByTestId('brand-action');
  const expected = await page.evaluate(() => {
    const sample = document.createElement('span'); document.body.append(sample);
    const color = (value: string) => { sample.style.backgroundColor = value; return getComputedStyle(sample).backgroundColor; };
    const result = [color('color-mix(in srgb, #ff0000 92%, black)'), color('color-mix(in srgb, #ff0000 84%, black)')]; sample.remove(); return result;
  });
  await button.evaluate(node => node.parentElement!.style.setProperty('--zoom-color-primary', '#ff0000'));
  await expect(button).toHaveCSS('background-color', 'rgb(255, 0, 0)'); await button.hover(); await expect(button).toHaveCSS('background-color', expected[0]);
  await page.mouse.down(); await expect(button).toHaveCSS('background-color', expected[1]); await page.mouse.up();
  await page.keyboard.press('Tab'); await button.focus(); await expect(button).toHaveCSS('outline-color', 'rgb(255, 0, 0)');
  await button.evaluate(node => { (node as HTMLElement).style.setProperty('--zoom-button-bg-hover', '#00ff00'); (node as HTMLElement).style.setProperty('--zoom-button-focus-color', '#ff00ff'); });
  await button.hover(); await expect(button).toHaveCSS('background-color', 'rgb(0, 255, 0)'); await expect(button).toHaveCSS('outline-color', 'rgb(255, 0, 255)');
  await expect(page.getByTestId('action')).toHaveCSS('background-color', 'rgb(37, 99, 235)');
});
test('T7.4 outline/text hover, active, disabled and visible keyboard focus are distinct', async ({ page }) => {
  await open(page);
  const expected = await page.evaluate(() => {
    const node = document.createElement('span'); document.body.append(node);
    const color = (value: string) => { node.style.backgroundColor = value; return getComputedStyle(node).backgroundColor; };
    const result = [color('color-mix(in srgb, #2563eb 8%, transparent)'), color('color-mix(in srgb, #2563eb 16%, transparent)')]; node.remove(); return result;
  });
  for (const variant of ['outline', 'text']) {
    const button = page.getByTestId(variant); await button.hover(); await expect(button).toHaveCSS('background-color', expected[0]);
    await page.mouse.down(); await expect(button).toHaveCSS('background-color', expected[1]); await page.mouse.up();
    await page.keyboard.press('Tab'); await button.focus(); await expect(button).toHaveCSS('outline-width', '2px'); await expect(button).toHaveCSS('outline-offset', '2px');
    await button.evaluate(node => { (node as HTMLButtonElement).disabled = true; }); await expect(button).toHaveCSS('opacity', '0.55');
    await button.hover({ force: true }); await expect(button).not.toHaveCSS('background-color', expected[0]);
  }
});
test('T7.22/T7.23 font and long text overrides grow naturally and do not reset hosts', async ({ page }) => {
  await open(page); const button = page.getByTestId('long');
  await expect(button).toHaveCSS('font-size', '28px'); await expect(button).toHaveCSS('line-height', '56px');
  await expect(button).toHaveCSS('font-family', 'monospace');
  await button.evaluate(node => (node as HTMLElement).style.setProperty('--zoom-button-font-size', '56px'));
  const box = await button.evaluate(node => ({ client: node.clientHeight, scroll: node.scrollHeight, width: node.clientWidth, scrollWidth: node.scrollWidth }));
  expect(box.scroll).toBeLessThanOrEqual(box.client + 1); expect(box.scrollWidth).toBeLessThanOrEqual(box.width + 1);
  await expect(page.getByTestId('native-host')).toHaveCSS('border-radius', '0px');
});
test('T7.24/T7.25 accessible names, custom loading and unnamed negative assertions', async ({ page }) => {
  await open(page); await expect(page.getByTestId('icon-text')).toHaveAccessibleName('Favorite'); await expect(page.getByTestId('icon-only')).toHaveAccessibleName('Favorite item');
  await expect(page.getByTestId('custom-loading')).toHaveAccessibleName('Uploading'); await expect(page.getByTestId('custom-loading')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('custom-loading').locator('.zoom-button__loading')).toHaveText('…');
  const unnamed = page.getByTestId('unnamed'); await expect(unnamed).toHaveAccessibleName('');
  let rejected = false; try { await expect(unnamed).toHaveAccessibleName(/\S+/, { timeout: 100 }); } catch { rejected = true; } expect(rejected).toBe(true);
});
test('T7.20/T7.26 focus/blur, unmount and remount keep local instance state', async ({ page }) => {
  await open(page); await page.getByRole('button', { name: 'Focus action' }).click(); await expect(page.getByTestId('action')).toBeFocused();
  await page.getByRole('button', { name: 'Blur action' }).click(); await expect(page.getByTestId('action')).not.toBeFocused();
  await page.getByTestId('isolated').click(); await expect(page.getByTestId('isolated-count')).toHaveText('1'); await expect(page.getByTestId('click-count')).toHaveText('0');
  await page.getByRole('button', { name: 'Toggle isolated' }).click(); await expect(page.getByTestId('isolated')).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle isolated' }).click(); await expect(page.getByTestId('isolated')).toBeEnabled();
});
test('T7.18/T7.19/T7.26 SSR sends actual button markup and hydrates the same button node', async ({ page, request }) => {
  const purple = await request.get('/ssr?example=button&brand=purple'); const html = await purple.text(); expect(purple.ok()).toBe(true);
  expect(html).toMatch(/<button[^>]*type="button"[^>]*data-testid="action"|<button[^>]*data-testid="action"[^>]*type="button"/);
  expect(html).toContain('Save changes'); expect(html).toContain('aria-busy="true"');
  const teal = await request.get('/ssr?example=button&brand=teal'); expect(await teal.text()).toContain('data-button-brand="teal"');
  expect(await (await request.get('/ssr?example=button&brand=purple')).text()).toBe(html);
  const warnings: string[] = []; page.on('console', event => { if (/hydration|mismatch/i.test(event.text())) warnings.push(event.text()); });
  await page.goto('/ssr?example=button'); await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  expect(await page.evaluate(() => (window as unknown as { __zoomSSRButton: Element }).__zoomSSRButton === document.querySelector('[data-testid="action"]'))).toBe(true);
  await page.getByTestId('action').click(); await expect(page.getByTestId('click-count')).toHaveText('1'); expect(warnings).toEqual([]);
});
test('T7.38 component public JS import failure stays inside readiness gate', async ({ page, packageImports, runtimeErrors }) => {
  runtimeErrors.allowPageError(/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i);
  runtimeErrors.allowConsoleError(/Failed to load resource|net::ERR_FAILED|blocked|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically imported module/i);
  await page.route(packageImports.vueButton, route => route.abort('failed')); await page.goto('/button');
  await expect(page.getByRole('status')).toHaveText('Package imports failed'); await expect(page.getByTestId('action')).toHaveCount(0);
});
test('T7.23/T7.31/T7.33 root and subpath consumers need only Button CSS and leave host defaults alone', async ({ page }, info) => {
  for (const scenario of ['button', 'named']) {
    const css: string[] = []; const pending: Promise<void>[] = [];
    const listener = (response: import('@playwright/test').Response) => { if (response.ok() && /\.css(?:\?|$)/.test(response.url())) pending.push(response.text().then(body => { css.push(body); })); };
    page.on('response', listener);
    await page.goto(info.config.metadata.mode === 'packed' ? `/minimal/${scenario}/` : `/minimal.html?entry=${scenario}`);
    const button = page.locator('#minimal-button'); await expect(button).toHaveAccessibleName('Minimal button');
    await expect(button).toHaveCSS('background-color', 'rgb(37, 99, 235)'); await expect(button).toHaveCSS('min-block-size', '36px');
    await button.click(); await expect(page.locator('output')).toHaveText('1');
    const before = await page.locator('#native').evaluate(node => { const css = getComputedStyle(node); return { background: css.backgroundColor, font: css.fontFamily, padding: css.padding, border: css.border }; });
    await button.evaluate(node => { (node as HTMLElement).style.setProperty('--zoom-color-primary', '#0f766e'); (node as HTMLElement).style.setProperty('--zoom-button-radius', '24px'); });
    await page.mouse.move(0, 0); await expect(button).toHaveCSS('background-color', 'rgb(15, 118, 110)'); await expect(button).toHaveCSS('border-radius', '24px');
    const after = await page.locator('#native').evaluate(node => { const css = getComputedStyle(node); return { background: css.backgroundColor, font: css.fontFamily, padding: css.padding, border: css.border }; });
    expect(after).toEqual(before); await Promise.all(pending);
    if (info.config.metadata.mode === 'packed') { expect(css.join('\n')).toContain('.zoom-button'); expect(css.join('\n')).not.toMatch(/--zoom-engineering-built|:where\(:root\)/); }
    page.off('response', listener);
  }
});
