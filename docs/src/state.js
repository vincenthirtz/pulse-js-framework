/**
 * Pulse Documentation - State Management & Router
 */

import { pulse, effect } from '/runtime/index.js';
import { createRouter } from '/runtime/router.js';
import { locale, localePath, isValidLocale, defaultLocale, t } from './i18n/index.js';
import { updateSEO, extractPathForSEO } from './seo.js';

// Page imports (centralized here to avoid duplication)
import { HomePage } from './pages/HomePage.js';
import { GettingStartedPage } from './pages/GettingStartedPage.js';
import { CoreConceptsPage } from './pages/CoreConceptsPage.js';
import { ApiReferencePage } from './pages/ApiReferencePage.js';
import { MobilePage } from './pages/MobilePage.js';
import { ExamplesPage } from './pages/ExamplesPage.js';
import { PlaygroundPage } from './pages/PlaygroundPage.js';
import { ChangelogPage } from './pages/ChangelogPage.js';
import { DebuggingPage } from './pages/DebuggingPage.js';
import { SecurityPage } from './pages/SecurityPage.js';
import { PerformancePage } from './pages/PerformancePage.js';
import { ErrorHandlingPage } from './pages/ErrorHandlingPage.js';
import { HttpPage } from './pages/HttpPage.js';
import { AccessibilityPage } from './pages/AccessibilityPage.js';
import { MigrationReactPage } from './pages/MigrationReactPage.js';
import { MigrationAngularPage } from './pages/MigrationAngularPage.js';
import { MigrationVuePage } from './pages/MigrationVuePage.js';
import { BenchmarksPage } from './pages/BenchmarksPage.js';
import { WebSocketPage } from './pages/WebSocketPage.js';
import { GraphQLPage } from './pages/GraphQLPage.js';
import { ContextPage } from './pages/ContextPage.js';
import { DevToolsPage } from './pages/DevToolsPage.js';
import { SSRPage } from './pages/SSRPage.js';
import { InternalsPage } from './pages/InternalsPage.js';
import { TestingPage } from './pages/TestingPage.js';

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
// Search State
// =============================================================================

export const searchOpen = pulse(false);

// =============================================================================
// Table of Contents State
// =============================================================================

export const tocItems = pulse([]);        // Array of {id, text, level}
export const currentSection = pulse('');  // Currently visible section ID
export const tocExpanded = pulse(false);  // Mobile TOC accordion state

// Desktop TOC sidebar collapsed state (persisted)
const savedTocCollapsed = typeof localStorage !== 'undefined' ? localStorage.getItem('pulse-docs-toc-collapsed') : null;
export const tocSidebarCollapsed = pulse(savedTocCollapsed === 'true');

// Persist TOC collapsed state
effect(() => {
  const isCollapsed = tocSidebarCollapsed.get();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pulse-docs-toc-collapsed', String(isCollapsed));
  }
});

// =============================================================================
// Navigation Data (with translation keys for reactivity)
// =============================================================================

/**
 * Navigation structure with translation keys (for reactive updates)
 * Use these with t() in effects to get translated labels
 */
