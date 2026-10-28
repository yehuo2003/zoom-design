import { defineConfig } from 'vitest/config';

// Angular's builder owns TestBed, transforms and jsdom setup.
export default defineConfig({ test: { allowOnly: false, passWithNoTests: false } });
