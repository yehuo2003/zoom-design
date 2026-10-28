import { createApp, h } from 'vue';
import '@zoom-design/vue/button/style.css';

const { ZButton } = new URL(window.location.href).searchParams.get('entry') === 'named'
  ? await import('@zoom-design/vue') : await import('@zoom-design/vue/button');
createApp({ render: () => h(ZButton, {
  id: 'minimal-button', onClick: () => { const output = document.querySelector('output')!; output.textContent = String(Number(output.textContent) + 1); },
}, () => 'Minimal button') }).mount('#app');
