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
import { SearchModal, initSearchKeyboard } from './components/Search.js';
import { TocSidebar, TocMobile, updateTocItems } from './components/TableOfContents.js';
import { Breadcrumbs } from './components/Breadcrumbs.js';

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
import { MigrationAngularPage } from './pages/MigrationAngularPage.js';
import { MigrationVuePage } from './pages/MigrationVuePage.js';
import { BenchmarksPage } from './pages/BenchmarksPage.js';
import { WebSocketPage } from './pages/WebSocketPage.js';
import { GraphQLPage } from './pages/GraphQLPage.js';
import { ContextPage } from './pages/ContextPage.js';
import { DevToolsPage } from './pages/DevToolsPage.js';

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
  '/migration-react': MigrationReactPage,
  '/migration-angular': MigrationAngularPage,
  '/migration-vue': MigrationVuePage,
  '/benchmarks': BenchmarksPage,
  '/websocket': WebSocketPage,
  '/graphql': GraphQLPage,
  '/context': ContextPage,
  '/devtools': DevToolsPage
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

  // Search modal (appended to app for proper stacking)
  app.appendChild(SearchModal());

  // Main content wrapper with TOC
  const contentWrapper = el('.content-wrapper');

  // Router outlet - this is where pages will be rendered
  const main = el('main.main#router-outlet');
  contentWrapper.appendChild(main);

  // Desktop TOC sidebar
  contentWrapper.appendChild(TocSidebar());

  app.appendChild(contentWrapper);

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

// Initialize search keyboard shortcut (Cmd/Ctrl+K)
initSearchKeyboard();

// Apply syntax highlighting and update TOC after route changes
appRouter.afterEach(() => {
  setTimeout(() => {
    highlightAllCode();

    // Update TOC items from page content
    updateTocItems();

    // Add breadcrumbs and mobile TOC to page
    const page = document.querySelector('.docs-page');
    if (page) {
      // Check if breadcrumbs already exist
      if (!page.querySelector('.breadcrumbs')) {
        page.insertBefore(Breadcrumbs(), page.firstChild);
      }
      // Check if mobile TOC already exists
      const breadcrumbs = page.querySelector('.breadcrumbs');
      if (breadcrumbs && !page.querySelector('.toc-mobile')) {
        breadcrumbs.insertAdjacentElement('afterend', TocMobile());
      }
    }
  }, 50);
});

// Initial setup
setTimeout(() => {
  highlightAllCode();
  updateTocItems();

  // Add breadcrumbs and mobile TOC to initial page
  const page = document.querySelector('.docs-page');
  if (page) {
    page.insertBefore(Breadcrumbs(), page.firstChild);
    const breadcrumbs = page.querySelector('.breadcrumbs');
    if (breadcrumbs) {
      breadcrumbs.insertAdjacentElement('afterend', TocMobile());
    }
  }
}, 100);

console.log('📖 Pulse Documentation loaded!');
