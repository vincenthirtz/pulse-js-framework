import pulsePlugin from 'pulse-js-framework/rollup';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

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
      extractCss: 'bundle.css',  // Extract CSS to separate file
      sass: {
        loadPaths: ['src/styles'],
        verbose: true
      }
    }),
    resolve(),
    production && terser()
  ],
  watch: {
    clearScreen: false
  }
};
