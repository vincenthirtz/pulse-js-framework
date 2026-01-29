/**
 * Pulse Store Demo - Notes App
 * Demonstrates all store features:
 * - createStore with persistence
 * - createActions for mutations
 * - createGetters for computed values
 * - historyPlugin for undo/redo
 * - loggerPlugin for debugging
 * - createModuleStore for namespaced state
 */

import { pulse, effect, computed, batch } from '../../runtime/index.js';
import { el, mount } from '../../runtime/dom.js';
import {
  createStore,
  createActions,
  createGetters,
  usePlugin,
  historyPlugin,
  loggerPlugin,
  createModuleStore
} from '../../runtime/store.js';

// =============================================================================
// Store Setup
// =============================================================================

// Main notes store with persistence
const notesStore = createStore({
  notes: [],
  selectedNoteId: null,
  searchQuery: '',
  sortBy: 'updated', // 'updated', 'created', 'title'
  filterCategory: 'all'
}, {
  persist: true,
  storageKey: 'pulse-notes-demo'
});

// Apply plugins
usePlugin(notesStore, historyPlugin);
// Uncomment to see state changes in console:
// usePlugin(notesStore, loggerPlugin);

// Define actions
const noteActions = createActions(notesStore, {
  addNote: (store, title = 'Untitled Note', content = '', category = 'personal') => {
    const note = {
      id: Date.now(),
      title,
      content,
      category,
      created: Date.now(),
      updated: Date.now(),
      pinned: false
    };
    store.notes.update(notes => [...notes, note]);
    store.selectedNoteId.set(note.id);
    return note;
  },

  updateNote: (store, id, updates) => {
    store.notes.update(notes =>
      notes.map(note =>
        note.id === id
          ? { ...note, ...updates, updated: Date.now() }
          : note
      )
    );
  },

  deleteNote: (store, id) => {
    store.notes.update(notes => notes.filter(note => note.id !== id));
    if (store.selectedNoteId.peek() === id) {
      store.selectedNoteId.set(null);
    }
  },

  togglePin: (store, id) => {
    store.notes.update(notes =>
      notes.map(note =>
        note.id === id ? { ...note, pinned: !note.pinned } : note
      )
    );
  },

  selectNote: (store, id) => {
    store.selectedNoteId.set(id);
  },

  setSearch: (store, query) => {
    store.searchQuery.set(query);
  },

  setSortBy: (store, sortBy) => {
    store.sortBy.set(sortBy);
  },

  setFilterCategory: (store, category) => {
    store.filterCategory.set(category);
  },

  clearAll: (store) => {
    batch(() => {
      store.notes.set([]);
      store.selectedNoteId.set(null);
    });
  }
});

// Define getters (computed values)
const noteGetters = createGetters(notesStore, {
  filteredNotes: (store) => {
    let notes = store.notes.get();
    const search = store.searchQuery.get().toLowerCase();
    const category = store.filterCategory.get();

    // Filter by search
    if (search) {
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(search) ||
        n.content.toLowerCase().includes(search)
      );
    }

    // Filter by category
    if (category !== 'all') {
      notes = notes.filter(n => n.category === category);
    }

    // Sort
    const sortBy = store.sortBy.get();
    notes = [...notes].sort((a, b) => {
      // Pinned notes first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      // Then by sort criteria
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'created') {
        return b.created - a.created;
      } else {
        return b.updated - a.updated;
      }
    });

    return notes;
  },

  selectedNote: (store) => {
    const id = store.selectedNoteId.get();
    if (!id) return null;
    return store.notes.get().find(n => n.id === id) || null;
  },

  noteCount: (store) => store.notes.get().length,

  categories: (store) => {
    const notes = store.notes.get();
    const cats = new Set(notes.map(n => n.category));
    return ['all', ...Array.from(cats)];
  },

  categoryStats: (store) => {
    const notes = store.notes.get();
    const stats = { all: notes.length };
    for (const note of notes) {
      stats[note.category] = (stats[note.category] || 0) + 1;
    }
    return stats;
  }
});

