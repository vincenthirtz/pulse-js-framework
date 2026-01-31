# Changelog

All notable changes to Pulse Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [1.4.4] - Previous

### Added

- VSCode extension for .pulse file support
- Syntax highlighting and snippets
- Language configuration for bracket matching

## [1.4.0] - Previous

### Added

- Router and Store DSL support in .pulse files
- `@link`, `@outlet`, `@navigate` directives
- Store with `state`, `getters`, `actions` blocks
- Built-in persistence support
