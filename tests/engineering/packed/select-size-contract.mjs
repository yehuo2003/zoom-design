export function minimalSelectEntry(scenario) {
  if (scenario === 'unused') return `import { ZSelect } from '@zoom-design/vue'; void ZSelect; document.getElementById('app').textContent = 'Unused Select import';`;
  return `import { createApp, h } from 'vue'; import { ZSelect } from '@zoom-design/vue${scenario === 'select' ? '/select' : ''}'; import '@zoom-design/vue/select/style.css'; createApp({ render: () => h(ZSelect, { id: 'minimal-select', modelValue: 0, options: [{value:0,label:'Zero'},{value:'',label:'Empty'}], 'aria-label':'Minimal Select' }) }).mount('#app');`;
}
export function assertSelectOnlyEvidence(graph, emitted) {
  if (!graph.moduleIds.some(id => /\/node_modules\/@zoom-design\/vue\/dist\/(?:select[-/]).*\.js/.test(id.replaceAll('\\', '/')))) throw Error('Select graph never encountered Select implementation');
  if (!/zoom-select/.test(emitted)) throw Error('Select implementation missing from final output');
  if (/zoom-button|ZButton/.test(emitted)) throw Error('Select build retained Button implementation');
  const css = graph.chunks.flatMap(chunk => chunk.css ?? []);
  if (!css.length) throw Error('Select build has no referenced CSS');
}
export function assertUnusedSelectEvidence(graph, emitted) {
  if (!graph.moduleIds.some(id => /\/node_modules\/@zoom-design\/vue\/dist\/(?:select[-/]).*\.js/.test(id.replaceAll('\\', '/')))) throw Error('Unused graph never encountered Select implementation');
  if (/zoom-select|ZSelect|zoom-button/.test(emitted)) throw Error('Unused build retained Select implementation');
}
