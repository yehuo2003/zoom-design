import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { packagePath } from './run-local-bin.mjs';
import { root, selectedPackages } from './workspace.mjs';

const normalized = path => resolve(path).replaceAll('\\', '/');
const compilerPath = packagePath(join(root, 'packages/vue'), 'typescript');
const ts = createRequire(compilerPath)('typescript');
function classifySource(file) {
  if (file.endsWith('.vue')) return { executable: true };
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true }, fileName: file }).outputText;
  const ast = ts.createSourceFile(file + '.js', output, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const executable = ast.statements.some(statement => !ts.isEmptyStatement(statement) && !ts.isExportDeclaration(statement));
  return { executable, emitted: output, statements: ast.statements.map(statement => ts.SyntaxKind[statement.kind]) };
}
function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? sourceFiles(join(directory, entry.name)) : /\.(ts|tsx|vue|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [join(directory, entry.name)] : []);
}
function metrics(entries) {
  const values = { statements: [], functions: [], branches: [], lines: [] };
  for (const item of entries) {
    values.statements.push(...Object.values(item.s)); values.functions.push(...Object.values(item.f)); values.branches.push(...Object.values(item.b).flat());
    const lines = new Map();
    for (const [key, count] of Object.entries(item.s)) {
      const line = item.statementMap[key].start.line;
      lines.set(line, Math.max(lines.get(line) ?? 0, count));
    }
    values.lines.push(...lines.values());
  }
  return Object.fromEntries(Object.entries(values).map(([key, counts]) => {
    const covered = counts.filter(count => count > 0).length;
    return [key, { covered, total: counts.length, percent: counts.length ? covered * 100 / counts.length : 100 }];
  }));
}
export function classifyCoverage(name, coverage, workspaceRoot = root) {
  selectedPackages(name);
  const packageRoot = normalized(join(workspaceRoot, 'packages', name));
  const classification = sourceFiles(join(packageRoot, 'src')).map(file => ({ file: normalized(file), ...classifySource(file) }));
  const sources = classification.filter(item => item.executable).map(item => item.file);
  const production = {}; const probes = {};
  for (const [file, data] of Object.entries(coverage)) {
    const path = normalized(file);
    if (sources.includes(path)) production[path] = data;
    if (path.startsWith(`${packageRoot}/test/fixtures/`)) probes[path] = data;
  }
  const productionMetrics = metrics(Object.values(production));
  const perFile = Object.fromEntries(Object.entries(production).map(([file, data]) => [file, metrics([data])]));
  if (sources.length) {
    for (const file of sources) if (!production[normalized(file)]) throw Error(`${name}: production source has no coverage: ${file}`);
    for (const [metric, value] of Object.entries(productionMetrics)) if (value.percent < 80) throw Error(`${name}: production ${metric} ${value.percent}% is below 80%`);
    if (name === 'dom') for (const [file, values] of Object.entries(perFile)) for (const [metric, value] of Object.entries(values)) if (value.percent < 80) throw Error(`${name}: production file ${file} ${metric} ${value.percent}% is below 80%`);
  }
  if (!Object.keys(probes).length) throw Error(`${name}: private engineering probe coverage missing`);
  return {
    package: name,
    production: { status: sources.length ? 'PASS' : 'N/A', threshold: 80, reason: sources.length ? 'Production logic measured separately' : 'Only erased types or barrels; no executable production logic', files: sources.length ? Object.keys(production) : [], metrics: sources.length ? productionMetrics : null, perFile, classification: { compiler: { path: compilerPath, version: ts.version }, excluded: classification.filter(item => !item.executable) } },
    probes: { scope: 'Private engineering fixtures only; no product coverage claim', files: Object.keys(probes), metrics: metrics(Object.values(probes)) },
    maps: { production, probes },
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    for (const name of process.argv.slice(2)) {
      const file = name === 'angular' ? join(root, 'packages/angular/coverage/zoom-angular/coverage-final.json') : join(root, '.artifacts/task4/coverage/raw/coverage-final.json');
      const { maps, ...summary } = classifyCoverage(name, JSON.parse(readFileSync(file, 'utf8')));
      const directory = join(root, '.artifacts/task4/coverage', name); mkdirSync(directory, { recursive: true });
      for (const [kind, data] of Object.entries(maps)) writeFileSync(join(directory, `${kind}.json`), JSON.stringify(data, null, 2) + '\n');
      writeFileSync(join(directory, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
      console.log(`${name}: production=${summary.production.status}, private probes recorded separately`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
