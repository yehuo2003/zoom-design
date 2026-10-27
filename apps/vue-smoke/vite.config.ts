import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue()],
  optimizeDeps: { exclude: ['@zoom-design/vue'] },
  server: { host: '127.0.0.1', port: 5171, strictPort: true },
  build: { outDir: '../../.artifacts/task3/vue-smoke', emptyOutDir: true },
});
