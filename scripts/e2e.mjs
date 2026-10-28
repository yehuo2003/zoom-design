import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { runBin, parseArgs } from './run-local-bin.mjs';
import { root, buildPlan, executeStages } from './workspace.mjs';
import { e2eSelection } from './e2e-plan.mjs';

try {
  const { options, args } = parseArgs(process.argv.slice(2), ['--mode', '--package', '--browser', '--consumer-root']);
  if (args.length) throw Error('Unexpected E2E arguments');
  const plan = e2eSelection({ mode: options['--mode'], package: options['--package'], browser: options['--browser'], consumerRoot: options['--consumer-root'] });
  const directory = join(root, `.artifacts/task4/playwright/${plan.mode}/${plan.selection}-${options['--browser'] ?? 'chromium'}`);
  mkdirSync(directory, { recursive: true });
  if (plan.mode === 'workspace') {
    const builds = plan.selection === 'all' ? buildPlan() : plan.selection === 'platform' || ['core', 'dom'].includes(plan.selection) ? buildPlan('dom') : buildPlan(plan.selection);
    if (plan.suites.includes('angular')) builds.push({ package: 'angular', script: 'build', kind: 'app' });
    await executeStages(builds, { reportFile: join(directory, 'builds.json') });
  }
  process.env.ZOOM_SMOKE_RUN_ID = randomUUID();
  process.env.ZOOM_SMOKE_PACKAGE = plan.selection;
  process.env.ZOOM_SMOKE_BROWSER = options['--browser'] ?? 'chromium';
  process.env.ZOOM_SMOKE_MODE = plan.mode;
  if (options['--consumer-root']) process.env.ZOOM_SMOKE_CONSUMER_ROOT = options['--consumer-root'];
  else delete process.env.ZOOM_SMOKE_CONSUMER_ROOT;
  const file = join(directory, 'results.json');
  rmSync(file, { force: true });
  const result = runBin(root, '@playwright/test', 'playwright', ['test', '--config', join(root, 'playwright.config.ts')]);
  if (result.status !== 0) throw Object.assign(Error('Playwright run failed'), { exitCode: result.status ?? 1 });
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const counts = {};
  function visit(suites) {
    for (const suite of suites ?? []) {
      for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
        if (test.status !== 'expected' || test.results?.length !== 1 || test.results[0].status !== 'passed') throw Error(`Non-passing/retried test: ${test.projectName} ${spec.title}`);
        counts[test.projectName] = (counts[test.projectName] ?? 0) + 1;
      }
      visit(suite.suites);
    }
  }
  visit(report.suites);
  if (report.errors?.length) throw Error('Playwright global errors');
  for (const project of plan.projects) if ((counts[project] ?? 0) < 2) throw Error(`${project}: fewer than two executed engineering scenarios`);
  writeFileSync(join(directory, 'counts.json'), JSON.stringify(counts, null, 2) + '\n');
  console.log(`E2E gate passed: ${JSON.stringify(counts)}`);
} catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1; }
