import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { packagePath, parseArgs, readJson } from './run-local-bin.mjs';

export function resolveVueCompiler(workspace) {
  const require = createRequire(resolve(workspace, 'package.json'));
  const manifestPath = packagePath(workspace, 'typescript');
  const version = readJson(manifestPath).version;
  if (version !== '6.0.3') throw Error(`${workspace}: Vue requires TypeScript 6.0.3; resolved ${version} at ${manifestPath}`);
  return { version, tscPath: require.resolve('typescript/lib/tsc'), vueTscPath: require.resolve('vue-tsc') };
}
export async function runVueCompiler(workspace, args) {
  const compiler = resolveVueCompiler(workspace);
  const require = createRequire(resolve(workspace, 'package.json'));
  const { run } = require(compiler.vueTscPath);
  if (typeof run !== 'function') throw Error(`${compiler.vueTscPath}: missing vue-tsc.run`);
  // vue-tsc reads process.argv itself. Remove every launcher option.
  process.argv = [process.execPath, compiler.vueTscPath, ...args];
  process.chdir(resolve(workspace));
  await run(compiler.tscPath);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { options, args } = parseArgs(process.argv.slice(2), ['--workspace']);
    if (!options['--workspace']) throw Error('Missing --workspace');
    await runVueCompiler(options['--workspace'], args);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
