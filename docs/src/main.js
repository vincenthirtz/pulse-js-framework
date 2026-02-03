/**
 * Pulse Documentation Site
 * Built with Pulse Framework
 */

import { el, mount } from '/runtime/index.js';

// State & Router
import { initRouter } from './state.js';
import { localeKeys, defaultLocale } from './i18n/locales.js';

// Components
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';

// Pages
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

// Styles & Utilities
import { injectStyles } from './styles.js';
import { highlightAllCode } from './highlighter.js';

// =============================================================================
// Routes Configuration
// =============================================================================

// Base routes (without locale prefix)
const baseRoutes = {
  '/': HomePage,
  '/getting-started': GettingStartedPage,
  '/core-concepts': CoreConceptsPage,
  '/api-reference': ApiReferencePage,
  '/http': HttpPage,
  '/accessibility': AccessibilityPage,
  '/debugging': DebuggingPage,
  '/security': SecurityPage,
  '/performance': PerformancePage,
  '/error-handling': ErrorHandlingPage,
  '/mobile': MobilePage,
  '/examples': ExamplesPage,
  '/playground': PlaygroundPage,
  '/changelog': ChangelogPage,
  '/migration-react': MigrationReactPage
};

// Build routes with locale prefixes (fr, es, de)
const routes = { ...baseRoutes };

// Add locale-prefixed routes for non-default locales
for (const loc of localeKeys) {
  if (loc !== defaultLocale) {
    for (const [path, handler] of Object.entries(baseRoutes)) {
      const localePath = path === '/' ? `/${loc}` : `/${loc}${path}`;
      routes[localePath] = handler;
    }
  }
}

// Fallback to home for unknown routes
routes['*'] = HomePage;

// =============================================================================
// App Component
// =============================================================================

function App() {
  const app = el('.app');

  app.appendChild(Header());

  // Router outlet - this is where pages will be rendered
  const main = el('main.main#router-outlet');
  app.appendChild(main);

  app.appendChild(Footer());

  return app;
}

// =============================================================================
// Initialize
// =============================================================================

// Inject styles
injectStyles();

// Initialize router with routes
const appRouter = initRouter(routes);

// Mount app
mount('#app', App());

// Setup router outlet
appRouter.outlet('#router-outlet');

// Start router (listen to URL changes)
appRouter.start();

// Apply syntax highlighting after route changes
appRouter.afterEach(() => {
  setTimeout(highlightAllCode, 50);
});

// Initial syntax highlighting
setTimeout(highlightAllCode, 100);

console.log('📖 Pulse Documentation loaded!');
