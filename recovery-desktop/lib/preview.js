'use strict';

const fsp = require('node:fs').promises;
const crypto = require('node:crypto');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const TEXT_EXTENSIONS = new Set(['.txt', '.log', '.csv', '.json', '.xml', '.md', '.html', '.htm', '.yaml', '.yml', '.ini', '.conf', '.sql', '.js', '.ts', '.css', '.py', '.sh', '.bat', '.ps1']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv']);
const TEXT_PREVIEW_LIMIT = 2 * 1024 * 1024;
const MEDIA_PREVIEW_LIMIT = 128 * 1024 * 1024;

function extensionOf(item) {
  return String(item.extension || path.extname(item.name || '')).toLowerCase();
}

function previewKind(item) {
  const extension = extensionOf(item);
  if (TEXT_EXTENSIONS.has(extension) || String(item.mime || '').startsWith('text/')) return 'text';
  if (IMAGE_EXTENSIONS.has(extension) || String(item.mime || '').startsWith('image/')) return 'image';
  if (VIDEO_EXTENSIONS.has(extension) || String(item.mime || '').startsWith('video/')) return 'video';
  return 'unsupported';
}

function validateItem(item) {
  if (!item || !Number.isSafeInteger(item.offset) || !Number.isSafeInteger(item.size) || item.offset < 0 || item.size <= 0) {
    throw new Error('The selected preview range is invalid.');
  }
}

async function readRange(handle, offset, size) {
  const buffer = Buffer.alloc(size);
  let read = 0;
  while (read < size) {
    const result = await handle.read(buffer, read, size - read, offset + read);
    if (!result.bytesRead) break;
    read += result.bytesRead;
  }
  return buffer.subarray(0, read);
}

async function createPreview(sourcePath, item, tempDirectory) {
  validateItem(item);
  const kind = previewKind(item);
  if (kind === 'unsupported') {
    return { kind, title: item.name || 'Selected file', message: 'Preview is not available for this file type. You can still select it for recovery.' };
  }
  const limit = kind === 'text' ? TEXT_PREVIEW_LIMIT : MEDIA_PREVIEW_LIMIT;
  if (item.size > limit) {
    return { kind: 'too-large', title: item.name || 'Selected file', message: `Preview is limited to ${Math.round(limit / 1024 / 1024)} MB. This file is ${Math.round(item.size / 1024 / 1024)} MB; it can still be recovered.` };
  }
  const handle = await fsp.open(sourcePath, 'r');
  try {
    const data = await readRange(handle, item.offset, item.size);
    if (kind === 'text') {
      return { kind, title: item.name || 'Text preview', content: data.toString('utf8').replace(/\u0000/g, '�') };
    }
    if (kind === 'image') {
      const mime = item.mime || ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[extensionOf(item)] || 'application/octet-stream');
      return { kind, title: item.name || 'Image preview', dataUrl: `data:${mime};base64,${data.toString('base64')}` };
    }
    await fsp.mkdir(tempDirectory, { recursive: true });
    const digest = crypto.createHash('sha256').update(`${sourcePath}:${item.offset}:${item.size}`).digest('hex').slice(0, 24);
    const outputPath = path.join(tempDirectory, `preview-${digest}${extensionOf(item) || '.bin'}`);
    await fsp.writeFile(outputPath, data, { flag: 'w' });
    return { kind, title: item.name || 'Video preview', url: pathToFileURL(outputPath).href, tempPath: outputPath };
  } finally {
    await handle.close();
  }
}

module.exports = { createPreview, previewKind, TEXT_PREVIEW_LIMIT, MEDIA_PREVIEW_LIMIT };
