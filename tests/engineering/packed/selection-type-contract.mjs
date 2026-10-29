export function verifySelectionDiagnostics(output) {
  const actual = [...output.matchAll(/(?:^|\n)([^\r\n]+)\((\d+),\d+\): error TS(\d+):/g)]
    .map(match => `${match[1].replaceAll('\\', '/').split('/').pop()}:${match[2]}:TS${match[3]}`).sort();
  const expected = ['3:TS2322', '4:TS2322', '5:TS2322', '7:TS2540', '8:TS2345', '9:TS2345', '10:TS2322', '11:TS2322', '12:TS2322'].map(item => `invalid.ts:${item}`).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error(`Core selection exact diagnostics mismatch: ${JSON.stringify(actual)}`);
}
