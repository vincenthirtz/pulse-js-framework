/**
 * Pulse HMR Demo
 *
 * This example demonstrates Hot Module Replacement with state preservation.
 *
 * Try this:
 * 1. Run `npm run dev` to start the dev server
 * 2. Interact with the app (increment counter, add notes, change color)
 * 3. Edit this file (change a label, color, or add a feature)
 * 4. Save the file - your state is preserved!
 *
 * Key HMR features demonstrated:
 * - preservePulse(): State survives module replacement
 * - setup(): Effects are tracked and cleaned up
 * - accept(): Module accepts HMR updates
 */

import {
  pulse,
  effect,
  el,
  mount,
  on
} from '/runtime/index.js';

import { createHMRContext } from '/runtime/hmr.js';

// =============================================================================
// HMR Context Setup
// =============================================================================

// Create HMR context for this module
// In production (no import.meta.hot), this returns a noop context
const hmr = createHMRContext(import.meta.url);

// =============================================================================
// State (Preserved across HMR)
// =============================================================================

// These values survive HMR updates!
// Try: increment the counter, then edit this file and save
const count = hmr.preservePulse('count', 0);
const notes = hmr.preservePulse('notes', []);
const theme = hmr.preservePulse('theme', 'purple');
const inputValue = hmr.preservePulse('input', '');

// Track HMR updates for demo purposes
const hmrCount = hmr.preservePulse('hmrCount', 0);

// Regular pulse (NOT preserved - resets on HMR)
const notPreserved = pulse(0);

// =============================================================================
// Theme Colors
// =============================================================================

const themes = {
  purple: { primary: '#8b5cf6', bg: '#1a1625', card: '#2d2640' },
  blue: { primary: '#3b82f6', bg: '#0f172a', card: '#1e293b' },
  green: { primary: '#22c55e', bg: '#0f1f17', card: '#1a3328' },
  orange: { primary: '#f97316', bg: '#1f1410', card: '#3d2517' },
  pink: { primary: '#ec4899', bg: '#1f0f18', card: '#3d1d30' }
};

// =============================================================================
// Actions
// =============================================================================

function increment() {
  count.update(n => n + 1);
}

function decrement() {
  count.update(n => n - 1);
}

function addNote() {
  const text = inputValue.get().trim();
  if (!text) return;

  notes.update(list => [...list, {
    id: Date.now(),
    text,
    timestamp: new Date().toLocaleTimeString()
  }]);
  inputValue.set('');
}

function deleteNote(id) {
  notes.update(list => list.filter(n => n.id !== id));
}

function cycleTheme() {
  const themeKeys = Object.keys(themes);
  const currentIndex = themeKeys.indexOf(theme.get());
  const nextIndex = (currentIndex + 1) % themeKeys.length;
  theme.set(themeKeys[nextIndex]);
}

function incrementNotPreserved() {
  notPreserved.update(n => n + 1);
}

// =============================================================================
// Components
// =============================================================================

function HMRIndicator() {
  const container = el('.hmr-indicator');

  const badge = el('.hmr-badge');
  effect(() => {
    const updates = hmrCount.get();
    badge.textContent = `HMR Updates: ${updates}`;
    if (updates > 0) {
      badge.classList.add('active');
      setTimeout(() => badge.classList.remove('active'), 500);
    }
  });
  container.appendChild(badge);

  const hint = el('.hmr-hint', 'Edit this file and save to see HMR in action!');
  container.appendChild(hint);

  return container;
}

function Counter() {
  const container = el('.card');

  container.appendChild(el('h2', 'Counter (Preserved)'));

  const display = el('.counter-display');
  effect(() => {
    display.textContent = count.get();
  });
  container.appendChild(display);

  const buttons = el('.button-group');

  const decBtn = el('button.btn', '-');
  on(decBtn, 'click', decrement);
  buttons.appendChild(decBtn);

  const incBtn = el('button.btn.primary', '+');
  on(incBtn, 'click', increment);
  buttons.appendChild(incBtn);

  container.appendChild(buttons);

  const info = el('.info', 'This value survives HMR updates');
  container.appendChild(info);

  return container;
}

