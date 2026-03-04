/**
 * Pulse Framework Entry Point Tests
 *
 * Tests for the main index.js entry point - ensures all runtime/compiler
 * exports are correctly re-exported and VERSION is properly set.
 *
 * @module test/index
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

// ============================================================================
// VERSION
// ============================================================================

describe('VERSION export', () => {
  test('exports VERSION string', async () => {
    const { VERSION } = await import('../index.js');
    assert.strictEqual(typeof VERSION, 'string');
    assert.ok(VERSION.length > 0, 'VERSION should not be empty');
  });

  test('VERSION matches package.json version', async () => {
    const { VERSION } = await import('../index.js');
    assert.strictEqual(VERSION, pkg.version);
  });

  test('VERSION follows semver pattern', async () => {
    const { VERSION } = await import('../index.js');
    const semverPattern = /^\d+\.\d+\.\d+/;
    assert.match(VERSION, semverPattern, 'VERSION should follow semver');
  });
});

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

describe('default export', () => {
  test('exports a default object with VERSION', async () => {
    const mod = await import('../index.js');
    assert.ok(mod.default, 'Should have a default export');
    assert.strictEqual(typeof mod.default, 'object');
    assert.strictEqual(mod.default.VERSION, pkg.version);
  });
});

// ============================================================================
// RUNTIME RE-EXPORTS
// ============================================================================

describe('runtime re-exports', () => {
  test('re-exports core reactivity primitives', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.pulse, 'function', 'Should export pulse()');
    assert.strictEqual(typeof mod.effect, 'function', 'Should export effect()');
    assert.strictEqual(typeof mod.computed, 'function', 'Should export computed()');
    assert.strictEqual(typeof mod.batch, 'function', 'Should export batch()');
    assert.strictEqual(typeof mod.watch, 'function', 'Should export watch()');
  });

  test('re-exports DOM utilities', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.el, 'function', 'Should export el()');
    assert.strictEqual(typeof mod.mount, 'function', 'Should export mount()');
    assert.strictEqual(typeof mod.list, 'function', 'Should export list()');
    assert.strictEqual(typeof mod.when, 'function', 'Should export when()');
  });

  test('re-exports router utilities', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.createRouter, 'function', 'Should export createRouter()');
  });

  test('re-exports store utilities', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.createStore, 'function', 'Should export createStore()');
  });

  test('re-exports form utilities', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.useForm, 'function', 'Should export useForm()');
  });

  test('re-exports async utilities', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.useAsync, 'function', 'Should export useAsync()');
    assert.strictEqual(typeof mod.useResource, 'function', 'Should export useResource()');
  });

  test('re-exports HTTP client', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.createHttp, 'function', 'Should export createHttp()');
  });

  test('re-exports accessibility utilities', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.announce, 'function', 'Should export announce()');
  });

  test('re-exports SSR utilities', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.renderToString, 'function', 'Should export renderToString()');
  });

  test('re-exports security utilities', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.escapeHtml, 'function', 'Should export escapeHtml()');
    assert.strictEqual(typeof mod.sanitizeUrl, 'function', 'Should export sanitizeUrl()');
  });
});

// ============================================================================
// COMPILER RE-EXPORTS
// ============================================================================

describe('compiler re-exports', () => {
  test('re-exports compile function', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.compile, 'function', 'Should export compile()');
  });

  test('re-exports parse function', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.parse, 'function', 'Should export parse()');
  });

  test('re-exports tokenize function', async () => {
    const mod = await import('../index.js');
    assert.strictEqual(typeof mod.tokenize, 'function', 'Should export tokenize()');
  });

  test('compile() produces valid JS from a simple .pulse file', async () => {
    const { compile } = await import('../index.js');
    const source = `
@page Counter
state {
  count: 0
}
view {
  div { "Count: {count}" }
}
    `.trim();

    const result = compile(source, { filename: 'Counter.pulse' });
    assert.ok(result.success, `compile() should succeed. Errors: ${JSON.stringify(result.errors)}`);
    assert.ok(result.code, 'compile() should return code');
    assert.strictEqual(typeof result.code, 'string');
    assert.ok(result.code.length > 0, 'Compiled code should not be empty');
  });
});

// ============================================================================
// MODULE STABILITY
// ============================================================================

describe('module stability', () => {
  test('multiple imports return consistent exports', async () => {
    const mod1 = await import('../index.js');
    const mod2 = await import('../index.js');
    // Same module reference (ESM caching)
    assert.strictEqual(mod1.VERSION, mod2.VERSION);
    assert.strictEqual(mod1.pulse, mod2.pulse);
    assert.strictEqual(mod1.el, mod2.el);
  });

  test('has no unexpected undefined exports from runtime', async () => {
    const mod = await import('../index.js');
    const coreExports = ['pulse', 'effect', 'computed', 'batch', 'watch', 'el', 'mount', 'list', 'when'];
    for (const name of coreExports) {
      assert.notStrictEqual(mod[name], undefined, `Export "${name}" should not be undefined`);
    }
  });
});
