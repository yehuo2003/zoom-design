import { describe, expect, it, vi } from 'vitest';
import { normalizeDialog, reportDialogIssues } from '../src/dialog/normalize';

describe('Dialog input normalization', () => {
  it('T13.1.1 supplies controlled and Boolean defaults without browser effects', () => {
    const listen = vi.spyOn(document, 'addEventListener');
    try {
      const normalized = normalizeDialog({});
      expect(normalized).toMatchObject({
        open: false, modal: true, closeOnEscape: true, closeOnOutside: true,
        restoreFocus: true, portal: false, closeLabel: '关闭', issues: [],
      });
      expect(normalized.initialFocus).toBeUndefined();
      expect(normalized.returnFocus).toBeUndefined();
      expect(normalized.getContainer).toBeUndefined();
      expect(normalized.panelAttrs).toBeUndefined();
      expect(listen).not.toHaveBeenCalled();
    } finally { listen.mockRestore(); }
  });

  it('T13.1.2 falls back from malformed inputs and reports each category once per instance', () => {
    const normalized = normalizeDialog({
      open: 'false', modal: 'false', closeOnEscape: 1, closeOnOutside: 'false',
      restoreFocus: 0, portal: 'true', closeLabel: '  ', initialFocus: 'bad',
      returnFocus: 42, getContainer: 'body', panelAttrs: {
        title: 'Safe', role: 'alertdialog', onClick: 'bad', 'data-note': 'yes',
      },
    } as never);
    expect(normalized).toMatchObject({
      open: false, modal: true, closeOnEscape: true, closeOnOutside: true,
      restoreFocus: true, portal: false, closeLabel: '关闭',
      panelAttrs: { title: 'Safe', 'data-note': 'yes' },
    });
    expect(normalized.initialFocus).toBeUndefined();
    expect(normalized.returnFocus).toBeUndefined();
    expect(normalized.getContainer).toBeUndefined();
    expect(normalized.panelAttrs).not.toHaveProperty('role');
    expect(normalized.panelAttrs).not.toHaveProperty('onClick');
    const warned = new Set<string>();
    const warn = vi.fn();
    reportDialogIssues(normalized.issues, warned, warn);
    reportDialogIssues(normalized.issues, warned, warn);
    expect(warn).toHaveBeenCalledTimes(normalized.issues.length);
    expect(new Set(normalized.issues)).toHaveProperty('size', normalized.issues.length);
  });

  it('T13.1.4 leaves frozen input untouched and never invokes DOM target callbacks', () => {
    const initialFocus = vi.fn(() => null);
    const returnFocus = vi.fn(() => null);
    const getContainer = vi.fn(() => null);
    const panelAttrs = Object.freeze({ title: 'Details', 'data-kind': 'review' });
    const props = Object.freeze({ open: true, portal: true, initialFocus, returnFocus, getContainer, panelAttrs, 'aria-describedby': '' });
    const normalized = normalizeDialog(props);
    expect(normalized.panelAttrs).toEqual(panelAttrs);
    expect(normalized.panelAttrs).not.toBe(panelAttrs);
    expect(normalized['aria-describedby']).toBe('');
    expect(normalized.initialFocus).toBe(initialFocus);
    expect(normalized.returnFocus).toBe(returnFocus);
    expect(normalized.getContainer).toBe(getContainer);
    expect(initialFocus).not.toHaveBeenCalled();
    expect(returnFocus).not.toHaveBeenCalled();
    expect(getContainer).not.toHaveBeenCalled();
  });

  it('T13.1.2 keeps portal inline when no explicit host callback exists', () => {
    const normalized = normalizeDialog({ portal: true });
    expect(normalized.portal).toBe(false);
    expect(normalized.issues).toEqual([expect.stringContaining('getContainer')]);
  });
});
