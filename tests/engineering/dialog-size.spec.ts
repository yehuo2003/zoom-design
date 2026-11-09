import { describe, expect, it } from 'vitest';
import { assertDialogSizeEvidence, minimalDialogEntry } from './packed/dialog-size-contract.mjs';

const dialogModule = '/consumer/node_modules/@zoom-design/vue/dist/dialog-abc.js';
const baseGraph = () => ({ moduleIds: [dialogModule], chunks: [{ modules: [dialogModule], css: ['assets/style.css'] }] });

describe('Task13.10 minimal Dialog contracts', () => {
  it('uses public root/subpath imports and only explicit Dialog CSS', () => {
    expect(minimalDialogEntry('dialog')).toContain("from '@zoom-design/vue/dialog'");
    expect(minimalDialogEntry('named')).toContain("from '@zoom-design/vue'");
    expect(minimalDialogEntry('dialog')).toContain("import '@zoom-design/vue/dialog/style.css'");
    expect(minimalDialogEntry('unused')).toContain('void ZDialog');
    expect(minimalDialogEntry('unused')).not.toContain('style.css');
  });
  it('rejects missing Dialog, other implementations and CSS pollution', () => {
    const graph = baseGraph();
    expect(() => assertDialogSizeEvidence(graph, 'zoom-dialog', ['.zoom-dialog{}'], 'dialog')).not.toThrow();
    expect(() => assertDialogSizeEvidence({ ...graph, moduleIds: [] }, 'zoom-dialog', ['.zoom-dialog{}'], 'dialog')).toThrow(/never encountered/);
    expect(() => assertDialogSizeEvidence({ ...graph, chunks: [{ ...graph.chunks[0], modules: [...graph.chunks[0].modules, '/consumer/node_modules/@zoom-design/vue/dist/select-abc.js'] }] }, 'zoom-dialog', ['.zoom-dialog{}'], 'dialog')).toThrow(/Button\/Select\/Combobox/);
    expect(() => assertDialogSizeEvidence(graph, 'zoom-dialog', ['.zoom-dialog{}.zoom-button{}'], 'dialog')).toThrow(/CSS pollution/);
  });
  it('rejects retained unused Dialog while accepting its shaken graph', () => {
    const graph = { moduleIds: [dialogModule], chunks: [{ modules: [], css: [] }] };
    expect(() => assertDialogSizeEvidence(graph, 'Unused Dialog import', [], 'unused')).not.toThrow();
    expect(() => assertDialogSizeEvidence({ ...graph, chunks: [{ modules: [dialogModule], css: [] }] }, 'zoom-dialog', [], 'unused')).toThrow(/retained Dialog/);
  });
});
