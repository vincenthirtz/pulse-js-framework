/**
 * E2E Test: Examples Health Check
 *
 * Verifies that all example projects load and render without JavaScript errors.
 * These tests start the Pulse dev server for each example, navigate to the page,
 * and check for errors - without installing any example-level dependencies.
 *
 * Excluded examples (require npm install):
 *   - webpack-example, rollup-example, esbuild-example, parcel-example (bundlers)
 *   - electron (Electron + Vite)
 *   - server-actions-ratelimit (Express)
 *   - android-webview, ios-webview (native wrappers, README only)
 *   - android-pulse, ios-pulse (mobile WebView specific)
 */

import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CLI = join(ROOT, 'cli', 'index.js');
const EXAMPLES_DIR = join(ROOT, 'examples');

/**
 * Examples that work with `pulse dev` without npm install.
 * Each entry: { dir, title }
 *   - dir: directory name under examples/
 *   - title: partial match for <title> (used as sanity check)
 */
const EXAMPLES = [
  { dir: 'todo', title: 'Todo' },
  { dir: 'store', title: 'Store' },
  { dir: 'blog', title: 'Blog' },
  { dir: 'chat', title: 'Chat' },
  { dir: 'dashboard', title: 'Dashboard' },
  { dir: 'ecommerce', title: 'Commerce' },
  { dir: 'meteo', title: 'Météo' },
  { dir: 'router', title: 'Router' },
  { dir: 'sports', title: 'Sport' },
  { dir: 'a11y-showcase', title: 'Accessibility' },
  { dir: 'async-patterns', title: 'Async' },
  { dir: 'context-api', title: 'Context' },
  { dir: 'form-validation', title: 'Form' },
  { dir: 'graphql', title: 'GraphQL' },
  { dir: 'hmr', title: 'HMR' },
  { dir: 'ssr', title: 'SSR' },
  { dir: 'less-example', title: 'LESS' },
  { dir: 'sass-example', title: 'SASS' },
  { dir: 'stylus-example', title: 'Stylus' },
];

// Each test gets a unique port to avoid conflicts
let nextPort = 4300;

/**
 * Start the Pulse dev server for a given example directory.
 * Returns a Promise that resolves with the child process once the server is ready.
 */
function startDevServer(exampleDir, port) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CLI, 'dev', String(port)], {
      cwd: join(EXAMPLES_DIR, exampleDir),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'development' }
    });

    let started = false;
    let output = '';

    const timeout = setTimeout(() => {
      if (!started) {
        proc.kill('SIGTERM');
        reject(new Error(
          `Dev server for "${exampleDir}" did not start within 15s.\nOutput: ${output}`
        ));
      }
    }, 15000);

    const onData = (data) => {
      output += data.toString();
      // The dev server prints "localhost" when ready
      if (!started && output.includes('localhost')) {
        started = true;
        clearTimeout(timeout);
        // Small delay to ensure the server is fully ready
        setTimeout(() => resolve(proc), 300);
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('error', (err) => {
      if (!started) {
        clearTimeout(timeout);
        reject(err);
      }
    });

    proc.on('exit', (code) => {
      if (!started && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(
          `Dev server for "${exampleDir}" exited with code ${code}.\nOutput: ${output}`
        ));
      }
    });
  });
}

/**
 * Kill a process and wait for it to exit.
 */
async function killServer(proc) {
  if (!proc || proc.killed) return;
  proc.kill('SIGTERM');
  await new Promise((resolve) => {
    proc.on('exit', resolve);
    // Force kill after 3s if SIGTERM didn't work
    setTimeout(() => {
      if (!proc.killed) proc.kill('SIGKILL');
      resolve();
    }, 3000);
  });
}

// Each test uses a unique port so they can run in parallel

test.describe('Examples Health Check', () => {
  // Increase timeout for server startup + page load
  test.setTimeout(30000);

  for (const example of EXAMPLES) {
    test(`${example.dir} — loads and renders without errors`, async ({ page }) => {
      const port = nextPort++;
      let serverProc = null;

      try {
        // Start dev server
        serverProc = await startDevServer(example.dir, port);

        // Collect page errors (uncaught exceptions)
        const pageErrors = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        // Collect console errors (but ignore known noise)
        const consoleErrors = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const text = msg.text();
            // Ignore favicon 404s and similar noise
            if (text.includes('favicon')) return;
            if (text.includes('the server responded with a status of 404')) return;
            consoleErrors.push(text);
          }
        });

        // Navigate to the example
        await page.goto(`http://localhost:${port}`, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });

        // 1. Check #app exists and has rendered content
        const app = page.locator('#app');
        await expect(app).toBeAttached({ timeout: 10000 });

        // Wait for app to render children (not just the empty container)
        await page.waitForFunction(
          () => {
            const el = document.getElementById('app');
            return el && el.innerHTML.trim().length > 0;
          },
          { timeout: 10000 }
        ).catch(() => {});

        // 2. Check #app has rendered content (not empty)
        const innerHTML = await app.innerHTML();
        expect(
          innerHTML.trim().length,
          `#app in "${example.dir}" is empty — component did not render`
        ).toBeGreaterThan(0);

        // 3. Check page title contains expected text
        const title = await page.title();
        expect(
          title.toLowerCase(),
          `Page title "${title}" does not contain "${example.title}"`
        ).toContain(example.title.toLowerCase());

        // 4. No uncaught JS errors
        expect(
          pageErrors,
          `Uncaught JS errors in "${example.dir}": ${pageErrors.join(' | ')}`
        ).toHaveLength(0);

        // 5. No console errors
        expect(
          consoleErrors,
          `Console errors in "${example.dir}": ${consoleErrors.join(' | ')}`
        ).toHaveLength(0);

      } finally {
        await killServer(serverProc);
      }
    });
  }
});
