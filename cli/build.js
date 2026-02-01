/**
 * Pulse Build System
 *
 * Builds Pulse projects for production
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { compile } from '../compiler/index.js';
import { log } from './logger.js';

/**
 * Build project for production
 */
export async function buildProject(args) {
  const root = process.cwd();
  const outDir = join(root, 'dist');

  // Check if vite is available
  try {
    const viteConfig = join(root, 'vite.config.js');
    if (existsSync(viteConfig)) {
      log.info('Vite config detected, using Vite build...');
      const { build } = await import('vite');
      await build({ root });
      return;
    }
  } catch (e) {
    // Vite not available, use built-in build
  }

  log.info('Building with Pulse compiler...');

  // Create output directory
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Copy public files
  const publicDir = join(root, 'public');
  if (existsSync(publicDir)) {
    copyDir(publicDir, outDir);
  }

  // Process source files
  const srcDir = join(root, 'src');
  if (existsSync(srcDir)) {
    processDirectory(srcDir, join(outDir, 'assets'));
  }

  // Copy and process index.html
  const indexHtml = join(root, 'index.html');
  if (existsSync(indexHtml)) {
    let html = readFileSync(indexHtml, 'utf-8');

    // Update script paths for production
    html = html.replace(
      /src="\/src\/([^"]+)"/g,
      'src="/assets/$1"'
    );

    // Rewrite .pulse imports to .js
    html = html.replace(/\.pulse"/g, '.js"');

    writeFileSync(join(outDir, 'index.html'), html);
  }

  // Bundle runtime
  bundleRuntime(outDir);

  log.success(`
Build complete!

Output directory: ${relative(root, outDir)}

To preview the build:
  npx serve dist
  `);
}

/**
 * Process a directory of source files
 */
function processDirectory(srcDir, outDir) {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const files = readdirSync(srcDir);

  for (const file of files) {
    const srcPath = join(srcDir, file);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      processDirectory(srcPath, join(outDir, file));
    } else if (file.endsWith('.pulse')) {
      // Compile .pulse files
      const source = readFileSync(srcPath, 'utf-8');
      const result = compile(source, {
        runtime: './runtime.js',
        minify: true
      });

      if (result.success) {
        const outPath = join(outDir, file.replace('.pulse', '.js'));
        writeFileSync(outPath, result.code);
        log.info(`  Compiled: ${file}`);
      } else {
        log.error(`  Error compiling ${file}:`);
        for (const error of result.errors) {
          log.error(`    ${error.message}`);
        }
      }
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      // Process JS files - rewrite imports
      let content = readFileSync(srcPath, 'utf-8');

      // Rewrite .pulse imports to .js
      content = content.replace(/from\s+['"]([^'"]+)\.pulse['"]/g, "from '$1.js'");

      // Rewrite runtime imports
      content = content.replace(
        /from\s+['"]pulse-js-framework\/runtime['"]/g,
        "from './runtime.js'"
      );

      // Minify
      content = minifyJS(content);

      const outPath = join(outDir, file);
      writeFileSync(outPath, content);
      log.info(`  Processed & minified: ${file}`);
    } else {
      // Copy other files
      const outPath = join(outDir, file);
      copyFileSync(srcPath, outPath);
    }
  }
}

/**
 * Bundle the runtime into a single file
 */
function bundleRuntime(outDir, shouldMinify = true) {
  // For simplicity, we'll create a minimal runtime bundle
  // In production, you'd want to use a proper bundler

  let runtimeCode = `
// Pulse Runtime (bundled)
${readRuntimeFile('pulse.js')}
${readRuntimeFile('dom.js')}
${readRuntimeFile('router.js')}
${readRuntimeFile('store.js')}
`;

  if (shouldMinify) {
    runtimeCode = minifyJS(runtimeCode);
    log.info('  Bundled & minified: runtime.js');
  } else {
    log.info('  Bundled: runtime.js');
  }

  writeFileSync(join(outDir, 'assets', 'runtime.js'), runtimeCode);
}

/**
 * Read a runtime file
 */
function readRuntimeFile(filename) {
  const paths = [
    join(process.cwd(), 'node_modules', 'pulse-js-framework', 'runtime', filename),
    join(dirname(new URL(import.meta.url).pathname), '..', 'runtime', filename)
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }

  log.warn(`  Warning: Could not find runtime file: ${filename}`);
  return '';
}

