# Common Audit Patterns & Anti-Patterns

Reference guide for the project auditor. Organized by domain with before/after examples.

---

## Security Patterns

### XSS Prevention

```javascript
// ANTI-PATTERN: Raw innerHTML
element.innerHTML = userInput;

// PATTERN: Safe text content
element.textContent = userInput;

// PATTERN: Escaped HTML
import { escapeHtml } from 'pulse-js-framework/runtime/utils';
element.innerHTML = escapeHtml(userInput);

// PATTERN: Sanitized rich HTML
import { dangerouslySetInnerHTML } from 'pulse-js-framework/runtime/utils';
dangerouslySetInnerHTML(element, userHtml, { sanitize: true });

// PATTERN: Framework DOM creation (auto-safe)
el('div', userInput); // Uses textContent internally
```

### URL Sanitization

```javascript
// ANTI-PATTERN: Unvalidated URL
element.setAttribute('href', userUrl);

// PATTERN: Sanitized URL
import { sanitizeUrl } from 'pulse-js-framework/runtime/utils';
const safeUrl = sanitizeUrl(userUrl);
if (safeUrl) element.setAttribute('href', safeUrl);

// PATTERN: safeSetAttribute (auto-sanitizes URLs)
import { safeSetAttribute } from 'pulse-js-framework/runtime/utils';
safeSetAttribute(element, 'href', userUrl);
```

### Attribute Security

```javascript
// ANTI-PATTERN: Direct setAttribute with event handlers
element.setAttribute(attrName, attrValue); // Could be 'onclick'

// PATTERN: Safe attribute setting
import { safeSetAttribute } from 'pulse-js-framework/runtime/utils';
safeSetAttribute(element, attrName, attrValue); // Blocks event handlers
```

### CSS Injection

```javascript
// ANTI-PATTERN: Unsanitized CSS value
element.style.color = userInput; // Could be "red; background: url(evil)"

// PATTERN: Sanitized CSS value
import { safeSetStyle } from 'pulse-js-framework/runtime/utils';
safeSetStyle(element, 'color', userInput);
```

### Prototype Pollution

```javascript
// ANTI-PATTERN: Raw user JSON
const config = JSON.parse(userJson);
Object.assign(settings, config);

// PATTERN: Sanitized keys
import { sanitizeObjectKeys } from 'pulse-js-framework/runtime/security';
const config = sanitizeObjectKeys(JSON.parse(userJson));
Object.assign(settings, config);
```

---

## Performance Patterns

### Batched Updates

```javascript
// ANTI-PATTERN: Multiple unbatched sets
name.set('Alice');
age.set(30);
active.set(true);
// Effects run 3 times

// PATTERN: Batched updates
import { batch } from 'pulse-js-framework/runtime/pulse';
batch(() => {
  name.set('Alice');
  age.set(30);
  active.set(true);
});
// Effects run once
```

### Computed vs Effect

```javascript
// ANTI-PATTERN: Derived value in effect
let total;
effect(() => {
  total = items.get().reduce((a, b) => a + b.price, 0);
});

// PATTERN: Computed value
const total = computed(() => items.get().reduce((a, b) => a + b.price, 0));
```

### Effect Cleanup

```javascript
// ANTI-PATTERN: No cleanup (memory leak)
effect(() => {
  const id = setInterval(() => tick(), 1000);
  // interval never cleared!
});

// PATTERN: Return cleanup function
effect(() => {
  const id = setInterval(() => tick(), 1000);
  return () => clearInterval(id);
});
```

### List Key Functions

```javascript
// ANTI-PATTERN: list without key (O(n) re-render)
list(() => items.get(), item => el('li', item.name));

// PATTERN: list with key (efficient LIS diffing)
list(() => items.get(), item => el('li', item.name), item => item.id);
```

### Custom Equality

```javascript
// ANTI-PATTERN: Object always triggers update (new reference)
config.set({ theme: 'dark', lang: 'en' });

// PATTERN: Custom equality prevents unnecessary updates
const config = pulse({ theme: 'dark', lang: 'en' }, {
  equals: (a, b) => a.theme === b.theme && a.lang === b.lang
});
```

### Lazy Computed

```javascript
// ANTI-PATTERN: Expensive eager computation
const stats = computed(() => calculateStats(allData.get()));
// Runs immediately even if stats is never read

// PATTERN: Lazy computation
const stats = computed(() => calculateStats(allData.get()), { lazy: true });
// Only computes when stats.get() is called
```

---

## Architecture Patterns

### Layer Boundaries

```javascript
// ANTI-PATTERN: Runtime importing from CLI
// In runtime/dom.js:
import { parseArgs } from '../cli/utils/file-utils.js'; // WRONG

// PATTERN: Keep layers separate
// Move shared code to runtime/utils.js or a shared module
import { parseArgs } from './utils.js'; // OK
```

### DOM Adapter

```javascript
// ANTI-PATTERN: Direct DOM access (breaks SSR)
const div = document.createElement('div');
document.body.appendChild(div);

// PATTERN: Use adapter abstraction
import { getAdapter } from 'pulse-js-framework/runtime/dom-adapter';
const adapter = getAdapter();
const div = adapter.createElement('div');
adapter.appendChild(adapter.getBody(), div);
```

### Error Hierarchy

```javascript
// ANTI-PATTERN: Raw Error
throw new Error('Route not found: /unknown');

// PATTERN: Structured PulseError
import { Errors } from 'pulse-js-framework/runtime/errors';
throw Errors.routeNotFound('/unknown');
// Includes: code, suggestion, docs URL, context
```

### Named Exports

```javascript
// ANTI-PATTERN: Default export (hurts tree-shaking)
export default class Router { ... }

// PATTERN: Named export
export class Router { ... }
export function createRouter(options) { ... }
```

