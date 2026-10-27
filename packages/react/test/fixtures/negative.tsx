import { BuildProbe } from './BuildProbe.js';
export const invalidLabel = <BuildProbe label={42} />;
export const invalidCallback = <BuildProbe label="Invalid" onCount={(count: string) => count.toUpperCase()} />;
