# OWASP Top 10 - Pulse Framework Mapping

How each OWASP Top 10 (2021) risk applies to a client-side SPA framework.

## A01:2021 - Broken Access Control

**Applicability:** Medium (client-side routing, not server enforcement)

**Pulse mitigations:**
- Route guards (`beforeEnter`, `beforeEach`) for client-side access control
- Middleware support for authentication checks

**Review points:**
- [ ] Route guards check authentication state before rendering protected pages
- [ ] Server must independently enforce access control (client guards are bypassable)
- [ ] No sensitive data stored in client-side store without server validation
- [ ] API requests include proper authorization headers via interceptors

```javascript
// Client-side guard (complement, not replacement for server auth)
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return '/login';
  }
});
```

## A02:2021 - Cryptographic Failures

**Applicability:** Low (framework doesn't handle encryption)

**Review points:**
- [ ] No sensitive data in `localStorage`/`sessionStorage` (store persistence)
- [ ] HTTPS used for all API calls (`createHttp({ baseURL: 'https://...' })`)
- [ ] WSS used for WebSocket (`createWebSocket('wss://...')`)
- [ ] No secrets in client-side code or query parameters
- [ ] Tokens stored in memory (pulses), not localStorage

## A03:2021 - Injection

**Applicability:** High (XSS is the main injection vector for SPAs)

**Pulse mitigations:**
- `el()` uses `textContent` for strings (auto-safe)
- `escapeHtml()` for explicit HTML escaping
- `sanitizeUrl()` blocks `javascript:` and `data:` URLs
- `sanitizeCSSValue()` blocks CSS injection
- `safeSetAttribute()` blocks event handler injection
- `sanitizeHtml()` allowlist-based HTML filtering
- `sanitizeObjectKeys()` blocks prototype pollution

**Review points:**
- [ ] No raw `innerHTML` assignment with user data
- [ ] All user-provided URLs pass through `sanitizeUrl()`
- [ ] No `eval()` or `new Function()` with user input
- [ ] No `document.write()` with user data
- [ ] GraphQL queries use variables, not string interpolation
- [ ] No `setAttribute('on*', ...)` for event handlers

## A04:2021 - Insecure Design

**Applicability:** Medium

**Review points:**
- [ ] Error messages don't expose internal details to users
- [ ] Rate limiting on form submissions (debounce)
- [ ] Input validation on client (with server-side enforcement)
- [ ] No feature flags or debug modes exposed in production
- [ ] DevTools disabled in production builds

```javascript
// Production: disable devtools
if (process.env.NODE_ENV === 'production') {
  // Don't call enableDevTools()
}
```

## A05:2021 - Security Misconfiguration

**Applicability:** Medium

**Review points:**
- [ ] CSP headers configured on the server for the SPA
- [ ] No `*` in CORS configuration
- [ ] `withCredentials: false` by default in HTTP client
- [ ] Dev server not exposed to network (bind to localhost)
- [ ] Source maps disabled in production
- [ ] Debug logging disabled in production (`configureLogger({ production: true })`)

## A06:2021 - Vulnerable and Outdated Components

**Applicability:** High (npm ecosystem)

**Pulse mitigations:**
- Zero runtime dependencies (no third-party code in production bundle)
- `npm audit` in CI pipeline

**Review points:**
- [ ] `npm audit` runs in CI (`.github/workflows/ci.yml`)
- [ ] Dev dependencies regularly updated
- [ ] Optional dependencies (`sass`, `less`, `stylus`) at latest versions
- [ ] No known vulnerabilities in build tool chain

## A07:2021 - Identification and Authentication Failures

**Applicability:** Low (authentication is server-side)

**Review points:**
- [ ] Auth tokens not stored in `localStorage` (use in-memory pulses)
- [ ] Token refresh handled via HTTP interceptors
- [ ] Logout clears all client-side state (`store.$reset()`)
- [ ] No auto-login based on client-side state alone

```javascript
// Secure token storage
const authToken = pulse(null); // Memory only, not persisted

// Auto-refresh via interceptor
api.interceptors.response.use(null, async (error) => {
  if (error.status === 401) {
    await refreshToken();
    return api.request(error.config); // Retry
  }
  throw error;
});
```

## A08:2021 - Software and Data Integrity Failures

**Applicability:** Medium

**Review points:**
- [ ] Subresource Integrity (SRI) for CDN scripts
- [ ] No dynamic script loading from user input
- [ ] Build pipeline protected (CI/CD permissions)
- [ ] `npm ci` used in CI (deterministic installs)

## A09:2021 - Security Logging and Monitoring Failures

**Applicability:** Low (client-side logging)

**Pulse mitigations:**
- `runtime/logger.js` for structured logging
- DevTools with timeline and profiling

**Review points:**
- [ ] Security-relevant events logged (auth failures, blocked URLs)
- [ ] Logs don't contain sensitive data (passwords, tokens)
- [ ] Error reporting sends context but not user secrets
- [ ] Production logging level set to WARN or ERROR

## A10:2021 - Server-Side Request Forgery (SSRF)

**Applicability:** Very Low (client-side framework)

**Review points:**
- [ ] SSR mode (`runtime/ssr.js`) doesn't fetch user-controlled URLs on server
- [ ] Server-side data fetching validates URLs
- [ ] No open redirects (router validates routes against defined paths)

## Summary Matrix

| OWASP Risk | Client Relevance | Pulse Built-in Protection | Manual Review Needed |
|------------|-------------------|---------------------------|---------------------|
| A01 Access Control | Medium | Route guards, middleware | Server enforcement |
| A02 Cryptography | Low | N/A | HTTPS, token storage |
| A03 Injection | **High** | **Comprehensive** (7 functions) | innerHTML bypasses |
| A04 Insecure Design | Medium | N/A | Error handling, debug modes |
| A05 Misconfiguration | Medium | N/A | CSP, CORS, source maps |
| A06 Components | **High** | **Zero deps + npm audit** | Dev deps updates |
| A07 Authentication | Low | N/A | Token storage, refresh |
| A08 Integrity | Medium | N/A | SRI, build pipeline |
| A09 Logging | Low | Logger module | Sensitive data in logs |
| A10 SSRF | Very Low | N/A | SSR URL validation |
