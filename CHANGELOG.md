# Changelog

## [1.8.1] - 2026-02-11

### Changes

- test(coverage): add tests for recycling transfer and virtual-list edge cases
- feat(runtime): implement milestone v1.8.1 runtime performance
- docs(milestones): update versions to match v1.8.0 state
- ci(release): publish to GitHub Packages alongside npm

---


## [1.8.0] - 2026-02-11

### Changes

- ci(release): auto-sync package.json version on release
- fix(test): use Proxy-based live NamedNodeMap mock to prevent infinite loop
- fix(test): add resetContext() to M4 test afterEach hooks to prevent hang
- fix(test): add getAttributeNames() to MockElement and fix dom-recycle test
- test(runtime): improve Milestone 4 patch coverage and register missing test suites
- feat(runtime): implement Milestone 4 - Runtime Performance (v1.9.0)
- perf(ci): skip unchanged jobs and cache results across runs

---


## [1.7.38] - 2026-02-10

### Changes

- fix(runtime): add cleanup/dispose to all create*/use* functions (#31, #33, #35, #37)
- fix(test): debug and fix all 7 failing/hanging test suites (66/66 pass)

---


## [1.7.37] - 2026-02-09

### Changes

- fix(ci): add release jobs to manual-release workflow

---


## [1.7.36] - 2026-02-09

### Changes

- fix(test): use clearSSRState() to properly reset module-scoped state in SSR test
- fix(compiler): transform state assignments in text interpolation to .set() instead of .get() =
- fix(actions): repair syntax github action
- feat: complete milestone 1 - type/implementation parity (v1.8.0)
- feat: harden runtime, improve SSR state isolation, add type definitions and tests
- feat(ci): auto-tag on release PR merge in manual-release workflow
- chore(release): bump version to 1.7.35
- chore(release): bump version to 1.7.34
- chore(ci): bump codecov/codecov-action from 4 to 5
- chore(ci): bump actions/cache from 4 to 5
- chore(ci): bump actions/github-script from 7 to 8

---


## [1.7.35] - 2026-02-08

### Changes

- fix(ci): make Discord notification non-blocking in manual-release
- chore(release): bump version to 1.7.34
- fix(ci): handle existing release branch in manual-release workflow
- fix(ci): make release label optional in manual-release workflow
- fix(ci): use PR-based flow for manual-release workflow
- fix(ci): remove dynamic input from release job name
- fix(ci): restrict release trigger to main branch only
- feat(ci): add release type choice to CI workflow_dispatch
- feat(loader): add SWC plugin for .pulse file compilation
- fix(ci): harden and optimize GitHub Actions workflows
- feat(ci): add Discord notification to manual-release workflow
- fix(ci): handle empty git diff stats in enhance-pr-description workflow
- feat(ci): optimize release process with two-step workflow
- fix(ci): handle empty commits in enhance-pr-description workflow
- feat(ci): integrate manual release workflow into CI
- fix(ci): fix bash quoting issues in PR workflows
- fix(ci): improve post-deploy workflow status handling
- feat(ci): add automatic PR commit summary workflow
- fix(examples): add missing index.html to parcel-example
- fix(i18n): add missing parcelDemo translations and increase line variance
- fix(ci): improve test runner robustness for GitHub Actions
- refactor(test): improve Parcel plugin test robustness and maintainability
- fix(test): make Parcel plugin tests more robust for CI
- feat(loader): add Parcel transformer with full integration
- fix(ci): fix conditional logic in post-deploy workflow
- fix(ci): add explicit branch validation to post-deploy workflow
- fix(ci): simplify sed command in post-deploy workflow
- fix(ci): fix YAML syntax error in post-deploy workflow
- fix(ci): prevent post-deploy workflow loop and improve branch filtering
- fix(ci): fix post-deploy workflow to only run on main branch
- chore(ci): add codecov configuration for better coverage reporting
- fix(ci): fix failing GitHub Actions workflows
- feat(loader): add ESBuild plugin with ultra-fast builds
- docs(ci): add comprehensive PR automation documentation
- feat(ci): enhance PR descriptions with detailed commit analysis
- chore(ci): remove obsolete create-release workflow
- feat(ci): add automated post-deploy release system
- feat(loaders): add Webpack and Rollup build tool integrations
- docs: add quick setup guide for Git Flow and branch protection
- docs: update CONTRIBUTING.md with Git Flow strategy
- feat(git): implement Git Flow with branch protection and develop branch
- docs(ci): add comprehensive CI/CD improvements summary
- chore(ci): bump codecov/codecov-action from 4 to 5
- chore(ci): bump actions/cache from 4 to 5
- chore(ci): bump actions/github-script from 7 to 8
- feat(ci): comprehensive CI/CD improvements and automation
- feat(ci): add automated release creation workflow after Netlify deploy
- feat(release): add GitHub CLI integration for automated releases
- chore(release): v1.7.33 - compiler improvements for LESS/Stylus examples
- feat(compiler): add support for compound assignment and increment operators
- fix(docs): update LESS and Stylus example links to point to live demos

---


## [1.7.34] - 2026-02-08

### Changes

- fix(ci): handle existing release branch in manual-release workflow
- fix(ci): make release label optional in manual-release workflow
- fix(ci): use PR-based flow for manual-release workflow
- fix(ci): remove dynamic input from release job name
- fix(ci): restrict release trigger to main branch only
- feat(ci): add release type choice to CI workflow_dispatch
- feat(loader): add SWC plugin for .pulse file compilation
- fix(ci): harden and optimize GitHub Actions workflows
- feat(ci): add Discord notification to manual-release workflow
- fix(ci): handle empty git diff stats in enhance-pr-description workflow
- feat(ci): optimize release process with two-step workflow
- fix(ci): handle empty commits in enhance-pr-description workflow
- feat(ci): integrate manual release workflow into CI
- fix(ci): fix bash quoting issues in PR workflows
- fix(ci): improve post-deploy workflow status handling
- feat(ci): add automatic PR commit summary workflow
- fix(examples): add missing index.html to parcel-example
- fix(i18n): add missing parcelDemo translations and increase line variance
- fix(ci): improve test runner robustness for GitHub Actions
- refactor(test): improve Parcel plugin test robustness and maintainability
- fix(test): make Parcel plugin tests more robust for CI
- feat(loader): add Parcel transformer with full integration
- fix(ci): fix conditional logic in post-deploy workflow
- fix(ci): add explicit branch validation to post-deploy workflow
- fix(ci): simplify sed command in post-deploy workflow
- fix(ci): fix YAML syntax error in post-deploy workflow
- fix(ci): prevent post-deploy workflow loop and improve branch filtering
- fix(ci): fix post-deploy workflow to only run on main branch
- chore(ci): add codecov configuration for better coverage reporting
- fix(ci): fix failing GitHub Actions workflows
- feat(loader): add ESBuild plugin with ultra-fast builds
- docs(ci): add comprehensive PR automation documentation
- feat(ci): enhance PR descriptions with detailed commit analysis
- chore(ci): remove obsolete create-release workflow
- feat(ci): add automated post-deploy release system
- feat(loaders): add Webpack and Rollup build tool integrations
- docs: add quick setup guide for Git Flow and branch protection
- docs: update CONTRIBUTING.md with Git Flow strategy
- feat(git): implement Git Flow with branch protection and develop branch
- docs(ci): add comprehensive CI/CD improvements summary
- chore(ci): bump codecov/codecov-action from 4 to 5
- chore(ci): bump actions/cache from 4 to 5
- chore(ci): bump actions/github-script from 7 to 8
- feat(ci): comprehensive CI/CD improvements and automation
- feat(ci): add automated release creation workflow after Netlify deploy
- feat(release): add GitHub CLI integration for automated releases
- chore(release): v1.7.33 - compiler improvements for LESS/Stylus examples
- feat(compiler): add support for compound assignment and increment operators
- fix(docs): update LESS and Stylus example links to point to live demos

---


All notable changes to Pulse Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.29] - 2026-02-05

