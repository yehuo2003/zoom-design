import { describe, expect, it } from 'vitest';
import { useBrandBrowse } from '../../apps/vue-smoke/src/scenarios/brand/useBrandBrowse.js';
import { normalizeScenarioConfig } from '../../apps/vue-smoke/src/scenarios/shared/normalize.js';

describe('Task14.4 brand browse selection', () => {
  it('T14.4.1/2 defaults to zero and preserves blank plan/point as confirmed values', () => {
    const model = useBrandBrowse();
    expect(model.selection.value).toEqual({ planId: 0, servicePointId: 0 });
    expect(model.changePlan('')).toBe(true); expect(model.changePoint('')).toBe(true);
    expect(model.selection.value).toEqual({ planId: '', servicePointId: '' });
    expect(model.pointQuery.value).toBe('线上服务'); expect(model.selectionMessage.value).toBe('');
    expect(model.changePlan(0)).toBe(true);
    expect(model.selection.value.servicePointId).toBe('');
  });
  it('T14.4.3 provisional query cannot change confirmed point or create new business IDs', () => {
    const model = useBrandBrowse();
    model.setPointQuery('任意服务点'); model.setPointOpen(true);
    expect(model.selection.value.servicePointId).toBe(0);
    expect(model.changePoint('任意服务点')).toBe(false);
    expect(model.changePoint('0')).toBe(false);
    expect(model.selection.value.servicePointId).toBe(0);
    expect(model.data.servicePoints).toHaveLength(4);
  });
  it('T14.4.4 incompatible plan change clears point/query/popup together without choosing north', () => {
    const model = useBrandBrowse();
    model.setPointQuery('北'); model.setPointOpen(true); model.changePlan('extended');
    expect(model.selection.value).toEqual({ planId: 'extended', servicePointId: null });
    expect(model.pointQuery.value).toBe(''); expect(model.pointOpen.value).toBe(false);
    expect(model.selectionMessage.value).toBe('请重新选择服务点');
    expect(model.pointOptions.value.map(option => option.value)).toEqual(['north', 'retired']);
    expect(model.changePoint(0)).toBe(false);
    expect(model.changePoint('north')).toBe(true);
    model.setPointQuery('临时文本'); model.setPointOpen(true); model.changePlan(0);
    expect(model.selection.value.servicePointId).toBe('north');
    expect(model.pointQuery.value).toBe('临时文本');
  });
  it('T14.4.4/5 direct incompatible initialization and disabled/unknown choices stay unselected', () => {
    const model = useBrandBrowse(normalizeScenarioConfig('brand', { plan: 'extended' }));
    expect(model.selection.value.servicePointId).toBeNull(); expect(model.pointQuery.value).toBe('');
    expect(model.changePoint('retired')).toBe(false);
    expect(model.pointOptions.value.find(option => option.value === 'retired')?.disabled).toBe(true);
    expect(model.changePlan('unknown')).toBe(false); expect(model.changePlan('0')).toBe(false);
    expect(model.selection.value.planId).toBe('extended');
  });
  it('T14.4.6 empty catalog and explicit clearing do not manufacture defaults', () => {
    const empty = useBrandBrowse(normalizeScenarioConfig('brand', { empty: true, open: true }));
    expect(empty.data.plans).toEqual([]); expect(empty.selection.value).toEqual({ planId: null, servicePointId: null });
    expect(empty.changePlan(0)).toBe(false); expect(empty.changePoint('north')).toBe(false);
    const model = useBrandBrowse(); model.setPointOpen(true); model.changePoint(null);
    expect(model.pointQuery.value).toBe(''); expect(model.pointOpen.value).toBe(false);
    expect(model.selectionMessage.value).toBe('请重新选择服务点');
    model.changePlan(null); expect(model.selection.value.planId).toBeNull();
  });
  it('T14.4.8 same-config instances and repeated initialization isolate choices, queries and options', () => {
    const config = normalizeScenarioConfig('brand', { plan: 'standard', point: 'online' });
    const first = useBrandBrowse(config); const second = useBrandBrowse(config);
    first.changePlan('extended'); first.setPointQuery('北'); first.setPointOpen(true);
    expect(second.selection.value).toEqual({ planId: '', servicePointId: '' });
    expect(second.pointQuery.value).toBe('线上服务'); expect(second.pointOpen.value).toBe(false);
    expect(first.data.plans).not.toBe(second.data.plans);
    expect(first.data.servicePoints[0]).not.toBe(second.data.servicePoints[0]);
    expect(useBrandBrowse(config).selection.value).toEqual(second.selection.value);
  });
});
