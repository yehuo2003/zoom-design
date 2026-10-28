import { isAbsolute } from 'node:path';

export const hosts = { platform: 4170, vue: 4171, react: 4172, angular: 4173 };
export function e2eSelection({ package: selection = 'all', browser = 'chromium', mode = 'workspace', consumerRoot } = {}) {
  if (!['all', 'platform', 'core', 'dom', 'vue', 'react', 'angular'].includes(selection)) throw Error(`Unknown package ${selection}`);
  if (!['chromium', 'firefox', 'webkit', 'all'].includes(browser)) throw Error(`Unknown browser ${browser}`);
  if (!['workspace', 'packed'].includes(mode)) throw Error(`Unknown E2E mode ${mode}`);
  if (mode === 'packed' && (!consumerRoot || !isAbsolute(consumerRoot))) throw Error('Packed mode requires an absolute consumer root prepared by Task5');
  if (mode === 'workspace' && consumerRoot) throw Error('Workspace mode cannot use a consumer root');
  const suites = selection === 'all' ? ['core', 'dom', 'vue', 'react', 'angular'] : selection === 'platform' ? ['core', 'dom'] : [selection];
  const browsers = browser === 'all' ? ['chromium', 'firefox', 'webkit'] : [browser];
  return { mode, selection, browsers, suites, hosts: [...new Set(suites.map(name => ['core', 'dom'].includes(name) ? 'platform' : name))], projects: suites.flatMap(name => browsers.map(browser => `${name}-${browser}`)) };
}
