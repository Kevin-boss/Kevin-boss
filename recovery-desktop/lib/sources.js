'use strict';

const os = require('node:os');
const fs = require('node:fs');
const fsp = fs.promises;
const { execFile } = require('node:child_process');

function run(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true, timeout: 10000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout) => {
      resolve(error ? '' : stdout);
    });
  });
}

async function exists(target) {
  try {
    await fsp.access(target, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function listSources() {
  const platform = os.platform();
  const sources = [];
  if (platform === 'win32') {
    const output = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', 'Get-CimInstance Win32_DiskDrive | Select-Object -Property DeviceID,Model,Size,MediaType | ConvertTo-Json -Compress']);
    try {
      const parsed = JSON.parse(output || '[]');
      for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
        if (item?.DeviceID) sources.push({ path: item.DeviceID, label: item.Model || item.DeviceID, size: Number(item.Size) || null, kind: item.MediaType || 'disk', requiresAdmin: true });
      }
    } catch { /* PowerShell may be unavailable; the path picker still works. */ }
  } else if (platform === 'darwin') {
    const output = await run('/usr/sbin/diskutil', ['list', '-plist', 'physical']);
    const matches = output.match(/<key>BSD Name<\/key>\s*<string>([^<]+)<\/string>/g) || [];
    for (const match of matches) {
      const name = match.match(/<string>([^<]+)<\/string>/)?.[1];
      if (name) sources.push({ path: `/dev/${name}`, label: `/dev/${name}`, size: null, kind: 'disk', requiresAdmin: true });
    }
  } else {
    const output = await run('lsblk', ['-dnbo', 'NAME,SIZE,TYPE,MODEL']);
    for (const line of output.trim().split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3 && parts[2] === 'disk') {
        const name = parts[0];
        const size = Number(parts[1]) || null;
        const label = parts.slice(3).join(' ') || name;
        sources.push({ path: `/dev/${name}`, label, size, kind: 'disk', requiresAdmin: true });
      }
    }
  }
  const fallback = platform === 'win32' ? 'C:\\' : '/';
  if (!(sources.some((source) => source.path === fallback)) && await exists(fallback)) {
    sources.unshift({ path: fallback, label: `System volume (${fallback})`, size: null, kind: 'volume', requiresAdmin: false });
  }
  return sources;
}

module.exports = { listSources };