### Test Fix

### Changed

- test(docs): update WCAG test to expect #a1a1aa for --text-muted


## [1.7.28] - 2026-02-05

### Accessibility Improvements

### Added

- add table captions for WCAG 1.3.1 compliance
- WCAG 2.1 AA accessibility compliance
- add modern JS operators and CSS features support

### Changed

- test(docs): add WCAG accessibility and Header tests

### Fixed

- improve WCAG AA color contrast and keyboard accessibility
- skip hidden nav items and add aria-label to nav elements
- revert initial text setting to fix t() initialization error
- improve WCAG accessibility - color contrast and ARIA fixes
- add missing translation keys to is and eo locales
- minor WCAG accessibility improvements
- use standard rel="alternate" for sitemap link
- fully encode favicon data URI for W3C validation
- W3C HTML and CSS validation compliance


## [1.7.25] - 2026-02-05

### Props & Text Interpolation Fixes

### Fixed

- fix text interpolation bug with extra quotes in template literals
- fix props/state name collision - props now take precedence in render scope
- support complex expressions in dynamic attributes (ternary, nested braces)

### Tests

- add 10 new props tests for component communication
- add 22 new dynamic attribute tests for complex expressions


## [1.7.24] - 2026-02-05

### CSS Virtual Module Extraction

