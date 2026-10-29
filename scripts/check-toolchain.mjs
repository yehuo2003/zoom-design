import semver from 'semver';
import { mkdirSync, writeFileSync, existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { packagePath, readJson, runBin } from './run-local-bin.mjs';
import { resolveVueCompiler } from './run-vue-tsc.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exact = value => typeof value === 'string' && semver.valid(value) === value && !semver.prerelease(value);
const safeSatisfies = (version, range) => Boolean(semver.valid(version) && semver.validRange(range) && semver.satisfies(version, range));

export function validatePublicationContract(workspace, manifest, license, rootLicense) {
  const errors = [];
  const packageName = /^packages\/(core|dom|vue|react|angular)$/.exec(workspace)?.[1];
  if (packageName) {
    if (manifest.private !== false) errors.push(`${workspace}: published package must set private:false`);
    if (manifest.name !== `@zoom-design/${packageName}`) errors.push(`${workspace}: invalid public name`);
    if (manifest.author !== 'linzhuming') errors.push(`${workspace}: invalid author`);
    if (manifest.license !== 'MIT') errors.push(`${workspace}: license must be MIT`);
    if (manifest.publishConfig?.access !== 'public') errors.push(`${workspace}: publish access must be public`);
  } else if (manifest.private !== true) errors.push(`${workspace}: root/apps must remain private`);
  if (!exact(manifest.version)) errors.push(`${workspace}: version must be exact stable`);
  const normalize = value => String(value ?? '').replaceAll('\r\n', '\n').trim();
  if (normalize(license) !== normalize(rootLicense) || !normalize(rootLicense).includes('Copyright (c) 2026 linzhuming')
    || !normalize(rootLicense).includes('Permission is hereby granted, free of charge')
    || !normalize(rootLicense).includes('THE SOFTWARE IS PROVIDED "AS IS"')
    || !normalize(rootLicense).includes('IN AN ACTION OF CONTRACT, TORT OR OTHERWISE')) errors.push(`${workspace}: missing or invalid MIT LICENSE`);
  return errors;
}

export function probeNpm(env = process.env, nodePath = process.execPath, platform = process.platform) {
  const invoke = (executable, args, path) => {
    const result = spawnSync(executable, args, { env, encoding: 'utf8', shell: false });
    return { version: result.status === 0 ? result.stdout.trim() : null, path };
  };
  if (env.npm_execpath) return invoke(nodePath, [env.npm_execpath, '--version'], env.npm_execpath);
  const pathValue = Object.entries(env).find(([key]) => key.toLowerCase() === 'path')?.[1] ?? '';
  for (const entry of pathValue.split(platform === 'win32' ? ';' : ':').filter(Boolean)) {
    const directory = entry.replace(/^"|"$/g, '');
    if (platform === 'win32') {
      const executable = join(directory, 'npm.exe');
      if (existsSync(executable)) return invoke(executable, ['--version'], executable);
      if (existsSync(join(directory, 'npm.cmd'))) {
        const cli = [join(directory, 'node_modules/npm/bin/npm-cli.js'), join(directory, 'npm-cli.js')].find(existsSync);
        if (!cli) return { version: null, path: join(directory, 'node_modules/npm/bin/npm-cli.js') };
        return invoke(nodePath, [cli, '--version'], cli);
      }
    } else if (existsSync(join(directory, 'npm'))) {
      const cli = realpathSync(join(directory, 'npm'));
      return invoke(nodePath, [cli, '--version'], cli);
    }
  }
  const cli = join(dirname(nodePath), 'node_modules/npm/bin/npm-cli.js');
  return existsSync(cli) ? invoke(nodePath, [cli, '--version'], cli) : { version: null, path: null };
}

export function validateWorkspaceContract(workspace, manifest, locked) {
  const errors = [];
  const peers = {
    'packages/vue': { vue: '~3.5.44' },
    'packages/react': { react: '~19.3.1', 'react-dom': '~19.3.1' },
    'packages/angular': { '@angular/core': '~22.2.3', '@angular/common': '~22.2.3', rxjs: '~7.8.2', tslib: '~2.8.1' },
  };
  for (const [name, range] of Object.entries(peers[workspace] ?? {})) {
    if (manifest.peerDependencies?.[name] !== range || manifest.peerDependenciesMeta?.[name]?.optional) errors.push(`${workspace}: public peer ${name} must require ${range}`);
  }
  if (workspace === 'packages/dom' && manifest.dependencies?.['@zoom-design/core'] !== '0.0.0') errors.push(`${workspace}: runtime dependency @zoom-design/core must be 0.0.0`);
  if (workspace === 'packages/vue') for (const name of ['@zoom-design/core', '@zoom-design/dom']) if (manifest.dependencies?.[name] !== '0.0.0') errors.push(`${workspace}: runtime dependency ${name} must be 0.0.0`);
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
    const sorted = value => Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b));
    if (JSON.stringify(sorted(manifest[field])) !== JSON.stringify(sorted(locked?.[field]))) errors.push(`${workspace}: lock ${field} mismatch`);
  }
  return errors;
}

