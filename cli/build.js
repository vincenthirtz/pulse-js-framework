/**
 * Pulse Build System
 *
 * Builds Pulse projects for production
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { compile } from '../compiler/index.js';

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
      console.log('Vite config detected, using Vite build...');
      const { build } = await import('vite');
      await build({ root });
      return;
    }
  } catch (e) {
    // Vite not available, use built-in build
  }

  console.log('Building with Pulse compiler...');

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

  console.log(`
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
        console.log(`  Compiled: ${file}`);
      } else {
        console.error(`  Error compiling ${file}:`);
        for (const error of result.errors) {
          console.error(`    ${error.message}`);
        }
      }
    } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
      // Process JS files - rewrite imports
      let content = readFileSync(srcPath, 'utf-8');

      // Rewrite .pulse imports to .js
      content = content.replace(/from\s+['"]([^'"]+)\.pulse['"]/g, "from '$1.js'");

      // Rewrite runtime imports
      content = content.replace(
        /from\s+['"]pulse-framework\/runtime['"]/g,
        "from './runtime.js'"
      );

      const outPath = join(outDir, file);
      writeFileSync(outPath, content);
      console.log(`  Processed: ${file}`);
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
function bundleRuntime(outDir) {
  // For simplicity, we'll create a minimal runtime bundle
  // In production, you'd want to use a proper bundler

  const runtimeCode = `
// Pulse Runtime (bundled)
${readRuntimeFile('pulse.js')}
${readRuntimeFile('dom.js')}
${readRuntimeFile('router.js')}
${readRuntimeFile('store.js')}
`;

  writeFileSync(join(outDir, 'assets', 'runtime.js'), runtimeCode);
  console.log('  Bundled: runtime.js');
}

/**
 * Read a runtime file
 */
function readRuntimeFile(filename) {
  const paths = [
    join(process.cwd(), 'node_modules', 'pulse-framework', 'runtime', filename),
    join(dirname(new URL(import.meta.url).pathname), '..', 'runtime', filename)
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      return readFileSync(path, 'utf-8');
    }
  }

  console.warn(`  Warning: Could not find runtime file: ${filename}`);
  return '';
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

export default { buildProject };
