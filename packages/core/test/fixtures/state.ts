/** Private tooling fixture; never exported from @zoom-design/core. */
export interface EngineeringState<T> {
  snapshot(): { status: 'ready'; value: T };
  update(transform: (value: T) => T): void;
}

export function createEngineeringState<T>(initial: T | null | undefined, fallback: T): EngineeringState<T> {
  let value = initial ?? fallback;
  return {
    snapshot: () => ({ status: 'ready', value }),
    update: transform => { value = transform(value); },
  };
}
