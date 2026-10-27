import { dirname, join, resolve, sep, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer as createHTTPServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { parseArgs } from './run-local-bin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { options, args } = parseArgs(process.argv.slice(2), ['--app', '--mode', '--port']);
const app = options['--app'];
if (args.length || !['platform', 'vue', 'react', 'angular'].includes(app) || options['--mode'] !== 'workspace') throw Error('Expected --app platform|vue|react|angular --mode workspace');
const port = Number(options['--port']);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Expected a valid --port');
const runId = process.env.ZOOM_SMOKE_RUN_ID ?? randomUUID();
let server;
try {
  const readiness = (_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    response.end(JSON.stringify({ app, mode: 'workspace', runId }));
  };
  if (app === 'angular') {
    const output = join(root, '.artifacts/task3/angular-smoke/browser');
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
    const workspace = join(root, 'apps', `${app}-smoke`);
    const require = createRequire(join(workspace, 'package.json'));
    const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
    server = await createServer({
      configFile: app === 'platform' ? false : join(workspace, 'vite.config.ts'), root: workspace,
      optimizeDeps: { exclude: app === 'platform' ? ['@zoom-design/core', '@zoom-design/dom'] : [`@zoom-design/${app}`] },
      server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [root] } },
      plugins: [{ name: 'engineering-readiness', configureServer(vite) {
      vite.middlewares.use('/__ready', (_request, response) => {
        readiness(_request, response);
      });
      if (['vue', 'react'].includes(app)) vite.middlewares.use(async (request, response, next) => {
        if (new URL(request.url, 'http://127.0.0.1').pathname !== '/ssr') return next();
        try {
          const { render } = await vite.ssrLoadModule('/src/ssr.ts');
          const markup = await render();
          const capture = '<script>window.__zoomSSRNode=document.getElementById("app").firstElementChild;</script>';
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
