# Secure Coding Guide for Pulse Framework

## Core Principle

Pulse provides **safe-by-default** APIs. Security issues arise when bypassing these APIs.

## Module-by-Module Security Guide

### DOM (runtime/dom.js)

**Safe by default:**
- `el('div', userText)` uses `textContent` (no HTML interpretation)
- `el('div', () => expr)` reactive text is also safe
- Attributes in selectors are static at parse time

**Watch out for:**
```javascript
// UNSAFE: Bypassing el() to set innerHTML directly
element.innerHTML = userContent;

// SAFE alternatives:
el('div', userContent);                                    // Text node
dangerouslySetInnerHTML(element, html, { sanitize: true }); // Sanitized HTML
```

**Reactive attributes are safe:**
```javascript
// el() handles reactive attributes through bind() internally
el('a', { href: () => url.get() }); // url is set as property, not parsed as HTML
```

### URL Handling

**Always sanitize user-provided URLs:**
```javascript
import { sanitizeUrl } from 'pulse-js-framework/runtime/utils';

// Before setting href, src, action, formaction, poster, cite, etc.
const safeUrl = sanitizeUrl(userUrl);
if (safeUrl) {
  el('a', { href: safeUrl }, 'Link');
}

// sanitizeUrl handles encoding bypass attacks:
// &#106;avascript:   → blocked (decoded first)
// %6Aavascript:      → blocked (URL decoded)
// java\x00script:    → blocked (null bytes stripped)
// JaVaScRiPt:        → blocked (case insensitive)
```

**Blocked protocols:** `javascript:`, `vbscript:`, `data:text/html`, `data:text/javascript`

**Allowed protocols:** `http:`, `https:`, `mailto:`, `tel:`, `sms:`, `ftp:`, `sftp:`, relative paths

### CSS Values

**Never trust user input in styles:**
```javascript
import { safeSetStyle, sanitizeCSSValue } from 'pulse-js-framework/runtime/utils';

// SAFE: validates before setting
safeSetStyle(element, 'color', userColor);

// Manual check
const { safe, value, blocked } = sanitizeCSSValue(userValue);
if (safe) element.style.color = value;
```

**Blocked patterns:**
- `expression()` - IE JavaScript execution
- `url()` - External resource loading (data exfiltration)
- `@import` - External stylesheet injection
- `;` - Property injection (multiple declarations)
- `</style>` - Context breakout
- `behavior:` - IE behavior binding
- `-moz-binding` - Firefox XBL binding

### Attributes

**Use safeSetAttribute for any user-influenced attributes:**
```javascript
import { safeSetAttribute } from 'pulse-js-framework/runtime/utils';

// Automatically blocks event handlers (onclick, onerror, etc.)
safeSetAttribute(element, attrName, attrValue);

// Automatically sanitizes URL attributes (href, src, etc.)
safeSetAttribute(element, 'href', userUrl);
```

**Why?** `setAttribute('onclick', code)` creates executable event handlers.

### Store & State

**Prototype pollution protection:**
```javascript
import { sanitizeObjectKeys } from 'pulse-js-framework/runtime/security';

// When accepting data from external sources (API responses, user input)
const safeData = sanitizeObjectKeys(apiResponse);
store.$setState(safeData);
```

**Store built-in protections:**
- Rejects `Function` and `Symbol` values
- Max nesting depth of 10 levels
- Schema validation for persisted state

### Router

**Built-in protections:**
- Query string total limit: 2KB
- Single parameter value limit: 1KB
- Max parameters: 50
- Exact route matching (no path traversal)
- Parameters are string values (no code execution)

**Be careful with:**
```javascript
// User-controlled redirects
router.navigate(userPath); // OK if path matches defined routes
// But never use user input directly in window.location without validation
```

### HTTP Client

**Safe practices:**
```javascript
import { createHttp } from 'pulse-js-framework/runtime/http';

const api = createHttp({
  baseURL: 'https://api.example.com', // Fixed base URL
  withCredentials: false,              // Don't send cookies by default
  timeout: 5000                        // Prevent hanging requests
});

// Use interceptors for auth tokens (not URL params)
api.interceptors.request.use(config => {
  config.headers['Authorization'] = `Bearer ${getToken()}`;
  return config;
});
```

**Watch out for:**
- Don't put secrets in query parameters (logged by servers)
- Don't disable HTTPS (`withCredentials: false` by default is good)
- Use `AbortController` for timeout protection

### WebSocket

**Safe practices:**
```javascript
// Use wss:// (encrypted), never ws:// in production
const ws = createWebSocket('wss://api.example.com/ws');

// Validate incoming messages
ws.on('message', (data) => {
  const safeData = sanitizeObjectKeys(data);
  processMessage(safeData);
});
```

### GraphQL

**Safe practices:**
- Use parameterized queries (variables), never string interpolation
- Validate subscription data before rendering

```javascript
// SAFE: parameterized
useQuery(`query GetUser($id: ID!) { user(id: $id) { name } }`, { id: userId });

// UNSAFE: string interpolation
useQuery(`query { user(id: "${userId}") { name } }`); // SQL injection equivalent
```

## General Rules

1. **Trust the framework APIs** - `el()`, `bind()`, `on()` are safe by design
2. **Sanitize at boundaries** - User input, API responses, URL parameters
3. **Don't bypass safety** - Avoid `innerHTML`, `eval`, `document.write`
4. **Validate URLs** - Always use `sanitizeUrl()` for user-provided URLs
5. **Validate CSS** - Always use `safeSetStyle()` for user-provided styles
6. **Validate objects** - Use `sanitizeObjectKeys()` for external data
7. **Use HTTPS** - `wss://` for WebSocket, `https://` for HTTP
8. **Parameterize queries** - Never interpolate user data into GraphQL strings
