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
    expect(selectExample('/ssr?example=brand-scenario').example).toBe('probe');
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
