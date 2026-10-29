import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runBin, packagePath, readJson } from './run-local-bin.mjs';
import { resolveVueCompiler } from './run-vue-tsc.mjs';
import { verifySelectDiagnostics } from '../tests/engineering/packed/select-type-contract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = join(root, 'packages/vue');
const results = [];
function record(label, result, expected = 0) {
  results.push({ label, status: result.status, stdout: result.stdout, stderr: result.stderr });
  if (result.error) throw result.error;
  if (result.status !== expected) throw Error(`${label}: unexpected exit ${result.status}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  console.log(`${label}: PASS`);
}
function vueTsc(config, expected = 0) {
  const result = spawnSync(process.execPath, [join(root, 'scripts/run-vue-tsc.mjs'), '--workspace', workspace, '--', '-p', config], { cwd: workspace, encoding: 'utf8', shell: false });
  record(`vue-tsc ${config}`, result, expected);
  return result;
}
try {
  const compiler = resolveVueCompiler(workspace);
  const vueTscManifest = packagePath(workspace, 'vue-tsc');
  if (readJson(vueTscManifest).version !== '3.3.13') throw Error('Vue requires vue-tsc3.3.13');
  results.push({ label: 'actual Vue compiler resolution', ...compiler, vueTscManifest });
  if (['core', 'dom'].some(name => !existsSync(join(root, `packages/${name}/dist/index.d.ts`)))) record('Vue Core/DOM declaration prerequisites', spawnSync(process.execPath, [join(root, 'scripts/build-platform.mjs'), 'dom'], { cwd: root, encoding: 'utf8', shell: false }));
  vueTsc('tsconfig.json');
  vueTsc('tsconfig.build.json');
  record('TS6 public Button declaration consumer', runBin(workspace, 'typescript', 'tsc', ['-p', 'test/button-types/tsconfig.ts.json'], 'pipe'));
  vueTsc('test/button-types/tsconfig.json');
  const productNegative = vueTsc('test/button-types/tsconfig.negative.json', 2);
  const productDiagnostics = `${productNegative.stdout}${productNegative.stderr}`;
  const actualDiagnostics = [...productDiagnostics.matchAll(/(?:^|\n)([^\r\n]+)\((\d+),\d+\): error TS(\d+):/g)].map(match => `${match[1].replaceAll('\\', '/').split('/').pop()}:${match[2]}:TS${match[3]}`).sort();
  const requiredDiagnostics = [...[5,6,7,8,9,10,11,12].map(line => `invalid.ts:${line}:TS2322`), 'invalid.ts:14:TS2345', ...[6,7,8,9].map(line => `Invalid.vue:${line}:TS2322`)].sort();
  if (JSON.stringify(actualDiagnostics) !== JSON.stringify(requiredDiagnostics)) throw Error(`Button negative diagnostics differ: ${JSON.stringify(actualDiagnostics)}\n${productDiagnostics}`);
  console.log('Button TS6/vue-tsc exact product diagnostics: PASS (13 expected)');
  record('TS6 public Select declaration consumer', runBin(workspace, 'typescript', 'tsc', ['-p', 'test/select-types/tsconfig.ts.json'], 'pipe'));
  vueTsc('test/select-types/tsconfig.json');
  const selectNegative = vueTsc('test/select-types/tsconfig.negative.json', 2);
  verifySelectDiagnostics(`${selectNegative.stdout}${selectNegative.stderr}`, true);
  console.log('Select TS6/vue-tsc exact product diagnostics: PASS');
  record('private SFC fixture JavaScript build', runBin(workspace, 'vite', 'vite', ['build', '--config', 'test/fixtures/vite.config.ts'], 'pipe'));
  const js = readFileSync(join(root, '.artifacts/fixtures/vue/index.js'), 'utf8');
  if (!/from ["']vue["']/.test(js) || js.includes('function createRenderer(')) throw Error('Private SFC fixture must externalize Vue');
  vueTsc('test/fixtures/tsconfig.build.json');
  record('TS7 platform fixture declaration emission', runBin(root, 'typescript', 'tsc', ['-p', 'tests/engineering/declarations/tsconfig.emit.json'], 'pipe'));
  // This plain TS6 consumer reads emitted .vue.d.ts and Task2 TS7 Core/DOM declarations;
  // it does not compile the source .vue or skip dependency declaration checks.
  record('TS6 emitted SFC and TS7 platform declaration consumer', runBin(workspace, 'typescript', 'tsc', ['-p', 'test/types/tsconfig.json'], 'pipe'));
  record('negative SFC still transforms as JavaScript', runBin(workspace, 'vite', 'vite', ['build', '--config', 'test/negative/vite.config.ts'], 'pipe'));
  const negative = vueTsc('test/negative/tsconfig.json', 2);
  const diagnostics = `${negative.stdout}${negative.stderr}`;
  if (!diagnostics.includes('Invalid.vue') || !diagnostics.includes("Type 'number' is not assignable to type 'string'") || !diagnostics.includes("Argument of type 'string' is not assignable to parameter of type 'number'") || diagnostics.match(/error TS\d+/g)?.length !== 2) throw Error(`Negative SFC must reject both prop and emit: ${diagnostics}`);
  console.log('Vue prop/event negative control: PASS (expected type errors)');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  mkdirSync(join(root, '.artifacts/task3'), { recursive: true });
  writeFileSync(join(root, '.artifacts/task3/vue-checks.json'), JSON.stringify(results, null, 2) + '\n');
}
