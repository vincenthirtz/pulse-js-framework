# ADR-0012: Optional CSS preprocessor support

## Status

Accepted

## Date

2026-02-24

## Context

Developers commonly use SASS/SCSS, LESS, or Stylus in style blocks. Adding any preprocessor as a dependency contradicts the zero-dependencies policy (ADR-0010).

## Considered Alternatives

- **Mandatory preprocessor**: Bundle one preprocessor (e.g., sass). Breaks zero-deps and adds ~5MB to install.
- **No preprocessor support**: Users pre-compile outside Pulse. Poor DX, breaks the single-file component model.
- **Plugin system**: Users register preprocessors via config. More flexible but more boilerplate.

## Decision

Auto-detect preprocessor syntax in style blocks and compile if the corresponding package is installed as a dev dependency. Detection uses syntax heuristics:

- SASS: `$variable:`, `@mixin`, `@include`
- LESS: `@variable:`, `.mixin()`, `&:extend()`
- Stylus: `variable =`, indent-based blocks, `if`/`unless`

Priority when multiple syntaxes detected: SASS > LESS > Stylus. Falls back to plain CSS if no preprocessor syntax detected or package not installed.

## Consequences

### Positive
- Users install only what they need (`npm install -D sass`)
- Seamless integration — just write SASS/LESS/Stylus in style blocks
- Unified API via `preprocessStyles()` / `preprocessStylesSync()`

### Negative
- Auto-detection may misidentify edge cases with ambiguous syntax
- LESS only supports async compilation; `compileLessSync()` returns null

### Neutral
- All three preprocessors are well-maintained with stable APIs
