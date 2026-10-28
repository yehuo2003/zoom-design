import { afterEach, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
it('T4.9 keeps a fully covered private probe separate from an empty public API', async () => {
  const { classifyCoverage } = await import('../../scripts/coverage-report.mjs');
  const root = mkdtempSync(join(tmpdir(), 'zoom-coverage-')); roots.push(root);
  mkdirSync(join(root, 'packages/core/src'), { recursive: true });
  writeFileSync(join(root, 'packages/core/src/index.ts'), 'export {};');
  const coverage = { [join(root, 'packages/core/test/fixtures/state.ts')]: { s: { 0: 1 }, f: { 0: 1 }, b: { 0: [1, 1] }, statementMap: { 0: { start: { line: 1 }, end: { line: 1 } } } } };
  const report = classifyCoverage('core', coverage, root);
  expect(report.production.status).toBe('N/A');
  expect(report.probes.metrics.statements).toEqual({ covered: 1, total: 1, percent: 100 });
  expect(report.production.files).toEqual([]);
  writeFileSync(join(root, 'packages/core/src/index.ts'), 'export function answer() { return 42; }');
  expect(() => classifyCoverage('core', coverage, root)).toThrow('production');
});
it('T7.39 classifies erased types and barrels by emitted AST while missing executable files fail', async () => {
  const { classifyCoverage } = await import('../../scripts/coverage-report.mjs');
  const root = mkdtempSync(join(tmpdir(), 'zoom-coverage-')); roots.push(root);
  const directory = join(root, 'packages/vue/src'); mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'types.ts'), 'export interface Props { disabled?: boolean }; export type Size = "sm" | "md";');
  writeFileSync(join(directory, 'index.ts'), 'export { ZButton } from "./button"; export type { Props } from "./types";');
  const coverage = { [join(root, 'packages/vue/test/fixtures/probe.ts')]: { s: { 0: 1 }, f: { 0: 1 }, b: { 0: [1] }, statementMap: { 0: { start: { line: 1 } } } } };
  const report = classifyCoverage('vue', coverage, root);
  expect(report.production.status).toBe('N/A'); expect(report.production.classification.excluded).toHaveLength(2);
  expect(report.production.classification.compiler.version).toBe('6.0.3');
  writeFileSync(join(directory, 'types.ts'), 'export interface Props {}; export function hidden() { return 42; }');
  expect(() => classifyCoverage('vue', coverage, root)).toThrow(/production source has no coverage.*types\.ts/);
  writeFileSync(join(directory, 'types.ts'), 'export type Props = string;');
  writeFileSync(join(directory, 'index.ts'), 'import "./side-effect"; export { ZButton } from "./button";');
  expect(() => classifyCoverage('vue', coverage, root)).toThrow(/production source has no coverage.*index\.ts/);
});
