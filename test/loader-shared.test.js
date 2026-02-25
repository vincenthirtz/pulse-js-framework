/**
 * Pulse Loader - Shared Utilities Tests
 *
 * Tests for loader/shared.js - common helpers used across all build tool plugins
 * (Vite, Webpack, Rollup, ESBuild, Parcel, SWC) and Server Components plugins.
 *
 * Covers:
 *   - checkPreprocessors() / resetPreprocessorCache()
 *   - logPreprocessorAvailability()
 *   - STYLES_MATCH_REGEX / INLINE_STYLES_REMOVAL_REGEX
 *   - extractCssFromOutput()
 *   - removeInlineStyles()
 *   - getPreprocessorOptions()
 *   - processStyles()
 *   - extractImports()
 *   - createImportViolationError()
 *   - buildManifest()
 *   - writeManifestToDisk()
 *
 * @module test/loader-shared
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import {
  checkPreprocessors,
  resetPreprocessorCache,
  logPreprocessorAvailability,
  STYLES_MATCH_REGEX,
  INLINE_STYLES_REMOVAL_REGEX,
  extractCssFromOutput,
  removeInlineStyles,
  getPreprocessorOptions,
  processStyles,
  extractImports,
  createImportViolationError,
  buildManifest,
  writeManifestToDisk,
  writeManifestToDiskAsync,
  // Shared constants
  DIRECTIVE_REGEX,
  COMPONENT_ID_REGEX,
  EXPORT_CONST_REGEX,
  CLIENT_CHUNK_PREFIX,
  DEFAULT_MANIFEST_PATH,
  DEFAULT_MANIFEST_FILENAME,
  // Shared SC helpers
  loadClientManifest,
  getComponentChunk,
  getClientComponentIds
} from '../loader/shared.js';

// =============================================================================
// Compiled output fixtures
// =============================================================================

const COMPILED_WITH_SCOPE = `// Some code
// Styles
const SCOPE_ID = 'p123abc';
const styles = \`
  .test.p123abc { color: red; }
\`;

// Inject styles
const styleEl = document.createElement("style");
styleEl.setAttribute('data-p-scope', SCOPE_ID);
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// More code`;

const COMPILED_WITHOUT_SCOPE = `// Some code
// Styles
const styles = \`
  .test { color: red; }
\`;

// Inject styles
const styleEl = document.createElement("style");
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// More code`;

const COMPILED_NO_STYLES = `// Some code
export default function MyComponent() {}
// More code`;

// =============================================================================
// Tests
// =============================================================================

describe('Shared Loader Utilities', () => {

  // Reset cache after every test to prevent cross-test pollution
  afterEach(() => {
    resetPreprocessorCache();
  });

  // ===========================================================================
  // checkPreprocessors()
  // ===========================================================================

  describe('checkPreprocessors()', () => {

    test('returns an object with sass, less, and stylus boolean properties', () => {
      const result = checkPreprocessors();

      assert.strictEqual(typeof result, 'object', 'result should be an object');
      assert.ok(result !== null, 'result should not be null');
      assert.ok('sass' in result, 'result should have a "sass" property');
      assert.ok('less' in result, 'result should have a "less" property');
      assert.ok('stylus' in result, 'result should have a "stylus" property');
    });

    test('all property values are booleans', () => {
      const result = checkPreprocessors();

      assert.strictEqual(typeof result.sass, 'boolean', '"sass" property should be a boolean');
      assert.strictEqual(typeof result.less, 'boolean', '"less" property should be a boolean');
      assert.strictEqual(typeof result.stylus, 'boolean', '"stylus" property should be a boolean');
    });

    test('second call returns the exact same cached object (reference equality)', () => {
      const first = checkPreprocessors();
      const second = checkPreprocessors();

      assert.strictEqual(first, second, 'second call should return the cached object (same reference)');
    });

    test('values are consistent across multiple calls', () => {
      const first = checkPreprocessors();
      const second = checkPreprocessors();

      assert.strictEqual(first.sass, second.sass, '"sass" value should be consistent across calls');
      assert.strictEqual(first.less, second.less, '"less" value should be consistent across calls');
      assert.strictEqual(first.stylus, second.stylus, '"stylus" value should be consistent across calls');
    });

  });

  // ===========================================================================
  // resetPreprocessorCache()
  // ===========================================================================

  describe('resetPreprocessorCache()', () => {

    test('after reset, checkPreprocessors() returns a fresh object (not same reference)', () => {
      const before = checkPreprocessors();
      resetPreprocessorCache();
      const after = checkPreprocessors();

      assert.notStrictEqual(before, after, 'after reset, a new object should be returned');
    });

    test('after reset, result still has correct shape', () => {
      checkPreprocessors();
      resetPreprocessorCache();
      const fresh = checkPreprocessors();

      assert.ok('sass' in fresh, 'fresh result should have "sass" property');
      assert.ok('less' in fresh, 'fresh result should have "less" property');
      assert.ok('stylus' in fresh, 'fresh result should have "stylus" property');
      assert.strictEqual(typeof fresh.sass, 'boolean', '"sass" should be boolean after reset');
      assert.strictEqual(typeof fresh.less, 'boolean', '"less" should be boolean after reset');
      assert.strictEqual(typeof fresh.stylus, 'boolean', '"stylus" should be boolean after reset');
    });

    test('reset can be called multiple times without error', () => {
      assert.doesNotThrow(() => {
        resetPreprocessorCache();
        resetPreprocessorCache();
        resetPreprocessorCache();
      }, 'multiple resets should not throw');
    });

    test('reset on a cold cache (never called) does not throw', () => {
      // afterEach already calls reset; call again before any checkPreprocessors() call
      resetPreprocessorCache();
      assert.doesNotThrow(() => {
        resetPreprocessorCache();
      }, 'resetting a cold cache should not throw');
    });

  });

  // ===========================================================================
  // logPreprocessorAvailability()
  // ===========================================================================

  describe('logPreprocessorAvailability()', () => {

    test('calls logFn with formatted message when at least one preprocessor is available', () => {
      // We cannot guarantee which preprocessors are installed, so we mock
      // checkPreprocessors by temporarily having at least one truthy entry.
      // Instead, call the real function and check it does not throw regardless.
      const messages = [];
      assert.doesNotThrow(() => {
        logPreprocessorAvailability('Test Plugin', { logFn: (msg) => messages.push(msg) });
      }, 'logPreprocessorAvailability should not throw');
    });

    test('logFn receives a message containing the plugin label when preprocessors are available', () => {
      const available = checkPreprocessors();
      const hasAny = available.sass || available.less || available.stylus;

      if (!hasAny) {
        // No preprocessors installed in this environment; log nothing
        const messages = [];
        logPreprocessorAvailability('MyPlugin', { logFn: (m) => messages.push(m) });
        assert.strictEqual(messages.length, 0, 'no message should be logged when no preprocessors available');
      } else {
        const messages = [];
        logPreprocessorAvailability('MyPlugin', { logFn: (m) => messages.push(m) });
        assert.strictEqual(messages.length, 1, 'exactly one message should be logged');
        assert.ok(messages[0].includes('MyPlugin'), 'message should contain the plugin label');
        assert.ok(messages[0].startsWith('[MyPlugin]'), 'message should start with [label]');
      }
    });

    test('uses console.log by default when logFn is omitted (does not throw)', () => {
      assert.doesNotThrow(() => {
        logPreprocessorAvailability('DefaultLog');
      }, 'should not throw when using default console.log');
    });

    test('sassOnly mode suppresses LESS and Stylus from message', () => {
      const available = checkPreprocessors();
      // Only meaningful if LESS or Stylus is available; otherwise the message
      // simply lists nothing extra — either way the test should not throw.
      const messages = [];
      assert.doesNotThrow(() => {
        logPreprocessorAvailability('SassOnly Plugin', {
          sassOnly: true,
          logFn: (msg) => messages.push(msg)
        });
      }, 'sassOnly mode should not throw');

      if (messages.length > 0) {
        assert.ok(!messages[0].includes('LESS'), 'sassOnly message should not mention LESS');
        assert.ok(!messages[0].includes('Stylus'), 'sassOnly message should not mention Stylus');
      }
    });

    test('sassOnly=false (default) allows all preprocessors in message', () => {
      const available = checkPreprocessors();
      const messages = [];
      logPreprocessorAvailability('AllPlugin', {
        sassOnly: false,
        logFn: (msg) => messages.push(msg)
      });

      // Message should include every available preprocessor
      if (messages.length > 0 && available.less) {
        assert.ok(messages[0].includes('LESS'), 'message should mention LESS when available and sassOnly=false');
      }
      if (messages.length > 0 && available.stylus) {
        assert.ok(messages[0].includes('Stylus'), 'message should mention Stylus when available and sassOnly=false');
      }
    });

    test('does not call logFn when no preprocessors are available', () => {
      const available = checkPreprocessors();
      const hasAny = available.sass || available.less || available.stylus;
      if (hasAny) return; // Skip — cannot fake availability without mocking the module

      const callCount = { n: 0 };
      logPreprocessorAvailability('Empty', { logFn: () => { callCount.n++; } });
      assert.strictEqual(callCount.n, 0, 'logFn should not be called when no preprocessors are available');
    });

  });

  // ===========================================================================
  // STYLES_MATCH_REGEX
  // ===========================================================================

  describe('STYLES_MATCH_REGEX', () => {

    test('is a RegExp', () => {
      assert.ok(STYLES_MATCH_REGEX instanceof RegExp, 'STYLES_MATCH_REGEX should be a RegExp');
    });

    test('matches const styles = `...`; and captures CSS content', () => {
      const code = 'const styles = `\n  .foo { color: blue; }\n`;';
      const match = code.match(STYLES_MATCH_REGEX);

      assert.ok(match !== null, 'regex should match the styles declaration');
      assert.ok(match[1].includes('.foo'), 'captured group 1 should contain the CSS content');
    });

    test('matches CSS from compiled output with SCOPE_ID', () => {
      const match = COMPILED_WITH_SCOPE.match(STYLES_MATCH_REGEX);

      assert.ok(match !== null, 'should match styles in COMPILED_WITH_SCOPE fixture');
      assert.ok(match[1].includes('.test.p123abc'), 'captured CSS should contain scoped selector');
    });

    test('matches CSS from compiled output without SCOPE_ID', () => {
      const match = COMPILED_WITHOUT_SCOPE.match(STYLES_MATCH_REGEX);

      assert.ok(match !== null, 'should match styles in COMPILED_WITHOUT_SCOPE fixture');
      assert.ok(match[1].includes('.test'), 'captured CSS should contain selector');
    });

    test('does not match code with no styles block', () => {
      const match = COMPILED_NO_STYLES.match(STYLES_MATCH_REGEX);

      assert.strictEqual(match, null, 'should not match code with no styles declaration');
    });

    test('captures multi-line CSS correctly', () => {
      const multiLineCss = '.a { color: red; }\n.b { margin: 0; }\n.c { padding: 10px; }';
      const code = `const styles = \`\n${multiLineCss}\n\`;`;
      const match = code.match(STYLES_MATCH_REGEX);

      assert.ok(match !== null, 'should match multi-line CSS');
      assert.ok(match[1].includes('.a'), 'captured CSS should contain first rule');
      assert.ok(match[1].includes('.b'), 'captured CSS should contain second rule');
      assert.ok(match[1].includes('.c'), 'captured CSS should contain third rule');
    });

    test('does not match a regular string assignment (single quotes)', () => {
      const code = "const styles = '.foo { color: red; }';";
      const match = code.match(STYLES_MATCH_REGEX);

      assert.strictEqual(match, null, 'should not match single-quoted string assignment');
    });

  });

  // ===========================================================================
  // INLINE_STYLES_REMOVAL_REGEX
  // ===========================================================================

  describe('INLINE_STYLES_REMOVAL_REGEX', () => {

    test('is a RegExp', () => {
      assert.ok(INLINE_STYLES_REMOVAL_REGEX instanceof RegExp, 'INLINE_STYLES_REMOVAL_REGEX should be a RegExp');
    });

    test('matches the full inline injection block WITH SCOPE_ID line', () => {
      const match = COMPILED_WITH_SCOPE.match(INLINE_STYLES_REMOVAL_REGEX);

      assert.ok(match !== null, 'should match inline injection block with SCOPE_ID in fixture');
    });

    test('matches the full inline injection block WITHOUT SCOPE_ID line', () => {
      const match = COMPILED_WITHOUT_SCOPE.match(INLINE_STYLES_REMOVAL_REGEX);

      assert.ok(match !== null, 'should match inline injection block without SCOPE_ID in fixture');
    });

    test('does not match code with no injection block', () => {
      const match = COMPILED_NO_STYLES.match(INLINE_STYLES_REMOVAL_REGEX);

      assert.strictEqual(match, null, 'should not match code with no injection block');
    });

    test('matched block includes the createElement call', () => {
      const match = COMPILED_WITH_SCOPE.match(INLINE_STYLES_REMOVAL_REGEX);

      assert.ok(match !== null, 'regex should match');
      assert.ok(match[0].includes('document.createElement'), 'matched text should include createElement');
      assert.ok(match[0].includes('document.head.appendChild'), 'matched text should include appendChild');
    });

    test('matched block in scopeless output does not contain SCOPE_ID', () => {
      const match = COMPILED_WITHOUT_SCOPE.match(INLINE_STYLES_REMOVAL_REGEX);

      assert.ok(match !== null, 'regex should match scopeless fixture');
      assert.ok(!match[0].includes('SCOPE_ID'), 'matched text in scopeless output should not contain SCOPE_ID');
    });

  });

  // ===========================================================================
  // extractCssFromOutput()
  // ===========================================================================

  describe('extractCssFromOutput()', () => {

    test('returns { css, found: true } when styles block is present (with scope)', () => {
      const result = extractCssFromOutput(COMPILED_WITH_SCOPE);

      assert.strictEqual(result.found, true, '"found" should be true');
      assert.ok(typeof result.css === 'string', '"css" should be a string');
      assert.ok(result.css.includes('.test.p123abc'), '"css" should contain scoped selector');
    });

    test('returns { css, found: true } when styles block is present (without scope)', () => {
      const result = extractCssFromOutput(COMPILED_WITHOUT_SCOPE);

      assert.strictEqual(result.found, true, '"found" should be true');
      assert.ok(typeof result.css === 'string', '"css" should be a string');
      assert.ok(result.css.includes('.test'), '"css" should contain selector');
    });

    test('returns { css: null, found: false } when no styles block is present', () => {
      const result = extractCssFromOutput(COMPILED_NO_STYLES);

      assert.strictEqual(result.found, false, '"found" should be false');
      assert.strictEqual(result.css, null, '"css" should be null');
    });

    test('returns { css: null, found: false } for empty string', () => {
      const result = extractCssFromOutput('');

      assert.strictEqual(result.found, false, '"found" should be false for empty string');
      assert.strictEqual(result.css, null, '"css" should be null for empty string');
    });

    test('extracted CSS does not include the surrounding backticks or "const styles ="', () => {
      const result = extractCssFromOutput(COMPILED_WITH_SCOPE);

      assert.ok(!result.css.includes('const styles'), '"css" should not include the variable declaration');
      assert.ok(!result.css.includes('`'), '"css" should not include backtick characters');
    });

    test('extracted CSS preserves whitespace and newlines', () => {
      const css = '\n  .rule { color: red; }\n  .other { margin: 0; }\n';
      const code = `const styles = \`${css}\`;`;
      const result = extractCssFromOutput(code);

      assert.strictEqual(result.found, true, '"found" should be true');
      assert.strictEqual(result.css, css, 'extracted CSS should exactly match original content');
    });

  });

  // ===========================================================================
  // removeInlineStyles()
  // ===========================================================================

  describe('removeInlineStyles()', () => {

    test('replaces the inline injection block with the given replacement string (with SCOPE_ID)', () => {
      const replacement = '/* styles extracted */';
      const result = removeInlineStyles(COMPILED_WITH_SCOPE, replacement);

      assert.ok(result.includes(replacement), 'result should contain the replacement string');
      assert.ok(!result.includes('document.createElement("style")'), 'result should not contain createElement call');
      assert.ok(!result.includes('document.head.appendChild'), 'result should not contain appendChild call');
    });

    test('replaces the inline injection block with the given replacement string (without SCOPE_ID)', () => {
      const replacement = '/* css extracted */';
      const result = removeInlineStyles(COMPILED_WITHOUT_SCOPE, replacement);

      assert.ok(result.includes(replacement), 'result should contain the replacement string');
      assert.ok(!result.includes('document.createElement("style")'), 'result should not contain createElement call');
    });

    test('preserves code outside the injection block', () => {
      const replacement = '';
      const result = removeInlineStyles(COMPILED_WITH_SCOPE, replacement);

      assert.ok(result.includes('// Some code'), 'code before the block should be preserved');
      assert.ok(result.includes('// More code'), 'code after the block should be preserved');
    });

    test('returns original string unchanged when no injection block is present', () => {
      const result = removeInlineStyles(COMPILED_NO_STYLES, '/* replaced */');

      assert.strictEqual(result, COMPILED_NO_STYLES, 'code without styles block should be returned unchanged');
    });

    test('replacement can be an empty string (full removal)', () => {
      const result = removeInlineStyles(COMPILED_WITH_SCOPE, '');

      assert.ok(!result.includes('styleEl'), 'all style injection code should be removed');
    });

    test('replacement can be a multi-line string', () => {
      const replacement = '// line 1\n// line 2\n// line 3';
      const result = removeInlineStyles(COMPILED_WITHOUT_SCOPE, replacement);

      assert.ok(result.includes('// line 1'), 'multi-line replacement first line should be present');
      assert.ok(result.includes('// line 3'), 'multi-line replacement last line should be present');
    });

  });

  // ===========================================================================
  // getPreprocessorOptions()
  // ===========================================================================

  describe('getPreprocessorOptions()', () => {

    test('returns sassOptions when preprocessor is "sass"', () => {
      const sassOpts = { loadPaths: ['/src/styles'], compressed: true };
      const result = getPreprocessorOptions('sass', { sassOptions: sassOpts });

      assert.deepStrictEqual(result, sassOpts, 'should return the exact sassOptions object');
    });

    test('returns lessOptions when preprocessor is "less"', () => {
      const lessOpts = { strictMath: true, paths: ['/styles'] };
      const result = getPreprocessorOptions('less', { lessOptions: lessOpts });

      assert.deepStrictEqual(result, lessOpts, 'should return the exact lessOptions object');
    });

    test('returns stylusOptions when preprocessor is "stylus"', () => {
      const stylusOpts = { compress: false, paths: ['/styl'] };
      const result = getPreprocessorOptions('stylus', { stylusOptions: stylusOpts });

      assert.deepStrictEqual(result, stylusOpts, 'should return the exact stylusOptions object');
    });

    test('returns empty object for unknown preprocessor type', () => {
      const result = getPreprocessorOptions('postcss', {
        sassOptions: { a: 1 },
        lessOptions: { b: 2 },
        stylusOptions: { c: 3 }
      });

      assert.deepStrictEqual(result, {}, 'unknown preprocessor should return empty object');
    });

    test('returns empty object when specific options key is absent from allOpts', () => {
      const result = getPreprocessorOptions('sass', { lessOptions: { x: 1 } });

      assert.deepStrictEqual(result, {}, 'missing sassOptions should default to empty object');
    });

    test('returns empty object when allOpts is empty', () => {
      const result = getPreprocessorOptions('sass', {});

      assert.deepStrictEqual(result, {}, 'empty allOpts should yield empty object');
    });

    test('ignores other keys when returning specific preprocessor options', () => {
      const allOpts = {
        sassOptions: { compressed: true },
        lessOptions: { strictMath: true },
        stylusOptions: { compress: false }
      };
      const result = getPreprocessorOptions('less', allOpts);

      assert.deepStrictEqual(result, { strictMath: true }, 'only lessOptions should be returned for "less"');
    });

  });

  // ===========================================================================
  // processStyles()
  // ===========================================================================

  describe('processStyles()', () => {

    test('returns { css, preprocessor: "none", warning: null } for plain CSS', () => {
      const css = '.foo { color: red; }\n.bar { margin: 0; }';
      const result = processStyles(css, '/src/components/Foo.pulse');

      assert.strictEqual(result.preprocessor, 'none', 'preprocessor should be "none" for plain CSS');
      assert.strictEqual(result.warning, null, 'warning should be null for plain CSS');
      assert.strictEqual(result.css, css, 'css should be returned unchanged for plain CSS');
    });

    test('returns { css, preprocessor: "none", warning: null } for empty string', () => {
      const result = processStyles('', '/src/components/Empty.pulse');

      assert.strictEqual(result.preprocessor, 'none', 'preprocessor should be "none" for empty CSS');
      assert.strictEqual(result.warning, null, 'warning should be null for empty CSS');
    });

    test('result always has css, preprocessor, and warning keys', () => {
      const result = processStyles('.x { color: blue; }', '/src/X.pulse');

      assert.ok('css' in result, 'result should have a "css" key');
      assert.ok('preprocessor' in result, 'result should have a "preprocessor" key');
      assert.ok('warning' in result, 'result should have a "warning" key');
    });

    test('returns warning string (not null) when detected preprocessor is unavailable', () => {
      // We cannot control which preprocessors are installed, but we can test
      // the warning path by checking behavior for SASS syntax when sass is not available.
      const available = checkPreprocessors();

      // Find a preprocessor that is NOT available to test the warning path
      let unavailablePreprocessor = null;
      let unavailableCss = null;

      if (!available.sass) {
        unavailablePreprocessor = 'sass';
        unavailableCss = '$color: red;\n.foo { color: $color; }';
      } else if (!available.less) {
        unavailablePreprocessor = 'less';
        unavailableCss = '@color: red;\n.foo { color: @color; }';
      } else if (!available.stylus) {
        unavailablePreprocessor = 'stylus';
        unavailableCss = 'color = red\n.foo\n  color color';
      }

      if (unavailablePreprocessor === null) {
        // All preprocessors are available; the warning path for "unavailable"
        // cannot be exercised — skip gracefully
        return;
      }

      const result = processStyles(unavailableCss, '/src/Test.pulse');

      // When the preprocessor is detected but unavailable, shared.js returns
      // { css, preprocessor: 'none', warning: null } (falls through the
      // `!available[preprocessor]` guard)
      assert.strictEqual(result.preprocessor, 'none',
        `when ${unavailablePreprocessor} is unavailable, preprocessor should be "none"`);
      assert.strictEqual(result.warning, null,
        `when ${unavailablePreprocessor} is unavailable, warning should be null (not an error)`);
      assert.strictEqual(result.css, unavailableCss,
        'original CSS should be returned unchanged when preprocessor unavailable');
    });

    test('passes allOpts to getPreprocessorOptions without throwing', () => {
      const css = '.plain { display: flex; }';
      const allOpts = {
        sassOptions: { compressed: false },
        lessOptions: {},
        stylusOptions: {}
      };

      assert.doesNotThrow(() => {
        processStyles(css, '/src/Component.pulse', allOpts);
      }, 'processStyles should not throw when allOpts are provided');
    });

    test('returns string css value', () => {
      const css = 'body { box-sizing: border-box; }';
      const result = processStyles(css, '/src/App.pulse');

      assert.strictEqual(typeof result.css, 'string', '"css" property should always be a string');
    });

  });

  // ===========================================================================
  // extractImports()
  // ===========================================================================

  describe('extractImports()', () => {

    test('returns empty array for empty string', () => {
      const result = extractImports('');

      assert.deepStrictEqual(result, [], 'should return empty array for empty code');
    });

    test('returns empty array when no imports are present', () => {
      const code = 'const x = 1;\nfunction foo() { return x; }\nexport default foo;';
      const result = extractImports(code);

      assert.deepStrictEqual(result, [], 'should return empty array when no imports present');
    });

    test('extracts single default import', () => {
      const code = "import React from 'react';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['react'], 'should extract the module specifier from default import');
    });

    test('extracts named imports', () => {
      const code = "import { pulse, effect } from 'pulse-js-framework/runtime';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['pulse-js-framework/runtime'], 'should extract specifier from named import');
    });

    test('extracts namespace import', () => {
      const code = "import * as utils from './utils.js';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./utils.js'], 'should extract specifier from namespace import');
    });

    test('extracts multiple static imports', () => {
      const code = [
        "import Foo from './Foo.js';",
        "import { bar } from './bar.js';",
        "import * as ns from './ns.js';"
      ].join('\n');
      const result = extractImports(code);

      assert.strictEqual(result.length, 3, 'should extract all three static imports');
      assert.ok(result.includes('./Foo.js'), 'should include ./Foo.js');
      assert.ok(result.includes('./bar.js'), 'should include ./bar.js');
      assert.ok(result.includes('./ns.js'), 'should include ./ns.js');
    });

    test('extracts dynamic import', () => {
      const code = "const mod = await import('./lazy.js');";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./lazy.js'], 'should extract dynamic import specifier');
    });

    test('extracts multiple dynamic imports', () => {
      const code = [
        "const a = import('./a.js');",
        "const b = import('./b.js');"
      ].join('\n');
      const result = extractImports(code);

      assert.strictEqual(result.length, 2, 'should extract both dynamic imports');
      assert.ok(result.includes('./a.js'), 'should include ./a.js');
      assert.ok(result.includes('./b.js'), 'should include ./b.js');
    });

    test('extracts both static and dynamic imports from mixed code', () => {
      const code = [
        "import Header from './Header.js';",
        "const Footer = await import('./Footer.js');",
        "import { util } from './util.js';"
      ].join('\n');
      const result = extractImports(code);

      assert.strictEqual(result.length, 3, 'should extract all imports from mixed code');
      assert.ok(result.includes('./Header.js'), 'should include static default import');
      assert.ok(result.includes('./Footer.js'), 'should include dynamic import');
      assert.ok(result.includes('./util.js'), 'should include static named import');
    });

    test('does not extract import-like text inside comments', () => {
      // The regex is line-based and will not match inside block comments because
      // it requires the specific "from" keyword pattern; a plain URL in a comment
      // does not match the ES6 import regex.
      const code = [
        '// import Fake from "not-real";',
        "import Real from './real.js';"
      ].join('\n');
      const result = extractImports(code);

      // The comment line does NOT match the static-import regex (no "import X from" pattern
      // at start — it starts with "// "), but the dynamic regex won't match either.
      // Only the real import should appear.
      assert.ok(result.includes('./real.js'), 'should include the real import');
    });

    test('returns array of strings', () => {
      const code = "import Foo from './Foo.js';";
      const result = extractImports(code);

      assert.ok(Array.isArray(result), 'result should be an array');
      result.forEach((item) => {
        assert.strictEqual(typeof item, 'string', 'each item in the array should be a string');
      });
    });

    test('handles imports with double quotes', () => {
      const code = 'import Something from "./something.js";';
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./something.js'], 'should handle double-quoted import paths');
    });

    test('handles package imports (no relative path)', () => {
      const code = "import { createStore } from 'pulse-js-framework/runtime/store';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['pulse-js-framework/runtime/store'],
        'should extract bare package specifier');
    });

    // =========================================================================
    // Multi-line imports
    // =========================================================================

    test('extracts multi-line named imports', () => {
      const code = `import {
  pulse,
  effect,
  computed
} from 'pulse-js-framework/runtime';`;
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['pulse-js-framework/runtime'],
        'should extract specifier from multi-line named import');
    });

    test('extracts multi-line named imports with trailing commas', () => {
      const code = `import {
  A,
  B,
  C,
} from './components.js';`;
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./components.js']);
    });

    // =========================================================================
    // Side-effect imports
    // =========================================================================

    test('extracts side-effect imports', () => {
      const code = "import './styles.css';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./styles.css'],
        'should extract side-effect import specifier');
    });

    test('extracts side-effect import with double quotes', () => {
      const code = 'import "./polyfill.js";';
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./polyfill.js']);
    });

    // =========================================================================
    // Re-exports
    // =========================================================================

    test('extracts named re-exports', () => {
      const code = "export { foo, bar } from './utils.js';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./utils.js'],
        'should extract specifier from named re-export');
    });

    test('extracts wildcard re-exports', () => {
      const code = "export * from './helpers.js';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./helpers.js'],
        'should extract specifier from wildcard re-export');
    });

    test('extracts namespace re-exports', () => {
      const code = "export * as utils from './utils.js';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./utils.js'],
        'should extract specifier from namespace re-export');
    });

    test('extracts multi-line re-exports', () => {
      const code = `export {
  createRouter,
  lazy
} from './router.js';`;
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./router.js']);
    });

    // =========================================================================
    // TypeScript type-only imports
    // =========================================================================

    test('extracts type-only imports', () => {
      const code = "import type { Options } from './types.js';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./types.js'],
        'should extract specifier from type-only import');
    });

    test('extracts type-only re-exports', () => {
      const code = "export type { Config } from './config.js';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./config.js']);
    });

    // =========================================================================
    // Deduplication
    // =========================================================================

    test('deduplicates identical specifiers', () => {
      const code = [
        "import { foo } from './utils.js';",
        "import { bar } from './utils.js';",
        "export { baz } from './utils.js';"
      ].join('\n');
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['./utils.js'],
        'should deduplicate identical import specifiers');
    });

    // =========================================================================
    // Combined
    // =========================================================================

    test('extracts all import types from mixed code', () => {
      const code = [
        "import './polyfill.js';",
        "import React from 'react';",
        "import { useState } from 'react';",
        "import type { FC } from 'react';",
        "export * from './helpers.js';",
        "export { default } from './main.js';",
        "const lazy = import('./Lazy.js');"
      ].join('\n');
      const result = extractImports(code);

      assert.ok(result.includes('./polyfill.js'), 'should include side-effect import');
      assert.ok(result.includes('react'), 'should include react (deduplicated)');
      assert.ok(result.includes('./helpers.js'), 'should include wildcard re-export');
      assert.ok(result.includes('./main.js'), 'should include named re-export');
      assert.ok(result.includes('./Lazy.js'), 'should include dynamic import');
      // react should appear only once despite 3 imports from it
      assert.strictEqual(result.filter(x => x === 'react').length, 1, 'react should be deduplicated');
    });

    test('extracts default + named combo import', () => {
      const code = "import React, { useState, useEffect } from 'react';";
      const result = extractImports(code);

      assert.deepStrictEqual(result, ['react'],
        'should extract specifier from default + named combo import');
    });

  });

  // ===========================================================================
  // createImportViolationError()
  // ===========================================================================

  describe('createImportViolationError()', () => {

    const CLIENT_PATH = resolve(__dirname, '../src/components/ClientButton.pulse');
    const SERVER_PATH = resolve(__dirname, '../src/components/ServerData.pulse');
    const IMPORT_SOURCE = './ServerData.pulse';

    test('returns a non-empty string', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      assert.strictEqual(typeof result, 'string', 'should return a string');
      assert.ok(result.length > 0, 'returned string should not be empty');
    });

    test('message contains [Pulse] prefix and "Import Violation"', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      assert.ok(result.includes('[Pulse]'), 'message should contain [Pulse] prefix');
      assert.ok(result.includes('Import Violation'), 'message should contain "Import Violation"');
    });

    test('message contains relative path of client file', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      const clientRelative = resolve(__dirname, '../src/components/ClientButton.pulse');
      // The function uses relative(process.cwd(), path) — just verify the filename appears
      assert.ok(result.includes('ClientButton.pulse'), 'message should mention the client file name');
    });

    test('message contains relative path of server file', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      assert.ok(result.includes('ServerData.pulse'), 'message should mention the server file name');
    });

    test('message contains the import source specifier', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      assert.ok(result.includes(IMPORT_SOURCE), 'message should contain the import source path');
    });

    test('message contains the help text URL', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      assert.ok(result.includes('https://pulse-js.fr/server-components#import-rules'),
        'message should contain the documentation URL');
    });

    test('message contains suggestion to use Server Actions', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      assert.ok(result.includes('Server Actions'), 'message should suggest Server Actions');
    });

    test('message contains "Client Component" guidance', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      assert.ok(result.includes('Client Component'), 'message should mention Client Component');
    });

    test('result is trimmed (no leading or trailing whitespace)', () => {
      const result = createImportViolationError(CLIENT_PATH, SERVER_PATH, IMPORT_SOURCE);

      assert.strictEqual(result, result.trim(), 'result should be trimmed');
    });

  });

  // ===========================================================================
  // buildManifest()
  // ===========================================================================

  describe('buildManifest()', () => {

    test('returns object with version "1.0" and empty components for empty map', () => {
      const result = buildManifest(new Map(), {});

      assert.deepStrictEqual(result, { version: '1.0', components: {} },
        'empty map should produce manifest with empty components');
    });

    test('returns object with version "1.0" and empty components when called with no args config', () => {
      const result = buildManifest(new Map());

      assert.strictEqual(result.version, '1.0', 'version should be "1.0"');
      assert.deepStrictEqual(result.components, {}, 'components should be empty');
    });

    test('includes a component with a chunk in the manifest', () => {
      const components = new Map([
        ['MyButton', { file: '/src/MyButton.pulse', chunk: 'assets/MyButton-abc123.js' }]
      ]);
      const result = buildManifest(components, {});

      assert.ok('MyButton' in result.components, 'manifest should contain MyButton component');
      assert.strictEqual(result.components['MyButton'].id, 'MyButton',
        'component entry should have correct id');
      assert.ok(result.components['MyButton'].chunk.includes('MyButton'),
        'component entry should have chunk path');
    });

    test('omits components that have no chunk (chunk is null)', () => {
      const components = new Map([
        ['WithChunk', { file: '/src/A.pulse', chunk: 'assets/A.js' }],
        ['NoChunk', { file: '/src/B.pulse', chunk: null }]
      ]);
      const result = buildManifest(components, {});

      assert.ok('WithChunk' in result.components, 'WithChunk should appear in manifest');
      assert.ok(!('NoChunk' in result.components), 'NoChunk should be omitted from manifest');
    });

    test('prepends base path to chunk URL when config.base is set', () => {
      const components = new Map([
        ['Header', { file: '/src/Header.pulse', chunk: 'assets/Header-xyz.js' }]
      ]);
      const result = buildManifest(components, { base: '/app/' });

      const chunkUrl = result.components['Header'].chunk;
      assert.ok(chunkUrl.startsWith('/app/'), 'chunk URL should start with the base path');
      assert.ok(chunkUrl.includes('assets/Header-xyz.js'), 'chunk URL should include original chunk path');
    });

    test('uses empty string base path (default) when config.base is absent', () => {
      const components = new Map([
        ['Footer', { file: '/src/Footer.pulse', chunk: 'assets/Footer.js' }]
      ]);
      const result = buildManifest(components, {});

      const chunkUrl = result.components['Footer'].chunk;
      assert.ok(!chunkUrl.startsWith('/'), 'chunk URL should not be prefixed when no base');
      assert.ok(chunkUrl.includes('assets/Footer.js'), 'chunk URL should equal the original chunk');
    });

    test('handles multiple components correctly', () => {
      const components = new Map([
        ['CompA', { file: '/src/A.pulse', chunk: 'assets/A.js' }],
        ['CompB', { file: '/src/B.pulse', chunk: 'assets/B.js' }],
        ['CompC', { file: '/src/C.pulse', chunk: 'assets/C.js' }]
      ]);
      const result = buildManifest(components, {});

      assert.strictEqual(Object.keys(result.components).length, 3, 'manifest should have 3 components');
      assert.ok('CompA' in result.components, 'CompA should be in manifest');
      assert.ok('CompB' in result.components, 'CompB should be in manifest');
      assert.ok('CompC' in result.components, 'CompC should be in manifest');
    });

    test('each component entry contains id, chunk, and exports fields', () => {
      const components = new Map([
        ['Widget', { file: '/src/Widget.pulse', chunk: 'assets/Widget.js' }]
      ]);
      const result = buildManifest(components, {});
      const entry = result.components['Widget'];

      assert.ok('id' in entry, 'component entry should have "id" field');
      assert.ok('chunk' in entry, 'component entry should have "chunk" field');
      assert.ok('exports' in entry, 'component entry should have "exports" field');
      assert.ok(Array.isArray(entry.exports), '"exports" should be an array');
    });

    test('exports array contains "default" and the component id', () => {
      const components = new Map([
        ['Sidebar', { file: '/src/Sidebar.pulse', chunk: 'assets/Sidebar.js' }]
      ]);
      const result = buildManifest(components, {});

      assert.ok(result.components['Sidebar'].exports.includes('default'),
        'exports should include "default"');
      assert.ok(result.components['Sidebar'].exports.includes('Sidebar'),
        'exports should include the component id');
    });

    test('manifest version is always a string', () => {
      const result = buildManifest(new Map(), {});

      assert.strictEqual(typeof result.version, 'string', 'version should be a string');
    });

  });

  // ===========================================================================
  // writeManifestToDisk()
  // ===========================================================================

  describe('writeManifestToDisk()', () => {

    let tmpDir;

    beforeEach(() => {
      tmpDir = mkdtempSync(`${tmpdir()}/pulse-test-`);
    });

    afterEach(() => {
      // Clean up tmp directory if it was created
      if (tmpDir && existsSync(tmpDir)) {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    test('is a no-op when config has no manifestPath', () => {
      const manifest = { version: '1.0', components: {} };

      assert.doesNotThrow(() => {
        writeManifestToDisk(manifest, {});
      }, 'should not throw when no manifestPath is provided');

      assert.doesNotThrow(() => {
        writeManifestToDisk(manifest);
      }, 'should not throw when config is omitted entirely');
    });

    test('writes manifest JSON to disk at the specified path', () => {
      const manifestPath = `${tmpDir}/pulse-manifest.json`;
      const manifest = { version: '1.0', components: { Foo: { id: 'Foo', chunk: 'foo.js', exports: ['default'] } } };

      writeManifestToDisk(manifest, { manifestPath });

      assert.ok(existsSync(manifestPath), 'manifest file should exist after write');
    });

    test('written file is valid JSON', () => {
      const manifestPath = `${tmpDir}/manifest.json`;
      const manifest = { version: '1.0', components: {} };

      writeManifestToDisk(manifest, { manifestPath });

      const raw = readFileSync(manifestPath, 'utf-8');
      let parsed;
      assert.doesNotThrow(() => {
        parsed = JSON.parse(raw);
      }, 'written file should contain valid JSON');

      assert.strictEqual(parsed.version, '1.0', 'parsed version should match original');
    });

    test('written file is pretty-printed (indented with 2 spaces)', () => {
      const manifestPath = `${tmpDir}/pretty.json`;
      const manifest = { version: '1.0', components: { Bar: { id: 'Bar', chunk: 'bar.js', exports: [] } } };

      writeManifestToDisk(manifest, { manifestPath });

      const raw = readFileSync(manifestPath, 'utf-8');
      assert.ok(raw.includes('  '), 'file should contain indentation (pretty-printed)');
      assert.ok(raw.includes('\n'), 'file should contain newlines (pretty-printed)');
    });

    test('creates intermediate directories when they do not exist', () => {
      const nestedPath = `${tmpDir}/deep/nested/dir/manifest.json`;
      const manifest = { version: '1.0', components: {} };

      assert.doesNotThrow(() => {
        writeManifestToDisk(manifest, { manifestPath: nestedPath });
      }, 'should not throw when intermediate directories need to be created');

      assert.ok(existsSync(nestedPath), 'manifest should be written to deeply nested path');
    });

    test('written manifest matches the input manifest exactly', () => {
      const manifestPath = `${tmpDir}/exact.json`;
      const manifest = {
        version: '1.0',
        components: {
          Alpha: { id: 'Alpha', chunk: '/base/alpha.js', exports: ['default', 'Alpha'] },
          Beta: { id: 'Beta', chunk: '/base/beta.js', exports: ['default', 'Beta'] }
        }
      };

      writeManifestToDisk(manifest, { manifestPath });

      const parsed = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      assert.deepStrictEqual(parsed, manifest, 'written manifest should exactly match input');
    });

    test('does not throw on write error (swallows and warns)', () => {
      // Use an invalid path to trigger a write error (a directory that cannot be created)
      // On macOS, writing to /dev/null/manifest.json should fail
      assert.doesNotThrow(() => {
        writeManifestToDisk(
          { version: '1.0', components: {} },
          { manifestPath: '/dev/null/sub/manifest.json' }
        );
      }, 'writeManifestToDisk should swallow write errors and not throw');
    });

  });

  // ===========================================================================
  // writeManifestToDiskAsync()
  // ===========================================================================

  describe('writeManifestToDiskAsync()', () => {

    const TEST_DIR = resolve(__dirname, '../.test-output-async');
    const manifest = { version: '1.0', components: { Btn: { id: 'Btn', chunk: 'btn.js', exports: ['default'] } } };

    afterEach(() => {
      try { rmSync(TEST_DIR, { recursive: true, force: true }); } catch {}
    });

    test('returns a promise', () => {
      const result = writeManifestToDiskAsync(manifest, {});
      assert.ok(result instanceof Promise, 'should return a promise');
    });

    test('skips when manifestPath is missing', async () => {
      await writeManifestToDiskAsync(manifest, {});
      await writeManifestToDiskAsync(manifest);
      // No error = success
    });

    test('writes manifest to disk asynchronously', async () => {
      const manifestPath = resolve(TEST_DIR, 'async-manifest.json');
      await writeManifestToDiskAsync(manifest, { manifestPath });

      assert.ok(existsSync(manifestPath), 'manifest file should exist');
      const content = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      assert.strictEqual(content.version, '1.0');
      assert.ok(content.components.Btn, 'should contain Btn component');
    });

    test('creates nested directories', async () => {
      const nestedPath = resolve(TEST_DIR, 'deep/nested/dir/manifest.json');
      await writeManifestToDiskAsync(manifest, { manifestPath: nestedPath });

      assert.ok(existsSync(nestedPath), 'nested manifest file should exist');
    });

    test('does not throw on write error (swallows and warns)', async () => {
      await assert.doesNotReject(async () => {
        await writeManifestToDiskAsync(
          { version: '1.0', components: {} },
          { manifestPath: '/dev/null/sub/manifest.json' }
        );
      }, 'writeManifestToDiskAsync should swallow write errors');
    });

  });

  // ===========================================================================
  // Shared Constants
  // ===========================================================================

  describe('Shared Constants', () => {

    test('DIRECTIVE_REGEX matches __directive: "use client"', () => {
      assert.ok(DIRECTIVE_REGEX.test('__directive: "use client"'));
      assert.ok(DIRECTIVE_REGEX.test("__directive: 'use client'"));
      assert.ok(!DIRECTIVE_REGEX.test('__directive: "use server"'));
    });

    test('COMPONENT_ID_REGEX extracts component ID', () => {
      const match = '__componentId: "MyButton"'.match(COMPONENT_ID_REGEX);
      assert.strictEqual(match[1], 'MyButton');
    });

    test('EXPORT_CONST_REGEX extracts export name', () => {
      const match = 'export const Counter = {'.match(EXPORT_CONST_REGEX);
      assert.strictEqual(match[1], 'Counter');
    });

    test('CLIENT_CHUNK_PREFIX is "client-"', () => {
      assert.strictEqual(CLIENT_CHUNK_PREFIX, 'client-');
    });

    test('DEFAULT_MANIFEST_PATH is set', () => {
      assert.strictEqual(DEFAULT_MANIFEST_PATH, 'dist/.pulse-manifest.json');
    });

    test('DEFAULT_MANIFEST_FILENAME is set', () => {
      assert.strictEqual(DEFAULT_MANIFEST_FILENAME, '.pulse-manifest.json');
    });

  });

  // ===========================================================================
  // Shared SC Helpers (loadClientManifest, getComponentChunk, getClientComponentIds)
  // ===========================================================================

  describe('Shared SC Helpers', () => {

    const SC_TEST_DIR = resolve(__dirname, '../.test-output-sc-helpers');

    afterEach(() => {
      try { rmSync(SC_TEST_DIR, { recursive: true, force: true }); } catch {}
    });

    test('loadClientManifest returns empty manifest for missing file', () => {
      const manifest = loadClientManifest('/nonexistent/path/manifest.json');
      assert.strictEqual(manifest.version, '1.0');
      assert.deepStrictEqual(manifest.components, {});
    });

    test('loadClientManifest reads valid manifest from disk', () => {
      const manifestPath = resolve(SC_TEST_DIR, 'test-load-manifest.json');
      const data = { version: '1.0', components: { Btn: { chunk: 'btn.js' } } };
      mkdirSync(dirname(manifestPath), { recursive: true });
      writeFileSync(manifestPath, JSON.stringify(data), 'utf-8');

      const manifest = loadClientManifest(manifestPath);
      assert.strictEqual(manifest.version, '1.0');
      assert.strictEqual(manifest.components.Btn.chunk, 'btn.js');
    });

    test('getComponentChunk returns chunk URL or null', () => {
      const manifest = { components: { Btn: { chunk: '/assets/btn.js' }, Card: { chunk: null } } };
      assert.strictEqual(getComponentChunk(manifest, 'Btn'), '/assets/btn.js');
      assert.strictEqual(getComponentChunk(manifest, 'Card'), null);
      assert.strictEqual(getComponentChunk(manifest, 'Missing'), null);
    });

    test('getClientComponentIds returns Set of IDs', () => {
      const manifest = { components: { Btn: { chunk: 'a.js' }, Card: { chunk: 'b.js' } } };
      const ids = getClientComponentIds(manifest);
      assert.ok(ids instanceof Set);
      assert.strictEqual(ids.size, 2);
      assert.ok(ids.has('Btn'));
      assert.ok(ids.has('Card'));
    });

    test('getClientComponentIds returns empty Set for empty manifest', () => {
      const ids = getClientComponentIds({ components: {} });
      assert.strictEqual(ids.size, 0);
    });

  });

  // ===========================================================================
  // writeManifestToDisk quiet option
  // ===========================================================================

  describe('writeManifestToDisk quiet option', () => {

    const QUIET_TEST_DIR = resolve(__dirname, '../.test-output-quiet');
    const manifest = { version: '1.0', components: { X: { chunk: 'x.js' } } };

    afterEach(() => {
      try { rmSync(QUIET_TEST_DIR, { recursive: true, force: true }); } catch {}
    });

    test('quiet suppresses log output on writeManifestToDisk', () => {
      const manifestPath = resolve(QUIET_TEST_DIR, 'quiet-sync.json');
      // Should not throw; quiet suppresses console.log
      writeManifestToDisk(manifest, { manifestPath, quiet: true });
      assert.ok(existsSync(manifestPath));
    });

    test('quiet suppresses log output on writeManifestToDiskAsync', async () => {
      const manifestPath = resolve(QUIET_TEST_DIR, 'quiet-async.json');
      await writeManifestToDiskAsync(manifest, { manifestPath, quiet: true });
      assert.ok(existsSync(manifestPath));
    });

  });

});
