# Pulse Webpack Example

Example demonstrating Pulse framework integration with Webpack 5.

## Features

- ✅ `.pulse` file compilation via webpack loader
- ✅ SASS preprocessing in style blocks
- ✅ Hot Module Replacement (HMR)
- ✅ CSS extraction with style-loader
- ✅ Source maps for debugging
- ✅ Production build optimization

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Opens at http://localhost:3000 with HMR enabled.

## Production Build

```bash
npm run build
```

Generates optimized bundle in `dist/` folder.

## Webpack Configuration

The key configuration in `webpack.config.js`:

```javascript
{
  test: /\.pulse$/,
  use: [
    'style-loader',      // Inject CSS into DOM
    'css-loader',        // Resolve CSS imports
    {
      loader: 'pulse-js-framework/webpack',
      options: {
        sourceMap: true,
        extractCss: true,
        hmr: true,
        sass: {
          loadPaths: ['src/styles']
        }
      }
    }
  ]
}
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

## HMR Support

Changes to `.pulse` files trigger hot reloads without full page refresh.

## Structure

```
webpack-example/
├── src/
│   ├── App.pulse        # Main component with SASS
│   └── main.js          # Entry point
├── index.html           # HTML template
├── webpack.config.js    # Webpack configuration
└── package.json
```

## Alternative: MiniCssExtractPlugin

For production builds, you can extract CSS to separate files:

```javascript
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

export default {
  module: {
    rules: [
      {
        test: /\.pulse$/,
        use: [
          MiniCssExtractPlugin.loader,  // Extract CSS
          'css-loader',
          'pulse-js-framework/webpack'
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

## Troubleshooting

### HMR not working

Ensure `webpack-dev-server` is installed and `hot: true` is set in `devServer` config.

### SASS not compiling

Install SASS: `npm install -D sass`

### Source maps missing

Enable `devtool: 'source-map'` in webpack.config.js and `sourceMap: true` in loader options.
