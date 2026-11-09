import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const documentPath = join(root, 'docs/components/dialog.md');
const artifact = join(root, '.artifacts/task13/docs');

export function readDialogDocument() {
  let source = readFileSync(documentPath, 'utf8');
  if (source.startsWith('%TSD-Header') && process.platform === 'win32') {
    const command = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); Get-Content -LiteralPath '${documentPath.replaceAll("'", "''")}' -Raw -Encoding utf8`;
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(command, 'utf16le').toString('base64')], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw Error(`Cannot read Dialog documentation: ${result.stderr}`);
    source = result.stdout;
  }
  if (source.includes('%TSD-Header')) throw Error('Cannot validate encrypted Dialog documentation');
  return source;
}

function section(source, heading) {
  const start = source.indexOf(`## ${heading}\n`);
  if (start < 0) throw Error(`Missing Dialog documentation section: ${heading}`);
  const next = source.indexOf('\n## ', start + 4);
  return source.slice(start, next < 0 ? undefined : next);
}

function tableRows(body) {
  return body.split(/\r?\n/).filter(line => line.startsWith('| `')).map(line => {
    const cells = line.slice(1, -1).split(/(?<!\\)\|/).map(cell => cell.trim().replaceAll('\\|', '|'));
    return [cells[0].replaceAll('`', ''), ...cells.slice(1)];
  });
}

function exactRows(body, expected, label) {
  const rows = tableRows(body);
  const actual = rows.map(row => row[0]);
  if (JSON.stringify(actual.sort()) !== JSON.stringify([...expected].sort())) throw Error(`${label} table mismatch: ${actual.join(', ')}`);
  return new Map(rows.map(row => [row[0], row]));
}

function variableCall(line, name) {
  const start = line.indexOf(`var(${name},`);
  if (start < 0) return '';
  let depth = 0;
  for (let index = start; index < line.length; index++) {
    if (line[index] === '(') depth++;
    else if (line[index] === ')' && --depth === 0) return line.slice(start, index + 1);
  }
  return '';
}

