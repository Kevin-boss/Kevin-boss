const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createPreview } = require('../lib/preview');

async function tempWorkspace() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'recovery-preview-'));
}

test('creates a bounded text preview from a source byte range', async () => {
  const root = await tempWorkspace();
  const source = path.join(root, 'source.bin');
  const text = Buffer.from('Recovered text content\nsecond line');
  await fs.writeFile(source, Buffer.concat([Buffer.from('prefix'), text, Buffer.from('suffix')]));
  const preview = await createPreview(source, { name: 'notes.txt', extension: '.txt', offset: 6, size: text.length }, path.join(root, 'tmp'));
  assert.equal(preview.kind, 'text');
  assert.equal(preview.content, text.toString());
  assert.equal(await fs.readFile(source, 'utf8'), `prefix${text}suffix`);
});

test('returns image data and a temporary video file without overwriting the source', async () => {
  const root = await tempWorkspace();
  const source = path.join(root, 'source.bin');
  const image = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const video = Buffer.from('video bytes');
  await fs.writeFile(source, Buffer.concat([image, video]));
  const imagePreview = await createPreview(source, { name: 'image.png', extension: '.png', mime: 'image/png', offset: 0, size: image.length }, path.join(root, 'tmp'));
  const videoPreview = await createPreview(source, { name: 'movie.mp4', extension: '.mp4', mime: 'video/mp4', offset: image.length, size: video.length }, path.join(root, 'tmp'));
  assert.equal(imagePreview.kind, 'image');
  assert.match(imagePreview.dataUrl, /^data:image\/png;base64,/);
  assert.equal(videoPreview.kind, 'video');
  assert.deepEqual(await fs.readFile(new URL(videoPreview.url)), video);
  assert.deepEqual(await fs.readFile(source), Buffer.concat([image, video]));
});

test('reports unsupported and oversized previews without reading or writing the source', async () => {
  const root = await tempWorkspace();
  const source = path.join(root, 'source.bin');
  await fs.writeFile(source, Buffer.from('source'));
  const unsupported = await createPreview(source, { name: 'archive.zip', extension: '.zip', offset: 0, size: 6 }, path.join(root, 'tmp'));
  const oversized = await createPreview(source, { name: 'large.txt', extension: '.txt', offset: 0, size: 3 * 1024 * 1024 }, path.join(root, 'tmp'));
  assert.equal(unsupported.kind, 'unsupported');
  assert.equal(oversized.kind, 'too-large');
  assert.equal(await fs.readFile(source, 'utf8'), 'source');
});