export const navStructure = [
  { path: '/', labelKey: 'nav.home', handler: HomePage },
  {
    labelKey: 'nav.learn',
    children: [
      { path: '/getting-started', labelKey: 'nav.gettingStarted', descKey: 'nav.gettingStartedDesc', handler: GettingStartedPage },
      { path: '/core-concepts', labelKey: 'nav.coreConcepts', descKey: 'nav.coreConceptsDesc', handler: CoreConceptsPage },
      { path: '/migration-react', labelKey: 'nav.migrationReact', descKey: 'nav.migrationReactDesc', handler: MigrationReactPage },
      { path: '/migration-angular', labelKey: 'nav.migrationAngular', descKey: 'nav.migrationAngularDesc', handler: MigrationAngularPage },
      { path: '/migration-vue', labelKey: 'nav.migrationVue', descKey: 'nav.migrationVueDesc', handler: MigrationVuePage }
    ]
  },
  {
    labelKey: 'nav.reference',
    children: [
      { path: '/api-reference', labelKey: 'nav.apiReference', descKey: 'nav.apiReferenceDesc', handler: ApiReferencePage },
      { path: '/http', labelKey: 'nav.http', descKey: 'nav.httpDesc', handler: HttpPage },
      { path: '/websocket', labelKey: 'nav.websocket', descKey: 'nav.websocketDesc', handler: WebSocketPage },
      { path: '/graphql', labelKey: 'nav.graphql', descKey: 'nav.graphqlDesc', handler: GraphQLPage },
      { path: '/context', labelKey: 'nav.context', descKey: 'nav.contextDesc', handler: ContextPage },
      { path: '/ssr', labelKey: 'nav.ssr', descKey: 'nav.ssrDesc', handler: SSRPage }
    ]
  },
  {
    labelKey: 'nav.tools',
    children: [
      { path: '/devtools', labelKey: 'nav.devtools', descKey: 'nav.devtoolsDesc', handler: DevToolsPage },
      { path: '/internals', labelKey: 'nav.internals', descKey: 'nav.internalsDesc', handler: InternalsPage },
      { path: '/testing', labelKey: 'nav.testing', descKey: 'nav.testingDesc', handler: TestingPage },
      { path: '/debugging', labelKey: 'nav.debugging', descKey: 'nav.debuggingDesc', handler: DebuggingPage },
      { path: '/benchmarks', labelKey: 'nav.benchmarks', descKey: 'nav.benchmarksDesc', handler: BenchmarksPage }
    ]
  },
  {
    labelKey: 'nav.guides',
    children: [
      { path: '/accessibility', labelKey: 'nav.accessibility', descKey: 'nav.accessibilityDesc', handler: AccessibilityPage },
      { path: '/security', labelKey: 'nav.security', descKey: 'nav.securityDesc', handler: SecurityPage },
      { path: '/performance', labelKey: 'nav.performance', descKey: 'nav.performanceDesc', handler: PerformancePage },
      { path: '/error-handling', labelKey: 'nav.errorHandling', descKey: 'nav.errorHandlingDesc', handler: ErrorHandlingPage },
      { path: '/mobile', labelKey: 'nav.mobile', descKey: 'nav.mobileDesc', handler: MobilePage }
    ]
  },
  {
    labelKey: 'nav.examples',
    children: [
      { path: '/examples', labelKey: 'nav.examplesPage', descKey: 'nav.examplesDesc', handler: ExamplesPage },
      { path: '/playground', labelKey: 'nav.playground', descKey: 'nav.playgroundDesc', handler: PlaygroundPage }
    ]
  },
  // Hidden routes (not in navigation but need routing)
  { path: '/changelog', handler: ChangelogPage, hidden: true }
];

/**
 * Derive flat navigation from navStructure (for mobile menu)
 * Excludes hidden routes
 */
export const navStructureFlat = navStructure
  .flatMap(item => {
    if (item.hidden) return [];
    if (item.children) {
      return item.children.map(child => ({
        path: child.path,
        labelKey: child.labelKey
      }));
    }
    return [{ path: item.path, labelKey: item.labelKey }];
  });

/**
 * Derive routes object from navStructure (path -> handler)
 */
export const baseRoutes = navStructure.reduce((routes, item) => {
  if (item.path && item.handler) {
    routes[item.path] = item.handler;
  }
  if (item.children) {
    for (const child of item.children) {
      if (child.path && child.handler) {
        routes[child.path] = child.handler;
      }
    }
  }
  return routes;
}, {});

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
export const version = '1.8.3';

// =============================================================================
// Current Path State (for reactive active link detection)
// =============================================================================

/**
 * Current path without locale prefix (reactive)
 * Updated on every route change for active link detection
 */
export const currentPath = pulse((() => {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  if (parts.length > 0 && isValidLocale(parts[0])) {
    return '/' + parts.slice(1).join('/') || '/';
  }
  return path || '/';
})());

// =============================================================================
// Router
// =============================================================================

export let router = null;

export function initRouter(routes) {
  router = createRouter({
    routes,
    mode: 'history'
  });

  // Sync locale and current path from URL on route change
  router.afterEach(() => {
    mobileMenuOpen.set(false);
    window.scrollTo(0, 0);

    // Update locale from URL if needed
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let currentLocale = defaultLocale;
    if (pathParts.length > 0 && isValidLocale(pathParts[0])) {
      currentLocale = pathParts[0];
      if (locale.get() !== currentLocale) {
        locale.set(currentLocale);
      }
    } else if (locale.get() !== defaultLocale) {
      // URL has no locale prefix, set to default
      locale.set(defaultLocale);
    }

    // Update current path (without locale) for active link detection
    const newPath = pathParts.length > 0 && isValidLocale(pathParts[0])
      ? '/' + pathParts.slice(1).join('/') || '/'
      : window.location.pathname || '/';
    currentPath.set(newPath);

    // Update SEO metadata for the current page
    const seoPath = extractPathForSEO(window.location.pathname);
    updateSEO(seoPath, currentLocale);
  });

  // Global API for onclick handlers in HTML
  window.docs = {
    navigate: (path) => navigateLocale(path)
  };

  // Apply initial SEO on page load
  const initialPathParts = window.location.pathname.split('/').filter(Boolean);
  let initialLocale = defaultLocale;
  if (initialPathParts.length > 0 && isValidLocale(initialPathParts[0])) {
    initialLocale = initialPathParts[0];
  }
  const initialSeoPath = extractPathForSEO(window.location.pathname);
  updateSEO(initialSeoPath, initialLocale);

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
