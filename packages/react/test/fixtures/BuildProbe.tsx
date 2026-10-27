export interface BuildProbeProps {
  label: string;
  onCount?: (count: number) => void;
  onActivity?: (active: boolean) => void;
}

export function BuildProbe({ label, onCount, onActivity }: BuildProbeProps) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    onActivity?.(true);
    return () => onActivity?.(false);
  }, [onActivity]);

  function increment() {
    const next = count + 1;
    setCount(next);
    onCount?.(next);
  }

  return (
    <section className="zoom-engineering-probe" aria-label="React native probe">
      <span aria-label="Probe label">{label}</span>
      <output aria-label="Probe count">{count}</output>
      <button type="button" onClick={increment}>Increment</button>
    </section>
  );
}
import { useEffect, useState } from 'react';

