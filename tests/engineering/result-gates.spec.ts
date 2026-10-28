import { expect, it } from 'vitest';

it('T4.2/T4.10 rejects empty, skipped-only, failed and missing-project test reports', async () => {
  const { assertUnitReport } = await import('../../scripts/test-results.mjs');
  const test = { status: 'passed' };
  const core = { name: `${process.cwd()}/packages/core/test/probe.spec.ts`, assertionResults: [test] };
  expect(assertUnitReport({ testResults: [core] }, ['core'])).toEqual({ core: 1 });
  for (const report of [{ testResults: [] }, { testResults: [{ ...core, assertionResults: [{ status: 'pending' }] }] }, { testResults: [{ ...core, assertionResults: [{ status: 'failed' }] }] }]) {
    expect(() => assertUnitReport(report, ['core'])).toThrow();
  }
  expect(() => assertUnitReport({ testResults: [core] }, ['core', 'dom'])).toThrow('dom');
});
