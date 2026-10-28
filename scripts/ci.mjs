import { join } from 'node:path';
import { parseArgs } from './run-local-bin.mjs';
import { root, executeStages } from './workspace.mjs';
import { e2eSelection } from './e2e-plan.mjs';

try {
  const { options, args } = parseArgs(process.argv.slice(2), ['--package', '--browser']);
  if (args.length) throw Error('Unexpected CI arguments');
  const selection = options['--package'];
  const browser = options['--browser'] ?? 'all';
  e2eSelection({ package: selection, browser });
  const filter = selection ? ['--package', selection] : [];
  await executeStages([
    { package: 'check', kind: 'node', args: ['scripts/check.mjs', ...filter] },
    { package: 'coverage', kind: 'node', args: ['scripts/test-unit.mjs', ...filter, '--coverage'] },
    { package: 'e2e', kind: 'node', args: ['scripts/e2e.mjs', '--mode', 'workspace', '--browser', browser, ...filter] },
    ...(!selection ? [
      { package: 'pack', kind: 'node', args: ['scripts/pack-smoke.mjs'] },
      { package: 'packed e2e', kind: 'node', args: ['scripts/e2e-packed.mjs', '--browser', browser] },
    ] : []),
  ], { reportFile: join(root, `.artifacts/task4/ci/${selection ?? 'all'}-${browser}.json`) });
} catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1; }
