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
// Navigation Data (with translation keys for reactivity)
// =============================================================================

/**
 * Navigation structure with translation keys (for reactive updates)
 * Use these with t() in effects to get translated labels
 */
export const navStructure = [
  { path: '/', labelKey: 'nav.home' },
  {
    labelKey: 'nav.learn',
    children: [
      { path: '/getting-started', labelKey: 'nav.gettingStarted', descKey: 'nav.gettingStartedDesc' },
      { path: '/core-concepts', labelKey: 'nav.coreConcepts', descKey: 'nav.coreConceptsDesc' }
    ]
  },
  {
    labelKey: 'nav.reference',
    children: [
      { path: '/api-reference', labelKey: 'nav.apiReference', descKey: 'nav.apiReferenceDesc' },
      { path: '/http', labelKey: 'nav.http', descKey: 'nav.httpDesc' },
      { path: '/accessibility', labelKey: 'nav.accessibility', descKey: 'nav.accessibilityDesc' },
      { path: '/debugging', labelKey: 'nav.debugging', descKey: 'nav.debuggingDesc' },
      { path: '/security', labelKey: 'nav.security', descKey: 'nav.securityDesc' },
      { path: '/performance', labelKey: 'nav.performance', descKey: 'nav.performanceDesc' },
      { path: '/benchmarks', labelKey: 'nav.benchmarks', descKey: 'nav.benchmarksDesc' },
      { path: '/error-handling', labelKey: 'nav.errorHandling', descKey: 'nav.errorHandlingDesc' },
      { path: '/mobile', labelKey: 'nav.mobile', descKey: 'nav.mobileDesc' }
    ]
  },
  {
    labelKey: 'nav.examples',
    children: [
      { path: '/examples', labelKey: 'nav.examplesPage', descKey: 'nav.examplesDesc' },
      { path: '/playground', labelKey: 'nav.playground', descKey: 'nav.playgroundDesc' }
    ]
  },
  {
    labelKey: 'nav.migration',
    children: [
      { path: '/migration-react', labelKey: 'nav.migrationReact', descKey: 'nav.migrationReactDesc' },
      { path: '/migration-angular', labelKey: 'nav.migrationAngular', descKey: 'nav.migrationAngularDesc' },
      { path: '/migration-vue', labelKey: 'nav.migrationVue', descKey: 'nav.migrationVueDesc' }
    ]
  }
];

/**
 * Flat navigation structure for mobile menu (with translation keys)
 */
export const navStructureFlat = [
  { path: '/', labelKey: 'nav.home' },
  { path: '/getting-started', labelKey: 'nav.gettingStarted' },
  { path: '/core-concepts', labelKey: 'nav.coreConcepts' },
  { path: '/api-reference', labelKey: 'nav.apiReference' },
  { path: '/http', labelKey: 'nav.http' },
  { path: '/accessibility', labelKey: 'nav.accessibility' },
  { path: '/debugging', labelKey: 'nav.debugging' },
  { path: '/security', labelKey: 'nav.security' },
  { path: '/performance', labelKey: 'nav.performance' },
  { path: '/benchmarks', labelKey: 'nav.benchmarks' },
  { path: '/error-handling', labelKey: 'nav.errorHandling' },
  { path: '/mobile', labelKey: 'nav.mobile' },
  { path: '/examples', labelKey: 'nav.examplesPage' },
  { path: '/playground', labelKey: 'nav.playground' },
  { path: '/migration-react', labelKey: 'nav.migrationReact' },
  { path: '/migration-angular', labelKey: 'nav.migrationAngular' },
  { path: '/migration-vue', labelKey: 'nav.migrationVue' }
];

/**
 * Get flat navigation for mobile menu (translated)
 * @deprecated Use navStructureFlat with t() in effects for reactive updates
 */
export function getNavigationFlat() {
  return navStructureFlat.map(item => ({
    path: item.path,
    label: t(item.labelKey)
  }));
}

/**
 * Get grouped navigation for desktop with dropdowns (translated)
 * @deprecated Use navStructure with t() in effects for reactive updates
 */
export function getNavigation() {
  return navStructure.map(item => {
    if (item.children) {
      return {
        label: t(item.labelKey),
        children: item.children.map(child => ({
          path: child.path,
          label: t(child.labelKey),
          desc: t(child.descKey)
        }))
      };
    }
    return { path: item.path, label: t(item.labelKey) };
  });
}

// Current version - automatically updated by npm version script
export const version = '1.7.13';

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
