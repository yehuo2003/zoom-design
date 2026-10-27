import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, watch } from 'node:fs';
import { createServer } from 'node:net';
import { parseArgs, resolveBin } from './run-local-bin.mjs';
import { ProcessGroup } from './process-group.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { options, args } = parseArgs(process.argv.slice(2), ['--app']);
const app = options['--app'];
const ports = { platform: 5170, vue: 5171, react: 5172, angular: 5173 };
if (args.length || !Object.hasOwn(ports, app)) throw Error('Expected --app platform|vue|react|angular');
let stopping = false; let server; let timer; let busy = false; let queued = false; let complete;
const done = new Promise(accept => { complete = accept; }); const watchers = [];
const group = new ProcessGroup(error => { void stop(1, error); });
async function stop(code, error) {
  if (stopping) return; stopping = true;
  clearTimeout(timer); for (const watcher of watchers) watcher.close();
  if (error) console.error(`Development stopped: ${error.message}`);
  try { await group.stop(); } catch (cleanup) { console.error(cleanup.message); code = 1; }
  if (process.connected) process.disconnect();
  process.exitCode = code; complete();
}
function run(file, argv, label) {
  return new Promise((accept, reject) => {
    const child = group.start(process.execPath, [file, ...argv], { cwd: root, label, transient: true });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? accept() : reject(Error(`${label} failed (${signal ?? code})`)));
  });
}
async function build() {
  if (app === 'platform') await run(join(root, 'scripts/build-platform.mjs'), ['dom'], 'platform package build');
  else if (app === 'angular') await run(join(root, 'scripts/build-angular.mjs'), [], 'Angular package build');
  else await run(join(root, 'scripts/build-framework.mjs'), [app], `${app} package build`);
}
function startServer() {
  if (app === 'angular') {
    const workspace = join(root, 'apps/angular-smoke'); const tool = resolveBin(workspace, '@angular/cli', 'ng');
    return group.start(process.execPath, [tool.path, 'serve', 'angular-smoke', '--host', '127.0.0.1', '--port', String(ports[app])], { cwd: workspace, label: 'Angular native preview', env: { ...process.env, CI: 'true', NG_CLI_ANALYTICS: 'false' } });
  }
  return group.start(process.execPath, [join(root, 'scripts/serve-smoke.mjs'), '--app', app, '--mode', 'workspace', '--port', String(ports[app])], { cwd: root, label: `${app} native preview` });
}
async function rebuild() {
  queued = true;
  if (busy || stopping) return; busy = true;
  try {
    while (queued && !stopping) {
      queued = false;
      // Pause the server while required outputs are replaced; stale output is never reported as ready.
      await group.stopChild(server); server = null;
      await build();
      if (!stopping) { server = startServer(); console.log(`${app}: package/styles rebuilt; preview restarted`); }
    }
  } catch (error) { await stop(1, error); } finally { busy = false; }
}
try {
  // Check the exact advertised port first; native CLIs must never silently choose another.
  await new Promise((accept, reject) => {
    const probe = createServer(); probe.once('error', reject);
    probe.listen(ports[app], '127.0.0.1', () => probe.close(accept));
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop(0); });
  // A Node parent can forward an interrupt through its private IPC channel.
  // This also supports hosts whose terminal cannot deliver Windows console events.
  if (process.send) process.on('message', message => {
    if (message?.type === 'signal' && ['SIGINT', 'SIGTERM'].includes(message.signal)) process.emit(message.signal);
  });
  await build();
  if (!stopping) {
    server = startServer();
    const names = app === 'platform' ? ['core', 'dom'] : [app];
    const directories = [...names.map(name => join(root, 'packages', name, 'src')), join(root, 'design/styles')].filter(existsSync);
    for (const directory of directories) watchers.push(watch(directory, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => { void rebuild(); }, 100); }));
    console.log(`Preview: http://127.0.0.1:${ports[app]} — Ctrl+C closes this run's managed processes`);
  }
} catch (error) { await stop(1, error); }
await done;