### Fixed

- extract CSS to virtual modules to prevent minification corruption
- improve release script error handling for git tags


## [1.7.22] - 2026-02-04

### CSS Selector Bug Fix

### Fixed

- preserve hyphenated class names in CSS selectors


## [1.7.21] - 2026-02-04

### Fixed

- improve CSS value parsing for hex colors and units


## [1.7.20] - 2026-02-04

### Bug Fixes

### Added

- add --fc alias for --from-commits in release command
- add CSS nesting support with parent selector

### Fixed

- improve CSS parsing for selectors and properties


## [1.7.18] - 2026-02-04

### SEO & Active Links Fix

### Added

- add page-specific images from Unsplash for social sharing
- add Netlify Edge Function for dynamic meta tags
- add per-page SEO and initial SEO on load

### Fixed

- make active menu links reactive to route changes
- correct Netlify Edge Function configuration
- escape backticks in changelog HTML template strings


## [1.7.17] - 2026-02-04

### Added

- improve runtime exports, docs, and add security guide
- add `pulse new` command for creating .pulse files


## [1.7.16] - 2026-02-04

### Collapsible TOC Sidebar

### Added

- add collapsible TOC sidebar with slide animation
- add server-side rendering with hydration support
- add comprehensive help command with per-command documentation

### Changed

- refactor(docs): centralize routes in navStructure
- i18n: add SSR translations for all locales
- add SSR documentation page and update translations
- test(ssr): improve SSR test coverage from 36 to 116 tests

### Fixed

- align SSR translation keys with English structure


## [1.7.15] - 2026-02-04

### Enhanced Testing Infrastructure

### Added

- add EnhancedMockAdapter for browser API simulation
- add global search, TOC sidebar, and breadcrumbs navigation

### Changed

- improve test coverage across CLI and runtime modules
- add SEO improvements with sitemap and dynamic meta tags


## [1.7.14] - 2026-02-03

### y

### Changed

- update highlighter and styles for new pages
- add WebSocket, GraphQL, Context, and DevTools pages
- comprehensive CLAUDE.md improvements
- add new test scripts to npm test for coverage
- add comprehensive edge case and stress tests
- improve coverage for analyze, build, doctor, dom-element, and hmr
- add DOM element auto-ARIA tests and extend CLI tests


## [1.7.13] - 2026-02-03

### Accessibility Enhancements

### Added

- add ARIA widgets, color contrast, and enhanced user preferences
- add test, doctor, scaffold, and docs commands

### Changed

- test(cli): add comprehensive tests for doctor, scaffold, test runner, and build


## [1.7.12] - 2026-02-03

### GraphQL Client

### Added

- add GraphQL client with queries, mutations, and subscriptions
- add WebSocket client with auto-reconnect and heartbeat
- add Context API for dependency injection

### Changed

- add Angular and Vue migration guides with i18n support
- expand coverage for file-utils and analyze modules
- expand coverage for utils, format, lint, and cli-ui
- add comprehensive CLI test suite
- add security tests and expand a11y/hmr coverage
- add interactive benchmarks page
- ci: add coverage reporting with Codecov

### Fixed

- update docs test to match navStructure exports
- align benchmarks translation structure with English reference


## [1.7.11] - 2026-02-03

### Compiler & Form Binding Fixes

### Added

- add Migration from React guide
- redesign homepage with modern visual components

### Changed

- update documentation for compiler improvements
- remove unused assets directory

### Fixed

- multiple fixes for reactive components and form inputs


## [1.7.10] - 2026-02-03

