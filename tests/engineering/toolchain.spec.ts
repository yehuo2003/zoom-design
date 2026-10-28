import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots: string[] = [];

it('Task4 resolves a standalone npm bin directory without npm_execpath', async () => {
  const { probeNpm } = await import('../../scripts/check-toolchain.mjs');
  const directory = mkdtempSync(join(tmpdir(), 'zoom-npm-bin-')); roots.push(directory);
  writeFileSync(join(directory, 'npm.cmd'), '@echo off');
  writeFileSync(join(directory, 'npm-cli.js'), 'console.log("12.2.1")');
  const result = probeNpm({ PATH: directory }, process.execPath, 'win32');
  expect(result).toEqual({ version: '12.2.1', path: join(directory, 'npm-cli.js') });
});
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const json = (path: string, value: unknown) => { mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, JSON.stringify(value)); };
const temp = () => { const root = mkdtempSync(join(tmpdir(), 'zoom-toolchain-')); roots.push(root); return root; };
const script = (name: string, args: string[]) => spawnSync(process.execPath, [resolve('scripts', name), ...args], { encoding: 'utf8' });
async function validator() { return (await import('../../scripts/check-toolchain.mjs')).validateSnapshot; }
function fixture() {
  return {
    checkedAt: '2026-10-27T00:00:00Z', node: { selectedVersion: '26.12.1' }, npm: { selectedVersion: '12.2.1' },
    packages: [
      { package: 'typescript', selectedVersion: '7.0.2', latestStable: '7.0.2', publishedAt: '2026-07-08T00:00:00Z', workspace: '.', engines: {}, peers: {}, source: 'https://registry.npmjs.org/typescript' },
      { package: 'typescript', selectedVersion: '6.0.3', latestStable: '7.0.2', publishedAt: '2026-06-01T00:00:00Z', workspace: 'packages/vue', reason: 'Vue compiler API compatibility', engines: {}, peers: {}, source: 'https://registry.npmjs.org/typescript' },
      { package: 'vitest', selectedVersion: '5.0.5', latestStable: '5.0.5', publishedAt: '2026-10-20T00:00:00Z', workspace: '.', engines: {}, peers: {}, source: 'https://registry.npmjs.org/vitest' },
      { package: '@vitest/coverage-v8', selectedVersion: '5.0.5', latestStable: '5.0.5', publishedAt: '2026-10-20T00:00:00Z', workspace: '.', engines: {}, peers: { vitest: '5.0.5' }, source: 'https://registry.npmjs.org/@vitest/coverage-v8' },
    ],
  };
}

describe('Task1 snapshot validation', () => {
  it('accepts published stable versions and a documented TS6 exception', async () => { expect((await validator())(fixture())).toEqual([]); });
  it.each(['7.0.3-beta.1', '^7.0.2', 'latest'])('rejects nonexact or prerelease %s with its workspace', async version => {
    const data = fixture(); data.packages[0].selectedVersion = version;
    expect((await validator())(data).join('\n')).toMatch(/typescript.*exact stable|exact stable.*typescript/);
  });
  it('rejects publication after the snapshot', async () => {
    const data = fixture(); data.packages[0].publishedAt = '2026-10-28T00:00:00Z';
    expect((await validator())(data).join('\n')).toMatch(/publishedAt/);
  });
  it('rejects TS7 in the Vue workspace', async () => {
    const data = fixture(); data.packages[1].selectedVersion = '7.0.2';
    expect((await validator())(data).join('\n')).toMatch(/packages\/vue.*TypeScript 6/);
  });
  it('rejects missing required peer and mismatched coverage versions', async () => {
    const data = fixture(); data.packages[3].selectedVersion = '5.0.4'; data.packages[3].peers = { vitest: '5.0.5', absent: '^1' } as any;
    const errors = (await validator())(data).join('\n'); expect(errors).toMatch(/absent/); expect(errors).toMatch(/coverage/);
  });
  it('checks semver peers and Node engines rather than presence alone', async () => {
    const data = fixture(); data.packages[3].peers = { vitest: '^4' }; data.packages[0].engines = { node: '<26' };
    const errors = (await validator())(data).join('\n'); expect(errors).toMatch(/peer.*vitest/); expect(errors).toMatch(/engine.*node/);
  });
});

