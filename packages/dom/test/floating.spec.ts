import { afterEach, beforeEach, it, expect, vi } from 'vitest';
const floating = vi.hoisted(() => ({ computePosition: vi.fn(), autoUpdate: vi.fn(), stop: vi.fn() }));
vi.mock('@floating-ui/dom', () => ({ ...floating, offset: vi.fn(), flip: vi.fn(), shift: vi.fn(), size: (options: unknown) => options }));
import { mountFloating } from '../src/index.js';
const handles: (() => void)[] = [];
beforeEach(() => { vi.clearAllMocks(); floating.autoUpdate.mockImplementation((_trigger, _popup, update) => { update(); return floating.stop; }); floating.computePosition.mockResolvedValue({ x: 10, y: 20 }); });
afterEach(() => { for (const cleanup of handles.splice(0)) cleanup(); document.body.replaceChildren(); vi.restoreAllMocks(); });
function fixture() { const trigger = document.createElement('button'); const popup = document.createElement('div'); document.body.append(trigger, popup); return { trigger, popup }; }
it('T10.4/5 restores owned inline styles and ignores stale updates after cleanup', async () => {
  const { trigger, popup } = fixture(); popup.style.setProperty('left', '2px', 'important'); const before = popup.getAttribute('style');
  let finish!: (value: { x: number; y: number }) => void; floating.computePosition.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const handle = mountFloating(trigger, popup); handles.push(handle.cleanup); handle.cleanup(); handle.cleanup(); finish({ x: 100, y: 200 }); await Promise.resolve(); await handle.update();
  expect(popup.getAttribute('style')).toBe(before); expect(floating.stop).toHaveBeenCalledTimes(1);
});
it('T10.4 retains only the newest request and reports computation rejection without an unhandled promise', async () => {
  const { trigger, popup } = fixture(); const handle = mountFloating(trigger, popup); handles.push(handle.cleanup); await Promise.resolve();
  let finish!: (value: { x: number; y: number }) => void; floating.computePosition.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); const old = handle.update();
  floating.computePosition.mockResolvedValueOnce({ x: 50, y: 60 }); await handle.update(); finish({ x: 1, y: 2 }); await old; expect(popup.style.left).toBe('50px');
  const report = vi.fn(); handle.cleanup(); const other = mountFloating(trigger, popup, { onError: report }); handles.push(other.cleanup);
  floating.computePosition.mockRejectedValueOnce(new Error('position failed')); await other.update(); expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'position failed' }));
});
it('T10.5 validates both nodes before startup and rolls back an autoUpdate setup failure', () => {
  const { trigger, popup } = fixture(); expect(() => mountFloating(trigger, document.createElement('div'))).toThrow(); expect(floating.autoUpdate).not.toHaveBeenCalled();
  floating.autoUpdate.mockImplementationOnce(() => { throw Error('setup failed'); }); const before = popup.getAttribute('style'); expect(() => mountFloating(trigger, popup)).toThrow('setup failed'); expect(popup.getAttribute('style')).toBe(before);
});
it('T10.3 applies available height and reference width, preserves width optout and handles reporter failure', async () => {
  const { trigger, popup } = fixture(); popup.style.maxHeight = '90px'; popup.style.width = '44px';
  floating.computePosition.mockImplementation(async (_a, _b, options) => { options.middleware[3].apply({ availableHeight: 70, rects: { reference: { width: 123 } } }); return { x: 2, y: 3 }; });
  const handle = mountFloating(trigger, popup, { placement: 'top-end', offset: 0 }); handles.push(handle.cleanup); await handle.update();
  expect(popup.style.maxHeight).toBe('70px'); expect(popup.style.width).toBe('123px'); handle.cleanup();
  const report = vi.spyOn(console, 'error').mockImplementation(() => {});
  const other = mountFloating(trigger, popup, { matchTriggerWidth: false, onError() { throw Error('reporter failed'); } }); handles.push(other.cleanup); await other.update(); expect(popup.style.width).toBe('44px');
  floating.computePosition.mockRejectedValueOnce(Error('failed')); await other.update(); expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'reporter failed' }));
  other.cleanup(); const final = mountFloating(trigger, popup); handles.push(final.cleanup); floating.computePosition.mockRejectedValueOnce(Error('default reporter')); await final.update(); expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'default reporter' }));
});