### Security & DevTools Improvements

### Added

- security module, devtools refactoring, and lint auto-fix
- add accessibility row to comparison table
- add accessibility page to navigation menu
- comprehensive accessibility system
- use French sports sources (L'Équipe, Sports.fr)
- add sports news example with HTTP client

### Fixed

- fix syntax highlighter token markers
- add accessibility to Header navigation


## [1.7.9] - 2026-02-02

### HTTP Client

### Added

- add zero-dependency HTTP client system


## [1.7.8] - 2026-02-02

### Test fix

### Changed

- Fix test to use renamed translation key


## [1.7.7] - 2026-02-02

### Clean Code

### Changed

- remove redundant core/errors.js re-export

### Fixed

- align i18n translation keys with page components


## [1.7.6] - 2026-02-02

### Optimizations & TypeScript Types

### Added

- router/store optimizations, CLI enhancements, TypeScript types, docs split
- add async validators for server-side validation
- add complete i18n translations for debugging and new page sections
- add reactive translations to navigation menu
- replace emoji flags with inline SVG for cross-platform support
- add runtime imports validation
- add documentation validation before release

### Changed

- refactor(dom): split into focused modules + add native bridge security
- refactor(native): extract storage helpers and add comprehensive tests

### Fixed

- align padding between language and theme buttons
- move errors.js to runtime for browser compatibility
- use relative imports for errors in runtime files
- use package imports for errors in runtime files


## [1.7.5] - 2026-02-01

### DX Improvements & CLI Enhancements

### Added

- DX improvements - error messages, CLI enhancements, documentation
- add Japanese, Portuguese, Icelandic, and Esperanto translations

### Fixed

- header layout and missing i18n keys


## [1.7.4] - 2026-02-01

### iOS WebView & i18n System

### Changed

- confirm xcode porject with pulse files
- add i18n system no dependencies
- use 'pulses' terminology consistently in content

### Fixed

- iOS WebView compatibility for Xcode compilation
- minifyJS now correctly handles regex literals


## [1.7.3] - 2026-02-01

### Documentation & Performance Improvements

### Changed

- Documentation and performance improvements


## [1.7.2] - 2026-01-31

### Changed

- Add LiveReload to dev server and clean up release command


## [1.7.1] - 2026-01-31

### Changed

- Add android-pulse example with hot-reload support


## [1.7.0] - 2026-01-31

### Changed

- Add Android WebView example


## [1.6.0] - 2026-01-31

### Lite Build & Bundle Optimization

### Changed

- Lite build, Discord notifications, bundle optimization


## [1.5.3] - 2026-01-31

### Security, errors handling, nested objects, routes async, memory leaks, tests

### Added

- Add non-interactive options to pulse release


## [1.5.2] - 2026-01-31

### Security & Error Handling

### Changed

- Security improvements and error handling enhancements


## [1.5.1] - 2026-01-31

### Added

- CLI `--from-commits` option for automatic changelog generation from git commits

## [1.5.0] - 2026-01-31

### Added

- Docs SEO improvements with meta tags, Open Graph, Twitter Cards, JSON-LD
- Zero Dependencies highlight in documentation homepage
- Logo pulse animation effect
- `npm run docs` command for local documentation development

## [1.4.10] - 2026-01-31

### Changed

- **Zero External Dependencies** - Removed linkedom from devDependencies
  - Added `test/mock-dom.js`: minimal DOM mock implementation (~1100 lines)
  - Implements Document, Element, Node, Text, Comment, DocumentFragment
  - Supports classList, style, querySelector/querySelectorAll
  - Mock window with history API for router testing
  - All 304 tests pass with the new mock

### Fixed

- Pulse Framework now has truly zero dependencies (including devDependencies)

## [1.4.9] - 2026-01-31

### Added

- **Lazy Loading Routes** - Load route components on demand
  - `lazy(importFn, options)` - Wrap dynamic imports with loading states
  - `preload(lazyHandler)` - Prefetch components without rendering
  - Options: `loading`, `error`, `timeout`, `delay`
  - Component caching for instant re-navigation
- **Router Middleware** - Koa-style middleware pipeline
  - `middleware: [...]` option in createRouter
  - `router.use(fn)` for dynamic middleware registration
  - Context with `ctx.to`, `ctx.from`, `ctx.meta`, `ctx.redirect()`, `ctx.abort()`
  - Middleware runs before guards, can redirect or abort navigation
- **Source Maps** - V3 source map generation for compiled .pulse files
  - `SourceMapGenerator` class with VLQ encoding
  - `SourceMapConsumer` for parsing and querying source maps
  - `compile(source, { sourceMap: true })` option
  - Inline source maps with `inlineSourceMap: true`
- New test suites: 15 lazy loading tests, 9 middleware tests, 29 source map tests

### Changed

- Router now uses radix trie for O(path length) route matching
- Updated TypeScript definitions with new router types

## [1.4.8] - 2026-01-31

### IntelliJ Plugin & Dev Server Improvements

### Added

- IntelliJ IDEA plugin for .pulse files
- GitHub stars badge to docs header

### Fixed

- StateDebug and Notes components
- App component call to use render() method
- ThemeSwitcher.pulse syntax and improve dev server regex
- Dev server to compile .pulse files requested as .js


## [1.4.7] - 2026-01-30

### HMR Example

### Added

- HMR example with .pulse components
- HMR example to Netlify build script
- HMR example to docs and Netlify config
- HMR example app
- HMR documentation


## [1.4.6] - 2026-01-30

### Added

- **Hot Module Replacement (HMR)** - Complete HMR support with state preservation
  - `createHMRContext(moduleId)` - Create HMR context for a module
  - `preservePulse(key, initialValue)` - Create pulses that survive HMR updates
  - `setup(callback)` - Execute code with effect tracking for cleanup
  - Effect registry for automatic cleanup during HMR
  - Auto-cleanup for event listeners via `on()` helper
- HMR test suite with 18 new tests

### Changed

- Vite plugin now sends `js-update` instead of `full-reload` for .pulse files
- Effects are now registered with module IDs for proper cleanup
- `on()` function in dom.js now auto-registers cleanup

### Fixed

- Event listeners no longer accumulate during HMR updates
- Effects are properly disposed when modules are replaced

## [1.4.5] - 2026-01-29

### Added

- VSCode extension with lightning bolt icons for .pulse files
- File icons for light and dark themes

## [1.4.4] - 2026-01-29

### Added

- VSCode extension for .pulse file support
- Syntax highlighting and snippets
- Language configuration for bracket matching


## [1.4.3] - 2026-01-30

### Fixed

- Fix package name references to pulse-js-framework


## [1.4.2] - 2026-01-30

### Added

- Automatic release workflow


## [1.4.1] - 2026-01-30

### Fixed

- Router guard 'to' parameter usage


## [1.4.0] - 2026-01-29

### Added

- Router and Store DSL support in .pulse files
- `@link`, `@outlet`, `@navigate` directives
- Store with `state`, `getters`, `actions` blocks
- Built-in persistence support


## [1.3.0] - 2026-01-30

### Router & Compiler Improvements

### Changed

- Refactor documentation into modular files with Pulse router
- Add dark/light mode toggle to documentation
- Fix GitHub URLs to use correct repository name


## [1.2.0] - 2026-01-29

### Pulse Mobile

### Added

- Pulse Mobile - zero-dependency mobile platform
- Comprehensive Admin Dashboard example
- GitHub Actions CI badge to README
- Comprehensive core tests and GitHub Actions CI

### Changed

- Update documentation with Pulse Mobile and latest features
- Improve dashboard responsive layout for desktop

### Fixed

- Getter usage in dashboard example
- Store plugin usage in dashboard example
- Code block first line offset in documentation
- Lexer keyword tokenization


## [1.1.0] - 2026-01-29

### Core Improvements

### Added

- Core improvements and changelog page
- Store example project demonstrating Pulse Store features

### Fixed

- Playground el parser to handle multiple attributes
- Playground: use string concatenation for iframe HTML
- Playground: inline Pulse runtime for srcdoc iframe


## [1.0.0] - 2026-01-29

### Initial Release

### Added

- Core reactivity system (pulse, effect, computed, batch)
- DOM helpers (el, text, bind, on, model, list, when)
- SPA Router with guards and lazy loading
- Global state management with Store
- Form validation system
- Async primitives (useAsync, useResource, usePolling)
- .pulse DSL compiler
- CLI tools (create, dev, build, preview)
- Zero external dependencies
