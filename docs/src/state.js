/**
 * Pulse Documentation - State Management & Router
 */

import { pulse, effect } from '/runtime/index.js';
import { createRouter } from '/runtime/router.js';
import { locale, localePath, isValidLocale, defaultLocale, t } from './i18n/index.js';

// Re-export i18n for convenience
export { locale, localePath, t, setLocale, getPathWithoutLocale, translations } from './i18n/index.js';
export { locales, isValidLocale, defaultLocale } from './i18n/locales.js';

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
  theme.update(current => current === 'dark' ? 'light' : 'dark');
}

// =============================================================================
// Mobile Menu State
// =============================================================================

export const mobileMenuOpen = pulse(false);

// =============================================================================
// Navigation Data (with translation functions)
// =============================================================================

/**
 * Get flat navigation for mobile menu (translated)
 */
export function getNavigationFlat() {
  return [
    { path: '/', label: t('nav.home') },
    { path: '/getting-started', label: t('nav.gettingStarted') },
    { path: '/core-concepts', label: t('nav.coreConcepts') },
    { path: '/api-reference', label: t('nav.apiReference') },
    { path: '/debugging', label: t('nav.debugging') },
    { path: '/accessibility', label: t('nav.accessibility') },
    { path: '/security', label: t('nav.security') },
    { path: '/performance', label: t('nav.performance') },
    { path: '/error-handling', label: t('nav.errorHandling') },
    { path: '/mobile', label: t('nav.mobile') },
    { path: '/examples', label: t('nav.examplesPage') },
    { path: '/playground', label: t('nav.playground') }
  ];
}

/**
 * Get grouped navigation for desktop with dropdowns (translated)
 */
export function getNavigation() {
  return [
    { path: '/', label: t('nav.home') },
    {
      label: t('nav.learn'),
      children: [
        { path: '/getting-started', label: t('nav.gettingStarted'), desc: t('nav.gettingStartedDesc') },
        { path: '/core-concepts', label: t('nav.coreConcepts'), desc: t('nav.coreConceptsDesc') }
      ]
    },
    {
      label: t('nav.reference'),
      children: [
        { path: '/api-reference', label: t('nav.apiReference'), desc: t('nav.apiReferenceDesc') },
        { path: '/debugging', label: t('nav.debugging'), desc: t('nav.debuggingDesc') },
        { path: '/accessibility', label: t('nav.accessibility'), desc: t('nav.accessibilityDesc') },
        { path: '/security', label: t('nav.security'), desc: t('nav.securityDesc') },
        { path: '/performance', label: t('nav.performance'), desc: t('nav.performanceDesc') },
        { path: '/error-handling', label: t('nav.errorHandling'), desc: t('nav.errorHandlingDesc') },
        { path: '/mobile', label: t('nav.mobile'), desc: t('nav.mobileDesc') }
      ]
    },
    {
      label: t('nav.examples'),
      children: [
        { path: '/examples', label: t('nav.examplesPage'), desc: t('nav.examplesDesc') },
        { path: '/playground', label: t('nav.playground'), desc: t('nav.playgroundDesc') }
      ]
    }
  ];
}

// Legacy static exports (for backwards compatibility)
export const navigationFlat = [
  { path: '/', label: '🏠 Home' },
  { path: '/getting-started', label: '🚀 Getting Started' },
  { path: '/core-concepts', label: '💡 Core Concepts' },
  { path: '/api-reference', label: '📖 API Reference' },
  { path: '/debugging', label: '🔍 Debugging' },
  { path: '/accessibility', label: '♿ Accessibility' },
  { path: '/security', label: '🔒 Security' },
  { path: '/performance', label: '⚡ Performance' },
  { path: '/error-handling', label: '🛡️ Error Handling' },
  { path: '/mobile', label: '📱 Mobile' },
  { path: '/examples', label: '✨ Examples' },
  { path: '/playground', label: '🎮 Playground' }
];

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
      { path: '/accessibility', label: '♿ Accessibility', desc: 'A11y features & best practices' },
      { path: '/security', label: '🔒 Security', desc: 'XSS prevention & safe patterns' },
      { path: '/performance', label: '⚡ Performance', desc: 'Optimization techniques' },
      { path: '/error-handling', label: '🛡️ Error Handling', desc: 'Error patterns & recovery' },
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
export const version = '1.7.10';

// =============================================================================
// Router
// =============================================================================

export let router = null;

export function initRouter(routes) {
  router = createRouter({
    routes,
    mode: 'history'
  });

  // Sync locale from URL on route change
  router.afterEach(() => {
    mobileMenuOpen.set(false);
    window.scrollTo(0, 0);

    // Update locale from URL if needed
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0 && isValidLocale(pathParts[0])) {
      if (locale.get() !== pathParts[0]) {
        locale.set(pathParts[0]);
      }
    } else if (locale.get() !== defaultLocale) {
      // URL has no locale prefix, set to default
      locale.set(defaultLocale);
    }
  });

  // Global API for onclick handlers in HTML
  window.docs = {
    navigate: (path) => navigateLocale(path)
  };

  return router;
}

/**
 * Navigate to a path with locale prefix
 */
export function navigateLocale(path) {
  if (router) {
    const localizedPath = localePath(path, locale.get());
    router.navigate(localizedPath);
  }
}

/**
 * Navigate without changing locale (for language switcher)
 */
export function navigate(path) {
  if (router) {
    router.navigate(path);
  }
}
