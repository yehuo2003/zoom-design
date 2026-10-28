import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { sfcFileSystem } from '../../scripts/vue-sfc-options.mjs';

export default defineConfig({
  plugins: [vue({ script: { fs: sfcFileSystem } })],
  build: {
    lib: {
      entry: { index: fileURLToPath(new URL('./src/index.ts', import.meta.url)), 'button/index': fileURLToPath(new URL('./src/button/index.ts', import.meta.url)) },
      formats: ['es'], fileName: (_format, name) => `${name}.js`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: { external: id => id === 'vue' || id.startsWith('vue/') },
  },
});
