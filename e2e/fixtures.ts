import { test as base, expect } from '@playwright/test';

export const test = base;
export { expect };

test.beforeEach(async ({ request }, testInfo) => {
  const response = await request.get('/__ready');
  expect(response.ok()).toBe(true);
  const suite = testInfo.project.name.split('-')[0];
  expect(await response.json()).toMatchObject({ app: ['core', 'dom'].includes(suite) ? 'platform' : suite, mode: 'workspace', runId: testInfo.config.metadata.runId });
});