// Settings store using module pattern
const settingsModule = createModuleStore({
  ui: {
    state: {
      theme: 'dark',
      sidebarOpen: true,
      editorFontSize: 14
    },
    actions: {
      toggleTheme: (store) => {
        store.theme.update(t => t === 'dark' ? 'light' : 'dark');
      },
      toggleSidebar: (store) => {
        store.sidebarOpen.update(v => !v);
      },
      setFontSize: (store, size) => {
        store.editorFontSize.set(Math.min(24, Math.max(10, size)));
      }
    },
    getters: {
      isDark: (store) => store.theme.get() === 'dark'
    }
  }
});

// =============================================================================
// Categories
// =============================================================================

const CATEGORIES = [
  { id: 'personal', name: 'Personal', icon: '👤', color: '#6366f1' },
  { id: 'work', name: 'Work', icon: '💼', color: '#10b981' },
  { id: 'ideas', name: 'Ideas', icon: '💡', color: '#f59e0b' },
  { id: 'tasks', name: 'Tasks', icon: '✅', color: '#ef4444' }
];

function getCategoryInfo(id) {
  return CATEGORIES.find(c => c.id === id) || { id, name: id, icon: '📄', color: '#666' };
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

// =============================================================================
// Components
// =============================================================================

function Header() {
  const header = el('header.header');

  // Logo & title
  const brand = el('.brand');
  brand.innerHTML = '<span class="logo">📝</span><span class="title">Pulse Notes</span>';
  header.appendChild(brand);

  // Search
  const search = el('.search-container');
  const searchIcon = el('span.search-icon', '🔍');
  const searchInput = el('input.search-input[type=text][placeholder="Search notes..."]');
  searchInput.addEventListener('input', (e) => noteActions.setSearch(e.target.value));
  effect(() => {
    searchInput.value = notesStore.searchQuery.get();
  });
  search.appendChild(searchIcon);
  search.appendChild(searchInput);
  header.appendChild(search);

  // Actions
  const actions = el('.header-actions');

  // Undo/Redo buttons
  const undoBtn = el('button.icon-btn[title="Undo (Ctrl+Z)"]', '↩️');
  undoBtn.addEventListener('click', () => notesStore.$undo());
  effect(() => {
    undoBtn.disabled = !notesStore.$canUndo();
    undoBtn.style.opacity = notesStore.$canUndo() ? '1' : '0.4';
  });
  actions.appendChild(undoBtn);

  const redoBtn = el('button.icon-btn[title="Redo (Ctrl+Y)"]', '↪️');
  redoBtn.addEventListener('click', () => notesStore.$redo());
  effect(() => {
    redoBtn.disabled = !notesStore.$canRedo();
    redoBtn.style.opacity = notesStore.$canRedo() ? '1' : '0.4';
  });
  actions.appendChild(redoBtn);

  // Theme toggle
  const themeBtn = el('button.icon-btn[title="Toggle theme"]');
  effect(() => {
    themeBtn.textContent = settingsModule.ui.theme.get() === 'dark' ? '🌙' : '☀️';
  });
  themeBtn.addEventListener('click', () => settingsModule.ui.toggleTheme());
  actions.appendChild(themeBtn);

  // New note button
  const newBtn = el('button.btn.primary', '+ New Note');
  newBtn.addEventListener('click', () => noteActions.addNote());
  actions.appendChild(newBtn);

  header.appendChild(actions);

  return header;
}

function Sidebar() {
  const sidebar = el('aside.sidebar');

  // Categories
  const catSection = el('.sidebar-section');
  const catTitle = el('h3.section-title', 'Categories');
  catSection.appendChild(catTitle);

  const catList = el('.category-list');
  effect(() => {
    catList.innerHTML = '';
    const currentFilter = notesStore.filterCategory.get();
    const stats = noteGetters.categoryStats.get();

    // All notes
    const allItem = el(`.category-item${currentFilter === 'all' ? '.active' : ''}`);
    allItem.innerHTML = `<span class="cat-icon">📋</span><span class="cat-name">All Notes</span><span class="cat-count">${stats.all || 0}</span>`;
    allItem.addEventListener('click', () => noteActions.setFilterCategory('all'));
    catList.appendChild(allItem);

    // Category items
    for (const cat of CATEGORIES) {
      const count = stats[cat.id] || 0;
      const item = el(`.category-item${currentFilter === cat.id ? '.active' : ''}`);
      item.innerHTML = `<span class="cat-icon">${cat.icon}</span><span class="cat-name">${cat.name}</span><span class="cat-count">${count}</span>`;
      item.addEventListener('click', () => noteActions.setFilterCategory(cat.id));
      catList.appendChild(item);
    }
  });
  catSection.appendChild(catList);
  sidebar.appendChild(catSection);

  // Sort options
  const sortSection = el('.sidebar-section');
  const sortTitle = el('h3.section-title', 'Sort By');
  sortSection.appendChild(sortTitle);

  const sortOptions = el('.sort-options');
  const sorts = [
    { id: 'updated', label: '📅 Last Updated' },
    { id: 'created', label: '🕐 Date Created' },
    { id: 'title', label: '🔤 Title' }
  ];

  for (const sort of sorts) {
    const btn = el('button.sort-btn');
    btn.textContent = sort.label;
    btn.addEventListener('click', () => noteActions.setSortBy(sort.id));
    effect(() => {
      btn.className = `sort-btn${notesStore.sortBy.get() === sort.id ? ' active' : ''}`;
    });
    sortOptions.appendChild(btn);
  }
  sortSection.appendChild(sortOptions);
  sidebar.appendChild(sortSection);

  // Stats
  const statsSection = el('.sidebar-section');
  const statsTitle = el('h3.section-title', 'Statistics');
  statsSection.appendChild(statsTitle);

  const statsContent = el('.stats-content');
  effect(() => {
    const count = noteGetters.noteCount.get();
    const notes = notesStore.notes.get();
    const pinned = notes.filter(n => n.pinned).length;

    statsContent.innerHTML = `
      <div class="stat-item"><span class="stat-label">Total Notes</span><span class="stat-value">${count}</span></div>
      <div class="stat-item"><span class="stat-label">Pinned</span><span class="stat-value">${pinned}</span></div>
    `;
  });
  statsSection.appendChild(statsContent);
  sidebar.appendChild(statsSection);

  // Store actions
  const actionsSection = el('.sidebar-section');
  const actionsTitle = el('h3.section-title', 'Store Actions');
  actionsSection.appendChild(actionsTitle);

  const actionBtns = el('.store-actions');

  const resetBtn = el('button.action-btn', '🔄 Reset Store');
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset all notes? This cannot be undone.')) {
      notesStore.$reset();
    }
  });
  actionBtns.appendChild(resetBtn);

  const clearBtn = el('button.action-btn.danger', '🗑️ Clear All');
  clearBtn.addEventListener('click', () => {
    if (confirm('Delete all notes? This cannot be undone.')) {
      noteActions.clearAll();
    }
  });
  actionBtns.appendChild(clearBtn);

  const exportBtn = el('button.action-btn', '📤 Export State');
  exportBtn.addEventListener('click', () => {
    const state = notesStore.$getState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  });
  actionBtns.appendChild(exportBtn);

  actionsSection.appendChild(actionBtns);
  sidebar.appendChild(actionsSection);

  return sidebar;
}

