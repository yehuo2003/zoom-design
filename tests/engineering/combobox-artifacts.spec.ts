import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as sass from 'sass';
import { runBin } from '../../scripts/run-local-bin.mjs';
import { verifyComboboxDiagnostics } from './packed/combobox-type-contract.mjs';
import { minimalComboboxEntry, assertComboboxOnlyEvidence, assertUnusedComboboxEvidence } from './packed/combobox-size-contract.mjs';

describe('T12 real Combobox product artifacts', () => {
  it('loads exact public runtime names and denies private source/deep JS imports', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict';assert.equal(typeof document,'undefined');const root=await import('@zoom-design/vue');const sub=await import('@zoom-design/vue/combobox');assert.deepEqual(Object.keys(root),['ZButton','ZCombobox','ZDialog','ZSelect']);assert.deepEqual(Object.keys(sub),['ZCombobox']);assert.equal(root.ZCombobox,sub.ZCombobox);assert.ok(import.meta.resolve('@zoom-design/vue/combobox/style.css').endsWith('/dist/combobox/style.css'));for(const path of ['src/combobox/Combobox.vue','dist/combobox/index.js'])await assert.rejects(import('@zoom-design/vue/'+path),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});`], { encoding: 'utf8' });
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
  for (const compiler of ['packages/vue', 'packages/core']) it(`${compiler} consumes actual Combobox declarations and rejects 12 precise errors`, () => {
    const positive = runBin(resolve(compiler), 'typescript', 'tsc', ['-p', resolve('packages/vue/test/combobox-types/tsconfig.ts.json')], 'pipe');
    expect(positive.status, positive.stdout + positive.stderr).toBe(0);
    const negative = runBin(resolve(compiler), 'typescript', 'tsc', ['-p', resolve('packages/vue/test/combobox-types/tsconfig.ts.negative.json')], 'pipe');
    expect(negative.status).not.toBe(0);
    expect(() => verifyComboboxDiagnostics(negative.stdout + negative.stderr)).not.toThrow();
  });
  it('publishes six named types at root and subpath and the real SFC declaration', () => {
    const ts = createRequire(resolve('packages/vue/package.json'))('typescript');
    for (const file of ['packages/vue/dist/types/index.d.ts', 'packages/vue/dist/types/combobox/index.d.ts']) {
      const source = ts.createSourceFile('index.d.ts', readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      const names = source.statements.filter((statement: any) => statement.isTypeOnly).flatMap((statement: any) => statement.exportClause.elements.map((element: any) => element.name.text));
      expect(names).toEqual(expect.arrayContaining(['ComboboxProps', 'ComboboxEmits', 'ComboboxExpose', 'ComboboxSize', 'ComboboxInputAttributes', 'ComboboxOptionContext']));
    }
    expect(existsSync('packages/vue/dist/types/combobox/Combobox.vue.d.ts')).toBe(true);
  });
  it('ships self sufficient Combobox CSS with scoped fallbacks and all three sizes', () => {
    const css = readFileSync('packages/vue/dist/combobox/style.css', 'utf8');
    expect(css.trim()).toBe(sass.compile('packages/vue/src/combobox/style.scss', { charset: false }).css.trim());
    expect(css).toContain('zoom-combobox'); expect(css).not.toMatch(/zoom-select|zoom-button|:root/);
    expect(css).toContain('var(--zoom-combobox-');
    expect(css).not.toMatch(/(?:^|[;{]\s*)--zoom-combobox-[a-z-]+\s*:/m);
    for (const size of ['sm', 'md', 'lg']) expect(css).toContain(`data-zoom-size=${size}`);
    expect(readFileSync('packages/vue/dist/style.css', 'utf8')).toContain(css.split('\n')[0]);
  });
  it('checks implementation evidence, CSS references, foreign product exclusion and retained import negatives', () => {
    const graph = { moduleIds: ['/consumer/node_modules/@zoom-design/vue/dist/combobox-abc.js'], chunks: [{ css: ['combobox.css'] }] };
    expect(minimalComboboxEntry('combobox')).toContain("from '@zoom-design/vue/combobox'");
    expect(minimalComboboxEntry('named')).toContain("from '@zoom-design/vue'");
    expect(() => assertComboboxOnlyEvidence(graph, 'zoom-combobox')).not.toThrow();
    for (const foreign of ['zoom-select', 'zoom-button']) expect(() => assertComboboxOnlyEvidence(graph, `zoom-combobox ${foreign}`)).toThrow(/retained Button\/Select/);
    expect(() => assertUnusedComboboxEvidence(graph, 'zoom-combobox')).toThrow(/retained Combobox/);
    expect(() => assertUnusedComboboxEvidence(graph, 'document.body.textContent="unused"')).not.toThrow();
    expect(() => assertUnusedComboboxEvidence({ moduleIds: [] }, '')).toThrow(/never encountered/);
  });
});
