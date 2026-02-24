# CSS Preprocessor Support (SASS/LESS/Stylus)

> Load this context file when working on CSS preprocessor support or style blocks.

## CSS Preprocessor Support (SASS/SCSS, LESS, and Stylus)

Pulse supports SASS/SCSS, LESS, and Stylus syntax in style blocks **without adding them as dependencies**. If the user has `sass`, `less`, or `stylus` installed in their project, they are automatically detected and used.

### Quick Start

```bash
# Install SASS in your project (optional)
npm install -D sass

# OR install LESS in your project (optional)
npm install -D less

# OR install Stylus in your project (optional)
npm install -D stylus
```

#### SASS/SCSS Example

```pulse
style {
  // SASS variables
  $primary: #646cff;
  $spacing: 20px;

  // Nesting with parent reference
  .button {
    background: $primary;
    padding: $spacing;

    &:hover {
      opacity: 0.8;
    }

    &.disabled {
      opacity: 0.5;
    }
  }

  // Mixins
  @mixin flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container {
    @include flex-center;
    height: 100vh;
  }
}
```

#### LESS Example

```pulse
style {
  // LESS variables
  @primary: #646cff;
  @spacing: 20px;

  // Nesting with parent reference
  .button {
    background: @primary;
    padding: @spacing;

    &:hover {
      opacity: 0.8;
    }

    &.disabled {
      opacity: 0.5;
    }
  }

  // Mixins
  .flex-center() {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .container {
    .flex-center();
    height: 100vh;
  }
}
```

#### Stylus Example

```pulse
style {
  // Stylus variables (no $ or @)
  primary = #646cff
  spacing = 20px

  // Nesting with parent reference (flexible syntax)
  .button
    background primary
    padding spacing

    &:hover
      opacity 0.8

    &.disabled
      opacity 0.5

  // Mixins (no braces needed)
  flex-center()
    display flex
    align-items center
    justify-content center

  .container
    flex-center()
    height 100vh
}
```

### How It Works

| Environment | Preprocessor Processing |
|-------------|-------------------------|
| **Vite projects** | Vite plugin auto-detects SASS/LESS/Stylus, compiles before CSS pipeline |
| **CLI dev server** | Compiles on-the-fly when serving .pulse files |
| **CLI build** | Compiles during production build |
| **Without preprocessor** | Falls through - CSS nesting already supported natively |
| **Auto-detection** | Pulse automatically detects which preprocessor to use based on syntax (priority: SASS > LESS > Stylus) |

### Supported Features

**SASS/SCSS:**
- Variables (`$color: red;`)
- Nesting with `&` parent reference
- Mixins (`@mixin`, `@include`)
- Extend (`@extend`)
- Functions (`@function`)
- Control directives (`@if`, `@else`, `@for`, `@each`, `@while`)
- Modules (`@use`, `@forward`)
- Interpolation (`#{$var}`)
- Placeholder selectors (`%placeholder`)

**LESS:**
- Variables (`@color: red;`)
- Nesting with `&` parent reference
- Mixins (`.mixin()`, parametric mixins)
- Extend (`&:extend()`)
- Guards (`when (@a > 0)`)
- Interpolation (`@{var}`)
- Import options (`@import (less) "file"`)
- Plugins (`@plugin "name"`)

**Stylus:**
- Variables (`color = red` - no $ or @)
- Flexible syntax (semicolons and braces optional)
- Nesting with `&` parent reference
- Mixins (no braces needed)
- Conditionals (`if`, `unless`)
- Loops (`for item in items`)
- Extend (`@extend`, `@extends`)
- Interpolation (`{$var}`)
- Built-in functions (`lighten()`, `darken()`, etc.)

### API (Advanced)

```javascript
import {
  // Detection
  hasSassSyntax,         // Check if CSS contains SASS syntax
  hasLessSyntax,         // Check if CSS contains LESS syntax
  hasStylusSyntax,       // Check if CSS contains Stylus syntax
  detectPreprocessor,    // Auto-detect: 'sass' | 'less' | 'stylus' | 'none'

  // SASS
  isSassAvailable,       // Check if sass is installed
  getSassVersion,        // Get sass version string
  compileSass,           // Compile SCSS to CSS (async)
  compileSassSync,       // Compile SCSS to CSS (sync)

  // LESS
  isLessAvailable,       // Check if less is installed
  getLessVersion,        // Get less version string
  compileLess,           // Compile LESS to CSS (async)
  compileLessSync,       // Compile LESS to CSS (sync)

  // Stylus
  isStylusAvailable,     // Check if stylus is installed
  getStylusVersion,      // Get stylus version string
  compileStylus,         // Compile Stylus to CSS (async)
  compileStylusSync,     // Compile Stylus to CSS (sync)

  // Auto-compile (recommended)
  preprocessStyles,      // Auto-detect and compile (async)
  preprocessStylesSync,  // Auto-detect and compile (sync)
} from 'pulse-js-framework/compiler/preprocessor';

// Auto-detect and compile
const result = preprocessStylesSync(css, {
  filename: 'component.pulse',
  loadPaths: ['./src/styles'],
  compressed: false
});
// result: { css: string, preprocessor: 'sass'|'less'|'stylus'|'none', sourceMap?: object }

// Force specific preprocessor
const sassResult = preprocessStylesSync(css, {
  preprocessor: 'sass',  // Force SASS compilation (also: 'less', 'stylus')
  filename: 'component.pulse'
});

// Check which preprocessor was used
const type = detectPreprocessor(css);  // 'sass' | 'less' | 'stylus' | 'none'
```