function NotesList() {
  const container = el('.notes-list');

  effect(() => {
    container.innerHTML = '';
    const notes = noteGetters.filteredNotes.get();
    const selectedId = notesStore.selectedNoteId.get();

    if (notes.length === 0) {
      const empty = el('.empty-state');
      empty.innerHTML = `
        <div class="empty-icon">📭</div>
        <p>No notes found</p>
        <button class="btn primary" id="createFirstNote">Create your first note</button>
      `;
      container.appendChild(empty);
      container.querySelector('#createFirstNote')?.addEventListener('click', () => noteActions.addNote());
      return;
    }

    for (const note of notes) {
      const item = el(`.note-item${note.id === selectedId ? '.selected' : ''}${note.pinned ? '.pinned' : ''}`);
      const cat = getCategoryInfo(note.category);

      item.innerHTML = `
        <div class="note-header">
          <span class="note-category" style="color: ${cat.color}">${cat.icon}</span>
          <span class="note-title">${note.title || 'Untitled'}</span>
          ${note.pinned ? '<span class="pin-indicator">📌</span>' : ''}
        </div>
        <div class="note-preview">${note.content.substring(0, 100) || 'No content'}</div>
        <div class="note-meta">
          <span class="note-date">${formatDate(note.updated)}</span>
        </div>
      `;

      item.addEventListener('click', () => noteActions.selectNote(note.id));

      // Context menu
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        noteActions.togglePin(note.id);
      });

      container.appendChild(item);
    }
  });

  return container;
}

