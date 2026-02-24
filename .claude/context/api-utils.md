# API Reference: Utilities, Errors & Infrastructure

> Load this context file when working on security utilities, error handling, native mobile, HMR, logging, caching, DOM adapter, or the lite build.

### Native (runtime/native.js)

```javascript
import {
  isNativeAvailable, getPlatform, isNative,
  createNativeStorage, createDeviceInfo,
  NativeUI, NativeClipboard,
  onAppPause, onAppResume, onBackButton, onNativeReady,
  exitApp, minimizeApp
} from 'pulse-js-framework/runtime/native';

// Platform detection
isNativeAvailable();  // true if PulseMobile bridge exists
getPlatform();        // 'ios' | 'android' | 'web'
isNative();           // true if running in native app

// Reactive storage (auto-persists, works on web and native)
const storage = createNativeStorage('app_');
const theme = storage.get('theme', 'light');  // Returns a pulse
theme.set('dark');  // Auto-saves to storage
storage.remove('theme');
storage.clear();

// Device info
const device = createDeviceInfo();
device.info.get();      // { platform, userAgent, language, ... }
device.network.get();   // { connected: true, type: 'wifi' }
device.isOnline;        // true/false
device.platform;        // 'ios' | 'android' | 'web'

// Native UI
NativeUI.toast('Message saved!', isLong?);
NativeUI.vibrate(duration?);

// Clipboard
await NativeClipboard.copy('text');
const text = await NativeClipboard.read();

// App lifecycle
onAppPause(() => saveState());
onAppResume(() => refreshData());
onBackButton(() => handleBack());  // Android only
onNativeReady(({ platform }) => init());

// App control (native only)
exitApp();      // Android only
minimizeApp();
```

### HMR (runtime/hmr.js)

```javascript
import { createHMRContext } from 'pulse-js-framework/runtime/hmr';

const hmr = createHMRContext(import.meta.url);

// Preserve state across hot reloads
const count = hmr.preservePulse('count', 0);
const todos = hmr.preservePulse('todos', []);

// Setup effects with automatic cleanup
hmr.setup(() => {
  effect(() => {
    document.title = `${todos.get().length} todos`;
  });
});

// Accept HMR updates
hmr.accept();

// Custom dispose logic
hmr.dispose(() => {
  // Cleanup before module replacement
});
```


### Lite Build (runtime/lite.js)

Minimal bundle (~5KB gzipped) with core reactivity and DOM helpers only. Use for simple apps that don't need router, store, or advanced features.

```javascript
import {
  // Core reactivity
  pulse, effect, computed, batch, onCleanup, untrack,
  // DOM helpers
  el, text, mount, on, bind, list, when, model,
  // Utilities
  show, cls, style, prop
} from 'pulse-js-framework/runtime/lite';

// Same API as full runtime, just smaller bundle
const count = pulse(0);
const app = el('div', [
  el('h1', () => `Count: ${count.get()}`),
  el('button', { onclick: () => count.update(n => n + 1) }, 'Increment')
]);
mount('#app', app);
```


### Logger (runtime/logger.js)

Centralized logging with namespaces and log levels. Automatically becomes noop in production for zero overhead.

```javascript
import {
  logger, createLogger, loggers,
  LogLevel, setLogLevel, getLogLevel,
  setFormatter, configureLogger, isProductionMode
} from 'pulse-js-framework/runtime/logger';

// Default logger
logger.info('Application started');
logger.warn('Deprecation notice');
logger.error('Something went wrong', { code: 500 });
logger.debug('Verbose debug info');

// Namespaced logger
const log = createLogger('MyComponent');
log.info('Initialized');           // [MyComponent] Initialized
log.error('Failed', { id: 123 });  // [MyComponent] Failed { id: 123 }

// Child logger (nested namespace)
const childLog = log.child('SubModule');
childLog.info('Ready');            // [MyComponent:SubModule] Ready

// Pre-configured loggers for Pulse subsystems
loggers.pulse.info('Reactivity update');
loggers.dom.debug('Element created');
loggers.router.info('Navigating to /home');
loggers.store.warn('Persist failed');
loggers.websocket.error('Connection lost');

// Log levels
setLogLevel(LogLevel.DEBUG);   // Show all (DEBUG, INFO, WARN, ERROR)
setLogLevel(LogLevel.WARN);    // Only WARN and ERROR
setLogLevel(LogLevel.SILENT);  // Disable all logging

// Custom formatter
setFormatter((level, namespace, args) => {
  const timestamp = new Date().toISOString();
  const prefix = namespace ? `[${namespace}]` : '';
  return `${timestamp} ${level.toUpperCase()} ${prefix} ${args.join(' ')}`;
});

// Force production mode (noop logging)
configureLogger({ production: true });

// Check mode
if (!isProductionMode()) {
  logger.debug('Development mode');
}

// Log level constants
LogLevel.SILENT  // 0 - No logging
LogLevel.ERROR   // 1 - Only errors
LogLevel.WARN    // 2 - Errors and warnings
LogLevel.INFO    // 3 - Errors, warnings, info (default)
LogLevel.DEBUG   // 4 - All messages
```


