#!/usr/bin/env node

/**
 * Netlify Build Script
 * Builds docs and all examples for deployment
 */

import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { minifyJS } from '../cli/build.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const EXAMPLES = ['todo', 'chat', 'ecommerce', 'meteo'];

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

// Minify docs JS files
processJSFiles(join(distDir, 'src'));

// Minify runtime files
processJSFiles(join(distDir, 'runtime'));

console.log('   ✓ Docs built & minified\n');

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

  // Update script path to be relative
  indexHtml = indexHtml.replace(
    'src="/src/main.js"',
    'src="./src/main.js"'
  );

  writeFileSync(join(exampleDist, 'index.html'), indexHtml);

  // Copy src folder
  const srcDir = join(exampleDir, 'src');
  if (existsSync(srcDir)) {
    cpSync(srcDir, join(exampleDist, 'src'), { recursive: true });
  }

  // Process and minify JS files
  processJSFiles(join(exampleDist, 'src'));

  console.log(`   ✓ ${example} built & minified`);
}

/**
 * Update runtime imports and minify JS files
 */
function processJSFiles(dir) {
  if (!existsSync(dir)) return;

  const files = readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = join(dir, file.name);

    if (file.isDirectory()) {
      processJSFiles(filePath);
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
        /from\s+['"]pulse-framework\/runtime['"]/g,
        "from '/runtime/index.js'"
      );
      content = content.replace(
        /from\s+['"]pulse-framework\/runtime\/([^'"]+)['"]/g,
        "from '/runtime/$1'"
      );

      // Minify the JS content
      content = minifyJS(content);

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
