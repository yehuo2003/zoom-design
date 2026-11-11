import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useBrandModel } from '../../apps/vue-smoke/src/scenarios/brand/useBrandModel.js';
import { createScenarioService } from '../../apps/vue-smoke/src/scenarios/shared/mock-service.js';
import { normalizeScenarioConfig } from '../../apps/vue-smoke/src/scenarios/shared/normalize.js';
import type { PreferenceSummary, ScenarioService } from '../../apps/vue-smoke/src/scenarios/shared/types.js';

const valid = { contactName: '  张三  ', email: ' test@example.com ', note: ' 本地备注 ' };
describe('Task14.5 preference sessions and confirmation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('T14.5.1 opens a separate blank-contact draft, isolates browse changes and starts fresh each time', () => {
    const model = useBrandModel({ instanceId: 'copy' });
    model.browse.changePlan(''); model.browse.changePoint(''); model.openPreference();
    expect(model.draft.value).toEqual({ planId: '', servicePointId: '', contactName: '', email: '', note: '' });
    model.changeDraftPlan('extended');
    expect(model.draft.value?.servicePointId).toBeNull();
    expect(model.browse.selection.value).toEqual({ planId: '', servicePointId: '' });
    model.browse.changePoint('north');
    expect(model.draft.value?.servicePointId).toBeNull();
    model.patchDraft({ contactName: 'discard' }); model.attemptClose(); model.openPreference();
    expect(model.draft.value?.contactName).toBe(''); expect(model.draft.value?.servicePointId).toBe('north');
    model.dispose();
  });
  it('T14.5.1 initial open preserves incompatible selection for user completion without saving', () => {
    const model = useBrandModel({ instanceId: 'initial', config: normalizeScenarioConfig('brand', { open: true, plan: 'extended' }) });
    expect(model.preferenceOpen.value).toBe(true); expect(model.draft.value?.servicePointId).toBeNull();
    expect(model.draftPointQuery.value).toBe(''); expect(model.draft.value?.email).toBe('');
    expect(vi.getTimerCount()).toBe(0); model.dispose();
  });
  it('T14.5.2 invalid fields never capture a form or call the service; disabled points remain rejected', async () => {
    const service = createScenarioService({ delay: 0 }); const model = useBrandModel({ instanceId: 'invalid', service });
    model.openPreference(); const capture = vi.fn(() => new FormData());
    expect(await model.submit(capture)).toBe(false); expect(capture).not.toHaveBeenCalled();
    model.patchDraft({ contactName: '  ', email: 'bad', note: 'x'.repeat(501) });
    expect(await model.submit()).toBe(false); expect(model.fieldErrors.value).toHaveProperty('contactName');
    expect(model.fieldErrors.value).toHaveProperty('email'); expect(model.fieldErrors.value).toHaveProperty('note');
    expect(model.changeDraftPoint('retired')).toBe(false); expect(model.changeDraftPoint('0')).toBe(false);
    model.changeDraftPlan('extended'); expect(model.changeDraftPoint(0)).toBe(false);
    expect(await model.submit()).toBe(false); expect(model.fieldErrors.value).toHaveProperty('servicePointId');
    expect(vi.getTimerCount()).toBe(0); expect(service.history).toEqual([]); model.dispose();
  });
  it('T14.5.3 snapshots typed zero/blank and native entries before saving, normalizes DTO and writes once', async () => {
    const service = createScenarioService({ delay: 10 }); const model = useBrandModel({ instanceId: 'snapshot', service });
    model.openPreference(); model.patchDraft(valid); model.changeDraftPoint('');
    const pending = model.submit(() => {
      expect(model.saving.value).toBe(false);
      const form = new FormData(); form.set('planId', '0'); form.set('servicePointId', ''); form.set('contactName', '  张三  '); return form;
    });
    expect(model.lastSubmission.value?.payload).toEqual({ planId: 0, servicePointId: '', contactName: '张三', email: 'test@example.com', note: '本地备注' });
    expect(model.lastSubmission.value?.formEntries).toContainEqual(['servicePointId', '']);
    expect(await model.submit()).toBe(false); expect(model.patchDraft({ note: 'late' })).toBe(false);
    await vi.runAllTimersAsync(); expect(await pending).toBe(true);
    expect(service.history).toHaveLength(1); expect(model.submittedSummary.value?.confirmationId).toMatch(/^local-snapshot-/);
    expect(model.preferenceOpen.value).toBe(false); expect(model.saving.value).toBe(false);
    expect(model.browse.selection.value).toEqual({ planId: 0, servicePointId: 0 }); model.dispose();
  });
  it('T14.5.4 failure retains complete draft and unchanged retry reuses ID while changed retry gets a new ID', async () => {
    for (const changed of [false, true]) {
      const model = useBrandModel({ instanceId: `retry-${changed}`, config: normalizeScenarioConfig('brand', { save: 'fail-once', delay: 0 }) });
      model.openPreference(); model.patchDraft(valid);
      const first = model.submit(); const id = model.lastSubmission.value?.operationId;
      await vi.runAllTimersAsync(); expect(await first).toBe(false);
      expect(model.draft.value?.note).toBe(' 本地备注 '); expect(model.error.value).toBeTruthy();
      if (changed) model.patchDraft({ note: 'new note' });
      const retry = model.submit(); expect(model.error.value).toBeNull();
      if (changed) expect(model.lastSubmission.value?.operationId).not.toBe(id); else expect(model.lastSubmission.value?.operationId).toBe(id);
      await vi.runAllTimersAsync(); expect(await retry).toBe(true);
      expect(model.submittedSummary.value?.note).toBe(changed ? 'new note' : '本地备注'); model.dispose();
    }
  });
  it('T14.5.4/5 failure or cancel after a success never replaces the old summary', async () => {
    const inner = createScenarioService({ delay: 0 }); let fail = false;
    const service: ScenarioService = { ...inner, confirmPreference: (payload, context) => fail ? Promise.reject(Error('injected failure')) : inner.confirmPreference(payload, context) };
    const model = useBrandModel({ instanceId: 'old-summary', service });
    model.openPreference(); model.patchDraft(valid); const first = model.submit(); await vi.runAllTimersAsync(); await first;
    const summary = model.submittedSummary.value;
    model.openPreference(); model.patchDraft({ ...valid, note: 'failed new note' }); fail = true;
    expect(await model.submit()).toBe(false); expect(model.submittedSummary.value).toEqual(summary);
    expect(model.draft.value?.note).toBe('failed new note'); model.attemptClose();
    expect(model.draft.value).toBeNull(); expect(model.submittedSummary.value).toEqual(summary);
    model.openPreference(); model.patchDraft(valid); fail = false;
    const retry = model.submit(); await vi.runAllTimersAsync(); await retry;
    expect(model.lastSubmission.value?.operationId).not.toBe(summary?.confirmationId.replace('local-', '')); model.dispose();
  });
  it('T14.5.6 later browse choices and an independent brand instance cannot rewrite historical confirmation', async () => {
    const model = useBrandModel({ instanceId: 'purple', config: normalizeScenarioConfig('brand', { delay: 0 }) });
    model.openPreference(); model.patchDraft(valid); const pending = model.submit(); await vi.runAllTimersAsync(); await pending;
    const summary = { ...model.submittedSummary.value };
    model.browse.changePlan('extended'); model.browse.changePoint('north');
    expect(model.submittedSummary.value).toEqual(summary);
    const other = useBrandModel({ instanceId: 'teal', config: normalizeScenarioConfig('brand', { brand: 'teal' }) });
    other.browse.changePlan(''); other.setDraftPointQuery('other');
    expect(model.submittedSummary.value).toEqual(summary); expect(other.submittedSummary.value).toBeNull();
    model.dispose(); other.dispose();
  });
  it('T14.5.7 pending blocks close, replacement, draft actions and duplicate submission; scope stop aborts timer', async () => {
    const scope = effectScope(); const service = createScenarioService({ delay: 2000 });
    const model = scope.run(() => useBrandModel({ instanceId: 'scope', service }))!;
    model.openPreference(); model.patchDraft(valid); const pending = model.submit();
    expect(model.attemptClose()).toBe(false); expect(model.openPreference()).toBe(false);
    expect(model.changeDraftPlan('')).toBe(false); expect(await model.submit()).toBe(false);
    scope.stop(); expect(await pending).toBe(false); expect(vi.getTimerCount()).toBe(0);
    expect(service.history).toEqual([]); expect(model.error.value).toBeNull(); expect(model.saving.value).toBe(false);
    expect(model.preferenceOpen.value).toBe(false); expect(model.openPreference()).toBe(false); model.dispose();
  });
  it.each(['success', 'failure'] as const)('T14.5.7 disposed session ignores late %s and finally from a non-cooperative service', async outcome => {
    let resolve!: (value: PreferenceSummary) => void; let reject!: (reason: Error) => void;
    const pending = new Promise<PreferenceSummary>((yes, no) => { resolve = yes; reject = no; });
    const service: ScenarioService = { saveRecord: () => Promise.reject(Error('unused')), confirmPreference: () => pending, history: [], dispose: vi.fn() };
    const old = useBrandModel({ instanceId: 'old', service }); old.openPreference(); old.patchDraft(valid); const save = old.submit(); old.dispose();
    const fresh = useBrandModel({ instanceId: 'fresh' }); fresh.openPreference(); fresh.patchDraft({ contactName: '新会话' });
    if (outcome === 'success') resolve({ planId: 0, servicePointId: 0, contactName: '旧会话', email: 'old@example.com', note: '', confirmationId: 'local-old' });
    else reject(Error('late failure'));
    expect(await save).toBe(false); expect(old.submittedSummary.value).toBeNull(); expect(old.error.value).toBeNull();
    expect(fresh.draft.value?.contactName).toBe('新会话'); expect(service.dispose).toHaveBeenCalledTimes(1); fresh.dispose();
  });
  it('T14.5.7 capture failure leaves editing available and does not start a request', async () => {
    const model = useBrandModel({ instanceId: 'capture' }); model.openPreference(); model.patchDraft(valid);
    expect(await model.submit(() => { throw Error('snapshot'); })).toBe(false);
    expect(model.saving.value).toBe(false); expect(model.preferenceOpen.value).toBe(true); expect(vi.getTimerCount()).toBe(0);
    expect(model.error.value).toBe('无法读取表单，请重试'); model.dispose();
  });
});
