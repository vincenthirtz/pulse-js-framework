#!/usr/bin/env node

/**
 * Netlify Build Script
 * Builds docs and all examples for deployment
 */

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { minifyJS } from '../cli/build.js';
import { compile } from '../compiler/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const EXAMPLES = ['hmr', 'blog', 'todo', 'chat', 'ecommerce', 'meteo', 'router', 'store', 'dashboard', 'sports', 'less-example', 'stylus-example', 'webpack-example', 'rollup-example', 'esbuild-example'];

console.log('🚀 Building Pulse for Netlify...\n');

// Create dist directory
const distDir = join(root, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// 1. Build and copy docs
console.log('📚 Building docs...');
const docsDir = join(root, 'docs');
cpSync(docsDir, distDir, { recursive: true });

// Copy runtime to dist for docs
const runtimeDir = join(root, 'runtime');
cpSync(runtimeDir, join(distDir, 'runtime'), { recursive: true });

// Minify runtime files only (docs contains code examples that break with minification)
processJSFiles(join(distDir, 'runtime'), true);

console.log('   ✓ Docs built, runtime minified\n');

// 2. Build examples
console.log('📦 Building examples...\n');

for (const example of EXAMPLES) {
  const exampleDir = join(root, 'examples', example);
  const exampleDist = join(distDir, 'examples', example);

  if (!existsSync(exampleDir)) {
    console.log(`   ⚠ Skipping ${example} (not found)`);
    continue;
  }

  console.log(`   Building ${example}...`);

  // Create example dist directory
  mkdirSync(exampleDist, { recursive: true });

  // Copy index.html and update paths
  let indexHtml = readFileSync(join(exampleDir, 'index.html'), 'utf-8');

  // Update script paths to be relative
  indexHtml = indexHtml.replace(
    'src="/src/main.js"',
    'src="./src/main.js"'
  );
  // For examples with root-level main.js (like less-example, stylus-example)
  indexHtml = indexHtml.replace(
    'src="/main.js"',
    'src="./main.js"'
  );

  writeFileSync(join(exampleDist, 'index.html'), indexHtml);

  // Copy src folder (if exists)
  const srcDir = join(exampleDir, 'src');
  if (existsSync(srcDir)) {
    cpSync(srcDir, join(exampleDist, 'src'), { recursive: true });
    // Process and minify JS files in src/
    processJSFiles(join(exampleDist, 'src'));
  } else {
    // For examples without src/ folder (like less-example, stylus-example)
    // Copy .js and .pulse files directly to dist
    const files = readdirSync(exampleDir);
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.pulse')) {
        cpSync(join(exampleDir, file), join(exampleDist, file));
      }
    }
    // Process and minify JS files in root
    processJSFiles(exampleDist);
  }

  console.log(`   ✓ ${example} built & minified`);
}

/**
 * Update runtime imports, compile .pulse files, and optionally minify
 */
function processJSFiles(dir, shouldMinify = true) {
  if (!existsSync(dir)) return;

  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = join(dir, file.name);

    if (file.isDirectory()) {
      processJSFiles(filePath, shouldMinify);
    } else if (file.name.endsWith('.pulse')) {
      // Compile .pulse files to .js
      const source = readFileSync(filePath, 'utf-8');
      try {
        const result = compile(source, { runtime: '/runtime/index.js' });

        if (!result.success) {
          console.error(`   ✗ Failed to compile ${file.name}: ${result.errors[0]?.message || 'Unknown error'}`);
          continue;
        }

        let compiled = result.code;

        // Update .pulse imports to .js
        compiled = compiled.replace(/from\s+['"]([^'"]+)\.pulse['"]/g, "from '$1.js'");

        // Write compiled JS file
        const jsPath = filePath.replace(/\.pulse$/, '.js');
        writeFileSync(jsPath, shouldMinify ? minifyJS(compiled) : compiled);

        // Remove original .pulse file
        unlinkSync(filePath);
      } catch (e) {
        console.error(`   ✗ Failed to compile ${file.name}: ${e.message}`);
      }
    } else if (file.name.endsWith('.js')) {
      let content = readFileSync(filePath, 'utf-8');

      // Update various runtime import patterns
      content = content.replace(
        /from\s+['"]\.\.\/\.\.\/runtime\/([^'"]+)['"]/g,
        "from '/runtime/$1'"
      );
      content = content.replace(
        /from\s+['"]\.\.\/\.\.\/\.\.\/runtime\/([^'"]+)['"]/g,
        "from '/runtime/$1'"
      );
      content = content.replace(
        /from\s+['"]pulse-js-framework\/runtime['"]/g,
        "from '/runtime/index.js'"
      );
      content = content.replace(
        /from\s+['"]pulse-js-framework\/runtime\/([^'"]+)['"]/g,
        "from '/runtime/$1'"
      );

      // Update .pulse imports to .js
      content = content.replace(/from\s+['"]([^'"]+)\.pulse['"]/g, "from '$1.js'");

      // Minify the JS content if requested
      if (shouldMinify) {
        content = minifyJS(content);
      }

      writeFileSync(filePath, content);
    }
  }
}

