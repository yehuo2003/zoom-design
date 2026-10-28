import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function graphPlugin(server) {
  return { name: 'packed-consumer-evidence', generateBundle(_options, bundle) {
    const chunks = Object.values(bundle).filter(item => item.type === 'chunk').map(chunk => ({
      fileName: chunk.fileName, isEntry: chunk.isEntry, isDynamicEntry: chunk.isDynamicEntry,
      facadeModuleId: chunk.facadeModuleId, imports: chunk.imports, dynamicImports: chunk.dynamicImports,
      modules: Object.keys(chunk.modules), css: [...(chunk.viteMetadata?.importedCss ?? [])],
    }));
    const moduleIds = [...this.getModuleIds()];
    mkdirSync(resolve('reports'), { recursive: true });
    writeFileSync(resolve(`reports/graph-${server ? 'server' : 'browser'}.json`), JSON.stringify({ chunks, moduleIds }, null, 2) + '\n');
  } };
}
