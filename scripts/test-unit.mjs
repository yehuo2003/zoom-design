import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBin, parseArgs } from './run-local-bin.mjs';
import { root, selectedPackages } from './workspace.mjs';
import { assertUnitReport } from './test-results.mjs';
import { spawnSync } from 'node:child_process';

try {
  const argv = process.argv.slice(2);
  const coverage = argv.includes('--coverage');
  const standalone = argv.includes('--standalone');
  const { options, args } = parseArgs(argv.filter(arg => !['--coverage', '--standalone'].includes(arg)), ['--package']);
  if (args.length || (standalone && !options['--package'])) throw Error('Expected [--package name] [--standalone] [--coverage]');
  const names = selectedPackages(options['--package']);
  const nativeProjects = names.filter(name => name !== 'angular');
  if (nativeProjects.length) process.env.ZOOM_UNIT_PACKAGES = nativeProjects.join(',');
  const projects = [...(standalone ? [] : ['engineering']), ...names.filter(name => name !== 'angular')];
  const directory = join(root, `.artifacts/task4/unit/${standalone ? 'standalone-' : ''}${options['--package'] ?? 'all'}${coverage ? '-coverage' : ''}`);
  mkdirSync(directory, { recursive: true });
  const counts = {};
  if (projects.length) {
    const reportFile = join(directory, 'vitest.json');
    rmSync(reportFile, { force: true });
    const cliArgs = ['run', '--config', join(root, 'vitest.config.ts'), ...projects.flatMap(name => ['--project', name]), '--reporter=default', '--reporter=json', '--outputFile', reportFile];
    if (coverage && nativeProjects.length) cliArgs.push('--coverage');
    const result = runBin(root, 'vitest', 'vitest', cliArgs);
    if (result.status !== 0) throw Object.assign(Error('Vitest project run failed'), { exitCode: result.status ?? 1 });
    Object.assign(counts, assertUnitReport(JSON.parse(readFileSync(reportFile, 'utf8')), projects, root));
  }
  if (names.includes('angular')) {
    const result = spawnSync(process.execPath, [join(root, 'scripts/test-angular.mjs'), ...(coverage ? ['--coverage'] : [])], { cwd: root, stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) throw Object.assign(Error('Angular official unit builder failed'), { exitCode: result.status ?? 1 });
    Object.assign(counts, JSON.parse(readFileSync(join(root, '.artifacts/task4/unit/angular-counts.json'), 'utf8')));
  }
  writeFileSync(join(directory, 'counts.json'), JSON.stringify(counts, null, 2) + '\n');
  console.log(`Unit gate passed: ${JSON.stringify(counts)}`);
  if (coverage) {
    const result = spawnSync(process.execPath, [join(root, 'scripts/coverage-report.mjs'), ...names], { cwd: root, stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) throw Error('Production coverage gate failed');
  }
} catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1; }