// 3. Create examples index page
console.log('\n📄 Creating examples index...');

const examplesIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pulse Framework - Examples</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: white;
      padding: 40px 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      background: linear-gradient(90deg, #646cff, #9089fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { color: #888; margin-bottom: 40px; }
    .examples {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .example {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 24px;
      text-decoration: none;
      color: white;
      transition: all 0.2s;
    }
    .example:hover {
      background: rgba(255,255,255,0.1);
      border-color: #646cff;
      transform: translateY(-2px);
    }
    .example h2 { font-size: 1.3em; margin-bottom: 8px; }
    .example p { color: #aaa; font-size: 0.9em; line-height: 1.5; }
    .example .arrow { float: right; opacity: 0.5; }
    .back {
      display: inline-block;
      margin-top: 30px;
      color: #646cff;
      text-decoration: none;
    }
    .back:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ Pulse Examples</h1>
    <p class="subtitle">Interactive demos built with Pulse Framework</p>

    <div class="examples">
      <a href="/examples/hmr/" class="example">
        <span class="arrow">→</span>
        <h2>🔥 HMR Demo</h2>
        <p>Hot Module Replacement with state preservation. See changes instantly!</p>
      </a>

      <a href="/examples/blog/" class="example">
        <span class="arrow">→</span>
        <h2>📰 Blog</h2>
        <p>Full blog with .pulse components showcasing DSL syntax, CRUD, and categories.</p>
      </a>

      <a href="/examples/todo/" class="example">
        <span class="arrow">→</span>
        <h2>✅ Todo App</h2>
        <p>Full-featured task manager with filters, persistence, and batch actions.</p>
      </a>

      <a href="/examples/chat/" class="example">
        <span class="arrow">→</span>
        <h2>💬 Chat App</h2>
        <p>Real-time messaging interface with multiple rooms and user presence.</p>
      </a>

      <a href="/examples/ecommerce/" class="example">
        <span class="arrow">→</span>
        <h2>🛒 E-commerce</h2>
        <p>Shopping cart with product catalog, filters, and checkout flow.</p>
      </a>

      <a href="/examples/meteo/" class="example">
        <span class="arrow">→</span>
        <h2>🌤️ Weather App</h2>
        <p>Weather dashboard with location search and forecasts.</p>
      </a>

      <a href="/examples/router/" class="example">
        <span class="arrow">→</span>
        <h2>🧭 Router Demo</h2>
        <p>SPA routing with params, query strings, guards, and navigation.</p>
      </a>

      <a href="/examples/store/" class="example">
        <span class="arrow">→</span>
        <h2>📝 Store Demo</h2>
        <p>Global state management with actions, getters, persistence, and undo/redo.</p>
      </a>

      <a href="/examples/dashboard/" class="example">
        <span class="arrow">→</span>
        <h2>📊 Admin Dashboard</h2>
        <p>Complete admin UI with auth, routing, store, charts, tables, and modals.</p>
      </a>

      <a href="/examples/sports/" class="example">
        <span class="arrow">→</span>
        <h2>⚽ Sports News</h2>
        <p>News app with HTTP client, categories, search, favorites, and dark mode.</p>
      </a>

      <a href="/examples/less-example/" class="example">
        <span class="arrow">→</span>
        <h2>🎨 LESS Demo</h2>
        <p>Demonstrates LESS CSS preprocessor with variables, mixins, and nesting.</p>
      </a>

      <a href="/examples/stylus-example/" class="example">
        <span class="arrow">→</span>
        <h2>💅 Stylus Demo</h2>
        <p>Shows Stylus CSS preprocessor with flexible syntax and powerful features.</p>
      </a>

      <a href="/examples/webpack-example/" class="example">
        <span class="arrow">→</span>
        <h2>📦 Webpack Integration</h2>
        <p>Demonstrates Pulse Webpack loader with HMR, CSS extraction, and SASS support.</p>
      </a>

      <a href="/examples/rollup-example/" class="example">
        <span class="arrow">→</span>
        <h2>🎲 Rollup Integration</h2>
        <p>Shows Pulse Rollup plugin with tree-shaking, CSS extraction, and watch mode.</p>
      </a>

      <a href="/examples/esbuild-example/" class="example">
        <span class="arrow">→</span>
        <h2>⚡ ESBuild Integration</h2>
        <p>Demonstrates Pulse ESBuild plugin with ultra-fast builds, CSS extraction, and watch mode.</p>
      </a>
    </div>

    <a href="/" class="back">← Back to Documentation</a>
  </div>
</body>
</html>
`;

mkdirSync(join(distDir, 'examples'), { recursive: true });
writeFileSync(join(distDir, 'examples', 'index.html'), examplesIndexHtml);
console.log('   ✓ Examples index created');

console.log('\n✅ Build complete! Output in dist/\n');
