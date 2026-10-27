import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// A successful JS transform must never be mistaken for SFC type safety.
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: { entry: fileURLToPath(new URL('./Invalid.vue', import.meta.url)), formats: ['es'], fileName: () => 'index.js' },
    outDir: '../../.artifacts/fixtures/vue/negative-js',
    emptyOutDir: true,
    rolldownOptions: { external: id => id === 'vue' || id.startsWith('vue/') },
  },
});
