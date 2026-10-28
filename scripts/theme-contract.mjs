import { posix } from 'node:path';

export const themeFiles = Object.freeze(['_index.scss', '_defaults.scss', '_theme.scss', '_density.scss']);
export const styleEntries = Object.freeze([{ source: 'theme.scss', output: 'theme.css' }, { source: 'style.scss', output: 'style.css' }]);
export function themeContract(name) {
  if (!['vue', 'react', 'angular'].includes(name)) throw Error(`Unknown theme package ${name}`);
  const base = name === 'angular' ? 'styles' : 'dist';
  const directory = name === 'angular' ? 'styles/theme' : 'dist/styles/theme';
  return { css: `${base}/theme.css`, aggregate: `${base}/style.css`, directory, sass: `${directory}/_index.scss`, files: themeFiles.map(file => `${directory}/${file}`) };
}
export function inspectThemeFiles(files, name, manifest) {
  const contract = themeContract(name.split('/').pop());
  if (manifest.exports?.['./theme.css'] !== `./${contract.css}` || manifest.exports?.['./theme.scss']?.sass !== `./${contract.sass}` || manifest.exports?.['./theme.scss']?.default !== `./${contract.sass}`) throw Error(`${name}: exact theme CSS/Sass exports required`);
  for (const file of [contract.css, contract.aggregate, ...contract.files]) if (!files.has(file)) throw Error(`${name}: missing theme asset ${file}`);
  for (const file of contract.files) {
    const text = files.get(file).toString();
    for (const match of text.matchAll(/@(use|forward|import)\s+["']([^"']+)["']/g)) {
      const reference = match[2];
      if (reference.startsWith('sass:') && match[1] === 'use') continue;
      if (match[1] === 'import' || !/^(?:\.\/)?(?:_?index|_?defaults|_?theme|_?density)(?:\.scss)?$/.test(reference)) throw Error(`${name}: invalid Sass dependency reference ${reference} in ${file}`);
      const filename = reference.replace(/^\.\//, '').replace(/^_/, '').replace(/\.scss$/, '');
      const target = posix.join(contract.directory, `_${filename}.scss`);
      if (!files.has(target)) throw Error(`${name}: missing Sass dependency ${reference} in ${file}`);
    }
  }
  return contract.files;
}
