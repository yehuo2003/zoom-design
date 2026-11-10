import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeNpm } from './check-toolchain.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registry = 'https://registry.npmjs.org/';
const names = ['core', 'dom', 'vue', 'react', 'angular'];
const workspaces = ['.', ...names.map(name => `packages/${name}`), ...['platform', 'vue', 'react', 'angular'].map(name => `apps/${name}-smoke`)];
const internalNames = new Set(names.map(name => `@zoom-design/${name}`));
const reportPath = join(root, '.artifacts/release/latest.json');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--dry-run') || args.filter(arg => arg === '--dry-run').length > 1) {
  console.error('用法：npm run publish:all:test [-- --dry-run]');
  process.exit(1);
}
const dryRun = args.includes('--dry-run');

function clean(value) {
  return String(value ?? '')
    .replace(/npm_[A-Za-z0-9_-]{12,}/g, '[REDACTED]')
    .replace(/(_authToken\s*[:=]\s*)\S+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)\S+/gi, '$1[REDACTED]');
}

function assertPlaintext(path, bytes) {
  const prefix = bytes.subarray(0, 256).toString('latin1');
  if (bytes.includes(0) || prefix.includes('%TSD-Header')) {
    throw Error(`${path}: 文件似乎被加密，请在本机解密后重试`);
  }
  try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw Error(`${path}: 文件不是有效 UTF-8，请检查是否被加密`); }
}

function readManifest(path) {
  const bytes = readFileSync(path);
  assertPlaintext(path, bytes);
  const original = bytes.toString('utf8');
  return { path, original, data: JSON.parse(original) };
}

function assertReadmes(includeBuilt = false) {
  for (const name of names) {
    const path = join(root, 'packages', name, 'README.md');
    assertPlaintext(path, readFileSync(path));
  }
  if (includeBuilt) {
    const path = join(root, 'dist/angular/README.md');
    assertPlaintext(path, readFileSync(path));
  }
}

function assertWorkspaceState(manifests, lock) {
  const version = manifests.get('.')?.data.version;
  if (!/^\d+\.\d+\.\d+$/.test(version) || !Number.isSafeInteger(Number(version.split('.')[2]))) {
    throw Error(`根版本 ${version} 必须是可递增的稳定 major.minor.patch 版本`);
  }
  if (manifests.get('.')?.data.private !== true) throw Error('根项目必须保持 private:true');
  if (lock.data.lockfileVersion !== 3 || lock.data.version !== version) throw Error('根 package-lock.json 版本与 package.json 不一致');
  for (const workspace of workspaces) {
    const manifest = manifests.get(workspace).data;
    const locked = lock.data.packages?.[workspace === '.' ? '' : workspace];
    if (!locked || locked.version !== manifest.version) throw Error(`${workspace}: 锁文件中的工作区版本不一致`);
    if (workspace.startsWith('packages/')) {
      const name = workspace.slice('packages/'.length);
      if (manifest.name !== `@zoom-design/${name}` || manifest.private !== false || manifest.version !== version || manifest.publishConfig?.access !== 'public') {
        throw Error(`${workspace}: 公开包名称、权限或版本不符合发布约束`);
      }
    }
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
        if (!internalNames.has(dependency)) continue;
        if (range !== version || locked[field]?.[dependency] !== version) {
          throw Error(`${workspace}: ${dependency} 必须在清单和锁文件中精确依赖 ${version}`);
        }
      }
    }
  }
  return version;
}

function bumpDependencies(data, version) {
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(data[field] ?? {})) {
      if (internalNames.has(name)) data[field][name] = version;
    }
  }
}

function serialize(record) {
  const eol = record.original.includes('\r\n') ? '\r\n' : '\n';
  const ending = /\r?\n$/.test(record.original) ? eol : '';
  return JSON.stringify(record.data, null, 2).replaceAll('\n', eol) + ending;
}

