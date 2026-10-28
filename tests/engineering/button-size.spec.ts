import { expect, it } from 'vitest';
import { transformWithOxc } from 'vite';
import { minimalButtonEntry, assertUnusedButtonEvidence } from './packed/button-size-contract.mjs';

it('T7.32 retains the unused value import through TS conversion so the bundler must remove it', async () => {
  const transformed = await transformWithOxc(minimalButtonEntry('unused'), 'main.ts');
  expect(transformed.code).toMatch(/import\s*\{[^}]*ZButton[^}]*\}\s*from\s*["']@zoom-design\/vue["']/);
});
it('T7.32 rejects missing graph evidence and final retained implementation, then accepts elimination', () => {
  const graph = { moduleIds: ['/consumer/node_modules/@zoom-design/vue/dist/index.js', '/consumer/node_modules/@zoom-design/vue/dist/button-abc.js'] };
  expect(() => assertUnusedButtonEvidence({ moduleIds: [] }, 'document.body.textContent="control"')).toThrow(/never.*Button/i);
  expect(() => assertUnusedButtonEvidence(graph, 'document.body.className="zoom-button"')).toThrow(/retained Button/);
  expect(() => assertUnusedButtonEvidence(graph, 'document.body.textContent="control"')).not.toThrow();
});
