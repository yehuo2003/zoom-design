import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: { name: 'react', environment: 'jsdom', include: ['test/**/*.spec.tsx'], globals: false, passWithNoTests: false, allowOnly: false },
});
