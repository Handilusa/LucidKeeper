import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, unlink } from 'node:fs/promises';
import { saveEvidence } from '../src/lib/dreamdex.mjs';
import { capture } from './fixtures/captured.mjs';
test('concurrent evidence records use distinct exclusive files on the real filesystem', async () => {
  // Real filesystem and real receipt/read data; concurrency, no forced/fake clock.
  const files = await Promise.all([saveEvidence('test-capture', capture.provenance), saveEvidence('test-capture', capture.provenance)]);
  try {
    assert.notEqual(files[0].href, files[1].href);
    for (const file of files) assert.equal(JSON.parse(await readFile(file, 'utf8')).block.hash, capture.provenance.block.hash);
  } finally { await Promise.all(files.map(file => unlink(file))); }
});