### LRU Cache (runtime/lru-cache.js)

Least Recently Used cache with O(1) operations. Used internally by HTTP and GraphQL clients for response caching.

```javascript
import { LRUCache } from 'pulse-js-framework/runtime/lru-cache';

// Create cache with max 100 items
const cache = new LRUCache(100);

// Basic operations
cache.set('key', 'value');
cache.get('key');           // 'value' (moves to most recent)
cache.has('key');           // true (does NOT update position)
cache.delete('key');
cache.clear();

// Properties
cache.size;                 // Current number of items
cache.capacity;             // Maximum capacity (100)

// Iteration (oldest to newest)
for (const key of cache.keys()) { /* ... */ }
for (const value of cache.values()) { /* ... */ }
for (const [key, value] of cache.entries()) { /* ... */ }
cache.forEach((value, key) => { /* ... */ });

// Metrics tracking (for performance monitoring)
const cache = new LRUCache(100, { trackMetrics: true });
cache.get('key');  // miss
cache.set('key', 'value');
cache.get('key');  // hit

const stats = cache.getMetrics();
// { hits: 1, misses: 1, evictions: 0, hitRate: 0.5, size: 1, capacity: 100 }

cache.resetMetrics();                    // Reset counters
cache.setMetricsTracking(false);         // Disable tracking
```


### Utils (runtime/utils.js)

Security utilities for XSS prevention, URL sanitization, and CSS injection protection.

```javascript
import {
  // XSS Prevention
  escapeHtml, unescapeHtml, createSafeTextNode,
  dangerouslySetInnerHTML,
  // Attribute handling
  escapeAttribute, safeSetAttribute,
  // URL validation
  sanitizeUrl,
  // CSS sanitization
  isValidCSSProperty, sanitizeCSSValue, safeSetStyle,
  // Utilities
  deepClone, debounce, throttle
} from 'pulse-js-framework/runtime/utils';

// === XSS Prevention ===

// Escape HTML (prevent XSS when inserting user content)
escapeHtml('<script>alert("xss")</script>');
// '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

unescapeHtml('&lt;div&gt;');  // '<div>'

// Safe text node (DOM textContent is already safe)
const node = createSafeTextNode(userInput);
container.appendChild(node);

// Explicitly set innerHTML (use with caution!)
dangerouslySetInnerHTML(container, trustedHtml);
dangerouslySetInnerHTML(container, userHtml, { sanitize: true });  // With sanitization

// === Attribute Handling ===

escapeAttribute(userInput);  // Safe for attribute values

// Safely set attributes (blocks event handlers, sanitizes URLs)
safeSetAttribute(element, 'data-id', userId);          // OK
safeSetAttribute(element, 'href', userUrl);            // Sanitizes URL
safeSetAttribute(element, 'onclick', 'alert(1)');      // BLOCKED
safeSetAttribute(element, 'src', 'javascript:void(0)'); // BLOCKED

// Options
safeSetAttribute(element, 'onclick', handler, { allowEventHandlers: true }); // Allow (dangerous!)
safeSetAttribute(element, 'src', dataUrl, { allowDataUrls: true });          // Allow data: URLs

// === URL Validation ===

sanitizeUrl('https://example.com');           // 'https://example.com'
sanitizeUrl('javascript:alert(1)');           // null (blocked)
sanitizeUrl('data:text/html,...');            // null (blocked by default)
sanitizeUrl('/relative/path');                // '/relative/path'
sanitizeUrl('&#x6a;avascript:alert(1)');      // null (decoded then blocked)

// Options
sanitizeUrl('data:image/png;base64,...', { allowData: true });   // Allowed
sanitizeUrl('blob:...', { allowBlob: true });                    // Allowed
sanitizeUrl('relative', { allowRelative: false });               // null

// === CSS Sanitization ===

isValidCSSProperty('backgroundColor');  // true
isValidCSSProperty('123invalid');       // false

sanitizeCSSValue('red');                           // { safe: true, value: 'red' }
sanitizeCSSValue('red; margin: 999px');            // { safe: false, value: 'red', blocked: 'semicolon' }
sanitizeCSSValue('url(http://evil.com)');          // { safe: false, value: '', blocked: 'url' }
sanitizeCSSValue('expression(alert(1))');          // { safe: false, blocked: 'expression' }

// Safely set styles
safeSetStyle(element, 'color', 'red');                    // OK
safeSetStyle(element, 'color', 'red; margin: 0');         // Blocked, sets 'red' only
safeSetStyle(element, 'background', 'url(...)', { allowUrl: true });  // Allow url()

// === Utilities ===

// Deep clone
const clone = deepClone({ nested: { value: [1, 2, 3] } });

// Debounce (wait for pause in calls)
const debouncedSearch = debounce(search, 300);
input.addEventListener('input', debouncedSearch);
debouncedSearch.cancel();  // Cancel pending call

// Throttle (max once per interval)
const throttledScroll = throttle(handleScroll, 100);
window.addEventListener('scroll', throttledScroll);
throttledScroll.cancel();
```


