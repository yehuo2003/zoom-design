import { test as base, expect } from '@playwright/test';

type Rule = { kind: 'pageerror' | 'console.error'; pattern: RegExp; required: boolean };
type RuntimeErrors = { rules: Rule[]; allowPageError: (pattern: RegExp) => void; allowConsoleError: (pattern: RegExp) => void };
export const test = base.extend<{ runtimeErrors: RuntimeErrors; _runtimeGuard: void; _readiness: void; packageImports: Record<string, RegExp | string>; assetEvidence: () => Promise<void> }>({
  packageImports: async ({ request }, use, testInfo) => {
    const imports: Record<string, RegExp | string> = Object.fromEntries(['core', 'dom', 'vue', 'react'].map(name => [name, new RegExp(`/packages/${name}/dist/index\\.js`)]));
    imports.angular = '**/chunk-*.js';
    imports.vueButton = /\/packages\/vue\/dist\/button\/index\.js/;
    imports.vueSelect = /\/packages\/vue\/dist\/select\/index\.js/;
    if (testInfo.config.metadata.mode === 'packed') {
      const response = await request.get('/__imports');
      expect(response.ok()).toBe(true);
      const actual = await response.json();
      const suite = testInfo.project.name.split('-')[0];
      expect(actual[suite]).toMatch(/^\/.+\.js$/);
      if (suite === 'vue') {
        expect(actual.vueButton).toMatch(/^\/.+\.js$/);
        expect(actual.vueSelect).toMatch(/^\/.+\.js$/);
      }
      for (const [name, path] of Object.entries(actual)) imports[name] = `**${path}`;
    }
    await use(imports);
  },
  assetEvidence: async ({ page }, use, testInfo) => {
    const responses: { url: string; ok: boolean; body: Promise<string> }[] = [];
    page.on('response', response => {
      if (/\.css(?:\?|$)/.test(response.url())) responses.push({ url: response.url(), ok: response.ok(), body: response.text() });
    });
    await use(async () => {
      if (testInfo.config.metadata.mode !== 'packed') return;
      expect(responses.length, 'production CSS requested by the page').toBeGreaterThan(0);
      for (const response of responses) expect(response.ok, response.url).toBe(true);
      const bodies = await Promise.all(responses.map(response => response.body));
      expect(bodies.some(body => /--zoom-engineering-built\s*:\s*1/.test(body)), 'real compiled package CSS marker').toBe(true);
      await testInfo.attach('packed-css-requests', { body: JSON.stringify(responses.map(({ url, ok }) => ({ url, ok }))), contentType: 'application/json' });
    });
    await Promise.all(responses.map(response => response.body));
  },
  _readiness: [async ({ request }, use, testInfo) => {
    const response = await request.get('/__ready');
    expect(response.ok()).toBe(true);
    const suite = testInfo.project.name.split('-')[0];
    expect(await response.json()).toMatchObject({ app: ['core', 'dom'].includes(suite) ? 'platform' : suite, mode: testInfo.config.metadata.mode, runId: testInfo.config.metadata.runId });
    await use();
  }, { auto: true }],
  runtimeErrors: async ({}, use) => {
    const rules: Rule[] = [];
    await use({ rules, allowPageError: pattern => rules.push({ kind: 'pageerror', pattern, required: true }), allowConsoleError: pattern => rules.push({ kind: 'console.error', pattern, required: false }) });
  },
  _runtimeGuard: [async ({ page, runtimeErrors }, use, testInfo) => {
    const observed: { kind: Rule['kind']; message: string }[] = [];
    const pending: Promise<void>[] = [];
    page.on('pageerror', error => observed.push({ kind: 'pageerror', message: error.message }));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      const event = { kind: 'console.error' as const, message: message.text() };
      observed.push(event);
      // Firefox's text() can be only "Error". Preserve the actual Error.message
      // rather than accepting a generic console-error allowlist entry.
      pending.push(Promise.all(message.args().map(handle => handle.evaluate(value => {
        if (value && typeof value === 'object' && typeof value.message === 'string') return `${value.name ?? 'Error'}: ${value.message}`;
        return '';
      }).catch(() => ''))).then(details => { event.message = [event.message, ...details.filter(Boolean)].join(' '); }));
    });
    await use();
    await Promise.all(pending);
    const matches = (rule: Rule, event: typeof observed[number]) => rule.kind === event.kind && rule.pattern.test(event.message);
    const unexpected = observed.filter(event => !runtimeErrors.rules.some(rule => matches(rule, event)));
    if (observed.length) await testInfo.attach('runtime-errors', { body: JSON.stringify(observed, null, 2), contentType: 'application/json' });
    expect(unexpected, 'Unexpected pageerror/console.error').toEqual([]);
    for (const rule of runtimeErrors.rules.filter(rule => rule.required)) expect(observed.some(event => matches(rule, event)), `Expected pageerror ${rule.pattern}`).toBe(true);
  }, { auto: true }],
});
export { expect };

