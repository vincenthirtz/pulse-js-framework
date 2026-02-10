---
name: security-reviewer
description: Security review agent for the Pulse JS framework. Use this skill to audit code for security vulnerabilities (XSS, injection, prototype pollution), review PRs for unsafe patterns, run security scans, and propose secure alternatives. Covers OWASP Top 10 web risks in the context of a client-side SPA framework.
---

# Security Reviewer for Pulse Framework

## When to Use This Skill

- Reviewing code for XSS vulnerabilities (script injection, event handler injection)
- Auditing URL handling for `javascript:` / `data:` protocol attacks
- Checking CSS values for injection or exfiltration patterns
- Reviewing attribute setting for unsafe patterns
- Auditing store/state for prototype pollution risks
- Checking user input handling across the framework
- Running automated security scans on the codebase
- Reviewing PRs before merge for security regressions
- Proposing secure alternatives to dangerous code patterns
- Verifying that security utilities are used correctly

## Bundled Resources

| Resource | Description |
|----------|-------------|
| **assets/** | Vulnerability patterns, secure code examples |
| **scripts/** | Automated security auditors and scanners |
| **references/** | OWASP checklist, secure coding guide, threat model |

## Security Architecture Overview

Pulse has a **zero-dependency** security model built into the framework:

| Layer | Protection | Module |
|-------|-----------|--------|
| **HTML** | `escapeHtml()`, `createSafeTextNode()` | `runtime/utils.js` |
| **URLs** | `sanitizeUrl()` blocks `javascript:`, `data:text/html` | `runtime/utils.js` |
| **CSS** | `sanitizeCSSValue()` blocks `expression()`, `url()`, `;` | `runtime/utils.js` |
| **Attributes** | `safeSetAttribute()` blocks 85+ event handlers | `runtime/utils.js` |
| **HTML content** | `sanitizeHtml()` allowlist-based tag/attr filtering | `runtime/security.js` |
| **Objects** | `sanitizeObjectKeys()` blocks `__proto__`, `constructor` | `runtime/security.js` |
| **DOM** | `el()` auto-escapes text, uses `textContent` | `runtime/dom.js` |
| **Router** | Query string limits (2KB), path exact matching | `runtime/router.js` |
| **Store** | Type validation, nesting depth limits (10) | `runtime/store.js` |

## Quick Reference: Dangerous vs Safe Patterns

### XSS Prevention

```javascript
// DANGEROUS - direct innerHTML
element.innerHTML = userInput;

// SAFE - use escapeHtml or sanitizeHtml
import { escapeHtml, sanitizeHtml } from 'pulse-js-framework/runtime/utils';
element.textContent = userInput;                          // Best: auto-safe
element.innerHTML = escapeHtml(userInput);                // OK: escaped
dangerouslySetInnerHTML(element, html, { sanitize: true }); // OK: sanitized
```

### URL Handling

```javascript
// DANGEROUS - unvalidated URL
element.setAttribute('href', userUrl);
window.location = userUrl;

// SAFE - use sanitizeUrl
import { sanitizeUrl } from 'pulse-js-framework/runtime/utils';
const safeUrl = sanitizeUrl(userUrl);
if (safeUrl) element.setAttribute('href', safeUrl);
// sanitizeUrl blocks: javascript:, vbscript:, data:text/html, data:text/javascript
```

### Attribute Setting

```javascript
// DANGEROUS - allows event handler injection
element.setAttribute(userAttrName, userAttrValue);

// SAFE - blocks event handlers automatically
import { safeSetAttribute } from 'pulse-js-framework/runtime/utils';
safeSetAttribute(element, attrName, attrValue);
// Blocks: onclick, onerror, onload, and 80+ event handlers
// Auto-sanitizes: href, src, action, formaction URLs
```

### CSS Values

```javascript
// DANGEROUS - allows injection via semicolons
element.style.cssText = userValue;
element.style.color = 'red; background: url(evil.com)';

// SAFE - validates and strips dangerous patterns
import { safeSetStyle, sanitizeCSSValue } from 'pulse-js-framework/runtime/utils';
safeSetStyle(element, 'color', userValue);
// Blocks: expression(), url(), @import, </style>, behavior:, -moz-binding
```

### Object/State Safety

```javascript
// DANGEROUS - prototype pollution via user input
const state = JSON.parse(userJson);
Object.assign(config, userInput);

// SAFE - sanitize keys first
import { sanitizeObjectKeys } from 'pulse-js-framework/runtime/security';
const safeState = sanitizeObjectKeys(JSON.parse(userJson));
// Blocks: __proto__, constructor, prototype, __defineGetter__, etc.
```

### DOM Creation (auto-safe)

```javascript
// el() is SAFE by default - uses textContent for strings
el('div', userInput);                          // Safe: text node
el('div', () => `Hello ${name.get()}`);        // Safe: reactive text

// Use bind()/on() instead of setAttribute for dynamic attrs
bind(element, 'value', () => input.get());     // Safe
on(element, 'click', handler);                 // Safe: proper event API
```

## Available Scripts

```bash
# Full security audit of the codebase
node .claude/skills/security-reviewer/scripts/audit-codebase.js

# Scan a specific file for vulnerabilities
node .claude/skills/security-reviewer/scripts/audit-codebase.js runtime/dom.js

# Check dependencies for known vulnerabilities
npm audit --audit-level=moderate
```

## Security Review Checklist

When reviewing code, verify:

- [ ] **No raw innerHTML** - Use `el()`, `textContent`, or `sanitizeHtml()`
- [ ] **No unvalidated URLs** - All user URLs pass through `sanitizeUrl()`
- [ ] **No direct setAttribute for events** - Use `on()` or `safeSetAttribute()`
- [ ] **No unsanitized CSS values** - Use `safeSetStyle()` or `sanitizeCSSValue()`
- [ ] **No raw JSON.parse of user input** - Use `sanitizeObjectKeys()` after parsing
- [ ] **No eval/Function constructor** - Never with user input
- [ ] **No document.write** - Use `el()` and `mount()`
- [ ] **Query strings validated** - Router enforces 2KB limit, 50 params max
- [ ] **Store state validated** - Type checking, depth limits, no functions in state
- [ ] **Error messages safe** - No user input in error HTML rendering

## Threat Model

| Attack | Vector | Pulse Protection |
|--------|--------|-----------------|
| Stored XSS | User content rendered as HTML | `escapeHtml()`, `el()` auto-escapes |
| Reflected XSS | URL params rendered | `sanitizeUrl()`, router param encoding |
| DOM-based XSS | `innerHTML` with user data | `safeSetAttribute()`, `dangerouslySetInnerHTML` |
| Event handler injection | `setAttribute('onclick', ...)` | `safeSetAttribute()` blocks 85+ handlers |
| `javascript:` URL | `href`, `src` with JS protocol | `sanitizeUrl()` blocks all JS protocols |
| CSS injection | `style` attribute manipulation | `sanitizeCSSValue()` strips dangerous patterns |
| CSS exfiltration | `url()` in styles to leak data | `sanitizeCSSValue()` blocks `url()` by default |
| Prototype pollution | `__proto__` in JSON input | `sanitizeObjectKeys()` recursive filtering |
| Path traversal | `../../etc/passwd` in routes | Exact route matching, no filesystem access |
| Query string DoS | Very long/many query params | 2KB total limit, 50 params max, 1KB per value |
| Encoding bypass | `&#106;avascript:` | Multi-layer decode before protocol check |

## Reference Documentation

- **[secure-coding.md](references/secure-coding.md)** - Secure coding patterns for each Pulse module
- **[owasp-checklist.md](references/owasp-checklist.md)** - OWASP Top 10 mapping for SPAs
- **[threat-model.md](references/threat-model.md)** - Detailed threat analysis and mitigations

## Key Security Files

| File | Purpose |
|------|---------|
| `runtime/utils.js` | XSS, URL, CSS, attribute sanitization |
| `runtime/security.js` | Prototype pollution, HTML sanitization |
| `test/security.test.js` | 150+ security test cases |
| `test/utils.test.js` | Utility function tests (includes security) |
| `docs/security.md` | User-facing security documentation |
| `.github/workflows/ci.yml` | npm audit in CI pipeline |

## Quick Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| `sanitizeUrl()` returns null | Dangerous protocol detected | Use `https://` URLs or check input |
| `safeSetAttribute()` silently ignores | Event handler attribute blocked | Use `on()` function instead |
| `sanitizeCSSValue()` strips value | Injection pattern detected | Remove `;`, `url()`, `expression()` |
| `sanitizeObjectKeys()` removes keys | `__proto__` or `constructor` found | Rename keys or filter input upstream |
| npm audit warns | Vulnerable dependency | Update dependency or add override |
