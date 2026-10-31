import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const legacyName = new RegExp(['dream', 'sentinel'].join('[ -]?'), 'i');
const incorrectCase = new RegExp(['Lucid', 'keeper'].join(''));
// The retained local directory is a path, not the product's retired brand.
const localDirectory = ['dream', 'sentinel'].join('-');
const documentedPath = new RegExp('`(?:C:/[^`\\n]+/)?' + localDirectory + '/?`', 'g');

test('tracked product branding is consistently LucidKeeper', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);

  for (const file of files) {
    const bytes = readFileSync(file);
    if (bytes.includes(0)) continue;
    const content = bytes.toString('utf8');
    assert.doesNotMatch(content.replace(documentedPath, '`local repository directory`'), legacyName, `${file} contains the retired project name`);
    assert.doesNotMatch(content, incorrectCase, `${file} uses incorrect LucidKeeper casing`);
  }

  const surfaces = {
    'index.html': ['<title>LucidKeeper —'],
    'public/index.html': [
      '<title>LucidKeeper |',
      '<h1>LucidKeeper</h1>',
      'Read-only compatibility terminal',
    ],
    'src/chain/wagmiConfig.ts': ["appName: 'LucidKeeper'"],
    'scripts/ui-server.mjs': ['LucidKeeper Terminal server running'],
    'README.md': ['# LucidKeeper', '#LucidKeeper'],
  };

  for (const [file, expected] of Object.entries(surfaces)) {
    const content = readFileSync(file, 'utf8');
    for (const value of expected) assert.ok(content.includes(value), `${file} is missing ${value}`);
  }
});
