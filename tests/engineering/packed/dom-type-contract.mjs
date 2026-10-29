export const domFunctions = ['acquireModal', 'createLayerContext', 'createModalContext', 'focusElement', 'getFormOwner', 'isFieldsetDisabled', 'isWithin', 'mountFloating', 'observeFormBridge', 'registerLayer', 'restoreFocus', 'trapFocus'];
export function verifyDOMDiagnostics(output) {
  const actual = [...output.matchAll(/(?:^|\n)([^\r\n]+)\((\d+),\d+\): error TS(\d+):/g)]
    .map(match => `${match[1].replaceAll('\\', '/').split('/').pop()}:${match[2]}:TS${match[3]}`).sort();
  const expected = ['3:TS2322', '4:TS2322', '5:TS2740', '6:TS2322', '7:TS2322', '8:TS2345', '9:TS2740'].map(item => `invalid.ts:${item}`).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error(`DOM exact diagnostics mismatch: ${JSON.stringify(actual)}\n${output}`);
}
export function verifyDOMNode(api) {
  if (typeof window !== 'undefined' || typeof document !== 'undefined') throw Error('DOM Node check needs no browser globals');
  if (JSON.stringify(Object.keys(api)) !== JSON.stringify(domFunctions)) throw Error('DOM runtime exports differ from approved API');
  for (const name of domFunctions) {
    let caught;
    try { api[name](); } catch (error) { caught = error; }
    if (!/Unsupported browser environment/.test(caught?.message ?? '')) throw Error(`${name} did not clearly reject unsupported Node calls: ${caught}`);
  }
}
