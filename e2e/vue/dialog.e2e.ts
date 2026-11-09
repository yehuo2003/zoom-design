import { test, expect } from '../fixtures.js';

// Role/name locators below were checked against the rendered accessibility tree
// for /dialog/behavior, /dialog/composition, /dialog/appearance and /ssr.
test('T13.12.1 controlled close reasons preserve order, rejection and owner acceptance', async ({ page }) => {
  await page.goto('/dialog/behavior');
  await page.getByRole('button', { name: 'Open guarded dialog' }).click();
  const dialog = page.getByRole('dialog', { name: 'Guarded request' });
  const close = dialog.getByRole('button', { name: '关闭' });
  await close.click();
  await expect(dialog).toBeVisible();
  await dialog.press('Escape');
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('guarded-events')).toHaveText('update:false|request:close-button|update:false|request:escape|update:false|request:outside');
  await dialog.getByRole('checkbox', { name: 'Allow close requests' }).check();
  await page.mouse.click(2, 2);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('guarded-events')).toHaveText('update:false|request:close-button|update:false|request:escape|update:false|request:outside|update:false|request:outside');
  for (const reason of ['escape', 'close-button']) {
    await page.getByRole('button', { name: 'Open guarded dialog' }).click();
    await dialog.getByRole('checkbox', { name: 'Allow close requests' }).check();
    if (reason === 'escape') await dialog.press('Escape');
    else await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('guarded-events')).toHaveText(`update:false|request:${reason}`);
  }
});

test('T13.12.2 initial focus, Tab containment, return focus and release after close', async ({ page }) => {
  await page.goto('/dialog/behavior');
  const trigger = page.getByRole('button', { name: 'Open accepted dialog' });
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Accepted request' });
  const close = dialog.getByRole('button', { name: '关闭' });
  await expect(close).toBeFocused();
  await close.press('Tab');
  await expect(close).toBeFocused();
  await close.press('Shift+Tab');
  await expect(close).toBeFocused();
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).toBe('hidden');
  await close.click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).not.toBe('hidden');
  await expect(page.getByTestId('accepted-events')).toHaveText('update:false|request:close-button');
});

test('T13.12.3 mixed nesting routes real popup clicks and isolates the lower layer', async ({ page }, testInfo) => {
  await page.goto('/dialog/composition');
  await page.getByRole('button', { name: 'Open modal parent' }).click();
  const parent = page.getByRole('dialog', { name: 'Modal composition parent', includeHidden: true });
  await parent.getByRole('button', { name: 'Open nonmodal child' }).click();
  const child = page.getByRole('dialog', { name: 'Nonmodal composition child' });
  const choice = child.getByRole('combobox', { name: 'Nested choice' });
  await choice.click();
  const option = page.getByRole('listbox').getByRole('option', { name: 'Two' });
  await testInfo.attach('dialog-composition', { body: await page.screenshot(), contentType: 'image/png' });
  expect(await option.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === node || node.contains(hit);
  })).toBe(true);
  await option.click();
  await expect(choice).toContainText('Two');
  await expect(choice).toBeFocused();
  await expect(parent).toBeVisible();
  await expect.poll(() => child.evaluate(node => !!node.closest('[inert]'))).toBe(false);
  await child.getByRole('button', { name: '关闭' }).click();
  await expect(child).toHaveCount(0);
  await parent.getByRole('button', { name: 'Open modal child' }).press('Enter');
  const modalChild = page.getByRole('dialog', { name: 'Modal composition child' });
  await expect.poll(() => parent.evaluate(node => !!node.closest('[inert]'))).toBe(true);
  await modalChild.getByRole('button', { name: '关闭' }).click();
  await expect(parent.getByRole('button', { name: 'Open modal child' })).toBeFocused();
});

test('T13.12.4 brand, density, narrow long content and RTL stay operable', async ({ page }) => {
  for (const [brand, density, background, minWidth] of [
    ['purple', 'regular', 'rgb(245, 243, 255)', '36px'],
    ['teal', 'compact', 'rgb(240, 253, 250)', '28px'],
  ]) {
    await page.goto(`/dialog/appearance?brand=${brand}&density=${density}`);
    const dialog = page.getByRole('dialog', { name: 'A very long Dialog heading for layout verification' });
    await expect(dialog).toHaveCSS('background-color', background);
    await expect(dialog.getByRole('button', { name: '关闭' })).toHaveCSS('min-width', minWidth);
  }
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto('/dialog/appearance?long=true&rtl=true&large=true');
  const dialog = page.getByRole('dialog', { name: 'A very long Dialog heading for layout verification' });
  await expect(dialog).toHaveCSS('direction', 'rtl');
  await expect(dialog.getByRole('button', { name: '关闭' })).toBeInViewport();
  await expect(dialog.getByRole('button', { name: 'Save' })).toBeInViewport();
  const geometry = await dialog.evaluate(node => {
    const bounds = node.getBoundingClientRect();
    const body = node.querySelector('.zoom-dialog__content')!;
    return { left: bounds.left, right: bounds.right, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(320);
  expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/dialog/appearance?dual=true');
  const branded = page.locator('[role="dialog"]');
  await expect(branded).toHaveCount(2);
  await expect(branded.nth(0)).toHaveCSS('background-color', 'rgb(245, 243, 255)');
  await expect(branded.nth(1)).toHaveCSS('background-color', 'rgb(240, 253, 250)');
});

test('T13.12.6 synthetic IME composition protects the Combobox and parent form', async ({ page }) => {
  await page.goto('/dialog/composition');
  await page.getByRole('button', { name: 'Open composition form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Composition form' });
  const search = dialog.getByRole('combobox', { name: 'Search' });
  await search.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await search.evaluate((node: HTMLInputElement) => {
    node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    node.value = 'Be';
    node.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, isComposing: true }));
    node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  });
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('composition-close-events')).toHaveText('');
  await expect(page.getByTestId('composition-submission')).toHaveText('');
});

