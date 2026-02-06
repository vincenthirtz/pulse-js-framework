# Pulse + ESBuild Example

Example Pulse app using ESBuild for blazingly fast builds.

## Features

- ⚡ Fast incremental builds with ESBuild
- 🎨 SASS/SCSS support (auto-detected)
- 📦 CSS extraction to separate file
- 🗺️ Source maps for debugging
- 👀 Watch mode for development
- 🚀 Built-in dev server

## Quick Start

```bash
# Install dependencies
npm install

# Development (watch + serve)
npm run dev

# Production build
npm run build

# Serve production build
npm run serve
```

## ESBuild Configuration

See `build.js` for the ESBuild configuration with Pulse plugin:

```javascript
import * as esbuild from 'esbuild';
import pulsePlugin from 'pulse-js-framework/esbuild';

await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  plugins: [
    pulsePlugin({
      sourceMap: true,
      extractCss: 'dist/bundle.css'
    })
  ]
});
```

## Project Structure

```
esbuild-example/
├── src/
│   ├── main.js           # Entry point
│   └── App.pulse         # Main component
├── dist/
│   ├── index.html        # HTML template
│   ├── bundle.js         # Compiled JavaScript (generated)
│   └── bundle.css        # Extracted CSS (generated)
├── build.js              # ESBuild configuration
├── package.json
└── README.md
```

## Why ESBuild?

- **Speed**: 10-100x faster than other bundlers
- **Simple**: Minimal configuration needed
- **Modern**: Built for ES modules
- **Watch Mode**: Instant rebuilds on file changes
- **Built-in Dev Server**: No additional tools needed

## Learn More

- [ESBuild Documentation](https://esbuild.github.io/)
- [Pulse Framework](https://github.com/vincenthirtz/pulse-js-framework)
