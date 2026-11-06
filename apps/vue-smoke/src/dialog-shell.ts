import { createApp } from 'vue';
import '@zoom-design/vue/dialog/style.css';
import DialogAppearanceExamples from './examples/DialogAppearanceExamples.vue';

const query = new URLSearchParams(window.location.search);
createApp(DialogAppearanceExamples, {
  brand: query.get('brand') === 'teal' ? 'teal' : 'purple',
  density: query.get('density') === 'compact' ? 'compact' : 'regular',
  instance: query.get('instance') === 'true',
  long: query.get('long') === 'true',
  rtl: query.get('rtl') === 'true',
  large: query.get('large') === 'true',
  dual: query.get('dual') === 'true',
}).mount('#app');
