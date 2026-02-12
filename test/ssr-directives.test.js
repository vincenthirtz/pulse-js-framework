/**
 * SSR Directives Tests (@client / @server)
 *
 * Comprehensive tests for selective rendering directives:
 * - Parser: NodeType.ClientDirective and ServerDirective AST nodes
 * - Compiler: @client wraps in ClientOnly(), @server wraps in ServerOnly()
 * - Runtime: ClientOnly returns fallback/placeholder in SSR, content on client
 * - Runtime: ServerOnly returns content in SSR, comment on client
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { NodeType, Parser } from '../compiler/parser.js';
import { tokenize } from '../compiler/lexer.js';
import { Transformer, transform } from '../compiler/transformer.js';

import {
  ClientOnly,
  ServerOnly,
  isSSR,
  setSSRMode
} from '../runtime/ssr.js';

import {
  MockDOMAdapter,
  MockElement,
  MockTextNode,
  MockCommentNode,
  setAdapter,
  resetAdapter,
  getAdapter
} from '../runtime/dom-adapter.js';

import { setSSRMode as setPulseSSRMode, resetContext } from '../runtime/pulse.js';

// ============================================================================
// Parser Tests - NodeType Constants
// ============================================================================

describe('NodeType - SSR Directive constants', () => {
  test('ClientDirective exists in NodeType', () => {
    assert.strictEqual(NodeType.ClientDirective, 'ClientDirective');
  });

  test('ServerDirective exists in NodeType', () => {
    assert.strictEqual(NodeType.ServerDirective, 'ServerDirective');
  });

  test('NodeType contains all SSR-related types', () => {
    assert.ok('ClientDirective' in NodeType);
    assert.ok('ServerDirective' in NodeType);
  });
});

// ============================================================================
// Parser Tests - @client directive parsing
// ============================================================================

describe('Parser - @client directive', () => {
  test('parses @client directive on element', () => {
    const source = `
@page Test

view {
  div @client {
    "Client content"
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();

    // AST uses ast.view for the view block
    const viewBlock = ast.view;
    assert.ok(viewBlock, 'Should have a view block');
    assert.strictEqual(viewBlock.type, NodeType.ViewBlock);

    // Find element with @client directive
    const element = viewBlock.children[0];
    assert.ok(element, 'Should have an element');

    // The element should have a ClientDirective in its directives
    const hasClientDirective = element.directives &&
      element.directives.some(d => d.type === NodeType.ClientDirective);
    assert.ok(hasClientDirective, 'Element should have @client directive');
  });

  test('parses @client on nested element', () => {
    const source = `
@page Test

view {
  .wrapper {
    div @client {
      span "Only on client"
    }
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();

    const viewBlock = ast.view;
    assert.ok(viewBlock, 'Should have a view block');

    // Traverse to find the @client directive
    const wrapper = viewBlock.children[0];
    assert.ok(wrapper, 'Should have wrapper element');

    const innerDiv = wrapper.children[0];
    assert.ok(innerDiv, 'Should have inner div');

    const hasClient = innerDiv.directives &&
      innerDiv.directives.some(d => d.type === NodeType.ClientDirective);
    assert.ok(hasClient, 'Inner div should have @client directive');
  });
});

// ============================================================================
// Parser Tests - @server directive parsing
// ============================================================================

describe('Parser - @server directive', () => {
  test('parses @server directive on element', () => {
    const source = `
@page Test

view {
  div @server {
    "Server content"
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();

    const viewBlock = ast.view;
    assert.ok(viewBlock, 'Should have a view block');

    const element = viewBlock.children[0];
    assert.ok(element, 'Should have an element');

    const hasServerDirective = element.directives &&
      element.directives.some(d => d.type === NodeType.ServerDirective);
    assert.ok(hasServerDirective, 'Element should have @server directive');
  });
});

// ============================================================================
// Compiler Tests - @client code generation
// ============================================================================

describe('Compiler - @client directive code generation', () => {
  test('wraps element with @client in ClientOnly()', () => {
    const source = `
@page TestClient

view {
  div @client {
    span "Interactive"
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();
    const code = transform(ast, { filename: 'test.pulse' });

    assert.ok(code.includes('ClientOnly'), 'Generated code should contain ClientOnly');
  });

  test('ClientOnly wraps content in a factory function', () => {
    const source = `
@page TestClient2

view {
  .chart @client {
    canvas "Loading chart..."
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();
    const code = transform(ast, { filename: 'test.pulse' });

    assert.ok(code.includes('ClientOnly('), 'Should call ClientOnly function');
    assert.ok(code.includes('=>'), 'Should use arrow function for factory');
  });
});

// ============================================================================
// Compiler Tests - @server code generation
// ============================================================================

describe('Compiler - @server directive code generation', () => {
  test('wraps element with @server in ServerOnly()', () => {
    const source = `
@page TestServer

view {
  div @server {
    span "SEO content"
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();
    const code = transform(ast, { filename: 'test.pulse' });

    assert.ok(code.includes('ServerOnly'), 'Generated code should contain ServerOnly');
  });

  test('ServerOnly wraps content in a factory function', () => {
    const source = `
@page TestServer2

view {
  .seo @server {
    "Server-only data"
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();
    const code = transform(ast, { filename: 'test.pulse' });

    assert.ok(code.includes('ServerOnly('), 'Should call ServerOnly function');
    assert.ok(code.includes('=>'), 'Should use arrow function for factory');
  });
});

// ============================================================================
// Compiler Tests - Import generation
// ============================================================================

describe('Compiler - SSR directive imports', () => {
  test('@client directive triggers SSR import', () => {
    const source = `
@page TestImport

view {
  div @client {
    "Client only"
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();
    const code = transform(ast, { filename: 'test.pulse' });

    // Should import ClientOnly from ssr module
    assert.ok(
      code.includes('ClientOnly') || code.includes('ssr'),
      'Should reference SSR module'
    );
  });

  test('@server directive triggers SSR import', () => {
    const source = `
@page TestImport2

view {
  div @server {
    "Server only"
  }
}`;
    const tokens = tokenize(source);
    const parser = new Parser(tokens, source);
    const ast = parser.parse();
    const code = transform(ast, { filename: 'test.pulse' });

    assert.ok(
      code.includes('ServerOnly') || code.includes('ssr'),
      'Should reference SSR module'
    );
  });
});

// ============================================================================
// Runtime Tests - ClientOnly
// ============================================================================

describe('Runtime - ClientOnly', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    setPulseSSRMode(false);
    resetAdapter();
  });

  test('returns client content when not in SSR mode', () => {
    setPulseSSRMode(false);

    const element = new MockElement('div');
    element.className = 'chart';

    const result = ClientOnly(() => element);
    assert.strictEqual(result, element);
    assert.strictEqual(result.className, 'chart');
  });

  test('returns fallback when in SSR mode and fallback provided', () => {
    setPulseSSRMode(true);

    const clientEl = new MockElement('canvas');
    const fallbackEl = new MockElement('div');
    fallbackEl.className = 'placeholder';

    const result = ClientOnly(() => clientEl, () => fallbackEl);
    assert.strictEqual(result, fallbackEl);
    assert.strictEqual(result.className, 'placeholder');
  });

  test('returns comment placeholder when in SSR mode and no fallback', () => {
    setPulseSSRMode(true);

    const clientEl = new MockElement('canvas');
    const result = ClientOnly(() => clientEl);

    // Should be a comment node
    assert.strictEqual(result.nodeType, 8);
  });

  test('comment placeholder contains client-only text', () => {
    setPulseSSRMode(true);

    const result = ClientOnly(() => new MockElement('div'));
    assert.ok(result.data === 'client-only' || result._data === 'client-only');
  });

  test('does not call client factory during SSR', () => {
    setPulseSSRMode(true);

    let factoryCalled = false;
    ClientOnly(() => {
      factoryCalled = true;
      return new MockElement('div');
    });

    assert.strictEqual(factoryCalled, false);
  });

  test('calls client factory when not in SSR', () => {
    setPulseSSRMode(false);

    let factoryCalled = false;
    ClientOnly(() => {
      factoryCalled = true;
      return new MockElement('div');
    });

    assert.strictEqual(factoryCalled, true);
  });

  test('does not call fallback factory when not in SSR', () => {
    setPulseSSRMode(false);

    let fallbackCalled = false;
    ClientOnly(
      () => new MockElement('div'),
      () => {
        fallbackCalled = true;
        return new MockElement('span');
      }
    );

    assert.strictEqual(fallbackCalled, false);
  });

  test('calls fallback factory during SSR when provided', () => {
    setPulseSSRMode(true);

    let fallbackCalled = false;
    ClientOnly(
      () => new MockElement('div'),
      () => {
        fallbackCalled = true;
        return new MockElement('span');
      }
    );

    assert.strictEqual(fallbackCalled, true);
  });
});

// ============================================================================
// Runtime Tests - ServerOnly
// ============================================================================

describe('Runtime - ServerOnly', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    setPulseSSRMode(false);
    resetAdapter();
  });

  test('returns server content when in SSR mode', () => {
    setPulseSSRMode(true);

    const element = new MockElement('script');
    element.setAttribute('type', 'application/ld+json');

    const result = ServerOnly(() => element);
    assert.strictEqual(result, element);
  });

  test('returns comment placeholder when not in SSR mode', () => {
    setPulseSSRMode(false);

    const element = new MockElement('script');
    const result = ServerOnly(() => element);

    // Should be a comment node
    assert.strictEqual(result.nodeType, 8);
  });

  test('comment placeholder contains server-only text', () => {
    setPulseSSRMode(false);

    const result = ServerOnly(() => new MockElement('div'));
    assert.ok(result.data === 'server-only' || result._data === 'server-only');
  });

  test('calls server factory during SSR', () => {
    setPulseSSRMode(true);

    let factoryCalled = false;
    ServerOnly(() => {
      factoryCalled = true;
      return new MockElement('div');
    });

    assert.strictEqual(factoryCalled, true);
  });

  test('does not call server factory when not in SSR', () => {
    setPulseSSRMode(false);

    let factoryCalled = false;
    ServerOnly(() => {
      factoryCalled = true;
      return new MockElement('div');
    });

    assert.strictEqual(factoryCalled, false);
  });
});

// ============================================================================
// Runtime Tests - isSSR integration
// ============================================================================

describe('Runtime - isSSR with directives', () => {
  beforeEach(() => {
    setAdapter(new MockDOMAdapter());
    resetContext();
  });

  afterEach(() => {
    setPulseSSRMode(false);
    resetAdapter();
  });

  test('isSSR returns true during SSR mode', () => {
    setPulseSSRMode(true);
    assert.strictEqual(isSSR(), true);
  });

  test('isSSR returns false when SSR mode is off', () => {
    setPulseSSRMode(false);
    assert.strictEqual(isSSR(), false);
  });

  test('ClientOnly and ServerOnly behavior depends on isSSR', () => {
    setPulseSSRMode(true);

    // During SSR: ClientOnly returns placeholder, ServerOnly returns content
    const clientResult = ClientOnly(() => new MockElement('canvas'));
    assert.strictEqual(clientResult.nodeType, 8); // comment

    const serverContent = new MockElement('meta');
    const serverResult = ServerOnly(() => serverContent);
    assert.strictEqual(serverResult, serverContent);

    setPulseSSRMode(false);

    // On client: ClientOnly returns content, ServerOnly returns placeholder
    const clientContent = new MockElement('canvas');
    const clientResult2 = ClientOnly(() => clientContent);
    assert.strictEqual(clientResult2, clientContent);

    const serverResult2 = ServerOnly(() => new MockElement('meta'));
    assert.strictEqual(serverResult2.nodeType, 8); // comment
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('SSR Directives - edge cases', () => {
  beforeEach(() => {
    setAdapter(new MockDOMAdapter());
    resetContext();
  });

  afterEach(() => {
    setPulseSSRMode(false);
    resetAdapter();
  });

  test('ClientOnly with no fallback returns comment in SSR', () => {
    setPulseSSRMode(true);

    const result = ClientOnly(() => new MockElement('video'));
    assert.ok(result);
    assert.strictEqual(result.nodeType, 8);
  });

  test('ClientOnly factory can return arrays or complex structures', () => {
    setPulseSSRMode(false);

    const elements = [new MockElement('div'), new MockElement('span')];
    const result = ClientOnly(() => elements);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 2);
  });

  test('ServerOnly factory can return text nodes', () => {
    setPulseSSRMode(true);

    const textNode = new MockTextNode('Server-only text');
    const result = ServerOnly(() => textNode);
    assert.strictEqual(result.nodeType, 3);
  });

  test('multiple ClientOnly calls produce independent results', () => {
    setPulseSSRMode(true);

    const r1 = ClientOnly(() => new MockElement('a'));
    const r2 = ClientOnly(
      () => new MockElement('b'),
      () => new MockElement('c')
    );

    assert.strictEqual(r1.nodeType, 8); // comment
    assert.strictEqual(r2.nodeType, 1); // element (fallback)
  });

  test('SSR mode can be toggled multiple times', () => {
    setPulseSSRMode(true);
    assert.strictEqual(isSSR(), true);

    setPulseSSRMode(false);
    assert.strictEqual(isSSR(), false);

    setPulseSSRMode(true);
    assert.strictEqual(isSSR(), true);

    const result = ClientOnly(() => new MockElement('div'));
    assert.strictEqual(result.nodeType, 8);

    setPulseSSRMode(false);
  });
});

console.log('SSR Directives tests loaded');
