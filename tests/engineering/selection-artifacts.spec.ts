import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runBin } from '../../scripts/run-local-bin.mjs';
import { createRequire } from 'node:module';
import { verifySelectionDiagnostics } from './packed/selection-type-contract.mjs';
const root = process.cwd();

describe('T9.13/T9.14/T9.16 real Core selection artifacts', () => {
  for (const workspace of ['packages/vue', 'packages/core']) {
    it(`${workspace} TS6/TS7 consumes actual public declarations without DOM and rejects nine exact type errors`, () => {
      const base = resolve(root, 'packages/core/test/selection-types');
      const positive = runBin(resolve(root, workspace), 'typescript', 'tsc', ['-p', join(base, 'tsconfig.json')], 'pipe');
      expect(positive.stdout + positive.stderr).toBe(''); expect(positive.status).toBe(0);
      const negative = runBin(resolve(root, workspace), 'typescript', 'tsc', ['-p', join(base, 'tsconfig.negative.json')], 'pipe');
      expect(negative.status).not.toBe(0);
      expect(() => verifySelectionDiagnostics(negative.stdout + negative.stderr)).not.toThrow();
    });
  }
  it('matches all twelve approved erased types and six named functions; all Core JS/declarations stay browser/framework free', () => {
    const ts = createRequire(resolve(root, 'packages/vue/package.json'))('typescript');
    const entry = ts.createSourceFile('index.d.ts', readFileSync('packages/core/dist/index.d.ts', 'utf8'), ts.ScriptTarget.Latest, true);
    const types = entry.statements.filter((statement: any) => statement.isTypeOnly).flatMap((statement: any) => statement.exportClause.elements.map((element: any) => element.name.text)).sort();
    expect(types).toEqual(['OptionValue', 'SelectionValue', 'SelectionOption', 'SelectionReason', 'SelectionChangeDetails', 'QueryChangeReason', 'QueryChangeDetails', 'OpenChangeReason', 'OpenChangeDetails', 'HighlightAction', 'OptionIssue', 'NormalizedOptions'].sort());
    const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(join(directory, item.name)) : [join(directory, item.name)]);
    for (const file of files('packages/core/dist')) expect(readFileSync(file, 'utf8')).not.toMatch(/\b(window|document|HTMLElement|Ref|VNode|ReactNode|TemplateRef)\b|from ["'](?:vue|react|@angular|node:)|\.s?css/);
  });
});
