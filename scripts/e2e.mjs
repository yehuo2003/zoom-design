import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { parseArgs, runBin } from './run-local-bin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { options, args } = parseArgs(process.argv.slice(2), ['--mode', '--package', '--browser']);
const names = ['core', 'dom', 'vue', 'react', 'angular'];
if (args.length || options['--mode'] !== 'workspace' || options['--browser'] !== 'chromium' || (options['--package'] && ![...names, 'platform'].includes(options['--package']))) throw Error('Expected --mode workspace --browser chromium [--package core|dom|platform|vue|react|angular]');
const requested = options['--package'];
const targets = requested === 'platform' ? ['core', 'dom'] : requested ? [requested] : names;
const commands = [];
if (targets.some(name => ['core', 'dom'].includes(name))) commands.push([join(root, 'scripts/build-platform.mjs'), 'dom']);
for (const name of targets.filter(name => ['vue', 'react'].includes(name))) commands.push([join(root, 'scripts/build-framework.mjs'), name]);
if (targets.includes('angular')) commands.push([join(root, 'scripts/build-angular.mjs')]);
for (const command of commands) {
  const build = spawnSync(process.execPath, command, { cwd: root, stdio: 'inherit', shell: false });
  if (build.error) throw build.error;
  if (build.status !== 0) { process.exitCode = build.status ?? 1; break; }
}
if (!process.exitCode && targets.includes('angular')) {
  const appBuild = runBin(join(root, 'apps/angular-smoke'), '@angular/cli', 'ng', ['build', 'angular-smoke']);
  if (appBuild.status !== 0) process.exitCode = appBuild.status ?? 1;
}
if (!process.exitCode) {
  process.env.ZOOM_SMOKE_RUN_ID = randomUUID();
  process.env.ZOOM_SMOKE_PACKAGE = requested ?? 'all';
  const cliArgs = ['test', '--config', join(root, 'playwright.config.ts')];
  if (requested === 'platform') cliArgs.push('--project', 'core-chromium', '--project', 'dom-chromium');
  else if (requested) cliArgs.push('--project', `${requested}-chromium`);
  const result = runBin(root, '@playwright/test', 'playwright', cliArgs);
  process.exitCode = result.status ?? 1;
}
