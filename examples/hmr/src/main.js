/**
 * Pulse HMR Demo - Main Entry Point
 *
 * This demonstrates HMR with .pulse components.
 * The HMR setup must be in JavaScript to use the HMR APIs.
 *
 * Try this:
 * 1. Run `npm run dev` to start the dev server
 * 2. Interact with the app (increment counter, add notes, change theme)
 * 3. Edit any .pulse file or this file
 * 4. Save - your state is preserved!
 */

import { pulse, mount } from '/runtime/index.js';
import { createHMRContext } from '/runtime/hmr.js';
import App from './components/App.pulse';

// =============================================================================
// HMR Context Setup
// =============================================================================

const hmr = createHMRContext(import.meta.url);

// =============================================================================
// Preserved State (survives HMR updates)
// =============================================================================

const count = hmr.preservePulse('count', 0);
const notes = hmr.preservePulse('notes', []);
const theme = hmr.preservePulse('theme', 'purple');
const inputValue = hmr.preservePulse('input', '');
const hmrCount = hmr.preservePulse('hmrCount', 0);

// Regular pulse (NOT preserved - resets on HMR for comparison)
const notPreserved = pulse(0);

// =============================================================================
// Theme Configuration
// =============================================================================

const themes = {
  purple: { primary: '#8b5cf6', bg: '#1a1625', card: '#2d2640' },
  blue: { primary: '#3b82f6', bg: '#0f172a', card: '#1e293b' },
  green: { primary: '#22c55e', bg: '#0f1f17', card: '#1a3328' },
  orange: { primary: '#f97316', bg: '#1f1410', card: '#3d2517' },
  pink: { primary: '#ec4899', bg: '#1f0f18', card: '#3d1d30' }
};

// =============================================================================
// Actions (passed to components)
// =============================================================================

const actions = {
  increment: () => count.update(n => n + 1),
  decrement: () => count.update(n => n - 1),

  incrementNotPreserved: () => notPreserved.update(n => n + 1),

  cycleTheme: () => {
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(theme.get());
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    theme.set(themeKeys[nextIndex]);
  },

  addNote: () => {
    const text = inputValue.get().trim();
    if (!text) return;
    notes.update(list => [...list, {
      id: Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString()
    }]);
    inputValue.set('');
  },

  deleteNote: (id) => {
    notes.update(list => list.filter(n => n.id !== id));
  },

  setInput: (value) => inputValue.set(value)
};

// =============================================================================
// Inject Global Styles
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

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  transition: background 0.3s;
}
`;

if (!document.getElementById('hmr-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'hmr-styles';
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

// =============================================================================
// Mount App with HMR
// =============================================================================

hmr.setup(() => {
  // Apply theme CSS variables
  const currentTheme = themes[theme.get()];
  document.body.style.setProperty('--primary', currentTheme.primary);
  document.body.style.setProperty('--bg', currentTheme.bg);
  document.body.style.setProperty('--card', currentTheme.card);

  // Mount the App component with all state and actions
  mount('#app', App.render({
    props: {
      // State (as pulses for reactivity)
      count,
      notes,
      theme,
      inputValue,
      hmrCount,
      notPreserved,
      // Config
      themes,
      // Actions
      ...actions
    }
  }));

  console.log('Pulse HMR Demo loaded!');
});

// Increment HMR counter on reload
if (import.meta.hot) {
  hmrCount.update(n => n + 1);
  console.log(`HMR Update #${hmrCount.get()}`);
}

// Accept HMR updates
hmr.accept();
