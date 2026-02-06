# Pulse Rollup Example

Example demonstrating Pulse framework integration with Rollup.

## Features

- ✅ `.pulse` file compilation via Rollup plugin
- ✅ SASS preprocessing in style blocks
- ✅ CSS extraction to separate file
- ✅ Source maps for debugging
- ✅ Production build with Terser minification
- ✅ Watch mode for development

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens at `index.html` with watch mode enabled. Edit files and refresh browser to see changes.

## Production Build

```bash
npm run build
```

Generates optimized bundle in `dist/` folder with minification.

## Rollup Configuration

The key configuration in `rollup.config.js`:

```javascript
import pulsePlugin from 'pulse-js-framework/rollup';

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
    })
  ]
};
```

## SASS Support

SASS syntax in style blocks is automatically compiled:

```pulse
style {
  $primary: #646cff;

  .button {
    background: $primary;
    &:hover { opacity: 0.8; }
  }
}
```

## CSS Extraction

CSS is extracted to `dist/bundle.css` (configured via `extractCss` option).

For inline CSS instead:

```javascript
pulsePlugin({
  extractCss: null  // Keep CSS inline
})
```

## Structure

```
rollup-example/
├── src/
│   ├── App.pulse        # Main component with SASS
│   └── main.js          # Entry point
├── dist/                # Build output (generated)
│   ├── bundle.js
│   ├── bundle.js.map
│   └── bundle.css
├── index.html           # HTML template
├── rollup.config.js     # Rollup configuration
└── package.json
```

## Production Optimization

The production build includes:
- **Terser** minification for JavaScript
- **CSS extraction** to separate file for caching
- **Source maps** for debugging minified code
- **Tree shaking** via Rollup ES module analysis

## Serve Locally

Use any static server:

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# PHP
php -S localhost:8080
```

Then open http://localhost:8080

## Troubleshooting

### SASS not compiling

Install SASS: `npm install -D sass`

### CSS not extracted

Check `extractCss` option in `rollup.config.js` is set to a valid filename.

### Watch mode not working

Ensure `rollup.config.js` has `watch` config and you're running `npm run dev` (not `npm run build`).
