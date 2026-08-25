'use strict';

const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');

const CHUNK_SIZE = 1024 * 1024;
const MAX_RECOVERY_SIZE = 512 * 1024 * 1024;
const MAX_CANDIDATES = 10000;
const TEXT_MIN_SIZE = 128;
const TEXT_SIGNATURE = { id: 'text', extension: '.txt', mime: 'text/plain', header: Buffer.alloc(0), end: 'text' };

const SIGNATURES = [
  { id: 'jpeg', extension: '.jpg', mime: 'image/jpeg', header: Buffer.from([0xff, 0xd8, 0xff]), end: Buffer.from([0xff, 0xd9]) },
  { id: 'png', extension: '.png', mime: 'image/png', header: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), end: Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]) },
  { id: 'pdf', extension: '.pdf', mime: 'application/pdf', header: Buffer.from('%PDF-'), end: Buffer.from('%%EOF') },
  { id: 'zip', extension: '.zip', mime: 'application/zip', header: Buffer.from([0x50, 0x4b, 0x03, 0x04]), end: Buffer.from([0x50, 0x4b, 0x05, 0x06]) },
  { id: 'gif', extension: '.gif', mime: 'image/gif', header: Buffer.from('GIF8'), end: Buffer.from([0x3b]) },
  { id: 'bmp', extension: '.bmp', mime: 'image/bmp', header: Buffer.from('BM'), end: 'bmp' },
  { id: 'mp3', extension: '.mp3', mime: 'audio/mpeg', header: Buffer.from('ID3'), end: 'bounded', maxSize: 64 * 1024 * 1024 },
  { id: 'mp4', extension: '.mp4', mime: 'video/mp4', header: Buffer.from('ftyp'), headerOffset: 4, end: 'mp4', maxSize: MAX_RECOVERY_SIZE }
];

function indexOfBuffer(haystack, needle, from = 0) {
  return haystack.indexOf(needle, from);
}

function findTextRuns(data) {
  const runs = [];
  let start = -1;
  let last = -1;
  let printable = 0;
  let total = 0;
  const flush = () => {
    if (start >= 0 && last - start + 1 >= TEXT_MIN_SIZE && printable / Math.max(total, 1) >= 0.95) runs.push({ start, end: last + 1 });
    start = -1;
    last = -1;
    printable = 0;
    total = 0;
  };
  for (let index = 0; index < data.length; index += 1) {
    const byte = data[index];
    const allowed = byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126);
    if (allowed) {
      if (start < 0) start = index;
      last = index;
      printable += 1;
      total += 1;
    } else if (start >= 0) {
      flush();
    }
  }
  flush();
  return runs;
}

async function readExactly(handle, position, length) {
  const output = Buffer.alloc(length);
  let read = 0;
  while (read < length) {
    const result = await handle.read(output, read, length - read, position + read);
    if (!result.bytesRead) break;
    read += result.bytesRead;
  }
  return output.subarray(0, read);
}

async function findMarker(handle, start, marker, maxLength) {
  let position = start;
  let remaining = maxLength;
  let carry = Buffer.alloc(0);
  while (remaining > 0) {
    const amount = Math.min(CHUNK_SIZE, remaining);
    const chunk = await readExactly(handle, position, amount);
    if (!chunk.length) return -1;
    const data = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    const found = indexOfBuffer(data, marker);
    if (found >= 0) return position - carry.length + found;
    carry = data.subarray(Math.max(0, data.length - marker.length + 1));
    position += chunk.length;
    remaining -= chunk.length;
    if (chunk.length < amount) return -1;
  }
  return -1;
}

async function determineSize(handle, start, signature, totalBytes) {
  if (signature.end === 'bmp') {
    const header = await readExactly(handle, start, 6);
    if (header.length === 6) {
      const size = header.readUInt32LE(2);
      return size > 0 && size <= MAX_RECOVERY_SIZE ? size : -1;
    }
    return -1;
  }
  if (signature.end === 'mp4') {
    const header = await readExactly(handle, start, 4);
    if (header.length === 4) {
      const size = header.readUInt32BE(0);
      return size >= 8 && size <= MAX_RECOVERY_SIZE ? size : -1;
    }
    return -1;
  }
  if (signature.end === 'bounded') {
    return Math.min(signature.maxSize, totalBytes == null ? signature.maxSize : Math.max(0, totalBytes - start));
  }
  if (signature.end === 'text') return Math.min(MAX_RECOVERY_SIZE, Math.max(0, totalBytes == null ? TEXT_MIN_SIZE : totalBytes - start));
  const maxLength = Math.min(MAX_RECOVERY_SIZE, totalBytes == null ? MAX_RECOVERY_SIZE : Math.max(0, totalBytes - start));
  const markerAt = await findMarker(handle, start + signature.header.length, signature.end, maxLength);
  if (markerAt < 0) return -1;
  let size = markerAt - start + signature.end.length;
  if (signature.id === 'zip') {
    const footer = await readExactly(handle, markerAt, 22);
    if (footer.length >= 22) size += footer.readUInt16LE(20);
  }
  return size > 0 && size <= MAX_RECOVERY_SIZE ? size : -1;
}

