# Build Tools - Vite, Webpack, Rollup, ESBuild, Parcel, and SWC plugin/loader integrations.

## Quick Setup

| Tool | Import | Config File |
|------|--------|-------------|
| Vite | `import pulsePlugin from 'pulse-js-framework/vite'` | `vite.config.js` |
| Webpack | `'pulse-js-framework/loader/webpack-loader'` | `webpack.config.js` |
| Rollup | `import pulsePlugin from 'pulse-js-framework/rollup'` | `rollup.config.js` |
| ESBuild | `import pulsePlugin from 'pulse-js-framework/esbuild'` | `build.js` |
| Parcel | `.parcelrc` + `pulse-js-framework/parcel` | `.parcelrc` / `.pulserc` |
| SWC | `import pulsePlugin from 'pulse-js-framework/swc'` | Custom build script |

## Vite Plugin

```javascript
// vite.config.js
import pulsePlugin from 'pulse-js-framework/vite';
export default { plugins: [pulsePlugin({ sourceMap: true, sass: { loadPaths: ['src/styles'] } })] };
```

Features: HMR, CSS extraction (virtual modules), source maps, SASS/LESS/Stylus auto-detection.

## Webpack Loader

```javascript
// webpack.config.js - rules
{ test: /\.pulse$/, use: ['style-loader', 'css-loader', { loader: 'pulse-js-framework/loader/webpack-loader', options: { sourceMap: true, extractCss: true, hmr: true } }] }
```

For production, replace `style-loader` with `MiniCssExtractPlugin.loader`.

## Rollup Plugin

```javascript
// rollup.config.js
import pulsePlugin from 'pulse-js-framework/rollup';
export default { plugins: [pulsePlugin({ sourceMap: true, extractCss: 'bundle.css' })] };
```

## ESBuild Plugin

```javascript
import * as esbuild from 'esbuild';
import pulsePlugin from 'pulse-js-framework/esbuild';
await esbuild.build({ entryPoints: ['src/main.js'], bundle: true, plugins: [pulsePlugin({ extractCss: 'dist/bundle.css' })] });
```

## Parcel Plugin

```json
// .parcelrc
{ "extends": "@parcel/config-default", "transformers": { "*.pulse": ["pulse-js-framework/parcel"] } }
```

Options via `.pulserc.json` or `package.json` `"pulse"` key. Zero-config out of the box.

## SWC Plugin

```javascript
import pulsePlugin from 'pulse-js-framework/swc';
const plugin = pulsePlugin({ sourceMap: true, extractCss: 'dist/bundle.css' });
plugin.buildStart();
const result = plugin.transform(source, 'App.pulse');  // { code, css }
plugin.buildEnd();  // Writes accumulated CSS
```

Direct transform API: `transformPulseFile(path, opts)`, `transformPulseCode(src, opts)`, `buildPulseFiles(files, opts)`.

## CSS Preprocessor Support

All plugins auto-detect SASS/LESS/Stylus in `.pulse` style blocks. Install the preprocessor as dev dependency:

```bash
npm install -D sass     # SASS/SCSS
npm install -D less     # LESS
npm install -D stylus   # Stylus
```

Detection priority: SASS > LESS > Stylus. Falls back to plain CSS.

## Common Options

| Option | Type | Default | Available In |
|--------|------|---------|-------------|
| `sourceMap` | boolean | `true` | All |
| `extractCss` | string/boolean | varies | All |
| `hmr` | boolean | `true` | Vite, Webpack |
| `verbose` | boolean | `false` | Webpack, Parcel |
| `sass.loadPaths` | string[] | `[]` | All |
| `sass.compressed` | boolean | `false` | All |
| `less.*` | object | `{}` | Webpack, Rollup, ESBuild, Parcel, SWC |
| `stylus.*` | object | `{}` | Webpack, Rollup, ESBuild, Parcel, SWC |
| `include` | RegExp | `/\.pulse$/` | Rollup |
| `exclude` | RegExp | `/node_modules/` | Vite, Rollup |

## Architecture

All plugins follow the same pipeline:
1. Compile `.pulse` → JavaScript via `compiler/index.js`
2. Extract CSS from compiled output
3. Preprocess CSS if SASS/LESS/Stylus detected
4. Pass to build tool's CSS pipeline (virtual modules / css-loader / asset API)
5. Enable HMR for development (where supported)

## Testing

```bash
cd examples/vite-example && npm install && npm run dev      # Vite
cd examples/webpack-example && npm install && npm run dev    # Webpack
cd examples/rollup-example && npm install && npm run dev     # Rollup
cd examples/esbuild-example && npm install && npm run dev    # ESBuild
cd examples/parcel-example && npm install && npm run dev     # Parcel
npm run test:swc-plugin                                       # SWC
```
