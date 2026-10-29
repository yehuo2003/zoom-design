import * as sass from 'sass';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync, rmSync, watch, existsSync, copyFileSync } from 'node:fs';
import { parseArgs } from './run-local-bin.mjs';
import { themeFiles, styleEntries } from './theme-contract.mjs';

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
export function compilePackageStyles(name, { rootDirectory = root } = {}) {
  if (!['vue', 'react', 'angular'].includes(name)) throw Error(`Unknown style package ${name}`);
  const workspace = join(rootDirectory, 'packages', name);
  const output = join(workspace, name === 'angular' ? '.generated' : 'dist');
  const theme = join(output, name === 'angular' ? 'theme' : 'styles/theme');
  const entries = name === 'vue' ? [...styleEntries, { source: '../button/style.scss', output: 'button/style.css' }, { source: '../select/style.scss', output: 'select/style.css' }] : styleEntries;
  const invalidate = () => {
    for (const entry of entries) rmSync(join(output, entry.output), { force: true });
    rmSync(theme, { recursive: true, force: true });
  };
  // Compile all required inputs before publishing this group; failure removes old assets too.
  try {
    const css = entries.map(entry => ({ ...entry, css: sass.compile(join(workspace, 'src/styles', entry.source), { style: 'expanded', sourceMap: false, charset: false }).css }));
    const shared = join(rootDirectory, 'design/styles');
    for (const file of themeFiles) if (!existsSync(join(shared, file))) throw Error(`Missing public Sass file ${file}`);
    invalidate(); mkdirSync(theme, { recursive: true });
    for (const entry of css) { mkdirSync(dirname(join(output, entry.output)), { recursive: true }); writeFileSync(join(output, entry.output), `${entry.css}\n`); }
    for (const file of themeFiles) copyFileSync(join(shared, file), join(theme, file));
    return [...entries.map(entry => join(output, entry.output)), ...themeFiles.map(file => join(theme, file))];
  } catch (error) { invalidate(); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const argv = process.argv.slice(2); const watching = argv.includes('--watch');
    const { options, args } = parseArgs(argv.filter(arg => arg !== '--watch'), ['--package']);
    if (args.length) throw Error('Unexpected style arguments');
    const { source } = stylePaths(options['--package']);
    const build = () => { const outputs = compilePackageStyles(options['--package']); console.log(`${options['--package']}: theme CSS/Sass built (${outputs.length} assets)`); };
    build();
    if (watching) {
      let timer; const watchers = [];
      for (const directory of [join(root, 'packages', options['--package'], 'src'), join(root, 'design/styles')].filter(existsSync)) {
        watchers.push(watch(directory, { recursive: true }, () => {
          clearTimeout(timer); timer = setTimeout(() => { try { build(); } catch (error) { console.error(error.message); for (const watcher of watchers) watcher.close(); process.exitCode = 1; } }, 75);
        }));
      }
      for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { clearTimeout(timer); for (const watcher of watchers) watcher.close(); });
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
