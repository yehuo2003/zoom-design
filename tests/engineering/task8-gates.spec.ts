import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validatePublicationContract } from '../../scripts/check-toolchain.mjs';
import { validatePlatformPack } from '../../scripts/platform-contracts.mjs';

const license = readFileSync('LICENSE', 'utf8');
const published = { name: '@zoom-design/core', version: '0.0.0', private: false, author: 'linzhuming', license: 'MIT', publishConfig: { access: 'public' } };
const files = ['package.json', 'README.md', 'LICENSE', 'dist/index.js', 'dist/index.d.ts'];

describe('T8.13 publication boundaries', () => {
  it('accepts all five explicitly public packages and private root/apps', () => {
    for (const name of ['core', 'dom', 'vue', 'react', 'angular']) {
      expect(validatePublicationContract(`packages/${name}`, { ...published, name: `@zoom-design/${name}` }, license, license)).toEqual([]);
    }
    for (const workspace of ['.', 'apps/vue-smoke', 'apps/platform-smoke', 'apps/new-host']) {
      expect(validatePublicationContract(workspace, { private: true, version: '0.0.0' }, license, license)).toEqual([]);
      expect(validatePublicationContract(workspace, { private: false, version: '0.0.0' }, license, license).join()).toMatch(/private/);
    }
  });
  it.each([
    ['private', { private: true }], ['license', { license: 'UNLICENSED' }],
    ['author', { author: 'other' }], ['access', { publishConfig: { access: 'restricted' } }],
    ['version', { version: '1.0.0-rc.1' }], ['name', { name: '@other/core' }],
  ])('rejects changed public %s metadata', (_name, patch) => {
    expect(validatePublicationContract('packages/core', { ...published, ...patch }, license, license).length).toBeGreaterThan(0);
  });
  it('rejects missing, truncated, substituted and wrong-owner MIT text', () => {
    for (const text of ['', 'MIT License', license.replace('linzhuming', 'other'), license.replace('Permission is hereby granted', 'Permission denied')]) {
      expect(validatePublicationContract('packages/core', published, text, license).join()).toMatch(/LICENSE/);
    }
    expect(validatePublicationContract('.', { private: true, version: '0.0.0' }, 'MIT License', 'MIT License').join()).toMatch(/LICENSE/);
  });
});

describe('T8.13 Core/DOM pack content', () => {
  it('requires and allows the npm included LICENSE', () => expect(validatePlatformPack('core', files)).toEqual([]));
  it.each(['LICENSE', 'dist/index.js', 'dist/index.d.ts', 'README.md', 'package.json'])('rejects missing %s', file => {
    expect(validatePlatformPack('core', files.filter(item => item !== file)).join()).toContain(file);
  });
  it.each(['src/index.ts', 'dist/test/probe.js', 'dist/fixture.js', 'dist/theme.css', 'dist/private.scss'])('still rejects leaked %s', file => {
    expect(validatePlatformPack('dom', [...files, file]).length).toBeGreaterThan(0);
  });
});
