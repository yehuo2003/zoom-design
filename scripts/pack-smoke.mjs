import { mkdirSync, readFileSync, writeFileSync, cpSync, mkdtempSync, existsSync, rmSync, renameSync } from 'node:fs';
import { join, resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { probeNpm } from './check-toolchain.mjs';
import { root, buildPlan, executeStages } from './workspace.mjs';
import { parseArgs, readJson, runBin } from './run-local-bin.mjs';
import { assertIsolatedRoot, assertNoLinks, inside, inspectPackageFiles, readTarball, packRecord, sha256, measureReferencedAssets, publicImportChunk, inspectRuntimeCode } from './pack-contracts.mjs';
import { createConsumer } from './packed-templates.mjs';

const apps = ['platform', 'vue', 'react', 'angular'];
const names = ['core', 'dom', 'vue', 'react', 'angular'];
const base = join(root, '.artifacts/task5');
const save = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); };
const cleanEnv = () => { const env = { ...process.env }; delete env.NODE_PATH; return env; };
function command(state, label, executable, args, cwd, expectFailure = false, pattern) {
  console.log(`[packed] ${label}`);
  const result = spawnSync(executable, args, { cwd, env: cleanEnv(), shell: false, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const log = join(state.reportDirectory, 'logs', `${String(state.commands.length).padStart(3, '0')}-${label.replace(/[^\w.-]/g, '_')}.log`);
  mkdirSync(dirname(log), { recursive: true }); writeFileSync(log, `${result.stdout ?? ''}${result.stderr ?? ''}`);
  const entry = { label, cwd, executable, args, exitCode: result.status ?? 1, log, expectedFailure: expectFailure };
  state.commands.push(entry); save(join(state.reportDirectory, 'state.json'), state);
  if (result.error) throw result.error;
  if (expectFailure ? result.status === 0 || (pattern && !pattern.test(`${result.stdout}${result.stderr}`)) : result.status !== 0) throw Error(`${label}: unexpected exit ${result.status}; see ${log}`);
  console.log(`[packed] ${label}: ${expectFailure ? 'expected rejection' : 'PASS'}`);
  return result;
}
function npm(state, label, args, cwd, expectFailure = false, pattern) {
  const tool = probeNpm();
  return command(state, label, tool.path.endsWith('.js') ? process.execPath : tool.path, [...(tool.path.endsWith('.js') ? [tool.path] : []), ...args, '--workspaces=false', '--cache', join(base, 'npm-cache')], cwd, expectFailure, pattern);
}
function consumerRoot(state) {
  if (!state.consumerRoot) throw Error('Consumers have not been prepared');
  state.consumerRoot = assertIsolatedRoot(state.consumerRoot, root);
  const marker = readJson(join(state.consumerRoot, '.zoom-packed-run.json'));
  if (marker.runId !== state.runId) throw Error('Consumer run marker mismatch');
  return state.consumerRoot;
}
function checkConsumerPaths(state, app) {
  const isolated = consumerRoot(state); const directory = join(isolated, app);
  assertNoLinks(isolated, directory);
  return directory;
}
export async function packPackages(state) {
  await executeStages(buildPlan(), { reportFile: join(state.reportDirectory, 'builds.json') });
  const emitted = runBin(root, 'typescript', 'tsc', ['-p', 'tests/engineering/declarations/tsconfig.emit.json'], 'pipe');
  if (emitted.status !== 0) throw Error(`TS7 declaration fixture emit failed: ${emitted.stdout}${emitted.stderr}`);
  state.declarationProducer = { compiler: '7.0.2', command: 'tsc -p tests/engineering/declarations/tsconfig.emit.json', exitCode: emitted.status };
  const destination = join(state.reportDirectory, 'tarballs'); mkdirSync(destination, { recursive: true });
  state.packages = [];
  for (const name of names) {
    const packageName = `@zoom-design/${name}`;
    const directory = name === 'angular' ? join(root, 'dist/angular') : join(root, 'packages', name);
    const dryRun = npm(state, `${name}-pack-dry-run`, ['pack', '--dry-run', '--json'], directory);
    const dry = packRecord(JSON.parse(dryRun.stdout), packageName);
    const preview = new Map(dry.files.map(file => {
      const path = resolve(directory, file.path);
      assertNoLinks(directory, path);
      return [file.path, readFileSync(path)];
    }));
    inspectPackageFiles(preview, packageName);
    const packed = npm(state, `${name}-pack`, ['pack', '--json', '--pack-destination', destination], directory);
    const record = packRecord(JSON.parse(packed.stdout), packageName);
    if (JSON.stringify(dry.files) !== JSON.stringify(record.files)) throw Error(`${name}: dry-run and packed files differ`);
    const tarball = join(destination, record.filename);
    const inspected = inspectPackageFiles(readTarball(tarball), packageName);
    if (JSON.stringify([...inspected.files.map(file => file.path)].sort()) !== JSON.stringify(record.files.map(file => file.path).sort())) throw Error(`${name}: tar archive and npm file list differ`);
    const entry = { name: packageName, version: inspected.manifest.version, filename: record.filename, tarball, sha256: sha256(readFileSync(tarball)), integrity: record.integrity, shasum: record.shasum, packedSize: record.size, unpackedSize: record.unpackedSize, packDirectory: directory, exports: inspected.manifest.exports, dependencies: inspected.manifest.dependencies ?? {}, peerDependencies: inspected.manifest.peerDependencies ?? {}, files: inspected.files };
    state.packages.push(entry); save(join(state.reportDirectory, 'packages.json'), state.packages);
  }
  state.status = 'packed';
}
export function prepareConsumers(state) {
  for (const entry of state.packages ?? []) if (sha256(readFileSync(entry.tarball)) !== entry.sha256) throw Error(`Tarball changed: ${entry.name}`);
  if (state.packages?.length !== 5) throw Error('Five tarballs required');
  state.consumerRoot = assertIsolatedRoot(mkdtempSync(join(tmpdir(), 'zoom-design-packed-')), root);
  save(join(state.consumerRoot, '.zoom-packed-run.json'), { runId: state.runId, repository: root });
  save(join(state.reportDirectory, 'state.json'), state);
  for (const app of apps) {
    const directory = join(state.consumerRoot, app);
    const packages = state.packages.filter(entry => ['@zoom-design/core', '@zoom-design/dom', '@zoom-design/vue', `@zoom-design/${app}`].includes(entry.name));
    mkdirSync(join(directory, 'vendor'), { recursive: true });
    for (const entry of packages) cpSync(entry.tarball, join(directory, 'vendor', entry.filename));
    createConsumer(root, directory, app, packages);
    command(state, `${app}-preinstall`, process.execPath, ['scripts/verify-consumer.mjs', 'preinstall'], directory);
    npm(state, `${app}-install`, ['install', '--no-audit', '--no-fund'], directory);
    const lock = readFileSync(join(directory, 'package-lock.json')); const lockHash = sha256(lock);
    npm(state, `${app}-ci`, ['ci', '--no-audit', '--no-fund'], directory);
    if (sha256(readFileSync(join(directory, 'package-lock.json'))) !== lockHash) throw Error(`${app}: npm ci changed lockfile`);
    const lockfile = readJson(join(directory, 'package-lock.json'));
    for (const entry of packages) {
      const installed = lockfile.packages[`node_modules/${entry.name}`];
      if (!installed || installed.link || installed.resolved !== `file:vendor/${entry.filename}`) throw Error(`${app}: lockfile not installed from copied tgz: ${entry.name}`);
    }
    save(join(state.reportDirectory, `${app}/install.json`), { lockHash, installedFrom: 'copied tgz', install: 'PASS', ci: 'PASS', directory, manifest: readJson(join(directory, 'package.json')), lockfile });
  }
  state.status = 'installed';
}
function runtimeGraph(state, app, directory) {
  const browser = join(directory, 'browser'); let graph; const imports = {};
  if (app === 'angular') {
    const statsPath = [join(directory, 'browser-stats.json'), join(directory, 'stats.json'), join(browser, 'stats.json')].find(path => existsSync(path));
    if (!statsPath) throw Error('Angular native build stats missing');
    const stats = readJson(statsPath);
    graph = { moduleIds: Object.keys(stats.inputs ?? {}), outputs: stats.outputs };
    const gate = Object.entries(stats.outputs ?? {}).find(([, output]) => Object.keys(output.inputs ?? {}).some(id => id.replaceAll('\\', '/').includes('/@zoom-design/angular/fesm2022/')));
    if (!gate) throw Error('Angular native APF import not found in actual compilation graph');
    imports.angular = `/${gate[0].replaceAll('\\', '/').split('/').pop()}`;
    save(join(state.reportDirectory, `${app}/native-stats.json`), stats);
  } else {
    graph = readJson(join(directory, 'reports/graph-browser.json'));
    for (const name of app === 'platform' ? ['core', 'dom'] : [app]) {
      const gate = publicImportChunk(graph, `@zoom-design/${name}`, state.packages.find(entry => entry.name === `@zoom-design/${name}`).exports);
      imports[name] = `/${gate.fileName}`;
    }
    if (app === 'vue') {
      const exports = state.packages.find(entry => entry.name === '@zoom-design/vue').exports;
      imports.vueButton = `/${publicImportChunk(graph, '@zoom-design/vue', exports, './button').fileName}`;
      imports.vueSelect = `/${publicImportChunk(graph, '@zoom-design/vue', exports, './select').fileName}`;
    }
  }
  for (const raw of graph.moduleIds) {
    const id = raw.replaceAll('\\', '/').split('?')[0];
    if ((isAbsolute(id) || /^[A-Za-z]:\//.test(id)) && !inside(directory, id)) throw Error(`${app}: module graph escaped consumer: ${id}`);
  }
  if (app === 'vue') {
    const forbidden = /\/node_modules\/(?:@zoom-design\/(?:react|angular)|react(?:-dom)?|@angular|typescript|sass|vitest|@vitest|@testing-library)(?:\/|$)|\/apps\//;
    for (const id of graph.moduleIds) if (forbidden.test(id.replaceAll('\\', '/'))) throw Error(`Foreign runtime/compiler in Vue browser graph: ${id}`);
    const installed = readJson(join(directory, 'node_modules/@zoom-design/vue/package.json'));
    for (const name of Object.keys({ ...installed.dependencies, ...installed.peerDependencies })) if (!['vue', '@zoom-design/core', '@zoom-design/dom'].includes(name)) throw Error(`Unexpected Vue runtime dependency ${name}`);
  }
  const families = app === 'vue' ? ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared'] : app === 'react' ? ['react', 'react-dom'] : [];
  const runtimeRoots = {};
  for (const name of families) {
    const roots = new Set(graph.moduleIds.flatMap(id => {
      const normalized = id.replaceAll('\\', '/'); const marker = `/node_modules/${name}/`; const at = normalized.lastIndexOf(marker);
      return at < 0 ? [] : [normalized.slice(0, at + marker.length - 1)];
    }));
    if (roots.size !== 1) throw Error(`${app}: ${name} runtime graph expected one installation, got ${[...roots]}`);
    runtimeRoots[name] = [...roots][0];
  }
  // Each published JS file was inspected independently; no copied runtime code is allowed.
  if (['vue', 'react'].includes(app)) {
    const entry = state.packages.find(entry => entry.name === `@zoom-design/${app}`);
    const scripts = [...readTarball(entry.tarball)].filter(([file]) => /\.js$/.test(file));
    for (const [, code] of scripts) inspectRuntimeCode(app, code.toString());
    if (app === 'vue' && !scripts.some(([, code]) => /from\s*["']vue["']/.test(code.toString()))) throw Error('Vue: public component must use external Vue imports');
  }
  save(join(directory, 'reports/imports.json'), imports);
  save(join(state.reportDirectory, `${app}/module-graph.json`), { ...graph, runtimeRoots, packageImports: imports, policy: app === 'angular' ? 'official APF consumer + peer resolution' : 'native production graph + packed library inspection' });
  if (app === 'vue') {
    const versions = { node: process.version, npm: probeNpm().version, ...readJson(join(directory, '.pack-spec.json')).tools, ...readJson(join(directory, '.pack-spec.json')).runtimes };
    const size = { runId: state.runId, scenario: 'Vue engineering host with lazy theme/Button playgrounds and aggregate CSS', mode: 'packed-production', baselineKind: 'engineering', target: 'es2022; Vite production browser build', versions, ...measureReferencedAssets(browser, readFileSync(join(browser, 'index.html'), 'utf8'), graph.chunks), compression: 'gzip/Brotli default Node zlib, each asset independently compressed; shared chunks deduplicated', excludes: ['source maps', 'SSR server output', 'unreferenced assets', 'node_modules install size'], limitations: 'Includes engineering and playground code; product Button baseline is button-size.json. No equivalent-function comparison or size saving claim.' };
    save(join(state.reportDirectory, 'size-baseline.json'), size); state.sizeBaseline = size;
  }
}
export function verifyConsumers(state) {
  for (const app of apps) {
    const directory = checkConsumerPaths(state, app);
    command(state, `${app}-resolution-before-build`, process.execPath, ['scripts/verify-consumer.mjs'], directory);
    command(state, `${app}-typecheck`, process.execPath, ['scripts/native-check.mjs', 'typecheck'], directory);
    for (const output of ['browser', 'server']) {
      const target = resolve(directory, output);
      if (!inside(directory, target) || target === directory) throw Error('Unsafe consumer output');
      if (existsSync(target)) { assertNoLinks(directory, target); rmSync(target, { recursive: true, force: true }); }
    }
    command(state, `${app}-build`, process.execPath, ['scripts/native-check.mjs', 'build'], directory);
    const result = command(state, `${app}-resolution`, process.execPath, ['scripts/verify-consumer.mjs'], directory);
    save(join(state.reportDirectory, `${app}/resolution.json`), JSON.parse(result.stdout));
    cpSync(join(directory, 'reports'), join(state.reportDirectory, app, 'reports'), { recursive: true });
    runtimeGraph(state, app, directory);
    if (app === 'vue') {
      command(state, 'vue-minimal-button-size', process.execPath, ['scripts/button-size.mjs'], directory);
      state.buttonSize = readJson(join(directory, 'reports/button-size.json'));
      save(join(state.reportDirectory, 'button-size.json'), { runId: state.runId, ...state.buttonSize });
      command(state, 'vue-minimal-select-size', process.execPath, ['scripts/select-size.mjs'], directory);
      state.selectSize = readJson(join(directory, 'reports/select-size.json'));
      save(join(state.reportDirectory, 'select-size.json'), { runId: state.runId, ...state.selectSize });
    }
    npm(state, `${app}-dependency-tree`, ['ls', '--all', '--json'], directory);
  }
  state.status = 'verified';
}
export function verifySassConsumer(state) {
  const directory = assertIsolatedRoot(mkdtempSync(join(tmpdir(), 'zoom-design-sass-')), root);
  state.sassConsumer = directory;
  const packages = state.packages;
  const sass = readJson(join(root, 'package.json')).devDependencies.sass;
  mkdirSync(join(directory, 'vendor'), { recursive: true }); mkdirSync(join(directory, 'scripts'), { recursive: true });
  for (const entry of packages) cpSync(entry.tarball, join(directory, 'vendor', entry.filename));
  save(join(directory, 'package.json'), { name: 'zoom-theme-sass-consumer', private: true, type: 'module', version: '0.0.0', dependencies: Object.fromEntries(packages.map(entry => [entry.name, `file:vendor/${entry.filename}`])), devDependencies: { sass } });
  save(join(directory, '.theme-spec.json'), { runId: state.runId, sass, packages: packages.filter(entry => !['@zoom-design/core', '@zoom-design/dom'].includes(entry.name)).map(entry => entry.name) });
  for (const file of ['pack-contracts.mjs', 'theme-contract.mjs', 'run-local-bin.mjs']) cpSync(join(root, 'scripts', file), join(directory, 'scripts', file));
  cpSync(join(root, 'tests/engineering/packed/theme-check.mjs'), join(directory, 'scripts/theme-check.mjs'));
  npm(state, 'theme-sass-install', ['install', '--no-audit', '--no-fund'], directory);
  command(state, 'theme-sass-contracts', process.execPath, ['scripts/theme-check.mjs'], directory);
  state.theme = readJson(join(directory, 'theme-results.json'));
  save(join(state.reportDirectory, 'theme-sass.json'), { directory, ...state.theme });
}
export function negativeConsumers(state) {
  const platform = checkConsumerPaths(state, 'platform'); const vue = checkConsumerPaths(state, 'vue');
  const cases = [];
  function negative(name, directory, mutate, restore, pattern, phase = 'installed') {
    try {
      mutate();
      const result = command(state, `negative-${name}`, process.execPath, ['scripts/verify-consumer.mjs', phase], directory, true, pattern);
      cases.push({ name, exitCode: result.status, result: 'expected rejection' });
    } finally {
      restore(); command(state, `restored-${name}`, process.execPath, ['scripts/verify-consumer.mjs', phase], directory);
      const entry = cases.find(entry => entry.name === name); if (entry) entry.restored = 'PASS';
      save(join(state.reportDirectory, 'negative.json'), cases);
    }
  }
  const core = state.packages.find(entry => entry.name === '@zoom-design/core');
  const vendor = join(platform, 'vendor', core.filename); const moved = `${vendor}.negative`;
  negative('missing-tgz', platform, () => renameSync(vendor, moved), () => { if (existsSync(moved)) renameSync(moved, vendor); }, /Missing\/changed local tgz/, 'preinstall');
  const manifestPath = join(vue, 'node_modules/@zoom-design/vue/package.json'); const manifestBytes = readFileSync(manifestPath);
  negative('wrong-exports', vue, () => { const manifest = JSON.parse(manifestBytes); manifest.exports['.'].import = './dist/nonexistent.js'; save(manifestPath, manifest); }, () => writeFileSync(manifestPath, manifestBytes), /manifest\/exports mismatch/);
  const css = join(vue, 'node_modules/@zoom-design/vue/dist/style.css'); const movedCSS = `${css}.negative`;
  negative('missing-css', vue, () => renameSync(css, movedCSS), () => { if (existsSync(movedCSS)) renameSync(movedCSS, css); }, /Missing\/changed installed asset.*style.css/);
  const consumerManifest = join(platform, 'package.json'); const consumerBytes = readFileSync(consumerManifest);
  negative('undeclared-dependency', platform, () => { const manifest = JSON.parse(consumerBytes); delete manifest.dependencies['@zoom-design/core']; save(consumerManifest, manifest); }, () => writeFileSync(consumerManifest, consumerBytes), /Missing declared local dependency @zoom-design\/core/, 'preinstall');
  negative('wrong-typescript', vue, () => npm(state, 'negative-install-actual-TS7-in-Vue', ['install', '--no-save', '--package-lock=false', '--no-audit', '--no-fund', 'typescript@7.0.2'], vue), () => npm(state, 'negative-restore-Vue-ci', ['ci', '--no-audit', '--no-fund'], vue), /Wrong tool version typescript.*resolved 7.0.2/);
  const installedVue = join(vue, 'node_modules/@zoom-design/vue');
  for (const [name, target] of [['button-js', 'dist/button/index.js'], ['button-types', 'dist/types/button/index.d.ts'], ['button-css', 'dist/button/style.css'], ['select-js', 'dist/select/index.js'], ['select-types', 'dist/types/select/index.d.ts'], ['select-css', 'dist/select/style.css'], ['theme-css', 'dist/theme.css'], ['theme-partial', 'dist/styles/theme/_defaults.scss']]) {
    const file = join(installedVue, target); const backup = `${file}.negative`;
    negative(`missing-${name}`, vue, () => renameSync(file, backup), () => { if (existsSync(backup)) renameSync(backup, file); }, new RegExp(`Missing/changed installed asset.*${target.replaceAll('.', '\\.')}`));
  }
  for (const [name, subpath, condition] of [['button-js', './button', 'import'], ['button-types', './button', 'types'], ['select-js', './select', 'import'], ['select-types', './select', 'types']]) {
    negative(`wrong-${name}`, vue, () => { const manifest = JSON.parse(manifestBytes); manifest.exports[subpath][condition] = './dist/nonexistent.js'; save(manifestPath, manifest); }, () => writeFileSync(manifestPath, manifestBytes), /manifest\/exports mismatch/);
  }
  const required = ['missing-tgz', 'wrong-exports', 'missing-css', 'undeclared-dependency', 'wrong-typescript', 'missing-button-js', 'missing-button-types', 'missing-button-css', 'missing-select-js', 'missing-select-types', 'missing-select-css', 'missing-theme-css', 'missing-theme-partial', 'wrong-button-js', 'wrong-button-types', 'wrong-select-js', 'wrong-select-types'];
  if (JSON.stringify(cases.map(entry => entry.name).sort()) !== JSON.stringify(required.sort()) || cases.some(entry => entry.restored !== 'PASS')) throw Error('Required named negative classes/restorations did not all execute');
  state.negative = cases;
  state.status = 'negative-verified';
}
function stateFor(runId) {
  if (!/^[0-9a-f-]{36}$/.test(runId)) throw Error('Invalid run id');
  return readJson(join(base, 'runs', runId, 'state.json'));
}
export function latestPackState() {
  const latest = readJson(join(base, 'latest.json'));
  const state = stateFor(latest.runId);
  if (latest.status !== 'passed' || state.status !== 'passed') throw Error('Latest packed consumer run did not pass; run npm run check:pack');
  consumerRoot(state);
  return state;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let state;
  try {
    const { options, args } = parseArgs(process.argv.slice(2), ['--phase', '--run-id']);
    if (args.length) throw Error('Unexpected packed arguments');
    const phase = options['--phase'] ?? 'all';
    if (!['all', 'pack', 'prepare', 'verify', 'negative'].includes(phase)) throw Error('Invalid packed phase');
    if (['all', 'pack'].includes(phase)) {
      if (options['--run-id']) throw Error('New pack cannot reuse a run id');
      const runId = randomUUID();
      state = { runId, status: 'running', startedAt: new Date().toISOString(), reportDirectory: join(base, 'runs', runId), environment: { node: process.version, npm: probeNpm().version, platform: process.platform, tmpdir: tmpdir() }, commands: [] };
    } else state = stateFor(options['--run-id'] ?? readJson(join(base, 'latest.json')).runId);
    save(join(base, 'latest.json'), { runId: state.runId, status: 'running', reportDirectory: state.reportDirectory });
    if (phase === 'all' || phase === 'pack') await packPackages(state);
    if (phase === 'all' || phase === 'prepare') prepareConsumers(state);
    if (phase === 'all' || phase === 'verify') verifyConsumers(state);
    if (phase === 'all' || phase === 'verify') verifySassConsumer(state);
    if (phase === 'all' || phase === 'negative') negativeConsumers(state);
    if (phase === 'all') {
      // The final positive flow happens only after every injected input was restored.
      verifyConsumers(state);
      state.status = 'passed'; state.finishedAt = new Date().toISOString();
    }
    console.log(`[packed] ${state.status}: ${state.consumerRoot ?? state.reportDirectory}`);
  } catch (error) { if (state) { state.status = 'failed'; state.error = error.message; } console.error(error.message); process.exitCode = 1; }
  finally {
    if (state) {
      save(join(state.reportDirectory, 'state.json'), state);
      save(join(base, 'latest.json'), { runId: state.runId, status: state.status, reportDirectory: state.reportDirectory, consumerRoot: state.consumerRoot });
    }
  }
}
