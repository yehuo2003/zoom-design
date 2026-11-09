import { it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { checkDialogDocs, readDialogDocument } from '../../scripts/check-dialog-docs.mjs';
it('T11.16 all five documented Select Vue examples compile against the real public declarations and all tokens exist in CSS', () => {
  const result = spawnSync(process.execPath, ['scripts/check-select-docs.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
  expect(result.stdout + result.stderr).toContain('five actual Vue examples strict-compiled'); expect(result.status).toBe(0);
});
it('T12 all five documented Combobox Vue examples compile against real public declarations and all tokens exist in CSS', () => {
  const result = spawnSync(process.execPath, ['scripts/check-combobox-docs.mjs'], { cwd: process.cwd(), encoding: 'utf8' });
  expect(result.stdout + result.stderr).toContain('five actual Vue examples strict-compiled'); expect(result.status).toBe(0);
});

it('T13.11.1 six complete Vue SFCs strictly compile using emitted public declarations', () => {
  expect(checkDialogDocs()).toMatchObject({ examples: 6, variables: 22 });
});
it('T13.11.2 documents every public prop and Boolean default from the implementation', () => {
  const source = readDialogDocument();
  for (const [name, value] of Object.entries({ open: 'false', modal: 'true', closeOnEscape: 'true', closeOnOutside: 'true', restoreFocus: 'true', portal: 'false' })) expect(source).toContain(`| \`${name}\` | \`boolean\` | \`${value}\` |`);
  expect(source).toContain('`open` 缺省为 `false`，并且始终受控');
});
it('T13.11.3 keeps a rejected close controlled and records the synchronous event order', () => {
  const source = readDialogDocument();
  expect(source).toContain('if (allowClose.value) open.value = next;');
  expect(source).toContain('同步先发 `update:open(false)`，再发 `close-request(details)`');
  expect(source).not.toMatch(/<ZDialog[^>]*v-model(?::open)?="open"/);
});
it('T13.11.4 names five public slots, the single expose method and native attribute targets', () => {
  const source = readDialogDocument();
  for (const name of ['default', 'title', 'description', 'footer', 'close']) expect(source).toContain(`| \`${name}\` |`);
  expect(source).toContain('`focus(options?: FocusOptions): void`');
  expect(source).toContain('overlay root');
  expect(source).toContain('`role="dialog"` 的 panel');
});
it('T13.11.5 matches all 22 CSS variables and fallback chains to built CSS', () => {
  const source = readDialogDocument();
  expect(source).toContain('## 主题与 22 个 CSS 变量');
  expect(source).toContain('| `--zoom-dialog-font-family` | `--zoom-font-family` → Sass 默认字体 |');
  expect(source).toContain('| `--zoom-dialog-focus-color` | `--zoom-color-focus` → `--zoom-color-primary` → `#2563eb` |');
});
it('T13.11.6 distinguishes implemented Vue from unavailable React and Angular plans', () => {
  const source = readDialogDocument();
  expect(source).toContain('| Vue 3 | 已实现 |');
  expect(source).toContain('| React | 规划，当前不可用 |');
  expect(source).toContain('| Angular | 规划，当前不可用 |');
  expect(source).toContain('不是可安装的 import 或可运行示例');
  expect(source).toContain('不是现有 selector 或可编译模板');
});
it('T13.11.7 SSR, portal and form examples use explicit host and form owner', () => {
  const source = readDialogDocument();
  expect(source).toContain('form="dialog-filter-form"');
  expect(source).toContain(':get-container="getHost"');
  expect(source).toContain('setup 不访问 `document`');
  expect(source).toContain('服务器与客户端首帧必须提供相同的 `initialOpen`、`dialogId`');
});
it('T13.11.8 rejects a wrong example API and CSS variable, then rechecks the original', () => {
  const source = readDialogDocument();
  expect(() => checkDialogDocs(source.replace('dialog?.focus({ preventScroll: true })', 'dialog?.missingMethod({ preventScroll: true })'))).toThrow(/fail strict public declaration compilation/);
  expect(() => checkDialogDocs(source.replace('| `--zoom-dialog-inline-size` |', '| `--zoom-dialog-nonexistent` |'))).toThrow(/CSS variables table mismatch/);
  expect(checkDialogDocs(source)).toMatchObject({ examples: 6, variables: 22 });
});
