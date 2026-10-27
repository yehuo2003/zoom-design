import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = process.cwd();
const read = (file: string) => JSON.parse(readFileSync(resolve(root, file), 'utf8'));

describe('Task2 public artifact contracts', () => {
  for (const name of ['core', 'dom']) {
    it(`T2.1/T2.10 ${name} exposes real JS/declarations and excludes fixtures`, () => {
      const manifest = read(`packages/${name}/package.json`);
      expect(manifest.type).toBe('module');
      expect(manifest.exports?.['.']).toEqual({ types: './dist/index.d.ts', import: './dist/index.js' });
      expect(manifest.files).toEqual(['dist', 'README.md']);
      expect(existsSync(resolve(root, `packages/${name}/dist/index.js`))).toBe(true);
      expect(existsSync(resolve(root, `packages/${name}/dist/index.d.ts`))).toBe(true);
    });
    it(`T2.2/T2.3/T2.4 ${name} imports with no browser globals and blocks deep imports`, () => {
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        assert.equal(typeof window, 'undefined'); assert.equal(typeof document, 'undefined');
        const api=await import('@zoom-design/${name}'); assert.deepEqual(Object.keys(api), []);
        await assert.rejects(import('@zoom-design/${name}/src/index.ts'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
        await assert.rejects(import('@zoom-design/${name}/dist/index.js'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
      `], { cwd: root, encoding: 'utf8' });
      expect(result.stderr).toBe(''); expect(result.status).toBe(0);
    });
  }
  it('T2.2/T2.4/T2.11 uses strict independent TS libraries with no aliases or styles', () => {
    expect(existsSync(resolve(root, 'tsconfig.base.json'))).toBe(true);
    const base = read('tsconfig.base.json').compilerOptions;
    expect(base).toMatchObject({ strict: true, target: 'ES2022', verbatimModuleSyntax: true, skipLibCheck: false });
    expect(base.paths).toBeUndefined(); expect(base.types).toBeUndefined(); expect(base.lib).toBeUndefined();
    const core = read('packages/core/tsconfig.build.json').compilerOptions;
    expect(core.lib).toEqual(['ES2022']); expect(core.types).toEqual([]);
    const dom = read('packages/dom/tsconfig.build.json').compilerOptions;
    expect(dom.lib).toEqual(['ES2022', 'DOM', 'DOM.Iterable']);
    for (const name of ['core', 'dom']) {
      const m = read(`packages/${name}/package.json`);
      expect(Object.keys({ ...m.dependencies, ...m.devDependencies }).filter(n => /sass|react|vue|angular|css/i.test(n))).toEqual([]);
      const js = readFileSync(resolve(root, `packages/${name}/dist/index.js`), 'utf8');
      expect(js).not.toMatch(/\.s?css|window|document/);
    }
  });
});

describe('Task2 test runner failure propagation', () => {
  for (const name of ['core', 'dom']) {
    it(`T2.8 ${name} rejects an intentionally failing assertion`, () => {
      const directory = resolve(root, `packages/${name}`);
      const file = resolve(directory, `test/runner-negative-${randomUUID()}.spec.ts`);
      expect(existsSync(resolve(directory, 'vitest.config.ts'))).toBe(true);
      try {
        writeFileSync(file, 'import { it, expect } from "vitest"; it("Task2 negative control",()=>expect(0).toBe(1));');
        const result = spawnSync(process.execPath, [resolve(root, 'scripts/run-local-bin.mjs'), '--workspace', directory, '--package', 'vitest', '--bin', 'vitest', '--', 'run', '--config', 'vitest.config.ts', file], { cwd: directory, encoding: 'utf8' });
        expect(result.status).not.toBe(0); expect(result.stdout + result.stderr).toContain('Task2 negative control');
        expect(result.stdout + result.stderr).toContain('AssertionError');
      } finally { if (existsSync(file)) unlinkSync(file); }
    });
  }
});
