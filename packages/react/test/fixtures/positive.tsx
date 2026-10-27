import { BuildProbe } from './BuildProbe.js';
export const validProbe = <BuildProbe label="Typed" onCount={count => count.toFixed()} onActivity={active => Boolean(active)} />;
