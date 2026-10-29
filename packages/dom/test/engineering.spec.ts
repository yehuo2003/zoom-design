import { describe, expect, it } from 'vitest';
import { registerEngineeringClick } from './fixtures/listener.js';

describe('DOM private engineering fixture (no product API)', () => {
  it('T2.7 counts once and stops counting after dispose', () => {
    const button = document.createElement('button'); let count = 0;
    const dispose = registerEngineeringClick(button, () => { count += 1; });
    button.click(); expect(count).toBe(1);
    dispose(); button.click(); expect(count).toBe(1);
    dispose(); button.click(); expect(count).toBe(1);
  });
  it('T2.11 does not change existing inline style during setup or cleanup', () => {
    const button = document.createElement('button'); button.style.color = 'red';
    const before = button.getAttribute('style');
    const dispose = registerEngineeringClick(button, () => {});
    expect(button.getAttribute('style')).toBe(before);
    dispose(); expect(button.getAttribute('style')).toBe(before);
  });
  it('T2.10 imports the public package without exposing the engineering fixture', async () => {
    expect(Object.keys(await import('@zoom-design/dom')).sort()).toEqual(['acquireModal', 'createLayerContext', 'createModalContext', 'focusElement', 'getFormOwner', 'isFieldsetDisabled', 'isWithin', 'mountFloating', 'observeFormBridge', 'registerLayer', 'restoreFocus', 'trapFocus']);
  });
});