function NotPreservedCounter() {
  const container = el('.card.muted');

  container.appendChild(el('h2', 'Counter (NOT Preserved)'));

  const display = el('.counter-display.small');
  effect(() => {
    display.textContent = notPreserved.get();
  });
  container.appendChild(display);

  const btn = el('button.btn', 'Increment');
  on(btn, 'click', incrementNotPreserved);
  container.appendChild(btn);

  const info = el('.info.warning', 'This resets to 0 on every HMR update');
  container.appendChild(info);

  return container;
}

function ThemeSwitcher() {
  const container = el('.card');

  container.appendChild(el('h2', 'Theme (Preserved)'));

  const preview = el('.theme-preview');
  effect(() => {
    const currentTheme = themes[theme.get()];
    preview.style.background = currentTheme.primary;
    preview.textContent = theme.get();
  });
  container.appendChild(preview);

  const btn = el('button.btn', 'Cycle Theme');
  on(btn, 'click', cycleTheme);
  container.appendChild(btn);

  return container;
}

function Notes() {
  const container = el('.card.wide');

  container.appendChild(el('h2', 'Notes (Preserved)'));

  // Input
  const inputRow = el('.input-row');

  const input = el('input[type=text][placeholder="Add a note..."]');
  effect(() => {
    input.value = inputValue.get();
  });
  on(input, 'input', (e) => inputValue.set(e.target.value));
  on(input, 'keydown', (e) => {
    if (e.key === 'Enter') addNote();
  });
  inputRow.appendChild(input);

  const addBtn = el('button.btn.primary', 'Add');
  on(addBtn, 'click', addNote);
  inputRow.appendChild(addBtn);

  container.appendChild(inputRow);

  // Notes list
  const list = el('.notes-list');
  effect(() => {
    list.innerHTML = '';
    const noteList = notes.get();

    if (noteList.length === 0) {
      const empty = el('.empty', 'No notes yet. Add one above!');
      list.appendChild(empty);
    } else {
      for (const note of noteList) {
        const item = el('.note-item');

        const content = el('.note-content');
        content.appendChild(el('.note-text', note.text));
        content.appendChild(el('.note-time', note.timestamp));
        item.appendChild(content);

        const deleteBtn = el('button.delete-btn', '×');
        on(deleteBtn, 'click', () => deleteNote(note.id));
        item.appendChild(deleteBtn);

        list.appendChild(item);
      }
    }
  });
  container.appendChild(list);

  return container;
}

function StateDebug() {
  const container = el('.card.debug');

  container.appendChild(el('h2', 'State Debug'));

  const code = el('pre.state-dump');
  effect(() => {
    code.textContent = JSON.stringify({
      count: count.get(),
      notes: notes.get().length,
      theme: theme.get(),
      hmrUpdates: hmrCount.get(),
      notPreserved: notPreserved.get()
    }, null, 2);
  });
  container.appendChild(code);

  return container;
}