function updateVersion(manifests, lock, version) {
  const changes = [...manifests.values(), lock];
  manifests.get('.').data.version = version;
  lock.data.version = version;
  for (const workspace of workspaces) {
    const manifest = manifests.get(workspace).data;
    const locked = lock.data.packages[workspace === '.' ? '' : workspace];
    if (workspace === '.' || workspace.startsWith('packages/')) {
      manifest.version = version;
      locked.version = version;
    }
    bumpDependencies(manifest, version);
    bumpDependencies(locked, version);
  }
  const written = [];
  try {
    for (const record of changes) {
      const content = serialize(record);
      if (content === record.original) continue;
      writeFileSync(record.path, content);
      written.push(record);
      if (readFileSync(record.path, 'utf8') !== content) throw Error(`${record.path}: 写入后无法读回明文`);
    }
  } catch (error) {
    restore(written);
    throw error;
  }
  return () => restore(written);
}

function restore(records) {
  for (const record of [...records].reverse()) writeFileSync(record.path, record.original);
}

function reason(result) {
  const lines = result.tail.filter(line => /(?:npm error|error|failed|forbidden|E40[34])/i.test(line) && !/complete log of this run/i.test(line));
  return clean((lines.length ? lines : result.tail).slice(-5).join(' | ') || `退出码 ${result.code ?? '未知'}`).slice(0, 1800);
}

function runNpm(npm, command, { showOutput = true } = {}) {
  const executable = npm.path.endsWith('.js') ? process.execPath : npm.path;
  const argv = [...(npm.path.endsWith('.js') ? [npm.path] : []), ...command];
  return new Promise((finish, reject) => {
    const child = spawn(executable, argv, { cwd: root, shell: false, stdio: ['inherit', 'pipe', 'pipe'] });
    const tail = [];
    let stdout = '';
    for (const [stream, destination, isStdout] of [[child.stdout, process.stdout, true], [child.stderr, process.stderr, false]]) {
      const decoder = new StringDecoder('utf8');
      let pending = '';
      function emit(line) {
        const safe = clean(line);
        if (safe.trim()) { tail.push(safe.trim()); if (tail.length > 24) tail.shift(); }
        if (showOutput) destination.write(`${safe}\n`);
        if (isStdout && !showOutput) stdout += `${line}\n`;
      }
      stream.on('data', chunk => {
        pending += decoder.write(chunk);
        for (let index; (index = pending.search(/[\r\n]/)) !== -1;) {
          const line = pending.slice(0, index);
          pending = pending.slice(index + (pending[index] === '\r' && pending[index + 1] === '\n' ? 2 : 1));
          emit(line);
        }
      });
      stream.on('end', () => { pending += decoder.end(); if (pending) emit(pending); });
    }
    child.once('error', reject);
    child.once('close', (code, signal) => finish({ code, signal, stdout: stdout.trim(), tail }));
  });
}

async function publishedVersions(npm, name) {
  const result = await runNpm(npm, ['view', `@zoom-design/${name}`, 'versions', '--json', '--prefer-online', '--registry', registry, '--loglevel=error'], { showOutput: false });
  if (result.code !== 0) throw Error(`@zoom-design/${name}: 查询 npm 版本失败：${reason(result)}`);
  let parsed;
  try { parsed = JSON.parse(result.stdout); }
  catch { throw Error(`@zoom-design/${name}: npm view 返回了无法解析的版本列表`); }
  if (!Array.isArray(parsed) && typeof parsed !== 'string') throw Error(`@zoom-design/${name}: npm view 返回了异常的版本列表`);
  return new Set(Array.isArray(parsed) ? parsed : [parsed]);
}

async function queryAll(npm) {
  const versions = new Map();
  for (const name of names) versions.set(name, await publishedVersions(npm, name));
  return versions;
}

function availableVersion(start, versions) {
  const [major, minor, initialPatch] = start.split('.').map(Number);
  for (let offset = 0; offset < 10000; offset++) {
    const patch = initialPatch + offset;
    if (!Number.isSafeInteger(patch)) break;
    const candidate = `${major}.${minor}.${patch}`;
    if (names.every(name => !versions.get(name).has(candidate))) return candidate;
  }
  throw Error(`从 ${start} 起未找到五包共同可用的补丁版本`);
}

function summarize(report) {
  console.log('\n五包发布结果：');
  for (const entry of report.packages) {
    console.log(`- ${entry.name}@${report.version ?? report.sourceVersion ?? '?'}：${entry.status}${entry.reason ? `；${entry.reason}` : ''}`);
  }
  if (report.error) console.error(`发布流程：${report.error}`);
  if (!dryRun) {
    try {
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
      console.log(`报告：${reportPath}`);
    } catch (error) { console.error(`保存报告失败：${clean(error.message)}`); process.exitCode = 1; }
  }
}

