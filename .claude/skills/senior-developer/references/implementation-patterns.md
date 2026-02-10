# Implementation Patterns - Pulse JS Framework

## Overview

This guide provides concrete implementation patterns for each module type in Pulse. When implementing a feature, find the matching pattern below and follow its structure exactly.

## Runtime Module Pattern

### Reactive Hook (useX)

The most common pattern. Returns reactive state + control functions.

**Reference implementation**: `runtime/async.js` → `useAsync()`

```javascript
import { pulse, effect, computed, batch } from './pulse.js';

const DEFAULTS = {
  immediate: true,
  initialData: null,
  retries: 0,
  retryDelay: 1000,
  onSuccess: null,
  onError: null
};

export function useFeature(fetcher, options = {}) {
  const config = { ...DEFAULTS, ...options };

  // 1. Reactive state (always Pulse instances)
  const data = pulse(config.initialData);
  const loading = pulse(false);
  const error = pulse(null);

  // 2. Internal state (plain variables, not reactive)
  let abortController = null;
  let retryCount = 0;

  // 3. Core logic
  async function execute(...args) {
    // Cancel previous
    abortController?.abort();
    abortController = new AbortController();

    loading.set(true);
    error.set(null);

    try {
      const result = await fetcher(...args, {
        signal: abortController.signal
      });
      data.set(result);
      config.onSuccess?.(result);
      retryCount = 0;
    } catch (err) {
      if (err.name === 'AbortError') return;

      if (retryCount < config.retries) {
        retryCount++;
        await new Promise(r => setTimeout(r, config.retryDelay));
        return execute(...args);
      }

      error.set(err);
      config.onError?.(err);
    } finally {
      loading.set(false);
    }
  }

  // 4. Auto-execute if configured
  if (config.immediate) execute();

  // 5. Cleanup function
  function abort() {
    abortController?.abort();
    abortController = null;
  }

  function reset() {
    abort();
    batch(() => {
      data.set(config.initialData);
      loading.set(false);
      error.set(null);
    });
  }

  // 6. Return reactive interface
  return { data, loading, error, execute, abort, reset };
}
```

### Factory (createX)

Creates a configurable instance with methods.

**Reference implementation**: `runtime/http.js` → `createHttp()`

```javascript
export function createFeature(options = {}) {
  const config = { ...DEFAULTS, ...options };

  // Private state (closure-based)
  const interceptors = { request: [], response: [] };
  let disposed = false;

  // Instance methods
  function doSomething(input) {
    if (disposed) throw new RuntimeError('Feature disposed');
    // Apply interceptors
    let processed = input;
    for (const fn of interceptors.request) {
      processed = fn(processed);
    }
    return processed;
  }

  function dispose() {
    disposed = true;
    interceptors.request.length = 0;
    interceptors.response.length = 0;
  }

  // Return public API (instance)
  return {
    doSomething,
    dispose,
    interceptors: {
      request: {
        use: (fn) => { interceptors.request.push(fn); return interceptors.request.length - 1; },
        eject: (id) => { interceptors.request[id] = null; },
        clear: () => { interceptors.request.length = 0; }
      },
      response: {
        use: (fn) => { interceptors.response.push(fn); return interceptors.response.length - 1; },
        eject: (id) => { interceptors.response[id] = null; },
        clear: () => { interceptors.response.length = 0; }
      }
    }
  };
}
```

### DOM Component

Creates UI elements with reactive bindings.

**Reference implementation**: `runtime/dom.js` → `el()`, `when()`, `list()`

```javascript
import { pulse, effect, computed } from './pulse.js';
import { el, when, list, bind, on, cls, show } from './dom.js';

export function createWidget(options = {}) {
  // Reactive state
  const isOpen = pulse(options.defaultOpen ?? false);
  const items = pulse(options.items ?? []);

  // Derived state
  const count = computed(() => items.get().length);
  const hasItems = computed(() => count.get() > 0);

  // DOM structure
  const root = el('div.widget', {
    'aria-expanded': () => String(isOpen.get()),
    role: 'region',
    'aria-label': options.label || 'Widget'
  }, [
    // Header
    el('button.widget-toggle', {
      onclick: () => isOpen.update(v => !v),
      'aria-label': () => isOpen.get() ? 'Collapse' : 'Expand'
    }, () => `Items (${count.get()})`),

    // Conditional content
    when(
      () => isOpen.get(),
      () => el('.widget-body', [
        when(
          () => hasItems.get(),
          () => list(
            () => items.get(),
            (item) => el('li.widget-item', item.name),
            (item) => item.id  // Key function (REQUIRED)
          ),
          () => el('.empty', 'No items')
        )
      ])
    )
  ]);

  // Public API
  return {
    element: root,
    isOpen,
    items,
    count,
    open: () => isOpen.set(true),
    close: () => isOpen.set(false),
    toggle: () => isOpen.update(v => !v),
    addItem: (item) => items.update(arr => [...arr, item]),
    removeItem: (id) => items.update(arr => arr.filter(i => i.id !== id))
  };
}
```

## Compiler Pattern

### Lexer Token Addition

When adding a new token type to the lexer.

**Reference**: `compiler/lexer.js`

