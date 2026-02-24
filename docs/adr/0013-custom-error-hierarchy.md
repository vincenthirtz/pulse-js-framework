# ADR-0013: Custom error class hierarchy

## Status

Accepted

## Date

2026-02-24

## Context

Generic `Error` messages provide poor developer experience. When errors occur in a framework with compiler, runtime, and CLI layers, developers need to quickly identify the source and get actionable guidance.

## Considered Alternatives

- **Error codes only**: Attach codes to generic Error. Simple but no structured properties or type-based catch filtering.
- **Single PulseError class**: One class with a `category` property. Simpler but loses `instanceof` checks and IDE type narrowing.

## Decision

Structured error hierarchy with three branches:

```
PulseError (base — source location, code, suggestion, docs URL)
├── CompileError
│   ├── LexerError
│   ├── ParserError (+ token info)
│   └── TransformError
├── RuntimeError
│   ├── ReactivityError
│   ├── DOMError
│   ├── StoreError
│   └── RouterError
└── CLIError
    └── ConfigError
```

Server Components adds `PSCSecurityError` and subclasses (CSRF, rate limit, serialization).

All errors include: `code`, `suggestion`, `line`/`column`/`file`, and `formatWithSnippet()` for compiler errors. Pre-built error creators in `Errors.*` for common cases.

## Consequences

### Positive
- Actionable error messages with fix suggestions and documentation links
- `instanceof` checks enable targeted error handling
- `formatWithSnippet()` shows source context for compiler errors
- Consistent error reporting across all framework layers

### Negative
- ~3KB additional bundle size for error classes
- Every throw site must use the appropriate class (enforced by audit)

### Neutral
- Error codes double as documentation URL slugs (e.g., `CIRCULAR_DEPENDENCY` → docs page)
