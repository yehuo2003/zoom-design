import { createApp, createSSRApp } from 'vue';
import { exampleProps, loadExampleHost, selectExample } from './examples.js';

const status = document.querySelector('[role="status"]')!;
try {
  const scenario = selectExample(window.location.href);
  if (scenario.example === 'dialog') {
    await import('@zoom-design/vue/dialog');
    await import('@zoom-design/vue/dialog/style.css');
    if (scenario.dialogView === 'composition') {
      await Promise.all([import('@zoom-design/vue/select'), import('@zoom-design/vue/combobox'), import('@zoom-design/vue/select/style.css'), import('@zoom-design/vue/combobox/style.css')]);
    }
  } else if (scenario.example === 'button') await import('@zoom-design/vue/button');
  else if (scenario.example === 'combobox') await import('@zoom-design/vue/combobox');
  else if (scenario.example === 'select') await import('@zoom-design/vue/select');
  else await import('@zoom-design/vue');
  if (scenario.example !== 'dialog') await import('@zoom-design/vue/style.css');
  const Host = await loadExampleHost(scenario);
  const root = document.getElementById('app')!;
  const app = root.dataset.ssr === 'true' ? createSSRApp(Host, exampleProps(scenario)) : createApp(Host, exampleProps(scenario));
  if (scenario.idPrefix) app.config.idPrefix = scenario.idPrefix;
  app.mount(root);
  root.dataset.hydrated = String(root.dataset.ssr === 'true');
  status.textContent = 'Vue package imports ready';
} catch (error) {
  status.textContent = 'Package imports failed';
  const alert = document.createElement('p');
  alert.setAttribute('role', 'alert');
  alert.textContent = error instanceof Error ? error.message : String(error);
  document.body.append(alert);
  throw error;
}
