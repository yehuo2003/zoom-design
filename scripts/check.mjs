import { join } from 'node:path';
import { parseArgs } from './run-local-bin.mjs';
import { root, qualityPlan, executeStages } from './workspace.mjs';
try {
  const { options, args } = parseArgs(process.argv.slice(2), ['--package']);
  if (args.length) throw Error('Unexpected check arguments');
  await executeStages(qualityPlan('check', options['--package']), { reportFile: join(root, `.artifacts/task4/workspace/check-${options['--package'] ?? 'all'}.json`) });
} catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1; }
