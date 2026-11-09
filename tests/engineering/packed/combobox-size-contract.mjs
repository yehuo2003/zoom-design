export function minimalComboboxEntry(scenario) {
  if (scenario === 'unused') return `import { ZCombobox } from '@zoom-design/vue'; void ZCombobox; document.getElementById('app').textContent = 'Unused Combobox import';`;
  return `import { createApp, h } from 'vue'; import { ZCombobox } from '@zoom-design/vue${scenario === 'combobox' ? '/combobox' : ''}'; import '@zoom-design/vue/combobox/style.css'; createApp({ render: () => h(ZCombobox, { id: 'minimal-combobox', modelValue: 0, options: [{value:0,label:'Zero'},{value:'',label:'Empty'}], 'aria-label':'Minimal Combobox' }) }).mount('#app');`;
}
export function containsSelectImplementation(emitted) {
  return /zoom-select(?:__|[-\s"'`]|$)|\bZSelect\b/.test(emitted);
}
export function assertComboboxOnlyEvidence(graph, emitted) {
  if (!graph.moduleIds.some(id => /\/node_modules\/@zoom-design\/vue\/dist\/(?:combobox[-/]).*\.js/.test(id.replaceAll('\\', '/')))) throw Error('Combobox graph never encountered Combobox implementation');
  if (!/zoom-combobox/.test(emitted)) throw Error('Combobox implementation missing from final output');
  if (/zoom-button|ZButton|zoom-dialog|ZDialog/.test(emitted) || containsSelectImplementation(emitted)) throw Error('Combobox build retained Button/Select/Dialog implementation');
  const css = graph.chunks.flatMap(chunk => chunk.css ?? []);
  if (!css.length) throw Error('Combobox build has no referenced CSS');
}
export function assertUnusedComboboxEvidence(graph, emitted) {
  if (!graph.moduleIds.some(id => /\/node_modules\/@zoom-design\/vue\/dist\/(?:combobox[-/]).*\.js/.test(id.replaceAll('\\', '/')))) throw Error('Unused graph never encountered Combobox implementation');
  if (/zoom-combobox|ZCombobox|zoom-button|zoom-select|zoom-dialog|ZDialog/.test(emitted)) throw Error('Unused build retained Combobox or Dialog implementation');
}
