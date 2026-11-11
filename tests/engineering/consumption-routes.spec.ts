import { describe, expect, it } from 'vitest';
import { exampleProps, selectExample } from '../../apps/vue-smoke/src/examples.js';
import { normalizeScenarioConfig } from '../../apps/vue-smoke/src/scenarios/shared/normalize.js';

describe('Task14.2 request-local admin route selection', () => {
  it('T14.2.1 resolves ordinary/SSR paths with the same private config and keeps legacy Dialog props', () => {
    const ordinary = selectExample('/scenarios/admin?category=blank&selectedRecord=blank&instance=left');
    const ssr = selectExample('/ssr?example=admin-scenario&category=blank&selectedRecord=blank&instance=left');
    expect(ordinary.example).toBe('admin-scenario');
    expect(ssr.example).toBe('admin-scenario');
    expect(ordinary).toHaveProperty('scenarioConfig', normalizeScenarioConfig('admin', { category: 'blank', selectedRecord: 'blank', instance: 'left' }));
    expect(exampleProps(ssr)).toEqual(exampleProps(ordinary));
    expect(exampleProps(selectExample('/dialog/appearance?instance=true'))).toMatchObject({ instance: true });
    expect(exampleProps(selectExample('/dialog/appearance?instance=left'))).toMatchObject({ instance: false });
    expect(selectExample('/ssr?example=brand-scenario').example).toBe('brand-scenario');
    expect(selectExample('/ssr?example=dialog-focus-regression').example).toBe('probe');
  });

  it('T14.2.1 normalizes invalid inputs, preserves first aliases and isolates requests', () => {
    const a = selectExample('/scenarios/admin/?brand=purple&brand=teal&record=blank&open=true');
    selectExample('/scenarios/admin?empty=true&record=zero&category=general');
    expect(selectExample('/scenarios/admin/?brand=purple&brand=teal&record=blank&open=true')).toEqual(a);
    expect(a).toHaveProperty('scenarioConfig.brand', 'purple');
    expect(a).toHaveProperty('scenarioConfig.recordId', '');
    expect(selectExample('/scenarios/admin?record=bad&category=bad&delay=-1')).toHaveProperty('scenarioConfig.delay', 400);
    expect(typeof document).toBe('undefined');
  });
});

describe('Task14.4 request-local brand route selection', () => {
  it('T14.4.1 ordinary and SSR brand paths share normalized props without changing admin or legacy instance semantics', () => {
    const query = 'plan=standard&point=online&instance=right&open=true';
    const ordinary = selectExample(`/scenarios/brand?${query}`);
    const ssr = selectExample(`/ssr?example=brand-scenario&${query}`);
    expect(ordinary.example).toBe('brand-scenario');
    expect(ssr.example).toBe('brand-scenario');
    expect(exampleProps(ordinary)).toEqual({ scenarioConfig: normalizeScenarioConfig('brand', { plan: 'standard', point: 'online', instance: 'right', open: true }) });
    expect(exampleProps(ssr)).toEqual(exampleProps(ordinary));
    expect(selectExample('/scenarios/brand/?brand=invalid&brand=teal')).toHaveProperty('scenarioConfig.brand', 'purple');
    expect(selectExample('/scenarios/admin').example).toBe('admin-scenario');
    expect(selectExample('/dialog/appearance?instance=true').instance).toBe(true);
    expect(selectExample('/scenarios/brandish').example).toBe('probe');
    expect(typeof document).toBe('undefined');
  });
});

describe('Task14.7 diagnostic route selection', () => {
  it('imports the mount module without a browser, mount or global document side effect', async () => {
    const module = await import('../../apps/vue-smoke/src/regressions/dialog-focus.js');
    expect(typeof module.mountDialogFocus).toBe('function'); expect(typeof document).toBe('undefined');
  });
  it('loads the fixed regression route with whitelisted request-local props and no SSR alias', () => {
    const route = selectExample('/regressions/dialog-focus?scenario=move&move=host-to-host&modal=true');
    expect(route.example).toBe('dialog-focus-regression');
    expect(exampleProps(route)).toEqual({ regression: { scenario: 'move', move: 'host-to-host', modal: true, position: 'before', action: 'replace', choice: 'select', background: false } });
    expect(selectExample('/ssr?example=dialog-focus-regression').example).toBe('probe');
    expect(exampleProps(selectExample('/regressions/dialog-focus?scenario=unknown&move=bad&modal=TRUE'))).toEqual({ regression: { scenario: 'tab-order', move: 'inline-to-portal', modal: false, position: 'before', action: 'replace', choice: 'select', background: false } });
    expect(selectExample('/regressions/dialog-focus-other').example).toBe('probe');
    expect(typeof document).toBe('undefined');
  });
});
