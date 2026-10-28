import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { assertIsolatedRoot, inspectPackageFiles, measureReferencedAssets, packRecord, publicImportChunk } from '../../scripts/pack-contracts.mjs';
import { consumerTypeConfig } from '../../scripts/packed-templates.mjs';

describe('Task5 packed consumer gates', () => {
  it('targets the exported JS chunk when the main chunk also includes package CSS', () => {
    const graph = { chunks: [
      { fileName: 'entry.js', modules: ['/consumer/node_modules/@zoom-design/vue/dist/style.css'], facadeModuleId: '/consumer/index.html' },
      { fileName: 'public.js', modules: [], facadeModuleId: '/consumer/node_modules/@zoom-design/vue/dist/index.js' },
    ] };
    expect(publicImportChunk(graph, '@zoom-design/vue', { '.': { import: './dist/index.js' } }).fileName).toBe('public.js');
  });
  it('reads actual npm12 filenames and rejects missing or ambiguous reports', () => {
    expect(packRecord({ '@zoom-design/core': { filename: 'actual-name.tgz', files: [] } }, '@zoom-design/core').filename).toBe('actual-name.tgz');
    expect(() => packRecord({}, '@zoom-design/core')).toThrow();
    expect(() => packRecord([{ name: '@zoom-design/core', filename: '../escape.tgz' }], '@zoom-design/core')).toThrow();
  });
  it('T7.34 accepts imported Vue helpers and rejects copied runtime implementations', async () => {
    const { inspectRuntimeCode } = await import('../../scripts/pack-contracts.mjs');
    expect(() => inspectRuntimeCode('vue', 'import { createVNode, createRenderer as externalRenderer } from "vue"; const render = () => createVNode("button");')).not.toThrow();
    expect(() => inspectRuntimeCode('vue', 'function createRenderer(options) { function baseCreateRenderer() {} return baseCreateRenderer(options); }')).toThrow(/runtime bundled/);
    expect(() => inspectRuntimeCode('vue', 'function q(n){ return { __v_isVNode: true, shapeFlag: n, patchFlag: 0 }; }')).toThrow(/runtime bundled/);
    expect(() => inspectRuntimeCode('vue', 'import "./button/style.css";')).toThrow(/implicit.*style/i);
  });
  it('T7.38 distinguishes component and root public JS chunks', () => {
    const graph = { chunks: [{ fileName: 'root.js', modules: ['/consumer/node_modules/@zoom-design/vue/dist/index.js'] }, { fileName: 'button.js', modules: ['/consumer/node_modules/@zoom-design/vue/dist/button/index.js'] }] };
    const exports = { '.': { import: './dist/index.js' }, './button': { import: './dist/button/index.js' } };
    expect(publicImportChunk(graph, '@zoom-design/vue', exports, './button').fileName).toBe('button.js');
  });
  it('rejects missing export assets, private fixtures and undeclared runtime imports', () => {
    const manifest = { name: '@zoom-design/react', exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' }, './style.css': './dist/style.css', './theme.css': './dist/theme.css', './theme.scss': { sass: './dist/styles/theme/_index.scss', default: './dist/styles/theme/_index.scss' } }, sideEffects: ['**/*.css'], peerDependencies: { react: '~19.2.0' } };
    const files = new Map([['package.json', Buffer.from(JSON.stringify(manifest))], ['dist/index.js', Buffer.from('export {};')], ['dist/index.d.ts', Buffer.from('export {};')], ['dist/style.css', Buffer.from('/* engineering */')], ['dist/theme.css', Buffer.from('')], ...['_index.scss', '_defaults.scss', '_theme.scss', '_density.scss'].map(name => [`dist/styles/theme/${name}`, Buffer.from('')] as [string, Buffer])]);
    expect(inspectPackageFiles(files, manifest.name).exports).toContain('./dist/style.css');
    const missing = new Map(files); missing.delete('dist/style.css');
    expect(() => inspectPackageFiles(missing, manifest.name)).toThrow(/export.*style.css/i);
    expect(() => inspectPackageFiles(new Map([...files, ['test/fixture.js', Buffer.from('')]]), manifest.name)).toThrow(/forbidden/i);
    const undeclared = new Map(files); undeclared.set('dist/index.js', Buffer.from('import "undeclared-runtime";'));
    expect(() => inspectPackageFiles(undeclared, manifest.name)).toThrow(/undeclared-runtime/);
  });
  it('requires CSS side effects and a real declaration export', () => {
    const files = new Map([['package.json', Buffer.from(JSON.stringify({ name: '@zoom-design/vue', exports: { '.': './dist/index.js', './style.css': './dist/style.css' } }))], ['dist/index.js', Buffer.from('')], ['dist/style.css', Buffer.from('')]]);
    expect(() => inspectPackageFiles(files, '@zoom-design/vue')).toThrow(/declaration|types/i);
    const manifest = { name: '@zoom-design/vue', exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' }, './style.css': './dist/style.css' } };
    files.set('package.json', Buffer.from(JSON.stringify(manifest))); files.set('dist/index.d.ts', Buffer.from('export {};'));
    expect(() => inspectPackageFiles(files, '@zoom-design/vue')).toThrow(/sideEffects/);
  });
  it('rejects the repository, its ancestors, descendants and symlink consumers', () => {
    const base = mkdtempSync(join(tmpdir(), 'zoom-pack-boundary-'));
    try {
      const repository = join(base, 'workspace'); mkdirSync(repository);
      const outside = join(base, 'isolated'); mkdirSync(outside);
      expect(assertIsolatedRoot(outside, repository)).toBe(realpathSync.native(outside));
      expect(() => assertIsolatedRoot(repository, repository)).toThrow();
      expect(() => assertIsolatedRoot(base, repository)).toThrow();
      const inside = join(repository, 'nested'); mkdirSync(inside);
      expect(() => assertIsolatedRoot(inside, repository)).toThrow();
      const linked = join(base, 'linked'); symlinkSync(outside, linked, process.platform === 'win32' ? 'junction' : 'dir');
      expect(() => assertIsolatedRoot(linked, repository)).toThrow(/linked/);
    } finally { rmSync(base, { recursive: true, force: true }); }
  });
  it('measures only referenced assets and counts a shared chunk once using per-file compression', () => {
    const directory = mkdtempSync(join(tmpdir(), 'zoom-size-'));
    try {
      const contents = { 'entry.js': 'import "./shared.js";'.repeat(10), 'lazy.js': 'lazy'.repeat(30), 'shared.js': 'shared'.repeat(100), 'style.css': 'body{color:red}'.repeat(10), 'unused.js': 'unused'.repeat(500) };
      for (const [name, value] of Object.entries(contents)) writeFileSync(join(directory, name), value);
      const graph = [
        { fileName: 'entry.js', imports: ['shared.js'], dynamicImports: ['lazy.js'] },
        { fileName: 'lazy.js', imports: ['shared.js'], dynamicImports: [] },
        { fileName: 'shared.js', imports: [], dynamicImports: [] },
      ];
      const result = measureReferencedAssets(directory, '<script type="module" src="/entry.js"></script><link rel="stylesheet" href="/style.css">', graph);
      expect(result.assets.map(file => file.path).sort()).toEqual(['entry.js', 'lazy.js', 'shared.js', 'style.css']);
      const values = ['entry.js', 'lazy.js', 'shared.js', 'style.css'].map(name => Buffer.from(contents[name as keyof typeof contents]));
      expect(result.total).toEqual({ raw: values.reduce((sum, value) => sum + value.length, 0), gzip: values.reduce((sum, value) => sum + gzipSync(value).length, 0), brotli: values.reduce((sum, value) => sum + brotliCompressSync(value).length, 0) });
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it('keeps native Angular build emission enabled and uses only standalone configs', () => {
    const config = consumerTypeConfig('angular');
    expect(config.compilerOptions.noEmit).not.toBe(true);
    expect(config.compilerOptions.skipLibCheck).toBe(false);
    expect(config.compilerOptions.paths).toBeUndefined();
    expect(config.extends).toBeUndefined();
    expect(config.angularCompilerOptions.strictTemplates).toBe(true);
  });
});
