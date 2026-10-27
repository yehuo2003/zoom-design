import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Harness } from './Harness.js';

async function start() {
  const root = document.getElementById('app');
  const status = document.querySelector('[aria-label="Package readiness"]');
  if (!root || !status) throw new Error('Missing React host root');
  try {
    await Promise.all([import('@zoom-design/react'), import('@zoom-design/react/style.css')]);
    status.textContent = 'React package and CSS imports ready';
    document.getElementById('fallback')?.remove();
    const app = <StrictMode><Harness /></StrictMode>;
    if (root.dataset.ssr === 'true') {
      hydrateRoot(root, app, { onRecoverableError: error => console.error(error) });
    } else {
      createRoot(root).render(app);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = 'React package import failed';
    const alert = document.querySelector<HTMLElement>('[role="alert"]');
    if (alert) { alert.hidden = false; alert.textContent = message; }
    console.error(error);
  }
}

void start();
