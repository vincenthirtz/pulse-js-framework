# ADR-0010: Zero external dependencies

## Status

Accepted

## Date

2026-02-24

## Context

SPA frameworks often ship megabytes of transitive dependencies, creating supply chain risk, bundle bloat, and version conflicts. The `left-pad` and `colors.js` incidents demonstrated the fragility of deep dependency trees.

## Considered Alternatives

- **Curated dependency list**: Hand-pick trusted packages for router, HTTP, etc. Lower effort but still exposes supply chain risk.
- **Vendoring**: Copy dependency code into the repo. Avoids runtime risk but creates maintenance burden for updates.

## Decision

The entire framework — runtime, compiler, CLI, and build tool plugins — has zero production dependencies. Every module (router, store, form, HTTP client, WebSocket, GraphQL, a11y) is implemented in-house.

CSS preprocessors (sass, less, stylus) are optional peer dependencies, not production dependencies.

## Consequences

### Positive
- Zero supply chain attack surface
- Complete control over all code paths
- Minimal bundle size (no unused transitive code)
- No version conflicts with user's dependencies

### Negative
- Larger initial development effort for each module
- Must maintain feature parity with established libraries
- Bug fixes and security patches are our responsibility

### Neutral
- Dev dependencies (test runners, etc.) are still allowed
