import { describe, expect, it } from 'vitest';
import { exampleProps, selectExample } from '../../apps/vue-smoke/src/examples.js';

describe('Task13.8 request-local Dialog preview selection', () => {
  it('T13.8.1/2 parses independent SSR open, brand, ID and portal requests without browser globals', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    const first = selectExample('/ssr?example=dialog&brand=purple&id=alpha&open=true&portal=true&idPrefix=one-');
    const second = selectExample('/ssr?example=dialog&brand=teal&id=beta&portal=false&idPrefix=two-');
    expect(first).toMatchObject({ example: 'dialog', dialogView: 'overview', brand: 'purple', dialogId: 'alpha', idPrefix: 'one-', initialOpen: true, dialogPortal: true });
    expect(second).toMatchObject({ example: 'dialog', dialogView: 'overview', brand: 'teal', dialogId: 'beta', idPrefix: 'two-', initialOpen: false, dialogPortal: false });
    expect(exampleProps(first)).toEqual({ brand: 'purple', initialOpen: true, id: 'alpha', portal: true });
    expect(exampleProps(second)).toEqual({ brand: 'teal', initialOpen: false, id: 'beta', portal: false });
  });

  it('T13.8.7 resolves all four ordinary views and passes only each view’s supported props', () => {
    expect(selectExample('/dialog').dialogView).toBe('overview');
    expect(selectExample('/dialog/behavior').dialogView).toBe('behavior');
    const appearance = selectExample('/dialog/appearance?brand=teal&density=compact&rtl=true&long=true');
    expect(appearance.dialogView).toBe('appearance');
    expect(exampleProps(appearance)).toEqual({ brand: 'teal', density: 'compact', instance: false, long: true, rtl: true, large: false, dual: false });
    expect(selectExample('/dialog/composition').dialogView).toBe('composition');
    expect(exampleProps(selectExample('/ssr?example=dialog&view=composition'))).toEqual({});
  });
});
