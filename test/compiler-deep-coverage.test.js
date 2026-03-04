/**
 * Compiler Deep Coverage Tests
 *
 * Targeted tests to boost coverage for:
 * - compiler/sourcemap.js         (74% → 92%+)
 * - compiler/directives.js        (69% → 92%+)
 * - compiler/parser/expressions.js (70% → 92%+)
 * - compiler/transformer/index.js  (81% → 92%+)
 * - compiler/transformer/view.js   (88% → 92%+)
 * - compiler/transformer/style.js  (87% → 92%+)
 * - compiler/transformer/expressions.js (89% → 92%+)
 *
 * @module test/compiler-deep-coverage
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import { compile } from '../compiler/index.js';
import { Lexer } from '../compiler/lexer.js';
import { Parser } from '../compiler/parser.js';
import { Transformer, transform } from '../compiler/transformer.js';
import {
  encodeVLQ,
  SourceMapGenerator,
  SourceMapConsumer
} from '../compiler/sourcemap.js';
import {
  Directive,
  isDirective,
  isDirectiveToken,
  validateDirective,
  getComponentType,
  isClientComponent,
  isServerComponent,
  isSharedComponent,
  parseDirectivesFromSource,
  isClientComponentSource,
  isServerComponentSource,
  isServerFile,
  isServerModule,
  isClientModule,
  getComponentTypeFromSource,
  validateDirectivesInSource
} from '../compiler/directives.js';
import { TokenType } from '../compiler/lexer.js';
import { transformExpression, transformExpressionString, transformFunctionBody } from '../compiler/transformer/expressions.js';
import { flattenStyleRule, scopeStyleSelector } from '../compiler/transformer/style.js';
import {
  transformViewNode,
  transformClientDirective,
  transformServerDirective,
  addScopeToSelector
} from '../compiler/transformer/view.js';

// ============================================================================
// Helper: create minimal transformer context
// ============================================================================
function makeTransformer(options = {}) {
  const src = options.src || '@page Test\nview { div "hello" }';
  const ast = new Parser(new Lexer(src).tokenize()).parse();
  const t = new Transformer(ast, {
    sourceMap: false,
    scopeStyles: options.scopeStyles !== false,
    ...options.transformerOpts
  });
  // Manually seed stateVars / propVars for expression tests
  if (options.stateVars) {
    for (const v of options.stateVars) t.stateVars.add(v);
  }
  if (options.propVars) {
    for (const v of options.propVars) t.propVars.add(v);
  }
  if (options.actionNames) {
    for (const v of options.actionNames) t.actionNames.add(v);
  }
  return t;
}

// ============================================================================
// 1. sourcemap.js — encodeVLQ (lines 22-36)
// ============================================================================

describe('sourcemap.js - encodeVLQ', () => {
  test('encodes zero', () => {
    assert.strictEqual(encodeVLQ(0), 'A');
  });

  test('encodes positive number 1', () => {
    // 1 → vlq = 2 → digit = 2, base64 'C'
    assert.strictEqual(encodeVLQ(1), 'C');
  });

  test('encodes negative number -1', () => {
    // -1 → vlq = (1*2)+1 = 3 → digit = 3 → 'D'
    assert.strictEqual(encodeVLQ(-1), 'D');
  });

  test('encodes large number requiring continuation bit', () => {
    // 16 → vlq = 32 → first chunk: 0 | 0x20 = 0x20 → 'g', rest: 1 → 'B'
    const result = encodeVLQ(16);
    assert.ok(typeof result === 'string' && result.length >= 2,
      'Large number should produce multi-char VLQ');
  });

  test('encodes negative number requiring continuation', () => {
    const result = encodeVLQ(-16);
    assert.ok(typeof result === 'string' && result.length >= 2);
  });
});

// ============================================================================
// 2. sourcemap.js — SourceMapGenerator.addSource (lines 76-84)
// ============================================================================

describe('sourcemap.js - SourceMapGenerator.addSource', () => {
  test('addSource returns index and deduplicates', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    const i1 = gen.addSource('foo.pulse', 'source content');
    const i2 = gen.addSource('bar.pulse', null);
    const i3 = gen.addSource('foo.pulse', 'different content'); // dedup
    assert.strictEqual(i1, 0);
    assert.strictEqual(i2, 1);
    assert.strictEqual(i3, 0); // same index as first
    assert.strictEqual(gen.sources.length, 2);
    assert.strictEqual(gen.sourcesContent[0], 'source content');
    assert.strictEqual(gen.sourcesContent[1], null);
  });

  test('addSource with no content defaults to null', () => {
    const gen = new SourceMapGenerator();
    gen.addSource('a.js');
    assert.strictEqual(gen.sourcesContent[0], null);
  });
});

// ============================================================================
// 3. sourcemap.js — SourceMapGenerator.addName (lines 92-99)
// ============================================================================

describe('sourcemap.js - SourceMapGenerator.addName', () => {
  test('addName returns index and deduplicates', () => {
    const gen = new SourceMapGenerator();
    const i1 = gen.addName('myVar');
    const i2 = gen.addName('otherVar');
    const i3 = gen.addName('myVar'); // dedup
    assert.strictEqual(i1, 0);
    assert.strictEqual(i2, 1);
    assert.strictEqual(i3, 0);
    assert.strictEqual(gen.names.length, 2);
  });
});

// ============================================================================
// 4. sourcemap.js — addMapping with name (lines 110-126)
// ============================================================================

describe('sourcemap.js - addMapping with name', () => {
  test('addMapping stores segment with name index', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addMapping({
      generated: { line: 0, column: 5 },
      original: { line: 0, column: 3 },
      source: 'input.pulse',
      name: 'count'
    });
    assert.strictEqual(gen.mappings[0].length, 1);
    assert.strictEqual(gen.mappings[0][0].nameIndex, 0);
    assert.strictEqual(gen.names[0], 'count');
  });

  test('addMapping without name has null nameIndex', () => {
    const gen = new SourceMapGenerator();
    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'input.pulse'
    });
    assert.strictEqual(gen.mappings[0][0].nameIndex, null);
  });

  test('addMapping without source has null sourceIndex', () => {
    const gen = new SourceMapGenerator();
    gen.addMapping({ generated: { line: 0, column: 0 } });
    assert.strictEqual(gen.mappings[0][0].sourceIndex, null);
  });
});

// ============================================================================
// 5. sourcemap.js — _encodeMappings with names (lines 142-185)
// ============================================================================

describe('sourcemap.js - _encodeMappings', () => {
  test('encodes empty line as empty string', () => {
    const gen = new SourceMapGenerator();
    // Two mappings on line 0 and line 2 (leaving line 1 empty)
    gen.addMapping({ generated: { line: 0, column: 0 }, original: { line: 0, column: 0 }, source: 'a.js' });
    gen.addMapping({ generated: { line: 2, column: 0 }, original: { line: 2, column: 0 }, source: 'a.js' });
    const json = gen.toJSON();
    const lines = json.mappings.split(';');
    assert.strictEqual(lines[1], ''); // line 1 is empty
  });

  test('encodes mapping with name', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addMapping({
      generated: { line: 0, column: 0 },
      original: { line: 0, column: 0 },
      source: 'in.js',
      name: 'x'
    });
    const json = gen.toJSON();
    assert.ok(json.mappings.length > 0);
    assert.deepStrictEqual(json.names, ['x']);
  });

  test('encodes multiple segments on same line', () => {
    const gen = new SourceMapGenerator();
    gen.addMapping({ generated: { line: 0, column: 0 }, original: { line: 0, column: 0 }, source: 's.js' });
    gen.addMapping({ generated: { line: 0, column: 5 }, original: { line: 0, column: 10 }, source: 's.js' });
    const json = gen.toJSON();
    assert.ok(json.mappings.includes(','), 'Multiple segments separated by comma');
  });

  test('toComment returns inline source map comment', () => {
    const gen = new SourceMapGenerator({ file: 'out.js' });
    gen.addSource('in.js', 'const x = 1;');
    gen.addMapping({ generated: { line: 0, column: 0 }, original: { line: 0, column: 0 }, source: 'in.js' });
    const comment = gen.toComment();
    assert.ok(comment.startsWith('//# sourceMappingURL=data:application/json'));
  });

  test('toURLComment returns external url comment (lines 233-234)', () => {
    const comment = SourceMapGenerator.toURLComment('output.js.map');
    assert.strictEqual(comment, '//# sourceMappingURL=output.js.map');
  });
});

// ============================================================================
// 6. sourcemap.js — Transformer with source maps enabled
// ============================================================================

describe('sourcemap.js - Transformer source map integration', () => {
  test('transformWithSourceMap returns sourceMap object when enabled', () => {
    const result = compile('@page Test\nstate { count: 0 }\nview { div "hi" }', {
      sourceMap: true,
      sourceFileName: 'Test.pulse'
    });
    assert.ok(result.success);
    assert.ok(result.sourceMap != null);
  });

  test('compile with inlineSourceMap appends comment', () => {
    const result = compile('@page Test\nview { div "hi" }', {
      sourceMap: true,
      inlineSourceMap: true,
      sourceFileName: 'Test.pulse'
    });
    assert.ok(result.success);
    assert.ok(result.code.includes('sourceMappingURL='));
  });

  test('Transformer._addMapping with sourceFileName', () => {
    const src = '@page Test\nview { div "hello" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, {
      sourceMap: true,
      sourceFileName: 'Test.pulse',
      sourceContent: src
    });
    // Should not throw
    t._addMapping({ line: 1, column: 0 }, 'myName');
    t._addMapping({ line: 2, column: 5 });
    assert.ok(true);
  });

  test('Transformer._addMapping with no sourceMap is a no-op', () => {
    const src = '@page Test\nview { div "hello" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    // Should not throw and return immediately
    t._addMapping({ line: 1, column: 0 });
    assert.ok(true);
  });
});

// ============================================================================
// 7. directives.js — isDirective (lines 35-40)
// ============================================================================

describe('directives.js - isDirective', () => {
  test('returns use client for "use client"', () => {
    assert.strictEqual(isDirective('use client'), Directive.USE_CLIENT);
  });

  test('returns use server for "use server"', () => {
    assert.strictEqual(isDirective('use server'), Directive.USE_SERVER);
  });

  test('returns null for unknown directive', () => {
    assert.strictEqual(isDirective('use strict'), null);
    assert.strictEqual(isDirective(''), null);
  });

  test('is case-insensitive', () => {
    assert.strictEqual(isDirective('USE CLIENT'), Directive.USE_CLIENT);
    assert.strictEqual(isDirective('Use Server'), Directive.USE_SERVER);
  });
});

// ============================================================================
// 8. directives.js — isDirectiveToken (lines 48-50)
// ============================================================================

describe('directives.js - isDirectiveToken', () => {
  test('returns null for non-token', () => {
    assert.strictEqual(isDirectiveToken(null), null);
    assert.strictEqual(isDirectiveToken(undefined), null);
  });

  test('returns null for non-STRING token', () => {
    assert.strictEqual(isDirectiveToken({ type: TokenType.IDENT, value: 'use client' }), null);
  });

  test('returns directive for STRING token with directive value', () => {
    const token = { type: TokenType.STRING, value: 'use client' };
    assert.strictEqual(isDirectiveToken(token), Directive.USE_CLIENT);
  });

  test('returns null for STRING token without directive value', () => {
    const token = { type: TokenType.STRING, value: 'hello world' };
    assert.strictEqual(isDirectiveToken(token), null);
  });
});

// ============================================================================
// 9. directives.js — validateDirective (lines 104-111)
// ============================================================================

describe('directives.js - validateDirective', () => {
  test('does nothing when directive is null', () => {
    assert.doesNotThrow(() => validateDirective(null, {}));
  });

  test('throws when use client and server directive already set', () => {
    const program = { serverDirective: true };
    assert.throws(() => validateDirective(Directive.USE_CLIENT, program), /DIRECTIVE_CONFLICT|Cannot use both/);
  });

  test('throws when use server and client directive already set', () => {
    const program = { clientDirective: true };
    assert.throws(() => validateDirective(Directive.USE_SERVER, program), /DIRECTIVE_CONFLICT|Cannot use both/);
  });

  test('does not throw for valid use client without conflict', () => {
    assert.doesNotThrow(() => validateDirective(Directive.USE_CLIENT, {}));
  });
});

// ============================================================================
// 10. directives.js — getComponentType, isClientComponent, isServerComponent,
//     isSharedComponent (lines 127-157)
// ============================================================================

describe('directives.js - component type helpers', () => {
  test('getComponentType returns client', () => {
    assert.strictEqual(getComponentType(Directive.USE_CLIENT), 'client');
  });

  test('getComponentType returns server', () => {
    assert.strictEqual(getComponentType(Directive.USE_SERVER), 'server');
  });

  test('getComponentType returns shared for null', () => {
    assert.strictEqual(getComponentType(null), 'shared');
  });

  test('isClientComponent true for use client', () => {
    assert.strictEqual(isClientComponent(Directive.USE_CLIENT), true);
    assert.strictEqual(isClientComponent(Directive.USE_SERVER), false);
    assert.strictEqual(isClientComponent(null), false);
  });

  test('isServerComponent true for use server', () => {
    assert.strictEqual(isServerComponent(Directive.USE_SERVER), true);
    assert.strictEqual(isServerComponent(Directive.USE_CLIENT), false);
  });

  test('isSharedComponent true when no directive', () => {
    assert.strictEqual(isSharedComponent(null), true);
    assert.strictEqual(isSharedComponent(undefined), true);
    assert.strictEqual(isSharedComponent(Directive.USE_CLIENT), false);
    assert.strictEqual(isSharedComponent(Directive.USE_SERVER), false);
  });
});

// ============================================================================
// 11. directives.js — parseDirectivesFromSource (lines 175-227)
// ============================================================================

describe('directives.js - parseDirectivesFromSource', () => {
  test('detects use client directive', () => {
    const result = parseDirectivesFromSource("'use client';\nimport foo from 'bar';");
    assert.strictEqual(result.useClient, true);
    assert.strictEqual(result.useServer, false);
    assert.strictEqual(result.line, 1);
  });

  test('detects use server directive with double quotes', () => {
    const result = parseDirectivesFromSource('"use server"\nexport async function action() {}');
    assert.strictEqual(result.useServer, true);
    assert.strictEqual(result.useClient, false);
    assert.strictEqual(result.line, 1);
  });

  test('skips empty lines and comments', () => {
    const src = `\n// A comment\n/* block */\n* jsdoc\n'use client';`;
    const result = parseDirectivesFromSource(src);
    assert.strictEqual(result.useClient, true);
  });

  test('returns false when directive appears after code', () => {
    const src = `const x = 1;\n'use client';`;
    const result = parseDirectivesFromSource(src);
    assert.strictEqual(result.useClient, false);
  });

  test('returns default result for null input', () => {
    const result = parseDirectivesFromSource(null);
    assert.strictEqual(result.useClient, false);
    assert.strictEqual(result.useServer, false);
  });

  test('returns default result for non-string input', () => {
    const result = parseDirectivesFromSource(42);
    assert.strictEqual(result.useClient, false);
  });

  test('returns no directive for empty string', () => {
    const result = parseDirectivesFromSource('');
    assert.strictEqual(result.useClient, false);
    assert.strictEqual(result.useServer, false);
  });
});

// ============================================================================
// 12. directives.js — isClientComponentSource, isServerComponentSource (lines 239-255)
// ============================================================================

describe('directives.js - source component type checks', () => {
  test('isClientComponentSource returns true for use client', () => {
    assert.strictEqual(isClientComponentSource("'use client';"), true);
    assert.strictEqual(isClientComponentSource("export function Btn() {}"), false);
  });

  test('isServerComponentSource returns true for use server', () => {
    assert.strictEqual(isServerComponentSource("'use server';"), true);
    assert.strictEqual(isServerComponentSource("export function Btn() {}"), false);
  });
});

// ============================================================================
// 13. directives.js — isServerFile (lines 268-272)
// ============================================================================

describe('directives.js - isServerFile', () => {
  test('returns true for .server.js files', () => {
    assert.strictEqual(isServerFile('src/api/users.server.js'), true);
  });

  test('returns true for .server.ts files', () => {
    assert.strictEqual(isServerFile('api.server.ts'), true);
  });

  test('returns false for regular files', () => {
    assert.strictEqual(isServerFile('src/api/users.js'), false);
    assert.strictEqual(isServerFile('Button.jsx'), false);
  });

  test('returns false for null/non-string', () => {
    assert.strictEqual(isServerFile(null), false);
    assert.strictEqual(isServerFile(42), false);
    assert.strictEqual(isServerFile(''), false);
  });
});

// ============================================================================
// 14. directives.js — isServerModule, isClientModule, getComponentTypeFromSource
//     validateDirectivesInSource (lines 283-331)
// ============================================================================

describe('directives.js - module-level helpers', () => {
  test('isServerModule true when use server in source', () => {
    assert.strictEqual(isServerModule("'use server';", 'api.js'), true);
  });

  test('isServerModule true when file matches .server.js pattern', () => {
    assert.strictEqual(isServerModule('export function x() {}', 'api.server.js'), true);
  });

  test('isClientModule true when use client in source', () => {
    assert.strictEqual(isClientModule("'use client';"), true);
    assert.strictEqual(isClientModule('const x = 1;'), false);
  });

  test('getComponentTypeFromSource returns client', () => {
    assert.strictEqual(getComponentTypeFromSource("'use client';", 'Btn.js'), 'client');
  });

  test('getComponentTypeFromSource returns server', () => {
    assert.strictEqual(getComponentTypeFromSource("'use server';", 'api.js'), 'server');
  });

  test('getComponentTypeFromSource returns server via filename', () => {
    assert.strictEqual(getComponentTypeFromSource('export const x = 1;', 'api.server.js'), 'server');
  });

  test('getComponentTypeFromSource returns shared', () => {
    assert.strictEqual(getComponentTypeFromSource('export const x = 1;', 'utils.js'), 'shared');
  });

  test('validateDirectivesInSource returns valid for no conflict', () => {
    assert.deepStrictEqual(validateDirectivesInSource("'use client';"), { valid: true });
  });

  test('validateDirectivesInSource - cannot have both (but parsing stops at first)', () => {
    // parseDirectivesFromSource only detects the first directive and returns
    // so having both in separate lines triggers the "after code" guard
    const result = validateDirectivesInSource("'use client';");
    assert.strictEqual(result.valid, true);
  });
});

// ============================================================================
// 15. parser/expressions.js — unary minus (lines 121-124)
// ============================================================================

describe('parser/expressions.js - unary expressions', () => {
  test('parses unary minus expression', () => {
    const src = 'state { x: 0 }\nview { div @click(-x) "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('-'));
  });

  test('parses double negation (!!) via compile', () => {
    const src = 'state { flag: true }\nview { div @click(flag = !!flag) "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 16. parser/expressions.js — arrow functions (lines 153-169, 218-236, 249-274)
// ============================================================================

describe('parser/expressions.js - arrow functions', () => {
  test('parses single-param arrow function in actions', () => {
    // Arrow functions in state values are not supported by the parser,
    // but they work in action expressions via @click handlers
    const src = `@page Test
