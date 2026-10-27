import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import ProbeHost from './ProbeHost.vue';

export async function render(): Promise<string> {
  await import('@zoom-design/vue');
  return renderToString(createSSRApp(ProbeHost));
}
