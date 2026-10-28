import { expect, it } from 'vitest';

it('T4.4/T4.5 selects fifteen projects and deduplicates the shared platform host', async () => {
  const { e2eSelection } = await import('../../scripts/e2e-plan.mjs');
  const all = e2eSelection({ browser: 'all' });
  expect(all.projects).toHaveLength(15);
  expect(all.projects).toContain('angular-webkit');
  expect(all.hosts).toEqual(['platform', 'vue', 'react', 'angular']);
  expect(e2eSelection({ package: 'dom' })).toMatchObject({ projects: ['dom-chromium'], hosts: ['platform'] });
  expect(e2eSelection({ package: 'vue', browser: 'firefox' })).toMatchObject({ projects: ['vue-firefox'], hosts: ['vue'] });
});
it('T4.4 rejects unknown filters and incomplete packed mode instead of falling back', async () => {
  const { e2eSelection } = await import('../../scripts/e2e-plan.mjs');
  expect(() => e2eSelection({ package: 'typo' })).toThrow();
  expect(() => e2eSelection({ browser: 'typo' })).toThrow();
  expect(() => e2eSelection({ mode: 'packed' })).toThrow('consumer');
});
