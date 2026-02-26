/**
 * Tests for compiler/directives.js
 * Covers directive detection, parsing, validation, and component type resolution
 */
import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';

import {
  Directive,
  isDirective,
  isDirectiveToken,
  parseDirective,
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

// ============================================================================
// Directive Constants
// ============================================================================

describe('Directive constants', () => {
  test('USE_CLIENT is "use client"', () => {
    assert.strictEqual(Directive.USE_CLIENT, 'use client');
  });

  test('USE_SERVER is "use server"', () => {
    assert.strictEqual(Directive.USE_SERVER, 'use server');
  });
});

// ============================================================================
// isDirective
// ============================================================================

describe('isDirective', () => {
  test('detects "use client"', () => {
    assert.strictEqual(isDirective('use client'), 'use client');
  });

  test('detects "use server"', () => {
    assert.strictEqual(isDirective('use server'), 'use server');
  });

  test('detects with leading/trailing whitespace', () => {
    assert.strictEqual(isDirective('  use client  '), 'use client');
  });

  test('is case-insensitive', () => {
    assert.strictEqual(isDirective('Use Client'), 'use client');
    assert.strictEqual(isDirective('USE SERVER'), 'use server');
  });

  test('returns null for non-directives', () => {
    assert.strictEqual(isDirective('use strict'), null);
    assert.strictEqual(isDirective('hello'), null);
    assert.strictEqual(isDirective(''), null);
  });
});

// ============================================================================
// isDirectiveToken
// ============================================================================

describe('isDirectiveToken', () => {
  test('detects STRING token with "use client"', () => {
    assert.strictEqual(isDirectiveToken({ type: TokenType.STRING, value: 'use client' }), 'use client');
  });

  test('detects STRING token with "use server"', () => {
    assert.strictEqual(isDirectiveToken({ type: TokenType.STRING, value: 'use server' }), 'use server');
  });

  test('returns null for non-STRING token', () => {
    assert.strictEqual(isDirectiveToken({ type: TokenType.IDENT, value: 'use client' }), null);
  });

  test('returns null for null/undefined', () => {
    assert.strictEqual(isDirectiveToken(null), null);
    assert.strictEqual(isDirectiveToken(undefined), null);
  });

  test('returns null for STRING with non-directive value', () => {
    assert.strictEqual(isDirectiveToken({ type: TokenType.STRING, value: 'use strict' }), null);
  });
});

// ============================================================================
// parseDirective
// ============================================================================

describe('parseDirective', () => {
  test('parses "use client" at beginning', () => {
    let pos = 0;
    const tokens = [
      { type: TokenType.STRING, value: 'use client' },
      { type: TokenType.SEMICOLON, value: ';' },
      { type: TokenType.IDENT, value: 'import' },
    ];
    const parser = {
      current: () => tokens[pos],
      advance: () => { pos++; },
      is: (type) => tokens[pos]?.type === type,
    };
    const result = parseDirective(parser);
    assert.strictEqual(result, 'use client');
    assert.strictEqual(pos, 2); // advanced past STRING + SEMICOLON
  });

  test('parses "use server" without semicolon', () => {
    let pos = 0;
    const tokens = [
      { type: TokenType.STRING, value: 'use server' },
      { type: TokenType.IDENT, value: 'import' },
    ];
    const parser = {
      current: () => tokens[pos],
      advance: () => { pos++; },
      is: (type) => tokens[pos]?.type === type,
    };
    const result = parseDirective(parser);
    assert.strictEqual(result, 'use server');
    assert.strictEqual(pos, 1); // only advanced past STRING
  });

  test('returns null when first token is not STRING', () => {
    const parser = {
      current: () => ({ type: TokenType.IDENT, value: 'import' }),
    };
    assert.strictEqual(parseDirective(parser), null);
  });

  test('returns null when STRING is not a directive', () => {
    let pos = 0;
    const parser = {
      current: () => ({ type: TokenType.STRING, value: 'use strict' }),
      advance: () => { pos++; },
    };
    assert.strictEqual(parseDirective(parser), null);
    assert.strictEqual(pos, 0); // should not have advanced
  });
});

// ============================================================================
// validateDirective
// ============================================================================

describe('validateDirective', () => {
  test('does nothing for null directive', () => {
    assert.doesNotThrow(() => validateDirective(null, {}));
  });

  test('throws on "use client" + serverDirective conflict', () => {
    assert.throws(
      () => validateDirective(Directive.USE_CLIENT, { serverDirective: true }),
      (err) => err.message.includes('Cannot use both')
    );
  });

  test('throws on "use server" + clientDirective conflict', () => {
    assert.throws(
      () => validateDirective(Directive.USE_SERVER, { clientDirective: true }),
      (err) => err.message.includes('Cannot use both')
    );
  });

  test('allows "use client" alone', () => {
    assert.doesNotThrow(() => validateDirective(Directive.USE_CLIENT, {}));
  });

  test('allows "use server" alone', () => {
    assert.doesNotThrow(() => validateDirective(Directive.USE_SERVER, {}));
  });
});

// ============================================================================
// Component Type Detection
// ============================================================================

describe('getComponentType', () => {
  test('returns "client" for USE_CLIENT', () => {
    assert.strictEqual(getComponentType(Directive.USE_CLIENT), 'client');
  });

  test('returns "server" for USE_SERVER', () => {
    assert.strictEqual(getComponentType(Directive.USE_SERVER), 'server');
  });

  test('returns "shared" for null', () => {
    assert.strictEqual(getComponentType(null), 'shared');
  });

  test('returns "shared" for undefined', () => {
    assert.strictEqual(getComponentType(undefined), 'shared');
  });

  test('returns "shared" for unknown directive', () => {
    assert.strictEqual(getComponentType('use strict'), 'shared');
  });
});

describe('isClientComponent', () => {
  test('true for USE_CLIENT', () => {
    assert.strictEqual(isClientComponent(Directive.USE_CLIENT), true);
  });

  test('false for USE_SERVER', () => {
    assert.strictEqual(isClientComponent(Directive.USE_SERVER), false);
  });

  test('false for null', () => {
    assert.strictEqual(isClientComponent(null), false);
  });
});

describe('isServerComponent', () => {
  test('true for USE_SERVER', () => {
    assert.strictEqual(isServerComponent(Directive.USE_SERVER), true);
  });

  test('false for USE_CLIENT', () => {
    assert.strictEqual(isServerComponent(Directive.USE_CLIENT), false);
  });

  test('false for null', () => {
    assert.strictEqual(isServerComponent(null), false);
  });
});

describe('isSharedComponent', () => {
  test('true for null', () => {
    assert.strictEqual(isSharedComponent(null), true);
  });

  test('true for undefined', () => {
    assert.strictEqual(isSharedComponent(undefined), true);
  });

  test('false for USE_CLIENT', () => {
    assert.strictEqual(isSharedComponent(Directive.USE_CLIENT), false);
  });

  test('false for USE_SERVER', () => {
    assert.strictEqual(isSharedComponent(Directive.USE_SERVER), false);
  });
});

// ============================================================================
// Source Code Parsing
// ============================================================================

describe('parseDirectivesFromSource', () => {
  test('detects "use client" with single quotes', () => {
    const result = parseDirectivesFromSource("'use client';\nimport foo from 'bar';");
    assert.strictEqual(result.useClient, true);
    assert.strictEqual(result.useServer, false);
    assert.strictEqual(result.line, 1);
  });

  test('detects "use client" with double quotes', () => {
    const result = parseDirectivesFromSource('"use client";\nimport foo from "bar";');
    assert.strictEqual(result.useClient, true);
    assert.strictEqual(result.line, 1);
  });

  test('detects "use server"', () => {
    const result = parseDirectivesFromSource("'use server';\nexport async function createUser() {}");
    assert.strictEqual(result.useServer, true);
    assert.strictEqual(result.useClient, false);
    assert.strictEqual(result.line, 1);
  });

  test('detects directive without semicolon', () => {
    const result = parseDirectivesFromSource("'use client'\nimport foo from 'bar'");
    assert.strictEqual(result.useClient, true);
  });

  test('skips comments before directive', () => {
    const result = parseDirectivesFromSource("// Comment\n'use client';\nimport foo from 'bar';");
    assert.strictEqual(result.useClient, true);
    assert.strictEqual(result.line, 2);
  });

  test('skips empty lines before directive', () => {
    const result = parseDirectivesFromSource("\n\n'use server';\nexport async function f() {}");
    assert.strictEqual(result.useServer, true);
    assert.strictEqual(result.line, 3);
  });

  test('ignores directive after code', () => {
    const result = parseDirectivesFromSource("import foo from 'bar';\n'use client';");
    assert.strictEqual(result.useClient, false);
    assert.strictEqual(result.useServer, false);
  });

  test('returns empty result for empty string', () => {
    const result = parseDirectivesFromSource('');
    assert.strictEqual(result.useClient, false);
    assert.strictEqual(result.useServer, false);
  });

  test('returns empty result for null', () => {
    const result = parseDirectivesFromSource(null);
    assert.strictEqual(result.useClient, false);
    assert.strictEqual(result.useServer, false);
  });

  test('returns empty result for non-string', () => {
    const result = parseDirectivesFromSource(42);
    assert.strictEqual(result.useClient, false);
  });

  test('handles multi-line comments before directive', () => {
    const result = parseDirectivesFromSource("/* comment */\n'use client';");
    assert.strictEqual(result.useClient, true);
  });

  test('handles * comment continuation lines', () => {
    const result = parseDirectivesFromSource("/*\n * multi-line\n */\n'use server';");
    assert.strictEqual(result.useServer, true);
  });

  test('returns empty for file with no directives', () => {
    const result = parseDirectivesFromSource("export const utils = {};");
    assert.strictEqual(result.useClient, false);
    assert.strictEqual(result.useServer, false);
    assert.strictEqual(result.line, undefined);
  });
});

// ============================================================================
// Source Code Component Detection
// ============================================================================

describe('isClientComponentSource', () => {
  test('true for "use client" source', () => {
    assert.strictEqual(isClientComponentSource("'use client';\nexport function Button() {}"), true);
  });

  test('false for "use server" source', () => {
    assert.strictEqual(isClientComponentSource("'use server';\nexport async function f() {}"), false);
  });

  test('false for no directive', () => {
    assert.strictEqual(isClientComponentSource("export const x = 1;"), false);
  });
});

describe('isServerComponentSource', () => {
  test('true for "use server" source', () => {
    assert.strictEqual(isServerComponentSource("'use server';\nexport async function createUser() {}"), true);
  });

  test('false for "use client" source', () => {
    assert.strictEqual(isServerComponentSource("'use client';\nexport function Button() {}"), false);
  });
});

// ============================================================================
// File-based Detection
// ============================================================================

describe('isServerFile', () => {
  test('true for .server.js', () => {
    assert.strictEqual(isServerFile('src/api/users.server.js'), true);
  });

  test('true for .server.ts', () => {
    assert.strictEqual(isServerFile('src/api/users.server.ts'), true);
  });

  test('true for .server.jsx', () => {
    assert.strictEqual(isServerFile('components/Form.server.jsx'), true);
  });

  test('true for .server.tsx', () => {
    assert.strictEqual(isServerFile('components/Form.server.tsx'), true);
  });

  test('false for regular .js', () => {
    assert.strictEqual(isServerFile('src/api/users.js'), false);
  });

  test('false for .client.js', () => {
    assert.strictEqual(isServerFile('src/Button.client.js'), false);
  });

  test('false for null', () => {
    assert.strictEqual(isServerFile(null), false);
  });

  test('false for non-string', () => {
    assert.strictEqual(isServerFile(42), false);
  });

  test('false for empty string', () => {
    assert.strictEqual(isServerFile(''), false);
  });
});

// ============================================================================
// Module-level Detection
// ============================================================================

describe('isServerModule', () => {
  test('true when source has "use server"', () => {
    assert.strictEqual(isServerModule("'use server';\nexport function f() {}", 'api.js'), true);
  });

  test('true when file matches *.server.js', () => {
    assert.strictEqual(isServerModule("export function f() {}", 'api.server.js'), true);
  });

  test('false for plain module', () => {
    assert.strictEqual(isServerModule("export function f() {}", 'api.js'), false);
  });
});

describe('isClientModule', () => {
  test('true when source has "use client"', () => {
    assert.strictEqual(isClientModule("'use client';\nexport function Button() {}"), true);
  });

  test('false for plain module', () => {
    assert.strictEqual(isClientModule("export function Button() {}"), false);
  });
});

describe('getComponentTypeFromSource', () => {
  test('returns "client" for use client', () => {
    assert.strictEqual(getComponentTypeFromSource("'use client';", 'Button.js'), 'client');
  });

  test('returns "server" for use server', () => {
    assert.strictEqual(getComponentTypeFromSource("'use server';", 'api.js'), 'server');
  });

  test('returns "server" for *.server.js file', () => {
    assert.strictEqual(getComponentTypeFromSource("export const x = 1;", 'api.server.js'), 'server');
  });

  test('returns "shared" for plain module', () => {
    assert.strictEqual(getComponentTypeFromSource("export const utils = {}", 'utils.js'), 'shared');
  });
});

// ============================================================================
// Directive Validation in Source
// ============================================================================

describe('validateDirectivesInSource', () => {
  test('valid for "use client" only', () => {
    const result = validateDirectivesInSource("'use client';\nexport function Button() {}");
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.error, undefined);
  });

  test('valid for "use server" only', () => {
    const result = validateDirectivesInSource("'use server';\nexport async function f() {}");
    assert.strictEqual(result.valid, true);
  });

  test('valid for no directives', () => {
    const result = validateDirectivesInSource("export const x = 1;");
    assert.strictEqual(result.valid, true);
  });

  // Note: parseDirectivesFromSource returns on first directive found,
  // so both cannot be true simultaneously — this is tested for completeness
  test('valid when file only has one directive', () => {
    const result = validateDirectivesInSource("'use client';");
    assert.strictEqual(result.valid, true);
  });
});
