export function minimalButtonEntry(scenario) {
  return scenario === 'unused'
    // A void reference keeps the TS value import alive until bundler tree shaking.
    ? `import { ZButton } from '@zoom-design/vue'; void ZButton; document.getElementById('app').textContent = 'Unused import control';`
    : `import { createApp, h } from 'vue'; import { ZButton } from '@zoom-design/vue${scenario === 'button' ? '/button' : ''}'; import '@zoom-design/vue/button/style.css'; createApp({render: () => h(ZButton, {id: 'minimal-button', onClick: () => document.querySelector('output').textContent = String(Number(document.querySelector('output').textContent) + 1)}, () => 'Minimal button')}).mount('#app');`;
}
export function assertUnusedButtonEvidence(graph, emitted) {
  if (!graph.moduleIds.some(id => /\/node_modules\/@zoom-design\/vue\/dist\/(?:button[-/]).*\.js/.test(id.replaceAll('\\', '/')))) throw Error('Unused graph never encountered Button implementation');
  if (/zoom-button|ZButton|expected a Boolean/.test(emitted)) throw Error('Unused build retained Button implementation');
}
