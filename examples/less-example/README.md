# Pulse + LESS CSS Example

This example demonstrates how to use [LESS](https://lesscss.org/) CSS preprocessor with the Pulse JavaScript framework.

## Features Demonstrated

### LESS Syntax Features

1. **Variables with @ prefix**
   ```less
   @primary: #646cff;
   @spacing: 16px;
   @radius: 8px;
   ```

2. **Mixins** (reusable style blocks)
   ```less
   .card-style() {
     background: white;
     border-radius: @radius;
     padding: @spacing;
     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
   }

   .demo-card {
     .card-style(); // Apply mixin
   }
   ```

3. **Parametric Mixins** (with parameters)
   ```less
   .button-variant(@color) {
     background: @color;
     border: 2px solid @color;

     &:hover {
       background: lighten(@color, 10%);
     }
   }

   .btn {
     .button-variant(#646cff);
   }
   ```

4. **Guards** (conditional mixins)
   ```less
   .button-size(@size) when (@size = large) {
     padding: 20px 30px;
     font-size: 18px;
   }

   .button-size(@size) when (@size = small) {
     padding: 8px 16px;
     font-size: 14px;
   }

   .btn.large {
     .button-size(large);
   }
   ```

5. **Color Functions**
   ```less
   @primary: #646cff;
   @primary-dark: darken(@primary, 10%);
   @primary-light: lighten(@primary, 10%);
   ```

6. **Nesting with &** (parent selector)
   ```less
   .button {
     color: blue;

     &:hover {
       color: darkblue;
     }

     &.active {
       font-weight: bold;
     }
   }
   ```

7. **Mathematical Operations**
   ```less
   @spacing: 16px;
   padding: @spacing * 2;        // 32px
   margin: @spacing / 2;         // 8px
   width: 100% / 3;              // 33.33%
   ```

## Setup

### 1. Install LESS

```bash
npm install -D less
```

### 2. Compile the Component

```bash
# From the project root
pulse compile examples/less-example/LessDemo.pulse
```

This will:
- Parse the `.pulse` file
- Detect LESS syntax in the `style` block
- Compile LESS to CSS automatically
- Generate `LessDemo.js` with scoped CSS

### 3. Run the Example

```bash
# Start dev server
pulse dev

# Or open index.html directly
open examples/less-example/index.html
```

## How It Works

### Automatic Detection

Pulse automatically detects which preprocessor you're using based on syntax:

| Preprocessor | Detection Pattern | Example |
|--------------|-------------------|---------|
| **SASS/SCSS** | `$variable:` | `$color: red;` |
| **LESS** | `@variable:` | `@color: red;` |
| **Stylus** | `variable =` | `color = red` |

### Priority Order

If multiple syntaxes are detected (rare), Pulse uses this priority:
1. **SASS** (most common)
2. **LESS**
3. **Stylus**

### Zero Configuration

No configuration needed! Just:
1. Install the preprocessor you want (`npm install -D less`)
2. Use its syntax in your `.pulse` style blocks
3. Pulse handles compilation automatically

## LESS vs SASS vs Stylus

### LESS Advantages

✅ **JavaScript-based** - Easy for JS developers
✅ **Simple syntax** - Closer to vanilla CSS
✅ **Parametric mixins** - Powerful mixin patterns
✅ **Guards** - Conditional styles
✅ **Bootstrap** - Bootstrap framework uses LESS

### When to Use LESS

- **Bootstrap projects**: Bootstrap uses LESS
- **JavaScript background**: Syntax feels familiar
- **Simpler preprocessing**: Don't need advanced SASS features
- **Client-side compilation**: LESS can run in browser (though not recommended for production)

### When to Use SASS

- **Industry standard**: Most popular, best ecosystem
- **Team familiarity**: Most developers know SASS
- **Large projects**: Mature tooling and community
- **Advanced features**: More powerful than LESS

### When to Use Stylus

- **Minimalist style**: Prefer clean, concise syntax
- **Python/Ruby background**: Indentation-based syntax
- **Flexibility**: Mix CSS and preprocessor syntax

## Example Output

### LESS Input (from LessDemo.pulse)

```less
@primary: #646cff;
@spacing: 16px;

.button-variant(@color) {
  background: @color;

  &:hover {
    background: lighten(@color, 10%);
  }
}

.btn {
  .button-variant(@primary);
  padding: @spacing;
}
```

### Compiled CSS Output

```css
.btn {
  background: #646cff;
  padding: 16px;
}
.btn:hover {
  background: #7b85ff;
}
```

## API Reference

### Detecting LESS

```javascript
import { hasLessSyntax, isLessAvailable } from 'pulse-js-framework/compiler/preprocessor';

// Check if CSS contains LESS syntax
hasLessSyntax('@color: red;');  // true
hasLessSyntax('$color: red');   // false (SASS)

// Check if less package is installed
isLessAvailable();  // true/false
```

### Manual Compilation

```javascript
import { compileLess, preprocessStyles } from 'pulse-js-framework/compiler/preprocessor';

// Explicit LESS compilation (async)
const result = await compileLess('@color: red; .btn { color: @color; }');
// { css: '.btn{color:red}', sourceMap: ... }

// Auto-detect and compile
const result2 = await preprocessStyles('@color: red; .btn { color: @color; }');
// { css: '.btn{color:red}', preprocessor: 'less' }
```

### Force Specific Preprocessor

```javascript
import { preprocessStylesSync } from 'pulse-js-framework/compiler/preprocessor';

const result = preprocessStylesSync(css, {
  preprocessor: 'less',  // Force LESS (skip auto-detection)
  compressed: true,      // Minify output
  filename: 'component.pulse'
});
```

## Advanced LESS Features

### 1. Extend

```less
.base-button {
  padding: 10px 20px;
  border: none;
  cursor: pointer;
}

.primary-button {
  &:extend(.base-button);
  background: #646cff;
  color: white;
}
```

### 2. Interpolation

```less
@property: color;
@value: red;

.element {
  @{property}: @value;  // Becomes: color: red;
}
```

### 3. Import Options

```less
@import (reference) "variables.less";  // Import without outputting
@import (inline) "external.css";       // Include as-is
@import (less) "styles.css";           // Force LESS parsing
```

### 4. Namespaces

```less
#bundle() {
  .button() {
    padding: 10px;
  }
  .card() {
    background: white;
  }
}

.my-button {
  #bundle.button();
}
```

### 5. Loops (via recursion)

```less
.generate-columns(@n, @i: 1) when (@i =< @n) {
  .col-@{i} {
    width: (@i * 100% / @n);
  }
  .generate-columns(@n, (@i + 1));
}

.generate-columns(12);  // Creates .col-1 through .col-12
```

## Learn More

- **LESS Documentation**: https://lesscss.org/
- **Pulse Documentation**: See `CLAUDE.md` in project root
- **Try other preprocessors**: Check `examples/sass-example/` and `examples/stylus-example/`

## Troubleshooting

### LESS not compiling?

1. **Check installation**: `npm list less`
2. **Install if missing**: `npm install -D less`
3. **Verify syntax**: Ensure you're using LESS-specific syntax (variables with `@`)

### Syntax detection issues?

If Pulse doesn't detect your preprocessor:
- Use explicit `preprocessor` option
- Check for mixed syntax (avoid using SASS `$vars` and LESS `@vars` together)

### Async issues?

LESS compilation is async-only. Use `preprocessStyles()` (async) instead of `preprocessStylesSync()`:

```javascript
// ✅ Good (async)
const result = await preprocessStyles(less);

// ⚠️ Limited (sync - returns null for LESS)
const result = preprocessStylesSync(less);
```

## License

MIT
