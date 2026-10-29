import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { verifySelectSSR } from '../tests/engineering/packed/select-ssr-contract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ configFile: join(root, 'apps/vue-smoke/vite.config.ts'), server: { middlewareMode: true }, appType: 'custom' });
try {
  const { render } = await server.ssrLoadModule('/src/ssr.ts');
  const html = await render();
  assert.ok(html.includes('Vue engineering probe'));
  assert.ok(html.includes('aria-label="Count">0</output>'));
  assert.ok(html.includes('aria-label="Label">Initial</output>'));
  console.log('Vue server-renderer native SFC markup: PASS');
  await verifySelectSSR(render);
  console.log('Vue Select SSR closed/open inline portal and request isolation: PASS');
} finally { await server.close(); }
