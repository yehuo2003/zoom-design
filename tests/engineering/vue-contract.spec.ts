import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (file: string) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));

describe('Task3 Vue production artifact boundary', () => {
  it('T3.12/T3.13/T7.30 exposes ZButton public declarations and explicit built CSS', () => {
    const manifest = read('packages/vue/package.json');
    expect(manifest.exports['.']).toEqual({ types: './dist/types/index.d.ts', import: './dist/index.js' });
    expect(manifest.exports['./style.css']).toBe('./dist/style.css');
    expect(manifest.sideEffects).toEqual(['**/*.css']);
    expect(manifest.files).toEqual(['dist', 'README.md']);
    expect(manifest.exports['./button']).toEqual({ types: './dist/types/button/index.d.ts', import: './dist/button/index.js' });
    expect(manifest.exports['./button/style.css']).toBe('./dist/button/style.css');
    for (const file of ['index.js', 'button/index.js', 'types/index.d.ts', 'types/button/index.d.ts', 'button/style.css', 'style.css']) expect(existsSync(resolve(root, 'packages/vue/dist', file))).toBe(true);
    const css = readFileSync(resolve(root, 'packages/vue/dist/style.css'), 'utf8');
    expect(css).toContain('--zoom-engineering-built: 1');
    const declaration = readFileSync(resolve(root, 'packages/vue/dist/types/index.d.ts'), 'utf8');
    expect(declaration).toContain('ZButton'); expect(declaration).toContain('ButtonProps'); expect(declaration).not.toContain('normalize');
    expect(readFileSync(resolve(root, 'packages/vue/dist/index.js'), 'utf8')).not.toMatch(/BuildProbe|\.s?css|createRenderer/);
  });

  it('T3.13 imports production by package name in Node and denies private/deep imports', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      assert.equal(typeof window, 'undefined');
      const root = await import('@zoom-design/vue'); const button = await import('@zoom-design/vue/button');
      assert.deepEqual(Object.keys(root), ['ZButton', 'ZSelect']); assert.deepEqual(Object.keys(button), ['ZButton']);
      assert.equal(root.ZButton, button.ZButton);
      assert.ok(import.meta.resolve('@zoom-design/vue/style.css').endsWith('/dist/style.css'));
      await assert.rejects(import('@zoom-design/vue/test/fixtures/BuildProbe.vue'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
      await assert.rejects(import('@zoom-design/vue/dist/index.js'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
    `], { cwd: root, encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
