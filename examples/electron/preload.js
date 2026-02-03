/**
 * Pulse Electron Example - Preload Script
 *
 * This script runs in the renderer process before web content loads.
 * It exposes safe APIs to the renderer via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Notes API
  notes: {
    load: () => ipcRenderer.invoke('notes:load'),
    save: (notes) => ipcRenderer.invoke('notes:save', notes)
  },

  // System API
  system: {
    getInfo: () => ipcRenderer.invoke('system:info')
  },

  // Dialog API
  dialog: {
    confirm: (message) => ipcRenderer.invoke('dialog:confirm', message)
  },

  // Platform info
  platform: process.platform
});
