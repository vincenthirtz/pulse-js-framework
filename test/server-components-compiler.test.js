/**
 * Server Components - Compiler Integration Tests
 *
 * Tests for 'use client' and 'use server' directive support in the compiler
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// Compiler modules
import { tokenize } from '../compiler/lexer.js';
import { parse } from '../compiler/parser.js';
import { transform } from '../compiler/transformer.js';
import {
  Directive,
  isDirective,
  isDirectiveToken,
  parseDirective,
  validateDirective,
  getComponentType,
  isClientComponent,
  isServerComponent,
  isSharedComponent
} from '../compiler/directives.js';

describe('Server Components - Compiler Integration', () => {

  // ============================================================================
  // Directive Detection Tests
  // ============================================================================

  describe('Directive Detection', () => {
    test('isDirective detects use client', () => {
      assert.strictEqual(isDirective('use client'), Directive.USE_CLIENT);
      assert.strictEqual(isDirective('  use client  '), Directive.USE_CLIENT);
      assert.strictEqual(isDirective('USE CLIENT'), Directive.USE_CLIENT); // case-insensitive
    });

    test('isDirective detects use server', () => {
      assert.strictEqual(isDirective('use server'), Directive.USE_SERVER);
      assert.strictEqual(isDirective('  use server  '), Directive.USE_SERVER);
      assert.strictEqual(isDirective('USE SERVER'), Directive.USE_SERVER);
    });

    test('isDirective returns null for non-directives', () => {
      assert.strictEqual(isDirective('not a directive'), null);
      assert.strictEqual(isDirective(''), null);
      assert.strictEqual(isDirective('use something'), null);
    });

    test('isDirectiveToken detects string token directives', () => {
      const tokens = tokenize('"use client"');
      assert.strictEqual(isDirectiveToken(tokens[0]), Directive.USE_CLIENT);
    });

    test('isDirectiveToken returns null for non-directive tokens', () => {
      const tokens = tokenize('"not a directive"');
      assert.strictEqual(isDirectiveToken(tokens[0]), null);
    });
  });

  // ============================================================================
  // Component Type Classification
  // ============================================================================

  describe('Component Type Classification', () => {
    test('getComponentType returns correct type', () => {
      assert.strictEqual(getComponentType(Directive.USE_CLIENT), 'client');
      assert.strictEqual(getComponentType(Directive.USE_SERVER), 'server');
      assert.strictEqual(getComponentType(null), 'shared');
      assert.strictEqual(getComponentType(undefined), 'shared');
    });

    test('isClientComponent checks correctly', () => {
      assert.strictEqual(isClientComponent(Directive.USE_CLIENT), true);
      assert.strictEqual(isClientComponent(Directive.USE_SERVER), false);
      assert.strictEqual(isClientComponent(null), false);
    });

    test('isServerComponent checks correctly', () => {
      assert.strictEqual(isServerComponent(Directive.USE_SERVER), true);
      assert.strictEqual(isServerComponent(Directive.USE_CLIENT), false);
      assert.strictEqual(isServerComponent(null), false);
    });

    test('isSharedComponent checks correctly', () => {
      assert.strictEqual(isSharedComponent(null), true);
      assert.strictEqual(isSharedComponent(undefined), true);
      assert.strictEqual(isSharedComponent(Directive.USE_CLIENT), false);
      assert.strictEqual(isSharedComponent(Directive.USE_SERVER), false);
    });
  });

  // ============================================================================
  // Parser Integration Tests
  // ============================================================================

  describe('Parser Integration', () => {
    test('parses use client directive', () => {
      const source = `'use client';

@page MyComponent

view {
  .container { "Hello" }
}`;
      const ast = parse(source);
      assert.strictEqual(ast.directive, Directive.USE_CLIENT);
      assert.strictEqual(ast.page.name, 'MyComponent');
    });

    test('parses use server directive', () => {
      const source = `'use server';

@page ServerComponent

view {
  .container { "Server rendered" }
}`;
      const ast = parse(source);
      assert.strictEqual(ast.directive, Directive.USE_SERVER);
    });

    test('parses component without directive', () => {
      const source = `@page SharedComponent

view {
  .container { "Shared" }
}`;
      const ast = parse(source);
      assert.strictEqual(ast.directive, null);
    });

    test('parses directive with semicolon', () => {
      const source = `"use client";

view {
  .container { "Hello" }
}`;
      const ast = parse(source);
      assert.strictEqual(ast.directive, Directive.USE_CLIENT);
    });

    test('parses directive without semicolon', () => {
      const source = `"use client"

view {
  .container { "Hello" }
}`;
      const ast = parse(source);
      assert.strictEqual(ast.directive, Directive.USE_CLIENT);
    });

    test('ignores non-directive strings', () => {
      const source = `"hello world"

view {
  .container { "Hello" }
}`;
      // This should fail to parse because "hello world" is not a valid top-level token
      // The parser expects imports, @page, @route, or blocks
      try {
        parse(source);
        assert.fail('Should have thrown parse error');
      } catch (error) {
        assert.ok(error.message.includes('Unexpected token'));
      }
    });

    test('directive must be first', () => {
      const source = `import Foo from './Foo.pulse'
'use client';

view {
  .container { "Hello" }
}`;
      // Directive after imports is not recognized - should throw parse error
      try {
        parse(source);
        assert.fail('Should have thrown parse error for directive not being first');
      } catch (error) {
        assert.ok(error.message.includes('Unexpected token'));
      }
    });
  });

  // ============================================================================
  // Transformer Integration Tests
  // ============================================================================

  describe('Transformer Integration', () => {
    test('includes directive metadata in Client Component export', () => {
      const source = `'use client';

@page ClientButton

view {
  button { "Click me" }
}`;
      const ast = parse(source);
      const code = transform(ast);

      // Check that export includes directive metadata
      assert.ok(code.includes('__directive: "use client"'));
      assert.ok(code.includes('__componentId: "ClientButton"'));
    });

    test('includes directive metadata in Server Component export', () => {
      const source = `'use server';

@page ServerList

view {
  ul { li { "Item" } }
}`;
      const ast = parse(source);
      const code = transform(ast);

      assert.ok(code.includes('__directive: "use server"'));
      assert.ok(code.includes('__componentId: "ServerList"'));
    });

    test('does not include directive metadata in Shared Component export', () => {
      const source = `@page SharedComponent

view {
  .container { "Hello" }
}`;
      const ast = parse(source);
      const code = transform(ast);

      assert.ok(!code.includes('__directive:'));
      assert.ok(!code.includes('__componentId:'));
    });

    test('transformer tracks directive property', async () => {
      const source = `'use client';

@page MyComponent

view {
  .container { "Hello" }
}`;
      const ast = parse(source);
      const { Transformer } = await import('../compiler/transformer.js');
      const transformer = new Transformer(ast);

      assert.strictEqual(transformer.directive, Directive.USE_CLIENT);
      assert.strictEqual(transformer.componentId, 'MyComponent');
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Directive Validation', () => {
    test('validates use client directive', () => {
      const program = { directive: Directive.USE_CLIENT };
      // Should not throw
      validateDirective(Directive.USE_CLIENT, program);
    });

    test('validates use server directive', () => {
      const program = { directive: Directive.USE_SERVER };
      // Should not throw
      validateDirective(Directive.USE_SERVER, program);
    });

    test('validates null directive', () => {
      const program = { directive: null };
      // Should not throw
      validateDirective(null, program);
    });

    test('rejects both use client and use server (hypothetical)', () => {
      // This can't happen through normal parsing, but validate should catch it
      const program = { directive: Directive.USE_CLIENT, serverDirective: true };
      assert.throws(() => {
        validateDirective(Directive.USE_CLIENT, program);
      }, /Cannot use both/);
    });
  });

  // ============================================================================
  // End-to-End Compilation Tests
  // ============================================================================

  describe('End-to-End Compilation', () => {
    test('compiles Client Component with props and state', () => {
      const source = `'use client';

@page Counter

props {
  initialCount: 0
}

state {
  count: initialCount
}

view {
  .counter {
    h1 "Count: {count}"
    button @click(count++) "+"
    button @click(count--) "-"
  }
}`;
      const ast = parse(source);
      const code = transform(ast);

      // Should compile successfully with directive metadata
      assert.ok(code.includes('__directive: "use client"'));
      assert.ok(code.includes('__componentId: "Counter"'));
      // Should have props and state
      assert.ok(code.includes('const initialCount = useProp'));
      assert.ok(code.includes('const count = pulse('));
    });

    test('compiles Server Component with async data', () => {
      const source = `'use server';

@page ProductList

state {
  products: []
}

view {
  .products {
    @for (product in products) {
      .product { "{product.name}" }
    }
  }
}`;
      const ast = parse(source);
      const code = transform(ast);

      assert.ok(code.includes('__directive: "use server"'));
      assert.ok(code.includes('__componentId: "ProductList"'));
      assert.ok(code.includes('const products = pulse([])'));
      assert.ok(code.includes('list('));
    });

    test('compiles Shared Component normally', () => {
      const source = `@page Button

props {
  text: "Click"
}

view {
  button { "{text}" }
}`;
      const ast = parse(source);
      const code = transform(ast);

      // No directive metadata
      assert.ok(!code.includes('__directive:'));
      // But still has normal component structure
      assert.ok(code.includes('export const Button'));
      assert.ok(code.includes('function render'));
      assert.ok(code.includes('const text = useProp'));
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles directive with imports', () => {
      const source = `'use client';

import Button from './Button.pulse'

@page MyPage

view {
  .container {
    Button
  }
}`;
      const ast = parse(source);
      assert.strictEqual(ast.directive, Directive.USE_CLIENT);
      assert.strictEqual(ast.imports.length, 1);

      const code = transform(ast);
      assert.ok(code.includes('__directive: "use client"'));
    });

    test('handles directive with route', () => {
      const source = `'use client';

@page HomePage
@route "/"

view {
  .home { "Welcome" }
}`;
      const ast = parse(source);
      assert.strictEqual(ast.directive, Directive.USE_CLIENT);
      assert.strictEqual(ast.route.path, '/');
    });

    test('handles directive with all blocks', () => {
      const source = `'use client';

@page FullComponent

props {
  name: "World"
}

state {
  count: 0
}

actions {
  increment() {
    count++;
  }
}

view {
  .container {
    h1 "Hello {name}"
    p "Count: {count}"
    button @click(increment()) "+"
  }
}

style {
  .container {
    padding: 20px;
  }
}`;
      const ast = parse(source);
      const code = transform(ast);

      assert.strictEqual(ast.directive, Directive.USE_CLIENT);
      assert.ok(code.includes('__directive: "use client"'));
      assert.ok(code.includes('function increment()'));
      assert.ok(code.includes('const count = pulse(0)'));
      assert.ok(code.includes('const name = useProp'));
    });
  });
});
