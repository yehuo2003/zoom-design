import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd(); const file = resolve(root, 'docs/components/select.md');
let source = readFileSync(file, 'utf8');
// Some Windows document-protection drivers expose encrypted Markdown to Node.
// Read the same local document through the OS text reader; never execute its text.
if (source.startsWith('%TSD-Header') && process.platform === 'win32') {
  const command = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); Get-Content -LiteralPath '${file.replaceAll("'", "''")}' -Raw -Encoding utf8`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw Error(`Cannot read Select documentation: ${result.stderr}`);
  source = result.stdout;
}
if (source.includes('%TSD-Header')) throw Error('Cannot validate encrypted document contents');
const examples = [...source.matchAll(/^```vue\r?\n([\s\S]*?)^```/gm)].map(match => match[1]);
if (examples.length !== 5) throw Error(`Expected five real Vue Select examples, found ${examples.length}`);
const directory = resolve(root, '.artifacts/task11/docs'); mkdirSync(directory, { recursive: true });
for (const [index, example] of examples.entries()) writeFileSync(join(directory, `example-${index + 1}.vue`), example);
writeFileSync(join(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM'], types: ['vite/client'], skipLibCheck: false, noEmit: true }, vueCompilerOptions: { strictTemplates: true, dataAttributes: ['data-*'] }, files: examples.map((_item, index) => `example-${index + 1}.vue`) }, null, 2));
const result = spawnSync(process.execPath, ['scripts/run-vue-tsc.mjs', '--workspace', 'packages/vue', '--', '-p', join(directory, 'tsconfig.json')], { cwd: root, encoding: 'utf8' });
if (result.status !== 0) throw Error(`Select documented examples fail strict compilation:\n${result.stdout}${result.stderr}`);
const tokens = ['font-family', 'font-size', 'line-height', 'radius', 'min-block-size', 'padding-inline', 'padding-block', 'gap', 'bg', 'fg', 'border-color', 'focus-color', 'popup-bg', 'popup-max-block-size', 'option-bg-hover', 'option-bg-selected', 'option-fg-selected', 'z-index'];
const css = readFileSync('packages/vue/dist/select/style.css', 'utf8');
for (const token of tokens) if (!source.includes(`--zoom-select-${token}`) || !css.includes(`--zoom-select-${token}`)) throw Error(`Missing documented/built Select token ${token}`);
console.log('Select documentation: five actual Vue examples strict-compiled; all18 public CSS tokens match built CSS');
