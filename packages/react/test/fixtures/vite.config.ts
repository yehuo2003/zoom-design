import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { external } from '../../vite.config.js';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: 'test/fixtures/entry.ts', formats: ['es'], fileName: () => 'index.js' },
    outDir: '../../.artifacts/fixtures/react/js',
    emptyOutDir: true,
    rolldownOptions: { external },
  },
});
