'use strict';

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const { scanStorage, recoverFiles } = require('./lib/carver');
const { listSources } = require('./lib/sources');

let mainWindow;
let activeJob = null;

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#f6f8fb',
    title: 'Recovery Desk',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function ensureString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

function cancelActiveJob() {
  if (activeJob) activeJob.controller.abort();
}

ipcMain.handle('app:info', () => ({ version: app.getVersion(), platform: process.platform, arch: process.arch }));
ipcMain.handle('sources:list', () => listSources());
ipcMain.handle('destination:choose', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { title: 'Choose a recovery destination', properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('scan:start', async (event, sourcePath) => {
  cancelActiveJob();
  const source = ensureString(sourcePath, 'Source');
  const controller = new AbortController();
  activeJob = { type: 'scan', controller };
  try {
    const files = await scanStorage(source, {
      signal: controller.signal,
      onProgress: (progress) => send('scan:progress', progress)
    });
    send('scan:complete', { files });
    return files;
  } catch (error) {
    send('scan:error', { message: error.message || 'Scan failed.' });
    throw error;
  } finally {
    activeJob = null;
  }
});
ipcMain.handle('recovery:start', async (event, payload) => {
  cancelActiveJob();
  const source = ensureString(payload?.sourcePath, 'Source');
  const destination = ensureString(payload?.destination, 'Destination');
  if (!Array.isArray(payload?.items) || payload.items.length === 0) throw new Error('Select at least one recoverable file.');
  const controller = new AbortController();
  activeJob = { type: 'recovery', controller };
  try {
    const recovered = await recoverFiles(source, payload.items, destination, {
      signal: controller.signal,
      onProgress: (progress) => send('recovery:progress', progress)
    });
    send('recovery:complete', { files: recovered });
    return recovered;
  } catch (error) {
    send('recovery:error', { message: error.message || 'Recovery failed.' });
    throw error;
  } finally {
    activeJob = null;
  }
});
ipcMain.handle('job:cancel', () => {
  cancelActiveJob();
  return true;
});
ipcMain.handle('file:open-location', async (event, filePath) => {
  const target = ensureString(filePath, 'File path');
  return shell.showItemInFolder(target);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

