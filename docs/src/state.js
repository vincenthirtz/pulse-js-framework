/**
 * Pulse Documentation - State Management & Router
 */

import { pulse, effect } from '/runtime/index.js';
import { createRouter } from '/runtime/router.js';

// =============================================================================
// Theme State
// =============================================================================

const savedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('pulse-docs-theme') : null;
export const theme = pulse(savedTheme || 'dark');

// Persist theme changes
effect(() => {
  const currentTheme = theme.get();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pulse-docs-theme', currentTheme);
  }
  document.documentElement.setAttribute('data-theme', currentTheme);
});

export function toggleTheme() {
  theme.update(t => t === 'dark' ? 'light' : 'dark');
}

// =============================================================================
// Mobile Menu State
// =============================================================================

export const mobileMenuOpen = pulse(false);

// =============================================================================
// Navigation Data
// =============================================================================

// Flat navigation for mobile menu
export const navigationFlat = [
  { path: '/', label: '🏠 Home' },
  { path: '/getting-started', label: '🚀 Getting Started' },
  { path: '/core-concepts', label: '💡 Core Concepts' },
  { path: '/api-reference', label: '📖 API Reference' },
  { path: '/debugging', label: '🔍 Debugging' },
  { path: '/mobile', label: '📱 Mobile' },
  { path: '/examples', label: '✨ Examples' },
  { path: '/playground', label: '🎮 Playground' }
];

// Grouped navigation for desktop with dropdowns
export const navigation = [
  { path: '/', label: '🏠 Home' },
  {
    label: '📚 Learn',
    children: [
      { path: '/getting-started', label: '🚀 Getting Started', desc: 'Installation & first steps' },
      { path: '/core-concepts', label: '💡 Core Concepts', desc: 'Reactivity, DOM, routing' }
    ]
  },
  {
    label: '📖 Reference',
    children: [
      { path: '/api-reference', label: '📖 API Reference', desc: 'Complete API documentation' },
      { path: '/debugging', label: '🔍 Debugging', desc: 'Tools & troubleshooting' },
      { path: '/mobile', label: '📱 Mobile', desc: 'Android & iOS apps' }
    ]
  },
  {
    label: '✨ Examples',
    children: [
      { path: '/examples', label: '✨ Examples', desc: 'Sample applications' },
      { path: '/playground', label: '🎮 Playground', desc: 'Interactive sandbox' }
    ]
  }
];

// Current version - automatically updated by npm version script
export const version = '1.5.0';

// =============================================================================
// Router
// =============================================================================

export let router = null;

export function initRouter(routes) {
  router = createRouter({
    routes,
    mode: 'history'
  });

  // Add after navigation hook to close mobile menu and scroll to top
  router.afterEach(() => {
    mobileMenuOpen.set(false);
    window.scrollTo(0, 0);
  });

  // Global API for onclick handlers in HTML
  window.docs = {
    navigate: (path) => router.navigate(path)
  };

  return router;
}

export function navigate(path) {
  if (router) {
    router.navigate(path);
  }
}
