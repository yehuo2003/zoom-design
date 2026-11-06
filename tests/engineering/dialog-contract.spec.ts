import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { runBin } from '../../scripts/run-local-bin.mjs';
import { verifyDialogDiagnostics, verifyDialogResolution } from './dialog-type-contract.mjs';

const root = process.cwd();
const vue = resolve(root, 'packages/vue');
const core = resolve(root, 'packages/core');
const manifest = JSON.parse(readFileSync(resolve(vue, 'package.json'), 'utf8'));
const ts = createRequire(resolve(vue, 'package.json'))('typescript');

function declaredTypes(file: string): string[] {
  const declaration = ts.createSourceFile(file, readFileSync(resolve(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
  return declaration.statements.filter((statement: any) => statement.isTypeOnly)
    .flatMap((statement: any) => statement.exportClause.elements.map((element: any) => element.name.text)).sort();
}

describe('Task13.9 Dialog public contract', () => {
  it('T13.9.1/T13.9.2 has one runtime instance and rejects unapproved deep imports', () => {
    expect(Object.keys(manifest.exports).sort()).toEqual([
      '.', './button', './button/style.css', './combobox', './combobox/style.css',
      './dialog', './dialog/style.css', './select', './select/style.css',
      './style.css', './theme.css', './theme.scss',
    ].sort());
    expect(manifest.exports['./dialog']).toEqual({ types: './dist/types/dialog/index.d.ts', import: './dist/dialog/index.js' });
    expect(manifest.exports['./dialog/style.css']).toBe('./dist/dialog/style.css');
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      assert.equal(typeof document, 'undefined');
      const [vue, dialog, core, dom] = await Promise.all([
        import('@zoom-design/vue'), import('@zoom-design/vue/dialog'),
        import('@zoom-design/core'), import('@zoom-design/dom'),
      ]);
      assert.deepEqual(Object.keys(vue), ['ZButton', 'ZCombobox', 'ZDialog', 'ZSelect']);
      assert.deepEqual(Object.keys(dialog), ['ZDialog']);
      assert.equal(vue.ZDialog, dialog.ZDialog);
      assert.deepEqual(Object.keys(core), ['filterOptions', 'findTypeaheadMatch', 'getSelectedOption', 'moveHighlight', 'normalizeOptions', 'reconcileHighlight']);
      assert.deepEqual(Object.keys(dom), ['acquireModal', 'createLayerContext', 'createModalContext', 'focusElement', 'getFormOwner', 'isFieldsetDisabled', 'isWithin', 'mountFloating', 'observeFormBridge', 'registerLayer', 'restoreFocus', 'trapFocus']);
      assert.ok(import.meta.resolve('@zoom-design/vue/dialog/style.css').endsWith('/dist/dialog/style.css'));
      for (const path of [
        '@zoom-design/vue/src/dialog/Dialog.vue', '@zoom-design/vue/dialog/Dialog.vue',
        '@zoom-design/vue/dialog/useDialogDom', '@zoom-design/vue/overlay',
        '@zoom-design/vue/src/overlay/session.ts', '@zoom-design/vue/dist/dialog/index.js',
      ]) await assert.rejects(import(path), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
    `], { cwd: root, encoding: 'utf8' });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('T13.9.3/T13.9.5 consumes emitted declarations with TS6 and TS7 and checks exact negative positions', () => {
    const positive = resolve(vue, 'test/dialog-types/tsconfig.ts.json');
    const negative = resolve(vue, 'test/dialog-types/tsconfig.ts.negative.json');
    for (const workspace of [vue, core]) {
      const result = runBin(workspace, 'typescript', 'tsc', ['-p', positive, '--listFilesOnly'], 'pipe');
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(() => verifyDialogResolution(result.stdout)).not.toThrow();
      const pass = runBin(workspace, 'typescript', 'tsc', ['-p', positive], 'pipe');
      expect(pass.status, pass.stdout + pass.stderr).toBe(0);
      const fail = runBin(workspace, 'typescript', 'tsc', ['-p', negative], 'pipe');
      expect(fail.status).not.toBe(0);
      expect(() => verifyDialogDiagnostics(fail.stdout + fail.stderr)).not.toThrow();
    }
  });

  it('T13.9.4/T13.9.5 compiles real SFC slots/expose and rejects precise SFC errors', () => {
    const run = (config: string) => spawnSync(process.execPath, [resolve(root, 'scripts/run-vue-tsc.mjs'), '--workspace', vue, '--', '-p', config], { cwd: vue, encoding: 'utf8', shell: false });
    const pass = run('test/dialog-types/tsconfig.json');
    expect(pass.status, pass.stdout + pass.stderr).toBe(0);
    const fail = run('test/dialog-types/tsconfig.negative.json');
    expect(fail.status).not.toBe(0);
    expect(() => verifyDialogDiagnostics(fail.stdout + fail.stderr, true)).not.toThrow();
    expect(() => verifyDialogDiagnostics("Invalid.vue(1,1): error TS2307: Cannot find module '@zoom-design/vue/dialog'.", true)).toThrow();
  });

  it('T13.9.1/T13.9.5 freezes Core and DOM type lists and Dialog signatures', () => {
    expect(declaredTypes('packages/core/dist/index.d.ts')).toEqual([
      'OptionValue', 'SelectionValue', 'SelectionOption', 'SelectionReason', 'SelectionChangeDetails',
      'QueryChangeReason', 'QueryChangeDetails', 'OpenChangeReason', 'OpenChangeDetails',
      'HighlightAction', 'OptionIssue', 'NormalizedOptions', 'DialogCloseReason', 'DialogCloseDetails',
    ].sort());
    expect(declaredTypes('packages/dom/dist/index.d.ts')).toEqual([
      'Cleanup', 'Placement', 'FloatingOptions', 'FloatingHandle', 'LayerContext',
      'LayerOptions', 'LayerHandle', 'RegisteredLayerHandle', 'ModalContext',
      'ManagedModalContext', 'ModalOptions', 'ModalHandle', 'FocusTrapOptions',
      'FormBridgeOptions', 'FormBridgeHandle',
    ].sort());
    const close = readFileSync(resolve(root, 'packages/core/dist/dialog/types.d.ts'), 'utf8');
    expect(close).toMatch(/'escape'\s*\|\s*'outside'\s*\|\s*'close-button'/);
    for (const field of ['open: false', 'previousOpen: true', 'reason: DialogCloseReason']) expect(close).toContain(`readonly ${field}`);
    const domTypes = readFileSync(resolve(root, 'packages/dom/dist/types.d.ts'), 'utf8');
    expect(domTypes).toContain('updateNodes(nodes: readonly HTMLElement[]): void');
    expect(domTypes).toContain('updateAllowedNodes(nodes: readonly HTMLElement[]): void');
    expect(domTypes).toContain('batch<T>(action: () => T, afterCommit?: () => void): T');
  });
});
