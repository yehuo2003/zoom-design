import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runBin, resolveBin } from './run-local-bin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = join(root, 'packages/react');
const typesOnly = process.argv.includes('--types');
const results = [];

function run(label, tool, bin, args, expectedFailure = false) {
  const resolved = resolveBin(workspace, tool, bin);
  const result = runBin(workspace, tool, bin, args, 'pipe');
  results.push({ label, toolVersion: resolved.version, toolPath: resolved.path, status: result.status, stdout: result.stdout, stderr: result.stderr });
  if (expectedFailure) {
    assert.notEqual(result.status, 0, `${label}: invalid JSX was accepted`);
    assert.match(result.stdout + result.stderr, /negative\.tsx.*TS2322/s, `${label}: expected JSX prop diagnostic`);
    assert.match(result.stdout + result.stderr, /number.*string/s);
    assert.match(result.stdout + result.stderr, /count: string/);
  } else {
    assert.equal(result.status, 0, `${label}: ${result.stdout}${result.stderr}`);
  }
  console.log(`${label}: PASS${expectedFailure ? ' (expected compiler rejection)' : ''}`);
}

try {
  const compiler = resolveBin(workspace, 'typescript', 'tsc');
  assert.equal(compiler.version, '7.0.2');
  run('React native source and positive JSX', 'typescript', 'tsc', ['-p', 'tsconfig.json']);
  run('React fixture declaration emit', 'typescript', 'tsc', ['-p', 'test/fixtures/tsconfig.build.json']);
  run('React declaration consumer inference', 'typescript', 'tsc', ['-p', 'test/fixtures/tsconfig.consumer.json']);
  run('React negative JSX props', 'typescript', 'tsc', ['-p', 'test/fixtures/tsconfig.negative.json'], true);
  if (!typesOnly) {
    run('React fixture Vite native JSX build', 'vite', 'vite', ['build', '--config', 'test/fixtures/vite.config.ts']);
    const bundle = readFileSync(join(root, '.artifacts/fixtures/react/js/index.js'), 'utf8');
    for (const dependency of ['react', 'react/jsx-runtime', 'react-dom/client', 'react-dom/server']) {
      assert.ok(bundle.includes(`"${dependency}"`) || bundle.includes(`'${dependency}'`), `Fixture bundled missing external ${dependency}`);
    }
    assert.ok(bundle.length < 10000, 'React runtime unexpectedly bundled into private fixture');
    const publicModule = await import(pathToFileURL(join(workspace, 'dist/index.js')).href);
    assert.deepEqual(Object.keys(publicModule), [], 'Private probe leaked into public runtime');
    assert.doesNotMatch(readFileSync(join(workspace, 'dist/types/index.d.ts'), 'utf8'), /BuildProbe/);
    assert.match(readFileSync(join(workspace, 'dist/style.css'), 'utf8'), /--zoom-engineering-built:\s*1/);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  mkdirSync(join(root, '.artifacts/task3'), { recursive: true });
  writeFileSync(join(root, `.artifacts/task3/react-${typesOnly ? 'types' : 'checks'}.json`), JSON.stringify(results, null, 2) + '\n');
}
