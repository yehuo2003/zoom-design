import { describe, expect, it } from 'vitest';
import { createScenarioData } from '../../apps/vue-smoke/src/scenarios/shared/data.js';
import {
  createInitialScenarioState, filterRecords, isRecordDirty, normalizeScenarioConfig,
  normalizeBrandSelection, parseScenarioConfig, toRecordSavePayload, toPreferenceSubmitPayload,
} from '../../apps/vue-smoke/src/scenarios/shared/normalize.js';

describe('Task14.1 private consumption contracts', () => {
  it('T14.1.1 creates deeply independent records and options for each instance/request', () => {
    const a = createScenarioData();
    const b = createScenarioData();
    expect(a).toEqual(b);
    expect(a.records.map(record => record.id)).toEqual([0, '', 'rec-002', 'rec-003', 'rec-004', 'rec-005']);
    expect(a.records.some(record => record.title.length > 40)).toBe(true);
    a.records.splice(0, 1);
    Reflect.set(a.records[0]!, 'title', 'changed record');
    a.categories[0]!.label = 'changed';
    a.servicePoints[3]!.disabled = false;
    a.plans[0]!.label = 'changed';
    a.recordOptions[0]!.label = 'changed option';
    expect(b).toEqual(createScenarioData());
    expect(a.records[0]).not.toBe(b.records[1]);
  });

  it('T14.1.2 shares pure URL/direct defaults and takes the first query value', () => {
    expect(typeof document).toBe('undefined');
    const admin = normalizeScenarioConfig('admin');
    expect(admin).toMatchObject({ brand: 'teal', density: 'compact', open: false, recordId: 0,
      categoryId: null, selectedRecordId: null, keyword: '', save: 'success', delay: 400,
      instance: 'main', hostPosition: 'after', empty: false, long: false, rtl: false, large: false, dual: false });
    expect(normalizeScenarioConfig('brand')).toMatchObject({ brand: 'purple', density: 'regular', planId: 0, servicePointId: 0 });
    const query = new URLSearchParams('category=blank&selectedRecord=blank&record=blank&open=true&brand=teal&brand=purple&delay=0&instance=left&unknown=x');
    const parsed = parseScenarioConfig('admin', query);
    expect(parsed).toEqual(normalizeScenarioConfig('admin', { category: 'blank', selectedRecord: 'blank', record: 'blank', open: true, brand: 'teal', delay: 0, instance: 'left' }));
    expect(parsed).toMatchObject({ categoryId: '', selectedRecordId: '', recordId: '', delay: 0, open: true });
    expect(parseScenarioConfig('admin', new URLSearchParams('record=zero&selectedRecord=zero&category=general')))
      .toMatchObject({ recordId: 0, selectedRecordId: 0, categoryId: 0 });
    expect(parseScenarioConfig('brand', new URLSearchParams('plan=standard&point=online')))
      .toMatchObject({ planId: '', servicePointId: '' });
  });

  it('T14.1.2 rejects malformed flags, aliases and delay without numeric coercion', () => {
    for (const delay of ['-1', '2001', '1.5', '1e2', '0x10', ' 1', '', 'Infinity', 'NaN']) {
      expect(parseScenarioConfig('admin', new URLSearchParams({ delay })).delay).toBe(400);
    }
    for (const delay of ['0', '2000', '0400']) {
      expect(parseScenarioConfig('admin', new URLSearchParams({ delay })).delay).toBe(Number(delay));
    }
    expect(normalizeScenarioConfig('admin', { delay: 1.5 }).delay).toBe(400);
    expect(normalizeScenarioConfig('admin', { selectedRecord: 'first' }).selectedRecordId).toBeNull();
    expect(parseScenarioConfig('admin', new URLSearchParams('record=0&category=0&selectedRecord=0&brand=red&density=big&save=random&instance=true&open=1&long=TRUE&hostPosition=middle')))
      .toMatchObject({ recordId: 0, categoryId: null, selectedRecordId: null, brand: 'teal', density: 'compact', save: 'success', instance: 'main', open: false, long: false, hostPosition: 'after' });
    expect(normalizeScenarioConfig('admin', { keyword: '字'.repeat(101) }).keyword).toHaveLength(100);
  });

  it('T14.1.2 atomically normalizes incompatible selections before making independent drafts', () => {
    const state = createInitialScenarioState('admin', { category: 'general', selectedRecord: 'blank', open: true, record: 'zero' });
    expect(state.filterDraft).toEqual({ categoryId: 0, recordId: null, keyword: '' });
    expect(state.appliedFilters).toEqual(state.filterDraft);
    expect(state.filterDraft).not.toBe(state.appliedFilters);
    expect(state.recordQuery).toBe('');
    expect(state.recordPopup).toBe(false);
    expect(state.recordDraft?.id).toBe(0);
    expect(state.recordDraft).not.toBe(state.recordBaseline);
    const brand = createInitialScenarioState('brand', { plan: 'extended', open: true });
    expect(brand.browseSelection).toEqual({ planId: 'extended', servicePointId: null });
    expect(brand.pointQuery).toBe('');
    expect(brand.pointPopup).toBe(false);
    expect(brand.selectionMessage).toBe('请重新选择服务点');
    expect(brand.preferenceDraft).toEqual({ planId: 'extended', servicePointId: null, contactName: '', email: '', note: '' });
    expect(brand.preferenceDraft).not.toBe(brand.browseSelection);
    const empty = createInitialScenarioState('admin', { empty: true, open: true, selectedRecord: 'zero' });
    expect(empty.data.records).toEqual([]);
    expect(empty.editorOpen).toBe(false);
    expect(empty.recordDraft).toBeNull();
    expect(empty.filterDraft.recordId).toBeNull();
    expect(createInitialScenarioState('brand', { empty: true }).browseSelection).toEqual({ planId: null, servicePointId: null });
    const a = createInitialScenarioState('brand', { plan: 'standard', point: 'online' });
    createInitialScenarioState('brand', { plan: 'extended', point: 'north' });
    expect(createInitialScenarioState('brand', { plan: 'standard', point: 'online' })).toEqual(a);
    expect(createInitialScenarioState(normalizeScenarioConfig('admin', { category: 'blank', selectedRecord: 'blank' })))
      .toEqual(createInitialScenarioState('admin', { category: 'blank', selectedRecord: 'blank' }));
  });

  it('T14.1.3 intersects strict category/record/trimmed keyword filters in fixture order', () => {
    const { records } = createScenarioData();
    expect(filterRecords(records, { categoryId: null, recordId: null, keyword: '' })).toEqual(records);
    expect(filterRecords(records, { categoryId: 0, recordId: 0, keyword: ' 通用 ' }).map(record => record.id)).toEqual([0]);
    expect(filterRecords(records, { categoryId: '', recordId: '', keyword: '' }).map(record => record.id)).toEqual(['']);
    expect(filterRecords(records, { categoryId: 0, recordId: '', keyword: '' })).toEqual([]);
    expect(filterRecords(records, { categoryId: null, recordId: null, keyword: 'does not exist' })).toEqual([]);
    const byNote = filterRecords(records, { categoryId: null, recordId: null, keyword: records[2]!.note });
    expect(byNote.some(record => record.id === 'rec-002')).toBe(true);
    expect(records).toEqual(createScenarioData().records);
    const malformed = { categoryId: null, recordId: null, keyword: '' };
    Reflect.set(malformed, 'recordId', '0');
    expect(filterRecords(records, malformed)).toEqual([]);
  });

  it('T14.1.4 narrows validated whitelist DTOs, preserving zero and blank values', () => {
    const valid = { id: 0, title: '  通用服务  ', categoryId: 0, servicePointId: '', note: '  备注  ', query: 'temporary' } as const;
    expect(toRecordSavePayload(valid)).toEqual({ ok: true, payload: { id: 0, title: '通用服务', categoryId: 0, servicePointId: '', note: '备注' } });
    expect(toRecordSavePayload({ ...valid, id: '', categoryId: '', servicePointId: 0 }).ok).toBe(true);
    for (const patch of [{ title: '  ' }, { title: '字'.repeat(81) }, { categoryId: null }, { categoryId: '0' },
      { servicePointId: 'retired' }, { servicePointId: 'unknown' }, { servicePointId: null }, { id: '0' }, { note: '字'.repeat(501) }]) {
      expect(toRecordSavePayload({ ...valid, ...patch }).ok, JSON.stringify(patch)).toBe(false);
    }
    const preference = { planId: '', servicePointId: 0, contactName: ' 林 ', email: ' user@example.com ', note: '  备注 ', query: 'not payload' };
    expect(toPreferenceSubmitPayload(preference)).toEqual({ ok: true, payload: { planId: '', servicePointId: 0, contactName: '林', email: 'user@example.com', note: '备注' } });
    for (const patch of [{ planId: null }, { planId: '0' }, { planId: 'extended', servicePointId: 0 },
      { servicePointId: 'retired' }, { contactName: ' ' }, { contactName: '字'.repeat(41) },
      { email: '' }, { email: 'a b@c.test' }, { email: 'a@' }, { email: 'a@@b.test' }, { note: '字'.repeat(501) }]) {
      expect(toPreferenceSubmitPayload({ ...preference, ...patch }).ok, JSON.stringify(patch)).toBe(false);
    }
    expect(toPreferenceSubmitPayload({ ...preference, planId: 'extended', servicePointId: 'north' }).ok).toBe(true);
    expect(toPreferenceSubmitPayload({ ...preference, email: 'user@localhost' }).ok).toBe(true);
    for (const fixture of createScenarioData().records) expect(toRecordSavePayload(fixture).ok).toBe(true);
  });

  it('T14.1.4 compares normalized business fields only and clears disallowed points without replacement', () => {
    const baseline = { id: 0, title: '标题', categoryId: 0, servicePointId: '', note: '备注' } as const;
    expect(isRecordDirty({ ...baseline, title: ' 标题 ', note: ' 备注 ', query: 'temporary', popup: true }, baseline)).toBe(false);
    expect(isRecordDirty({ ...baseline, servicePointId: 0 }, baseline)).toBe(true);
    expect(normalizeBrandSelection({ planId: 'extended', servicePointId: '' })).toEqual({ planId: 'extended', servicePointId: null });
    expect(normalizeBrandSelection({ planId: 0, servicePointId: '' })).toEqual({ planId: 0, servicePointId: '' });
    expect(normalizeBrandSelection({ planId: '', servicePointId: 'retired' })).toEqual({ planId: '', servicePointId: null });
  });
});
