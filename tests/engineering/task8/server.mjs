import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('./fixture/', import.meta.url));
const server = await createServer({
  root: directory, configFile: false, plugins: [vue(), {
    name: 'task8-test-only-ssr', configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        if (new URL(request.url, 'http://fixture').pathname !== '/ssr') return next();
        try {
          const { render } = await vite.ssrLoadModule('/ssr.ts');
          const markup = await render(request.url);
          const template = readFileSync(new URL('./fixture/index.html', import.meta.url), 'utf8')
            .replace('<main id="ssr"></main>', `<main id="ssr" data-ssr="true">${markup}</main><script>window.task8SSRNodes=[...document.querySelectorAll('[role=listbox]')];</script>`);
          response.setHeader('Content-Type', 'text/html'); response.end(await vite.transformIndexHtml(request.url, template));
        } catch (error) { vite.ssrFixStacktrace(error); response.statusCode = 500; response.end(error.stack); }
      });
    },
  }],
  server: { host: '127.0.0.1', port: 5188, strictPort: true, fs: { allow: [fileURLToPath(new URL('../../../', import.meta.url))] } },
});
await server.listen();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  const deadline = setTimeout(() => process.exit(0), 3000); deadline.unref();
  await server.close(); clearTimeout(deadline); process.exit(0);
});
