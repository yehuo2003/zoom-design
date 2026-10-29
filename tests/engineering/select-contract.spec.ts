import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildPlan, qualityPlan } from '../../scripts/workspace.mjs';
import { runBin } from '../../scripts/run-local-bin.mjs';
import { inspectPackageFiles } from '../../scripts/pack-contracts.mjs';
import { verifySelectDiagnostics } from './packed/select-type-contract.mjs';
import { minimalSelectEntry, assertSelectOnlyEvidence, assertUnusedSelectEvidence } from './packed/select-size-contract.mjs';

describe('T11.14 Select engineering boundaries', () => {
  it('prepares Core → DOM → Vue in selected build/typecheck plans', () => {
    expect(buildPlan('vue').map(stage => stage.package)).toEqual(['core', 'dom', 'vue']);
    expect(qualityPlan('typecheck', 'vue').filter(stage => stage.script === 'build').map(stage => stage.package)).toEqual(['core', 'dom', 'vue']);
  });
  it('loads exact public root/subpath runtime exports in Node and closes internals', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict'; assert.equal(typeof document,'undefined');const root=await import('@zoom-design/vue');const sub=await import('@zoom-design/vue/select');assert.deepEqual(Object.keys(root),['ZButton','ZSelect']);assert.deepEqual(Object.keys(sub),['ZSelect']);assert.equal(root.ZSelect,sub.ZSelect);assert.ok(import.meta.resolve('@zoom-design/vue/select/style.css').endsWith('/dist/select/style.css'));await assert.rejects(import('@zoom-design/vue/src/select/Select.vue'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});`], { encoding: 'utf8' });
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
  for (const compiler of ['packages/vue', 'packages/core']) it(`${compiler} consumes real declarations and rejects ten precise errors`, () => {
    const positive = runBin(resolve(compiler), 'typescript', 'tsc', ['-p', resolve('packages/vue/test/select-types/tsconfig.ts.json')], 'pipe');
    expect(positive.status, positive.stdout + positive.stderr).toBe(0);
    // TS-only configuration excludes Vue template diagnostics in this two-compiler gate.
    const negative = runBin(resolve(compiler), 'typescript', 'tsc', ['-p', resolve('packages/vue/test/select-types/tsconfig.ts.negative.json')], 'pipe');
    expect(negative.status).not.toBe(0);
    expect(() => verifySelectDiagnostics(negative.stdout + negative.stderr)).not.toThrow();
  });
  it('publishes seven named Select types and Select SFC declarations without internal runtime exports', () => {
    const ts = createRequire(resolve('packages/vue/package.json'))('typescript');
    for (const path of ['packages/vue/dist/types/index.d.ts', 'packages/vue/dist/types/select/index.d.ts']) {
      const source = ts.createSourceFile('index.d.ts', readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
      const names = source.statements.filter((s: any) => s.isTypeOnly).flatMap((s: any) => s.exportClause.elements.map((e: any) => e.name.text));
      expect(names).toEqual(expect.arrayContaining(['SelectProps', 'SelectEmits', 'SelectExpose', 'SelectSize', 'SelectTriggerAttributes', 'SelectOptionContext', 'SelectValueContext']));
    }
    expect(existsSync('packages/vue/dist/types/select/Select.vue.d.ts')).toBe(true);
  });
  it('rejects missing packed Select JS/types/CSS and undeclared Core/DOM runtime dependencies', () => {
    const manifest = JSON.parse(readFileSync('packages/vue/package.json', 'utf8'));
    const paths = ['package.json', 'dist/index.js', 'dist/types/index.d.ts', 'dist/button/index.js', 'dist/types/button/index.d.ts', 'dist/button/style.css', 'dist/select/index.js', 'dist/types/select/index.d.ts', 'dist/select/style.css', 'dist/style.css', 'dist/theme.css', ...['_index.scss', '_defaults.scss', '_theme.scss', '_density.scss'].map(name => `dist/styles/theme/${name}`)];
    const files = new Map(paths.map(path => [path, path === 'package.json' ? Buffer.from(JSON.stringify(manifest)) : readFileSync(resolve('packages/vue', path))]));
    expect(() => inspectPackageFiles(files, '@zoom-design/vue')).not.toThrow();
    for (const path of ['dist/select/index.js', 'dist/types/select/index.d.ts', 'dist/select/style.css']) {
      const missing = new Map(files); missing.delete(path);
      expect(() => inspectPackageFiles(missing, '@zoom-design/vue')).toThrow(/missing\/invalid export/);
    }
    for (const dependency of ['@zoom-design/core', '@zoom-design/dom']) {
      const changed = structuredClone(manifest); delete changed.dependencies[dependency];
      const missing = new Map(files); missing.set('package.json', Buffer.from(JSON.stringify(changed)));
      expect(() => inspectPackageFiles(missing, '@zoom-design/vue')).toThrow(/exact runtime dependency/);
    }
  });
  it('requires Select implementation evidence, Button exclusion and retained-import negative control', () => {
    const graph = { moduleIds: ['/consumer/node_modules/@zoom-design/vue/dist/select-abc.js'], chunks: [{ css: ['select.css'] }] };
    expect(minimalSelectEntry('select')).toContain("from '@zoom-design/vue/select'");
    expect(minimalSelectEntry('named')).toContain("from '@zoom-design/vue'");
    expect(() => assertSelectOnlyEvidence(graph, 'zoom-select')).not.toThrow();
    expect(() => assertSelectOnlyEvidence(graph, 'zoom-select zoom-button')).toThrow(/retained Button/);
    expect(() => assertUnusedSelectEvidence(graph, 'zoom-select')).toThrow(/retained Select/);
    expect(() => assertUnusedSelectEvidence(graph, 'document.body.textContent="unused"')).not.toThrow();
    expect(() => assertUnusedSelectEvidence({ moduleIds: [] }, '')).toThrow(/never encountered/);
  });
});
