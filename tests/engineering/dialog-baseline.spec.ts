import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runBin } from '../../scripts/run-local-bin.mjs';
import { verifyDialogDiagnostics } from './dialog-type-contract.mjs';

const root = process.cwd();
const fixture = resolve(root, 'packages/vue/test/dialog-types');

describe('Task13.1/13.9 Dialog public contract', () => {
  for (const workspace of ['packages/vue', '.']) {
    it(`T13.1.5/6 ${workspace} TypeScript accepts the public API and rejects unsupported calls`, () => {
      const base = resolve(root, workspace);
      const positive = runBin(base, 'typescript', 'tsc', ['-p', resolve(fixture, 'tsconfig.ts.json')], 'pipe');
      expect(positive.stdout + positive.stderr).toBe('');
      expect(positive.status).toBe(0);

      const negative = runBin(base, 'typescript', 'tsc', ['-p', resolve(fixture, 'tsconfig.ts.negative.json')], 'pipe');
      const output = negative.stdout + negative.stderr;
      expect(negative.status).not.toBe(0);
      expect(output).not.toMatch(/TS2305|TS2307/);
      expect(() => verifyDialogDiagnostics(output)).not.toThrow();
    });
  }

  it('T13.1.7 resolves the pinned TypeScript split from ordinary workspace paths', () => {
    const installed = (workspace: string) => createRequire(resolve(root, workspace, 'package.json'))('typescript/package.json').version;
    expect(installed('.')).toBe('7.0.2');
    expect(installed('packages/core')).toBe('7.0.2');
    expect(installed('packages/dom')).toBe('7.0.2');
    expect(installed('packages/react')).toBe('7.0.2');
    expect(installed('packages/vue')).toBe('6.0.3');
    expect(installed('packages/angular')).toBe('6.0.3');
  });

  it('T13.1.8/13.2 keeps Dialog declarations explicit while exposing the Vue shell', () => {
    const source = readFileSync(resolve(root, 'packages/vue/src/index.ts'), 'utf8');
    expect(source).toContain("export { ZDialog } from './dialog'");
    expect(source).toContain("export type { DialogProps, DialogEmits, DialogExpose, DialogSlots, DialogCloseSlotContext, DialogPanelAttributes } from './dialog'");
    expect(source).not.toMatch(/ZReactDialog|ZAngularDialog/);
  });
});
