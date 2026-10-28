import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { selectExample } from './examples.js';

export async function render(location = '/ssr'): Promise<string> {
  const scenario = selectExample(location);
  if (scenario.example === 'button') await import('@zoom-design/vue/button');
  else await import('@zoom-design/vue');
  const { default: Host } = scenario.example === 'button'
    ? await import('./examples/ButtonExamples.vue')
    : scenario.example === 'theme'
    ? await import('./examples/ThemeExamples.vue')
    : await import('./ProbeHost.vue');
  return renderToString(createSSRApp(Host, { brand: scenario.brand }));
}
