'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('recoveryAPI', {
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  listSources: () => ipcRenderer.invoke('sources:list'),
  chooseDestination: () => ipcRenderer.invoke('destination:choose'),
  startScan: (sourcePath) => ipcRenderer.invoke('scan:start', sourcePath),
  startRecovery: (payload) => ipcRenderer.invoke('recovery:start', payload),
  cancelJob: () => ipcRenderer.invoke('job:cancel'),
  openLocation: (filePath) => ipcRenderer.invoke('file:open-location', filePath),
  onScanProgress: (callback) => ipcRenderer.on('scan:progress', (_event, payload) => callback(payload)),
  onScanComplete: (callback) => ipcRenderer.on('scan:complete', (_event, payload) => callback(payload)),
  onScanError: (callback) => ipcRenderer.on('scan:error', (_event, payload) => callback(payload)),
  onRecoveryProgress: (callback) => ipcRenderer.on('recovery:progress', (_event, payload) => callback(payload)),
  onRecoveryComplete: (callback) => ipcRenderer.on('recovery:complete', (_event, payload) => callback(payload)),
  onRecoveryError: (callback) => ipcRenderer.on('recovery:error', (_event, payload) => callback(payload))
});