function App() {
  const app = el('.app');

  // Apply theme
  effect(() => {
    const currentTheme = themes[theme.get()];
    document.body.style.setProperty('--primary', currentTheme.primary);
    document.body.style.setProperty('--bg', currentTheme.bg);
    document.body.style.setProperty('--card', currentTheme.card);
  });

  // Header
  const header = el('header');
  header.appendChild(el('h1', 'Pulse HMR Demo'));
  header.appendChild(el('p.subtitle', 'Hot Module Replacement with State Preservation'));
  app.appendChild(header);

  // HMR Indicator
  app.appendChild(HMRIndicator());

  // Main content
  const grid = el('.grid');
  grid.appendChild(Counter());
  grid.appendChild(NotPreservedCounter());
  grid.appendChild(ThemeSwitcher());
  grid.appendChild(StateDebug());
  app.appendChild(grid);

  // Notes (full width)
  app.appendChild(Notes());

  // Footer
  const footer = el('footer');
  footer.appendChild(el('p', 'Built with Pulse Framework'));
  footer.appendChild(el('p.tip', 'Tip: Try editing styles, labels, or adding features - state persists!'));
  app.appendChild(footer);

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --primary: #8b5cf6;
  --bg: #1a1625;
  --card: #2d2640;
  --text: #f0f0f0;
  --text-muted: #888;
  --border: #3d3555;
  --success: #22c55e;
  --warning: #f59e0b;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  transition: background 0.3s;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

header {
  text-align: center;
  margin-bottom: 24px;
}

header h1 {
  font-size: 2.5em;
  background: linear-gradient(135deg, var(--primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--text-muted);
  margin-top: 8px;
}

/* HMR Indicator */
.hmr-indicator {
  background: var(--card);
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: center;
}

.hmr-badge {
  display: inline-block;
  background: var(--primary);
  color: white;
  padding: 6px 16px;
  border-radius: 100px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.hmr-badge.active {
  transform: scale(1.1);
  box-shadow: 0 0 20px var(--primary);
}

.hmr-hint {
  color: var(--text-muted);
  font-size: 0.9em;
  margin-top: 8px;
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

/* Cards */
.card {
  background: var(--card);
  border-radius: 16px;
  padding: 24px;
  transition: background 0.3s;
}

.card.wide {
  grid-column: 1 / -1;
}

.card.muted {
  opacity: 0.7;
}

.card.debug {
  font-size: 0.85em;
}

.card h2 {
  font-size: 1.1em;
  color: var(--text-muted);
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Counter */
.counter-display {
  font-size: 4em;
  font-weight: 700;
  text-align: center;
  color: var(--primary);
  margin: 16px 0;
}

.counter-display.small {
  font-size: 2.5em;
}

/* Buttons */
.button-group {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  font-size: 1.1em;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: var(--border);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--text-muted);
}

.btn.primary {
  background: var(--primary);
  color: white;
}

.btn.primary:hover {
  filter: brightness(1.1);
}

/* Info text */
.info {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85em;
  margin-top: 16px;
}

.info.warning {
  color: var(--warning);
}

/* Theme preview */
.theme-preview {
  width: 100%;
  padding: 24px;
  border-radius: 8px;
  text-align: center;
  color: white;
  font-weight: 600;
  text-transform: capitalize;
  margin-bottom: 16px;
}

/* Notes */
.input-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.input-row input {
  flex: 1;
  padding: 12px 16px;
  font-size: 1em;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  transition: border-color 0.2s;
}

.input-row input:focus {
  outline: none;
  border-color: var(--primary);
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.note-item {
  display: flex;
  align-items: center;
  background: var(--bg);
  padding: 12px 16px;
  border-radius: 8px;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.note-content {
  flex: 1;
}

.note-text {
  font-weight: 500;
}

.note-time {
  font-size: 0.8em;
  color: var(--text-muted);
}

.delete-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.5em;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #ef4444;
  color: white;
}

.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 24px;
}

/* State debug */
.state-dump {
  background: var(--bg);
  padding: 16px;
  border-radius: 8px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 0.9em;
  color: var(--success);
  overflow-x: auto;
}

/* Footer */
footer {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
}

.tip {
  font-size: 0.85em;
  margin-top: 8px;
}

/* Mobile */
@media (max-width: 600px) {
  .app {
    padding: 16px;
  }

  header h1 {
    font-size: 1.8em;
  }

  .counter-display {
    font-size: 3em;
  }
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// HMR Setup & Mount
// =============================================================================

// Track effects for cleanup during HMR
hmr.setup(() => {
  // Mount the app
  mount('#app', App());

  // Log for demo purposes
  console.log('Pulse HMR Demo loaded!');
  console.log('State preserved:', {
    count: count.get(),
    notes: notes.get().length,
    theme: theme.get()
  });
});

// Increment HMR counter on reload (only in dev mode)
if (import.meta.hot) {
  hmrCount.update(n => n + 1);
  console.log(`HMR Update #${hmrCount.get()}`);
}

// Accept HMR updates
hmr.accept();
