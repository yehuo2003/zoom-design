import { expect, it } from 'vitest';
import * as sass from 'sass';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { compilePackageStyles } from '../../scripts/build-styles.mjs';

it('T7.23/T7.30 keeps defaults in Sass fallbacks and public overrides undeclared', () => {
  const css = sass.compile('packages/vue/src/button/style.scss').css;
  expect(css).toContain('var(--zoom-color-primary, #2563eb)');
  expect(css).not.toMatch(/(?:^|[;{]\s*)--zoom-button-[a-z-]+\s*:/m);
  expect(css).not.toMatch(/(?:^|\n)(?:html|body|button|input)\s*\{/);
  expect(css).toContain('prefers-reduced-motion'); expect(css).toContain(':focus-visible'); expect(css).not.toContain('outline: none');
});
it('T7.30 invalid Button SCSS invalidates its whole required CSS/Sass group', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'zoom-button-style-'));
  try {
    cpSync('design', join(temporary, 'design'), { recursive: true }); cpSync('packages/vue/src', join(temporary, 'packages/vue/src'), { recursive: true });
    const outputs = compilePackageStyles('vue', { rootDirectory: temporary }); expect(outputs.every(existsSync)).toBe(true);
    writeFileSync(join(temporary, 'packages/vue/src/button/style.scss'), '@error "Button failure control";');
    expect(() => compilePackageStyles('vue', { rootDirectory: temporary })).toThrow(/Button failure control/);
    expect(outputs.some(existsSync)).toBe(false);
    cpSync('packages/vue/src/button/style.scss', join(temporary, 'packages/vue/src/button/style.scss'));
    expect(compilePackageStyles('vue', { rootDirectory: temporary }).every(existsSync)).toBe(true);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
