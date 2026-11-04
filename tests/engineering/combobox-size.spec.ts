import { expect, it } from 'vitest';
import { assertComboboxOnlyEvidence } from './packed/combobox-size-contract.mjs';
it('T12.15 permits neutral selection lifecycle code but rejects actual foreign component markers', () => {
  const graph = { moduleIds: ['/consumer/node_modules/@zoom-design/vue/dist/combobox-entry.js'], chunks: [{ css: ['assets/combobox.css'] }] };
  expect(() => assertComboboxOnlyEvidence(graph, 'zoom-combobox Symbol("zoom-selection-layers")')).not.toThrow();
  for (const marker of ['zoom-select', 'zoom-select__trigger', 'ZSelect', 'zoom-button', 'ZButton']) {
    expect(() => assertComboboxOnlyEvidence(graph, `zoom-combobox ${marker}`)).toThrow(/retained Button\/Select/);
  }
});
