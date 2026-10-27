import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBin } from './run-local-bin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!['core', 'dom'].includes(name) || process.argv.length !== 3) throw Error('Usage: build-platform.mjs core|dom');
// DOM keeps its declared Core prerequisite even while public entries are empty.
for (const current of name === 'dom' ? ['core', 'dom'] : ['core']) {
  const workspace = join(root, 'packages', current); const output = join(workspace, 'dist');
  if (relative(root, output) !== join('packages', current, 'dist')) throw Error('Invalid build output path');
  rmSync(output, { recursive: true, force: true }); mkdirSync(output, { recursive: true });
  const result = runBin(workspace, 'typescript', 'tsc', ['-p', 'tsconfig.build.json']);
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
  for (const file of ['index.js', 'index.d.ts']) if (!existsSync(join(output, file))) throw Error(`${current}: missing ${file}`);
  console.log(`${current}: ESM and declarations built`);
}
