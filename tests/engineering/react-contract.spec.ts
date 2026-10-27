import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

it('React public artifacts stay empty and expose independently compiled CSS', async () => {
  // Resolve through native ESM import conditions, matching this ESM-only package.
  const app = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval',
    'console.log(JSON.stringify({ js: import.meta.resolve("@zoom-design/react"), css: import.meta.resolve("@zoom-design/react/style.css"), exports: Object.keys(await import("@zoom-design/react")) }))',
  ], { cwd: resolve('apps/react-smoke'), encoding: 'utf8' }));
  const manifest = JSON.parse(readFileSync('packages/react/package.json', 'utf8'));
  expect(fileURLToPath(app.js)).toBe(resolve('packages/react/dist/index.js'));
  expect(app.exports).toEqual([]);
  expect(fileURLToPath(app.css)).toBe(resolve('packages/react/dist/style.css'));
  expect(readFileSync(fileURLToPath(app.css), 'utf8')).toMatch(/--zoom-engineering-built:\s*1/);
  expect(manifest.sideEffects).toEqual(['**/*.css']);
  expect(manifest.peerDependencies).toEqual({ react: '~19.3.1', 'react-dom': '~19.3.1' });
  expect(readFileSync('packages/react/dist/types/index.d.ts', 'utf8')).not.toContain('BuildProbe');
});
