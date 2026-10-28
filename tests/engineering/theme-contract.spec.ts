import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import { existsSync, readFileSync, mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectPackageFiles } from '../../scripts/pack-contracts.mjs';

const root = resolve(import.meta.dirname, '../..');
const compile = (body: string, config = '') => sass.compileString(`@use "index" as zoom ${config};\n${body}`, { style: 'expanded', loadPaths: [join(root, 'design/styles')] }).css;
const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'));

describe('Task6 public theme contract', () => {
  it('T6.1 emits the documented default tokens without optional aliases', () => {
    const css = compile(':root { @include zoom.theme(); @include zoom.density(regular); }');
    for (const value of ['--zoom-color-primary: #2563eb', '--zoom-color-on-primary: #ffffff', '--zoom-color-text: #111827', '--zoom-font-size-base: 1rem', '--zoom-control-min-size-md: 2.25rem']) expect(css).toContain(value);
    expect(css).not.toMatch(/--zoom-(?:color-primary-hover|color-primary-active|color-focus|font-size-(?:sm|md|lg)|button-)/);
  });
  it('T6.3/T6.4 configures one default while preserving fonts, units and unrelated values', () => {
    const css = compile('.brand { @include zoom.theme(); }', 'with ($color-primary: #7c3aed, $font-family: ("Noto Sans SC", serif), $font-size-base: 1.25rem)');
    expect(css).toContain('--zoom-color-primary: #7c3aed');
    expect(css).toContain('--zoom-font-family: "Noto Sans SC", serif');
    expect(css).toContain('--zoom-font-size-base: 1.25rem');
    expect(css).toContain('--zoom-color-text: #111827');
  });
  it('T6.5 importing Sass emits no CSS', () => { expect(compile('')).toBe(''); });
  it('T6.6 generates scoped brands from the same module and supports null overrides', () => {
    const css = compile('.a { @include zoom.theme(("color-primary": #7c3aed, "font-size-md": 2rem)); } .b { @include zoom.theme(("color-primary": #0f766e, "font-size-md": null)); }');
    expect(css).toMatch(/\.a \{[^}]*--zoom-color-primary: #7c3aed/s);
    expect(css).toMatch(/\.b \{[^}]*--zoom-color-primary: #0f766e/s);
    expect(css.match(/--zoom-font-size-md:/g)).toHaveLength(1);
  });
  it('T6.7 rejects unknown keys, non-map overrides and unsupported density', () => {
    expect(() => compile('.x { @include zoom.theme(("business-store": 1)); }')).toThrow(/business-store/);
    expect(() => compile('.x { @include zoom.theme(red); }')).toThrow(/map/i);
    expect(() => compile('.x { @include zoom.density(spacious); }')).toThrow(/spacious/);
  });
  it('T6.11 each density emits the complete eight geometry properties without typography', () => {
    for (const density of ['regular', 'compact']) {
      const css = compile(`.x { @include zoom.density(${density}); }`);
      expect(css.match(/--zoom-control-/g)).toHaveLength(8);
      expect(css).not.toMatch(/font|color/);
      expect(css).toContain(density === 'regular' ? '--zoom-control-min-size-md: 2.25rem' : '--zoom-control-min-size-md: 1.75rem');
    }
  });
  it('T6.16 three frameworks compile identical theme CSS with low specificity and no host reset', () => {
    const css = ['vue', 'react', 'angular'].map(name => sass.compile(join(root, `packages/${name}/src/styles/theme.scss`)).css);
    expect(new Set(css).size).toBe(1);
    expect(css[0]).toContain(':where(:root)');
    expect(css[0]).toContain(':where([data-zoom-density=regular])');
    expect(css[0]).not.toMatch(/(?:body|button|input|\.zoom-button)\s*\{/);
  });
  it('T6.17 framework manifests declare exact theme assets and retain CSS side effects', () => {
    for (const name of ['vue', 'react', 'angular']) {
      const manifest = json(join(root, `packages/${name}/package.json`));
      const base = name === 'angular' ? './styles' : './dist';
      expect(manifest.exports['./theme.css']).toBe(`${base}/theme.css`);
      expect(manifest.exports['./theme.scss']).toEqual({ sass: `${base}/styles/theme/_index.scss`.replace('/styles/styles/', '/styles/'), default: `${base}/styles/theme/_index.scss`.replace('/styles/styles/', '/styles/') });
      expect(manifest.sideEffects).toContain('**/*.css');
      expect(Object.keys(manifest.exports).some(key => key.includes('*'))).toBe(false);
    }
  });
  it('T6.18/T6.19 validates closed Sass dependencies and refuses private files or broad exports', () => {
    const manifest = { name: '@zoom-design/react', exports: { '.': { types: './dist/types/index.d.ts', import: './dist/index.js' }, './style.css': './dist/style.css', './theme.css': './dist/theme.css', './theme.scss': { sass: './dist/styles/theme/_index.scss', default: './dist/styles/theme/_index.scss' } }, sideEffects: ['**/*.css'] };
    const files = new Map<string, Buffer>([['package.json', Buffer.from(JSON.stringify(manifest))], ...['dist/index.js', 'dist/types/index.d.ts', 'dist/style.css', 'dist/theme.css'].map(path => [path, Buffer.from('')] as [string, Buffer]), ...['_index.scss', '_defaults.scss', '_theme.scss', '_density.scss'].map(name => [`dist/styles/theme/${name}`, readFileSync(join(root, 'design/styles', name))] as [string, Buffer])]);
    expect(() => inspectPackageFiles(files, manifest.name)).not.toThrow();
    const bad = new Map(files); bad.set('dist/styles/theme/_private.scss', Buffer.from(''));
    expect(() => inspectPackageFiles(bad, manifest.name)).toThrow(/forbidden.*scss/i);
    const escape = new Map(files); escape.set('dist/styles/theme/_theme.scss', Buffer.from('@use "../../../src/business";'));
    expect(() => inspectPackageFiles(escape, manifest.name)).toThrow(/Sass.*(?:dependency|reference)/i);
    const wildcard = new Map(files); wildcard.set('package.json', Buffer.from(JSON.stringify({ ...manifest, exports: { ...manifest.exports, './*': './dist/index.js' } })));
    expect(() => inspectPackageFiles(wildcard, manifest.name)).toThrow(/wildcard|broad/i);
  });
  it.each(['vue', 'react', 'angular'])('T6.22 %s invalid SCSS invalidates the entire prior CSS and Sass output group', async name => {
    const { compilePackageStyles } = await import('../../scripts/build-styles.mjs');
    const temporary = mkdtempSync(join(tmpdir(), 'zoom-theme-build-'));
    try {
      cpSync(join(root, 'design'), join(temporary, 'design'), { recursive: true });
      cpSync(join(root, `packages/${name}/src/styles`), join(temporary, `packages/${name}/src/styles`), { recursive: true });
      if (name === 'vue') { mkdirSync(join(temporary, 'packages/vue/src/button'), { recursive: true }); cpSync(join(root, 'packages/vue/src/button/style.scss'), join(temporary, 'packages/vue/src/button/style.scss')); }
      compilePackageStyles(name, { rootDirectory: temporary });
      const outputs = ['style.css', 'theme.css', name === 'angular' ? 'theme/_index.scss' : 'styles/theme/_index.scss'].map(file => join(temporary, `packages/${name}/${name === 'angular' ? '.generated' : 'dist'}`, file));
      expect(outputs.every(existsSync)).toBe(true);
      const source = join(temporary, 'design/styles/_theme.scss'); const original = readFileSync(source);
      writeFileSync(source, '@error "Task6 invalid theme control";');
      expect(() => compilePackageStyles(name, { rootDirectory: temporary })).toThrow(/Task6 invalid theme control/);
      expect(outputs.some(existsSync)).toBe(false);
      writeFileSync(source, original); compilePackageStyles(name, { rootDirectory: temporary });
      expect(outputs.every(existsSync)).toBe(true);
    } finally { rmSync(temporary, { recursive: true, force: true }); }
  });
  it('T6.15/T6.23 Core/DOM stay style-free and clean CI copies shared design sources', () => {
    for (const name of ['core', 'dom']) {
      const manifest = json(join(root, `packages/${name}/package.json`));
      expect(JSON.stringify(manifest.exports)).not.toMatch(/css|scss/);
      expect(JSON.stringify(manifest.dependencies ?? {})).not.toMatch(/sass|vue|react|angular/);
    }
    expect(readFileSync(join(root, 'tests/engineering/portable-ci.mjs'), 'utf8')).toMatch(/['"]design['"]/);
  });
});
