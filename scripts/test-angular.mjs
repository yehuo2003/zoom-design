import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runBin } from './run-local-bin.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const styles = spawnSync(process.execPath, [path.join(root, 'scripts/build-styles.mjs'), '--package', 'angular'], { cwd: root, stdio: 'inherit', shell: false });
if (styles.error) throw styles.error;
if (styles.status !== 0) process.exit(styles.status ?? 1);
const result = runBin(path.join(root, 'packages/angular'), '@angular/cli', 'ng', ['test', 'zoom-angular', '--watch=false', ...process.argv.slice(2)]);
process.exitCode = result.status ?? 1;
