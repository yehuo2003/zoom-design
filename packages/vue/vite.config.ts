import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { sfcFileSystem } from '../../scripts/vue-sfc-options.mjs';

export default defineConfig({
  plugins: [vue({ script: { fs: sfcFileSystem } })],
  build: {
    lib: {
      entry: { index: fileURLToPath(new URL('./src/index.ts', import.meta.url)), 'button/index': fileURLToPath(new URL('./src/button/index.ts', import.meta.url)), 'select/index': fileURLToPath(new URL('./src/select/index.ts', import.meta.url)), 'combobox/index': fileURLToPath(new URL('./src/combobox/index.ts', import.meta.url)), 'dialog/index': fileURLToPath(new URL('./src/dialog/index.ts', import.meta.url)) },
      formats: ['es'], fileName: (_format, name) => `${name}.js`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: { external: id => ['vue', '@zoom-design/core', '@zoom-design/dom'].some(name => id === name || id.startsWith(`${name}/`)) },
  },
});