```javascript
// 1. Add token type constant
const TokenType = {
  // ... existing tokens ...
  NEW_TOKEN: 'NEW_TOKEN'
};

// 2. Add recognition in scan() or scanToken()
// For multi-character tokens, check lookahead:
case '?':
  if (this.peek() === '?') {
    if (this.peekNext() === '=') {
      this.advance(); this.advance();
      this.addToken(TokenType.NULLISH_ASSIGN);
    } else {
      this.advance();
      this.addToken(TokenType.NULLISH);
    }
  } else if (this.peek() === '.') {
    this.advance();
    this.addToken(TokenType.OPTIONAL_CHAIN);
  } else {
    this.addToken(TokenType.QUESTION);
  }
  break;

// 3. For keyword tokens, add to keywords map:
const KEYWORDS = {
  // ... existing ...
  'newkeyword': TokenType.NEW_KEYWORD
};
```

### Parser Rule Addition

When adding a new AST node type.

**Reference**: `compiler/parser.js`

```javascript
// 1. Define AST node shape
// { type: 'NewNode', prop1: ..., prop2: ..., line, column }

// 2. Add parsing method
parseNewConstruct() {
  const start = this.current();
  this.expect(TokenType.NEW_KEYWORD, 'Expected new keyword');

  const name = this.expect(TokenType.IDENTIFIER, 'Expected name');
  this.expect(TokenType.LBRACE, 'Expected {');

  const body = this.parseBlock();

  this.expect(TokenType.RBRACE, 'Expected }');

  return {
    type: 'NewNode',
    name: name.value,
    body,
    line: start.line,
    column: start.column
  };
}

// 3. Call from appropriate parent rule
// Usually from parseBlock() or parseTopLevel()
```

### Transformer Code Generation

When adding code generation for a new AST node.

**Reference**: `compiler/transformer.js`

```javascript
// 1. Add visitor method
transformNewNode(node, context) {
  const name = node.name;
  const body = this.transformBlock(node.body, context);

  // Generate JavaScript code
  return `const ${name} = (() => {\n${body}\n})();`;
}

// 2. Register in the dispatch table
transform(node, context) {
  switch (node.type) {
    // ... existing cases ...
    case 'NewNode': return this.transformNewNode(node, context);
    default:
      throw new TransformError(`Unknown node type: ${node.type}`, {
        line: node.line,
        column: node.column
      });
  }
}
```

## CLI Command Pattern

**Reference**: `cli/index.js`

```javascript
// 1. Add command handler function
async function handleNewCommand(args, flags) {
  const target = args[0];
  if (!target) {
    console.error('Usage: pulse newcommand <target>');
    process.exit(1);
  }

  const verbose = flags.includes('--verbose');

  try {
    // Command logic
    const result = await doWork(target, { verbose });

    // Success output
    console.log(`\u2713 ${result.message}`);
    if (verbose) {
      console.log(`  Details: ${result.details}`);
    }
  } catch (err) {
    console.error(`\u2718 Error: ${err.message}`);
    if (verbose) console.error(err.stack);
    process.exit(1);
  }
}

// 2. Register in command dispatcher
case 'newcommand':
  return handleNewCommand(restArgs, flags);
```

## Build Tool Integration Pattern

**Reference**: `loader/vite-plugin.js`

```javascript
export default function pulsePlugin(options = {}) {
  const filter = /\.pulse$/;

  return {
    name: 'pulse-plugin',  // Required: unique plugin name

    // Transform .pulse files
    transform(code, id) {
      if (!filter.test(id)) return null;

      const { code: output, map } = compile(code, {
        filename: id,
        sourceMap: true,
        ...options
      });

      return { code: output, map };
    },

    // HMR support (Vite-specific)
    handleHotUpdate({ file, server }) {
      if (filter.test(file)) {
        // Invalidate module and re-transform
        const module = server.moduleGraph.getModuleById(file);
        if (module) {
          server.moduleGraph.invalidateModule(module);
          return [module];
        }
      }
    }
  };
}
```

## Store Module Pattern

**Reference**: `runtime/store.js` → `createModuleStore()`

```javascript
// Module definition
const userModule = {
  state: { name: '', email: '', loggedIn: false },

  actions: {
    login(store, credentials) {
      batch(() => {
        store.name.set(credentials.name);
        store.email.set(credentials.email);
        store.loggedIn.set(true);
      });
    },
    logout(store) {
      batch(() => {
        store.name.set('');
        store.email.set('');
        store.loggedIn.set(false);
      });
    }
  },

  getters: {
    displayName(store) {
      return store.loggedIn.get() ? store.name.get() : 'Guest';
    },
    isAuthenticated(store) {
      return store.loggedIn.get();
    }
  }
};
```

## Security-Safe Patterns

### User Input in DOM

```javascript
// String content is auto-safe via textContent
el('div', userInput);                          // ✓ Safe

// Use sanitizeUrl for any URL from user
const safeUrl = sanitizeUrl(userUrl);
if (safeUrl) el('a', { href: safeUrl }, 'Link'); // ✓ Safe

// Use safeSetAttribute for dynamic attributes
safeSetAttribute(element, attrName, attrValue);  // ✓ Safe
```

### User Input in CSS

```javascript
// Use safeSetStyle for dynamic styles
safeSetStyle(element, 'color', userColor);       // ✓ Safe

// Never use cssText with user input
element.style.cssText = userValue;               // ✗ DANGEROUS
```

### User Input in State

```javascript
// Sanitize object keys from external data
import { sanitizeObjectKeys } from './security.js';
const safeData = sanitizeObjectKeys(JSON.parse(externalJson));
store.$setState(safeData);                        // ✓ Safe
```
