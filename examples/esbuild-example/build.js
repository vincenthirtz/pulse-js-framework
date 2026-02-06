/**
 * ESBuild Build Script with Pulse Plugin
 */

import * as esbuild from 'esbuild';
import pulsePlugin from 'pulse-js-framework/esbuild';

const isWatch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  format: 'esm',
  platform: 'browser',
  sourcemap: true,
  plugins: [
    pulsePlugin({
      sourceMap: true,
      extractCss: 'dist/bundle.css'
    })
  ],
  logLevel: 'info'
};

if (isWatch) {
  // Watch mode
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('👀 Watching for changes...');

  // Optional: serve the dist folder
  const { host, port } = await ctx.serve({
    servedir: 'dist',
    port: 3000
  });
  console.log(`🚀 Server running at http://${host}:${port}`);
} else {
  // One-time build
  await esbuild.build(config);
  console.log('✅ Build complete!');
}
