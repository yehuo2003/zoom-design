export function validatePlatformPack(name, files) {
  const errors = [];
  for (const required of ['dist/index.js', 'dist/index.d.ts', 'README.md', 'package.json', 'LICENSE']) {
    if (!files.includes(required)) errors.push(`${name}: missing packed ${required}`);
  }
  for (const file of files) {
    if (!['package.json', 'README.md', 'LICENSE'].includes(file) && !file.startsWith('dist/')) errors.push(`${name}: unexpected packed file ${file}`);
    if (/test|fixture|\.s?css$/.test(file)) errors.push(`${name}: fixture/style leaked into pack: ${file}`);
  }
  return errors;
}