test('T13.12.3 form footer uses its owner and a rejected close cannot submit', async ({ page }) => {
  await page.goto('/dialog/composition');
  await page.getByRole('button', { name: 'Open composition form' }).click();
  const dialog = page.getByRole('dialog', { name: 'Composition form' });
  await dialog.getByRole('button', { name: '关闭' }).click();
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('composition-submission')).toHaveText('');
  await dialog.getByRole('button', { name: 'Submit form' }).click();
  await expect(page.getByTestId('composition-submission')).toHaveText('{"title":"Draft","choice":"alpha"}');
  await dialog.getByRole('button', { name: 'Reset form' }).click();
  await expect.poll(() => dialog.locator('form').evaluate(node => Object.fromEntries(new FormData(node as HTMLFormElement)))).toEqual({ title: 'Draft' });
});

test('T13.12.5 workspace and packed Dialog SSR reuse server nodes and migrate only for portal', async ({ page, request }) => {
  const warnings: string[] = [];
  page.on('console', message => { if (/hydration|mismatch/i.test(message.text())) warnings.push(message.text()); });
  for (const portal of [true, false]) {
    const url = `/ssr?example=dialog&brand=purple&id=acceptance-dialog&open=true&portal=${portal}`;
    const server = await request.get(url);
    expect(server.ok()).toBe(true);
    expect(await server.text()).toMatch(/id="acceptance-dialog"[^>]*role="dialog"/);
    await page.goto(url);
    await expect(page.locator('[role="status"][aria-label="Package readiness"]')).toHaveText('Vue package imports ready');
    await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
    const dialog = page.getByRole('dialog', { name: 'SSR dialog purple' });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => {
      const captured = window as Window & { __zoomSSRDialogRoot?: Element; __zoomSSRDialogPanel?: Element; __zoomSSRDialogTitle?: Element };
      const panel = document.getElementById('acceptance-dialog');
      return captured.__zoomSSRDialogRoot === document.querySelector('[data-testid="ssr-dialog"]')
        && captured.__zoomSSRDialogPanel === panel
        && captured.__zoomSSRDialogTitle === panel?.querySelector('.zoom-dialog__title');
    })).toBe(true);
    expect(await dialog.evaluate(node => !!node.closest('#ssr-dialog-host'))).toBe(portal);
    await dialog.getByRole('button', { name: '关闭' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('ssr-dialog-close-count')).toHaveText('1');
  }
  expect(warnings).toEqual([]);
});

test('T13.12.2 unmount and remount release focus, scroll lock and stale routing', async ({ page }) => {
  await page.goto('/ssr?example=dialog&open=true&portal=true');
  await expect(page.locator('#app')).toHaveAttribute('data-hydrated', 'true');
  const dialog = page.getByRole('dialog', { name: 'SSR dialog purple' });
  await dialog.getByRole('button', { name: 'Unmount this dialog' }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.locator('body').evaluate(node => getComputedStyle(node).overflow)).not.toBe('hidden');
  const trigger = page.getByRole('button', { name: 'Open SSR dialog' });
  await trigger.press('Enter');
  await expect(dialog.getByRole('button', { name: '关闭' })).toBeFocused();
  await dialog.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId('ssr-dialog-close-count')).toHaveText('1');
});

test('T13.10.7 blocked public Dialog chunk prevents the playground from mounting', async ({ page, packageImports, runtimeErrors }) => {
  runtimeErrors.allowPageError(/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i);
  runtimeErrors.allowConsoleError(/Failed to load resource|net::ERR_FAILED|blocked|Importing a module script failed|error loading dynamically imported module|Failed to fetch dynamically imported module/i);
  let intercepted = false;
  await page.route(packageImports.vueDialog, async route => { intercepted = true; await route.abort('failed'); });
  await page.goto('/dialog');
  await expect(page.getByRole('status', { name: 'Package readiness' })).toHaveText('Package imports failed');
  await expect(page.getByRole('heading', { name: 'Dialog playground' })).toHaveCount(0);
  expect(intercepted).toBe(true);
});
