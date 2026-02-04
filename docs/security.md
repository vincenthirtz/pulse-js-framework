# Security Guide

Pulse Framework includes built-in security utilities to protect against common web vulnerabilities. This guide covers XSS prevention, URL sanitization, CSS injection protection, and best practices.

## Table of Contents

- [XSS Prevention](#xss-prevention)
- [URL Sanitization](#url-sanitization)
- [CSS Injection Protection](#css-injection-protection)
- [Attribute Safety](#attribute-safety)
- [Store Security](#store-security)
- [Router Security](#router-security)
- [Best Practices](#best-practices)

---

## XSS Prevention

### escapeHtml(str)

Escape HTML special characters to prevent XSS when inserting user content.

```javascript
import { escapeHtml } from 'pulse-js-framework/runtime';

// User input with malicious content
const userInput = '<script>alert("xss")</script>';

// Safe output
const safe = escapeHtml(userInput);
// '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'

// Safe to use in HTML
element.innerHTML = `<div>${escapeHtml(userInput)}</div>`;
```

### unescapeHtml(str)

Reverse HTML escaping (use carefully, only with trusted content).

```javascript
import { unescapeHtml } from 'pulse-js-framework/runtime';

unescapeHtml('&lt;div&gt;'); // '<div>'
```

### createSafeTextNode(content)

Create a DOM text node (inherently safe from XSS).

```javascript
import { createSafeTextNode } from 'pulse-js-framework/runtime';

const node = createSafeTextNode(userInput);
container.appendChild(node); // Safe, no HTML interpretation
```

### dangerouslySetInnerHTML(element, html, options?)

Explicitly set innerHTML with optional sanitization. Use only when necessary.

```javascript
import { dangerouslySetInnerHTML } from 'pulse-js-framework/runtime';

// With trusted content (no sanitization)
dangerouslySetInnerHTML(container, trustedHtml);

// With untrusted content (sanitization enabled)
dangerouslySetInnerHTML(container, userHtml, { sanitize: true });
```

---

## URL Sanitization

### sanitizeUrl(url, options?)

Validates and sanitizes URLs to prevent javascript: and data: protocol attacks.

```javascript
import { sanitizeUrl } from 'pulse-js-framework/runtime';

// Safe URLs pass through
sanitizeUrl('https://example.com');        // 'https://example.com'
sanitizeUrl('/relative/path');             // '/relative/path'

// Dangerous URLs are blocked
sanitizeUrl('javascript:alert(1)');        // null
sanitizeUrl('data:text/html,...');         // null (by default)
sanitizeUrl('&#x6a;avascript:alert(1)');   // null (decoded first)
```

#### Options

```javascript
// Allow data: URLs (e.g., for images)
sanitizeUrl('data:image/png;base64,...', { allowData: true });

// Allow blob: URLs
sanitizeUrl('blob:...', { allowBlob: true });

// Disallow relative URLs
sanitizeUrl('/path', { allowRelative: false }); // null
```

#### Use Cases

```javascript
// Safe link creation
const createLink = (url, text) => {
  const safeUrl = sanitizeUrl(url);
  if (!safeUrl) {
    console.warn('Blocked unsafe URL:', url);
    return null;
  }
  return el('a', { href: safeUrl }, text);
};

// Safe image source
const createImage = (src, alt) => {
  const safeSrc = sanitizeUrl(src, { allowData: true });
  if (!safeSrc) return el('div.placeholder', 'Invalid image');
  return el('img', { src: safeSrc, alt });
};
```

---

## CSS Injection Protection

### sanitizeCSSValue(value)

Checks CSS values for injection attempts.

```javascript
import { sanitizeCSSValue } from 'pulse-js-framework/runtime';

// Safe values
sanitizeCSSValue('red');
// { safe: true, value: 'red' }

sanitizeCSSValue('20px');
// { safe: true, value: '20px' }

// Blocked: semicolons (style injection)
sanitizeCSSValue('red; margin: 999px');
// { safe: false, value: 'red', blocked: 'semicolon' }

// Blocked: url() (external resource loading)
sanitizeCSSValue('url(http://evil.com)');
// { safe: false, value: '', blocked: 'url' }

// Blocked: expression() (IE script execution)
sanitizeCSSValue('expression(alert(1))');
// { safe: false, blocked: 'expression' }
```

### isValidCSSProperty(name)

Validate CSS property names.

```javascript
import { isValidCSSProperty } from 'pulse-js-framework/runtime';

isValidCSSProperty('backgroundColor'); // true
isValidCSSProperty('color');           // true
isValidCSSProperty('123invalid');      // false
isValidCSSProperty('-moz-appearance'); // true
```

### safeSetStyle(element, property, value, options?)

Safely set inline styles with validation.

```javascript
import { safeSetStyle } from 'pulse-js-framework/runtime';

// Safe usage
safeSetStyle(element, 'color', 'red');           // OK
safeSetStyle(element, 'fontSize', '16px');       // OK

// Blocked: semicolon injection
safeSetStyle(element, 'color', 'red; margin: 0'); // Blocked

// Allow url() when needed (e.g., background images)
safeSetStyle(element, 'background', 'url(...)', { allowUrl: true });
```

---

## Attribute Safety

### safeSetAttribute(element, name, value, options?)

Safely set element attributes, blocking dangerous patterns.

```javascript
import { safeSetAttribute } from 'pulse-js-framework/runtime';

// Safe attributes
safeSetAttribute(element, 'data-id', userId);          // OK
safeSetAttribute(element, 'class', 'active');          // OK
safeSetAttribute(element, 'aria-label', 'Close');      // OK

// Blocked: event handlers (prevents XSS)
safeSetAttribute(element, 'onclick', 'alert(1)');      // BLOCKED
safeSetAttribute(element, 'onerror', 'alert(1)');      // BLOCKED

// Blocked: javascript: URLs in href/src
safeSetAttribute(element, 'href', 'javascript:void(0)'); // BLOCKED
safeSetAttribute(element, 'src', 'javascript:alert(1)'); // BLOCKED

// URL attributes are automatically sanitized
safeSetAttribute(element, 'href', userUrl); // Sanitized
```

#### Options

```javascript
// Allow event handlers (use with caution!)
safeSetAttribute(element, 'onclick', handler, { allowEventHandlers: true });

// Allow data: URLs
safeSetAttribute(element, 'src', dataUrl, { allowDataUrls: true });
```

### escapeAttribute(value)

Escape a value for safe use in HTML attributes.

```javascript
import { escapeAttribute } from 'pulse-js-framework/runtime';

const userValue = '" onclick="alert(1)"';
const safe = escapeAttribute(userValue);
// '&quot; onclick=&quot;alert(1)&quot;'

// Safe in attributes
element.setAttribute('data-value', escapeAttribute(userInput));
```

---

## Store Security

Pulse stores include built-in protection against common attacks.

### Prototype Pollution Protection

The store automatically blocks attempts to pollute object prototypes:

```javascript
import { createStore } from 'pulse-js-framework/runtime';

const store = createStore({ user: null });

// These keys are blocked:
store.user.set({ __proto__: {} });     // Rejected
store.user.set({ constructor: {} });   // Rejected
store.user.set({ prototype: {} });     // Rejected
```

### Type Validation

Functions and Symbols are blocked to prevent code injection:

```javascript
// Blocked:
store.user.set({ hack: () => {} });     // Functions rejected
store.user.set({ key: Symbol() });      // Symbols rejected
```

### Nesting Depth Limits

Deep nesting is limited to prevent stack overflow attacks:

```javascript
// Maximum nesting depth: 10 levels
// Deeper objects are rejected
```

### Safe Deserialization

When loading persisted state, schema validation is applied:

```javascript
const store = createStore(
  { user: null },
  {
    persist: true,
    schema: {
      user: (v) => v === null || (typeof v === 'object' && typeof v.name === 'string')
    }
  }
);
```

---

## Router Security

### Query String Limits

The router enforces limits to prevent DoS attacks:

```javascript
// Hard limits:
// - Max total length: 2KB
// - Max single value length: 1KB
// - Max parameters: 50

// Oversized query strings are truncated or rejected
```

### Path Traversal Protection

Route parameters are validated to prevent path traversal:

```javascript
// Routes are matched exactly, no path traversal
router.navigate('/../../../etc/passwd'); // No match, safe
```

---

## Best Practices

### 1. Always Escape User Input

```javascript
// BAD: Direct insertion
element.innerHTML = userInput;

// GOOD: Escape first
element.innerHTML = escapeHtml(userInput);

// BETTER: Use text nodes
element.textContent = userInput;

// BEST: Use Pulse's el() which handles this automatically
el('div', userInput); // Safe by default
```

### 2. Validate URLs Before Use

```javascript
// BAD: Direct use
el('a', { href: userUrl });

// GOOD: Validate first
const safeUrl = sanitizeUrl(userUrl);
if (safeUrl) {
  el('a', { href: safeUrl });
}
```

### 3. Use Safe Style Setting

```javascript
// BAD: Direct style assignment
element.style.cssText = userStyle;

// GOOD: Use safeSetStyle
safeSetStyle(element, 'color', userColor);
```

### 4. Never Trust Client-Side Validation Alone

```javascript
// Client-side validation is for UX, not security
// Always validate on the server too
```

### 5. Use Content Security Policy

```html
<!-- Add CSP headers to your server -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'">
```

### 6. Sanitize File Uploads

```javascript
// Validate file types server-side
// Never trust Content-Type headers alone
// Use magic number validation
```

### 7. Secure WebSocket Connections

```javascript
import { createWebSocket } from 'pulse-js-framework/runtime';

// Always use wss:// in production
const ws = createWebSocket('wss://api.example.com/ws', {
  // Authentication token
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 8. Protect Sensitive Data in State

```javascript
// Don't store sensitive data in persisted stores
const store = createStore(
  { user: null, token: null },
  { persist: false } // Don't persist auth tokens
);

// Or exclude sensitive fields
const store = createStore(
  { user: null, token: null },
  {
    persist: true,
    exclude: ['token'] // Don't persist token
  }
);
```

---

## Security Checklist

- [ ] All user input is escaped before HTML insertion
- [ ] URLs are validated with `sanitizeUrl()` before use
- [ ] CSS values are checked with `sanitizeCSSValue()`
- [ ] Event handler attributes are never set from user input
- [ ] Store state is validated with schemas
- [ ] WebSocket connections use `wss://` in production
- [ ] Sensitive data is not persisted to localStorage
- [ ] CSP headers are configured on the server
- [ ] Server-side validation complements client-side checks

---

## Reporting Security Issues

If you discover a security vulnerability in Pulse Framework, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security concerns to the maintainers
3. Include steps to reproduce the vulnerability
4. Allow time for a fix before public disclosure

See [SECURITY.md](https://github.com/anthropics/pulse-js-framework/blob/main/SECURITY.md) for full disclosure policy.
