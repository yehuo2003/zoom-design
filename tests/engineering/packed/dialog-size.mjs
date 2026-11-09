import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { runBin, readJson } from './run-local-bin.mjs';
import { inside, measureReferencedAssets, sha256 } from './pack-contracts.mjs';
import { minimalDialogEntry, assertDialogSizeEvidence } from './dialog-size-contract.mjs';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(directory, 'package.json'));
const { transformWithOxc } = await import(pathToFileURL(require.resolve('vite')).href);
const spec = readJson(join(directory, '.pack-spec.json'));
if (spec.app !== 'vue') throw Error('Dialog size requires standalone Vue consumer');
const results = {};
for (const scenario of ['dialog', 'named', 'unused']) {
  const source = join(directory, 'minimal-dialog', scenario); mkdirSync(source, { recursive: true });
  const output = join(directory, 'size-dialog', scenario); const entry = minimalDialogEntry(scenario);
  const transformed = await transformWithOxc(entry, 'main.ts');
  if (scenario === 'unused' && !/import\s*\{[^}]*ZDialog[^}]*\}\s*from/.test(transformed.code)) throw Error('TS transform removed Dialog before tree shaking');
  writeFileSync(join(source, 'main.ts'), entry);
  writeFileSync(join(source, 'index.html'), '<!doctype html><html lang="en"><head><title>Minimal Dialog</title></head><body><div id="app"></div><script type="module" src="./main.ts"></script></body></html>');
  const config = join(source, 'vite.config.mjs');
  writeFileSync(config, `import { defineConfig } from 'vite'; import { writeFileSync } from 'node:fs'; export default defineConfig({root:${JSON.stringify(source)},base:'/minimal-dialog/${scenario}/',build:{outDir:${JSON.stringify(output)},target:'es2022',emptyOutDir:true,sourcemap:false},plugins:[{name:'dialog-size-evidence',generateBundle(_options,bundle){const chunks=Object.values(bundle).filter(x=>x.type==='chunk').map(x=>({fileName:x.fileName,modules:Object.keys(x.modules),imports:x.imports,dynamicImports:x.dynamicImports,css:[...(x.viteMetadata?.importedCss??[])]}));writeFileSync(${JSON.stringify(join(source, 'graph.json'))},JSON.stringify({chunks,moduleIds:[...this.getModuleIds()]}));}}]});`);
  const build = () => { const result = runBin(directory, 'vite', 'vite', ['build', '--config', config], 'pipe'); if (result.status !== 0) throw Error(`${scenario}: Vite build failed\n${result.stdout}${result.stderr}`); };
  const read = () => {
    const graph = readJson(join(source, 'graph.json'));
    const emitted = graph.chunks.map(chunk => readFileSync(join(output, chunk.fileName), 'utf8')).join('\n');
    const css = [...new Set(graph.chunks.flatMap(chunk => chunk.css ?? []))].map(file => readFileSync(join(output, file), 'utf8'));
    return { graph, emitted, css };
  };
  build(); const initial = read();
  for (const id of initial.graph.moduleIds) {
    const normalized = id.replaceAll('\\', '/');
    if (/^(?:[A-Za-z]:\/|\/)/.test(normalized) && !inside(directory, id)) throw Error(`Dialog graph escaped consumer: ${id}`);
  }
  assertDialogSizeEvidence(initial.graph, initial.emitted, initial.css, scenario);
  let negative;
  if (scenario === 'unused') {
    try {
      writeFileSync(join(source, 'main.ts'), entry.replace('void ZDialog;', 'globalThis.__zoomRetainedDialog = ZDialog;')); build();
      const retained = read(); let rejected = false;
      try { assertDialogSizeEvidence(retained.graph, retained.emitted, retained.css, scenario); } catch (error) { if (!/retained Dialog/.test(error.message)) throw error; rejected = true; }
      if (!rejected) throw Error('Retained Dialog negative control falsely passed');
      negative = { rejected: true, sha256: sha256(retained.emitted) };
    } finally { writeFileSync(join(source, 'main.ts'), entry); build(); }
    const restored = read(); assertDialogSizeEvidence(restored.graph, restored.emitted, restored.css, scenario);
    if (sha256(restored.emitted) !== sha256(initial.emitted)) throw Error('Dialog output changed after restoring negative control');
    negative.restored = 'PASS';
  }
  const runtimeRoots = Object.fromEntries(['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared'].map(name => [name, [...new Set(initial.graph.moduleIds.flatMap(id => { const normalized = id.replaceAll('\\', '/'); const marker = `/node_modules/${name}/`; const index = normalized.lastIndexOf(marker); return index < 0 ? [] : [normalized.slice(0, index + marker.length - 1)]; }))]]));
  if (scenario !== 'unused' && Object.values(runtimeRoots).some(roots => roots.length !== 1)) throw Error(`${scenario}: Vue must resolve exactly once`);
  results[scenario] = { entry, transformedEntry: transformed.code, output, graph: initial.graph, runtimeRoots, finalOutputSha256: sha256(initial.emitted), ...(negative ? { negative } : {}), ...measureReferencedAssets(output, readFileSync(join(output, 'index.html'), 'utf8').replaceAll(`/minimal-dialog/${scenario}/`, '/'), initial.graph.chunks) };
}
const report = { scenario: 'Minimal Dialog subpath / root named / unused import', baselineKind: 'product-dialog', target: 'Own Vite production ES2022; independent HTML/TS entries', versions: { node: process.version, tools: spec.tools, runtimes: spec.runtimes }, compression: 'Per-file default Node zlib gzip/Brotli, references deduplicated', includes: ['Vue runtime in mounted scenarios', 'Core/DOM Dialog dependencies', 'Dialog CSS only'], excludes: ['Button/Select/Combobox implementation/CSS', 'aggregate CSS', 'theme.css', 'playgrounds', 'SSR', 'source maps', 'other frameworks'], limitations: 'Absolute application totals; no equivalent-library comparison or saving claim', results };
mkdirSync(join(directory, 'reports'), { recursive: true }); writeFileSync(join(directory, 'reports/dialog-size.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([name, value]) => [name, value.total]))));
