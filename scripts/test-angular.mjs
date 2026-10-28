import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runBin } from './run-local-bin.mjs';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { assertUnitReport } from './test-results.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const styles = spawnSync(process.execPath, [path.join(root, 'scripts/build-styles.mjs'), '--package', 'angular'], { cwd: root, stdio: 'inherit', shell: false });
if (styles.error) throw styles.error;
if (styles.status !== 0) process.exit(styles.status ?? 1);
const args = process.argv.slice(2);
const list = args.includes('--list-tests');
const reportFile = path.join(root, '.artifacts/task4/unit/angular.json');
mkdirSync(path.dirname(reportFile), { recursive: true });
rmSync(reportFile, { force: true });
const result = runBin(path.join(root, 'packages/angular'), '@angular/cli', 'ng', ['test', 'zoom-angular', '--watch=false', ...args, ...(list ? [] : ['--reporters=default', '--reporters=json', '--output-file', reportFile])]);
process.exitCode = result.status ?? 1;
if (!list && !process.exitCode) {
  try {
    const counts = assertUnitReport(JSON.parse(readFileSync(reportFile, 'utf8')), ['angular'], root);
    writeFileSync(path.join(root, '.artifacts/task4/unit/angular-counts.json'), JSON.stringify(counts, null, 2) + '\n');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