function NoteEditor() {
  const editor = el('.note-editor');

  effect(() => {
    editor.innerHTML = '';
    const note = noteGetters.selectedNote.get();

    if (!note) {
      const placeholder = el('.editor-placeholder');
      placeholder.innerHTML = `
        <div class="placeholder-icon">📝</div>
        <p>Select a note to edit</p>
        <p class="hint">or create a new one</p>
      `;
      editor.appendChild(placeholder);
      return;
    }

    const cat = getCategoryInfo(note.category);

    // Toolbar
    const toolbar = el('.editor-toolbar');

    // Category selector
    const catSelect = el('select.category-select');
    for (const c of CATEGORIES) {
      const opt = el('option');
      opt.value = c.id;
      opt.textContent = `${c.icon} ${c.name}`;
      opt.selected = c.id === note.category;
      catSelect.appendChild(opt);
    }
    catSelect.addEventListener('change', (e) => {
      noteActions.updateNote(note.id, { category: e.target.value });
    });
    toolbar.appendChild(catSelect);

    // Pin button
    const pinBtn = el(`button.toolbar-btn${note.pinned ? '.active' : ''}`, note.pinned ? '📌 Pinned' : '📌 Pin');
    pinBtn.addEventListener('click', () => noteActions.togglePin(note.id));
    toolbar.appendChild(pinBtn);

    // Delete button
    const deleteBtn = el('button.toolbar-btn.danger', '🗑️ Delete');
    deleteBtn.addEventListener('click', () => {
      if (confirm('Delete this note?')) {
        noteActions.deleteNote(note.id);
      }
    });
    toolbar.appendChild(deleteBtn);

    editor.appendChild(toolbar);

    // Title input
    const titleInput = el('input.note-title-input[type=text][placeholder="Note title..."]');
    titleInput.value = note.title;
    titleInput.addEventListener('input', (e) => {
      noteActions.updateNote(note.id, { title: e.target.value });
    });
    editor.appendChild(titleInput);

    // Content textarea
    const contentArea = el('textarea.note-content-area[placeholder="Start writing..."]');
    contentArea.value = note.content;
    contentArea.style.fontSize = `${settingsModule.ui.editorFontSize.get()}px`;
    contentArea.addEventListener('input', (e) => {
      noteActions.updateNote(note.id, { content: e.target.value });
    });
    editor.appendChild(contentArea);

    // Footer with metadata
    const footer = el('.editor-footer');
    footer.innerHTML = `
      <span>Created: ${new Date(note.created).toLocaleString()}</span>
      <span>Updated: ${new Date(note.updated).toLocaleString()}</span>
    `;
    editor.appendChild(footer);
  });

  return editor;
}

function App() {
  const app = el('.app');

  // Apply theme
  effect(() => {
    const theme = settingsModule.ui.theme.get();
    document.body.className = `theme-${theme}`;
  });

  app.appendChild(Header());

  const main = el('.main-content');
  main.appendChild(Sidebar());

  const content = el('.content-area');
  content.appendChild(NotesList());
  content.appendChild(NoteEditor());
  main.appendChild(content);

  app.appendChild(main);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') {
        e.preventDefault();
        notesStore.$undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        notesStore.$redo();
      } else if (e.key === 'n') {
        e.preventDefault();
        noteActions.addNote();
      }
    }
  });

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --danger: #ef4444;
  --success: #10b981;
  --warning: #f59e0b;
}

.theme-dark {
  --bg: #0f172a;
  --bg-light: #1e293b;
  --bg-lighter: #334155;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --border: #334155;
}

