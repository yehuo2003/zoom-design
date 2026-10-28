import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { runBin, readJson } from './run-local-bin.mjs';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { app } = readJson(resolve(directory, '.pack-spec.json'));
const action = process.argv[2]; const records = [];
function run(label, tool, bin, args, negative) {
  const result = tool === 'vue-tsc'
    ? spawnSync(process.execPath, [resolve(directory, 'scripts/run-vue-tsc.mjs'), '--workspace', directory, '--', ...args], { cwd: directory, shell: false, encoding: 'utf8' })
    : runBin(directory, tool, bin, args, 'pipe');
  if (result.error) throw result.error;
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  records.push({ label, tool, args, exitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  if (negative) {
    if (result.status === 0 || !negative.every(pattern => pattern.test(output))) throw Error(`${label}: expected specific type rejection, got ${result.status}\n${output}`);
  } else if (result.status !== 0) throw Error(`${label}: exit ${result.status}\n${output}`);
  if (label === 'Button exact product negative control') {
    const actual = [...output.matchAll(/(?:^|\n)([^\r\n]+)\((\d+),\d+\): error TS(\d+):/g)].map(match => `${match[1].replaceAll('\\', '/').split('/').pop()}:${match[2]}:TS${match[3]}`).sort();
    const expected = [...[5,6,7,8,9,10,11,12].map(line => `invalid.ts:${line}:TS2322`), 'invalid.ts:14:TS2345', ...[6,7,8,9].map(line => `Invalid.vue:${line}:TS2322`)].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error(`Button exact diagnostic mismatch: ${JSON.stringify(actual)}`);
  }
  console.log(`${app} ${label}: PASS${negative ? ' (expected diagnostics)' : ''}`);
}
try {
  if (action === 'typecheck') {
    run('public + TS7 emitted declaration contracts', 'typescript', 'tsc', ['-p', 'tsconfig.contracts.json']);
    run('declaration negative control', 'typescript', 'tsc', ['-p', 'tsconfig.contracts-negative.json'], [/invalid\.ts/, /TS2322/, /TS2345/]);
    const native = app === 'vue' ? ['vue-tsc', 'vue-tsc'] : app === 'angular' ? ['@angular/compiler-cli', 'ngc'] : ['typescript', 'tsc'];
    run('native source and public declarations', ...native, ['-p', app === 'angular' ? 'tsconfig.app.json' : 'tsconfig.json', '--noEmit']);
    if (app === 'vue') {
      run('Button plain TS6 declarations', 'typescript', 'tsc', ['-p', 'tsconfig.button-ts.json']);
      run('Button vue-tsc declarations and template', ...native, ['-p', 'tsconfig.button.json']);
      run('Button exact product negative control', ...native, ['-p', 'tsconfig.button-negative.json'], [/invalid\.ts\(14,\d+\): error TS2345/, /Invalid\.vue\(9,\d+\): error TS2322/]);
    }
    if (app !== 'platform') run('native template/JSX negative control', ...native, ['-p', 'tsconfig.negative.json', '--noEmit'], app === 'angular' ? [/Type 'number' is not assignable to type 'string'/, /Argument of type 'number' is not assignable to parameter of type 'string'/] : [/Type 'number' is not assignable to type 'string'/, /string.*number|number.*string/s]);
  } else if (action === 'build') {
    if (app === 'angular') run('APF native consumer build', '@angular/cli', 'ng', ['build', 'angular-smoke', '--configuration', 'production']);
    else {
      run('production browser build', 'vite', 'vite', ['build', '--config', 'vite.config.mjs']);
      if (['vue', 'react'].includes(app)) run('production SSR build', 'vite', 'vite', ['build', '--config', 'vite.config.mjs', '--ssr', 'src/ssr.ts', '--outDir', 'server']);
    }
  } else throw Error('Expected typecheck|build');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { mkdirSync(resolve(directory, 'reports'), { recursive: true }); writeFileSync(resolve(directory, `reports/${action}.json`), JSON.stringify({ app, records, exitCode: process.exitCode ?? 0 }, null, 2) + '\n'); }
