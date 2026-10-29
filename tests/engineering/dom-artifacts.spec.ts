import { it, expect } from 'vitest';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runBin } from '../../scripts/run-local-bin.mjs';
import { verifyDOMDiagnostics } from './packed/dom-type-contract.mjs';
for (const workspace of ['packages/vue', 'packages/core']) it(`T10.16 ${workspace} TS6/TS7 consumes real DOM declarations and rejects seven precise errors`, () => {
  const base = resolve('packages/dom/test/dom-types');
  const positive = runBin(resolve(workspace), 'typescript', 'tsc', ['-p', resolve(base, 'tsconfig.json')], 'pipe');
  expect(positive.stdout + positive.stderr).toBe(''); expect(positive.status).toBe(0);
  const negative = runBin(resolve(workspace), 'typescript', 'tsc', ['-p', resolve(base, 'tsconfig.negative.json')], 'pipe');
  expect(negative.status).not.toBe(0); expect(() => verifyDOMDiagnostics(negative.stdout + negative.stderr)).not.toThrow();
});
it('T10.1/2 public Node import has no browser effects and every browser operation fails clearly', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', "import {verifyDOMNode} from './tests/engineering/packed/dom-type-contract.mjs'; verifyDOMNode(await import('@zoom-design/dom'));"], { encoding: 'utf8' });
  expect(result.stderr).toBe(''); expect(result.status).toBe(0);
});
it('T10.16 exposes only the twelve approved erased DOM types', () => {
  const ts = createRequire(resolve('packages/vue/package.json'))('typescript');
  const entry = ts.createSourceFile('index.d.ts', readFileSync('packages/dom/dist/index.d.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const types = entry.statements.filter((s: any) => s.isTypeOnly).flatMap((s: any) => s.exportClause.elements.map((e: any) => e.name.text)).sort();
  expect(types).toEqual(['Cleanup', 'Placement', 'FloatingOptions', 'FloatingHandle', 'LayerContext', 'LayerOptions', 'LayerHandle', 'ModalContext', 'ModalOptions', 'FocusTrapOptions', 'FormBridgeOptions', 'FormBridgeHandle'].sort());
});