function candidateName(signature, offset) {
  return `recovered_${offset.toString(16).padStart(12, '0')}${signature.extension}`;
}

async function scanStorage(sourcePath, options = {}) {
  const signal = options.signal;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const handle = await fsp.open(sourcePath, 'r');
  const results = [];
  const seen = new Set();
  const candidates = [];
  let offset = 0;
  let carry = Buffer.alloc(0);
  let totalBytes = null;

  try {
    const stat = await handle.stat().catch(() => null);
    if (stat && Number.isFinite(stat.size) && stat.size > 0) totalBytes = stat.size;
    const maxHeaderLength = Math.max(...SIGNATURES.map((s) => s.header.length + (s.headerOffset || 0)));
    while (true) {
      if (signal?.aborted) throw new Error('Scan cancelled');
      const chunk = Buffer.alloc(CHUNK_SIZE);
      const { bytesRead } = await handle.read(chunk, 0, CHUNK_SIZE, offset);
      if (!bytesRead) break;
      const data = carry.length ? Buffer.concat([carry, chunk.subarray(0, bytesRead)]) : chunk.subarray(0, bytesRead);
      const dataBaseOffset = offset - carry.length;
      for (const signature of SIGNATURES) {
        let at = signature.headerOffset || 0;
        while (at < data.length && candidates.length < MAX_CANDIDATES) {
          const position = indexOfBuffer(data, signature.header, at);
          if (position < 0) break;
          const start = position - (signature.headerOffset || 0);
          const absoluteOffset = dataBaseOffset + start;
          const key = `${signature.id}:${absoluteOffset}`;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({ signature, offset: absoluteOffset });
          }
          at = position + Math.max(signature.header.length, 1);
        }
      }
      if (candidates.length < MAX_CANDIDATES) {
        for (const run of findTextRuns(data)) {
          const absoluteOffset = dataBaseOffset + run.start;
          const key = `text:${absoluteOffset}`;
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({ signature: TEXT_SIGNATURE, offset: absoluteOffset, fixedSize: run.end - run.start });
          }
        }
      }
      offset += bytesRead;
      carry = data.subarray(Math.max(0, data.length - maxHeaderLength));
      onProgress({ bytesRead: offset, totalBytes, found: candidates.length });
    }

    for (const candidate of candidates) {
      if (signal?.aborted) throw new Error('Scan cancelled');
      const size = candidate.fixedSize || await determineSize(handle, candidate.offset, candidate.signature, totalBytes);
      if (size > 0) {
        results.push({
          id: `${candidate.signature.id}-${candidate.offset}`,
          kind: candidate.signature.id,
          name: candidateName(candidate.signature, candidate.offset),
          extension: candidate.signature.extension,
          mime: candidate.signature.mime,
          offset: candidate.offset,
          size,
          confidence: candidate.signature.end === 'bounded' ? 'low' : 'high',
          source: sourcePath
        });
      }
      onProgress({ bytesRead: totalBytes || offset, totalBytes, found: results.length, phase: 'finalizing' });
    }
  } finally {
    await handle.close();
  }
  return results.sort((a, b) => a.offset - b.offset);
}

async function recoverFiles(sourcePath, items, destination, options = {}) {
  const signal = options.signal;
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const resolvedSource = path.resolve(sourcePath);
  const resolvedDestination = path.resolve(destination);
  if (resolvedSource === resolvedDestination || resolvedDestination.startsWith(`${resolvedSource}${path.sep}`)) {
    throw new Error('Choose a recovery destination different from the scanned source.');
  }
  await fsp.mkdir(resolvedDestination, { recursive: true });
  const input = await fsp.open(resolvedSource, 'r');
  const recovered = [];
  try {
    for (const item of items) {
      if (signal?.aborted) throw new Error('Recovery cancelled');
      if (!Number.isSafeInteger(item.offset) || !Number.isSafeInteger(item.size) || item.offset < 0 || item.size <= 0 || item.size > MAX_RECOVERY_SIZE) continue;
      const filename = path.basename(item.name || `recovered_${item.offset.toString(16)}${item.extension || '.bin'}`);
      const outputPath = path.join(resolvedDestination, filename);
      const output = await fsp.open(outputPath, 'wx');
      try {
        let remaining = item.size;
        let position = item.offset;
        while (remaining > 0) {
          if (signal?.aborted) throw new Error('Recovery cancelled');
          const buffer = Buffer.alloc(Math.min(CHUNK_SIZE, remaining));
          const { bytesRead } = await input.read(buffer, 0, buffer.length, position);
          if (!bytesRead) break;
          await output.write(buffer.subarray(0, bytesRead));
          position += bytesRead;
          remaining -= bytesRead;
          onProgress({ current: recovered.length, total: items.length, file: filename, bytesWritten: item.size - remaining });
        }
        if (remaining === 0) recovered.push({ ...item, outputPath });
      } finally {
        await output.close();
      }
    }
  } finally {
    await input.close();
  }
  return recovered;
}

module.exports = { SIGNATURES, scanStorage, recoverFiles, MAX_RECOVERY_SIZE, TEXT_MIN_SIZE };

