import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useAdminModel } from '../../apps/vue-smoke/src/scenarios/admin/useAdminModel.js';
import { createScenarioService } from '../../apps/vue-smoke/src/scenarios/shared/mock-service.js';
import { normalizeScenarioConfig } from '../../apps/vue-smoke/src/scenarios/shared/normalize.js';
import type { ScenarioService, ServiceRecord } from '../../apps/vue-smoke/src/scenarios/shared/types.js';

describe('Task14.3 admin editing sessions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it('T14.3.1 opens independent zero/blank drafts and clears old session state', async () => {
    const model = useAdminModel({ instanceId: 'sessions', config: normalizeScenarioConfig('admin', { save: 'fail-once', delay: 1 }) });
    expect(vi.getTimerCount()).toBe(0);
    model.openEditor(0);
    expect(model.draft.value?.id).toBe(0);
    expect(model.draft.value).not.toBe(model.baseline.value);
    model.patchDraft({ title: '修改标题' });
    expect(model.records.value[0]!.title).toBe('通用服务咨询');
    const failure = model.submit(); await vi.runAllTimersAsync(); expect(await failure).toBe(false);
    expect(model.error.value).toBeTruthy();
    model.attemptClose('cancel'); model.discardChanges();
    expect(model.openEditor('')).toBe(true);
    expect(model.draft.value?.id).toBe('');
    expect(model.draft.value?.title).toBe('线上内容服务');
    expect(model.error.value).toBeNull();
    expect(model.pointQuery.value).toBe('线上服务');
    expect(model.dirty.value).toBe(false);
    model.dispose();
  });

  it('T14.3.2 rejects invalid business fields before capturing FormData or invoking the service', async () => {
    const service = createScenarioService();
    const model = useAdminModel({ instanceId: 'invalid', service });
    const capture = vi.fn(() => new FormData());
    model.openEditor(0);
    for (const patch of [{ title: '   ' }, { title: 'valid', categoryId: null }, { categoryId: 0, servicePointId: 'retired' }] as const) {
      model.patchDraft(patch);
      expect(await model.submit(capture)).toBe(false);
      expect(Object.keys(model.fieldErrors.value).length).toBeGreaterThan(0);
    }
    expect(capture).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    expect(service.history).toEqual([]);
    model.dispose();
  });

  it('T14.3.3 deduplicates submit and snapshots native strings before saving/disabled', async () => {
    const service = createScenarioService({ delay: 10 });
    const model = useAdminModel({ instanceId: 'once', service });
    model.openEditor(0); model.patchDraft({ categoryId: '', servicePointId: 0 });
    const data = new FormData(); data.append('recordId', '0'); data.append('categoryId', ''); data.append('servicePointId', '0');
    const capture = vi.fn(() => { expect(model.saving.value).toBe(false); return data; });
    const first = model.submit(capture);
    expect(model.saving.value).toBe(true);
    expect(await model.submit(capture)).toBe(false);
    expect(model.patchDraft({ title: 'late change' })).toBe(false);
    data.set('categoryId', 'later native change');
    await vi.runAllTimersAsync(); expect(await first).toBe(true);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(service.history).toHaveLength(1);
    expect(service.history[0]!.payload).toMatchObject({ id: 0, categoryId: '', servicePointId: 0 });
    expect(model.lastSubmission.value?.formEntries).toEqual([['recordId', '0'], ['categoryId', ''], ['servicePointId', '0']]);
    expect(model.editorOpen.value).toBe(false); expect(model.saving.value).toBe(false);
    model.dispose();
  });

  it('T14.3.4 updates strict record ID/version and derives the now-empty applied result', async () => {
    const model = useAdminModel({ instanceId: 'filtered', config: normalizeScenarioConfig('admin', { category: 'general', selectedRecord: 'zero', delay: 0 }) });
    expect(model.rows.value).toHaveLength(1);
    model.openEditor(0); model.patchDraft({ categoryId: '', title: '改为内容服务' });
    const pending = model.submit(); await vi.runAllTimersAsync(); expect(await pending).toBe(true);
    expect(model.rows.value).toEqual([]);
    expect(model.records.value[0]).toMatchObject({ id: 0, categoryId: '', title: '改为内容服务', version: 2 });
    expect(model.records.value[1]).toMatchObject({ id: '', title: '线上内容服务', version: 1 });
    expect(model.filterDraft.value.recordId).toBeNull();
    expect(model.statusMessage.value).toContain('本地模拟保存成功');
    model.dispose();
  });

  it('T14.3.5 preserves failed drafts and reuses operationId for an unchanged retry', async () => {
    const model = useAdminModel({ instanceId: 'retry', config: normalizeScenarioConfig('admin', { save: 'fail-once', delay: 0 }) });
    model.openEditor(''); model.patchDraft({ title: '保留草稿', note: 'new note' });
    const first = model.submit(); const id = model.lastSubmission.value?.operationId;
    await vi.runAllTimersAsync(); expect(await first).toBe(false);
    expect(model.draft.value?.title).toBe('保留草稿'); expect(model.error.value).toBeTruthy();
    const retry = model.submit(); expect(model.error.value).toBeNull();
    expect(model.lastSubmission.value?.operationId).toBe(id);
    await vi.runAllTimersAsync(); expect(await retry).toBe(true);
    expect(model.records.value[1]!.title).toBe('保留草稿');
    model.dispose();
  });

  it('T14.3.5 changed retry captures new payload and receives a new operationId', async () => {
    const model = useAdminModel({ instanceId: 'changed', config: normalizeScenarioConfig('admin', { save: 'failure', delay: 0 }) });
    model.openEditor(0); model.patchDraft({ title: 'first attempt' });
    const first = model.submit(); await vi.runAllTimersAsync(); await first;
    const id = model.lastSubmission.value?.operationId;
    model.patchDraft({ title: 'second attempt' }); expect(model.error.value).toBeNull();
    const second = model.submit();
    expect(model.lastSubmission.value?.operationId).not.toBe(id);
    expect(model.lastSubmission.value?.payload.title).toBe('second attempt');
    await vi.runAllTimersAsync(); await second;
    expect(model.records.value[0]!.title).toBe('通用服务咨询');
    model.dispose();
  });

  it('T14.3.6 advisory open updates never close or duplicate the dirty confirmation gateway', () => {
    const model = useAdminModel({ instanceId: 'close' });
    model.openEditor(0); model.patchDraft({ title: 'dirty' });
    for (const reason of ['close-button', 'escape', 'outside', 'cancel'] as const) {
      model.recordCloseUpdate();
      expect(model.discardOpen.value).toBe(false);
      expect(model.attemptClose(reason)).toBe(false);
      expect(model.editorOpen.value).toBe(true); expect(model.discardOpen.value).toBe(true);
      expect(model.attemptClose(reason)).toBe(false);
      model.continueEditing();
    }
    expect(model.closeUpdateCount.value).toBe(4);
    expect(model.draft.value?.title).toBe('dirty');
    model.dispose();
  });

  it('T14.3.7 continue/discard/reset restore the appropriate scope and ignore provisional query for dirty', () => {
    const model = useAdminModel({ instanceId: 'restore' });
    model.openEditor(0); model.setPointQuery('unconfirmed text'); model.setPointOpen(true);
    expect(model.dirty.value).toBe(false);
    model.patchDraft({ title: 'dirty' }); model.attemptClose('cancel'); model.continueEditing();
    expect(model.draft.value?.title).toBe('dirty'); expect(model.discardOpen.value).toBe(false);
    model.restoreBaseline();
    expect(model.draft.value?.title).toBe('通用服务咨询');
    expect(model.pointQuery.value).toBe('默认服务点'); expect(model.pointOpen.value).toBe(false);
    expect(model.fieldErrors.value).toEqual({}); expect(model.dirty.value).toBe(false);
    expect(model.attemptClose('cancel')).toBe(true);
    model.openEditor(''); model.patchDraft({ note: 'discard this' }); model.attemptClose('escape'); model.discardChanges();
    expect(model.editorOpen.value).toBe(false); expect(model.discardOpen.value).toBe(false);
    expect(model.records.value[1]!.note).toBe('线上资料整理');
    model.dispose();
  });

  it('T14.3.8 refuses close/reset/replace while pending; dispose aborts without a business error', async () => {
    const service = createScenarioService({ delay: 100 });
    const model = useAdminModel({ instanceId: 'unmount', service });
    model.openEditor(0); const pending = model.submit();
    expect(model.attemptClose('close-button')).toBe(false); expect(model.discardOpen.value).toBe(false);
    expect(model.restoreBaseline()).toBe(false); expect(model.openEditor('')).toBe(false);
    model.dispose(); model.dispose();
    expect(await pending).toBe(false);
    expect(vi.getTimerCount()).toBe(0); expect(service.history).toEqual([]);
    expect(model.error.value).toBeNull(); expect(model.saving.value).toBe(false);
    expect(model.openEditor(0)).toBe(false);
  });

  it('T14.3.8 disposing the owning Vue scope cancels pending work without an explicit model call', async () => {
    const scope = effectScope();
    const service = createScenarioService({ delay: 100 });
    const model = scope.run(() => useAdminModel({ instanceId: 'scope', service }))!;
    model.openEditor(0); const pending = model.submit();
    scope.stop();
    expect(await pending).toBe(false);
    expect(vi.getTimerCount()).toBe(0); expect(service.history).toEqual([]);
    expect(model.editorOpen.value).toBe(false); expect(model.error.value).toBeNull();
  });

  it('T14.3.3 a native snapshot read failure leaves editing enabled and does not start a request', async () => {
    const model = useAdminModel({ instanceId: 'capture-failure' });
    model.openEditor(0);
    expect(await model.submit(() => { throw Error('FormData failure'); })).toBe(false);
    expect(model.error.value).toBe('无法读取表单，请重试'); expect(model.saving.value).toBe(false);
    expect(model.editorOpen.value).toBe(true); expect(vi.getTimerCount()).toBe(0);
    model.dispose();
  });

  it.each(['success', 'failure'] as const)('T14.3.8 ignores a non-cooperative late %s and finally after disposal', async outcome => {
    let resolve!: (record: ServiceRecord) => void; let reject!: (error: Error) => void;
    const pending = new Promise<ServiceRecord>((accept, fail) => { resolve = accept; reject = fail; });
    const service: ScenarioService = { saveRecord: () => pending, confirmPreference: () => Promise.reject(Error('not used')), history: [], dispose: vi.fn() };
    const old = useAdminModel({ instanceId: 'old', service });
    old.openEditor(0); old.patchDraft({ title: 'stale' }); const save = old.submit();
    old.dispose();
    const fresh = useAdminModel({ instanceId: 'fresh' }); fresh.openEditor(''); fresh.patchDraft({ title: 'new session' });
    if (outcome === 'success') resolve({ id: 0, title: 'stale', categoryId: 0, servicePointId: 0, note: '', version: 99 });
    else reject(Error('stale error'));
    expect(await save).toBe(false);
    expect(old.records.value[0]!.title).toBe('通用服务咨询'); expect(old.statusMessage.value).toBe('');
    expect(old.error.value).toBeNull(); expect(fresh.draft.value?.title).toBe('new session');
    expect(service.dispose).toHaveBeenCalledTimes(1);
    fresh.dispose();
  });
});