function compile(examples) {
  mkdirSync(artifact, { recursive: true });
  for (const [index, example] of examples.entries()) writeFileSync(join(artifact, `example-${index + 1}.vue`), example);
  writeFileSync(join(artifact, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', lib: ['ES2022', 'DOM'], types: ['vite/client'], skipLibCheck: false, noEmit: true }, vueCompilerOptions: { strictTemplates: true, dataAttributes: ['data-*'] }, files: examples.map((_item, index) => `example-${index + 1}.vue`) }, null, 2));
  const run = args => spawnSync(process.execPath, ['scripts/run-vue-tsc.mjs', '--workspace', 'packages/vue', '--', '-p', join(artifact, 'tsconfig.json'), ...args], { cwd: root, encoding: 'utf8' });
  const result = run([]);
  if (result.status !== 0) throw Error(`Dialog examples fail strict public declaration compilation:\n${result.stdout}${result.stderr}`);
  const listed = run(['--listFilesOnly']);
  if (listed.status !== 0) throw Error(`Cannot inspect Dialog declaration resolution:\n${listed.stdout}${listed.stderr}`);
  const files = listed.stdout.replaceAll('\\', '/').split(/\r?\n/).filter(Boolean);
  for (const suffix of ['/packages/vue/dist/types/dialog/index.d.ts', '/packages/vue/dist/types/dialog/Dialog.vue.d.ts', '/packages/core/dist/dialog/types.d.ts']) {
    if (!files.some(file => file.endsWith(suffix))) throw Error(`Dialog examples did not load actual public declaration ${suffix}`);
  }
  if (files.some(file => /\/packages\/(?:vue|core|dom)\/src\//.test(file))) throw Error('Dialog examples resolved product source instead of declarations');
}

export function checkDialogDocs(source = readDialogDocument()) {
  const examples = [...source.matchAll(/^```vue\r?\n([\s\S]*?)^```/gm)].map(match => match[1]);
  if (examples.length !== 6) throw Error(`Expected six complete Dialog Vue SFCs, found ${examples.length}`);
  for (const [index, example] of examples.entries()) {
    if (!/<script setup lang="ts">/.test(example) || !/<template>/.test(example) || /@ts-(?:ignore|nocheck|expect-error)|\bany\b|\.\.\/.*(?:src|dist)|from\s*['"](?:@zoom-design\/(?:react|angular)|\.\/)/.test(example)) throw Error(`Example ${index + 1} bypasses or does not use public Vue types`);
    if (!/from ['"]@zoom-design\/vue(?:\/dialog)?['"]/.test(example)) throw Error(`Example ${index + 1} has no public Dialog import`);
  }
  if (!examples[1].includes(':open="open"') || /v-model(?::open)?="open"/.test(examples[1]) || !examples[1].includes('if (allowClose.value) open.value = next') || !examples[1].includes('@close-request="onRequest"')) throw Error('Controlled rejection example changed its request boundary');
  if (!examples[3].includes('form="dialog-filter-form"') || !examples[3].includes(':get-container="getHost"') || !examples[3].includes(':get-popup-container="getHost"')) throw Error('Nested selection/form portal example lost explicit owners');
  if (/\bdocument\b|\bwindow\b/.test(examples[5].split('</script>')[0]) || !examples[5].includes(':id="dialogId"') || !examples[5].includes(':open="open"')) throw Error('SSR example must use stable request inputs without setup DOM access');

  const types = readFileSync(join(root, 'packages/vue/src/dialog/types.ts'), 'utf8');
  const normalize = readFileSync(join(root, 'packages/vue/src/dialog/normalize.ts'), 'utf8');
  const component = readFileSync(join(root, 'packages/vue/src/dialog/Dialog.vue'), 'utf8');
  const parameters = ['open', 'modal', 'closeOnEscape', 'closeOnOutside', 'restoreFocus', 'initialFocus', 'returnFocus', 'portal', 'getContainer', 'closeLabel', 'id', 'aria-label', 'aria-labelledby', 'aria-describedby', 'panelAttrs', 'class', 'style', 'data-*'];
  const parameterRows = exactRows(section(source, '参数与默认值'), parameters, 'Dialog parameters');
  for (const name of parameters.filter(name => !['aria-label', 'aria-labelledby', 'aria-describedby', 'data-*'].includes(name))) if (!new RegExp(`\\b${name}\\??:`).test(types)) throw Error(`Documented parameter absent from public DialogProps: ${name}`);
  for (const name of ['aria-label', 'aria-labelledby', 'aria-describedby']) if (!types.includes(`'${name}'`)) throw Error(`Documented ARIA parameter absent from public types: ${name}`);
  if (!types.includes('[attribute: `data-${string}`]')) throw Error('Public Dialog data-* type missing');
  const defaults = { open: 'false', modal: 'true', closeOnEscape: 'true', closeOnOutside: 'true', restoreFocus: 'true', portal: 'false', closeLabel: '关闭' };
  for (const [name, value] of Object.entries(defaults)) {
    if (parameterRows.get(name)?.[2] !== `\`${value}\``) throw Error(`Dialog documented default mismatch: ${name}`);
    if (name === 'closeLabel' ? !normalize.includes(`: '${value}'`) : !new RegExp(`(?:${name}: ${value}|bool\\('${name}', ${value}\\))`).test(component + normalize)) throw Error(`Dialog implementation default mismatch: ${name}`);
  }
  for (const name of parameters.filter(name => !(name in defaults))) if (parameterRows.get(name)?.[2] !== '`undefined`') throw Error(`Dialog documented default mismatch: ${name}`);
  const events = exactRows(section(source, '事件、slots 与实例方法'), ['update:open', 'close-request', 'default', 'title', 'description', 'footer', 'close'], 'Dialog events/slots');
  for (const name of ['update:open', 'close-request']) if (!types.includes(`'${name}'`) || !events.has(name)) throw Error(`Missing public Dialog event ${name}`);
  for (const name of ['default', 'title', 'description', 'footer', 'close']) if (!new RegExp(`\\b${name}\\?\\(`).test(types)) throw Error(`Missing public Dialog slot ${name}`);
  if (!types.includes('focus(options?: FocusOptions): void') || !section(source, '事件、slots 与实例方法').includes('`focus(options?: FocusOptions): void`')) throw Error('Dialog public expose mismatch');
  if (!source.includes('`update:open(false)`，再发 `close-request(details)`') && !source.includes('先发 `update:open(false)`，再发 `close-request(details)`')) throw Error('Dialog close event order missing');

  const scss = readFileSync(join(root, 'packages/vue/src/dialog/style.scss'), 'utf8');
  const css = readFileSync(join(root, 'packages/vue/dist/dialog/style.css'), 'utf8');
  const actualVariables = [...new Set([...scss.matchAll(/--zoom-dialog-[a-z-]+/g)].map(match => match[0]))];
  if (actualVariables.length !== 22) throw Error(`Dialog SCSS variable count changed: ${actualVariables.length}`);
  const variableRows = exactRows(section(source, '主题与 22 个 CSS 变量'), actualVariables, 'Dialog CSS variables');
  for (const name of actualVariables) {
    if (!css.includes(name)) throw Error(`Built Dialog CSS lacks ${name}`);
    const line = scss.split(/\r?\n/).find(row => row.includes(`var(${name},`));
    const fallback = variableRows.get(name)?.[1] ?? '';
    if (!line || !fallback) throw Error(`Missing Dialog fallback documentation: ${name}`);
    const expression = variableCall(line, name);
    for (const shared of [...expression.matchAll(/--(?:_zoom|zoom)-(?!dialog-)[a-z-]+/g)].map(match => match[0])) if (!fallback.includes(shared)) throw Error(`Dialog fallback chain mismatch: ${name} -> ${shared}`);
    for (const literal of [...expression.matchAll(/#[0-9a-f]{3,8}|(?:\d*\.\d+|\d+)(?:dvh|vh|rem|px|%)?|rgb\([^)]*\)/g)].map(match => match[0])) if (!fallback.includes(literal)) throw Error(`Dialog fallback default mismatch: ${name} -> ${literal}`);
    if (name === '--zoom-dialog-font-family' && (!expression.includes('meta.inspect(defaults.$font-family)') || !fallback.includes('Sass 默认字体'))) throw Error('Dialog font fallback mismatch');
  }
  const status = section(source, '框架与验证状态');
  if (!/Vue 3 \| 已实现/.test(status) || !/React \| 规划，当前不可用/.test(status) || !/Angular \| 规划，当前不可用/.test(status) || !source.includes('不是可安装的 import 或可运行示例') || !source.includes('不是现有 selector 或可编译模板')) throw Error('Dialog framework availability text mismatch');
  compile(examples);
  return { examples: examples.length, variables: actualVariables.length, artifact };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = checkDialogDocs();
    console.log(`Dialog documentation: ${result.examples} actual Vue examples strict-compiled against public declarations; ${result.variables} CSS variables verified`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