export function validateSnapshot(snapshot) {
  const errors = [];
  const records = snapshot.packages ?? [];
  const selected = (workspace, name) => records.find(row => row.workspace === workspace && row.package === name)
    ?? records.find(row => row.workspace === '.' && row.package === name);
  if (!Number.isFinite(Date.parse(snapshot.checkedAt))) errors.push('snapshot: invalid checkedAt');
  for (const [name, value] of Object.entries({ node: snapshot.node?.selectedVersion, npm: snapshot.npm?.selectedVersion })) {
    if (!exact(value)) errors.push(`${name}: expected exact stable version`);
  }
  const keys = new Set();
  for (const row of records) {
    const label = `${row.workspace}: ${row.package}`;
    const key = `${row.workspace}/${row.package}`;
    if (keys.has(key)) errors.push(`${label}: duplicate snapshot entry`);
    keys.add(key);
    if (!exact(row.selectedVersion)) errors.push(`${label}: expected exact stable version`);
    if (!exact(row.latestStable)) errors.push(`${label}: invalid latestStable`);
    if (!row.source?.startsWith('https://registry.npmjs.org/')) errors.push(`${label}: missing official source`);
    if (!Number.isFinite(Date.parse(row.publishedAt)) || Date.parse(row.publishedAt) > Date.parse(snapshot.checkedAt)) errors.push(`${label}: invalid publishedAt`);
    if (row.deprecated) errors.push(`${label}: deprecated: ${row.deprecated}`);
    const compatibleTS = row.package === 'typescript' && /(?:packages|apps)\/(?:vue|angular)(?:-smoke)?$/.test(row.workspace);
    if (compatibleTS && (row.selectedVersion !== '6.0.3' || !row.reason)) errors.push(`${label}: requires TypeScript 6.0.3 with compatibility reason`);
    if (row.package === 'typescript' && !compatibleTS && row.selectedVersion !== '7.0.2') errors.push(`${label}: requires TypeScript 7.0.2`);
    if (row.selectedVersion !== row.latestStable && !(compatibleTS && row.reason)) errors.push(`${label}: older than latestStable without an allowed exception`);
    for (const [engine, range] of Object.entries(row.engines ?? {})) {
      if (['node', 'npm'].includes(engine) && !safeSatisfies(snapshot[engine]?.selectedVersion, range)) errors.push(`${label}: engine ${engine} requires ${range}`);
    }
    for (const [peer, range] of Object.entries(row.peers ?? {})) {
      const dependency = selected(row.workspace, peer);
      if (!dependency && row.peerMeta?.[peer]?.optional) continue;
      if (!dependency || !safeSatisfies(dependency.selectedVersion, range)) errors.push(`${label}: peer ${peer} requires ${range}; selected ${dependency?.selectedVersion ?? 'missing'}`);
    }
  }
  const vitest = selected('.', 'vitest'); const coverage = selected('.', '@vitest/coverage-v8');
  if (vitest?.selectedVersion !== coverage?.selectedVersion) errors.push('.: vitest / coverage versions must match');
  return errors;
}

