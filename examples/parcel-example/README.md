# Pulse + Parcel Example

Example Pulse app using Parcel for zero-configuration bundling.

## Features

- 📦 Zero-config bundling with Parcel 2
- 🔥 Hot Module Replacement (HMR)
- 🎨 SASS/SCSS support (auto-detected)
- ⚡ Fast builds with caching
- 📦 Automatic code splitting
- 🗺️ Source maps for debugging
- 🚀 Built-in dev server

## Quick Start

```bash
# Install dependencies
npm install

# Development (HMR + dev server)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Parcel Configuration

### .parcelrc

Configure Pulse transformer in `.parcelrc`:

```json
{
  "extends": "@parcel/config-default",
  "transformers": {
    "*.pulse": ["pulse-js-framework/parcel"]
  }
}
```

### .pulserc (optional)

Configure Pulse plugin options in `.pulserc`:

```json
{
  "sourceMap": true,
  "extractCss": true,
  "verbose": false,
  "sass": {
    "loadPaths": ["src/styles"],
    "compressed": false
  }
}
```

Or in `package.json`:

```json
{
  "pulse": {
    "sourceMap": true,
    "extractCss": true,
    "sass": {
      "loadPaths": ["src/styles"]
    }
  }
}
```

## Project Structure

```
parcel-example/
├── src/
│   ├── index.html        # HTML entry point
│   ├── main.js           # JavaScript entry point
│   └── App.pulse         # Main component
├── dist/                 # Build output (generated)
├── .parcel-cache/        # Parcel cache (generated)
├── .parcelrc             # Parcel configuration
├── .pulserc              # Pulse plugin configuration
├── package.json
└── README.md
```

## Why Parcel?

- **Zero Config**: Works out of the box with minimal setup
- **Fast**: Multi-core compilation and filesystem cache
- **HMR**: Fast Hot Module Replacement for instant updates
- **Smart**: Automatic dependency resolution and code splitting
- **Modern**: Built-in support for modern web features

## CSS Preprocessing

Parcel automatically detects and compiles:
- **SASS/SCSS** - Install `sass` and use `.scss` syntax
- **LESS** - Install `less` and use `.less` syntax
- **Stylus** - Install `stylus` and use `.styl` syntax

In `.pulse` files, the preprocessor is auto-detected based on syntax!

## Learn More

- [Parcel Documentation](https://parceljs.org/)
- [Pulse Framework](https://github.com/vincenthirtz/pulse-js-framework)
- [Pulse Build Tool Integrations](../../loader/README.md)
