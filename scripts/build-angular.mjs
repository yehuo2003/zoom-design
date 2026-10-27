import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const cwd = path.join(root, 'packages/angular');
const require = createRequire(path.join(cwd, 'package.json'));
function run(args, workdir = cwd) {
  const result = spawnSync(process.execPath, args, { cwd: workdir, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run([path.join(root, 'scripts/build-styles.mjs'), '--package', 'angular'], root);
run([require.resolve('@angular/cli/bin/ng.js'), 'build', 'zoom-angular', '--configuration', 'production', ...process.argv.slice(2)]);
