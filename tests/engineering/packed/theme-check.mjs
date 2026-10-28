// Copied outside the repository. Every compiler and theme resolves from this fixture.
import assert from 'node:assert/strict';
import * as sass from 'sass';
import { readFileSync, writeFileSync, renameSync, rmSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { inspectPackageFiles, inside } from './pack-contracts.mjs';
import { packagePath } from './run-local-bin.mjs';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(join(root, 'package.json'));
const spec = JSON.parse(readFileSync(join(root, '.theme-spec.json'), 'utf8'));
const evidence = { runId: spec.runId, compiler: require.resolve('sass'), positive: [], negative: [] };
assert(inside(root, realpathSync(evidence.compiler)), 'compiler must be installed in this fixture');
assert.equal(JSON.parse(readFileSync(packagePath(root, 'sass'), 'utf8')).version, spec.sass);
assert.equal(process.env.NODE_PATH, undefined);
const importer = new sass.NodePackageImporter(root);
const compile = (name, body = '.brand { @include zoom.theme(); @include zoom.density(regular); }', config = '') => {
  const result = sass.compileString(`@use "pkg:${name}/theme.scss" as zoom ${config};\n${body}`, { importers: [importer] });
  for (const url of result.loadedUrls) if (url.protocol === 'file:') assert(inside(join(root, 'node_modules', name), fileURLToPath(url)), `Sass source escaped installed package: ${url}`);
  return result.css;
};
function installedFiles(directory, prefix = '') {
  return new Map(readdirSync(join(directory, prefix), { withFileTypes: true }).flatMap(entry => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? [...installedFiles(directory, path)] : [[path, readFileSync(join(directory, path))]];
  }));
}
function positive(name) {
  assert.match(compile(name), /--zoom-color-primary: #2563eb/);
  assert.equal(compile(name, ''), '');
  assert.match(compile(name, '.x { @include zoom.theme(); }', 'with ($color-primary: #7c3aed, $font-family: ("Noto Sans SC", serif), $font-size-base: 1.25rem)'), /--zoom-font-family: "Noto Sans SC", serif/);
  const multiple = compile(name, '.purple { @include zoom.theme(("color-primary": #7c3aed)); } .teal { @include zoom.theme(("color-primary": #0f766e)); @include zoom.density(compact); }');
  assert.match(multiple, /\.purple \{[^}]*#7c3aed/s); assert.match(multiple, /\.teal \{[^}]*#0f766e/s);
  evidence.positive.push({ name, checks: ['default', 'import-only', 'with-font-color-size', 'multiple-scoped-themes'], loadedFrom: dirname(fileURLToPath(import.meta.resolve(`${name}/theme.scss`))) });
}
try {
  const css = [];
  for (const name of spec.packages) {
    positive(name);
    const directory = join(root, 'node_modules', name);
    inspectPackageFiles(installedFiles(directory), name);
    css.push(readFileSync(fileURLToPath(import.meta.resolve(`${name}/theme.css`)), 'utf8'));
  }
  assert.equal(new Set(css).size, 1, 'framework CSS must share identical semantics');
  const name = '@zoom-design/vue'; const directory = join(root, 'node_modules', name);
  const theme = dirname(fileURLToPath(import.meta.resolve(`${name}/theme.scss`)));
  const partial = join(theme, '_defaults.scss'); const missing = `${partial}.missing`;
  try { renameSync(partial, missing); assert.throws(() => compile(name), /(?:find stylesheet|import)/i); evidence.negative.push('missing-partial'); }
  finally { renameSync(missing, partial); positive(name); }
  const manifestFile = join(directory, 'package.json'); const original = readFileSync(manifestFile);
  try {
    const manifest = JSON.parse(original); manifest.exports['./theme.scss'].sass = './dist/missing.scss'; manifest.exports['./theme.scss'].default = './dist/missing.scss';
    writeFileSync(manifestFile, JSON.stringify(manifest)); assert.throws(() => compile(name), /(?:find stylesheet|no such file or directory)/i); evidence.negative.push('wrong-sass-export');
  } finally { writeFileSync(manifestFile, original); positive(name); }
  const privateFile = join(theme, '_private.scss');
  try { writeFileSync(privateFile, ''); assert.throws(() => inspectPackageFiles(installedFiles(directory), name), /forbidden.*scss/i); evidence.negative.push('private-scss'); }
  finally { rmSync(privateFile, { force: true }); positive(name); }
  const source = join(theme, '_theme.scss'); const originalSource = readFileSync(source);
  try { writeFileSync(source, '@use "../../../src/business";'); assert.throws(() => inspectPackageFiles(installedFiles(directory), name), /Sass.*reference/i); evidence.negative.push('source-reference'); }
  finally { writeFileSync(source, originalSource); positive(name); }
  evidence.exitCode = 0;
  console.log(`Theme installed Sass: ${spec.packages.length} packages, 4 negative controls and restored positives PASS`);
} catch (error) { evidence.exitCode = 1; evidence.error = error.message; console.error(error); process.exitCode = 1; }
finally { writeFileSync(join(root, 'theme-results.json'), JSON.stringify(evidence, null, 2) + '\n'); }
