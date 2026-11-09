const plain = [
  'invalid.ts:6:37:TS2353', 'invalid.ts:7:7:TS2322', 'invalid.ts:8:49:TS2322',
  'invalid.ts:9:39:TS2353', 'invalid.ts:10:44:TS2353', 'invalid.ts:11:48:TS2322',
  'invalid.ts:13:24:TS2554', 'invalid.ts:14:30:TS2322', 'invalid.ts:15:34:TS2322',
  'invalid.ts:17:9:TS2540', 'invalid.ts:18:9:TS2540', 'invalid.ts:19:9:TS2540',
  'invalid.ts:21:8:TS2339',
];
const sfc = ['Invalid.vue:6:15:TS2339', 'Invalid.vue:10:13:TS2322', 'Invalid.vue:10:42:TS2353', 'Invalid.vue:11:70:TS2554'];

export function verifyDialogDiagnostics(output, templates = false) {
  const actual = [...output.matchAll(/(?:^|\n)([^\r\n]+)\((\d+),(\d+)\): error TS(\d+):/g)]
    .map(match => `${match[1].replaceAll('\\', '/').split('/').pop()}:${match[2]}:${match[3]}:TS${match[4]}`).sort();
  const expected = [...plain, ...(templates ? sfc : [])].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw Error(`Packed Dialog exact diagnostics mismatch: ${JSON.stringify(actual)}\n${output}`);
}

export function verifyDialogResolution(output) {
  const files = output.replaceAll('\\', '/').split(/\r?\n/).filter(Boolean);
  for (const required of [
    '/node_modules/@zoom-design/vue/dist/types/index.d.ts',
    '/node_modules/@zoom-design/vue/dist/types/dialog/index.d.ts',
    '/node_modules/@zoom-design/vue/dist/types/dialog/Dialog.vue.d.ts',
    '/node_modules/@zoom-design/vue/dist/types/dialog/types.d.ts',
    '/node_modules/@zoom-design/core/dist/dialog/types.d.ts',
  ]) if (!files.some(file => file.endsWith(required))) throw Error(`Packed Dialog did not load ${required}`);
  if (files.some(file => /\/packages\/(?:vue|core|dom)\/src\//.test(file))) throw Error('Packed Dialog loaded workspace product source');
}
