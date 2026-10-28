import { existsSync, readFileSync } from 'node:fs';

// The shared root uses TS7, which no longer supplies ts.sys. SFC type macros need
// a filesystem for relative type imports; declaration checks still use Vue TS6.
export const sfcFileSystem = { fileExists: existsSync, readFile: file => readFileSync(file, 'utf8') };
