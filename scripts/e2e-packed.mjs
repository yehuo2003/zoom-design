import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { writeFileSync, readFileSync, cpSync, mkdirSync } from 'node:fs';
import { latestPackState } from './pack-smoke.mjs';
import { parseArgs } from './run-local-bin.mjs';
import { root } from './workspace.mjs';
import { e2eSelection } from './e2e-plan.mjs';

let report; let destination;
try {
  const { options, args } = parseArgs(process.argv.slice(2), ['--package', '--browser']);
  if (args.length) throw Error('Unexpected packed E2E arguments');
  const state = latestPackState();
  const browser = options['--browser'] ?? 'all'; const selection = options['--package'] ?? 'all';
  e2eSelection({ mode: 'packed', package: selection, browser, consumerRoot: state.consumerRoot });
  destination = join(state.reportDirectory, `e2e-${selection}-${browser}`); mkdirSync(destination, { recursive: true });
  report = { runId: state.runId, consumerRoot: state.consumerRoot, browser, selection, exitCode: 1 };
  writeFileSync(join(destination, 'summary.json'), JSON.stringify(report, null, 2));
  for (const app of ['platform', 'vue', 'react', 'angular']) {
    const result = spawnSync(process.execPath, ['scripts/verify-consumer.mjs'], { cwd: join(state.consumerRoot, app), encoding: 'utf8', shell: false });
    if (result.status !== 0) throw Error(`${app}: packed input changed after acceptance\n${result.stdout}${result.stderr}`);
  }
  const result = spawnSync(process.execPath, ['scripts/e2e.mjs', '--mode', 'packed', '--consumer-root', state.consumerRoot, '--package', selection, '--browser', browser], { cwd: root, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  report.exitCode = result.status ?? 1;
  if (result.status !== 0) throw Object.assign(Error('Packed E2E failed'), { exitCode: report.exitCode });
  const source = join(root, `.artifacts/task4/playwright/packed/${selection}-${browser}`);
  cpSync(source, join(destination, 'playwright'), { recursive: true });
  report.counts = JSON.parse(readFileSync(join(source, 'counts.json'), 'utf8'));
  report.finishedAt = new Date().toISOString();
} catch (error) { if (report) { report.exitCode = error.exitCode ?? 1; report.error = error.message; } console.error(error.message); process.exitCode = error.exitCode ?? 1; }
finally { if (destination && report) writeFileSync(join(destination, 'summary.json'), JSON.stringify(report, null, 2) + '\n'); }
