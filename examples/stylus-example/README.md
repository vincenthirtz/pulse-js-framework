# Pulse + Stylus CSS Example

This example demonstrates how to use [Stylus](https://stylus-lang.com/) CSS preprocessor with the Pulse JavaScript framework.

## Features Demonstrated

### Stylus Syntax Features

1. **Variables without $ or @**
   ```stylus
   primary-color = #646cff
   spacing = 20px
   ```

2. **Flexible Syntax** (no semicolons or braces needed)
   ```stylus
   .button
     padding 10px
     color red
   ```

3. **Mixins**
   ```stylus
   button-base()
     padding spacing
     border-radius 8px
     cursor pointer
   ```

4. **Nesting with &**
   ```stylus
   .button
     color blue
     &:hover
       opacity 0.8
   ```

5. **Mathematical Operations**
   ```stylus
   margin spacing * 2
   padding spacing * 1.5
   ```

6. **Conditionals and Loops** (not shown in this example, but supported)
   ```stylus
   if dark-mode
     color white

   for num in 1..3
     .item-{num}
       width (100% / num)
   ```

## Setup

### 1. Install Stylus

```bash
npm install -D stylus
```

### 2. Compile the Component

```bash
# From the project root
pulse compile examples/stylus-example/Counter.pulse
```

This will:
- Parse the `.pulse` file
- Detect Stylus syntax in the `style` block
- Compile Stylus to CSS automatically
- Generate `Counter.js` with scoped CSS

### 3. Run the Example

```bash
# Start dev server
pulse dev

# Or open index.html directly
open examples/stylus-example/index.html
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
1. Install the preprocessor you want (`npm install -D stylus`)
2. Use its syntax in your `.pulse` style blocks
3. Pulse handles compilation automatically

## Stylus vs SASS vs LESS

### Stylus Advantages

✅ **Most flexible syntax** - No semicolons, braces, or colons needed
✅ **Optional punctuation** - Write CSS or Stylus syntax
✅ **Built-in functions** - `lighten()`, `darken()`, `rgba()`, etc.
✅ **Conditional logic** - `if`/`unless` statements
✅ **Iteration** - `for` loops
✅ **Powerful interpolation** - `{$variable}` syntax

### When to Use Stylus

- **Minimalist style**: Prefer clean, concise syntax
- **Python/Ruby background**: Indentation-based syntax feels natural
- **Advanced features**: Need conditionals and loops
- **Flexibility**: Want to mix CSS and preprocessor syntax

### When to Use SASS

- **Industry standard**: Most popular, best ecosystem
- **Team familiarity**: Most developers know SASS
- **Large projects**: Mature tooling and community

### When to Use LESS

- **Bootstrap projects**: Bootstrap uses LESS
- **Simpler syntax**: Closer to vanilla CSS
- **JavaScript-like**: Familiar to JS developers

## Example Output

### Stylus Input (from Counter.pulse)

```stylus
primary-color = #646cff
spacing = 20px

button-base()
  padding spacing
  border-radius 8px

.btn
  button-base()
  background primary-color

  &:hover
    opacity 0.8
```

### Compiled CSS Output

```css
.btn {
  padding: 20px;
  border-radius: 8px;
  background: #646cff;
}
.btn:hover {
  opacity: 0.8;
}
```

## API Reference

### Detecting Stylus

```javascript
import { hasStylusSyntax, isStylusAvailable } from 'pulse-js-framework/compiler/preprocessor';

// Check if CSS contains Stylus syntax
hasStylusSyntax('color = red');  // true
hasStylusSyntax('$color: red');  // false (SASS)

// Check if stylus package is installed
isStylusAvailable();  // true/false
```

### Manual Compilation

```javascript
import { compileStylus, preprocessStyles } from 'pulse-js-framework/compiler/preprocessor';

// Explicit Stylus compilation
const result = await compileStylus('color = red\n.btn\n  color red');
// { css: '.btn{color:red}', sourceMap: ... }

// Auto-detect and compile
const result2 = await preprocessStyles('color = red\n.btn\n  color red');
// { css: '.btn{color:red}', preprocessor: 'stylus' }
```

### Force Specific Preprocessor

```javascript
import { preprocessStylesSync } from 'pulse-js-framework/compiler/preprocessor';

const result = preprocessStylesSync(css, {
  preprocessor: 'stylus',  // Force Stylus (skip auto-detection)
  compressed: true,        // Minify output
  filename: 'component.pulse'
});
```

## Learn More

- **Stylus Documentation**: https://stylus-lang.com/
- **Pulse Documentation**: See `CLAUDE.md` in project root
- **Try other preprocessors**: Check `examples/less-example/` and SASS examples

## Troubleshooting

### Stylus not compiling?

1. **Check installation**: `npm list stylus`
2. **Install if missing**: `npm install -D stylus`
3. **Verify syntax**: Ensure you're using Stylus-specific syntax (variables without `$` or `@`)

### Syntax detection issues?

If Pulse doesn't detect your preprocessor:
- Use explicit `preprocessor` option
- Check for mixed syntax (avoid using SASS `$vars` and Stylus `vars` together)

### Source maps not working?

Enable source maps in compilation:
```javascript
preprocessStyles(css, { sourceMap: true })
```

## License

MIT