/**
 * Minify JavaScript code (simple minification)
 * String and regex-aware: preserves content inside string and regex literals
 */
export function minifyJS(code) {
  // Extract strings and regexes to protect them from minification
  const preserved = [];
  const placeholder = '\x00PRE';

  // State machine to properly handle strings and regexes
  let result = '';
  let i = 0;

  while (i < code.length) {
    const char = code[i];
    const next = code[i + 1];

    // Skip single-line comments
    if (char === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }

    // Skip multi-line comments
    if (char === '/' && next === '*') {
      i += 2;
      while (i < code.length - 1 && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // Handle string literals
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      let str = char;
      i++;
      while (i < code.length) {
        const c = code[i];
        str += c;
        if (c === '\\' && i + 1 < code.length) {
          i++;
          str += code[i];
        } else if (c === quote) {
          break;
        }
        i++;
      }
      i++;
      preserved.push(str);
      result += placeholder + (preserved.length - 1) + '\x00';
      continue;
    }

    // Handle regex literals (after = : ( , [ ! & | ? ; { or keywords)
    if (char === '/') {
      // Look back to determine if this is a regex
      const lookback = result.slice(-20).trim();
      const isRegexContext = lookback === '' ||
        /[=:(\[,!&|?;{]$/.test(lookback) ||
        /\breturn$/.test(lookback) ||
        /\bthrow$/.test(lookback) ||
        /\btypeof$/.test(lookback);

      if (isRegexContext && next !== '/' && next !== '*') {
        let regex = char;
        i++;
        let inCharClass = false;
        while (i < code.length) {
          const c = code[i];
          regex += c;
          if (c === '\\' && i + 1 < code.length) {
            i++;
            regex += code[i];
          } else if (c === '[') {
            inCharClass = true;
          } else if (c === ']') {
            inCharClass = false;
          } else if (c === '/' && !inCharClass) {
            // End of regex, collect flags
            i++;
            while (i < code.length && /[gimsuvy]/.test(code[i])) {
              regex += code[i];
              i++;
            }
            break;
          }
          i++;
        }
        preserved.push(regex);
        result += placeholder + (preserved.length - 1) + '\x00';
        continue;
      }
    }

    result += char;
    i++;
  }

  // Apply minification to non-preserved parts
  let minified = result
    // Remove leading/trailing whitespace per line
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    // Collapse multiple newlines
    .replace(/\n{2,}/g, '\n')
    // Remove spaces around operators
    .replace(/\s*([{};,:])\s*/g, '$1')
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    // Collapse remaining whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Restore preserved strings and regexes
  minified = minified.replace(
    new RegExp(placeholder.replace('\x00', '\\x00') + '(\\d+)\\x00', 'g'),
    (_, index) => preserved[parseInt(index)]
  );

  return minified;
}

/**
 * Copy a directory recursively
 */
function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const files = readdirSync(src);

  for (const file of files) {
    const srcPath = join(src, file);
    const destPath = join(dest, file);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Preview production build
 */
export async function previewBuild(args) {
  const port = parseInt(args[0]) || 4173;
  const root = process.cwd();
  const distDir = join(root, 'dist');

  if (!existsSync(distDir)) {
    log.error('No dist folder found. Run "pulse build" first.');
    process.exit(1);
  }

  // Check if vite is available for preview
  try {
    const viteConfig = join(root, 'vite.config.js');
    if (existsSync(viteConfig)) {
      log.info('Using Vite preview...');
      const { preview } = await import('vite');
      const server = await preview({
        root,
        preview: { port }
      });
      server.printUrls();
      return;
    }
  } catch (e) {
    // Vite not available, use built-in server
  }

  // Built-in static server for dist
  const { createServer } = await import('http');

  const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };

  const server = createServer((req, res) => {
    let pathname = new URL(req.url, `http://localhost:${port}`).pathname;

    // SPA fallback - serve index.html for routes
    if (pathname === '/' || !pathname.includes('.')) {
      pathname = '/index.html';
    }

    const filePath = join(distDir, pathname);

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = filePath.substring(filePath.lastIndexOf('.'));
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000'
      });
      res.end(readFileSync(filePath));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    log.success(`
  Pulse Preview Server running at:

    Local:   http://localhost:${port}/

  Serving production build from: dist/
  Press Ctrl+C to stop.
    `);
  });
}

export default { buildProject, previewBuild, minifyJS };
