import { createApp, createSSRApp } from 'vue';
import '@zoom-design/vue/style.css';
import ProbeHost from './ProbeHost.vue';

const status = document.querySelector('[role="status"]')!;
try {
  await import('@zoom-design/vue');
  const root = document.getElementById('app')!;
  const app = root.dataset.ssr === 'true' ? createSSRApp(ProbeHost) : createApp(ProbeHost);
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
