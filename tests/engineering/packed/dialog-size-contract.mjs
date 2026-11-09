const normalize = value => value.replaceAll('\\', '/');
const product = /\/node_modules\/@zoom-design\/vue\/dist\/(?:button|select|combobox)(?:\/|-[^/]*\.js)/;
const foreign = /(?:Examples|ProbeHost|BuildProbe|server-renderer|compiler-(?:sfc|dom|core)|\/node_modules\/(?:@zoom-design\/(?:react|angular)|react(?:-dom)?|@angular|sass|typescript)\/)/;

export function minimalDialogEntry(scenario) {
  if (scenario === 'unused') return `import { ZDialog } from '@zoom-design/vue'; void ZDialog; document.getElementById('app').textContent = 'Unused Dialog import';`;
  return `import { createApp, h } from 'vue'; import { ZDialog } from '@zoom-design/vue${scenario === 'dialog' ? '/dialog' : ''}'; import '@zoom-design/vue/dialog/style.css'; createApp({ render: () => h(ZDialog, { open: true, id: 'minimal-dialog', portal: false, 'aria-label': 'Minimal Dialog' }, () => 'Dialog body') }).mount('#app');`;
}

export function assertDialogSizeEvidence(graph, emitted, cssContents, scenario) {
  const encountered = graph.moduleIds.map(normalize);
  if (!encountered.some(id => /\/node_modules\/@zoom-design\/vue\/dist\/(?:dialog\/|dialog-[^/]*\.js)/.test(id))) throw Error('Dialog graph never encountered Dialog implementation');
  if (encountered.some(id => foreign.test(id))) throw Error('Foreign module in minimal Dialog graph');
  const retained = graph.chunks.flatMap(chunk => chunk.modules).map(normalize);
  if (retained.some(id => product.test(id))) throw Error('Dialog build retained Button/Select/Combobox implementation');
  if (/zoom-button|zoom-select|zoom-combobox|\bZButton\b|\bZSelect\b|\bZCombobox\b/.test(emitted)) throw Error('Dialog output polluted by another product');
  if (scenario === 'unused') {
    if (/zoom-dialog|\bZDialog\b/.test(emitted) || retained.some(id => /\/node_modules\/@zoom-design\/vue\/dist\/dialog(?:\/|-)/.test(id))) throw Error('Unused build retained Dialog implementation');
    if (cssContents.length) throw Error('Unused Dialog build retained CSS');
  } else {
    if (!/zoom-dialog/.test(emitted)) throw Error('Dialog implementation missing from final output');
    if (cssContents.length !== 1 || !/\.zoom-dialog/.test(cssContents[0]) || /\.zoom-(?:button|select|combobox)|zoom-engineering-built/.test(cssContents[0])) throw Error('Dialog CSS pollution or missing scoped CSS');
  }
}
