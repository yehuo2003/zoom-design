import * as sass from 'sass';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, rmSync, watch, existsSync } from 'node:fs';
import { parseArgs } from './run-local-bin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function stylePaths(name) {
  if (!['vue', 'react', 'angular'].includes(name)) throw Error(`Unknown style package ${name}`);
  const workspace = join(root, 'packages', name);
  return { source: join(workspace, 'src/styles/style.scss'), output: join(workspace, name === 'angular' ? '.generated' : 'dist', 'style.css') };
}
export function compileStyle(source, output) {
  try {
    const result = sass.compile(source, { style: 'expanded', sourceMap: false, charset: false });
    mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, result.css + '\n');
  } catch (error) {
    // Generated CSS must never remain apparently valid after a failed rebuild.
    rmSync(output, { force: true }); throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const argv = process.argv.slice(2); const watching = argv.includes('--watch');
    const { options, args } = parseArgs(argv.filter(arg => arg !== '--watch'), ['--package']);
    if (args.length) throw Error('Unexpected style arguments');
    const { source, output } = stylePaths(options['--package']);
    const build = () => { compileStyle(source, output); console.log(`${options['--package']}: CSS built at ${output}`); };
    build();
    if (watching) {
      let timer; const watchers = [];
      for (const directory of [dirname(source), join(root, 'design/styles')].filter(existsSync)) {
        watchers.push(watch(directory, { recursive: true }, () => {
          clearTimeout(timer); timer = setTimeout(() => { try { build(); } catch (error) { console.error(error.message); for (const watcher of watchers) watcher.close(); process.exitCode = 1; } }, 75);
        }));
      }
      for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { clearTimeout(timer); for (const watcher of watchers) watcher.close(); });
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
