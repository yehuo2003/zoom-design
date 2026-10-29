import { readFileSync, realpathSync, lstatSync, existsSync } from 'node:fs';
import { resolve, relative, isAbsolute, dirname, sep, posix } from 'node:path';
import { gunzipSync, gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { inspectThemeFiles } from './theme-contract.mjs';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export function inside(parent, child) {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}
export function assertNoLinks(base, target) {
  if (!inside(base, target)) throw Error(`Path outside isolation: ${target}`);
  let current = resolve(target);
  while (inside(base, current)) {
    if (lstatSync(current).isSymbolicLink()) throw Error(`Symlink/junction is forbidden: ${current}`);
    if (current === resolve(base)) break;
    current = dirname(current);
  }
  if (!inside(realpathSync.native(base), realpathSync.native(target))) throw Error(`Realpath outside isolation: ${target}`);
  return realpathSync.native(target);
}
export function assertIsolatedRoot(directory, repository) {
  if (!isAbsolute(directory)) throw Error('Isolation root must be absolute');
  // Native builders canonicalize Windows 8.3 paths; use the same long path before
  // creating manifests or launching tools, so TypeScript and esbuild agree.
  const actual = realpathSync.native(directory); const source = realpathSync.native(repository);
  if (lstatSync(directory).isSymbolicLink() || inside(source, actual) || inside(actual, source)) throw Error(`Isolation root overlaps workspace or is linked: ${directory}`);
  // Reject other npm workspaces in the temp ancestry too.
  for (let parent = dirname(actual); parent !== dirname(parent); parent = dirname(parent)) {
    const manifest = resolve(parent, 'package.json');
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).workspaces) throw Error(`Isolation root has a workspace ancestor: ${parent}`);
  }
  return actual;
}
export function packRecord(report, name) {
  const records = Array.isArray(report) ? report.filter(entry => entry.name === name) : report[name] ? [report[name]] : [];
  const item = records[0];
  if (records.length !== 1 || !item?.filename || !/^[\w.-]+\.tgz$/.test(item.filename) || !Array.isArray(item.files)) throw Error(`Invalid npm pack report for ${name}`);
  return item;
}
// Read regular files without extracting the archive or following archive links.
export function readTarball(file) {
  const data = gunzipSync(readFileSync(file)); const files = new Map();
  const string = buffer => buffer.toString('utf8').replace(/\0.*$/s, '');
  let extended = {}; let longName;
  for (let offset = 0; offset + 512 <= data.length;) {
    const header = data.subarray(offset, offset + 512); offset += 512;
    if (header.every(value => value === 0)) break;
    const checksum = parseInt(string(header.subarray(148, 156)).trim(), 8);
    const actual = [...header].reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
    if (checksum !== actual) throw Error(`Invalid tar checksum: ${file}`);
    const size = parseInt(string(header.subarray(124, 136)).trim() || '0', 8);
    if (!Number.isSafeInteger(size) || size < 0 || offset + size > data.length) throw Error('Invalid tar size');
    const body = data.subarray(offset, offset + size); offset += Math.ceil(size / 512) * 512;
    const type = string(header.subarray(156, 157));
    if (type === 'x' || type === 'g') {
      for (let at = 0; at < body.length;) {
        const space = body.indexOf(32, at); const length = Number(body.subarray(at, space).toString());
        if (!Number.isSafeInteger(length) || length < 3 || at + length > body.length) throw Error('Invalid PAX header');
        const value = body.subarray(space + 1, at + length - 1).toString(); const split = value.indexOf('=');
        extended[value.slice(0, split)] = value.slice(split + 1); at += length;
      }
      continue;
    }
    if (type === 'L') { longName = string(body); continue; }
    const prefix = string(header.subarray(345, 500));
    const name = extended.path ?? longName ?? [prefix, string(header.subarray(0, 100))].filter(Boolean).join('/');
    extended = {}; longName = undefined;
    if (type === '5') continue;
    if (type !== '' && type !== '0') throw Error(`Forbidden tar link/type ${type}: ${name}`);
    if (!name.startsWith('package/') || name.includes('\\') || name.split('/').includes('..')) throw Error(`Invalid tar path ${name}`);
    const path = name.slice('package/'.length);
    if (files.has(path)) throw Error(`Duplicate tar member ${path}`);
    files.set(path, body);
  }
  if (!files.size) throw Error('Empty tarball');
  return files;
}
function targets(value) {
  return typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(targets) : [];
}
export function inspectPackageFiles(files, name) {
  if (!files.has('package.json')) throw Error(`${name}: no manifest`);
  const manifest = JSON.parse(files.get('package.json').toString());
  if (manifest.name !== name) throw Error(`${name}: wrong package name`);
  const exported = targets(manifest.exports);
  if (Object.keys(manifest.exports ?? {}).some(key => key.includes('*'))) throw Error(`${name}: wildcard/broad exports forbidden`);
  if (!manifest.exports?.['.']?.types || !/\.d\.(?:ts|mts)$/.test(manifest.exports['.'].types)) throw Error(`${name}: missing declaration types export`);
  for (const path of exported) {
    if (!path.startsWith('./') || path.includes('..', 2) || !files.has(path.slice(2))) throw Error(`${name}: missing/invalid export ${path}`);
  }
  let allowedSass = [];
  if (['@zoom-design/vue', '@zoom-design/react', '@zoom-design/angular'].includes(name)) {
    if (!manifest.exports['./style.css'] || !manifest.sideEffects?.includes('**/*.css')) throw Error(`${name}: CSS export/sideEffects missing`);
    allowedSass = inspectThemeFiles(files, name, manifest);
  }
  if (name === '@zoom-design/vue') {
    if (JSON.stringify(manifest.exports['./button']) !== JSON.stringify({ types: './dist/types/button/index.d.ts', import: './dist/button/index.js' }) || manifest.exports['./button/style.css'] !== './dist/button/style.css') throw Error('Vue: exact Button JS/types/CSS exports required');
    if (JSON.stringify(manifest.exports['./select']) !== JSON.stringify({ types: './dist/types/select/index.d.ts', import: './dist/select/index.js' }) || manifest.exports['./select/style.css'] !== './dist/select/style.css') throw Error('Vue: exact Select JS/types/CSS exports required');
    for (const dependency of ['@zoom-design/core', '@zoom-design/dom']) if (manifest.dependencies?.[dependency] !== '0.0.0') throw Error(`Vue: exact runtime dependency ${dependency}@0.0.0 required`);
  }
  const runtimeDependencies = { ...manifest.dependencies, ...manifest.peerDependencies };
  for (const [path, content] of files) {
    if (/(^|\/)(?:src|test|tests|fixtures?|node_modules|apps|examples|\.env[^/]*|\.npmrc|\.git)(\/|$)|\.(?:pem|key|p12)$/.test(path) || (/\.(?:scss|sass)$/.test(path) && !allowedSass.includes(path))) throw Error(`${name}: forbidden packed file ${path}`);
    if (!/^(?:package\.json|README(?:\.[^/]+)?|LICENSE(?:\.[^/]+)?|(?:dist|fesm2022|types|styles)\/)/i.test(path)) throw Error(`${name}: unexpected packed path ${path}`);
    if (/\.(?:m?js|map)$/.test(path) && /(?:\/test\/fixtures\/|BuildProbe|private-fixture)/.test(content.toString())) throw Error(`${name}: private fixture leaked into ${path}`);
    if (/\.m?js$/.test(path)) {
      if (['@zoom-design/vue', '@zoom-design/react'].includes(name)) inspectRuntimeCode(name.split('/').pop(), content.toString());
      for (const match of content.toString().matchAll(/(?:from\s*|import\s*\(?\s*)["']([^"']+)["']/g)) {
        const imported = match[1];
        if (imported.startsWith('.') || imported.startsWith('node:')) continue;
        const dependency = imported.startsWith('@') ? imported.split('/').slice(0, 2).join('/') : imported.split('/')[0];
        if (!runtimeDependencies[dependency]) throw Error(`${name}: undeclared runtime import ${dependency}`);
      }
    }
  }
  return { manifest, exports: exported, files: [...files].map(([path, data]) => ({ path, size: data.length, sha256: sha256(data) })) };
}
export function inspectRuntimeCode(framework, source) {
  if (/(?:import\s*(?:\(|["'])|from\s*["'])[^\n;]*\.s?css/.test(source)) throw Error(`${framework}: implicit style import in JS`);
  const vueImplementation = /(?:function\s+(?:createRenderer|baseCreateRenderer|createVNode)\s*\(|(?:__v_isVNode\s*:\s*true[\s\S]{0,500}shapeFlag|shapeFlag[\s\S]{0,500}__v_isVNode\s*:\s*true))/;
  const reactImplementation = /react\.production|ReactCurrentDispatcher|function\s+createFiber/;
  if ((framework === 'vue' ? vueImplementation : reactImplementation).test(source)) throw Error(`${framework}: runtime bundled in library`);
}
export function publicImportChunk(graph, name, exports, subpath = '.') {
  const target = exports[subpath]?.import ?? exports[subpath]?.default;
  if (typeof target !== 'string' || !/\.m?js$/.test(target)) throw Error(`${name}: no public ESM export`);
  const suffix = `/node_modules/${name}/${target.replace(/^\.\//, '')}`;
  const chunk = graph.chunks.find(chunk => [chunk.facadeModuleId, ...chunk.modules].some(id => id?.replaceAll('\\', '/').split('?')[0].endsWith(suffix)));
  if (!chunk) throw Error(`${name}${subpath === '.' ? '' : subpath.slice(1)}: actual exported JS import missing in build graph`);
  return chunk;
}
export function measureReferencedAssets(directory, html, chunks) {
  const graph = new Map(chunks.map(chunk => [chunk.fileName, chunk])); const pending = [];
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))(?:\?[^"']*)?["']/g)) pending.push(match[1].replace(/^\//, ''));
  const seen = new Set(); const assets = [];
  while (pending.length) {
    const path = pending.pop(); if (seen.has(path)) continue;
    if (!/\.(?:js|css)$/.test(path) || path.includes('..') || isAbsolute(path)) throw Error(`Invalid size asset ${path}`);
    seen.add(path);
    const file = resolve(directory, path); if (!inside(directory, file)) throw Error('Asset outside browser output');
    const bytes = readFileSync(file);
    assets.push({ path, sha256: sha256(bytes), raw: bytes.length, gzip: gzipSync(bytes).length, brotli: brotliCompressSync(bytes).length });
    const chunk = graph.get(path);
    pending.push(...(chunk?.imports ?? []), ...(chunk?.dynamicImports ?? []), ...(chunk?.css ?? []));
    // Vite's generated CSS preload list can reference a dynamically imported CSS asset.
    if (path.endsWith('.js')) for (const match of bytes.toString().matchAll(/["']([^"']+\.css)["']/g)) {
      const css = posix.normalize(posix.join(posix.dirname(path), match[1]));
      if (existsSync(resolve(directory, css))) pending.push(css);
    }
  }
  assets.sort((a, b) => a.path.localeCompare(b.path));
  if (!assets.some(asset => asset.path.endsWith('.js'))) throw Error('No referenced JavaScript assets');
  return { assets, total: Object.fromEntries(['raw', 'gzip', 'brotli'].map(kind => [kind, assets.reduce((sum, asset) => sum + asset[kind], 0)])) };
}
