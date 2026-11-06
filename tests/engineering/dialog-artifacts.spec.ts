import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as sass from 'sass';

const tokens = [
  'background', 'color', 'muted-color', 'border-color', 'backdrop-color',
  'font-family', 'font-size', 'line-height', 'title-font-size', 'title-font-weight',
  'radius', 'shadow', 'inline-size', 'max-block-size', 'viewport-gap',
  'padding', 'gap', 'close-size', 'focus-color', 'focus-width', 'focus-offset', 'z-index',
];

describe('Task13.2 Dialog public shell artifacts', () => {
  it('exports one Dialog runtime from root and subpath without browser access at import', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      assert.equal(typeof document, 'undefined');
      const root = await import('@zoom-design/vue');
      const sub = await import('@zoom-design/vue/dialog');
      assert.deepEqual(Object.keys(root), ['ZButton', 'ZCombobox', 'ZDialog', 'ZSelect']);
      assert.deepEqual(Object.keys(sub), ['ZDialog']);
      assert.equal(root.ZDialog, sub.ZDialog);
      assert.ok(import.meta.resolve('@zoom-design/vue/dialog/style.css').endsWith('/dist/dialog/style.css'));
      await assert.rejects(import('@zoom-design/vue/src/dialog/Dialog.vue'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    `], { encoding: 'utf8' });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    for (const file of ['dialog/index.js', 'types/dialog/index.d.ts', 'types/dialog/Dialog.vue.d.ts', 'dialog/style.css']) {
      expect(existsSync(`packages/vue/dist/${file}`)).toBe(true);
    }
    expect(readFileSync('packages/vue/dist/dialog/index.js', 'utf8')).not.toMatch(/\.css["']/);
  });

  it('T13.2.6 publishes the standalone compiled CSS with precisely 22 overridable tokens', () => {
    const css = readFileSync('packages/vue/dist/dialog/style.css', 'utf8');
    expect(css.trim()).toBe(sass.compile('packages/vue/src/dialog/style.scss', { charset: false }).css.trim());
    expect(css).toContain('.zoom-dialog__panel');
    expect(css).not.toMatch(/\.zoom-(?:button|select|combobox)\b|:root\b/);
    expect(css).not.toMatch(/(?:^|[;{]\s*)--zoom-dialog-[a-z-]+\s*:/m);
    expect([...new Set(css.match(/--zoom-dialog-[a-z-]+/g) ?? [])].sort()).toEqual(tokens.map(token => `--zoom-dialog-${token}`).sort());
    expect(readFileSync('packages/vue/dist/style.css', 'utf8')).toContain('.zoom-dialog__panel');
  });
});
