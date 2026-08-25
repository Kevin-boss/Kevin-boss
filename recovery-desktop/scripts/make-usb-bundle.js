'use strict';

const fsp = require('node:fs').promises;
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const bundle = path.join(root, 'usb-bundle');

async function findFirst(predicate, current = dist) {
  let entries;
  try { entries = await fsp.readdir(current, { withFileTypes: true }); } catch { return null; }
  for (const entry of entries) {
    const candidate = path.join(current, entry.name);
    if (predicate(entry, candidate)) return candidate;
    if (entry.isDirectory()) {
      const nested = await findFirst(predicate, candidate);
      if (nested) return nested;
    }
  }
  return null;
}

async function copyIfFound(source, destination, label) {
  if (!source) {
    console.warn(`Skipping ${label}: build artifact not found in dist/`);
    return false;
  }
  await fsp.cp(source, destination, { recursive: true, force: true });
  console.log(`Added ${label}: ${path.basename(source)}`);
  return true;
}

async function main() {
  await fsp.rm(bundle, { recursive: true, force: true });
  await fsp.mkdir(bundle, { recursive: true });
  const windowsDir = path.join(bundle, 'Windows');
  const macosDir = path.join(bundle, 'macOS');
  const linuxDir = path.join(bundle, 'Linux');
  await Promise.all([fsp.mkdir(windowsDir), fsp.mkdir(macosDir), fsp.mkdir(linuxDir)]);

  const windows = await findFirst((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.exe'));
  const macos = await findFirst((entry) => entry.isDirectory() && entry.name.endsWith('.app'));
  const linux = await findFirst((entry) => entry.isFile() && entry.name.endsWith('.AppImage'));
  await copyIfFound(windows, path.join(windowsDir, 'Recovery Desk Portable.exe'), 'Windows portable executable');
  await copyIfFound(macos, path.join(macosDir, 'Recovery Desk.app'), 'macOS application bundle');
  if (await copyIfFound(linux, path.join(linuxDir, 'Recovery Desk.AppImage'), 'Linux AppImage')) {
    await fsp.chmod(path.join(linuxDir, 'Recovery Desk.AppImage'), 0o755);
  }

  const guide = [
    '# Recovery Desk USB Bundle',
    '',
    'This folder contains separate portable builds for each desktop operating system. There is no single executable that can run on Windows, macOS, and Linux because each operating system uses a different application format.',
    '',
    '## Before recovery',
    '',
    'Use the affected device only as the scan source. Save recovered files to a different physical drive when possible. Recovery Desk reads the source and does not intentionally write to it, but the operating system may require administrator/root permission for raw device access.',
    '',
    '## Launch',
    '',
    '| Operating system | Location | How to start |',
    '| --- | --- | --- |',
    '| Windows 10/11 | Windows/Recovery Desk Portable.exe | Double-click the executable or Run Recovery Desk.cmd. |',
    '| macOS | macOS/Recovery Desk.app | Double-click the app or Run Recovery Desk.command. For an unsigned local build, Control-click it and choose Open if macOS blocks the first launch. |',
    '| Linux | Linux/Recovery Desk.AppImage | Mark it executable and double-click it, or run chmod +x on the AppImage. |',
    '',
    'The app is a best-effort file carver. It cannot guarantee recovery of overwritten, encrypted, or SSD TRIM-discarded data, and it does not restore original filenames or folder structure in this MVP.',
    ''
  ].join('\n');
  await fsp.writeFile(path.join(bundle, 'START HERE.md'), guide);
  await fsp.writeFile(path.join(bundle, 'Windows', 'Run Recovery Desk.cmd'), '@echo off\nstart "" "%~dp0Recovery Desk Portable.exe"\n');
  await fsp.writeFile(path.join(bundle, 'macOS', 'Run Recovery Desk.command'), '#!/bin/sh\nopen "$(dirname "$0")/Recovery Desk.app"\n');
  await fsp.chmod(path.join(bundle, 'macOS', 'Run Recovery Desk.command'), 0o755);
  await fsp.writeFile(path.join(bundle, 'Linux', 'Run Recovery Desk.sh'), '#!/bin/sh\nexec "$(dirname "$0")/Recovery Desk.AppImage"\n');
  await fsp.chmod(path.join(bundle, 'Linux', 'Run Recovery Desk.sh'), 0o755);
  console.log(`USB bundle ready at ${bundle}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
