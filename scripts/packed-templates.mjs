import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const json = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
export function consumerTypeConfig(app) {
  const compilerOptions = { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', verbatimModuleSyntax: true, skipLibCheck: false, noEmit: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: app === 'vue' ? ['vite/client', 'node'] : app === 'react' ? ['react', 'react-dom', 'vite/client'] : [], ...(app === 'react' ? { jsx: 'react-jsx' } : {}), ...(app === 'angular' ? { experimentalDecorators: true, importHelpers: true, useDefineForClassFields: false } : {}) };
  // Angular's application builder needs emitted JS; type-only commands pass --noEmit.
  if (app === 'angular') delete compilerOptions.noEmit;
  return { compilerOptions, ...(app === 'angular' ? { angularCompilerOptions: { strictInjectionParameters: true, strictInputAccessModifiers: true, strictTemplates: true } } : {}), include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue', 'contracts/valid.ts'] };
}
export function createConsumer(repository, directory, app, packages) {
  mkdirSync(join(directory, 'scripts'), { recursive: true }); mkdirSync(join(directory, 'src/fixtures'), { recursive: true }); mkdirSync(join(directory, 'contracts/platform'), { recursive: true });
  const original = JSON.parse(readFileSync(join(repository, `apps/${app}-smoke/package.json`), 'utf8'));
  const dependencies = Object.fromEntries(Object.entries(original.dependencies).filter(([name]) => !name.startsWith('@zoom-design/')));
  // All four isolated consumers compile Select's real declarations. Pin its peer
  // explicitly so a future registry release cannot silently change the fixture.
  if (app !== 'vue') dependencies.vue = JSON.parse(readFileSync(join(repository, 'apps/vue-smoke/package.json'), 'utf8')).dependencies.vue;
  const tools = { ...original.devDependencies }; const runtimes = { ...dependencies };
  for (const entry of packages) dependencies[entry.name] = `file:vendor/${entry.filename}`;
  json(join(directory, 'package.json'), { name: `zoom-${app}-packed-consumer`, version: '0.0.0', private: true, type: 'module', engines: { node: '>=26.12.1 <27', npm: '>=12.2.1 <13' }, dependencies, devDependencies: tools, scripts: { typecheck: 'node scripts/native-check.mjs typecheck', build: 'node scripts/native-check.mjs build', validate: 'node scripts/verify-consumer.mjs' } });
  json(join(directory, '.pack-spec.json'), { app, tools, runtimes, packages });
  writeFileSync(join(directory, '.npmrc'), 'save-exact=true\nengine-strict=true\n');
  for (const script of ['run-local-bin.mjs', 'run-vue-tsc.mjs', 'pack-contracts.mjs', 'theme-contract.mjs']) cpSync(join(repository, 'scripts', script), join(directory, 'scripts', script));
  for (const script of ['verify-consumer.mjs', 'native-check.mjs', 'vite-graph.mjs', 'selection-type-contract.mjs', 'dom-type-contract.mjs', 'select-type-contract.mjs', 'select-ssr-contract.mjs', ...(app === 'vue' ? ['button-size.mjs', 'button-size-contract.mjs', 'select-size.mjs', 'select-size-contract.mjs'] : [])]) cpSync(join(repository, 'tests/engineering/packed', script), join(directory, 'scripts', script));
  cpSync(join(repository, `apps/${app}-smoke/src`), join(directory, 'src'), { recursive: true });
  if (app !== 'angular') cpSync(join(repository, `apps/${app}-smoke/index.html`), join(directory, 'index.html'));
  const probes = app === 'platform' ? [['core', 'state.ts'], ['dom', 'listener.ts']] : [[app, app === 'vue' ? 'BuildProbe.vue' : app === 'react' ? 'BuildProbe.tsx' : 'build-probe.ts']];
  for (const [name, file] of probes) cpSync(join(repository, `packages/${name}/test/fixtures/${file}`), join(directory, 'src/fixtures', file));
  const hosts = app === 'platform' ? ['main.ts'] : app === 'vue' ? ['ProbeHost.vue'] : app === 'react' ? ['Harness.tsx'] : ['app.ts'];
  for (const file of hosts) {
    const path = join(directory, 'src', file);
    writeFileSync(path, readFileSync(path, 'utf8').replace(/\.\.\/\.\.\/\.\.\/packages\/[^/]+\/test\/fixtures\//g, './fixtures/'));
  }
  for (const [name, file] of [['core', 'state'], ['dom', 'listener']]) cpSync(join(repository, `.artifacts/fixtures/platform/packages/${name}/test/fixtures/${file}.d.ts`), join(directory, `contracts/platform/${file}.d.ts`));
  writeFileSync(join(directory, 'contracts/valid.ts'), `import type * as Core from '@zoom-design/core';\nimport type * as DOM from '@zoom-design/dom';\n${app !== 'platform' ? `import type * as Adapter from '@zoom-design/${app}';\n` : ''}import { createEngineeringState } from './platform/state.js';\nimport { registerEngineeringClick } from './platform/listener.js';\nconst state = createEngineeringState<number>(0, 9);\nstate.update(value => value + 1);\nconst status: 'ready' = state.snapshot().status;\nconst value: number = state.snapshot().value;\nconst cleanup: () => void = registerEngineeringClick(new EventTarget(), () => {});\nvoid [status, value, cleanup];\nexport type PublicDeclarations = [typeof Core, typeof DOM${app !== 'platform' ? ', typeof Adapter' : ''}];\n`);
  writeFileSync(join(directory, 'contracts/invalid.ts'), `import { createEngineeringState } from './platform/state.js';\nconst state = createEngineeringState<number>(0, 9);\nstate.update(value => String(value));\nconst status: 'missing' = state.snapshot().status;\ncreateEngineeringState<number>(0, 'invalid');\nvoid status;\n`);
  json(join(directory, 'tsconfig.json'), consumerTypeConfig(app));
  json(join(directory, 'tsconfig.contracts.json'), { extends: './tsconfig.json', compilerOptions: { noEmit: true }, include: [], files: ['contracts/valid.ts'] });
  json(join(directory, 'tsconfig.contracts-negative.json'), { extends: './tsconfig.json', compilerOptions: { noEmit: true }, include: [], files: ['contracts/invalid.ts'] });
  cpSync(join(repository, 'packages/core/test/selection-types'), join(directory, 'contracts/selection'), { recursive: true });
  cpSync(join(repository, 'packages/dom/test/dom-types'), join(directory, 'contracts/dom'), { recursive: true });
  cpSync(join(repository, 'packages/vue/test/select-types'), join(directory, 'contracts/select'), { recursive: true });
  for (const [suffix, file] of [['', 'consumer.ts'], ['-negative', 'invalid.ts']]) {
    json(join(directory, `tsconfig.select-ts${suffix}.json`), { extends: './tsconfig.json', compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: [], noEmit: true }, include: [], files: [`contracts/select/${file}`] });
  }
  for (const [suffix, file] of [['', 'valid.ts'], ['-negative', 'invalid.ts']]) {
    json(join(directory, `tsconfig.dom${suffix}.json`), { extends: './tsconfig.json', compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: [], noEmit: true }, include: [], files: [`contracts/dom/${file}`] });
  }
  for (const [suffix, file] of [['', 'valid.ts'], ['-negative', 'invalid.ts']]) {
    json(join(directory, `tsconfig.selection${suffix}.json`), { extends: './tsconfig.json', compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', lib: ['ES2022'], types: [], noEmit: true }, include: [], files: [`contracts/selection/${file}`] });
  }
  if (app === 'vue') {
    cpSync(join(repository, 'packages/vue/test/button-types'), join(directory, 'contracts/button'), { recursive: true });
    json(join(directory, 'tsconfig.button.json'), { extends: './tsconfig.json', include: ['contracts/button/consumer.ts', 'contracts/button/Valid.vue'] });
    json(join(directory, 'tsconfig.button-ts.json'), { extends: './tsconfig.json', include: ['contracts/button/consumer.ts'] });
    json(join(directory, 'tsconfig.button-negative.json'), { extends: './tsconfig.json', vueCompilerOptions: { strictTemplates: true }, include: ['contracts/button/invalid.ts', 'contracts/button/Invalid.vue'] });
    json(join(directory, 'tsconfig.select.json'), { extends: './tsconfig.json', vueCompilerOptions: { strictTemplates: true }, include: ['contracts/select/consumer.ts', 'contracts/select/Valid.vue'] });
    json(join(directory, 'tsconfig.select-negative.json'), { extends: './tsconfig.json', vueCompilerOptions: { strictTemplates: true }, include: ['contracts/select/invalid.ts', 'contracts/select/Invalid.vue'] });
  }
  mkdirSync(join(directory, 'negative'), { recursive: true });
  let nativeNegative;
  if (app === 'vue') {
    nativeNegative = 'negative/Invalid.vue';
    writeFileSync(join(directory, nativeNegative), `<script setup lang="ts">\nimport Probe from '../src/fixtures/BuildProbe.vue';\nconst changed = (count: string) => count;\n</script>\n<template><Probe :label="42" @changed="changed" /></template>\n`);
  } else if (app === 'react') {
    nativeNegative = 'negative/invalid.tsx';
    writeFileSync(join(directory, nativeNegative), `import { BuildProbe } from '../src/fixtures/BuildProbe.js';\nexport const invalid = <BuildProbe label={42} onCount={(count: string) => count} />;\n`);
  } else if (app === 'angular') {
    nativeNegative = 'negative/invalid.ts';
    writeFileSync(join(directory, nativeNegative), `import { Component } from '@angular/core';\nimport { BuildProbe } from '../src/fixtures/build-probe';\n@Component({standalone: true, imports: [BuildProbe], template: '<zoom-build-probe [label]="42" (countChanged)="changed($event)" />'})\nexport class Invalid { changed(value: string): void { void value; } }\n`);
    const config = JSON.parse(readFileSync(join(repository, 'apps/angular-smoke/angular.json'), 'utf8'));
    config.$schema = './node_modules/@angular/cli/lib/config/schema.json';
    Object.assign(config.projects['angular-smoke'].architect.build.options, { outputPath: { base: '.', browser: 'browser' }, styles: ['@zoom-design/angular/style.css'], statsJson: true, deleteOutputPath: false });
    delete config.projects['angular-smoke'].architect.serve;
    json(join(directory, 'angular.json'), config);
    json(join(directory, 'tsconfig.app.json'), { extends: './tsconfig.json', compilerOptions: { outDir: './.angular/types' }, include: ['src/**/*.d.ts'], files: ['src/main.ts', 'contracts/valid.ts'] });
  }
  if (nativeNegative) json(join(directory, 'tsconfig.negative.json'), { extends: './tsconfig.json', include: [], files: [nativeNegative] });
  if (app !== 'angular') {
    const frameworkPlugin = app === 'vue' ? "import framework from '@vitejs/plugin-vue';" : app === 'react' ? "import framework from '@vitejs/plugin-react';" : '';
    writeFileSync(join(directory, 'vite.config.mjs'), `import { defineConfig } from 'vite';\n${frameworkPlugin}\nimport { graphPlugin } from './scripts/vite-graph.mjs';\nexport default defineConfig(({ isSsrBuild }) => ({\n  plugins: [${app !== 'platform' ? 'framework(), ' : ''}graphPlugin(isSsrBuild)],\n  build: { target: 'es2022', outDir: 'browser', emptyOutDir: true, manifest: !isSsrBuild, sourcemap: false, rolldownOptions: { output: { entryFileNames: isSsrBuild ? 'ssr.js' : 'assets/[name]-[hash].js' } } },\n}));\n`);
  }
}
