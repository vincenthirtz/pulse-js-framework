import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  entry: './src/main.js',
  output: {
    path: resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.pulse$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'pulse-js-framework/webpack',
            options: {
              sourceMap: true,
              extractCss: true,
              hmr: true,
              verbose: true,
              sass: {
                loadPaths: ['src/styles'],
                verbose: true
              }
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
      inject: 'body'
    })
  ],
  devServer: {
    port: 3000,
    hot: true,
    open: true
  },
  resolve: {
    extensions: ['.js', '.pulse']
  },
  devtool: 'source-map'
};
