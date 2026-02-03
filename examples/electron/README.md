# Pulse + Electron Example

A desktop notes application built with **Pulse Framework** (.pulse DSL) and **Electron**.

## Features

- **Pulse DSL** - Uses `.pulse` component files for clean, declarative UI
- **Reactive UI** - Pulse signals power the entire interface
- **Native File Storage** - Notes are saved to your system automatically
- **System Info Panel** - Displays OS, CPU, memory, and runtime versions
- **IPC Communication** - Demonstrates secure main/renderer communication
- **Vite Integration** - Hot module replacement during development
- **Dark Theme** - Catppuccin Mocha-inspired design

## Screenshot

```
┌─────────────────────────────────────────────────────────────┐
│  Pulse Notes              [+]  │                 │ System   │
├────────────────────────────────┤  Welcome to     │──────────│
│  🔍 Search notes...            │  Pulse Notes!   │ Platform │
├────────────────────────────────┤                 │ win32    │
│  Welcome to Pulse Notes!       │  This is a...   │ CPU      │
│  This is a desktop notes...    │                 │ Intel i7 │
│  Jan 15                        │                 │ Memory   │
│                                │                 │ 8/16 GB  │
│  Meeting Notes                 │                 │ Electron │
│  Discuss Q1 roadmap...         │                 │ 28.0.0   │
│  Jan 14                        │                 │          │
└────────────────────────────────┴─────────────────┴──────────┘
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm

### Installation

```bash
cd examples/electron
npm install
```

### Development

```bash
# Start with Vite HMR + Electron DevTools
npm run dev
```

### Production

```bash
# Build and start
npm start

# Or build separately
npm run build
```

## Project Structure

```
electron/
├── main.js                      # Electron main process
├── preload.js                   # Context bridge (IPC)
├── index.html                   # HTML entry point
├── vite.config.js               # Vite configuration
├── src/
│   ├── main.js                  # Entry point
│   ├── App.pulse                # Main application component
│   └── components/
│       ├── Sidebar.pulse        # Notes list sidebar
│       ├── Editor.pulse         # Note editor
│       └── SystemPanel.pulse    # System info panel
├── dist/                        # Built files (after npm run build)
├── package.json
└── README.md
```

## Architecture

### Main Process (`main.js`)

The Electron main process handles:
- Window creation and lifecycle
- File system operations (load/save notes)
- System information retrieval
- Native dialogs

### Preload Script (`preload.js`)

Exposes safe APIs to the renderer via `contextBridge`:

```javascript
window.electronAPI = {
  notes: {
    load: () => Promise<Note[]>,
    save: (notes) => Promise<boolean>
  },
  system: {
    getInfo: () => Promise<SystemInfo>
  },
  dialog: {
    confirm: (message) => Promise<boolean>
  }
}
```

### Renderer Process (Pulse Components)

The UI is built with `.pulse` component files:

**App.pulse** - Main application with state management:
```pulse
@page App

state {
  notes: []
  selectedNoteId: null
  searchQuery: ""
}

view {
  .app {
    Sidebar(notes={getFilteredNotes()}, ...)
    Editor(note={getSelectedNote()}, ...)
    SystemPanel(systemInfo={systemInfo}, ...)
  }
}

actions {
  async loadNotes() {
    notes = await window.electronAPI.notes.load()
  }
}
```

**Sidebar.pulse** - Notes list with search:
```pulse
@page Sidebar

props {
  notes: []
  onSelectNote: null
}

view {
  .sidebar {
    input.search-input @input(onSearch(event.target.value))
    @each(note in notes) {
      .note-item @click(onSelectNote(note.id)) {
        .note-item-title "{note.title}"
      }
    }
  }
}
```

## Key Concepts

### Secure IPC Communication

Electron requires `contextIsolation: true` for security. The preload script acts as a bridge:

```javascript
// preload.js (CommonJS)
contextBridge.exposeInMainWorld('electronAPI', {
  notes: {
    load: () => ipcRenderer.invoke('notes:load')
  }
});

// main.js (Main process)
ipcMain.handle('notes:load', async () => {
  return await loadNotesFromDisk();
});

// App.pulse (Renderer)
actions {
  async loadNotes() {
    notes = await window.electronAPI.notes.load()
  }
}
```

### Vite + Pulse Plugin

The example uses Vite with the Pulse plugin to compile `.pulse` files:

```javascript
// vite.config.js
import pulsePlugin from '../../loader/vite-plugin.js';

export default defineConfig({
  plugins: [pulsePlugin()],
  base: './'
});
```

During development, Electron loads from the Vite dev server (`http://localhost:5173`) for hot module replacement. In production, it loads from the built `dist/` folder.

## Building for Distribution

To package the app for distribution, you can use [electron-builder](https://www.electron.build/):

```bash
npm install --save-dev electron-builder
```

Add to `package.json`:

```json
{
  "build": {
    "appId": "com.pulse.notes",
    "productName": "Pulse Notes",
    "files": [
      "main.js",
      "preload.js",
      "dist/**/*"
    ]
  },
  "scripts": {
    "dist": "npm run build && electron-builder"
  }
}
```

## Tips

### DevTools

Open DevTools with `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS). DevTools open automatically in dev mode.

### File Storage

Notes are stored in the user data directory:
- **Windows**: `%APPDATA%/pulse-electron/notes/notes.json`
- **macOS**: `~/Library/Application Support/pulse-electron/notes/notes.json`
- **Linux**: `~/.config/pulse-electron/notes/notes.json`

## License

MIT - Part of the Pulse Framework examples.
