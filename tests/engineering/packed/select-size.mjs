import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { runBin, readJson } from './run-local-bin.mjs';
import { inside, measureReferencedAssets, sha256 } from './pack-contracts.mjs';
import { minimalSelectEntry, assertSelectOnlyEvidence, assertUnusedSelectEvidence } from './select-size-contract.mjs';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(directory, 'package.json'));
const { transformWithOxc } = await import(pathToFileURL(require.resolve('vite')).href);
const spec = readJson(join(directory, '.pack-spec.json'));
if (spec.app !== 'vue') throw Error('Select size requires standalone Vue consumer');
const results = {};
for (const scenario of ['select', 'named', 'unused']) {
  const source = join(directory, 'minimal-select', scenario); mkdirSync(source, { recursive: true });
  const output = join(directory, 'size-select', scenario); const entry = minimalSelectEntry(scenario);
  const transformed = await transformWithOxc(entry, 'main.ts');
  if (scenario === 'unused' && !/import\s*\{[^}]*ZSelect[^}]*\}\s*from/.test(transformed.code)) throw Error('TS transform removed Select before tree shaking');
  writeFileSync(join(source, 'main.ts'), entry);
  writeFileSync(join(source, 'index.html'), '<!doctype html><html lang="en"><head><title>Minimal Select</title></head><body><div id="app"></div><script type="module" src="./main.ts"></script></body></html>');
  const config = join(source, 'vite.config.mjs');
  writeFileSync(config, `import { defineConfig } from 'vite'; import { writeFileSync } from 'node:fs'; export default defineConfig({root:${JSON.stringify(source)},base:'/minimal-select/${scenario}/',build:{outDir:${JSON.stringify(output)},target:'es2022',emptyOutDir:true,sourcemap:false},plugins:[{name:'select-size-evidence',generateBundle(_options,bundle){const chunks=Object.values(bundle).filter(x=>x.type==='chunk').map(x=>({fileName:x.fileName,modules:Object.keys(x.modules),imports:x.imports,dynamicImports:x.dynamicImports,css:[...(x.viteMetadata?.importedCss??[])]}));writeFileSync(${JSON.stringify(join(source, 'graph.json'))},JSON.stringify({chunks,moduleIds:[...this.getModuleIds()]}));}}]});`);
  const build = () => { const result = runBin(directory, 'vite', 'vite', ['build', '--config', config], 'pipe'); if (result.status !== 0) throw Error(`${scenario}: Vite build failed\n${result.stdout}${result.stderr}`); };
  const read = () => { const graph = readJson(join(source, 'graph.json')); return { graph, emitted: graph.chunks.map(chunk => readFileSync(join(output, chunk.fileName), 'utf8')).join('\n') }; };
  build(); const { graph, emitted } = read();
  for (const id of graph.moduleIds) {
    const normalized = id.replaceAll('\\', '/');
    if (/^(?:[A-Za-z]:\/|\/)/.test(normalized) && !inside(directory, id)) throw Error(`Select graph escaped consumer: ${id}`);
    if (/Examples|ProbeHost|BuildProbe|server-renderer|compiler-(?:sfc|dom|core)|\/node_modules\/(?:@zoom-design\/(?:react|angular)|react(?:-dom)?|@angular|sass|typescript)\//.test(normalized)) throw Error(`Foreign module in minimal Select graph: ${id}`);
  }
  const check = scenario === 'unused' ? assertUnusedSelectEvidence : assertSelectOnlyEvidence;
  check(graph, emitted);
  for (const chunk of graph.chunks) for (const css of chunk.css ?? []) {
    const text = readFileSync(join(output, css), 'utf8');
    if (!/zoom-select/.test(text) || /zoom-button|zoom-engineering|:root/.test(text)) throw Error('Select scenario must reference Select-only CSS');
  }
  let negative;
  if (scenario === 'unused') {
    try {
      writeFileSync(join(source, 'main.ts'), entry.replace('void ZSelect;', 'globalThis.__zoomRetainedSelect = ZSelect;')); build();
      const retained = read(); let rejected = false;
      try { check(retained.graph, retained.emitted); } catch (error) { if (!/retained Select/.test(error.message)) throw error; rejected = true; }
      if (!rejected) throw Error('Retained Select negative control falsely passed');
      negative = { rejected: true, sha256: sha256(retained.emitted) };
    } finally { writeFileSync(join(source, 'main.ts'), entry); build(); }
    const restored = read(); check(restored.graph, restored.emitted);
    if (sha256(restored.emitted) !== sha256(emitted)) throw Error('Select output changed after restoring negative control');
    negative.restored = 'PASS';
  }
  const runtimeRoots = Object.fromEntries(['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared'].map(name => [name, [...new Set(graph.moduleIds.flatMap(id => { const normalized = id.replaceAll('\\', '/'); const marker = `/node_modules/${name}/`; const index = normalized.lastIndexOf(marker); return index < 0 ? [] : [normalized.slice(0, index + marker.length - 1)]; }))]]));
  if (scenario !== 'unused' && Object.values(runtimeRoots).some(roots => roots.length !== 1)) throw Error(`${scenario}: Vue must resolve exactly once`);
  results[scenario] = { entry, transformedEntry: transformed.code, output, graph, runtimeRoots, finalOutputSha256: sha256(emitted), buttonExcluded: !/zoom-button|ZButton/.test(emitted), ...(negative ? { negative } : {}), ...measureReferencedAssets(output, readFileSync(join(output, 'index.html'), 'utf8').replaceAll(`/minimal-select/${scenario}/`, '/'), graph.chunks) };
}
const report = { scenario: 'Minimal Select subpath / root named / unused import', baselineKind: 'product-select', target: 'Own Vite production ES2022; independent HTML/TS entries', versions: { node: process.version, tools: spec.tools, runtimes: spec.runtimes }, compression: 'Per-file default Node zlib gzip/Brotli, references deduplicated', includes: ['Vue runtime in mounted scenarios', 'Core/DOM selection dependencies', 'Select CSS only'], excludes: ['Button implementation/CSS', 'aggregate CSS', 'theme.css', 'playgrounds', 'SSR', 'source maps', 'other frameworks'], limitations: 'Absolute application totals, no equivalent-library comparison or saving claim', results };
mkdirSync(join(directory, 'reports'), { recursive: true }); writeFileSync(join(directory, 'reports/select-size.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([name, value]) => [name, value.total]))));
