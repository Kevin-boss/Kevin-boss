const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { scanStorage, recoverFiles } = require('../lib/carver');

async function tempWorkspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'recovery-desk-'));
}

test('finds JPEG and PDF fragments, including markers split across a read chunk', async () => {
  const root = await tempWorkspace();
  const source = path.join(root, 'source.bin');
  const prefix = Buffer.alloc(1024 * 1024 - 2, 0x00);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x11, 0x22, 0xff, 0xd9]);
  const pdf = Buffer.from('%PDF-1.7\nhello\n%%EOF');
  await fs.writeFile(source, Buffer.concat([prefix, jpeg, Buffer.from([0, 0, 0]), pdf]));
  const found = await scanStorage(source);
  assert.equal(found.length, 2);
  assert.equal(found[0].extension, '.jpg');
  assert.equal(found[0].offset, prefix.length);
  assert.equal(found[0].size, jpeg.length);
  assert.equal(found[1].extension, '.pdf');
  assert.equal(found[1].size, pdf.length);
});

test('recovers selected bytes into a separate destination without modifying the source', async () => {
  const root = await tempWorkspace();
  const source = path.join(root, 'source.bin');
  const destination = path.join(root, 'recovered');
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x10, 0x20, 0xff, 0xd9]);
  await fs.writeFile(source, Buffer.concat([Buffer.from('prefix'), jpeg, Buffer.from('suffix')]));
  const before = await fs.readFile(source);
  const found = await scanStorage(source);
  const recovered = await recoverFiles(source, [found[0]], destination);
  assert.equal(recovered.length, 1);
  assert.deepEqual(await fs.readFile(recovered[0].outputPath), jpeg);
  assert.deepEqual(await fs.readFile(source), before);
});

test('rejects using the scanned source itself as the destination', async () => {
  const root = await tempWorkspace();
  const source = path.join(root, 'source.bin');
  await fs.writeFile(source, Buffer.from('source'));
  await assert.rejects(() => recoverFiles(source, [], source), /different from the scanned source/);
});
