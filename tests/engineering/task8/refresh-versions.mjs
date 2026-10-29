// Task8 audit tool: refresh official metadata without upgrading the toolchain.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import semver from 'semver';
const previous = JSON.parse(readFileSync('docs/engineering/versions-2026-10-27.json', 'utf8'));
previous.packages.push({ package: '@floating-ui/dom', selectedVersion: '1.8.0', workspace: 'packages/dom', source: 'https://registry.npmjs.org/@floating-ui/dom', reason: 'ADR-0001: shared positioning dependency; implementation belongs to Task10' });
const queries = new Map();
async function metadata(name) {
  if (!queries.has(name)) queries.set(name, (async () => {
    const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`${name}: HTTP ${response.status}`);
    return response.json();
  })());
  return queries.get(name);
}
const packages = [];
for (const old of previous.packages) {
  const manifest = JSON.parse(readFileSync(`${old.workspace}/package.json`, 'utf8'));
  old.selectedVersion = manifest.devDependencies?.[old.package] ?? manifest.dependencies?.[old.package];
  const data = await metadata(old.package);
  const selected = data.versions[old.selectedVersion];
  if (!selected || semver.prerelease(old.selectedVersion)) throw Error(`${old.package}: selected version not stable/published`);
  packages.push({ ...old, latestStable: data['dist-tags'].latest, publishedAt: data.time[old.selectedVersion],
    engines: selected.engines ?? {}, peers: selected.peerDependencies ?? {}, peerMeta: selected.peerDependenciesMeta ?? {},
    deprecated: selected.deprecated ?? null, license: selected.license, checkedAt: new Date().toISOString() });
}
const candidates = [];
for (const name of ['@floating-ui/dom', '@floating-ui/core', '@floating-ui/utils']) {
  const data = await metadata(name); const version = data['dist-tags'].latest; const selected = data.versions[version];
  candidates.push({ package: name, selectedVersion: version, latestStable: version, publishedAt: data.time[version],
    license: selected.license, engines: selected.engines ?? {}, peers: selected.peerDependencies ?? {},
    dependencies: selected.dependencies ?? {}, deprecated: selected.deprecated ?? null,
    unpackedSize: selected.dist.unpackedSize, source: `https://registry.npmjs.org/${name}`, checkedAt: new Date().toISOString() });
}
const npmData = await metadata('npm'); const npm = npmData.versions[previous.npm.selectedVersion];
const snapshot = { ...previous, checkedAt: new Date().toISOString(), packages,
  npm: { ...previous.npm, latestStable: npmData['dist-tags'].latest, publishedAt: npmData.time[npm.version], engines: npm.engines, checkedAt: new Date().toISOString() } };
writeFileSync('docs/engineering/versions-2026-10-29.json', JSON.stringify(snapshot, null, 2) + '\n');
mkdirSync('.artifacts/task8/current', { recursive: true });
writeFileSync('.artifacts/task8/current/floating-registry.json', JSON.stringify(candidates, null, 2) + '\n');
writeFileSync('docs/engineering/floating-ui-2026-10-29.json', JSON.stringify(candidates, null, 2) + '\n');
console.log(JSON.stringify({ checked: packages.length, drift: packages.filter(row => row.selectedVersion !== row.latestStable).map(row => ({ name: row.package, workspace: row.workspace, selected: row.selectedVersion, latest: row.latestStable })), candidates }, null, 2));
