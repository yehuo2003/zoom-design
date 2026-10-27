import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ['@zoom-design/react'] },
  build: { outDir: '../../.artifacts/task3/react-smoke', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5172, strictPort: true },
});
