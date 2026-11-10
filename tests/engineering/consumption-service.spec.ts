import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScenarioData } from '../../apps/vue-smoke/src/scenarios/shared/data.js';
import { createScenarioService, createOperationIds } from '../../apps/vue-smoke/src/scenarios/shared/mock-service.js';
import type { PreferenceSubmitPayload, RecordSavePayload } from '../../apps/vue-smoke/src/scenarios/shared/types.js';

const record: RecordSavePayload = { id: 0, title: '已修改', categoryId: '', servicePointId: 0, note: '备注' };
const preference: PreferenceSubmitPayload = { planId: 0, servicePointId: '', contactName: '林', email: 'user@example.com', note: '' };
const context = (operationId: string, controller = new AbortController()) => ({ operationId, signal: controller.signal });

describe('Task14.1 deterministic local Mock service', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it.each(['success', 'fail-once', 'failure'] as const)('T14.1.5 %s controls failure independently for each operation and permits retry', async save => {
    const service = createScenarioService({ save, delay: 25 });
    expect(vi.getTimerCount()).toBe(0);
    for (const operation of ['record', 'preference'] as const) {
      const submit = () => operation === 'record' ? service.saveRecord(record, context(operation)) : service.confirmPreference(preference, context(operation));
      for (let attempt = 0; attempt < 2; attempt++) {
        const beforeCount = service.history.length;
        const pending = submit();
        const outcome = pending.then(value => ({ ok: true, value }), error => ({ ok: false, error }));
        await vi.advanceTimersByTimeAsync(24);
        expect(service.history).toHaveLength(beforeCount);
        await vi.advanceTimersByTimeAsync(1);
        const result = await outcome;
        expect(result.ok).toBe(save === 'success' || save === 'fail-once' && attempt === 1);
      }
    }
    expect(service.history).toHaveLength(save === 'failure' ? 0 : 2);
    service.dispose();
  });

  it('T14.1.6 coalesces pending requests, replays detached successes and rejects conflicting content', async () => {
    const service = createScenarioService({ delay: 10 });
    const first = service.saveRecord(record, context('same'));
    expect(service.saveRecord({ note: record.note, servicePointId: record.servicePointId, categoryId: record.categoryId, title: record.title, id: record.id }, context('same'))).toBe(first);
    await expect(service.saveRecord({ ...record, title: 'different' }, context('same'))).rejects.toThrow('operationId');
    await expect(service.confirmPreference(preference, context('same'))).rejects.toThrow('operationId');
    await vi.runAllTimersAsync();
    const saved = await first;
    expect(saved.version).toBe(createScenarioData().records[0]!.version + 1);
    Reflect.set(saved, 'title', 'consumer mutation');
    const replay = await service.saveRecord(record, context('same'));
    expect(replay.title).toBe(record.title);
    expect(replay).not.toBe(saved);
    await expect(service.saveRecord({ ...record, servicePointId: '' }, context('same'))).rejects.toThrow('operationId');
    expect(service.history).toHaveLength(1);
    const history = service.history;
    Reflect.set(history[0]!.payload, 'title', 'history mutation');
    expect(service.history[0]!.payload).toEqual(record);
    const update = service.saveRecord({ ...record, title: 'second update' }, context('next'));
    await vi.runAllTimersAsync();
    expect((await update).version).toBe(saved.version + 1);
    const independent = createScenarioService({ delay: 0 });
    const fresh = independent.saveRecord(record, context('same'));
    await vi.runAllTimersAsync();
    expect((await fresh).version).toBe(saved.version);
    service.dispose(); independent.dispose();
  });

  it('T14.1.6 allocates operation IDs locally, reuses identical retries and advances on payload/session changes', () => {
    const left = createOperationIds('left');
    const right = createOperationIds('right');
    const initial = left.forPayload(record);
    expect(left.forPayload({ ...record })).toBe(initial);
    expect(right.forPayload(record)).not.toBe(initial);
    const changed = left.forPayload({ ...record, servicePointId: '' });
    expect(changed).not.toBe(initial);
    expect(left.forPayload(record)).not.toBe(changed);
    left.beginSession();
    expect(left.forPayload(record)).not.toBe(initial);
  });

  it('T14.1.7 abort clears pending timers, writes nothing and permits retry of the same operation', async () => {
    const service = createScenarioService({ delay: 100, save: 'fail-once' });
    const controller = new AbortController();
    const pending = service.saveRecord(record, context('abort', controller));
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
    expect(service.history).toEqual([]);
    await expect(service.saveRecord({ ...record, title: 'changed after abort' }, context('abort'))).rejects.toThrow('operationId');
    const failedRetry = service.saveRecord(record, context('abort'));
    const failure = expect(failedRetry).rejects.toMatchObject({ name: 'ScenarioSaveError' });
    await vi.runAllTimersAsync(); await failure;
    const retry = service.saveRecord(record, context('abort'));
    await vi.runAllTimersAsync();
    expect((await retry).title).toBe(record.title);
    controller.abort();
    expect(service.history).toHaveLength(1);
    const preAborted = new AbortController(); preAborted.abort();
    await expect(service.confirmPreference(preference, context('pre-abort', preAborted))).rejects.toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
    service.dispose();
  });

  it('T14.1.7 successful operations survive late abort/dispose while unobserved cancellations remain handled', async () => {
    const service = createScenarioService({ delay: 0 });
    const controller = new AbortController();
    const saved = service.saveRecord(record, context('late-record', controller));
    const confirmed = service.confirmPreference(preference, context('late-preference', controller));
    expect(service.history).toEqual([]);
    await vi.runAllTimersAsync();
    const results = await Promise.all([saved, confirmed]);
    controller.abort();
    expect(service.history).toHaveLength(2);
    expect(service.history.map(entry => entry.result)).toEqual(results);
    const pending = service.saveRecord(record, context('unobserved'));
    service.dispose();
    await vi.runAllTimersAsync();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(service.history).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('T14.1.7 every joined signal cancels the shared operation and dispose rejects both kinds idempotently', async () => {
    const service = createScenarioService({ delay: 100 });
    const firstController = new AbortController();
    const joinedController = new AbortController();
    const pending = service.saveRecord(record, context('joined', firstController));
    expect(service.saveRecord(record, context('joined', joinedController))).toBe(pending);
    const rejection = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    joinedController.abort(); await rejection;
    const a = service.saveRecord(record, context('dispose-record'));
    const b = service.confirmPreference(preference, context('dispose-preference'));
    const results = Promise.allSettled([a, b]);
    service.dispose(); service.dispose();
    expect((await results).every(result => result.status === 'rejected' && result.reason.name === 'AbortError')).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(service.history).toEqual([]);
    await expect(service.saveRecord(record, context('after-dispose'))).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('T14.1.8 captures typed DTO snapshots before delay and isolates results/history from all input mutations', async () => {
    const service = createScenarioService({ delay: 50 });
    const draft = { ...record };
    const preferenceDraft = { ...preference };
    const a = service.saveRecord(draft, context('snapshot-record'));
    const b = service.confirmPreference(preferenceDraft, context('snapshot-preference'));
    draft.title = 'later edit'; preferenceDraft.contactName = 'later name';
    await vi.runAllTimersAsync();
    expect(await a).toMatchObject(record);
    const summary = await b;
    expect(summary).toMatchObject(preference);
    expect(summary.confirmationId).toBe('local-snapshot-preference');
    Reflect.set(summary, 'contactName', 'mutated result');
    expect(await service.confirmPreference(preference, context('snapshot-preference'))).toMatchObject(preference);
    expect(service.history.map(entry => entry.payload)).toEqual([record, preference]);
    service.dispose();
  });
});
