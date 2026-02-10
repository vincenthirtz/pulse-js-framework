# Security Review Report

**Date:** {{DATE}}
**Reviewer:** Claude Security Agent
**Scope:** {{SCOPE}}

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

## Findings

### [FINDING-ID] Title

- **Severity:** Critical / High / Medium / Low
- **File:** `path/to/file.js:line`
- **Category:** XSS / Injection / Prototype Pollution / Information Disclosure

**Description:**
Brief description of the vulnerability.

**Vulnerable Code:**
```javascript
// The problematic code
```

**Secure Alternative:**
```javascript
// The recommended fix
```

**References:**
- OWASP: [link]
- Pulse docs: `docs/security.md`

---

## Checklist

- [ ] No raw innerHTML with user data
- [ ] All user URLs sanitized with `sanitizeUrl()`
- [ ] No `eval()` or `new Function()` with user input
- [ ] No `setAttribute('on*', ...)` for event handlers
- [ ] CSS values validated with `sanitizeCSSValue()`
- [ ] External JSON sanitized with `sanitizeObjectKeys()`
- [ ] HTTPS/WSS used for external connections
- [ ] GraphQL queries use variables (not string interpolation)
- [ ] Error messages don't expose internal details
- [ ] DevTools/debug logging disabled in production

## Recommendations

1. ...
2. ...
3. ...
