/**
 * Pulse Electron Example - Main Process
 *
 * This is the main process of the Electron application.
 * It creates the browser window and handles IPC communication.
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { hostname, platform, arch, cpus, totalmem, freemem } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if running in dev mode
const isDev = process.argv.includes('--dev');

// Notes storage path
const NOTES_DIR = join(app.getPath('userData'), 'notes');
const NOTES_FILE = join(NOTES_DIR, 'notes.json');

let mainWindow;

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    show: false
  });

  // Load from Vite dev server or built files
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Ensure notes directory exists
 */
async function ensureNotesDir() {
  if (!existsSync(NOTES_DIR)) {
    await mkdir(NOTES_DIR, { recursive: true });
  }
}

/**
 * Load notes from file
 */
async function loadNotes() {
  try {
    await ensureNotesDir();
    if (existsSync(NOTES_FILE)) {
      const data = await readFile(NOTES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load notes:', err);
  }
  return [];
}

/**
 * Save notes to file
 */
async function saveNotes(notes) {
  try {
    await ensureNotesDir();
    await writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
    return true;
  } catch (err) {
    console.error('Failed to save notes:', err);
    return false;
  }
}

/**
 * Get system information
 */
function getSystemInfo() {
  const cpuInfo = cpus()[0];
  return {
    hostname: hostname(),
    platform: platform(),
    arch: arch(),
    cpuModel: cpuInfo?.model || 'Unknown',
    cpuCores: cpus().length,
    totalMemory: Math.round(totalmem() / 1024 / 1024 / 1024 * 100) / 100,
    freeMemory: Math.round(freemem() / 1024 / 1024 / 1024 * 100) / 100,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome
  };
}

// =============================================================================
// IPC Handlers
// =============================================================================

ipcMain.handle('notes:load', async () => {
  return await loadNotes();
});

ipcMain.handle('notes:save', async (_, notes) => {
  return await saveNotes(notes);
});

ipcMain.handle('system:info', () => {
  return getSystemInfo();
});

ipcMain.handle('dialog:confirm', async (_, message) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Cancel', 'Delete'],
    defaultId: 0,
    title: 'Confirm',
    message: message
  });
  return result.response === 1;
});

// =============================================================================
// App Lifecycle
// =============================================================================

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
