import { createApp, createSSRApp, h } from 'vue';
import Probe from './SsrProbe.vue';
export function app(location: string, hydrate = true) {
  const query = new URL(location, 'http://fixture').searchParams;
  const brand = query.get('brand') === 'teal' ? 'teal' : 'purple';
  return (hydrate ? createSSRApp : createApp)({ render: () => h('div', { 'data-brand': brand }, [0, 1].map(index => h(Probe, { key: index,
    label: `${brand}-${index}`, open: query.get('open') !== 'false', portal: query.get('portal') === 'true' }))) });
}
export async function render(location: string) { const { renderToString } = await import('@vue/server-renderer'); return renderToString(app(location)); }
