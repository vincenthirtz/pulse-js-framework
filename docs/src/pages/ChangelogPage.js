/**
 * Pulse Documentation - Changelog Page
 */

import { el } from '/runtime/index.js';
import { t, navigateLocale } from '../state.js';

export function ChangelogPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>${t('changelog.title')}</h1>
    <p class="intro">${t('changelog.intro')}</p>

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    <section class="doc-section changelog-section">
      <h2>v1.7.28 - Accessibility Improvements</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add table captions for WCAG 1.3.1 compliance</li>
          <li><strong>Added:</strong> WCAG 2.1 AA accessibility compliance</li>
          <li><strong>Added:</strong> add modern JS operators and CSS features support</li>
          <li><strong>Changed:</strong> test(docs): add WCAG accessibility and Header tests</li>
          <li><strong>Fixed:</strong> improve WCAG AA color contrast and keyboard accessibility</li>
          <li><strong>Fixed:</strong> skip hidden nav items and add aria-label to nav elements</li>
          <li><strong>Fixed:</strong> revert initial text setting to fix t() initialization error</li>
          <li><strong>Fixed:</strong> improve WCAG accessibility - color contrast and ARIA fixes</li>
          <li><strong>Fixed:</strong> add missing translation keys to is and eo locales</li>
          <li><strong>Fixed:</strong> minor WCAG accessibility improvements</li>
          <li><strong>Fixed:</strong> use standard rel=&quot;alternate&quot; for sitemap link</li>
          <li><strong>Fixed:</strong> fully encode favicon data URI for W3C validation</li>
          <li><strong>Fixed:</strong> W3C HTML and CSS validation compliance</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.24 - CSS Virtual Module Extraction</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Fixed:</strong> extract CSS to virtual modules to prevent minification corruption</li>
          <li><strong>Fixed:</strong> improve release script error handling for git tags</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.22 - CSS Selector Bug Fix</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Fixed:</strong> preserve hyphenated class names in CSS selectors</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.21 - Release</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Fixed:</strong> improve CSS value parsing for hex colors and units</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.20 - Bug Fixes</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add --fc alias for --from-commits in release command</li>
          <li><strong>Added:</strong> add CSS nesting support with parent selector</li>
          <li><strong>Fixed:</strong> improve CSS parsing for selectors and properties</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.18 - SEO & Active Links Fix</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add page-specific images from Unsplash for social sharing</li>
          <li><strong>Added:</strong> add Netlify Edge Function for dynamic meta tags</li>
          <li><strong>Added:</strong> add per-page SEO and initial SEO on load</li>
          <li><strong>Fixed:</strong> make active menu links reactive to route changes</li>
          <li><strong>Fixed:</strong> correct Netlify Edge Function configuration</li>
          <li><strong>Fixed:</strong> escape backticks in changelog HTML template strings</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.17 - Release</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> improve runtime exports, docs, and add security guide</li>
          <li><strong>Added:</strong> add <code>pulse new</code> command for creating .pulse files</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.16 - Collapsible TOC Sidebar</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add collapsible TOC sidebar with slide animation</li>
          <li><strong>Added:</strong> add server-side rendering with hydration support</li>
          <li><strong>Added:</strong> add comprehensive help command with per-command documentation</li>
          <li><strong>Changed:</strong> refactor(docs): centralize routes in navStructure</li>
          <li><strong>Changed:</strong> i18n: add SSR translations for all locales</li>
          <li><strong>Changed:</strong> add SSR documentation page and update translations</li>
          <li><strong>Changed:</strong> test(ssr): improve SSR test coverage from 36 to 116 tests</li>
          <li><strong>Fixed:</strong> align SSR translation keys with English structure</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.15 - Enhanced Testing Infrastructure</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add EnhancedMockAdapter for browser API simulation</li>
          <li><strong>Added:</strong> add global search, TOC sidebar, and breadcrumbs navigation</li>
          <li><strong>Changed:</strong> improve test coverage across CLI and runtime modules</li>
          <li><strong>Changed:</strong> add SEO improvements with sitemap and dynamic meta tags</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.14 - y</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Changed:</strong> update highlighter and styles for new pages</li>
          <li><strong>Changed:</strong> add WebSocket, GraphQL, Context, and DevTools pages</li>
          <li><strong>Changed:</strong> comprehensive CLAUDE.md improvements</li>
          <li><strong>Changed:</strong> add new test scripts to npm test for coverage</li>
          <li><strong>Changed:</strong> add comprehensive edge case and stress tests</li>
          <li><strong>Changed:</strong> improve coverage for analyze, build, doctor, dom-element, and hmr</li>
          <li><strong>Changed:</strong> add DOM element auto-ARIA tests and extend CLI tests</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.13 - Accessibility Enhancements</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add ARIA widgets, color contrast, and enhanced user preferences</li>
          <li><strong>Added:</strong> add test, doctor, scaffold, and docs commands</li>
          <li><strong>Changed:</strong> test(cli): add comprehensive tests for doctor, scaffold, test runner, and build</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.12 - GraphQL Client</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add GraphQL client with queries, mutations, and subscriptions</li>
          <li><strong>Added:</strong> add WebSocket client with auto-reconnect and heartbeat</li>
          <li><strong>Added:</strong> add Context API for dependency injection</li>
          <li><strong>Changed:</strong> add Angular and Vue migration guides with i18n support</li>
          <li><strong>Changed:</strong> expand coverage for file-utils and analyze modules</li>
          <li><strong>Changed:</strong> expand coverage for utils, format, lint, and cli-ui</li>
          <li><strong>Changed:</strong> add comprehensive CLI test suite</li>
          <li><strong>Changed:</strong> add security tests and expand a11y/hmr coverage</li>
          <li><strong>Changed:</strong> add interactive benchmarks page</li>
          <li><strong>Changed:</strong> ci: add coverage reporting with Codecov</li>
          <li><strong>Fixed:</strong> update docs test to match navStructure exports</li>
          <li><strong>Fixed:</strong> align benchmarks translation structure with English reference</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.11 - Compiler & Form Binding Fixes</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add Migration from React guide</li>
          <li><strong>Added:</strong> redesign homepage with modern visual components</li>
          <li><strong>Changed:</strong> update documentation for compiler improvements</li>
          <li><strong>Changed:</strong> remove unused assets directory</li>
          <li><strong>Fixed:</strong> multiple fixes for reactive components and form inputs</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.10 - Security & DevTools Improvements</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> security module, devtools refactoring, and lint auto-fix</li>
          <li><strong>Added:</strong> add accessibility row to comparison table</li>
          <li><strong>Added:</strong> add accessibility page to navigation menu</li>
          <li><strong>Added:</strong> comprehensive accessibility system</li>
          <li><strong>Added:</strong> use French sports sources (L'Équipe, Sports.fr)</li>
          <li><strong>Added:</strong> add sports news example with HTTP client</li>
          <li><strong>Fixed:</strong> fix syntax highlighter token markers</li>
          <li><strong>Fixed:</strong> add accessibility to Header navigation</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.9 - HTTP Client</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> add zero-dependency HTTP client system</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.8 - Test fix</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Changed:</strong> Fix test to use renamed translation key</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.7 - Clean Code</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Changed:</strong> remove redundant core/errors.js re-export</li>
          <li><strong>Fixed:</strong> align i18n translation keys with page components</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.6 - Optimizations & TypeScript Types</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> router/store optimizations, CLI enhancements, TypeScript types, docs split</li>
          <li><strong>Added:</strong> add async validators for server-side validation</li>
          <li><strong>Added:</strong> add complete i18n translations for debugging and new page sections</li>
          <li><strong>Added:</strong> add reactive translations to navigation menu</li>
          <li><strong>Added:</strong> replace emoji flags with inline SVG for cross-platform support</li>
          <li><strong>Added:</strong> add runtime imports validation</li>
          <li><strong>Added:</strong> add documentation validation before release</li>
          <li><strong>Changed:</strong> refactor(dom): split into focused modules + add native bridge security</li>
          <li><strong>Changed:</strong> refactor(native): extract storage helpers and add comprehensive tests</li>
          <li><strong>Fixed:</strong> align padding between language and theme buttons</li>
          <li><strong>Fixed:</strong> move errors.js to runtime for browser compatibility</li>
          <li><strong>Fixed:</strong> use relative imports for errors in runtime files</li>
          <li><strong>Fixed:</strong> use package imports for errors in runtime files</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.5 - DX Improvements & CLI Enhancements</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> DX improvements - error messages, CLI enhancements, documentation</li>
          <li><strong>Added:</strong> add Japanese, Portuguese, Icelandic, and Esperanto translations</li>
          <li><strong>Fixed:</strong> header layout and missing i18n keys</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.4 - iOS WebView & i18n System</h2>
      <p class="release-date">February 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Changed:</strong> confirm xcode porject with pulse files</li>
          <li><strong>Changed:</strong> add i18n system no dependencies</li>
          <li><strong>Changed:</strong> use 'pulses' terminology consistently in content</li>
          <li><strong>Fixed:</strong> iOS WebView compatibility for Xcode compilation</li>
          <li><strong>Fixed:</strong> minifyJS now correctly handles regex literals</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.2 - Release</h2>
      <p class="release-date">January 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Changed:</strong> Add LiveReload to dev server and clean up release command</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.1 - Release</h2>
      <p class="release-date">January 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Changed:</strong> Add android-pulse example with hot-reload support</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.7.0 - Release</h2>
      <p class="release-date">January 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Changed:</strong> Add Android WebView example</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.5.3 - Security, errors handling, nested objects, routes async, memory leaks, tests</h2>
      <p class="release-date">January 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li><strong>Added:</strong> Add non-interactive options to pulse release</li>
        </ul>
      </div>
    </section>
<section class="doc-section changelog-section">
      <h2>v1.5.1 - CLI Improvements</h2>
      <p class="release-date">January 2026</p>

      <h3>🔧 Release Automation</h3>
      <div class="changelog-group">
        <div class="changelog-item">
          <h4>Automatic Changelog from Commits</h4>
          <p>New <code>--from-commits</code> option for the release command:</p>
          <div class="code-block">
            <pre><code>pulse release patch --from-commits --title "Bug Fixes"</code></pre>
          </div>
          <p>Automatically extracts changelog entries from git commits since the last tag, categorizing them by conventional commit type (feat, fix, docs, etc.).</p>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.5.0 - Documentation & SEO</h2>
      <p class="release-date">January 2026</p>

      <h3>🔍 SEO Improvements</h3>
      <div class="changelog-group">
        <div class="changelog-item">
          <h4>Meta Tags & Social Sharing</h4>
          <p>Enhanced documentation site with comprehensive SEO:</p>
          <ul class="feature-list">
            <li>Open Graph meta tags for rich social media previews</li>
            <li>Twitter Cards support</li>
            <li>JSON-LD structured data for search engines</li>
            <li>Optimized meta descriptions and keywords</li>
          </ul>
        </div>

        <div class="changelog-item">
          <h4>Homepage Enhancements</h4>
          <ul class="feature-list">
            <li>"Zero Dependencies" highlight prominently displayed</li>
            <li>Logo pulse animation effect</li>
            <li><code>npm run docs</code> command for local documentation development</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.4.10 - Zero Dependencies</h2>
      <p class="release-date">January 2026</p>

      <h3>📦 Truly Zero Dependencies</h3>
      <div class="changelog-group">
        <p>Pulse Framework now has absolutely no external dependencies, including devDependencies:</p>

        <div class="changelog-item">
          <h4>Custom DOM Mock</h4>
          <p>Replaced <code>linkedom</code> with a minimal, built-in DOM mock for testing:</p>
          <ul class="feature-list">
            <li><code>Document</code>, <code>Element</code>, <code>Node</code>, <code>Text</code>, <code>Comment</code>, <code>DocumentFragment</code></li>
            <li><code>classList</code>, <code>style</code>, <code>getAttribute/setAttribute</code></li>
            <li><code>querySelector/querySelectorAll</code> with CSS selector support</li>
            <li>Mock <code>window</code> with <code>history</code> and <code>location</code> APIs</li>
            <li>Event system with <code>addEventListener/dispatchEvent</code></li>
          </ul>
        </div>

        <div class="changelog-item">
          <h4>Test Coverage</h4>
          <p>All 304 tests pass with the new mock DOM implementation. The custom mock is ~1100 lines of pure JavaScript.</p>
        </div>

        <div class="changelog-item">
          <h4>Philosophy</h4>
          <p>Pulse's "zero dependencies" philosophy now extends to the entire project - runtime, compiler, CLI, and tests all use only built-in Node.js and browser APIs.</p>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.4.9 - Lazy Loading, Middleware & Source Maps</h2>
      <p class="release-date">January 2026</p>

      <h3>🚀 Lazy Loading Routes</h3>
      <div class="changelog-group">
        <p>Load route components on demand for faster initial page loads:</p>

        <div class="changelog-item">
          <h4>lazy() Function</h4>
          <p>Wrap dynamic imports with loading states and error handling:</p>
          <div class="code-block">
            <pre><code>import { createRouter, lazy } from 'pulse-js-framework/runtime/router';

const routes = {
  '/': HomePage,
  '/dashboard': lazy(() => import('./Dashboard.js')),
  '/settings': lazy(() => import('./Settings.js'), {
    loading: () => el('div.spinner', 'Loading...'),
    error: (err) => el('div.error', \`Failed: \${err.message}\`),
    timeout: 5000,  // Fail after 5s
    delay: 200      // Show loading after 200ms
  })
};</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>preload() Function</h4>
          <p>Prefetch components without rendering - perfect for hover preloading:</p>
          <div class="code-block">
            <pre><code>import { preload } from 'pulse-js-framework/runtime/router';

const DashboardLazy = lazy(() => import('./Dashboard.js'));

// Preload on hover
link.addEventListener('mouseenter', () => preload(DashboardLazy));</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Component Caching</h4>
          <p>Once loaded, components are cached for instant re-navigation. No redundant network requests.</p>
        </div>
      </div>

      <h3>🔗 Router Middleware</h3>
      <div class="changelog-group">
        <p>Koa-style middleware pipeline for flexible navigation control:</p>

        <div class="changelog-item">
          <h4>Middleware Configuration</h4>
          <p>Add middleware via the <code>middleware</code> option:</p>
          <div class="code-block">
            <pre><code>const router = createRouter({
  routes,
  middleware: [
    // Logger middleware
    async (ctx, next) => {
      console.log('Navigating to:', ctx.to.path);
      const start = Date.now();
      await next();
      console.log(\`Navigation took \${Date.now() - start}ms\`);
    },
    // Auth middleware
    async (ctx, next) => {
      if (ctx.to.meta.requiresAuth && !isLoggedIn()) {
        return ctx.redirect('/login');
      }
      await next();
    }
  ]
});</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Middleware Context</h4>
          <p>Each middleware receives a context object with:</p>
          <ul class="feature-list">
            <li><code>ctx.to</code> - Target route (path, params, query, meta)</li>
            <li><code>ctx.from</code> - Source route</li>
            <li><code>ctx.meta</code> - Shared metadata between middlewares</li>
            <li><code>ctx.redirect(path)</code> - Redirect to another path</li>
            <li><code>ctx.abort()</code> - Cancel navigation</li>
          </ul>
        </div>

        <div class="changelog-item">
          <h4>Dynamic Middleware</h4>
          <p>Add middleware at runtime with <code>router.use()</code>:</p>
          <div class="code-block">
            <pre><code>// Add middleware dynamically
const unsubscribe = router.use(async (ctx, next) => {
  ctx.meta.startTime = Date.now();
  await next();
});

// Remove later
unsubscribe();</code></pre>
          </div>
        </div>
      </div>

      <h3>🗺️ Source Maps</h3>
      <div class="changelog-group">
        <p>V3 source map generation for debugging original <code>.pulse</code> code:</p>

        <div class="changelog-item">
          <h4>Compiler Options</h4>
          <div class="code-block">
            <pre><code>import { compile } from 'pulse-js-framework/compiler';

const result = compile(source, {
  sourceMap: true,           // Generate source map
  sourceFileName: 'App.pulse',
  inlineSourceMap: true      // Embed in output
});

console.log(result.sourceMap);  // V3 source map object</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Source Map APIs</h4>
          <p>Low-level APIs for custom tooling:</p>
          <ul class="feature-list">
            <li><code>SourceMapGenerator</code> - Create source maps with VLQ encoding</li>
            <li><code>SourceMapConsumer</code> - Parse and query source maps</li>
            <li><code>encodeVLQ()</code> - Variable Length Quantity encoding</li>
          </ul>
        </div>
      </div>

      <h3>🧪 Test Suite</h3>
      <div class="changelog-group">
        <p>53 new tests added:</p>
        <ul class="feature-list">
          <li>15 lazy loading tests</li>
          <li>9 middleware tests</li>
          <li>29 source map tests (VLQ encoding, generator, consumer, compiler integration)</li>
        </ul>
      </div>

      <h3>⚡ Performance</h3>
      <div class="changelog-group">
        <ul class="feature-list">
          <li>Router now uses radix trie for O(path length) route matching</li>
          <li>Lazy components are cached after first load</li>
        </ul>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.4.8 - IntelliJ IDEA Plugin</h2>
      <p class="release-date">January 2026</p>

      <h3>🧠 JetBrains IDE Support</h3>
      <div class="changelog-group">
        <p>Full IntelliJ IDEA plugin for <code>.pulse</code> file support:</p>

        <div class="changelog-item">
          <h4>Syntax Highlighting</h4>
          <p>Complete syntax highlighting with custom lexer for all Pulse DSL elements: keywords, directives, components, selectors, and more.</p>
        </div>

        <div class="changelog-item">
          <h4>Live Templates</h4>
          <p>17 code snippets matching the VS Code extension: <code>page</code>, <code>component</code>, <code>state</code>, <code>view</code>, <code>@click</code>, <code>@if</code>, <code>@for</code>, etc.</p>
        </div>

        <div class="changelog-item">
          <h4>IDE Features</h4>
          <ul class="feature-list">
            <li>Code folding for state, view, style blocks</li>
            <li>Bracket matching and auto-closing</li>
            <li>Comment toggling (Ctrl+/)</li>
            <li>Customizable color scheme</li>
            <li>File icons for .pulse files</li>
          </ul>
        </div>

        <div class="changelog-item">
          <h4>Compatibility</h4>
          <p>Works with IntelliJ IDEA 2023.3+, WebStorm, PyCharm, and all JetBrains IDEs.</p>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.4.7 - HMR with .pulse Components</h2>
      <p class="release-date">January 2026</p>

      <h3>📦 HMR Example with .pulse Files</h3>
      <div class="changelog-group">
        <p>The HMR demo has been refactored to showcase .pulse component architecture:</p>

        <div class="changelog-item">
          <h4>Component-Based Structure</h4>
          <p>The HMR example now uses modular .pulse components:</p>
          <div class="code-block">
            <pre><code>examples/hmr/src/
├── main.js              # HMR setup & state
└── components/
    ├── App.pulse        # Main layout
    ├── Counter.pulse    # Preserved counter
    ├── Notes.pulse      # Notes list
    ├── ThemeSwitcher.pulse
    ├── HMRIndicator.pulse
    └── StateDebug.pulse</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>State Preservation with Components</h4>
          <p>Demonstrates passing HMR-preserved state to .pulse components:</p>
          <div class="code-block">
            <pre><code>// main.js - HMR setup
const count = hmr.preservePulse('count', 0);

// Pass to .pulse component
mount('#app', App({ count, onIncrement: increment }));</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Playground Templates</h4>
          <p>Added 6 new playground templates: Calculator, Tabs, Theme Switcher, Search Filter, Shopping Cart, and Animation Demo.</p>
        </div>

        <div class="changelog-item">
          <h4>API Reference Search</h4>
          <p>New search functionality in API Reference docs with keyboard shortcut (/) and live filtering.</p>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.4.6 - Hot Module Replacement</h2>
      <p class="release-date">January 2026</p>

      <h3>🔥 Complete HMR with State Preservation</h3>
      <div class="changelog-group">
        <p>Full Hot Module Replacement support for seamless development experience:</p>

        <div class="changelog-item">
          <h4>HMR Context API</h4>
          <p>Create HMR contexts to preserve state across module updates:</p>
          <div class="code-block">
            <pre><code>import { createHMRContext } from 'pulse-js-framework/runtime/hmr';

const hmr = createHMRContext(import.meta.url);

// State preserved across HMR updates
const count = hmr.preservePulse('count', 0);
const items = hmr.preservePulse('items', []);</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Effect Tracking & Cleanup</h4>
          <p>Effects are automatically cleaned up during HMR to prevent memory leaks:</p>
          <div class="code-block">
            <pre><code>hmr.setup(() => {
  effect(() => {
    document.title = \`Count: \${count.get()}\`;
  });
});

hmr.accept();</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Automatic Event Listener Cleanup</h4>
          <p>Event listeners registered with <code>on()</code> are automatically removed during HMR - no more listener accumulation.</p>
        </div>

        <div class="changelog-item">
          <h4>Vite Integration</h4>
          <p>The Vite plugin now sends <code>js-update</code> instead of <code>full-reload</code> for <code>.pulse</code> files, enabling true hot updates.</p>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.4.5 - VSCode Extension Icons</h2>
      <p class="release-date">January 2026</p>

      <h3>⚡ File Icons</h3>
      <div class="changelog-group">
        <p>Lightning bolt icons for <code>.pulse</code> files in VSCode:</p>
        <ul class="feature-list">
          <li>Light theme icon</li>
          <li>Dark theme icon</li>
          <li>Extension marketplace icon</li>
        </ul>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.4.0 - Native Router & Store DSL</h2>
      <p class="release-date">January 2026</p>

      <h3>🎯 Router & Store DSL Blocks</h3>
      <div class="changelog-group">
        <p>Define routing and state management directly in <code>.pulse</code> files with native DSL syntax:</p>

        <div class="changelog-item">
          <h4>Router Block</h4>
          <p>Full router configuration in your component:</p>
          <div class="code-block">
            <pre><code>router {
  mode: "hash"
  routes {
    "/": HomePage
    "/users/:id": UserPage
  }
  beforeEach(to, from) {
    if (!store.isAuthenticated) return "/login"
  }
}</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Store Block</h4>
          <p>State management with getters, actions, and persistence:</p>
          <div class="code-block">
            <pre><code>store {
  state {
    user: null
    theme: "dark"
  }
  getters {
    isAuthenticated() { return this.user !== null }
  }
  actions {
    login(user) { this.user = user }
    toggleTheme() { this.theme = this.theme === "dark" ? "light" : "dark" }
  }
  persist: true
  storageKey: "my-app"
}</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Router View Directives</h4>
          <p>New directives for navigation in views:</p>
          <ul class="feature-list">
            <li><code>@link("/path")</code> - Navigation link with active state</li>
            <li><code>@outlet</code> - Renders current route component</li>
            <li><code>@navigate("/path")</code> - Programmatic navigation</li>
            <li><code>@back</code> / <code>@forward</code> - History navigation</li>
          </ul>
        </div>

        <div class="changelog-item">
          <h4>Automatic Transformations</h4>
          <ul class="feature-list">
            <li>Store getters: <code>this.x</code> → <code>store.x.get()</code></li>
            <li>Store actions: <code>this.x = y</code> → <code>store.x.set(y)</code></li>
            <li>Guard bodies: <code>store.x</code> → <code>$store.x</code></li>
          </ul>
        </div>
      </div>

      <h3>🔧 Parser Improvements</h3>
      <div class="changelog-group">
        <ul class="feature-list">
          <li>Keywords like <code>page</code>, <code>from</code>, <code>route</code> now valid as parameter names</li>
          <li>Block directives (<code>@if</code>, <code>@for</code>) properly break inline parsing</li>
          <li>Better error messages for router/store block parsing</li>
        </ul>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.3.0 - Router & Compiler Improvements</h2>
      <p class="release-date">January 2026</p>

      <h3>🚀 Advanced Router</h3>
      <div class="changelog-group">
        <p>Major router enhancements for building complex SPAs:</p>

        <div class="changelog-item">
          <h4>Nested Routes</h4>
          <p>Define child routes for hierarchical navigation:</p>
          <div class="code-block">
            <pre><code>'/admin': {
  handler: AdminLayout,
  children: {
    '/users': UsersPage,
    '/settings': SettingsPage
  }
}</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Route Meta Fields</h4>
          <p>Attach custom metadata to routes for guards and breadcrumbs:</p>
          <div class="code-block">
            <pre><code>'/dashboard': {
  handler: DashboardPage,
  meta: { requiresAuth: true, title: 'Dashboard' }
}</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Per-Route Guards</h4>
          <p><code>beforeEnter</code> guard for individual routes:</p>
          <div class="code-block">
            <pre><code>'/admin': {
  handler: AdminPage,
  beforeEnter: (to, from) => {
    if (!isAdmin()) return '/forbidden';
  }
}</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>New Hooks</h4>
          <ul class="feature-list">
            <li><code>beforeResolve()</code> - Runs after per-route guards</li>
            <li><code>router.meta</code> - Reactive access to current route meta</li>
            <li><code>router.isActive(path)</code> - Check if path is active</li>
          </ul>
        </div>

        <div class="changelog-item">
          <h4>Scroll Restoration</h4>
          <p>Automatic scroll position save/restore with customizable behavior:</p>
          <div class="code-block">
            <pre><code>scrollBehavior: (to, from, savedPosition) => {
  if (to.hash) return { selector: to.hash };
  return savedPosition || { x: 0, y: 0 };
}</code></pre>
          </div>
        </div>
      </div>

      <h3>📦 Compiler Enhancements</h3>
      <div class="changelog-group">
        <div class="changelog-item">
          <h4>Import Statements</h4>
          <p>Import components from other <code>.pulse</code> files:</p>
          <div class="code-block">
            <pre><code>import Button from './Button.pulse'
import { Header, Footer } from './components.pulse'
import * as Icons from './icons.pulse'</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>Slots for Composition</h4>
          <p>Content projection with named and default slots:</p>
          <div class="code-block">
            <pre><code>// Define slot in component
slot "header"
slot { "Default fallback" }

// Use component with content
Card {
  "This goes in default slot"
}</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4>CSS Scoping</h4>
          <p>Styles are automatically scoped to prevent leaks between components. Each component gets a unique class prefix.</p>
        </div>

        <div class="changelog-item">
          <h4>Better Error Messages</h4>
          <p>Compilation errors now include precise line and column numbers with helpful suggestions.</p>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.2.0 - Mobile Apps</h2>
      <p class="release-date">January 2026</p>

      <h3>📱 Pulse Mobile</h3>
      <div class="changelog-group">
        <p>Build native Android and iOS apps from your Pulse project with zero external dependencies!</p>

        <div class="changelog-item">
          <h4>CLI Commands</h4>
          <ul class="feature-list">
            <li><code>pulse mobile init</code> - Initialize mobile platforms</li>
            <li><code>pulse mobile build android|ios</code> - Build native app</li>
            <li><code>pulse mobile run android|ios</code> - Run on device/emulator</li>
          </ul>
        </div>

        <div class="changelog-item">
          <h4>Native APIs</h4>
          <ul class="feature-list">
            <li><code>createNativeStorage()</code> - Persistent storage with Pulse reactivity</li>
            <li><code>createDeviceInfo()</code> - Device and network info</li>
            <li><code>NativeUI.toast()</code> - Native toast notifications</li>
            <li><code>NativeUI.vibrate()</code> - Haptic feedback</li>
            <li><code>NativeClipboard</code> - Read/write clipboard</li>
            <li>App lifecycle hooks: <code>onAppPause</code>, <code>onAppResume</code>, <code>onBackButton</code></li>
          </ul>
        </div>
      </div>

      <h3>📊 Admin Dashboard Example</h3>
      <div class="changelog-group">
        <p>New comprehensive example demonstrating all Pulse features:</p>
        <ul class="feature-list">
          <li>Authentication with route guards</li>
          <li>Responsive layout (mobile, tablet, desktop)</li>
          <li>Charts, data tables, modals</li>
          <li>CRUD operations with store</li>
          <li>Theme switching (dark/light)</li>
          <li>Undo/redo with historyPlugin</li>
        </ul>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.1.0 - Core Improvements</h2>
      <p class="release-date">January 2026</p>

      <h3>🎯 Reactivity Enhancements</h3>
      <div class="changelog-group">
        <div class="changelog-item">
          <h4><code>onCleanup(fn)</code></h4>
          <p>Register cleanup functions within effects that run when the effect re-executes or is disposed. Perfect for clearing timers, removing event listeners, or canceling subscriptions.</p>
          <div class="code-block">
            <pre><code>effect(() => {
  const interval = setInterval(tick, 1000);
  onCleanup(() => clearInterval(interval));
});</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4><code>memo(fn, options?)</code></h4>
          <p>Memoize function results based on arguments. Only recomputes when arguments change.</p>
        </div>

        <div class="changelog-item">
          <h4><code>memoComputed(fn, options?)</code></h4>
          <p>Combines memoization with computed values for expensive derivations.</p>
        </div>

        <div class="changelog-item">
          <h4>Fixed <code>computed()</code> propagation</h4>
          <p>Computed values now properly propagate changes to downstream subscribers using the new <code>_setFromComputed()</code> method.</p>
        </div>

        <div class="changelog-item">
          <h4>Lazy computed option</h4>
          <p>Use <code>computed(fn, { lazy: true })</code> to defer evaluation until the value is actually read.</p>
        </div>
      </div>

      <h3>📦 Array Helpers in createState</h3>
      <div class="changelog-group">
        <p>Arrays in <code>createState()</code> now get reactive helper methods:</p>
        <ul class="feature-list">
          <li><code>$push(...items)</code> - Add items to end</li>
          <li><code>$pop()</code> - Remove and return last item</li>
          <li><code>$shift()</code> - Remove and return first item</li>
          <li><code>$unshift(...items)</code> - Add items to beginning</li>
          <li><code>$splice(start, count, ...items)</code> - Splice array</li>
          <li><code>$filter(fn)</code> - Filter in place</li>
          <li><code>$map(fn)</code> - Map in place</li>
          <li><code>$sort(fn)</code> - Sort in place</li>
        </ul>
        <div class="code-block">
          <pre><code>const state = createState({ items: [1, 2, 3] });
state.items$push(4);      // [1, 2, 3, 4]
state.items$filter(x => x > 2);  // [3, 4]</code></pre>
        </div>
      </div>

      <h3>🖥️ DOM Improvements</h3>
      <div class="changelog-group">
        <div class="changelog-item">
          <h4><code>show(condition, element)</code></h4>
          <p>Toggle element visibility without removing from DOM. Unlike <code>when()</code>, this preserves element state and is more performant for frequent toggles.</p>
        </div>

        <div class="changelog-item">
          <h4><code>portal(children, target)</code></h4>
          <p>Render children into a different DOM location. Useful for modals, tooltips, and dropdowns that need to escape their parent's overflow or stacking context.</p>
        </div>

        <div class="changelog-item">
          <h4><code>errorBoundary(children, fallback)</code></h4>
          <p>Catch errors in child components and display a fallback UI. Includes a <code>resetError()</code> method to retry rendering.</p>
        </div>

        <div class="changelog-item">
          <h4><code>onMount(fn)</code> / <code>onUnmount(fn)</code></h4>
          <p>Lifecycle hooks for component setup and cleanup when using the <code>component()</code> factory.</p>
        </div>

        <div class="changelog-item">
          <h4><code>transition(element, options)</code></h4>
          <p>Apply enter/exit CSS animations to elements with configurable duration and class names.</p>
        </div>

        <div class="changelog-item">
          <h4><code>whenTransition(condition, then, else, options)</code></h4>
          <p>Conditional rendering with automatic enter/exit animations.</p>
        </div>

        <div class="changelog-item">
          <h4>Optimized <code>list()</code> diffing</h4>
          <p>List rendering now uses efficient keyed diffing - only moves nodes that actually changed position instead of rebuilding the entire list.</p>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.0.0 - Initial Release</h2>
      <p class="release-date">January 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li>Core reactivity system with <code>pulse()</code>, <code>effect()</code>, <code>computed()</code>, <code>batch()</code></li>
          <li>CSS selector-based DOM creation with <code>el()</code></li>
          <li>Reactive bindings: <code>text()</code>, <code>bind()</code>, <code>cls()</code>, <code>style()</code>, <code>model()</code></li>
          <li>Conditional rendering with <code>when()</code> and <code>match()</code></li>
          <li>List rendering with <code>list()</code></li>
          <li>SPA Router with params, query strings, guards, and navigation</li>
          <li>Global state management with Store, actions, getters, and plugins</li>
          <li><code>.pulse</code> DSL compiler</li>
          <li>CLI tools: create, dev, build, preview, compile</li>
          <li>Example apps: Todo, Chat, E-commerce, Weather, Router Demo, Store Demo, Admin Dashboard</li>
        </ul>
      </div>
    </section>

    <div class="next-section"></div>
  `;

  // Attach click handler programmatically for navigation button
  const nextSection = page.querySelector('.next-section');
  const backBtn = el('button.btn.btn-primary', '← Back to Home');
  backBtn.onclick = () => navigateLocale('/');
  nextSection.appendChild(backBtn);

  return page;
}
