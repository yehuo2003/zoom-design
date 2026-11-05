import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { selectExample } from './examples.js';

export async function render(location = '/ssr'): Promise<string> {
  const scenario = selectExample(location);
  if (scenario.example === 'button') await import('@zoom-design/vue/button');
  else if (scenario.example === 'combobox') await import('@zoom-design/vue/combobox');
  else if (scenario.example === 'select') await import('@zoom-design/vue/select');
  else await import('@zoom-design/vue');
  const { default: Host } = scenario.example === 'button'
    ? await import('./examples/ButtonExamples.vue')
    : scenario.example === 'combobox'
    ? await import('./examples/ComboboxExamples.vue')
    : scenario.example === 'select'
    ? await import('./examples/SelectExamples.vue')
    : scenario.example === 'theme'
    ? await import('./examples/ThemeExamples.vue')
    : await import('./ProbeHost.vue');
  const hostProps = { brand: scenario.brand, initialOpen: scenario.initialOpen, initialQuery: scenario.initialQuery, initialValue: scenario.initialValue, ...(scenario.example === 'select' ? { largeList: scenario.largeList } : {}) };
  return renderToString(createSSRApp(Host, hostProps));
}
