import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import * as fs from 'node:fs/promises';

const writes = [];
mock.module('node:fs/promises', { exports: {
  ...fs,
  mkdir: async () => {},
  writeFile: async (file, data, options) => { writes.push({ file: file.href, data, options }); },
} });
const { saveEvidence } = await import('../src/lib/dreamdex.mjs');

test('same-millisecond broadcast records use distinct exclusive files (mock filesystem)', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1000 });
  await Promise.all([
    saveEvidence('broadcast', { state: 'validated-not-sent', checkedBlock: 1n }),
    saveEvidence('broadcast', { state: 'send-uncertain', checkedBlock: 1n }),
  ]);
  assert.equal(writes.length, 2);
  assert.notEqual(writes[0].file, writes[1].file);
  for (const write of writes) {
    assert.equal(write.options.flag, 'wx');
    assert.equal(JSON.parse(write.data).checkedBlock, '1');
  }
});
