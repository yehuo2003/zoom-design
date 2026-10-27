import { expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

it('T3.14 runs Vue typecheck without pre-existing TS7 platform fixtures', () => {
  const root = process.cwd();
  const fixtureRoot = resolve(root, '.artifacts/fixtures');
  const output = join(fixtureRoot, 'platform');
  const backupRoot = mkdtempSync(join(fixtureRoot, 'vue-clean-state-'));
  const backup = join(backupRoot, 'platform');
  for (const target of [output, backupRoot, backup]) {
    const within = relative(fixtureRoot, target);
    if (!within || within.startsWith('..') || isAbsolute(within)) throw Error(`Unsafe fixture path: ${target}`);
  }
  const hadOutput = existsSync(output);
  if (hadOutput) renameSync(output, backup);
  try {
    const result = spawnSync(process.execPath, ['scripts/check-vue.mjs'], {
      cwd: root, encoding: 'utf8', shell: false, timeout: 90000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
    expect(readFileSync(join(output, 'packages/core/test/fixtures/state.d.ts'), 'utf8')).toContain('interface');
  } finally {
    if (hadOutput) {
      rmSync(output, { recursive: true, force: true });
      renameSync(backup, output);
    }
    rmSync(backupRoot, { recursive: true });
  }
}, 100000);
