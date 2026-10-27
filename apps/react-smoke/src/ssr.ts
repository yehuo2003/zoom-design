import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { Harness } from './Harness.js';

export async function render(): Promise<string> {
  await import('@zoom-design/react');
  return renderToString(createElement(StrictMode, null, createElement(Harness)));
}
