export function verifySelectDiagnostics(output, templates = false) {
  const actual = [...output.matchAll(/(?:^|\n)([^\r\n]+)\((\d+),\d+\): error TS(\d+):/g)]
    .map(match => `${match[1].replaceAll('\\', '/').split('/').pop()}:${match[2]}:TS${match[3]}`).sort();
  const expected = [...[4, 5, 6, 7, 8, 9, 10, 12].map(line => `invalid.ts:${line}:TS2322`), 'invalid.ts:11:TS2353', 'invalid.ts:14:TS2769', ...(templates ? [6, 7, 8, 9].map(line => `Invalid.vue:${line}:TS2322`) : [])].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error(`Select exact diagnostics mismatch: ${JSON.stringify(actual)}\n${output}`);
}
