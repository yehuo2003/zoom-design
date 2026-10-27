import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (file: string) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));

describe('Task3 Vue production artifact boundary', () => {
  it('T3.12/T3.13 exposes empty public JS/declarations and explicit built CSS', () => {
    const manifest = read('packages/vue/package.json');
    expect(manifest.exports['.']).toEqual({ types: './dist/types/index.d.ts', import: './dist/index.js' });
    expect(manifest.exports['./style.css']).toBe('./dist/style.css');
    expect(manifest.sideEffects).toEqual(['**/*.css']);
    expect(manifest.files).toEqual(['dist', 'README.md']);
    for (const file of ['index.js', 'types/index.d.ts', 'style.css']) expect(existsSync(resolve(root, 'packages/vue/dist', file))).toBe(true);
    const css = readFileSync(resolve(root, 'packages/vue/dist/style.css'), 'utf8');
    expect(css).toContain('--zoom-engineering-built: 1');
    const declaration = readFileSync(resolve(root, 'packages/vue/dist/types/index.d.ts'), 'utf8');
    expect(declaration.trim()).toBe('export {};');
    expect(readFileSync(resolve(root, 'packages/vue/dist/index.js'), 'utf8')).not.toMatch(/BuildProbe|\.s?css|createRenderer/);
  });

  it('T3.13 imports production by package name in Node and denies private/deep imports', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      assert.equal(typeof window, 'undefined');
      assert.deepEqual(Object.keys(await import('@zoom-design/vue')), []);
      assert.ok(import.meta.resolve('@zoom-design/vue/style.css').endsWith('/dist/style.css'));
      await assert.rejects(import('@zoom-design/vue/test/fixtures/BuildProbe.vue'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
      await assert.rejects(import('@zoom-design/vue/dist/index.js'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
    `], { cwd: root, encoding: 'utf8' });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });
});
