import { createApp, createSSRApp } from 'vue';
import '@zoom-design/vue/style.css';
import { selectExample } from './examples.js';

const status = document.querySelector('[role="status"]')!;
try {
  const scenario = selectExample(window.location.href);
  if (scenario.example === 'button') await import('@zoom-design/vue/button');
  else await import('@zoom-design/vue');
  const { default: Host } = scenario.example === 'button'
    ? await import('./examples/ButtonExamples.vue')
    : scenario.example === 'theme'
    ? await import('./examples/ThemeExamples.vue')
    : await import('./ProbeHost.vue');
  const root = document.getElementById('app')!;
  const app = root.dataset.ssr === 'true' ? createSSRApp(Host, { brand: scenario.brand }) : createApp(Host, { brand: scenario.brand });
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