---

## Testing Patterns

### Isolated Context

```javascript
// ANTI-PATTERN: Global state pollution
test('modifies global state', () => {
  const count = pulse(0); // Leaks into other tests
});

// PATTERN: Isolated context
test('isolated state', () => {
  const ctx = createContext({ name: 'test' });
  withContext(ctx, () => {
    const count = pulse(0); // Only in this context
    count.set(5);
    assert.strictEqual(count.get(), 5);
  });
  ctx.reset();
});
```

### Mock DOM

```javascript
// ANTI-PATTERN: Requires browser
test('creates element', () => {
  const div = document.createElement('div'); // Fails in Node.js
});

// PATTERN: MockDOMAdapter
import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';

let adapter;
beforeEach(() => { adapter = new MockDOMAdapter(); setAdapter(adapter); });
afterEach(() => { resetAdapter(); });

test('creates element', () => {
  const div = adapter.createElement('div');
  assert.strictEqual(div.tagName, 'DIV');
});
```

### Async Cleanup

```javascript
// ANTI-PATTERN: No cleanup (test hangs)
test('async operation', async () => {
  const ws = createWebSocket('ws://localhost');
  // Test completes but WebSocket keeps process alive
});

// PATTERN: Proper cleanup
test('async operation', async (t) => {
  const ws = createWebSocket('ws://localhost');
  t.after(() => ws.dispose()); // Cleanup on test end

  const result = await ws.connect();
  assert.ok(result);
});
```

### Specific Assertions

```javascript
// ANTI-PATTERN: Weak assertion
assert.ok(result.length === 3); // Just says "true" or "false"

// PATTERN: Specific assertion
assert.strictEqual(result.length, 3); // Shows: expected 3, got 5
assert.deepStrictEqual(result, [1, 2, 3]); // Shows exact diff
```

### Timer Mocking

```javascript
// ANTI-PATTERN: Real timers (slow + flaky)
test('debounce works', async () => {
  const fn = debounce(handler, 300);
  fn();
  await new Promise(r => setTimeout(r, 350)); // Slow!
  assert.ok(called);
});

// PATTERN: Mock timers
import { mock } from 'node:test';

test('debounce works', () => {
  mock.timers.enable({ apis: ['setTimeout', 'clearTimeout'] });
  const handler = mock.fn();
  const fn = debounce(handler, 300);
  fn();
  mock.timers.tick(300);
  assert.strictEqual(handler.mock.callCount(), 1);
  mock.timers.reset();
});
```

---

## Accessibility Patterns

### Keyboard-Accessible Elements

```javascript
// ANTI-PATTERN: Click on div (not keyboard accessible)
el('div', { onclick: handleClick }, 'Click me');

// PATTERN: Use button element
el('button', { onclick: handleClick }, 'Click me');

// PATTERN: Or add keyboard + ARIA support
el('div', {
  role: 'button',
  tabindex: '0',
  onclick: handleClick,
  onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(e); }
}, 'Click me');
```

### Modal Dialog

```javascript
// ANTI-PATTERN: Modal without focus management
el('div.modal', content);

// PATTERN: Accessible modal
import { trapFocus, announce } from 'pulse-js-framework/runtime/a11y';

const modal = el('dialog[aria-labelledby=title][aria-modal=true]', [
  el('h2#title', 'Settings'),
  el('button[aria-label=Close]', { onclick: close }, 'X'),
  content
]);
const release = trapFocus(modal, { autoFocus: true, returnFocus: true });
announce('Settings dialog opened');
```

### Form Labels

```javascript
// ANTI-PATTERN: Input without label
el('input[type=email]', { placeholder: 'Email' });

// PATTERN: Labeled input
el('div', [
  el('label[for=email]', 'Email address'),
  el('input#email[type=email]', { placeholder: 'user@example.com' })
]);

// PATTERN: aria-label for visual-only context
el('input[type=search]', { 'aria-label': 'Search products', placeholder: 'Search...' });
```

### Live Regions

```javascript
// ANTI-PATTERN: Dynamic content without announcement
el('div', () => `${items.get().length} items in cart`);

// PATTERN: Live region for screen readers
el('div[aria-live=polite][aria-atomic=true]',
  () => `${items.get().length} items in cart`
);

// PATTERN: Programmatic announcement
import { announce } from 'pulse-js-framework/runtime/a11y';
function addToCart(item) {
  cart.update(c => [...c, item]);
  announce(`${item.name} added to cart`);
}
```

---

## Documentation Patterns

### API Documentation

```javascript
// ANTI-PATTERN: No documentation
export function createRouter(options) { ... }

// PATTERN: JSDoc with examples
/**
 * Creates a new router instance with the given configuration.
 *
 * @param {Object} options - Router configuration
 * @param {Object} options.routes - Route definitions
 * @param {'history'|'hash'} [options.mode='history'] - Routing mode
 * @param {string} [options.base=''] - Base path prefix
 * @returns {Router} Router instance
 *
 * @example
 * const router = createRouter({
 *   routes: { '/': HomePage, '/about': AboutPage },
 *   mode: 'history'
 * });
 */
export function createRouter(options) { ... }
```

### CLAUDE.md Section

```markdown
// ANTI-PATTERN: Just function signatures
### createRouter(options)

// PATTERN: Practical examples with common use cases
### Router (runtime/router.js)

\`\`\`javascript
import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';

// Basic router
const router = createRouter({
  routes: {
    '/': HomePage,
    '/users/:id': UserPage,
    '/dashboard': lazy(() => import('./Dashboard.js'))
  }
});

// Navigation
router.navigate('/users/123');
router.path.get();    // '/users/123'
router.params.get();  // { id: '123' }
\`\`\`
```
