# Pulse Example: SASS/SCSS CSS

Demonstrates SASS/SCSS preprocessor support with variables, mixins, nesting, extend, color functions, and control directives.

## Features Demonstrated

- `$variables` for colors and spacing
- `@mixin` / `@include` for reusable style blocks
- Nesting with `&` parent reference
- `@extend` with placeholder selectors (`%card-style`)
- Color functions (`lighten()`, `darken()`, `mix()`)
- `@each` loop for generating theme button styles
- `@if` / `@else` conditionals
- Mathematical operations (`$spacing * 2`)

## Getting Started

```bash
# Install SASS (required)
npm install -D sass

cd examples/sass-example
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `SassDemo.pulse` | Component with SCSS in style block |
| `SassDemo.js` | Pre-compiled JavaScript output |
| `main.js` | Entry point |

## How It Works

Pulse auto-detects SASS/SCSS syntax in `style` blocks based on patterns like `$variable:`, `@mixin`, and `@include`. When the `sass` npm package is installed, styles are compiled automatically during `pulse dev` or `pulse build`.

```pulse
style {
  $primary: #7c3aed;

  @mixin button-base {
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
  }

  .btn {
    @include button-base;
    background: $primary;
    color: white;

    &:hover {
      background: darken($primary, 10%);
    }
  }
}
```

## SASS vs LESS vs Stylus

| Feature | SASS | LESS | Stylus |
|---------|------|------|--------|
| Variables | `$color: red` | `@color: red` | `color = red` |
| Mixins | `@mixin` / `@include` | `.mixin()` | `mixin()` |
| Extend | `@extend .class` | `&:extend(.class)` | `@extend .class` |
| Nesting | `&` parent | `&` parent | `&` parent |
| Functions | `lighten()`, `darken()` | `lighten()`, `darken()` | `lighten()`, `darken()` |
| Syntax | Braces + semicolons | Braces + semicolons | Optional (flexible) |

## Learn More

- [SASS Documentation](https://sass-lang.com/documentation)
- [Pulse Preprocessor API](https://pulse-js.fr/api-reference)
