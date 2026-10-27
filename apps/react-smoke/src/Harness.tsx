import { useState } from 'react';
import { BuildProbe } from '../../../packages/react/test/fixtures/BuildProbe.js';

export function Harness() {
  const [label, setLabel] = useState('Initial');
  const [mounted, setMounted] = useState(true);
  const [emittedCount, setEmittedCount] = useState(0);
  const [active, setActive] = useState(false);
  return (
    <main>
      <p>Private native fixture; no product component API is exported.</p>
      {mounted
        ? <BuildProbe label={label} onCount={setEmittedCount} onActivity={setActive} />
        : <p role="status" aria-label="Probe mount status">unmounted</p>}
      <output aria-label="Emitted count">{emittedCount}</output>
      <output aria-label="Effect status">{active ? 'active' : 'inactive'}</output>
      <button type="button" disabled={!mounted} onClick={() => setLabel('Updated')}>Update label</button>
      <button type="button" disabled={!mounted} onClick={() => setMounted(false)}>Unmount</button>
    </main>
  );
}
