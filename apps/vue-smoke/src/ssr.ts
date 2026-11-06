import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { exampleProps, loadExampleHost, selectExample } from './examples.js';

export async function render(location = '/ssr'): Promise<string> {
  const scenario = selectExample(location);
  if (scenario.example === 'dialog') await import('@zoom-design/vue/dialog');
  else if (scenario.example === 'button') await import('@zoom-design/vue/button');
  else if (scenario.example === 'combobox') await import('@zoom-design/vue/combobox');
  else if (scenario.example === 'select') await import('@zoom-design/vue/select');
  else await import('@zoom-design/vue');
  const Host = await loadExampleHost(scenario);
  const app = createSSRApp(Host, exampleProps(scenario));
  if (scenario.idPrefix) app.config.idPrefix = scenario.idPrefix;
  return renderToString(app);
}
