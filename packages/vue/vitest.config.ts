import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { sfcFileSystem } from '../../scripts/vue-sfc-options.mjs';

export default defineConfig({
  plugins: [vue({ script: { fs: sfcFileSystem } })],
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: { name: 'vue', include: ['test/**/*.spec.ts'], environment: 'jsdom', passWithNoTests: false, allowOnly: false },
});