.theme-light {
  --bg: #f8fafc;
  --bg-light: #ffffff;
  --bg-lighter: #f1f5f9;
  --text: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.brand .logo {
  font-size: 1.5em;
}

.brand .title {
  font-size: 1.2em;
  background: linear-gradient(135deg, var(--primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.search-container {
  flex: 1;
  max-width: 400px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.5;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9em;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg);
  border-radius: 8px;
  font-size: 1.1em;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: var(--bg-lighter);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.primary {
  background: var(--primary);
  color: white;
}

.btn.primary:hover {
  background: var(--primary-dark);
}

/* Main Content */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--bg-light);
  border-right: 1px solid var(--border);
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-title {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background: var(--bg-lighter);
}

.category-item.active {
  background: rgba(99, 102, 241, 0.15);
  color: var(--primary);
}

.cat-icon {
  font-size: 1.1em;
}

.cat-name {
  flex: 1;
  font-size: 0.9em;
}

.cat-count {
  font-size: 0.8em;
  color: var(--text-muted);
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 10px;
}

.sort-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sort-btn {
  padding: 8px 12px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 0.85em;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-btn:hover {
  background: var(--bg-lighter);
  color: var(--text);
}

.sort-btn.active {
  background: var(--bg-lighter);
  color: var(--primary);
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9em;
}

.stat-label {
  color: var(--text-muted);
}

.stat-value {
  font-weight: 600;
}

.store-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-lighter);
}

.action-btn.danger {
  color: var(--danger);
  border-color: var(--danger);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Content Area */
.content-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Notes List */
.notes-list {
  width: 320px;
  background: var(--bg);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-item {
  padding: 16px;
  background: var(--bg-light);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.note-item:hover {
  background: var(--bg-lighter);
}

.note-item.selected {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.note-item.pinned {
  border-left: 3px solid var(--warning);
}

.note-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.note-category {
  font-size: 0.9em;
}

.note-title {
  flex: 1;
  font-weight: 600;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin-indicator {
  font-size: 0.8em;
}

.note-preview {
  font-size: 0.85em;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.note-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75em;
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Note Editor */
.note-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
}

.editor-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
}

.placeholder-icon {
  font-size: 5em;
  margin-bottom: 16px;
  opacity: 0.3;
}

.hint {
  font-size: 0.9em;
  opacity: 0.7;
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.category-select {
  padding: 8px 12px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.9em;
  cursor: pointer;
}

.toolbar-btn {
  padding: 8px 16px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: var(--bg-lighter);
}

.toolbar-btn.active {
  background: var(--warning);
  color: white;
  border-color: var(--warning);
}

.toolbar-btn.danger {
  color: var(--danger);
}

.toolbar-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.note-title-input {
  width: 100%;
  padding: 12px 0;
  background: none;
  border: none;
  color: var(--text);
  font-size: 1.8em;
  font-weight: 600;
  margin-bottom: 16px;
}

.note-title-input:focus {
  outline: none;
}

.note-title-input::placeholder {
  color: var(--text-muted);
}

.note-content-area {
  flex: 1;
  width: 100%;
  padding: 16px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
  font-size: 14px;
  line-height: 1.8;
  resize: none;
  font-family: inherit;
}

.note-content-area:focus {
  outline: none;
  border-color: var(--primary);
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 0.8em;
  color: var(--text-muted);
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    width: 220px;
  }

  .notes-list {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .content-area {
    flex-direction: column;
  }

  .notes-list {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
    max-height: 300px;
  }
}
`;

const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Initialize
// =============================================================================

mount('#app', App());

// Add some sample notes if none exist
if (notesStore.notes.peek().length === 0) {
  batch(() => {
    noteActions.addNote(
      'Welcome to Pulse Notes!',
      'This is a demo app showcasing the Pulse Store features:\n\n• createStore with localStorage persistence\n• createActions for state mutations\n• createGetters for computed values\n• historyPlugin for undo/redo (Ctrl+Z / Ctrl+Y)\n• Module store for settings\n\nTry creating, editing, and deleting notes. Your changes are automatically saved!',
      'ideas'
    );
    noteActions.addNote(
      'Store Features',
      '1. Persistence: Notes are saved to localStorage\n2. Actions: addNote, updateNote, deleteNote, togglePin\n3. Getters: filteredNotes, selectedNote, categoryStats\n4. Plugins: historyPlugin (undo/redo), loggerPlugin\n5. Modules: UI settings (theme, font size)',
      'work'
    );
    noteActions.addNote(
      'Keyboard Shortcuts',
      '• Ctrl+N: New note\n• Ctrl+Z: Undo\n• Ctrl+Y: Redo\n• Right-click note: Toggle pin',
      'tasks'
    );
  });
}

console.log('📝 Pulse Store Demo loaded!');
console.log('Store state:', notesStore.$getState());
