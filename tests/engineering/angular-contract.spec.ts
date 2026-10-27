import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const source = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('Angular native package contract', () => {
  it('uses native library builder and includes root-level TestBed fixtures in test discovery', () => {
    const project = json('packages/angular/angular.json').projects['zoom-angular'];
    expect(project.root).toBe('');
    expect(project.sourceRoot).toBe('src');
    expect(project.architect.build.builder).toBe('@angular/build:ng-packagr');
    expect(project.architect.test.builder).toBe('@angular/build:unit-test');
    expect(project.architect.test.options.include).toContain('../test/**/*.spec.ts');
    expect(json('packages/angular/tsconfig.lib.prod.json').angularCompilerOptions.compilationMode).toBe('partial');
    expect(json('packages/angular/tsconfig.spec.json').include).toContain('test/**/*.spec.ts');
    expect(source('packages/angular/test/build-probe.spec.ts')).not.toContain('initTestEnvironment');
  });

  it('resolves TS6 from the Angular package and compiler without using root TS7', () => {
    const local = createRequire(path.join(root, 'packages/angular/package.json'));
    expect(local('typescript/package.json').version).toBe('6.0.3');
    const compiler = createRequire(local.resolve('@angular/compiler-cli/package.json'));
    expect(compiler('typescript/package.json').version).toBe('6.0.3');
  });

  it('retains native APF exports and external Angular runtime with an empty product API', async () => {
    const apf = json('dist/angular/package.json');
    expect(apf.exports['.'].default).toMatch(/^\.\/fesm2022\/.*\.mjs$/);
    expect(apf.exports['.'].types).toMatch(/^\.\/types\/.*\.d\.ts$/);
    expect(Object.keys(await import(pathToFileURL(path.join(root, 'dist/angular', apf.exports['.'].default)).href))).toEqual([]);
    expect(apf.peerDependencies['@angular/core']).toBe('~22.2.3');
    expect(apf.exports['./style.css']).toBe('./styles/style.css');
    expect(apf.sideEffects).toContain('**/*.css');
    expect(source('dist/angular/styles/style.css')).toMatch(/--zoom-engineering-built:\s*1/);
  });

  it('keeps partial component declarations in the dedicated fixture alone', () => {
    const fixture = json('.artifacts/fixtures/angular/apf/package.json');
    expect(source(`.artifacts/fixtures/angular/apf/${fixture.exports['.'].default}`)).toContain('ɵɵngDeclareComponent');
    expect(source(`.artifacts/fixtures/angular/apf/${fixture.exports['.'].types}`)).toContain('class BuildProbe');
    expect(source('packages/angular/src/public-api.ts')).not.toContain('BuildProbe');
  });

  it('uses an official application target and imports APF and CSS before zoneless bootstrap', () => {
    const app = json('apps/angular-smoke/angular.json').projects['angular-smoke'];
    expect(app.architect.build.builder).toBe('@angular/build:application');
    expect(app.architect.build.options.polyfills).toEqual([]);
    expect(app.architect.build.options.outputPath).toBe('../../.artifacts/task3/angular-smoke');
    expect(source('apps/angular-smoke/src/main.ts')).toContain("import('@zoom-design/angular')");
    expect(app.architect.build.options.styles).toEqual(['../../dist/angular/styles/style.css']);
    expect(source('apps/angular-smoke/src/main.ts')).not.toMatch(/provideZoneChangeDetection|zone\.js/);
  });
});
