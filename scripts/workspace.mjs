import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { probeNpm } from './check-toolchain.mjs';
import { parseArgs } from './run-local-bin.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const packages = ['core', 'dom', 'vue', 'react', 'angular'];
export function selectedPackages(selection) {
  if (selection !== undefined && !packages.includes(selection)) throw Error(`Unknown package ${selection}`);
  return selection ? [selection] : [...packages];
}
const stage = (name, script, kind = 'package') => ({ package: name, script, kind });
export function buildPlan(selection) {
  const names = selectedPackages(selection);
  if (selection === 'dom') names.unshift('core');
  if (selection === 'vue') names.unshift('core', 'dom');
  return names.map(name => stage(name, 'build'));
}
function typePlan(selection) {
  const names = selectedPackages(selection);
  const apps = [...new Set(names.map(name => ['core', 'dom'].includes(name) ? 'platform' : name))];
  return [...names.map(name => stage(name, 'typecheck')), ...apps.map(name => stage(name, 'typecheck', 'app'))];
}
const nodeStage = (label, args) => ({ package: label, kind: 'node', args });
export function qualityPlan(action, selection) {
  selectedPackages(selection);
  const allPreparation = [...buildPlan(), ...typePlan()];
  const unit = coverage => nodeStage(coverage ? 'coverage' : 'unit', ['scripts/test-unit.mjs', ...(selection ? ['--package', selection] : []), ...(coverage ? ['--coverage'] : [])]);
  if (action === 'build') return buildPlan(selection);
  if (action === 'typecheck') {
    const needsPlatform = selection === 'angular';
    const preparation = selection === 'core' ? buildPlan('dom') : needsPlatform ? [...buildPlan('dom'), ...buildPlan(selection)] : buildPlan(selection);
    return [...preparation, ...typePlan(selection)];
  }
  // Global engineering contracts read every package's real artifacts. Their build/type
  // prerequisites remain global; only selected package unit tests are executed below.
  if (action === 'unit' || action === 'coverage') return [...allPreparation, unit(action === 'coverage')];
  if (action === 'check') return [nodeStage('versions', ['scripts/check-toolchain.mjs']), ...allPreparation, nodeStage('platform declarations', ['scripts/check-platform.mjs']), unit(false)];
  throw Error(`Unknown workspace action ${action}`);
}
export async function executeStages(stages, { root: workspaceRoot = root, reportFile = join(root, '.artifacts/task4/workspace/latest.json') } = {}) {
  const report = { environment: { node: process.version, platform: process.platform }, stages: [] };
  mkdirSync(dirname(reportFile), { recursive: true });
  const npm = probeNpm();
  try {
    for (const entry of stages) {
      let result;
      const recorded = { ...entry, exitCode: 1 };
      report.stages.push(recorded);
      console.log(`[workspace] ${entry.package}: ${entry.script ?? entry.kind}`);
      if (entry.kind === 'node') result = spawnSync(process.execPath, entry.args, { cwd: workspaceRoot, stdio: 'inherit', shell: false });
      else {
        const directory = join(workspaceRoot, entry.kind === 'app' ? `apps/${entry.package}-smoke` : `packages/${entry.package}`);
        const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
        if (!manifest.scripts?.[entry.script]) throw Error(`${entry.package}: missing required script ${entry.script}`);
        const npmArgs = ['run', entry.script, '--workspace', manifest.name];
        result = spawnSync(npm.path.endsWith('.js') ? process.execPath : npm.path, npm.path.endsWith('.js') ? [npm.path, ...npmArgs] : npmArgs, { cwd: workspaceRoot, stdio: 'inherit', shell: false });
      }
      const exitCode = result.status ?? 1;
      Object.assign(recorded, { exitCode, signal: result.signal, error: result.error?.message });
      console.log(`[workspace] ${entry.package}: exitCode=${exitCode}`);
      if (result.error || exitCode !== 0) throw Object.assign(Error(`${entry.package}: ${entry.script ?? entry.kind} failed (${exitCode})`), { exitCode });
    }
  } catch (error) { report.error = error.message; throw error; }
  finally { writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n'); }
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [action, ...argv] = process.argv.slice(2);
    const { options, args } = parseArgs(argv, ['--package']);
    if (args.length) throw Error('Unexpected arguments');
    const selection = options['--package'];
    await executeStages(qualityPlan(action, selection), { reportFile: join(root, `.artifacts/task4/workspace/${action}-${selection ?? 'all'}.json`) });
  } catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1; }
}
