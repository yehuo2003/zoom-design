import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const scratch: string[] = [];
afterEach(() => { for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('Task3 shared styles', () => {
  it('T3.17 emits plain CSS and removes a stale output on a real Sass error', async () => {
    expect(existsSync(resolve('scripts/build-styles.mjs'))).toBe(true);
    const { compileStyle } = await import('../../scripts/build-styles.mjs');
    const directory = mkdtempSync(join(tmpdir(), 'zoom-sass-')); scratch.push(directory);
    const source = join(directory, 'style.scss'); const output = join(directory, 'style.css');
    writeFileSync(source, '$value: 1; .zoom-engineering-probe { --zoom-engineering-built: #{$value}; }');
    compileStyle(source, output);
    expect(readFileSync(output, 'utf8')).toContain('--zoom-engineering-built: 1');
    expect(readFileSync(output, 'utf8')).not.toContain('$value');
    writeFileSync(source, '.broken { color:');
    expect(() => compileStyle(source, output)).toThrow(); expect(existsSync(output)).toBe(false);
  });
  it('rejects an unknown style target with a nonzero status', () => {
    const result = spawnSync(process.execPath, ['scripts/build-styles.mjs', '--package', 'unknown'], { encoding: 'utf8' });
    expect(result.status).not.toBe(0); expect(result.stderr).toContain('Unknown style package');
  });
});
