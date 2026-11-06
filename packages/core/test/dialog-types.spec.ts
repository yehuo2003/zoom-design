import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const fixture = resolve(import.meta.dirname, 'dialog-types');
function compile(workspace: string, config: string) {
  const base = resolve(root, workspace);
  const require = createRequire(resolve(base, 'package.json'));
  const compiler = resolve(dirname(require.resolve('typescript/package.json')), 'bin/tsc');
  return spawnSync(process.execPath, [compiler, '-p', resolve(fixture, config)], { cwd: base, encoding: 'utf8', shell: false });
}

describe('T13.1.3 Core Dialog close details', () => {
  for (const workspace of ['packages/vue', 'packages/core']) {
    it(`${workspace} accepts only three reasons and literal readonly states`, () => {
      const positive = compile(workspace, 'tsconfig.json');
      expect(positive.stdout + positive.stderr).toBe('');
      expect(positive.status).toBe(0);

      const negative = compile(workspace, 'tsconfig.negative.json');
      const diagnostics = negative.stdout + negative.stderr;
      expect(negative.status).not.toBe(0);
      expect(diagnostics).not.toMatch(/TS2305|TS2307/);
      const actual = [...diagnostics.matchAll(/invalid\.ts\((\d+),\d+\): error TS(\d+):/g)]
        .map(([, line, code]) => `${line}:TS${code}`);
      expect(actual).toEqual(['3:TS2322', '4:TS2322', '5:TS2322', '6:TS2322', '8:TS2540', '9:TS2540']);
    });
  }
});
