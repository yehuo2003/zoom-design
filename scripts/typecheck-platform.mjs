import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBin } from './run-local-bin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!['core', 'dom'].includes(name) || process.argv.length !== 3) throw Error('Usage: typecheck-platform.mjs core|dom');
for (const config of ['tsconfig.build.json', 'tsconfig.test.json']) {
  const result = runBin(join(root, 'packages', name), 'typescript', 'tsc', ['-p', config, '--noEmit']);
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}
