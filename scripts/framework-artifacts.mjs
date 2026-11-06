import { rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const common = ['index.js', 'types/index.d.ts', 'style.css', 'theme.css', 'styles/theme/_index.scss'];
const vue = [
  'button/index.js', 'types/button/index.d.ts', 'button/style.css',
  'select/index.js', 'types/select/index.d.ts', 'types/select/Select.vue.d.ts', 'select/style.css',
  'combobox/index.js', 'types/combobox/index.d.ts', 'types/combobox/Combobox.vue.d.ts', 'combobox/style.css',
  'dialog/index.js', 'types/dialog/index.d.ts', 'types/dialog/Dialog.vue.d.ts', 'dialog/style.css',
];

export function requiredFrameworkFiles(name) {
  if (!['vue', 'react'].includes(name)) throw Error(`Unknown framework ${name}`);
  return name === 'vue' ? [...common, ...vue] : [...common];
}

export function assertFrameworkArtifacts(name, output) {
  for (const file of requiredFrameworkFiles(name)) {
    let valid = false;
    try { valid = statSync(join(output, file)).isFile(); } catch { /* Missing output. */ }
    if (!valid) throw Error(`${name}: missing built ${file}`);
  }
}

export function runFrameworkBuild(name, output, buildSteps) {
  try {
    rmSync(output, { recursive: true, force: true });
    buildSteps();
    assertFrameworkArtifacts(name, output);
  } catch (error) {
    rmSync(output, { recursive: true, force: true });
    throw error;
  }
}