### DOM Adapter (runtime/dom-adapter.js)

Abstraction layer for DOM operations. Enables SSR, testing without browser, and custom rendering targets.

```javascript
import {
  // Adapters
  BrowserDOMAdapter, MockDOMAdapter,
  // Mock nodes for testing
  MockNode, MockElement, MockTextNode, MockCommentNode, MockDocumentFragment,
  // Adapter management
  getAdapter, setAdapter, resetAdapter, withAdapter
} from 'pulse-js-framework/runtime/dom-adapter';

// === Browser (default) ===
// Automatically used in browser environments
const adapter = getAdapter();  // BrowserDOMAdapter

// === Testing without browser ===
import { setAdapter, MockDOMAdapter } from 'pulse-js-framework/runtime/dom-adapter';

beforeEach(() => {
  const mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);
});

afterEach(() => {
  resetAdapter();
});

// Mock adapter provides test helpers
const mock = new MockDOMAdapter();
setAdapter(mock);

// Create elements (works without browser)
const div = mock.createElement('div');
mock.setAttribute(div, 'id', 'test');
mock.appendChild(mock.getBody(), div);

// Test helpers
mock.flushMicrotasks();  // Flush pending microtasks synchronously
mock.runAllTimers();     // Run all setTimeout callbacks
mock.reset();            // Clear all state

// === SSR (Server-Side Rendering) ===
// Use MockDOMAdapter or implement custom adapter for your SSR solution
const ssrAdapter = new MockDOMAdapter();
setAdapter(ssrAdapter);
// ... render your app ...
// Serialize ssrAdapter.getBody() to HTML string

// === Temporary adapter (scoped) ===
const result = withAdapter(new MockDOMAdapter(), () => {
  // All DOM operations in this scope use the mock
  return el('div.test', 'Hello');
});
// Original adapter restored after

// === Custom adapter ===
// Implement DOMAdapter interface for custom rendering targets
class CustomAdapter {
  createElement(tagName) { /* ... */ }
  createTextNode(text) { /* ... */ }
  setAttribute(el, name, value) { /* ... */ }
  appendChild(parent, child) { /* ... */ }
  // ... implement all DOMAdapter methods
}
setAdapter(new CustomAdapter());
```


### Errors (runtime/errors.js)

Structured error classes with source location tracking and helpful suggestions.

