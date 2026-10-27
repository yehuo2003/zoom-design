import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export const external = (id: string) => /^(react|react-dom)(\/|$)/.test(id);

export default defineConfig({
  plugins: [react()],
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: () => 'index.js' },
    outDir: 'dist',
    emptyOutDir: true,
    rolldownOptions: { external },
  },
});
