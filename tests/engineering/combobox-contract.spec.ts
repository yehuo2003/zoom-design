import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { inspectPackageFiles } from '../../scripts/pack-contracts.mjs';

describe('T12 Combobox engineering boundaries', () => {
  it('publishes explicit Combobox JS/declaration/CSS exports', () => {
    const manifest = JSON.parse(readFileSync('packages/vue/package.json', 'utf8'));
    expect(manifest.exports['./combobox']).toEqual({ types: './dist/types/combobox/index.d.ts', import: './dist/combobox/index.js' });
    expect(manifest.exports['./combobox/style.css']).toBe('./dist/combobox/style.css');
  });
  it('requires Combobox exports in every tarball and rejects each missing public asset', () => {
    const manifest = JSON.parse(readFileSync('packages/vue/package.json', 'utf8'));
    const files = new Map<string, Buffer>([['package.json', Buffer.from(JSON.stringify(manifest))]]);
    const add = (value: unknown): void => {
      if (typeof value === 'string') files.set(value.replace(/^\.\//, ''), Buffer.from(''));
      else if (value && typeof value === 'object') Object.values(value).forEach(add);
    };
    add(manifest.exports);
    for (const name of ['_index.scss', '_defaults.scss', '_theme.scss', '_density.scss']) files.set(`dist/styles/theme/${name}`, readFileSync(`design/styles/${name}`));
    expect(() => inspectPackageFiles(files, '@zoom-design/vue')).not.toThrow();
    const noExport = structuredClone(manifest); delete noExport.exports['./combobox']; delete noExport.exports['./combobox/style.css'];
    const absent = new Map(files); absent.set('package.json', Buffer.from(JSON.stringify(noExport)));
    expect(() => inspectPackageFiles(absent, '@zoom-design/vue')).toThrow(/exact Combobox/);
    for (const file of ['dist/combobox/index.js', 'dist/types/combobox/index.d.ts', 'dist/combobox/style.css']) {
      const missing = new Map(files); missing.delete(file);
      expect(() => inspectPackageFiles(missing, '@zoom-design/vue')).toThrow(/missing\/invalid export/);
    }
  });
});
