import { describe, expect, it } from 'vitest';
import { useScenarioAppearance } from '../../apps/vue-smoke/src/scenarios/shared/useScenarioAppearance.js';
import { normalizeScenarioConfig } from '../../apps/vue-smoke/src/scenarios/shared/normalize.js';

describe('Task14.6 scoped appearance state', () => {
  it('T14.6.1/2 accepts only known presets without changing shared business config', () => {
    const config = normalizeScenarioConfig('brand'); const state = useScenarioAppearance(config);
    expect(state.brand.value).toBe('purple'); expect(state.density.value).toBe('regular');
    state.setBrand('teal'); state.setDensity('compact'); state.setFont('serif'); state.setLarge(true);
    expect(state.brand.value).toBe('teal'); expect(state.font.value).toBe('serif'); expect(state.large.value).toBe(true);
    state.setBrand('bad'); state.setDensity('bad'); state.setFont('url(invalid)');
    expect(state.brand.value).toBe('teal'); expect(state.density.value).toBe('compact'); expect(state.font.value).toBe('serif');
    expect(config.brand).toBe('purple'); expect(config.density).toBe('regular');
  });
  it('T14.6.3/5 initialization and later appearance changes remain instance-local and DOM-free', () => {
    const config = normalizeScenarioConfig('admin', { large: true, rtl: true });
    const first = useScenarioAppearance(config), second = useScenarioAppearance(config);
    expect(first.large.value).toBe(true); expect(first.rtl.value).toBe(true);
    first.setRtl(false); first.setLarge(false); first.setBrand('purple');
    expect(second.rtl.value).toBe(true); expect(second.large.value).toBe(true); expect(second.brand.value).toBe('teal');
    expect(typeof document).toBe('undefined');
  });
});
