import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { requiredFrameworkFiles, runFrameworkBuild } from '../../scripts/framework-artifacts.mjs';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture(): string {
  const output = mkdtempSync(join(tmpdir(), 'zoom-dialog-build-'));
  roots.push(output);
  return output;
}
function populate(output: string, omitted?: string) {
  for (const file of requiredFrameworkFiles('vue')) {
    if (file === omitted) continue;
    const path = join(output, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'fixture');
  }
}

describe('Task13.9 framework artifact gate', () => {
  for (const missing of ['dialog/index.js', 'types/dialog/index.d.ts', 'types/dialog/Dialog.vue.d.ts', 'dialog/style.css']) {
    it(`T13.9.6 rejects missing ${missing} and removes invalid dist`, () => {
      const output = fixture();
      expect(() => runFrameworkBuild('vue', output, () => populate(output, missing))).toThrow(`vue: missing built ${missing}`);
      expect(existsSync(output)).toBe(false);
    });
  }
  it('T13.9.6 removes partial dist when a build stage fails', () => {
    const output = fixture();
    expect(() => runFrameworkBuild('vue', output, () => {
      populate(output);
      throw Error('forced declaration failure');
    })).toThrow('forced declaration failure');
    expect(existsSync(output)).toBe(false);
  });
});
