import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { runBin, readJson } from './run-local-bin.mjs';
import { inside, measureReferencedAssets, sha256 } from './pack-contracts.mjs';
import { minimalButtonEntry, assertUnusedButtonEvidence } from './button-size-contract.mjs';

// Copied into the external Vue consumer; every compiler/runtime resolves locally.
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(directory, 'package.json'));
const { transformWithOxc } = await import(pathToFileURL(require.resolve('vite')).href);
const spec = readJson(join(directory, '.pack-spec.json'));
if (spec.app !== 'vue') throw Error('Button size requires the standalone Vue consumer');
const results = {};
for (const scenario of ['button', 'named', 'unused']) {
  const source = join(directory, 'minimal', scenario); mkdirSync(source, { recursive: true });
  const output = join(directory, 'size', scenario);
  const entry = minimalButtonEntry(scenario);
  const transformed = await transformWithOxc(entry, 'main.ts');
  if (scenario === 'unused' && !/import\s*\{[^}]*ZButton[^}]*\}\s*from\s*["']@zoom-design\/vue["']/.test(transformed.code)) throw Error('TS conversion removed Button before tree shaking');
  writeFileSync(join(source, 'main.ts'), entry);
  writeFileSync(join(source, 'index.html'), '<!doctype html><html lang="en"><head><title>Minimal Button</title></head><body><button id="native">Native host</button><div id="app"></div><output>0</output><script type="module" src="./main.ts"></script></body></html>');
  const config = join(source, 'vite.config.mjs');
  writeFileSync(config, `import { defineConfig } from 'vite';\nimport { mkdirSync, writeFileSync } from 'node:fs';\nexport default defineConfig({root:${JSON.stringify(source)}, base:'/minimal/${scenario}/', build:{outDir:${JSON.stringify(output)}, target:'es2022',emptyOutDir:true,sourcemap:false}, plugins:[{name:'minimal-button-evidence', generateBundle(_options,bundle){const chunks=Object.values(bundle).filter(x=>x.type==='chunk').map(x=>({fileName:x.fileName,modules:Object.keys(x.modules),imports:x.imports,dynamicImports:x.dynamicImports,css:[...(x.viteMetadata?.importedCss??[])]}));writeFileSync(${JSON.stringify(join(source, 'graph.json'))}, JSON.stringify({chunks,moduleIds:[...this.getModuleIds()]}));}}]});\n`);
  const build = () => { const result = runBin(directory, 'vite', 'vite', ['build', '--config', config], 'pipe'); if (result.status !== 0) throw Error(`${scenario}: own Vite failed\n${result.stdout}${result.stderr}`); };
  build();
  const graph = readJson(join(source, 'graph.json'));
  for (const id of graph.moduleIds) {
    const normalized = id.replaceAll('\\', '/');
    if (/^(?:[A-Za-z]:\/|\/)/.test(normalized) && !inside(directory, id)) throw Error(`Minimal graph escaped consumer: ${id}`);
    if (/ThemeExamples|ProbeHost|BuildProbe|server-renderer|compiler-(?:sfc|dom|core)|\/node_modules\/(?:@zoom-design\/(?:react|angular)|react(?:-dom)?|@angular|sass|typescript)\//.test(normalized)) throw Error(`Foreign module in minimal Button graph: ${id}`);
  }
  const emitted = graph.chunks.map(chunk => readFileSync(join(output, chunk.fileName), 'utf8')).join('\n');
  if (scenario === 'unused') assertUnusedButtonEvidence(graph, emitted);
  else if (!/zoom-button/.test(emitted)) throw Error(`${scenario}: final emitted Button implementation evidence failed`);
  let negative;
  if (scenario === 'unused') {
    try {
      writeFileSync(join(source, 'main.ts'), entry.replace('void ZButton;', 'globalThis.__zoomRetainedButton = ZButton;')); build();
      const retainedGraph = readJson(join(source, 'graph.json'));
      const retained = retainedGraph.chunks.map(chunk => readFileSync(join(output, chunk.fileName), 'utf8')).join('\n');
      let rejected = false; try { assertUnusedButtonEvidence(retainedGraph, retained); } catch (error) { if (!/retained Button/.test(error.message)) throw error; rejected = true; }
      if (!rejected) throw Error('Retained Button implementation negative control falsely passed');
      negative = { name: 'retained-button-implementation', rejected: true, bytes: Buffer.byteLength(retained), sha256: sha256(retained) };
    } finally { writeFileSync(join(source, 'main.ts'), entry); build(); }
    const restoredGraph = readJson(join(source, 'graph.json'));
    const restored = restoredGraph.chunks.map(chunk => readFileSync(join(output, chunk.fileName), 'utf8')).join('\n');
    assertUnusedButtonEvidence(restoredGraph, restored);
    if (sha256(restored) !== sha256(emitted)) throw Error('Unused output differs after restoring negative control');
    negative.restored = 'PASS';
  }
  const families = ['vue', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared'];
  const runtimeRoots = Object.fromEntries(families.map(name => [name, [...new Set(graph.moduleIds.flatMap(id => { const value = id.replaceAll('\\', '/'); const marker = `/node_modules/${name}/`; const index = value.lastIndexOf(marker); return index < 0 ? [] : [value.slice(0, index + marker.length - 1)]; }))]]));
  if (scenario !== 'unused' && Object.values(runtimeRoots).some(roots => roots.length !== 1)) throw Error(`${scenario}: Vue must resolve exactly once`);
  const html = readFileSync(join(output, 'index.html'), 'utf8').replaceAll(`/minimal/${scenario}/`, '/');
  results[scenario] = { entry, transformedEntry: transformed.code, ...(negative ? { negative } : {}), css: scenario === 'unused' ? 'none' : '@zoom-design/vue/button/style.css only', output, finalOutputButtonPresent: /zoom-button/.test(emitted), finalOutputSha256: sha256(emitted), runtimeRoots, graph, ...measureReferencedAssets(output, html, graph.chunks) };
}
const report = { scenario: 'Minimal product Button: subpath / root named / unused import control', baselineKind: 'product-button', target: 'Own Vite production ES2022; each scenario has its own HTML/TS entry', versions: { node: process.version, tools: spec.tools, runtimes: spec.runtimes }, vite: require.resolve('vite'), compression: 'Per-file Node zlib default gzip/Brotli; shared references counted once', includes: ['Vue runtime for mounted scenarios', 'minimal app mount/click shell', 'Button CSS only for mounted scenarios'], excludes: ['theme.css', 'aggregate CSS', 'engineering/theme/Button playgrounds', 'SSR', 'source maps', 'unreferenced files', 'other frameworks'], limitations: 'Absolute application totals; no equivalent-library comparison or saving claim', results };
mkdirSync(join(directory, 'reports'), { recursive: true }); writeFileSync(join(directory, 'reports/button-size.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([name, result]) => [name, result.total]))));
