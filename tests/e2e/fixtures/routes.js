/**
 * Route Fixtures
 *
 * All documentation routes for testing.
 * Sync with docs/src/state.js navStructure
 */

export const ROUTES = [
  '/',
  '/getting-started',
  '/core-concepts',
  '/api-reference',
  '/benchmarks',
  '/examples',
  '/changelog',
  '/playground',
  '/websocket',
  '/graphql',
  '/context',
  '/devtools',
  '/mobile',
  '/ssr',
  '/server-components',
  '/http',
  '/sse',
  '/persistence',
  '/portal',
  '/animation',
  '/i18n',
  '/service-worker',
  '/accessibility',
  '/debugging',
  '/error-handling',
  '/performance',
  '/security',
  '/testing',
  '/internals',
  '/migration-react',
  '/migration-vue',
  '/migration-angular'
];

export const LOCALES = ['', '/fr', '/es', '/de', '/pt', '/ja'];

export const HIGH_PRIORITY_ROUTES = [
  '/',
  '/getting-started',
  '/api-reference',
  '/examples',
  '/server-components'
];

export const ROUTES_WITH_CODE_EXAMPLES = [
  '/getting-started',
  '/api-reference',
  '/examples',
  '/http',
  '/websocket',
  '/graphql',
  '/ssr',
  '/server-components',
  '/testing'
];

export const ROUTES_WITH_INTERACTIVE_DEMOS = [
  '/playground',
  '/examples'
];

/**
 * Get all localized routes
 */
export function getAllLocalizedRoutes() {
  const routes = [];
  for (const locale of LOCALES) {
    for (const route of ROUTES) {
      routes.push(`${locale}${route}`);
    }
  }
  return routes;
}

/**
 * Get sample of localized routes (for faster testing)
 */
export function getSampleLocalizedRoutes() {
  const sampleRoutes = ['/', '/getting-started', '/api-reference'];
  const routes = [];
  for (const locale of LOCALES.slice(1)) { // Skip default locale
    for (const route of sampleRoutes) {
      routes.push(`${locale}${route}`);
    }
  }
  return routes;
}
