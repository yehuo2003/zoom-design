import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
export function packagePath(from, name) {
  const require = createRequire(resolve(from, 'package.json'));
  try { return require.resolve(`${name}/package.json`); } catch (original) {
    // Some tools export their executable but hide package.json.
    try {
      let directory = dirname(require.resolve(name));
      while (directory !== dirname(directory)) {
        const candidate = join(directory, 'package.json');
        if (existsSync(candidate) && readJson(candidate).name === name) return candidate;
        directory = dirname(directory);
      }
    } catch { /* Report the original resolution error, including the package. */ }
    throw original;
  }
}
export function parseArgs(argv, names) {
  const options = {}; const args = [...argv];
  while (args.length && args[0] !== '--') {
    const key = args.shift();
    if (!names.includes(key) || !args.length || args[0].startsWith('--')) throw Error(`Invalid argument ${key}`);
    if (options[key]) throw Error(`Duplicate argument ${key}`);
    options[key] = args.shift();
  }
  if (args[0] === '--') args.shift();
  return { options, args };
}
export function resolveBin(workspace, name, bin) {
  const manifestPath = packagePath(workspace, name);
  const manifest = readJson(manifestPath);
  const relative = typeof manifest.bin === 'string' ? (bin === name.split('/').pop() ? manifest.bin : undefined) : manifest.bin?.[bin];
  if (!relative) throw Error(`${workspace}: ${name} does not provide bin ${bin}`);
  const path = resolve(dirname(manifestPath), relative);
  if (!existsSync(path)) throw Error(`${workspace}: missing executable ${path}`);
  return { path, manifestPath, version: manifest.version };
}
export function runBin(workspace, name, bin, args = [], stdio = 'inherit') {
  const tool = resolveBin(workspace, name, bin);
  const javascript = ['.js', '.cjs', '.mjs'].includes(extname(tool.path)) || readFileSync(tool.path).subarray(0, 150).toString().match(/^#!.*node/);
  const result = spawnSync(javascript ? process.execPath : tool.path, javascript ? [tool.path, ...args] : args, { cwd: resolve(workspace), stdio, encoding: 'utf8', shell: false });
  if (result.error) throw result.error;
  if (result.signal) throw Error(`${name}/${bin} terminated by ${result.signal}`);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { options, args } = parseArgs(process.argv.slice(2), ['--workspace', '--package', '--bin']);
    for (const key of ['--workspace', '--package', '--bin']) if (!options[key]) throw Error(`Missing ${key}`);
    process.exitCode = runBin(options['--workspace'], options['--package'], options['--bin'], args).status ?? 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