const report = {
  startedAt: new Date().toISOString(),
  tag: 'test',
  registry,
  packages: names.map(name => ({ name: `@zoom-design/${name}`, status: '未发布', reason: '' })),
};
let undoVersion;
let publicationStarted = false;
try {
  const manifests = new Map(workspaces.map(workspace => [workspace, readManifest(join(root, workspace, 'package.json'))]));
  const lock = readManifest(join(root, 'package-lock.json'));
  report.sourceVersion = assertWorkspaceState(manifests, lock);
  assertReadmes();
  const npm = probeNpm();
  if (!npm.path || !npm.version) throw Error('无法定位 npm，请从仓库根目录使用项目指定的 Node/npm 环境运行');
  console.log('正在查询 npm 上五个包的版本…');
  report.version = availableVersion(report.sourceVersion, await queryAll(npm));
  console.log(`计划发布五包共同版本 ${report.version}${report.version !== report.sourceVersion ? `（当前 ${report.sourceVersion} 已占用）` : ''}`);
  if (dryRun) {
    for (const entry of report.packages) { entry.status = '计划'; entry.reason = '仅查询版本，未修改文件或发布'; }
  } else {
    const login = await runNpm(npm, ['whoami', '--registry', registry, '--loglevel=error'], { showOutput: false });
    if (login.code !== 0) throw Error(`npm 凭据检查失败：${reason(login)}`);
    console.log(`npm 登录账号：${clean(login.stdout)}`);
    if (report.version !== report.sourceVersion) {
      undoVersion = updateVersion(manifests, lock, report.version);
      console.log(`已同步根项目、五个包、私有消费示例和 package-lock.json 到 ${report.version}`);
    }
    for (const [label, command] of [
      ['版本与锁文件检查', ['run', 'check:versions']],
      ['构建与打包消费检查', ['run', 'check:pack']],
    ]) {
      console.log(`\n${label}…`);
      const result = await runNpm(npm, command);
      if (result.code !== 0) throw Error(`${label}失败：${reason(result)}`);
    }
    assertReadmes(true);
    const builtAngular = readManifest(join(root, 'dist/angular/package.json')).data;
    if (builtAngular.name !== '@zoom-design/angular' || builtAngular.version !== report.version) {
      throw Error(`dist/angular 不是 @zoom-design/angular@${report.version} 的构建产物`);
    }
    const latest = await queryAll(npm);
    if (names.some(name => latest.get(name).has(report.version))) {
      throw Error(`${report.version} 在发布准备期间已被占用；请重新运行脚本以选择下一版本`);
    }
    publicationStarted = true;
    for (const [index, name] of names.entries()) {
      const entry = report.packages[index];
      const required = name === 'dom' ? ['core'] : name === 'vue' ? ['core', 'dom'] : [];
      const blocked = required.find(dependency => report.packages[names.indexOf(dependency)].status !== '成功');
      if (blocked) { entry.status = '跳过'; entry.reason = `依赖 @zoom-design/${blocked} 发布失败`; continue; }
      const directory = name === 'angular' ? './dist/angular' : `./packages/${name}`;
      console.log(`\n发布 ${entry.name}@${report.version}（${directory}）…`);
      try {
        const result = await runNpm(npm, ['publish', directory, '--access', 'public', '--tag', 'test', '--registry', registry]);
        entry.status = result.code === 0 ? '成功' : '失败';
        entry.reason = result.code === 0 ? '' : reason(result);
      } catch (error) { entry.status = '失败'; entry.reason = clean(error.message); }
    }
    if (report.packages.some(entry => entry.status !== '成功')) process.exitCode = 1;
  }
} catch (error) {
  report.error = clean(error.message);
  if (!publicationStarted && undoVersion) {
    try { undoVersion(); report.error += '；发布前的版本改动已还原'; }
    catch (restoreError) { report.error += `；还原版本失败：${clean(restoreError.message)}`; }
  }
  for (const entry of report.packages) if (entry.status === '未发布') entry.reason = report.error;
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  summarize(report);
}
