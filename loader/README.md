# Pulse Build Tool Integrations

Build tool loaders and plugins for the Pulse JavaScript framework.

## Available Integrations

### Vite Plugin (`vite-plugin.js`) ✅

Full-featured Vite plugin with HMR support and CSS extraction.

**Installation:**

```javascript
// vite.config.js
import pulsePlugin from 'pulse-js-framework/vite';

export default {
  plugins: [pulsePlugin({
    sourceMap: true,
    sass: {
      loadPaths: ['src/styles'],
      compressed: false
    }
  })]
};
```

**Features:**
- ✅ Automatic `.pulse` file transformation
- ✅ Hot Module Replacement (HMR)
- ✅ CSS extraction to Vite's CSS pipeline
- ✅ Source map generation
- ✅ SASS/LESS/Stylus auto-detection and compilation
- ✅ Virtual CSS modules

### Webpack Loader (`webpack-loader.js`) ✅

Webpack loader with CSS extraction and preprocessor support.

**Installation:**

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.pulse$/,
        use: [
          'style-loader',        // Inject CSS into DOM
          'css-loader',          // Resolve CSS imports
          {
            loader: 'pulse-js-framework/loader/webpack-loader',
            options: {
              sourceMap: true,
              extractCss: true,   // Extract CSS for css-loader
              hmr: true,          // Enable HMR support
              sass: {
                loadPaths: ['src/styles']
              }
            }
          }
        ]
      }
    ]
  }
};
```

**With MiniCssExtractPlugin (production):**

```javascript
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.pulse$/,
        use: [
          MiniCssExtractPlugin.loader,  // Extract to .css file
          'css-loader',
          'pulse-js-framework/loader/webpack-loader'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    })
  ]
};
```

**Features:**
- ✅ Webpack 5+ support
- ✅ CSS extraction for loaders chain
- ✅ Hot Module Replacement (HMR)
- ✅ Source map generation
- ✅ SASS/LESS/Stylus auto-detection
- ✅ Compatible with style-loader and MiniCssExtractPlugin

### Rollup Plugin (`rollup-plugin.js`) ✅

Rollup plugin with CSS extraction and tree-shaking support.

**Installation:**

```javascript
// rollup.config.js
import pulsePlugin from 'pulse-js-framework/rollup';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [
    pulsePlugin({
      sourceMap: true,
      extractCss: 'bundle.css',  // Extract to CSS file
      sass: {
        loadPaths: ['src/styles']
      }
    }),
    resolve()
  ]
};
```

**Features:**
- ✅ Rollup 4+ support
- ✅ CSS extraction to separate file
- ✅ Source map generation
- ✅ SASS/LESS/Stylus auto-detection
- ✅ Tree-shaking compatible (ES modules)
- ✅ No external dependencies required

## CSS Preprocessor Support

Both integrations support **automatic CSS preprocessing** for SASS, LESS, and Stylus:

1. **Install the preprocessor** in your project:
   ```bash
   npm install -D sass        # For SASS/SCSS
   npm install -D less        # For LESS
   npm install -D stylus      # For Stylus
   ```

2. **Use preprocessor syntax** in `.pulse` style blocks:
   ```pulse
   style {
     $primary: #646cff;       // SASS
     @primary: #646cff;       // LESS
     primary = #646cff        // Stylus

     .button {
       background: $primary;
       &:hover { opacity: 0.8; }
     }
   }
   ```

3. **Auto-detection** - Framework detects preprocessor syntax automatically:
   - Priority: SASS > LESS > Stylus
   - Falls back to plain CSS if no preprocessor detected

## Options Reference

### Vite Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `exclude` | RegExp | `/node_modules/` | Files to exclude |
| `sourceMap` | boolean | `true` | Generate source maps |
| `sass.loadPaths` | string[] | `[]` | SASS include paths |
| `sass.compressed` | boolean | `false` | Minify SASS output |

### Webpack Loader Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sourceMap` | boolean | `true` | Generate source maps |
| `extractCss` | boolean | `true` | Extract CSS for css-loader |
| `hmr` | boolean | `true` | Enable HMR support |
| `verbose` | boolean | `true` | Log preprocessor info |
| `sass.loadPaths` | string[] | `[]` | SASS include paths |
| `sass.compressed` | boolean | `false` | Minify SASS output |
| `sass.verbose` | boolean | `false` | Log SASS compilation |
| `less.*` | object | `{}` | LESS-specific options |
| `stylus.*` | object | `{}` | Stylus-specific options |

### Rollup Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | RegExp/Array | `/\.pulse$/` | Files to include |
| `exclude` | RegExp/Array | `/node_modules/` | Files to exclude |
| `sourceMap` | boolean | `true` | Generate source maps |
| `extractCss` | string | `null` | Output CSS filename (null = inline) |
| `sass.loadPaths` | string[] | `[]` | SASS include paths |
| `sass.compressed` | boolean | `false` | Minify SASS output |
| `sass.verbose` | boolean | `false` | Log SASS compilation |
| `less.*` | object | `{}` | LESS-specific options |
| `stylus.*` | object | `{}` | Stylus-specific options |

## Development

### Testing Vite Plugin

```bash
cd examples/vite-example
npm install
npm run dev
```

### Testing Webpack Loader

```bash
cd examples/webpack-example
npm install
npm run dev
```

### Testing Rollup Plugin

```bash
cd examples/rollup-example
npm install
npm run dev
```

## Planned Integrations

- [ ] ESBuild plugin (`esbuild-plugin.js`)
- [ ] Parcel transformer (`parcel-transformer.js`)
- [ ] SWC plugin (`swc-plugin.js`)

## Architecture

Both integrations follow the same pattern:

1. **Compile** `.pulse` files to JavaScript using `compiler/index.js`
2. **Extract CSS** from compiled output
3. **Preprocess CSS** if SASS/LESS/Stylus detected and available
4. **Pass to build tool** pipeline:
   - Vite: Virtual CSS modules
   - Webpack: css-loader chain
5. **Enable HMR** for development

## Contributing

When adding a new build tool integration:

1. Follow the naming convention: `{tool}-{type}.js` (e.g., `rollup-plugin.js`)
2. Support CSS extraction for the tool's pipeline
3. Enable HMR if the tool supports it
4. Add preprocessor auto-detection
5. Document options in this README
6. Add example project in `examples/`

## License

MIT
