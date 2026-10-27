import { expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

it('T3.16 managed shutdown terminates the started child and its descendant', async () => {
  expect(existsSync(resolve('scripts/process-group.mjs'))).toBe(true);
  const { ProcessGroup } = await import('../../scripts/process-group.mjs');
  const failures: unknown[] = []; const group = new ProcessGroup((failure: unknown) => failures.push(failure));
  let descendant = 0;
  try {
    const child = group.start(process.execPath, ['--input-type=module', '-e', `
      import {spawn} from 'node:child_process';
      const nested=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',windowsHide:true});
      console.log(JSON.stringify({descendant:nested.pid}));setInterval(()=>{},1000);
    `], { label: 'lifecycle probe', stdio: ['ignore', 'pipe', 'pipe'] });
    descendant = await new Promise<number>((accept, reject) => {
      let output = ''; child.stdout!.on('data', (chunk: Buffer) => { output += chunk; if (output.includes('\n')) accept(JSON.parse(output).descendant); });
      child.once('error', reject);
    });
    expect(descendant).toBeGreaterThan(0);
    await group.stop();
    expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
    await expect.poll(() => { try { process.kill(descendant, 0); return true; } catch { return false; } }).toBe(false);
    expect(failures).toEqual([]);
  } finally { await group.stop(); }
});