```javascript
import {
  // Base classes
  PulseError, CompileError, RuntimeError, CLIError,
  // Compiler errors
  LexerError, ParserError, TransformError,
  // Runtime errors
  ReactivityError, DOMError, StoreError, RouterError,
  // CLI errors
  ConfigError,
  // Utilities
  formatError, createParserError, createErrorMessage, getDocsUrl,
  // Pre-built error creators
  Errors, SUGGESTIONS
} from 'pulse-js-framework/runtime/errors';

// === Using pre-built error creators ===
throw Errors.computedSet('doubled');
// [Pulse] Cannot set computed value 'doubled'.
//   Context: Computed values are derived from other pulses and update automatically.
//   → Use a regular pulse() if you need to set values directly...
//   See: https://pulse-js.fr/reactivity/computed#read-only

throw Errors.mountNotFound('#app');
throw Errors.circularDependency(['effect-1', 'effect-2'], ['effect-3']);
throw Errors.routeNotFound('/unknown');
throw Errors.lazyTimeout(5000);

// === Creating custom errors ===
const error = new ParserError('Unexpected token', {
  line: 10,
  column: 5,
  file: 'App.pulse',
  source: sourceCode,
  suggestion: 'Did you forget a closing brace?'
});

// Format with code snippet
console.error(error.formatWithSnippet());
// ParserError: Unexpected token
//   at App.pulse:10:5
//
//    8 | state {
//    9 |   count: 0
// > 10 |   name
//      |     ^
//   11 | }
//
//   → Did you forget a closing brace?
//   See: https://pulse-js.fr/compiler/syntax

// === Error hierarchy ===
// PulseError (base)
// ├── CompileError
// │   ├── LexerError
// │   ├── ParserError
// │   └── TransformError
// ├── RuntimeError
// │   ├── ReactivityError
// │   ├── DOMError
// │   ├── StoreError
// │   └── RouterError
// └── CLIError
//     └── ConfigError

// === Utility functions ===
const url = getDocsUrl('CIRCULAR_DEPENDENCY');
// 'https://pulse-js.fr/reactivity/effects#circular-dependencies'

const message = createErrorMessage({
  code: 'CUSTOM_ERROR',
  message: 'Something went wrong',
  context: 'While processing user input',
  suggestion: 'Check the input format',
  details: { input: 'invalid', expected: 'string' }
});

// Format any error with source context
const formatted = formatError(error, sourceCode);
```


### PulseMobile Bridge (mobile/bridge/pulse-native.js)

Low-level native bridge for iOS/Android. This is the IIFE bundle loaded in WebView. For the module API, use `runtime/native.js` instead.

```javascript
// This script is loaded in mobile WebView via <script> tag
// It exposes window.PulseMobile globally

// Platform detection
PulseMobile.isNative;    // true if running in native app
PulseMobile.isAndroid;   // true on Android
PulseMobile.isIOS;       // true on iOS
PulseMobile.platform;    // 'android' | 'ios' | 'web'

// === Storage (async, falls back to localStorage on web) ===
await PulseMobile.Storage.setItem('key', 'value');
await PulseMobile.Storage.getItem('key');
await PulseMobile.Storage.removeItem('key');
await PulseMobile.Storage.clear();
await PulseMobile.Storage.keys();

// JSON helpers
await PulseMobile.Storage.setObject('user', { name: 'John' });
await PulseMobile.Storage.getObject('user');

// === Device ===
const info = await PulseMobile.Device.getInfo();
// { platform, userAgent, language, online, ... }

const network = await PulseMobile.Device.getNetworkStatus();
// { connected: true, type: 'wifi' }

PulseMobile.Device.onNetworkChange(status => {
  console.log('Network:', status.connected);
});

// === UI ===
await PulseMobile.UI.showToast('Saved!');
await PulseMobile.UI.showToast('Error!', true);  // Long duration
await PulseMobile.UI.vibrate(100);               // ms

// === Clipboard ===
await PulseMobile.Clipboard.copy('Text to copy');
const text = await PulseMobile.Clipboard.read();

// === App Lifecycle ===
await PulseMobile.App.exit();      // Android only
await PulseMobile.App.minimize();

PulseMobile.App.onPause(() => saveState());
PulseMobile.App.onResume(() => refreshData());
PulseMobile.App.onBackButton(() => handleBack());  // Android only

// === Initialization ===
window.addEventListener('pulse:ready', (e) => {
  console.log('Native ready on', e.detail.platform);
});

// Note: For module usage in your app code, prefer runtime/native.js
// which provides a cleaner API with Pulse integration:
// import { createNativeStorage, NativeUI } from 'pulse-js-framework/runtime/native';
```

