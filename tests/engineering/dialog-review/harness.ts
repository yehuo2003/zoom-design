// Legacy standalone diagnostic only; canonical F16 assertions are in the root E2E suite.
import { createApp } from 'vue';
import Host from '../../../apps/vue-smoke/src/regressions/DialogFocusHost.vue';
import { selectExample } from '../../../apps/vue-smoke/src/examples.js';
import '@zoom-design/vue/dialog/style.css';
import '@zoom-design/vue/select/style.css';
import '@zoom-design/vue/combobox/style.css';
const app = createApp(Host, { regression: selectExample(`/regressions/dialog-focus${location.search}`).regression });
app.mount('#app');
window.addEventListener('pagehide', () => app.unmount(), { once: true });
