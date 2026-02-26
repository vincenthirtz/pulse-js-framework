# Security - Built-in security utilities for XSS prevention, URL sanitization, CSS injection, and safe DOM operations.

All imports from `pulse-js-framework/runtime` (utils.js).

## XSS Prevention

| Function | Signature | Description |
|----------|-----------|-------------|
| `escapeHtml` | `(str) → string` | Escape `<>&"'` to HTML entities |
| `unescapeHtml` | `(str) → string` | Reverse HTML escaping (trusted content only) |
| `createSafeTextNode` | `(content) → TextNode` | Create text node (inherently XSS-safe) |
| `dangerouslySetInnerHTML` | `(el, html, opts?)` | Set innerHTML; `{ sanitize: true }` for untrusted |

**Best practice:** Use `el('div', userInput)` — safe by default. Use `escapeHtml()` if doing manual innerHTML.

## URL Sanitization

```javascript
sanitizeUrl(url, options?) → string | null
```

| Option | Default | Description |
|--------|---------|-------------|
| `allowData` | `false` | Allow `data:` URLs |
| `allowBlob` | `false` | Allow `blob:` URLs |
| `allowRelative` | `true` | Allow relative URLs |

Blocks: `javascript:`, `data:` (default), `vbscript:`, HTML-encoded variants.

```javascript
sanitizeUrl('https://example.com');        // 'https://example.com'
sanitizeUrl('javascript:alert(1)');        // null
sanitizeUrl('data:image/png;...', { allowData: true }); // allowed
```

## CSS Injection Protection

| Function | Signature | Description |
|----------|-----------|-------------|
| `sanitizeCSSValue` | `(value) → { safe, value, blocked? }` | Check for injection (`;`, `url()`, `expression()`) |
| `isValidCSSProperty` | `(name) → boolean` | Validate CSS property name |
| `safeSetStyle` | `(el, prop, value, opts?)` | Set style with validation; `{ allowUrl: true }` for backgrounds |

## Attribute Safety

| Function | Signature | Description |
|----------|-----------|-------------|
| `safeSetAttribute` | `(el, name, value, opts?)` | Set attribute, blocks event handlers and `javascript:` URLs |
| `escapeAttribute` | `(value) → string` | Escape value for HTML attributes |

`safeSetAttribute` options: `{ allowEventHandlers: true }`, `{ allowDataUrls: true }`.

**Blocked by default:** `onclick`, `onerror`, all `on*` event handler attributes. URL attributes (`href`, `src`) auto-sanitized.

## Store Security

| Protection | Details |
|-----------|---------|
| Prototype pollution | Blocks `__proto__`, `constructor`, `prototype` keys |
| Type validation | Rejects functions and Symbols in store values |
| Nesting depth | Max 10 levels (prevents stack overflow) |
| Safe deserialization | Schema validation for persisted state |

```javascript
const store = createStore({ user: null }, {
  persist: true,
  schema: { user: (v) => v === null || (typeof v === 'object' && typeof v.name === 'string') }
});
```

## Router Security

| Protection | Limit |
|-----------|-------|
| Query string total length | 2KB max |
| Single value length | 1KB max |
| Max parameters | 50 |
| Path traversal | Routes matched exactly, no `../` traversal |

## Security Checklist

- [ ] All user input escaped before HTML insertion
- [ ] URLs validated with `sanitizeUrl()` before use
- [ ] CSS values checked with `sanitizeCSSValue()`
- [ ] Event handler attributes never set from user input
- [ ] Store state validated with schemas
- [ ] WebSocket connections use `wss://` in production
- [ ] Sensitive data not persisted to localStorage
- [ ] CSP headers configured on server
- [ ] Server-side validation complements client-side checks

## Best Practices

1. **Prefer `el()` over innerHTML** — `el('div', userInput)` is safe by default
2. **Always `sanitizeUrl()`** before setting `href`/`src` from user input
3. **Use `safeSetStyle()`** instead of `element.style.cssText = userValue`
4. **Never trust client-side validation alone** — always validate server-side
5. **Use `wss://` in production** for WebSocket connections
6. **Exclude sensitive fields** from persisted stores: `{ persist: true, exclude: ['token'] }`