describe('Task1 review regressions', () => {
  it('uses PATH npm from a separate prefix instead of bundled npm without a shell', async () => {
    const root = temp(); const prefix = join(root, 'npm prefix'); mkdirSync(prefix);
    writeFileSync(join(prefix, 'npm.cmd'), '@echo off\nexit /b 99');
    const cli = join(prefix, 'node_modules/npm/bin/npm-cli.js'); mkdirSync(resolve(cli, '..'), { recursive: true });
    writeFileSync(cli, 'console.log("12.2.1")');
    const { probeNpm } = await import('../../scripts/check-toolchain.mjs');
    expect(probeNpm({ PATH: prefix }, process.execPath, 'win32')).toMatchObject({ version: '12.2.1', path: cli });
  });
  it('rejects a missing or overly broad Vue public peer', async () => {
    const { validateWorkspaceContract } = await import('../../scripts/check-toolchain.mjs');
    for (const peerDependencies of [{}, { vue: '^3.0.0' }]) {
      expect(validateWorkspaceContract('packages/vue', { peerDependencies }, { peerDependencies }).join('\n')).toMatch(/public peer vue/);
    }
    const good = { peerDependencies: { vue: '~3.5.44' } };
    expect(validateWorkspaceContract('packages/vue', good, good)).toEqual([]);
  });
  it('rejects removing DOM to Core and detects runtime/peer lock drift', async () => {
    const { validateWorkspaceContract } = await import('../../scripts/check-toolchain.mjs');
    expect(validateWorkspaceContract('packages/dom', {}, {}).join('\n')).toMatch(/@zoom-design\/core/);
    const good = { dependencies: { '@zoom-design/core': '0.0.0' } };
    expect(validateWorkspaceContract('packages/dom', good, good)).toEqual([]);
    expect(validateWorkspaceContract('packages/dom', good, {}).join('\n')).toMatch(/lock dependencies/);
    const vue = { peerDependencies: { vue: '~3.5.44' } };
    expect(validateWorkspaceContract('packages/vue', vue, {}).join('\n')).toMatch(/lock peerDependencies/);
  });
});

describe('Task1 local launchers', () => {
  it('resolves a bin map from the workspace, keeps cwd and arguments, and propagates failure', () => {
    const root = temp(); json(join(root, 'package.json'), { name: 'fixture' });
    const tool = join(root, 'node_modules/tool'); json(join(tool, 'package.json'), { name: 'tool', version: '1.0.0', bin: { probe: 'cli.cjs' } });
    writeFileSync(join(tool, 'cli.cjs'), 'console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)})); process.exitCode=17;');
    const result = script('run-local-bin.mjs', ['--workspace', root, '--package', 'tool', '--bin', 'probe', '--', 'a b', '$literal']);
    expect(result.status).toBe(17); expect(JSON.parse(result.stdout)).toEqual({ cwd: root, args: ['a b', '$literal'] });
  });
  it('fails explicitly for a missing bin and does not fall back to a global command', () => {
    const root = temp(); json(join(root, 'package.json'), {});
    const result = script('run-local-bin.mjs', ['--workspace', root, '--package', 'missing', '--bin', 'tsc']);
    expect(result.status).not.toBe(0); expect(result.stderr).toMatch(/missing/);
  });
  it('passes workspace TS6 explicitly even when vue-tsc is hoisted beside TS7', () => {
    const root = temp(); const workspace = join(root, 'packages/vue'); json(join(workspace, 'package.json'), {});
    json(join(root, 'node_modules/typescript/package.json'), { name: 'typescript', version: '7.0.2' });
    const localTS = join(workspace, 'node_modules/typescript'); json(join(localTS, 'package.json'), { name: 'typescript', version: '6.0.3' });
    mkdirSync(join(localTS, 'lib')); writeFileSync(join(localTS, 'lib/tsc.js'), '');
    const vueTsc = join(root, 'node_modules/vue-tsc'); json(join(vueTsc, 'package.json'), { name: 'vue-tsc', version: '3.3.13', main: 'index.cjs' });
    writeFileSync(join(vueTsc, 'index.cjs'), 'exports.run=(tsc)=>{ console.log(JSON.stringify({tsc,args:process.argv.slice(2)}));process.exitCode=19; };');
    const result = script('run-vue-tsc.mjs', ['--workspace', workspace, '--', '--noEmit']);
    expect(result.status).toBe(19); expect(JSON.parse(result.stdout)).toEqual({ tsc: join(localTS, 'lib/tsc.js'), args: ['--noEmit'] });
  });
  it('refuses the Vue launcher with TS7', () => {
    const root = temp(); json(join(root, 'package.json'), {}); json(join(root, 'node_modules/typescript/package.json'), { version: '7.0.2' });
    const result = script('run-vue-tsc.mjs', ['--workspace', root, '--', '--version']);
    expect(result.status).not.toBe(0); expect(result.stderr).toMatch(/TypeScript 6/);
  });
});
