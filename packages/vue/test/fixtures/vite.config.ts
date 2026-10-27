import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: { entry: fileURLToPath(new URL('./index.ts', import.meta.url)), formats: ['es'], fileName: () => 'index.js' },
    outDir: '../../.artifacts/fixtures/vue',
    emptyOutDir: true,
    rolldownOptions: { external: id => id === 'vue' || id.startsWith('vue/') },
  },
});
