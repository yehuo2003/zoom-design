import { dirname, join, resolve, sep, extname, isAbsolute, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer as createHTTPServer } from 'node:http';
import { existsSync, readFileSync, statSync, realpathSync } from 'node:fs';
import { parseArgs } from './run-local-bin.mjs';
import { assertIsolatedRoot, assertNoLinks } from './pack-contracts.mjs';
import { staticSmoke } from './smoke-static.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { options, args } = parseArgs(process.argv.slice(2), ['--app', '--mode', '--port', '--consumer-root']);
const app = options['--app'];
const mode = options['--mode'];
if (args.length || !['platform', 'vue', 'react', 'angular'].includes(app) || !['workspace', 'packed'].includes(mode)) throw Error('Expected --app platform|vue|react|angular --mode workspace|packed');
const consumerRoot = options['--consumer-root'] ?? process.env.ZOOM_SMOKE_CONSUMER_ROOT;
let workspace = join(root, 'apps', `${app}-smoke`);
if (mode === 'packed') {
  if (!consumerRoot || !isAbsolute(consumerRoot)) throw Error('Packed mode requires an absolute consumer root prepared by Task5');
  const isolated = assertIsolatedRoot(consumerRoot, root);
  workspace = join(isolated, app);
  assertNoLinks(isolated, workspace);
  if (!existsSync(join(workspace, 'package.json'))) throw Error(`Missing packed ${app} consumer manifest`);
} else if (consumerRoot) throw Error('Workspace mode cannot use a consumer root');
const port = Number(options['--port']);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Expected a valid --port');
const runId = process.env.ZOOM_SMOKE_RUN_ID ?? randomUUID();
let server;
try {
  const readiness = (_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ app, mode, runId }));
  };
  if (mode === 'packed') {
    server = await staticSmoke({ workspace, output: join(workspace, 'browser'), app, mode, port, readiness });
  } else if (app === 'angular') {
    const output = mode === 'workspace' ? join(root, '.artifacts/task3/angular-smoke/browser') : join(workspace, 'browser');
    if (!existsSync(join(output, 'index.html'))) throw Error('Angular browser output missing; build angular-smoke first');
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json' };
    const http = createHTTPServer((request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
        if (pathname === '/__ready') return readiness(request, response);
        if (pathname === '/ssr') { response.writeHead(404); return response.end('Angular SSR not implemented in Task3'); }
        let file = resolve(output, `.${pathname}`);
        if (file !== output && !file.startsWith(output + sep)) { response.writeHead(403); return response.end(); }
        if (!existsSync(file) || !statSync(file).isFile()) {
          if (extname(pathname)) { response.writeHead(404); return response.end(); }
          file = join(output, 'index.html');
        }
        response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
        response.setHeader('Cache-Control', 'no-store'); response.end(readFileSync(file));
      } catch (error) { response.writeHead(500); response.end(error.message); }
    });
    await new Promise((accept, reject) => { http.once('error', reject); http.listen(port, '127.0.0.1', accept); });
    server = { close: () => new Promise((accept, reject) => { http.close(error => error ? reject(error) : accept()); http.closeAllConnections(); }) };
  } else {
    const require = createRequire(join(workspace, 'package.json'));
    const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
    server = await createServer({
      configFile: app === 'platform' ? false : join(workspace, 'vite.config.ts'), root: workspace,
      optimizeDeps: { exclude: app === 'platform' ? ['@zoom-design/core', '@zoom-design/dom'] : [`@zoom-design/${app}`] },
      server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [mode === 'workspace' ? root : workspace] } },
      plugins: [{ name: 'engineering-readiness', configureServer(vite) {
      vite.middlewares.use('/__ready', (_request, response) => {
        readiness(_request, response);
      });
      if (['vue', 'react'].includes(app)) vite.middlewares.use(async (request, response, next) => {
        if (new URL(request.url, 'http://127.0.0.1').pathname !== '/ssr') return next();
        try {
          const { render } = await vite.ssrLoadModule('/src/ssr.ts');
          const markup = await render(request.url);
          const capture = '<script>window.__zoomSSRNode=document.getElementById("app").firstElementChild;window.__zoomSSRButton=document.querySelector("[data-testid=action]");</script>';
          const source = readFileSync(join(workspace, 'index.html'), 'utf8');
          if (!source.includes('<div id="app"></div>')) throw Error('SSR host must provide #app placeholder');
          const template = source.replace('<div id="app"></div>', `<div id="app" data-ssr="true">${markup}</div>${capture}`);
          const html = await vite.transformIndexHtml('/ssr', template);
          response.setHeader('Content-Type', 'text/html'); response.setHeader('Cache-Control', 'no-store'); response.end(html);
        } catch (error) { vite.ssrFixStacktrace(error); console.error(error); response.statusCode = 500; response.end(error.message); }
      });
      } }],
    });
    await server.listen();
  }
  console.log(`${app} smoke ready: http://127.0.0.1:${port}/__ready (${runId})`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await server.close(); process.exit(0); });
} catch (error) { console.error(error.message); await server?.close(); process.exitCode = 1; }
