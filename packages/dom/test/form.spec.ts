import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { getFormOwner, isFieldsetDisabled, observeFormBridge } from '../src/index.js';
const cleanups: (() => void)[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); vi.useRealTimers(); document.body.replaceChildren(); vi.restoreAllMocks(); });
function fixture() {
  document.body.innerHTML = '<form id="a"><fieldset disabled><legend><div id="legend-slot"></div></legend><div id="bridge"><button type="button">Visible</button><input type="hidden" name="choice"><select required tabindex="-1"><option value=""></option><option value="valid">Selected</option></select></div></fieldset></form><form id="b"></form>';
  const proxy = document.querySelector('select')!; const submission = document.querySelector('input')!; const trigger = document.querySelector('button')!;
  const onReset = vi.fn(); const onInvalid = vi.fn(); const onOwnerChange = vi.fn();
  const handle = observeFormBridge({ proxy, submission, trigger, onReset, onInvalid, onOwnerChange }); cleanups.push(handle.cleanup);
  return { proxy, submission, trigger, onReset, onInvalid, onOwnerChange, handle, form: document.querySelector('form')! };
}
it('T10.13 returns real owners, honors native fieldset first legend, and rebinds external form IDs', async () => {
  const f = fixture(); expect(getFormOwner(f.proxy)).toBe(f.form); expect(isFieldsetDisabled(f.proxy)).toBe(true);
  document.querySelector('#legend-slot')!.append(document.querySelector('#bridge')!); expect(isFieldsetDisabled(f.proxy)).toBe(false);
  f.proxy.setAttribute('form', 'b'); f.submission.setAttribute('form', 'b'); f.handle.refresh(); expect(getFormOwner(f.proxy)?.id).toBe('b'); expect(f.onOwnerChange.mock.calls.map(call => call[0]?.id)).toEqual(['a', 'b']);
  f.form.reset(); await vi.runAllTimersAsync(); expect(f.onReset).not.toHaveBeenCalled();
  document.querySelector<HTMLFormElement>('#b')!.reset(); await vi.runAllTimersAsync(); expect(f.onReset).toHaveBeenCalledTimes(1);
  f.proxy.setAttribute('form', 'missing'); await Promise.resolve(); f.handle.refresh(); expect(getFormOwner(f.proxy)).toBeNull();
});
it('T10.14 ignores late canceled reset, invalidates old owners and pending resets on cleanup', async () => {
  const f = fixture(); f.form.addEventListener('reset', event => event.preventDefault(), { once: true }); f.form.reset(); await vi.runAllTimersAsync(); expect(f.onReset).not.toHaveBeenCalled();
  f.form.reset(); f.proxy.setAttribute('form', 'b'); f.handle.refresh(); await vi.runAllTimersAsync(); expect(f.onReset).not.toHaveBeenCalled();
  document.querySelector<HTMLFormElement>('#b')!.reset(); f.handle.cleanup(); f.handle.cleanup(); await vi.runAllTimersAsync(); expect(f.onReset).not.toHaveBeenCalled();
});
it('T10.14 cancels native invalid focus and forwards the same event to the adapter', () => {
  const f = fixture(); document.querySelector('fieldset')!.disabled = false;
  const event = new Event('invalid', { cancelable: true }); expect(f.proxy.dispatchEvent(event)).toBe(false);
  expect(document.activeElement).toBe(f.trigger); expect(f.onInvalid).toHaveBeenCalledExactlyOnceWith(event);
  f.handle.cleanup(); f.proxy.dispatchEvent(new Event('invalid')); expect(f.onInvalid).toHaveBeenCalledTimes(1);
});
it('T10.5 cleans up when controls are removed, and rejects mismatched elements before subscribing', async () => {
  const f = fixture(); document.querySelector('#bridge')!.remove(); await Promise.resolve(); await Promise.resolve(); f.form.reset(); await vi.runAllTimersAsync(); expect(f.onReset).not.toHaveBeenCalled();
  expect(() => observeFormBridge({ ...f, proxy: document.createElement('select') })).toThrow();
});
it('T10.13 custom trigger fieldset fallback honors first legend and unowned controls', () => {
  const f = fixture(); const custom = document.createElement('div'); document.querySelector('#bridge')!.append(custom); expect(isFieldsetDisabled(custom)).toBe(true);
  document.querySelector('#legend-slot')!.append(custom); expect(isFieldsetDisabled(custom)).toBe(false);
  document.body.append(custom); expect(isFieldsetDisabled(custom)).toBe(false); expect(() => getFormOwner(custom as unknown as HTMLSelectElement)).toThrow('native select/input');
  f.handle.cleanup(); const invalidProxy = f.submission as unknown as HTMLSelectElement;
  expect(() => observeFormBridge({ ...f, proxy: invalidProxy })).toThrow('native select proxy');
});
it('T10.5 partial setup/callback failure rolls back observers and invalid subscriptions', async () => {
  const f = fixture(); f.handle.cleanup(); const onInvalid = vi.fn();
  expect(() => observeFormBridge({ ...f, onInvalid, onOwnerChange() { throw Error('owner callback'); } })).toThrow('owner callback');
  f.proxy.dispatchEvent(new Event('invalid')); expect(onInvalid).not.toHaveBeenCalled();
  const error = vi.spyOn(console, 'error').mockImplementation(() => {}); let changes = 0;
  const other = observeFormBridge({ ...f, onOwnerChange() { if (++changes > 1) throw Error('changed callback'); } }); cleanups.push(other.cleanup);
  f.proxy.setAttribute('form', 'b'); await Promise.resolve(); expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'changed callback' }));
  other.refresh(); expect(changes).toBe(2);
});
