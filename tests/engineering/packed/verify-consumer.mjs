import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { assertNoLinks, inside, sha256, inspectPackageFiles, readTarball } from './pack-contracts.mjs';
import { packagePath, readJson } from './run-local-bin.mjs';

// This file is copied into each consumer. All resolution starts here, outside the repo.
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spec = readJson(join(directory, '.pack-spec.json'));
const manifest = readJson(join(directory, 'package.json'));
const phase = process.argv[2] ?? 'installed';
try {
  if (!['preinstall', 'installed'].includes(phase) || process.argv.length > 3) throw Error('Invalid validation phase');
  if (process.env.NODE_PATH) throw Error('NODE_PATH must be absent');
  if (manifest.workspaces || manifest.volta || !manifest.private) throw Error('Consumer must be private and standalone');
  if (manifest.dependencies?.sass || manifest.devDependencies?.sass) throw Error('Standard CSS consumers must not declare Sass');
  if (phase === 'installed' && spec.app === 'vue' && existsSync(join(directory, 'node_modules/sass'))) throw Error('Standard Vue CSS consumption must not require installed Sass');
  for (const name of ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.contracts.json', 'tsconfig.contracts-negative.json', 'tsconfig.negative.json', 'tsconfig.button.json', 'tsconfig.button-ts.json', 'tsconfig.button-negative.json']) {
    const path = join(directory, name); if (!existsSync(path)) continue;
    const config = readJson(path);
    if (config.compilerOptions?.paths || config.compilerOptions?.baseUrl || config.references || (config.extends && !/^\.\/tsconfig\.json$/.test(config.extends))) throw Error(`Source alias/external config forbidden: ${name}`);
    if (name === 'tsconfig.json' && (config.compilerOptions.skipLibCheck !== false || config.compilerOptions.strict !== true)) throw Error('Strict declarations must be checked with skipLibCheck=false');
  }
  const resolved = {};
  for (const expected of spec.packages) {
    if (manifest.dependencies?.[expected.name] !== `file:vendor/${expected.filename}`) throw Error(`Missing declared local dependency ${expected.name}`);
    const vendor = join(directory, 'vendor', expected.filename);
    if (!existsSync(vendor) || sha256(readFileSync(vendor)) !== expected.sha256) throw Error(`Missing/changed local tgz ${expected.name}: ${vendor}`);
    assertNoLinks(directory, vendor);
    const packed = inspectPackageFiles(readTarball(vendor), expected.name);
    if (packed.manifest.version !== expected.version) throw Error('Wrong tarball version');
    for (const dependency of Object.keys(packed.manifest.dependencies ?? {})) {
      if (dependency.startsWith('@zoom-design/') && !spec.packages.some(entry => entry.name === dependency)) throw Error(`Undeclared local dependency ${dependency} required by ${expected.name}`);
    }
    if (phase === 'preinstall') continue;
    const packageDirectory = join(directory, 'node_modules', ...expected.name.split('/'));
    const installed = readJson(join(packageDirectory, 'package.json'));
    assertNoLinks(join(directory, 'node_modules'), packageDirectory);
    if (JSON.stringify(installed.exports) !== JSON.stringify(packed.manifest.exports) || installed.version !== expected.version || JSON.stringify(installed.dependencies) !== JSON.stringify(packed.manifest.dependencies)) throw Error(`Installed manifest/exports mismatch: ${expected.name}`);
    const url = import.meta.resolve(expected.name);
    const entry = fileURLToPath(url); const realpath = assertNoLinks(join(directory, 'node_modules'), entry);
    if (!inside(packageDirectory, realpath)) throw Error(`Package resolves outside its installation: ${expected.name}`);
    for (const file of expected.files) {
      const path = join(packageDirectory, file.path);
      if (!existsSync(path) || sha256(readFileSync(path)) !== file.sha256) throw Error(`Missing/changed installed asset ${expected.name}/${file.path}`);
      assertNoLinks(packageDirectory, path);
    }
    for (const internal of ['/dist/index.js', '/src/button/Button.vue', '/test/fixtures/private.js']) {
      let error;
      try { import.meta.resolve(expected.name + internal); } catch (caught) { error = caught; }
      if (error?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw Error(`Deep import is not closed: ${expected.name}${internal}`);
    }
    const css = installed.exports['./style.css'];
    resolved[expected.name] = { url, realpath, version: installed.version, declarations: join(packageDirectory, installed.exports['.'].types), ...(css ? { css: fileURLToPath(import.meta.resolve(`${expected.name}/style.css`)) } : {}) };
    if (installed.exports['./theme.css']) resolved[expected.name].theme = { css: fileURLToPath(import.meta.resolve(`${expected.name}/theme.css`)), sass: fileURLToPath(import.meta.resolve(`${expected.name}/theme.scss`)) };
    const publicAssets = {};
    for (const [subpath, value] of Object.entries(installed.exports)) {
      const target = typeof value === 'string' ? value : value.import ?? value.default;
      if (!target) continue;
      const specifier = expected.name + (subpath === '.' ? '' : subpath.slice(1));
      const url = import.meta.resolve(specifier); const path = fileURLToPath(url);
      const realpath = assertNoLinks(packageDirectory, path);
      const declarations = typeof value === 'object' && value.types ? join(packageDirectory, value.types) : undefined;
      if (declarations) assertNoLinks(packageDirectory, declarations);
      publicAssets[specifier] = { url, realpath, sha256: sha256(readFileSync(path)), ...(declarations ? { declarations: { realpath: realpathSync(declarations), sha256: sha256(readFileSync(declarations)) } } : {}) };
    }
    resolved[expected.name].publicAssets = publicAssets;
  }
  if (phase === 'installed') {
    const actualRequire = createRequire(join(directory, 'package.json'));
    for (const [name, version] of Object.entries(spec.tools)) {
      const path = packagePath(directory, name); const realpath = assertNoLinks(join(directory, 'node_modules'), path);
      const installed = readJson(path);
      if ((manifest.devDependencies?.[name] ?? manifest.dependencies?.[name]) !== version || installed.version !== version) throw Error(`Wrong tool version ${name}: expected ${version}, resolved ${installed.version}`);
      resolved[name] = { version: installed.version, manifest: path, realpath };
    }
    for (const [name, version] of Object.entries(spec.runtimes)) {
      const path = packagePath(directory, name); const realpath = assertNoLinks(join(directory, 'node_modules'), path);
      if (readJson(path).version !== version) throw Error(`Wrong runtime ${name}`);
      const origins = [join(directory, 'package.json'), ...spec.packages.filter(entry => !['@zoom-design/core', '@zoom-design/dom'].includes(entry.name)).map(entry => join(directory, 'node_modules', ...entry.name.split('/'), 'package.json'))];
      const paths = origins.map(origin => realpathSync(createRequire(origin).resolve(name)));
      if (new Set(paths).size !== 1) throw Error(`Duplicate runtime resolution ${name}`);
      resolved[name] = { version, manifest: path, realpath, entry: paths[0], origins };
    }
    if (spec.app === 'angular') {
      const compiler = packagePath(directory, '@angular/compiler-cli');
      const actualTS = createRequire(compiler).resolve('typescript/package.json');
      if (realpathSync(actualTS) !== realpathSync(actualRequire.resolve('typescript/package.json'))) throw Error('Angular compiler used a different TypeScript');
      resolved.angularCompilerTypeScript = actualTS;
    }
    if (typeof window !== 'undefined' || typeof document !== 'undefined') throw Error('Node import must have no browser globals');
    for (const name of ['@zoom-design/core', '@zoom-design/dom']) await import(name);
    if (['vue', 'react'].includes(spec.app)) {
      const adapter = await import(`@zoom-design/${spec.app}`);
      if (spec.app === 'vue') {
        const component = await import('@zoom-design/vue/button');
        if (JSON.stringify(Object.keys(adapter)) !== '["ZButton"]' || JSON.stringify(Object.keys(component)) !== '["ZButton"]' || component.ZButton !== adapter.ZButton) throw Error('Vue public runtime API differs between root and Button');
      }
      const server = join(directory, 'server/ssr.js');
      if (existsSync(server)) {
        const { render } = await import(new URL(`../server/ssr.js`, import.meta.url));
        const html = await render();
        if (!html.includes(spec.app === 'vue' ? 'Vue engineering probe' : 'Probe count')) throw Error('SSR did not produce probe HTML');
        resolved.ssr = { import: 'PASS', render: 'PASS', bytes: Buffer.byteLength(html) };
        if (spec.app === 'vue') {
          const purple = await render('/ssr?example=theme&brand=purple'); const teal = await render('/ssr?example=theme&brand=teal');
          if (!purple.includes('data-theme-brand="purple"') || !teal.includes('data-theme-brand="teal"') || await render('/ssr?example=theme&brand=purple') !== purple) throw Error('Theme SSR request isolation failed');
          resolved.ssr.theme = { render: 'PASS', isolation: 'PASS' };
          const button = await render('/ssr?example=button&brand=purple');
          const other = await render('/ssr?example=button&brand=teal');
          if (!/<button[^>]*class="zoom-button"/.test(button) || !button.includes('Save changes') || !button.includes('aria-busy="true"') || !button.includes('data-button-brand="purple"') || !other.includes('data-button-brand="teal"') || await render('/ssr?example=button&brand=purple') !== button) throw Error('Button SSR markup/request isolation failed');
          resolved.ssr.button = { render: 'PASS', isolation: 'PASS' };
        }
      }
    }
    console.log(JSON.stringify({ app: spec.app, phase, node: process.version, nodePath: null, resolved }, null, 2));
  } else console.log(JSON.stringify({ app: spec.app, phase, localPackages: spec.packages.map(entry => entry.name) }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
