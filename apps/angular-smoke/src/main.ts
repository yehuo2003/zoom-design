import { bootstrapApplication } from '@angular/platform-browser';
import { SmokeApp } from './app';

// The library import must resolve before a private probe can become interactive.
async function start(): Promise<void> {
  await import('@zoom-design/angular');
  // Angular 22 is zoneless by default. No Zone polyfill or zone provider is used.
  await bootstrapApplication(SmokeApp);
}

start().catch((error: unknown) => {
  const target = document.querySelector('zoom-smoke-root');
  if (target) {
    target.setAttribute('data-testid', 'import-error');
    target.textContent = `Angular package import failed: ${error instanceof Error ? error.message : String(error)}`;
  }
  throw error;
});
