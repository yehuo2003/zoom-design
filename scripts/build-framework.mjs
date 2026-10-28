import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runBin } from './run-local-bin.mjs';
import { compilePackageStyles } from './build-styles.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!['vue', 'react'].includes(name) || process.argv.length !== 3) throw Error('Usage: build-framework.mjs vue|react');
const workspace = join(root, 'packages', name); const output = join(workspace, 'dist');
if (relative(root, output) !== join('packages', name, 'dist')) throw Error('Invalid framework output');
try {
  rmSync(output, { recursive: true, force: true });
  const js = runBin(workspace, 'vite', 'vite', ['build', '--config', 'vite.config.ts']);
  if (js.status !== 0) throw Error(`${name}: Vite exited ${js.status}`);
  const declarations = name === 'vue'
    ? spawnSync(process.execPath, [join(root, 'scripts/run-vue-tsc.mjs'), '--workspace', workspace, '--', '-p', 'tsconfig.build.json'], { cwd: workspace, stdio: 'inherit', shell: false })
    : runBin(workspace, 'typescript', 'tsc', ['-p', 'tsconfig.build.json']);
  if (declarations.error) throw declarations.error;
  if (declarations.status !== 0) throw Error(`${name}: declaration emit exited ${declarations.status}`);
  compilePackageStyles(name);
  if (name === 'vue') for (const file of ['button/index.js', 'types/button/index.d.ts', 'button/style.css']) if (!existsSync(join(output, file))) throw Error(`vue: missing built ${file}`);
  for (const file of ['index.js', 'types/index.d.ts', 'style.css', 'theme.css', 'styles/theme/_index.scss']) if (!existsSync(join(output, file))) throw Error(`${name}: missing built ${file}`);
  console.log(`${name}: public JS, declarations and CSS built`);
} catch (error) {
  // Invalidate outputs when any required build stage fails.
  rmSync(output, { recursive: true, force: true }); console.error(error.message); process.exitCode = 1;
}
