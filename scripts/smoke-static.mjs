import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inside } from './pack-contracts.mjs';

export async function staticSmoke({ workspace, output, app, mode, port, readiness }) {
  if (!existsSync(join(output, 'index.html'))) throw Error(`${app} production browser output missing`);
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.map': 'application/json' };
  const http = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname === '/__ready') return readiness(request, response);
      response.setHeader('Cache-Control', 'no-store');
      if (pathname === '/__imports' && mode === 'packed') {
        response.setHeader('Content-Type', 'application/json');
        return response.end(readFileSync(join(workspace, 'reports/imports.json')));
      }
      const minimal = /^\/minimal\/(button|named|unused)(?:\/(.*))?$/.exec(pathname);
      if (app === 'vue' && mode === 'packed' && minimal) {
        const base = join(workspace, 'size', minimal[1]); const file = resolve(base, minimal[2] || 'index.html');
        if (!inside(base, file)) { response.writeHead(403); return response.end(); }
        if (!existsSync(file) || !statSync(file).isFile()) { response.writeHead(404); return response.end(); }
        response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream'); return response.end(readFileSync(file));
      }
      if (pathname === '/ssr') {
        if (mode !== 'packed' || !['vue', 'react'].includes(app)) { response.writeHead(404); return response.end('Angular SSR not implemented'); }
        const { render } = await import(pathToFileURL(join(workspace, 'server/ssr.js')).href);
        const html = readFileSync(join(output, 'index.html'), 'utf8');
        if (!html.includes('<div id="app"></div>')) throw Error('Missing production SSR placeholder');
        const markup = await render(request.url);
        const capture = '<script>window.__zoomSSRNode=document.getElementById("app").firstElementChild;window.__zoomSSRButton=document.querySelector("[data-testid=action]");</script>';
        response.setHeader('Content-Type', 'text/html');
        return response.end(html.replace('<div id="app"></div>', `<div id="app" data-ssr="true">${markup}</div>${capture}`));
      }
      let file = resolve(output, `.${pathname}`);
      if (!inside(output, file)) { response.writeHead(403); return response.end(); }
      if (!existsSync(file) || !statSync(file).isFile()) {
        if (extname(pathname)) { response.writeHead(404); return response.end(); }
        file = join(output, 'index.html');
      }
      response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream'); response.end(readFileSync(file));
    } catch (error) { console.error(error); response.writeHead(500); response.end(error.message); }
  });
  await new Promise((accept, reject) => { http.once('error', reject); http.listen(port, '127.0.0.1', accept); });
  return { close: () => new Promise((accept, reject) => { http.close(error => error ? reject(error) : accept()); http.closeAllConnections(); }) };
}
