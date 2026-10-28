import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture(fail = '', missing = '') {
  const root = mkdtempSync(join(tmpdir(), 'zoom-workspace-')); roots.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*'] }));
  for (const name of ['core', 'dom', 'vue', 'react', 'angular']) {
    const dir = join(root, 'packages', name); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'build.cjs'), `require('node:fs').appendFileSync('../../calls.txt','${name}\\n');process.exit(${fail === name ? 7 : 0});`);
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: `@zoom-design/${name}`, scripts: name === missing ? {} : { build: 'node build.cjs' } }));
  }
  return root;
}
function build(root: string, selection?: string) {
  const code = `import { buildPlan, executeStages } from ${JSON.stringify(pathToFileURL(resolve('scripts/workspace.mjs')).href)}; await executeStages(buildPlan(${JSON.stringify(selection)}), {root: ${JSON.stringify(root)}, reportFile: ${JSON.stringify(join(root, 'report.json'))}});`;
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: process.cwd(), encoding: 'utf8', timeout: 25000 });
}
it('T4.1 builds Core then DOM then each independent framework', () => {
  const root = fixture(); const result = build(root);
  expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(join(root, 'calls.txt'), 'utf8').trim().split('\n')).toEqual(['core', 'dom', 'vue', 'react', 'angular']);
  const report = JSON.parse(readFileSync(join(root, 'report.json'), 'utf8'));
  expect(report.stages.map((stage: { exitCode: number }) => stage.exitCode)).toEqual([0, 0, 0, 0, 0]);
});
it('T4.1 stops before dependents and preserves a failing package exit code', () => {
  const root = fixture('core'); const result = build(root);
  expect(result.status).not.toBe(0);
  expect(existsSync(join(root, 'calls.txt')), result.stderr).toBe(true);
  expect(readFileSync(join(root, 'calls.txt'), 'utf8')).toBe('core\n');
  const report = JSON.parse(readFileSync(join(root, 'report.json'), 'utf8'));
  expect(report.stages).toMatchObject([{ package: 'core', exitCode: 7 }]);
});
it('T4.4 builds only the selected package and its declared predecessors', () => {
  const root = fixture(); const result = build(root, 'dom');
  expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(join(root, 'calls.txt'), 'utf8')).toBe('core\ndom\n');
});
it('T4.4 missing mandatory scripts fail instead of being silently skipped', () => {
  const root = fixture('', 'dom'); const result = build(root);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('dom: missing required script build');
  expect(JSON.parse(readFileSync(join(root, 'report.json'), 'utf8')).stages.at(-1)).toMatchObject({ package: 'dom', exitCode: 1 });
});

it('T4.4 Core typecheck prepares DOM declarations needed by the shared native host', async () => {
  const root = fixture();
  const { resolveBin } = await import('../../scripts/run-local-bin.mjs');
  const compiler = resolveBin(process.cwd(), 'typescript', 'tsc').path;
  writeFileSync(join(root, 'package.json'), JSON.stringify({ private: true, workspaces: ['packages/*', 'apps/*'] }));
  const links = join(root, 'node_modules/@zoom-design'); mkdirSync(links, { recursive: true });
  for (const name of ['core', 'dom']) {
    const directory = join(root, 'packages', name);
    symlinkSync(directory, join(links, name), process.platform === 'win32' ? 'junction' : 'dir');
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: `@zoom-design/${name}`, version: '0.0.0', type: 'module', exports: { '.': { types: './dist/index.d.ts' } }, scripts: { build: 'node build.cjs', typecheck: 'node check.cjs' } }));
    writeFileSync(join(directory, 'build.cjs'), 'const fs=require("node:fs");fs.mkdirSync("dist",{recursive:true});fs.writeFileSync("dist/index.d.ts","export {};");');
    writeFileSync(join(directory, 'index.ts'), 'export {};');
    writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { noEmit: true, skipLibCheck: false, types: [] }, files: ['index.ts'] }));
    writeFileSync(join(directory, 'check.cjs'), `const r=require('node:child_process').spawnSync(process.execPath,[${JSON.stringify(compiler)},'-p','tsconfig.json'],{stdio:'inherit'});process.exit(r.status??1);`);
  }
  const app = join(root, 'apps/platform-smoke'); mkdirSync(app, { recursive: true });
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: '@zoom-design/platform-smoke', private: true, type: 'module', scripts: { typecheck: 'node check.cjs' } }));
  writeFileSync(join(app, 'main.ts'), 'import * as core from "@zoom-design/core";import * as dom from "@zoom-design/dom";void core;void dom;');
  writeFileSync(join(app, 'tsconfig.json'), JSON.stringify({ compilerOptions: { noEmit: true, module: 'NodeNext', moduleResolution: 'NodeNext', skipLibCheck: false, types: [] }, files: ['main.ts'] }));
  writeFileSync(join(app, 'check.cjs'), `const r=require('node:child_process').spawnSync(process.execPath,[${JSON.stringify(compiler)},'-p','tsconfig.json'],{stdio:'inherit'});process.exit(r.status??1);`);
  const code = `import {qualityPlan,executeStages} from ${JSON.stringify(pathToFileURL(resolve('scripts/workspace.mjs')).href)};await executeStages(qualityPlan('typecheck','core'),{root:${JSON.stringify(root)},reportFile:${JSON.stringify(join(root,'report.json'))}});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', timeout: 25000 });
  expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  expect(existsSync(join(root, 'packages/dom/dist/index.d.ts'))).toBe(true);
});
