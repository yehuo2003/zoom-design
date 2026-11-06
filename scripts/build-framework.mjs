import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runBin } from './run-local-bin.mjs';
import { compilePackageStyles } from './build-styles.mjs';
import { runFrameworkBuild } from './framework-artifacts.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!['vue', 'react'].includes(name) || process.argv.length !== 3) throw Error('Usage: build-framework.mjs vue|react');
const workspace = join(root, 'packages', name); const output = join(workspace, 'dist');
if (relative(root, output) !== join('packages', name, 'dist')) throw Error('Invalid framework output');
try {
  runFrameworkBuild(name, output, () => {
    if (name === 'vue') {
      const prerequisites = spawnSync(process.execPath, [join(root, 'scripts/build-platform.mjs'), 'dom'], { cwd: root, stdio: 'inherit', shell: false });
      if (prerequisites.error) throw prerequisites.error;
      if (prerequisites.status !== 0) throw Error(`vue: Core/DOM prerequisites exited ${prerequisites.status}`);
    }
    const js = runBin(workspace, 'vite', 'vite', ['build', '--config', 'vite.config.ts']);
    if (js.status !== 0) throw Error(`${name}: Vite exited ${js.status}`);
    const declarations = name === 'vue'
      ? spawnSync(process.execPath, [join(root, 'scripts/run-vue-tsc.mjs'), '--workspace', workspace, '--', '-p', 'tsconfig.build.json'], { cwd: workspace, stdio: 'inherit', shell: false })
      : runBin(workspace, 'typescript', 'tsc', ['-p', 'tsconfig.build.json']);
    if (declarations.error) throw declarations.error;
    if (declarations.status !== 0) throw Error(`${name}: declaration emit exited ${declarations.status}`);
    compilePackageStyles(name);
  });
  console.log(`${name}: public JS, declarations and CSS built`);
} catch (error) {
  console.error(error.message); process.exitCode = 1;
}
