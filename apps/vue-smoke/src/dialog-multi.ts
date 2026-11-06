import { createApp, defineComponent, h, shallowRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import '@zoom-design/vue/dialog/style.css';

function mountDialog(selector: string, prefix: string, title: string) {
  const Host = defineComponent({
    setup() {
      const opened = shallowRef(true);
      return () => h(ZDialog, { open: opened.value, 'onUpdate:open': value => { opened.value = value; } }, {
        title: () => title,
        default: () => h('button', { type: 'button' }, `${title} action`),
      });
    },
  });
  const app = createApp(Host);
  app.config.idPrefix = prefix;
  app.mount(selector);
  return app;
}

mountDialog('#dialog-app-first', 'first-', 'First app dialog');
mountDialog('#dialog-app-second', 'second-', 'Second app dialog');
