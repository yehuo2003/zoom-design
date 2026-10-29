import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
it('T11.16 all five documented Select Vue examples compile against the real public declarations and all tokens exist in CSS', () => {
  const result = spawnSync(process.execPath, ['scripts/check-select-docs.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
  expect(result.stdout + result.stderr).toContain('five actual Vue examples strict-compiled'); expect(result.status).toBe(0);
});