export function inspectToolchain(directory = root) {
  const snapshot = readJson(join(directory, 'docs/engineering/versions-2026-10-29.json'));
  const errors = validateSnapshot(snapshot); const resolved = []; const compilers = []; const angular = [];
  const manifest = readJson(join(directory, 'package.json'));
  const lock = readJson(join(directory, 'package-lock.json'));
  const runtime = { node: process.versions.node, npm: null, nodePath: process.execPath };
  if (runtime.node !== snapshot.node.selectedVersion) errors.push(`runtime node: ${runtime.node}; expected ${snapshot.node.selectedVersion}`);
  const npm = probeNpm(); runtime.npm = npm.version; runtime.npmPath = npm.path;
  if (runtime.npm !== snapshot.npm.selectedVersion) errors.push(`runtime npm: ${runtime.npm ?? 'unresolved'}; expected ${snapshot.npm.selectedVersion}`);
  if (manifest.packageManager !== `npm@${snapshot.npm.selectedVersion}`) errors.push('.: packageManager mismatch');
  if (manifest.volta?.node !== snapshot.node.selectedVersion || manifest.volta?.npm !== snapshot.npm.selectedVersion) errors.push('.: Volta runtime pin mismatch');
  if (readFileSync(join(directory, '.node-version'), 'utf8').trim() !== snapshot.node.selectedVersion) errors.push('.node-version mismatch');
  const npmrc = readFileSync(join(directory, '.npmrc'), 'utf8');
  for (const setting of ['save-exact=true', 'engine-strict=true']) if (!npmrc.split(/\r?\n/).includes(setting)) errors.push(`.npmrc missing ${setting}`);
  const workspaces = ['.', ...['core', 'dom', 'vue', 'react', 'angular'].map(n => `packages/${n}`), ...['platform', 'vue', 'react', 'angular'].map(n => `apps/${n}-smoke`)];
  for (const workspace of workspaces) {
    const data = readJson(join(directory, workspace, 'package.json'));
    const licensePath = join(directory, workspace, 'LICENSE');
    errors.push(...validatePublicationContract(workspace, data,
      existsSync(licensePath) ? readFileSync(licensePath, 'utf8') : workspace.startsWith('apps/') ? readFileSync(join(directory, 'LICENSE'), 'utf8') : '',
      readFileSync(join(directory, 'LICENSE'), 'utf8')));
    if (workspace !== '.' && data.volta?.extends !== '../../package.json') errors.push(`${workspace}: invalid Volta inheritance`);
    for (const [name, version] of Object.entries({ ...data.devDependencies, ...Object.fromEntries(Object.entries(data.dependencies ?? {}).filter(([name]) => !name.startsWith('@zoom-design/'))) })) {
      if (!exact(version)) errors.push(`${workspace}: ${name} devDependency must be exact stable`);
      if (!snapshot.packages.some(r => r.workspace === workspace && r.package === name && r.selectedVersion === version)) errors.push(`${workspace}: ${name} missing from snapshot`);
    }
    const lockManifest = lock.packages?.[workspace === '.' ? '' : workspace];
    if (!lockManifest) errors.push(`${workspace}: missing lock workspace`);
    errors.push(...validateWorkspaceContract(workspace, data, lockManifest));
  }
  for (const row of snapshot.packages) {
    const workspace = join(directory, row.workspace);
    try {
      const manifest = readJson(join(workspace, 'package.json'));
      const declared = manifest.devDependencies?.[row.package] ?? manifest.dependencies?.[row.package];
      if (declared !== row.selectedVersion) errors.push(`${row.workspace}: ${row.package} manifest differs from snapshot`);
      const path = realpathSync(packagePath(workspace, row.package)); const actual = readJson(path);
      resolved.push({ workspace: row.workspace, package: row.package, version: actual.version, path });
      if (actual.version !== row.selectedVersion) errors.push(`${row.workspace}: ${row.package} resolved ${actual.version}, expected ${row.selectedVersion}`);
      const lockKey = path.slice(resolve(directory).length + 1).replaceAll('\\', '/').replace(/\/package\.json$/, '');
      if (lock.packages?.[lockKey]?.version !== actual.version) errors.push(`${row.workspace}: ${row.package} installed/lock version mismatch at ${lockKey}`);
      for (const [peer, range] of Object.entries(actual.peerDependencies ?? {})) {
        try {
          const peerPath = packagePath(dirname(path), peer); const peerVersion = readJson(peerPath).version;
          if (!safeSatisfies(peerVersion, range)) errors.push(`${row.workspace}: ${row.package} actual peer ${peer}@${peerVersion} requires ${range}`);
        } catch { if (!actual.peerDependenciesMeta?.[peer]?.optional) errors.push(`${row.workspace}: ${row.package} missing actual peer ${peer}`); }
      }
    } catch (error) { errors.push(`${row.workspace}: ${row.package}: ${error.message}`); }
  }
  for (const workspaceName of snapshot.packages.filter(row => row.package === 'typescript').map(row => row.workspace)) {
    const workspace = join(directory, workspaceName);
    try {
      const result = runBin(workspace, 'typescript', 'tsc', ['--version'], 'pipe');
      const expected = /(?:packages|apps)\/(?:vue|angular)(?:-smoke)?$/.test(workspaceName) ? '6.0.3' : '7.0.2';
      compilers.push({ workspace: workspaceName, stdout: result.stdout.trim(), status: result.status });
      if (result.status !== 0 || !result.stdout.includes(`Version ${expected}`)) errors.push(`${workspaceName}: tsc did not start with ${expected}: ${result.stderr}`);
    } catch (error) { errors.push(`${workspaceName}: ${error.message}`); }
  }
  let vue;
  try { vue = resolveVueCompiler(join(directory, 'packages/vue')); } catch (error) { errors.push(error.message); }
  const vueConsumers = [];
  for (const workspaceName of ['packages/vue', 'apps/vue-smoke']) {
    if (!readJson(join(directory, workspaceName, 'package.json')).devDependencies?.['vue-tsc']) continue;
    try { vueConsumers.push({ workspace: workspaceName, ...resolveVueCompiler(join(directory, workspaceName)) }); } catch (error) { errors.push(error.message); }
  }
  for (const workspaceName of ['packages/angular', 'apps/angular-smoke']) for (const name of ['@angular/compiler-cli', '@angular/build', 'ng-packagr']) {
    if (!readJson(join(directory, workspaceName, 'package.json')).devDependencies?.[name]) continue;
    try {
      const tool = packagePath(join(directory, workspaceName), name);
      const path = packagePath(dirname(tool), 'typescript'); const version = readJson(path).version;
      angular.push({ workspace: workspaceName, package: name, tool, typescript: path, version });
      if (version !== '6.0.3') errors.push(`${workspaceName}/${name}: internally resolved TS${version} instead of 6.0.3`);
    } catch (error) { errors.push(`${workspaceName}/${name}: ${error.message}`); }
  }
  return { checkedAt: new Date().toISOString(), runtime, resolved, compilers, vue, vueConsumers, angular, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const report = inspectToolchain();
    const output = join(root, '.artifacts/task1'); mkdirSync(output, { recursive: true });
    writeFileSync(join(output, 'toolchain-report.json'), JSON.stringify(report, null, 2) + '\n');
    if (report.errors.length) { console.error(report.errors.join('\n')); process.exitCode = 1; }
    else console.log(`Toolchain OK: Node ${report.runtime.node}, npm ${report.runtime.npm}; ${report.resolved.length} dependencies, ${report.compilers.length} compiler entrypoints, Vue explicit TS6, Angular internal TS6. Report: .artifacts/task1/toolchain-report.json`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
