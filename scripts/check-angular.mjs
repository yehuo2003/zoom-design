import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const cwd = path.join(root, 'packages/angular');
const require = createRequire(path.join(cwd, 'package.json'));
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const resolution = {};
for (const name of ['@angular/cli', '@angular/build', '@angular/compiler-cli', 'ng-packagr', 'typescript']) {
  const packageJson = require.resolve(`${name}/package.json`);
  resolution[name] = { version: read(packageJson).version, packageJson };
}
assert.equal(resolution.typescript.version, '6.0.3');
const compilerRequire = createRequire(resolution['@angular/compiler-cli'].packageJson);
resolution.compilerTypeScript = { packageJson: compilerRequire.resolve('typescript/package.json') };
assert.equal(read(resolution.compilerTypeScript.packageJson).version, '6.0.3');
const appDirectory = path.join(root, 'apps/angular-smoke');
const appRequire = createRequire(path.join(appDirectory, 'package.json'));
resolution.appTypeScript = { packageJson: appRequire.resolve('typescript/package.json') };
assert.equal(read(resolution.appTypeScript.packageJson).version, '6.0.3');
const appCompilerManifest = appRequire.resolve('@angular/compiler-cli/package.json');
resolution.appCompiler = { packageJson: appCompilerManifest };
assert.equal(read(createRequire(appCompilerManifest).resolve('typescript/package.json')).version, '6.0.3');
const artifacts = path.join(root, '.artifacts/task3');
mkdirSync(artifacts, { recursive: true });
writeFileSync(path.join(artifacts, 'angular-tool-resolution.json'), JSON.stringify(resolution, null, 2) + '\n');
console.log(JSON.stringify(resolution, null, 2));

function bin(name, key) {
  const manifest = require.resolve(`${name}/package.json`);
  const definition = read(manifest).bin;
  return path.resolve(path.dirname(manifest), typeof definition === 'string' ? definition : definition[key]);
}
function run(args, workdir = cwd, failure = false) {
  const result = spawnSync(process.execPath, args, { cwd: workdir, encoding: 'utf8' });
  if (result.error) throw result.error;
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  process.stdout.write(output);
  if (failure) {
    assert.notEqual(result.status, 0, 'The deliberately invalid Angular template must fail');
    assert.match(output, /Type 'number' is not assignable to type 'string'/);
    assert.match(output, /Argument of type 'number' is not assignable to parameter of type 'string'/);
  } else if (result.status !== 0) process.exit(result.status ?? 1);
  return output;
}

run([path.join(root, 'scripts/build-styles.mjs'), '--package', 'angular'], root);
run([bin('@angular/compiler-cli', 'ngc'), '-p', 'tsconfig.lib.prod.json', '--noEmit']);
run([bin('@angular/cli', 'ng'), 'run', 'zoom-angular:fixture']);
run([bin('@angular/compiler-cli', 'ngc'), '-p', 'test/negative/tsconfig.json'], cwd, true);
const rootRequire = createRequire(path.join(root, 'package.json'));
assert.equal(rootRequire('typescript/package.json').version, '7.0.2');
const rootTs = path.join(path.dirname(rootRequire.resolve('typescript/package.json')), 'bin/tsc');
run([rootTs, '-p', 'tests/engineering/declarations/tsconfig.emit.json'], root);
run([bin('typescript', 'tsc'), '-p', 'test/consumer/tsconfig.json']);
run([path.resolve(path.dirname(appCompilerManifest), read(appCompilerManifest).bin.ngc), '-p', 'tsconfig.app.json', '--noEmit'], appDirectory);

const apfRoot = path.join(root, 'dist/angular');
const apf = read(path.join(apfRoot, 'package.json'));
assert.equal(apf.exports['./style.css'], './styles/style.css');
assert.ok(apf.sideEffects.includes('**/*.css'));
assert.match(readFileSync(path.join(apfRoot, apf.exports['.'].types), 'utf8'), /export\s*\{\s*\}/);
assert.deepEqual(Object.keys(await import(pathToFileURL(path.join(apfRoot, apf.exports['.'].default)).href)), []);
assert.match(readFileSync(path.join(apfRoot, 'styles/style.css'), 'utf8'), /--zoom-engineering-built:\s*1/);
const fixtureRoot = path.join(root, '.artifacts/fixtures/angular/apf');
const fixture = read(path.join(fixtureRoot, 'package.json'));
const code = readFileSync(path.join(fixtureRoot, fixture.exports['.'].default), 'utf8');
assert.match(code, /ɵɵngDeclareComponent/);
assert.doesNotMatch(code, /ɵɵdefineComponent/);
assert.match(readFileSync(path.join(fixtureRoot, fixture.exports['.'].types), 'utf8'), /class BuildProbe/);
console.log('Angular native templates, partial APF, TS6 consumers, public barrel and CSS contract passed.');