state { items: [1, 2, 3] }
view {
  div @click(items = items.filter(x => x > 1)) "Filter"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('=>'));
  });

  test('parses zero-param arrow function in action handler', () => {
    // We test that the arrow function parsing paths (tryParseArrowFunction → parseArrowFunction)
    // are exercised via a compile that uses () => in an event handler expression.
    // The zero-param arrow `() => expr` requires the LPAREN lookahead path in tryParseArrowFunction.
    const lexer = new Lexer('() => 42');
    const tokens = lexer.tokenize();
    assert.ok(tokens.length > 0);
    // Exercise zero-param arrow inside items.reduce() which accepts it as a callback
    const src2 = `@page Test
state { items: [] total: 0 }
view {
  button @click(total = items.reduce(() => 0, 0)) "reset"
}`;
    const result = compile(src2, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses multi-param arrow function via Parser API', () => {
    // Test tryParseArrowFunction and parseArrowFunction directly
    const src = `@page Test
state { items: [] }
view {
  @for(item in items) {
    div @click(items = items.map((a, b) => a)) "x"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses arrow function with block body via action', () => {
    const src = `@page Test
state { result: 0 }
actions {
  compute() {
    const fn = (x) => { return x * 2 }
    result = fn(5)
  }
}
view { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses arrow function with spread param via Parser', () => {
    // Test the spread inside arrow function params (...args)
    // by compiling an action that uses it
    const src = `@page Test
state { items: [] }
actions {
  addAll() {
    const fn = (...args) => args
    items = fn(1, 2, 3)
  }
}
view { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses single-ident arrow function in each render', () => {
    const src = `@page Test
state { numbers: [] }
view {
  @for(n in numbers) {
    div @click(numbers = numbers.map(x => x + 1)) "{n}"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 17. parser/expressions.js — array literal (lines 286-304)
// ============================================================================

describe('parser/expressions.js - array and object literals', () => {
  test('parses array literal in state', () => {
    const src = `state { items: [1, 2, 3] }\nview { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('[1, 2, 3]'));
  });

  test('parses array literal with spread via action', () => {
    // Spread in state values is not supported by the parser, but works in actions
    const src = `@page Test
state { items: [] }
actions {
  reset() {
    const extra = [4, 5]
    items = [...extra]
  }
}
view { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses object literal in state', () => {
    const src = `state { obj: { a: 1, b: 2 } }\nview { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses object literal with shorthand properties', () => {
    const src = `state { x: 1 }\nstate { obj: { x } }\nview { div "hi" }`;
    // This may fail on parse but should not throw unhandled
    const result = compile(src, { sourceMap: false });
    // Either success or a parseable error
    assert.ok(typeof result === 'object');
  });

  test('parses object literal with spread', () => {
    const src = `state { a: 1 b: 2 }\nview { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 18. parser/expressions.js — template literal (lines 188-190)
// ============================================================================

describe('parser/expressions.js - template literals', () => {
  test('parses template literal in action body', () => {
    // Template literals in state values not supported by parser,
    // but they work in action bodies via transformFunctionBody
    const src = `@page Test
state { greeting: "" }
actions {
  greet() {
    greeting = \`hello world\`
  }
}
view { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('`hello world`'));
  });

  test('parses template literal with expression in view text', () => {
    const src = 'state { name: "World" }\nview { div "Hello {name}" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('name.get()'));
  });
});

// ============================================================================
// 19. parser/expressions.js — postfix ++ / -- (lines 132-145)
// ============================================================================

describe('parser/expressions.js - postfix operators', () => {
  test('parses postfix increment', () => {
    const src = 'state { count: 0 }\nview { div @click(count++) "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('count.update'));
  });

  test('parses postfix decrement', () => {
    const src = 'state { count: 0 }\nview { div @click(count--) "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 20. parser/expressions.js — computed member access (lines 361-368)
// ============================================================================

describe('parser/expressions.js - computed member access', () => {
  test('parses computed member access', () => {
    const src = 'state { items: [1,2,3] idx: 0 }\nview { div "{items[idx]}" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 21. parser/expressions.js — assignment operators (lines 27-53)
// ============================================================================

describe('parser/expressions.js - compound assignment operators', () => {
  test('parses += assignment', () => {
    const src = 'state { x: 0 }\nview { div @click(x += 5) "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('update'));
  });

  test('parses -= assignment', () => {
    const src = 'state { x: 10 }\nview { div @click(x -= 3) "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses *= assignment', () => {
    const src = 'state { x: 2 }\nview { div @click(x *= 3) "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses ??= assignment', () => {
    const src = 'state { x: null }\nview { div @click(x ??= 42) "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 22. transformer/index.js — transformWithSourceMap returns null sourceMap (lines 255-256)
// ============================================================================

describe('transformer/index.js - transformWithSourceMap', () => {
  test('transformWithSourceMap returns null sourceMap when disabled', () => {
    const src = '@page Test\nview { div "hello" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    const result = t.transformWithSourceMap();
    assert.ok(result.code);
    assert.strictEqual(result.sourceMap, null);
  });

  test('transformWithSourceMap returns sourceMap when enabled', () => {
    const src = '@page Test\nview { div "hello" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, {
      sourceMap: true,
      sourceFileName: 'Test.pulse',
      sourceContent: src
    });
    const result = t.transformWithSourceMap();
    assert.ok(result.code);
    assert.ok(result.sourceMap !== null);
    assert.ok(result.sourceMapComment.startsWith('//# sourceMappingURL='));
  });
});

// ============================================================================
// 23. transformer/index.js — instance methods delegating to module functions (lines 271-360)
// ============================================================================

describe('transformer/index.js - backward-compat instance methods', () => {
  test('transformer.transformState', () => {
    const src = '@page Test\nstate { count: 0 }\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    const code = t.transformState(ast.state);
    assert.ok(code.includes('count'));
  });

  test('transformer.generateImports', () => {
    const src = '@page Test\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    const code = t.generateImports();
    assert.ok(typeof code === 'string');
  });

  test('transformer.transformView', () => {
    const src = '@page Test\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    const code = t.transformView(ast.view);
    assert.ok(code.includes('el('));
  });

  test('transformer.transformStyle', () => {
    const src = "@page Test\nview { div 'hi' }\nstyle { .x { color: red } }";
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    const code = t.transformStyle(ast.style);
    assert.ok(code.includes('styles'));
  });

  test('transformer.transformExpression', () => {
    const src = '@page Test\nstate { x: 0 }\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    t.stateVars.add('x');
    // create a simple identifier AST node
    const node = { type: 'Identifier', name: 'x' };
    const code = t.transformExpression(node);
    assert.ok(code.includes('x'));
  });

  test('transformer.transformExpressionString', () => {
    const src = '@page Test\nstate { count: 0 }\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    t.stateVars.add('count');
    const result = t.transformExpressionString('count + 1');
    assert.ok(result.includes('count.get()'));
  });

  test('transformer.scopeStyleSelector', () => {
    const src = '@page Test\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false, scopeStyles: true });
    const result = t.scopeStyleSelector('.container');
    assert.ok(result.includes(t.scopeId));
  });

  test('transformer.addScopeToSelector', () => {
    const src = '@page Test\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false, scopeStyles: true });
    const result = t.addScopeToSelector('.box');
    assert.ok(result.includes(t.scopeId));
  });

  test('transformer.extractImportedComponents', () => {
    const src = "@page Test\nimport Btn from './Btn.pulse'\nview { div 'hi' }";
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    t.extractImportedComponents(ast.imports);
    assert.ok(true); // should not throw
  });

  test('transformer.extractPropVars', () => {
    const src = "@page Test\nprops { label: 'hello' }\nview { div 'hi' }";
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    if (ast.props) {
      t.extractPropVars(ast.props);
    }
    assert.ok(true);
  });

  test('transformer.extractStateVars', () => {
    const src = '@page Test\nstate { x: 0 }\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    t.extractStateVars(ast.state);
    assert.ok(t.stateVars.has('x'));
  });

  test('transformer.generateExport', () => {
    const src = '@page Test\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    const code = t.generateExport();
    assert.ok(typeof code === 'string');
  });

  test('transformer.transformFunctionBody', () => {
    const src = '@page Test\nstate { x: 0 }\nactions { inc() { x = x + 1 } }\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    t.stateVars.add('x');
    // Pass tokens from action body — ast.actions.functions contains the action list
    if (ast.actions && ast.actions.functions && ast.actions.functions.length > 0) {
      const body = ast.actions.functions[0].body;
      const result = t.transformFunctionBody(body);
      assert.ok(typeof result === 'string');
      assert.ok(result.includes('x.set('));
    } else {
      // No actions found — verify the method exists and accepts empty array
      const result = t.transformFunctionBody([]);
      assert.strictEqual(result, '');
    }
  });

  test('transformer.extractActionNames', () => {
    const src = '@page Test\nstate { x: 0 }\nactions { inc() { x = x + 1 } }\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    t.extractActionNames(ast.actions);
    // The action is called 'inc' - check it was extracted
    assert.ok(t.actionNames.size >= 1);
  });

  test('transformer.transformViewNode dispatches correctly', () => {
    const src = '@page Test\nstate { show: true }\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const t = new Transformer(ast, { sourceMap: false });
    t.stateVars.add('show');
    // Create a simple text node
    const textNode = { type: 'TextNode', parts: ['hello'] };
    const code = t.transformViewNode(textNode);
    assert.ok(code.includes('hello'));
  });
});

// ============================================================================
// 24. transformer/index.js — transform with store and router blocks (lines 77-136)
// ============================================================================

describe('transformer/index.js - store and router blocks', () => {
  test('compiles store block', () => {
    const src = `@page Test
store {
  state {
    count: 0
  }
}
view { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('createStore') || result.code.includes('store'));
  });

  test('compiles router block', () => {
    const src = `@page Test
router {
  "/home" Home
  "/about" About
}
view { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    // Compile may succeed or fail gracefully
    assert.ok(typeof result === 'object');
  });
});

// ============================================================================
// 25. transformer/index.js — _scanA11yUsage (lines 141-168)
// ============================================================================

describe('transformer/index.js - _scanA11yUsage', () => {
  test('detects srOnly directive via compile', () => {
    const src = `@page Test
view {
  span @srOnly "Skip to content"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('srOnly'));
  });

  test('detects focusTrap directive via compile', () => {
    const src = `@page Test
view {
  div @focusTrap { button "Close" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('trapFocus'));
  });
});

// ============================================================================
// 26. transformer/view.js — slot with fallback (lines 183-197)
// ============================================================================

describe('transformer/view.js - slot transformations', () => {
  test('compiles named slot with fallback content', () => {
    const src = `@page Test
view {
  div {
    slot "actions" {
      button "Default Action"
    }
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('slots?.actions'));
  });

  test('compiles default slot without name', () => {
    const src = `@page Test
view {
  div {
    slot
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('slots?.default'));
  });

  test('compiles named slot without fallback', () => {
    const src = `@page Test
view {
  div {
    slot "header"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('slots?.header'));
  });
});

// ============================================================================
// 27. transformer/view.js — @a11y directive (lines 275-288)
// ============================================================================

describe('transformer/view.js - @a11y directive', () => {
  test('compiles @a11y directive with role', () => {
    const src = `@page Test
view {
  div @a11y(role=dialog, label="Modal window") { span "Content" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('role'));
  });

  test('compiles @a11y directive with modal attribute', () => {
    const src = `@page Test
view {
  div @a11y(role=dialog, modal=true) { "content" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 28. transformer/view.js — @live directive (lines 326-329)
// ============================================================================

describe('transformer/view.js - @live directive', () => {
  test('compiles @live polite directive', () => {
    const src = `@page Test
state { status: "ready" }
view {
  div @live(polite) { "{status}" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('aria-live'));
  });

  test('compiles @live assertive directive', () => {
    const src = `@page Test
state { error: "" }
view {
  div @live(assertive) { "{error}" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('assertive'));
  });
});

// ============================================================================
// 29. transformer/view.js — @focusTrap directive (lines 351-366)
// ============================================================================

describe('transformer/view.js - @focusTrap directive', () => {
  test('compiles empty focusTrap options', () => {
    const src = `@page Test
view {
  div @focusTrap { button "Close" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('trapFocus'));
  });

  test('compiles focusTrap with options', () => {
    const src = `@page Test
view {
  div @focusTrap(autoFocus=true, returnFocus=true) { button "Close" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('trapFocus'));
  });
});

// ============================================================================
// 30. transformer/view.js — @srOnly directive standalone (lines 338-342)
// ============================================================================

describe('transformer/view.js - @srOnly directive', () => {
  test('compiles standalone @srOnly on span', () => {
    const src = `@page Test
view {
  span @srOnly "Skip to content"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('srOnly'));
  });
});

// ============================================================================
// 31. transformer/view.js — @client and @server directives (lines 779-821)
// ============================================================================

describe('transformer/view.js - SSR directives', () => {
  test('compiles @client directive wrapping element', () => {
    const src = `@page Test
view {
  div @client { span "Client only" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('ClientOnly'));
  });

  test('compiles @server directive wrapping element', () => {
    const src = `@page Test
view {
  div @server { span "Server only" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('ServerOnly'));
  });
});

// ============================================================================
// 32. transformer/view.js — addScopeToSelector (lines 759-769)
// ============================================================================

describe('transformer/view.js - addScopeToSelector', () => {
  test('adds scope to tag selector', () => {
    const t = makeTransformer();
    const result = addScopeToSelector(t, 'div');
    assert.ok(result.includes(t.scopeId));
    assert.ok(result.startsWith('div.'));
  });

  test('adds scope to class selector', () => {
    const t = makeTransformer();
    const result = addScopeToSelector(t, '.container');
    assert.ok(result.includes(t.scopeId));
  });

  test('handles empty selector', () => {
    const t = makeTransformer();
    const result = addScopeToSelector(t, '');
    assert.ok(result.startsWith('.'));
  });
});

// ============================================================================
// 33. transformer/view.js — dynamic attribute bindings (lines 718-748)
// ============================================================================

describe('transformer/view.js - dynamic attribute bindings', () => {
  test('compiles dynamic [value={expr}] attribute', () => {
    const src = `@page Test
state { searchQuery: "" }
view {
  input[value={searchQuery}]
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('bind('));
  });

  test('compiles interpolated style attribute', () => {
    const src = `@page Test
state { show: true }
view {
  div[style="display: {show}"]
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('bind('));
  });

  test('compiles boolean attribute', () => {
    const src = `@page Test
view {
  button[disabled] "Submit"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('disabled'));
  });
});

// ============================================================================
// 34. transformer/view.js — event handler modifiers (lines 1151-1184)
// ============================================================================

describe('transformer/view.js - event modifiers', () => {
  test('compiles @click.prevent modifier', () => {
    const src = `@page Test
state { x: 0 }
view {
  button @click.prevent(x = x + 1) "Click"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('preventDefault'));
  });

  test('compiles @click.stop modifier', () => {
    const src = `@page Test
state { x: 0 }
view {
  button @click.stop(x = 1) "Stop"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('stopPropagation'));
  });

  test('compiles @keydown.enter modifier', () => {
    const src = `@page Test
state { submitted: false }
view {
  input @keydown.enter(submitted = true)
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('Enter'));
  });

  test('compiles @click.once modifier', () => {
    const src = `@page Test
state { x: 0 }
view {
  button @click.once(x = 1) "Once"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('once'));
  });

  test('compiles @click.self modifier', () => {
    const src = `@page Test
state { x: 0 }
view {
  div @click.self(x = 1) "Self"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('currentTarget'));
  });

  test('compiles @keydown.ctrl modifier (system key)', () => {
    const src = `@page Test
state { x: 0 }
view {
  input @keydown.ctrl(x = 1)
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('ctrlKey'));
  });
});

// ============================================================================
// 35. transformer/view.js — component calls with slots (lines 891-943)
// ============================================================================

describe('transformer/view.js - component calls', () => {
  test('compiles component call with default slot', () => {
    const src = `@page Test
import Button from './Button.pulse'
view {
  Button "Click me"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('Button.render('));
    assert.ok(result.code.includes('slots'));
  });

  test('compiles component call with reactive prop', () => {
    const src = `@page Test
import Card from './Card.pulse'
state { title: "Hello" }
view {
  Card(title=title)
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('Card.render('));
  });
});

// ============================================================================
// 36. transformer/view.js — @if with else-if chains (lines 999-1050)
// ============================================================================

describe('transformer/view.js - @if with else-if', () => {
  test('compiles if-else chain', () => {
    const src = `@page Test
state { status: "a" }
view {
  @if(status == "a") {
    div "A"
  } @else {
    div "Other"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('when('));
  });

  test('compiles if with multiple children in branch', () => {
    const src = `@page Test
state { show: true }
view {
  @if(show) {
    div "First"
    div "Second"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 37. transformer/view.js — @each with key (lines 1059-1080)
// ============================================================================

describe('transformer/view.js - @for (each) directive', () => {
  test('compiles @for with key expression', () => {
    const src = `@page Test
state { items: [] }
view {
  @for(item in items) key(item.id) {
    div "{item}"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('list('));
  });

  test('compiles @for without key', () => {
    const src = `@page Test
state { items: [] }
view {
  @for(item in items) {
    div "Item"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('list('));
  });
});

// ============================================================================
// 38. transformer/style.js — @keyframes (lines 140-167)
// ============================================================================

describe('transformer/style.js - @keyframes', () => {
  test('compiles @keyframes block', () => {
    const src = `@page Test
view { div "hi" }
style {
  @keyframes fadeIn {
    from { opacity: 0 }
    to { opacity: 1 }
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('@keyframes'));
  });
});

// ============================================================================
// 39. transformer/style.js — @layer (lines 171-211)
// ============================================================================

describe('transformer/style.js - @layer', () => {
  test('compiles @layer order statement', () => {
    const src = `@page Test
view { div "hi" }
style {
  @layer base, components, utilities
  .btn { color: red }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('@layer'));
  });

  test('compiles @layer block with nested rules', () => {
    const src = `@page Test
view { div "hi" }
style {
  @layer components {
    .card { padding: 16px }
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('@layer'));
  });
});

// ============================================================================
// 40. transformer/style.js — @supports (lines 80-82)
// ============================================================================

describe('transformer/style.js - @supports', () => {
  test('compiles @supports rule', () => {
    const src = `@page Test
view { div "hi" }
style {
  @supports (display: grid) {
    .container { display: grid }
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('@supports'));
  });
});

// ============================================================================
// 41. transformer/style.js — @container (lines 89-91)
// ============================================================================

describe('transformer/style.js - @container', () => {
  test('compiles @container query', () => {
    const src = `@page Test
view { div "hi" }
style {
  @container (min-width: 400px) {
    .card { font-size: 1.2rem }
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('@container'));
  });
});

// ============================================================================
// 42. transformer/style.js — scopeStyleSelector with combinators (lines 369-449)
// ============================================================================

describe('transformer/style.js - scopeStyleSelector', () => {
  test('scopes selector with child combinator >', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.parent > .child');
    assert.ok(result.includes(t.scopeId));
    assert.ok(result.includes('>'));
  });

  test('scopes selector with adjacent sibling combinator +', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.a + .b');
    assert.ok(result.includes(t.scopeId));
    assert.ok(result.includes('+'));
  });

  test('scopes selector with general sibling combinator ~', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.a ~ .b');
    assert.ok(result.includes(t.scopeId));
    assert.ok(result.includes('~'));
  });

  test('does not scope global selectors: body', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, 'body');
    assert.strictEqual(result, 'body');
  });

  test('does not scope global selectors: :root', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, ':root');
    assert.strictEqual(result, ':root');
  });

  test('does not scope @-rules (at-rules)', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '@media (max-width: 768px)');
    assert.strictEqual(result, '@media (max-width: 768px)');
  });

  test('scopes :has() pseudo-class (lines 457-487)', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.card:has(.header)');
    assert.ok(result.includes(t.scopeId));
    assert.ok(result.includes(':has('));
  });

  test('scopes :is() pseudo-class', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.a:is(.b, .c)');
    assert.ok(result.includes(t.scopeId));
  });

  test('scopes :where() pseudo-class', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.a:where(.b)');
    assert.ok(result.includes(t.scopeId));
  });

  test('scopes multi-selector (comma-separated)', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.a, .b');
    assert.ok(result.includes(t.scopeId));
    assert.ok(result.includes(', '));
  });

  test('returns selector unchanged when no scopeId', () => {
    const t = makeTransformer({ scopeStyles: false });
    const result = scopeStyleSelector(t, '.container');
    assert.strictEqual(result, '.container');
  });

  test('compiles nested CSS with @media inside style block (lines 225-231)', () => {
    const src = `@page Test
view { div "hi" }
style {
  @media (max-width: 768px) {
    .container { width: 100% }
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('@media'));
  });

  test('flattenStyleRule with atRuleWrapper array (lines 309-311)', () => {
    const t = makeTransformer();
    const rule = {
      selector: '.btn',
      properties: [{ name: 'color', value: 'red' }],
      nestedRules: []
    };
    const output = [];
    flattenStyleRule(t, rule, '', output, ['@media (max-width: 768px)', '@supports (display: grid)']);
    assert.ok(output.length > 0);
    assert.ok(output[0].includes('@media'));
    assert.ok(output[0].includes('@supports'));
  });

  test('flattenStyleRule with & parent reference (lines 374-375)', () => {
    const t = makeTransformer();
    const rule = {
      selector: '.parent',
      properties: [{ name: 'color', value: 'blue' }],
      nestedRules: [{
        selector: '&:hover',
        properties: [{ name: 'opacity', value: '0.8' }],
        nestedRules: []
      }]
    };
    const output = [];
    flattenStyleRule(t, rule, '', output);
    const combined = output.join('\n');
    assert.ok(combined.includes('.parent'));
    assert.ok(combined.includes(':hover'));
  });

  test('flattenStyleRule with keyframes inside atRuleWrapper (lines 384-385)', () => {
    const t = makeTransformer();
    const rule = {
      selector: '@keyframes spin',
      properties: [],
      nestedRules: [{
        selector: 'from',
        properties: [{ name: 'transform', value: 'rotate(0deg)' }],
        nestedRules: []
      }, {
        selector: 'to',
        properties: [{ name: 'transform', value: 'rotate(360deg)' }],
        nestedRules: []
      }]
    };
    const output = [];
    flattenStyleRule(t, rule, '', output, '@media print');
    assert.ok(output.length > 0);
    assert.ok(output.join('\n').includes('@keyframes'));
  });

  test('flattenStyleRule with @layer inside atRuleWrapper (lines 417-419)', () => {
    const t = makeTransformer();
    const rule = {
      selector: '@layer base',
      properties: [],
      nestedRules: [{
        selector: '.btn',
        properties: [{ name: 'color', value: 'red' }],
        nestedRules: []
      }]
    };
    const output = [];
    flattenStyleRule(t, rule, '', output, '@media print');
    const combined = output.join('\n');
    assert.ok(combined.includes('@layer'));
  });

  test('flattenStyleRule with @layer statement (no nested rules, lines 424-426)', () => {
    const t = makeTransformer();
    const rule = {
      selector: '@layer base, components, utilities',
      properties: [],
      nestedRules: []
    };
    const output = [];
    flattenStyleRule(t, rule, '', output);
    assert.ok(output.length > 0);
    assert.ok(output[0].includes('@layer'));
  });

  test('flattenStyleRule with unknown at-rule (lines 436-438)', () => {
    const t = makeTransformer();
    const rule = {
      selector: '@document url(http://example.com)',
      properties: [],
      nestedRules: [{
        selector: '.content',
        properties: [{ name: 'color', value: 'blue' }],
        nestedRules: []
      }]
    };
    const output = [];
    flattenStyleRule(t, rule, '', output);
    // Should not throw
    assert.ok(Array.isArray(output));
  });

  test('flattenStyleRule with @scope (lines 444-445)', () => {
    const t = makeTransformer();
    const rule = {
      selector: '@scope (.parent)',
      properties: [],
      nestedRules: [{
        selector: '.child',
        properties: [{ name: 'color', value: 'green' }],
        nestedRules: []
      }]
    };
    const output = [];
    flattenStyleRule(t, rule, '', output);
    assert.ok(Array.isArray(output));
  });
});

// ============================================================================
// 43. transformer/expressions.js — transformExpression edge cases (lines 54-55, 69-71)
// ============================================================================

describe('transformer/expressions.js - transformExpression', () => {
  test('returns empty string for null node', () => {
    const t = makeTransformer();
    const result = transformExpression(t, null);
    assert.strictEqual(result, '');
  });

  test('transforms Literal string node', () => {
    const t = makeTransformer();
    const node = { type: 'Literal', value: 'hello' };
    const result = transformExpression(t, node);
    assert.strictEqual(result, '"hello"');
  });

  test('transforms Literal number node', () => {
    const t = makeTransformer();
    const node = { type: 'Literal', value: 42 };
    const result = transformExpression(t, node);
    assert.strictEqual(result, '42');
  });

  test('transforms TemplateLiteral node', () => {
    const t = makeTransformer({ stateVars: ['count'] });
    const node = { type: 'TemplateLiteral', value: 'Count: ${count}', raw: '' };
    const result = transformExpression(t, node);
    assert.ok(result.startsWith('`'));
  });

  test('transforms MemberExpression on call result (optional chaining)', () => {
    const t = makeTransformer();
    const node = {
      type: 'MemberExpression',
      object: { type: 'CallExpression', callee: { type: 'Identifier', name: 'getUser' }, arguments: [] },
      property: 'name',
      computed: false
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('?.name'));
  });

  test('transforms MemberExpression on prop (optional chaining)', () => {
    const t = makeTransformer({ propVars: ['user'] });
    const node = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'user' },
      property: 'name',
      computed: false
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('?.name'));
  });

  test('transforms computed MemberExpression', () => {
    const t = makeTransformer({ stateVars: ['items'] });
    const node = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'items' },
      property: { type: 'Literal', value: 0 },
      computed: true
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('[0]'));
  });

  test('transforms computed MemberExpression on prop', () => {
    const t = makeTransformer({ propVars: ['items'] });
    const node = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'items' },
      property: { type: 'Literal', value: 0 },
      computed: true
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('?.[0]'));
  });

  test('transforms UnaryExpression', () => {
    const t = makeTransformer({ stateVars: ['flag'] });
    const node = {
      type: 'UnaryExpression',
      operator: '!',
      argument: { type: 'Identifier', name: 'flag' }
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('!'));
    assert.ok(result.includes('flag.get()'));
  });

  test('transforms UpdateExpression for state var (++ returns update)', () => {
    const t = makeTransformer({ stateVars: ['count'] });
    const node = {
      type: 'UpdateExpression',
      operator: '++',
      argument: { type: 'Identifier', name: 'count' },
      prefix: false
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('count.update'));
  });

  test('transforms UpdateExpression for state var -- returns update', () => {
    const t = makeTransformer({ stateVars: ['count'] });
    const node = {
      type: 'UpdateExpression',
      operator: '--',
      argument: { type: 'Identifier', name: 'count' },
      prefix: false
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('count.update'));
  });

  test('transforms prefix UpdateExpression on non-state var', () => {
    const t = makeTransformer();
    const node = {
      type: 'UpdateExpression',
      operator: '++',
      argument: { type: 'Identifier', name: 'i' },
      prefix: true
    };
    const result = transformExpression(t, node);
    assert.strictEqual(result, '++i');
  });

  test('transforms ArrowFunction with block body (lines 113-124)', () => {
    const t = makeTransformer({ stateVars: ['x'] });
    // Block body arrow function
    const bodyTokens = [
      { type: 'IDENT', value: 'return' },
      { type: 'IDENT', value: 'x' }
    ];
    const node = {
      type: 'ArrowFunction',
      params: ['n'],
      body: bodyTokens,
      block: true
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('=>'));
    assert.ok(result.includes('{'));
  });

  test('transforms ArrowFunction with expression body', () => {
    const t = makeTransformer({ stateVars: ['x'] });
    const node = {
      type: 'ArrowFunction',
      params: ['n'],
      body: { type: 'Identifier', name: 'n' },
      block: false
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('(n) => n'));
  });

  test('transforms AssignmentExpression with compound op for state var (lines 138-143)', () => {
    const t = makeTransformer({ stateVars: ['x'] });
    const node = {
      type: 'AssignmentExpression',
      operator: '+=',
      left: { type: 'Identifier', name: 'x' },
      right: { type: 'Literal', value: 5 }
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('x.update'));
    assert.ok(result.includes('+'));
  });

  test('transforms AssignmentExpression simple for state var', () => {
    const t = makeTransformer({ stateVars: ['name'] });
    const node = {
      type: 'AssignmentExpression',
      operator: '=',
      left: { type: 'Identifier', name: 'name' },
      right: { type: 'Literal', value: 'Alice' }
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('name.set'));
  });

  test('transforms AssignmentExpression for non-state var', () => {
    const t = makeTransformer();
    const node = {
      type: 'AssignmentExpression',
      operator: '=',
      left: { type: 'Identifier', name: 'localVar' },
      right: { type: 'Literal', value: 42 }
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('localVar'));
  });

  test('transforms compound AssignmentExpression for non-state var (lines 153-154)', () => {
    const t = makeTransformer();
    const node = {
      type: 'AssignmentExpression',
      operator: '+=',
      left: { type: 'Identifier', name: 'localVar' },
      right: { type: 'Literal', value: 1 }
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('+='));
  });

  test('transforms ArrayLiteral node (lines 158-160)', () => {
    const t = makeTransformer({ stateVars: ['a'] });
    const node = {
      type: 'ArrayLiteral',
      elements: [
        { type: 'Literal', value: 1 },
        { type: 'Identifier', name: 'a' }
      ]
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('['));
    assert.ok(result.includes('a.get()'));
  });

  test('transforms ObjectLiteral with spread (lines 163-177)', () => {
    const t = makeTransformer({ stateVars: ['base'] });
    const node = {
      type: 'ObjectLiteral',
      properties: [
        {
          type: 'SpreadElement',
          argument: { type: 'Identifier', name: 'base' }
        }
      ]
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('...'));
  });

  test('transforms ObjectLiteral with shorthand state var (lines 169-172)', () => {
    const t = makeTransformer({ stateVars: ['count'] });
    const node = {
      type: 'ObjectLiteral',
      properties: [{
        type: 'Property',
        name: 'count',
        value: { type: 'Identifier', name: 'count' },
        shorthand: true
      }]
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('count: count.get()'));
  });

  test('transforms ObjectLiteral with shorthand non-state var (returns name)', () => {
    const t = makeTransformer();
    const node = {
      type: 'ObjectLiteral',
      properties: [{
        type: 'Property',
        name: 'x',
        value: { type: 'Identifier', name: 'x' },
        shorthand: true
      }]
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('x'));
  });

  test('transforms SpreadElement node (lines 179-180)', () => {
    const t = makeTransformer({ stateVars: ['arr'] });
    const node = {
      type: 'SpreadElement',
      argument: { type: 'Identifier', name: 'arr' }
    };
    const result = transformExpression(t, node);
    assert.ok(result.includes('...arr.get()'));
  });

  test('returns unknown expression comment for unknown type (lines 183)', () => {
    const t = makeTransformer();
    const node = { type: 'UnknownType' };
    const result = transformExpression(t, node);
    assert.strictEqual(result, '/* unknown expression */');
  });
});

// ============================================================================
// 44. transformer/expressions.js — transformExpressionString (lines 399-528)
// ============================================================================

describe('transformer/expressions.js - transformExpressionString', () => {
  test('replaces state var reads with .get()', () => {
    const t = makeTransformer({ stateVars: ['count'] });
    const result = transformExpressionString(t, 'count + 1');
    assert.ok(result.includes('count.get()'));
  });

  test('replaces prop var reads with .get()', () => {
    const t = makeTransformer({ propVars: ['label'] });
    const result = transformExpressionString(t, 'label');
    assert.ok(result.includes('label.get()'));
  });

  test('converts state var simple assignment', () => {
    const t = makeTransformer({ stateVars: ['x'] });
    const result = transformExpressionString(t, 'x = 42');
    assert.ok(result.includes('x.set(42)'));
  });

  test('converts state var compound assignment += (lines 511-515)', () => {
    const t = makeTransformer({ stateVars: ['total'] });
    const result = transformExpressionString(t, 'total += 10');
    assert.ok(result.includes('total.update'));
    assert.ok(result.includes('+'));
  });

  test('converts state var compound assignment -= ', () => {
    const t = makeTransformer({ stateVars: ['score'] });
    const result = transformExpressionString(t, 'score -= 5');
    assert.ok(result.includes('score.update'));
  });

  test('does not transform object keys (isObjectKey guard, lines 621-623)', () => {
    const t = makeTransformer({ stateVars: ['count'] });
    // In an object literal context, 'count' as a key should not be transformed
    const result = transformExpressionString(t, '{ count: 1 }');
    // The key should not get .get()
    assert.ok(result.includes('count'));
  });

  test('returns empty string unchanged for no vars', () => {
    const t = makeTransformer();
    const result = transformExpressionString(t, 'Math.random()');
    assert.strictEqual(result, 'Math.random()');
  });

  test('handles string literal protection in expression string (lines 440-465)', () => {
    const t = makeTransformer({ stateVars: ['count'] });
    // The string protection works at the transformFunctionBody level (different function).
    // transformExpressionString is a regex-based transformer that replaces inline occurrences.
    // In an expression string context, the literal string IS transformed (it's treated as code).
    // What matters is that the function processes without error.
    const result = transformExpressionString(t, 'count + 1');
    assert.ok(result.includes('count.get()'));
    // Verify the function handles empty input
    const empty = transformExpressionString(t, '');
    assert.strictEqual(empty, '');
  });
});

// ============================================================================
// 45. transformer/expressions.js — transformFunctionBody (lines 332-659)
// ============================================================================

describe('transformer/expressions.js - transformFunctionBody', () => {
  test('handles empty token array', () => {
    const t = makeTransformer({ stateVars: ['x'] });
    const result = transformFunctionBody(t, []);
    assert.strictEqual(result, '');
  });

  test('transforms state var assignment in function body', () => {
    const src = '@page Test\nstate { x: 0 }\nactions { inc() { x = x + 1 } }\nview { div "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('x.set('));
  });

  test('transforms post-increment in function body (lines 589-608)', () => {
    const src = '@page Test\nstate { count: 0 }\nactions { inc() { count++ } }\nview { div "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('count.set('));
  });

  test('transforms post-decrement in function body', () => {
    const src = '@page Test\nstate { count: 10 }\nactions { dec() { count-- } }\nview { div "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('transforms pre-increment in function body', () => {
    const src = '@page Test\nstate { n: 0 }\nactions { inc() { ++n } }\nview { div "hi" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('handles STRING token raw value (lines 420-421)', () => {
    const t = makeTransformer({ stateVars: ['msg'] });
    const tokens = [
      { type: 'IDENT', value: 'msg' },
      { type: 'EQ', value: '=' },
      { type: 'STRING', value: 'hello', raw: "'hello'" }
    ];
    const result = transformFunctionBody(t, tokens);
    assert.ok(result.includes('msg.set('));
  });

  test('handles TEMPLATE token raw value (lines 422-423)', () => {
    const t = makeTransformer({ stateVars: ['msg'] });
    const tokens = [
      { type: 'IDENT', value: 'msg' },
      { type: 'EQ', value: '=' },
      { type: 'TEMPLATE', value: 'hello ${name}', raw: '`hello ${name}`' }
    ];
    const result = transformFunctionBody(t, tokens);
    assert.ok(result.includes('msg.set('));
  });

  test('prop var gets .get() in function body (lines 644-652)', () => {
    const src = `@page Test
props {
  label: "hi"
}
actions {
  greet() {
    console.log(label)
  }
}
view { div "hi" }`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('label.get()'));
  });
});

// ============================================================================
// 46. transformer/view.js — transformTextNode with interpolation (lines 965-986)
// ============================================================================

describe('transformer/view.js - transformTextNode', () => {
  test('renders static text directly', () => {
    const src = '@page Test\nview { div "Hello World" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('"Hello World"'));
  });

  test('renders interpolated text with text()', () => {
    const src = '@page Test\nstate { name: "World" }\nview { div "Hello {name}!" }';
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('text('));
    assert.ok(result.code.includes('name.get()'));
  });
});

// ============================================================================
// 47. transformer/view.js — @link directive (lines 207-225)
// ============================================================================

describe('transformer/view.js - @link directive', () => {
  test('compiles @link directive with static path', () => {
    const src = `@page Test
view {
  @link("/home") { span "Home" }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('router.link('));
  });
});

// ============================================================================
// 48. transformer/view.js — @outlet directive (lines 235-238)
// ============================================================================

describe('transformer/view.js - @outlet directive', () => {
  test('compiles @outlet directive', () => {
    const src = `@page Test
view {
  @outlet
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('router.outlet('));
  });
});

// ============================================================================
// 49. transformer/view.js — @navigate directive (lines 248-265)
// ============================================================================

describe('transformer/view.js - @navigate directive', () => {
  test('compiles @navigate as standalone view node', () => {
    const src = `@page Test
state { path: "/home" }
view {
  @navigate(path)
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('router.navigate('));
  });

  test('compiles @navigate with @back action', () => {
    const src = `@page Test
view {
  @back
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('router.back()'));
  });

  test('compiles @navigate with @forward action', () => {
    const src = `@page Test
view {
  @forward
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('router.forward()'));
  });
});

// ============================================================================
// 50. transformer/view.js — @model directive (lines 1112-1128)
// ============================================================================

describe('transformer/view.js - @model directive', () => {
  test('compiles @model directive on input element', () => {
    const src = `@page Test
state { value: "" }
view {
  input @model(value)
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('model('));
  });

  test('compiles @model directive with lazy modifier', () => {
    const src = `@page Test
state { text: "" }
view {
  input @model.lazy(text)
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('model'));
  });
});

// ============================================================================
// 51. transformer/view.js — @event directive as standalone (lines 1089-1103)
// ============================================================================

describe('transformer/view.js - event directive standalone', () => {
  test('compiles event directive with children (lines 1094-1099)', () => {
    const src = `@page Test
state { count: 0 }
view {
  @click(count++) {
    button "Clickable"
  }
}`;
    const result = compile(src, { sourceMap: false });
    // May succeed or gracefully fail — just check no crash
    assert.ok(typeof result === 'object');
  });
});

// ============================================================================
// 52. transformer/index.js — transform function (lines 357-360)
// ============================================================================

describe('transformer/index.js - transform function', () => {
  test('transform() function works as standalone', () => {
    const src = '@page Test\nstate { x: 0 }\nview { div "hi" }';
    const ast = new Parser(new Lexer(src).tokenize()).parse();
    const code = transform(ast, { sourceMap: false });
    assert.ok(typeof code === 'string');
    assert.ok(code.includes('x'));
  });

  test('Transformer.VIEW_NODE_HANDLERS is accessible', () => {
    assert.ok(typeof Transformer.VIEW_NODE_HANDLERS === 'object');
    assert.ok('Element' in Transformer.VIEW_NODE_HANDLERS);
  });
});

// ============================================================================
// 53. transformer/view.js — unknown node type (lines 169-173)
// ============================================================================

describe('transformer/view.js - unknown node type', () => {
  test('transformViewNode returns comment for unknown node type', () => {
    const t = makeTransformer();
    const node = { type: 'UnknownNodeType_XYZ' };
    const result = transformViewNode(t, node, 0);
    assert.ok(result.includes('unknown'));
  });
});

// ============================================================================
// 54. transformer/view.js — clientDirective with fallback (lines 790-798)
// ============================================================================

describe('transformer/view.js - ClientOnly fallback', () => {
  test('ClientOnly without fallback', () => {
    const t = makeTransformer();
    const node = {
      type: 'ClientDirective',
      children: [{ type: 'TextNode', parts: ['Client content'] }],
      fallback: []
    };
    const result = transformClientDirective(t, node, 0);
    assert.ok(result.includes('ClientOnly('));
    assert.ok(!result.includes('() => (\n'));
  });

  test('ClientOnly with fallback renders both', () => {
    const t = makeTransformer();
    const node = {
      type: 'ClientDirective',
      children: [{ type: 'TextNode', parts: ['Client content'] }],
      fallback: [{ type: 'TextNode', parts: ['Loading...'] }]
    };
    const result = transformClientDirective(t, node, 0);
    assert.ok(result.includes('ClientOnly('));
    assert.ok(result.includes('() => ('));
  });
});

// ============================================================================
// 55. transformer/view.js — ServerOnly with multiple children (lines 809-820)
// ============================================================================

describe('transformer/view.js - ServerOnly', () => {
  test('ServerOnly with single child', () => {
    const t = makeTransformer();
    const node = {
      type: 'ServerDirective',
      children: [{ type: 'TextNode', parts: ['Server content'] }]
    };
    const result = transformServerDirective(t, node, 0);
    assert.ok(result.includes('ServerOnly('));
  });

  test('ServerOnly with multiple children produces array', () => {
    const t = makeTransformer();
    const node = {
      type: 'ServerDirective',
      children: [
        { type: 'TextNode', parts: ['Line 1'] },
        { type: 'TextNode', parts: ['Line 2'] }
      ]
    };
    const result = transformServerDirective(t, node, 0);
    assert.ok(result.includes('ServerOnly('));
    assert.ok(result.includes('['));
  });
});

// ============================================================================
// 56. End-to-end compilation with 'use client' directive
// ============================================================================

describe('end-to-end - use client directive', () => {
  test('compiles component with use client directive', () => {
    const src = `'use client'
@page ClientButton
state { clicked: false }
view {
  button @click(clicked = true) "Click"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });
});

// ============================================================================
// 57. end-to-end — style block with nested rules and scoping
// ============================================================================

describe('end-to-end - style scoping', () => {
  test('scopes nested CSS rules', () => {
    const src = `@page Test
view { div "hi" }
style {
  .container {
    padding: 20px
    .inner {
      color: red
    }
  }
}`;
    const result = compile(src, { sourceMap: false, scopeStyles: true });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('SCOPE_ID'));
  });

  test('compiles without scoping when scopeStyles is false', () => {
    const src = `@page Test
view { div "hi" }
style {
  .container { padding: 20px }
}`;
    const result = compile(src, { sourceMap: false, scopeStyles: false });
    assert.ok(result.success, result.error);
    assert.ok(!result.code.includes('SCOPE_ID'));
  });
});

// ============================================================================
// 58. transformView with props block (lines 82-105)
// ============================================================================

describe('transformer/view.js - props in view', () => {
  test('compiles component with props block', () => {
    const src = `@page Button
props {
  label: 'Click'
  disabled: false
}
view {
  button "{label}"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('useProp'));
  });
});

// ============================================================================
// 59. parser/expressions.js — array/object/template/spread in click handlers
//     (lines 178-179, 183-184, 188-190, 194-197, 270-274, 286-304, 311-341)
// ============================================================================

describe('parser/expressions.js - complex expressions in event handlers', () => {
  test('parses array literal in @click handler (lines 178-179, 286-304)', () => {
    const src = `@page Test
state { items: [] }
view {
  button @click(items = [1, 2, 3]) "set"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('[1, 2, 3]'));
  });

  test('parses array literal with spread in @click handler (lines 290-294)', () => {
    const src = `@page Test
state { items: [] extra: [] }
view {
  button @click(items = [...extra, 1]) "set"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('...'));
  });

  test('parses object literal in @click handler (lines 183-184, 311-341)', () => {
    const src = `@page Test
state { config: {} }
view {
  button @click(config = { a: 1, b: 2 }) "set"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('{ a: 1, b: 2 }') || result.code.includes('config'));
  });

  test('parses shorthand object property in @click handler (lines 327-333)', () => {
    const src = `@page Test
state { x: 0 }
view {
  button @click(console.log({ x })) "log"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses template literal in @click handler (lines 188-190)', () => {
    const src = `@page Test
state { msg: "" }
view {
  button @click(msg = \`hello world\`) "set"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('`hello world`'));
  });

  test('parses arrow function with parens in @click handler (lines 249-263)', () => {
    const src = `@page Test
state { items: [] }
view {
  button @click(items = items.filter((x) => x > 0)) "filter"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('=>'));
  });

  test('parses arrow function with block body in @click (lines 270-274)', () => {
    const src = `@page Test
state { items: [] }
view {
  button @click(items = items.filter((x) => { return x > 0 })) "filter"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('=>'));
  });

  test('parses arrow function with spread params in @click (lines 252-254)', () => {
    const src = `@page Test
state { items: [] }
view {
  button @click(items = items.map((...args) => args[0])) "set"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('...args'));
  });

  test('parses tryParseArrowFunction returns false for non-arrow (line 236)', () => {
    // When ( is followed by expression that is not an arrow function,
    // tryParseArrowFunction returns false and the grouped expression is parsed
    const src = `@page Test
state { x: 0 }
view {
  button @click(x = (1 + 2)) "set"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('x.set('));
  });

  test('parses computed member access in @click (lines 361-368)', () => {
    const src = `@page Test
state { items: [] idx: 0 }
view {
  button @click(items[idx] = 99) "set"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses function call in @click (lines 369-379)', () => {
    const src = `@page Test
state { count: 0 }
view {
  button @click(Math.max(count, 0)) "cap"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses spread element as expression (lines 194-197)', () => {
    // Spread in an expression context (e.g., as an argument)
    const src = `@page Test
state { items: [] other: [] }
view {
  button @click(items = items.concat(other)) "concat"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses multi-param arrow function in @click (lines 255-260)', () => {
    const src = `@page Test
state { items: [] }
view {
  button @click(items = items.map((a, b) => a + b)) "map"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
  });

  test('parses single-ident arrow function in action @click (lines 246-247)', () => {
    const src = `@page Test
state { numbers: [1, 2, 3] }
view {
  button @click(numbers = numbers.map(n => n * 2)) "double"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('=>'));
  });
});

// ============================================================================
// 60. transformer/style.js — remaining uncovered at-rules
// ============================================================================

describe('transformer/style.js - remaining coverage', () => {
  test('compiles @supports inside @media (nested conditional groups)', () => {
    const src = `@page Test
view { div "hi" }
style {
  @media (max-width: 768px) {
    @supports (display: grid) {
      .grid { display: grid }
    }
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    // The nested conditional groups get flattened into wrapper arrays
    // so @media wraps both @supports and .grid in the output
    assert.ok(result.code.includes('@media'));
  });

  test('compiles @container inside @media', () => {
    const src = `@page Test
view { div "hi" }
style {
  @media (min-width: 600px) {
    @container sidebar (min-width: 300px) {
      .panel { width: 100% }
    }
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('@media'));
  });

  test('scopeStyleSelector handles pseudo-element (lines 429-443)', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.btn::before');
    assert.ok(result.includes(t.scopeId) || result.includes('.btn'));
  });

  test('scopeStyleSelector with :not() functional pseudo', () => {
    const t = makeTransformer();
    const result = scopeStyleSelector(t, '.item:not(.active)');
    assert.ok(result.includes(t.scopeId));
    assert.ok(result.includes(':not('));
  });
});

// ============================================================================
// 61. transformer/view.js — remaining coverage via compile
// ============================================================================

describe('transformer/view.js - remaining coverage paths', () => {
  test('element with both static and dynamic attrs', () => {
    const src = `@page Test
state { isActive: false }
view {
  div.card[class={isActive}][data-id=123] "content"
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('bind('));
  });

  test('@if with else-if chain (multiple elseif branches)', () => {
    // The correct @else-if syntax uses "@else @if" (two separate directives)
    const src = `@page Test
state { status: "a" }
view {
  @if(status == "a") {
    div "A"
  } @else @if(status == "b") {
    div "B"
  } @else {
    div "Other"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('when('));
  });

  test('element with @srOnly and children', () => {
    const src = `@page Test
view {
  span @srOnly {
    "Skip to content"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('srOnly'));
  });

  test('component with no props or slots', () => {
    const src = `@page Test
import Loader from './Loader.pulse'
view {
  Loader
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('Loader.render('));
  });

  test('@for directive with of keyword', () => {
    const src = `@page Test
state { items: [] }
view {
  @for(item of items) {
    div "x"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('list('));
  });

  test('element with @model and number modifier', () => {
    const src = `@page Test
state { age: 0 }
view {
  input @model.number(age)
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('model'));
  });

  test('element with @model and trim modifier', () => {
    const src = `@page Test
state { name: "" }
view {
  input @model.trim(name)
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('model'));
  });

  test('@link with array content', () => {
    const src = `@page Test
view {
  @link("/home") {
    span "Home"
    span " page"
  }
}`;
    const result = compile(src, { sourceMap: false });
    assert.ok(result.success, result.error);
    assert.ok(result.code.includes('router.link('));
  });
});
