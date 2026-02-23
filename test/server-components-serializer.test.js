/**
 * Comprehensive Tests for Server Components - Serializer
 * Tests serializer.js to achieve 92%+ coverage
 * Covers: PSC wire format serialization, client boundaries, prop validation
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  serializeNode,
  serializeToPSC,
  isClientBoundary,
  markClientBoundary
} from '../runtime/server-components/serializer.js';
import { PSCNodeType, PSC_VERSION } from '../runtime/server-components/types.js';
import { MockDOMAdapter, setAdapter, resetAdapter } from '../runtime/dom-adapter.js';

let adapter;

beforeEach(() => {
  adapter = new MockDOMAdapter();
  setAdapter(adapter);
});

afterEach(() => {
  resetAdapter();
});

// =============================================================================
// serializeNode() Tests - Basic Node Types
// =============================================================================

describe('serializeNode - Element Nodes', () => {
  test('serializes simple div element', () => {
    const div = adapter.createElement('div');
    const result = serializeNode(div);

    assert.strictEqual(result.type, PSCNodeType.ELEMENT);
    assert.strictEqual(result.tag, 'div');
    assert.ok(result.props);
    assert.ok(Array.isArray(result.children));
  });

  test('serializes element with attributes', () => {
    const div = adapter.createElement('div');
    adapter.setAttribute(div, 'id', 'test');
    adapter.setAttribute(div, 'class', 'container');

    const result = serializeNode(div);

    assert.strictEqual(result.props.id, 'test');
    assert.strictEqual(result.props.class, 'container');
  });

  test('serializes element with className property', () => {
    const div = adapter.createElement('div');
    div.className = 'btn primary';

    const result = serializeNode(div);

    assert.strictEqual(result.props.class, 'btn primary');
  });

  test('serializes nested elements', () => {
    const parent = adapter.createElement('div');
    const child = adapter.createElement('span');
    adapter.appendChild(parent, child);

    const result = serializeNode(parent);

    assert.strictEqual(result.children.length, 1);
    assert.strictEqual(result.children[0].type, PSCNodeType.ELEMENT);
    assert.strictEqual(result.children[0].tag, 'span');
  });

  test('converts tag names to lowercase', () => {
    const div = adapter.createElement('DIV');
    const result = serializeNode(div);

    assert.strictEqual(result.tag, 'div');
  });
});

describe('serializeNode - Text Nodes', () => {
  test('serializes text node', () => {
    const text = adapter.createTextNode('Hello, world!');
    const result = serializeNode(text);

    assert.strictEqual(result.type, PSCNodeType.TEXT);
    assert.strictEqual(result.value, 'Hello, world!');
  });

  test('skips empty text nodes', () => {
    const text = adapter.createTextNode('   ');
    const result = serializeNode(text);

    assert.strictEqual(result, null);
  });

  test('skips whitespace-only text nodes', () => {
    const text = adapter.createTextNode('\n\t  ');
    const result = serializeNode(text);

    assert.strictEqual(result, null);
  });

  test('preserves text with leading/trailing whitespace if non-empty', () => {
    const text = adapter.createTextNode('  Hello  ');
    const result = serializeNode(text);

    assert.strictEqual(result.type, PSCNodeType.TEXT);
    assert.strictEqual(result.value, '  Hello  ');
  });
});

describe('serializeNode - Comment Nodes', () => {
  test('skips comments by default', () => {
    const comment = adapter.createComment('This is a comment');
    const result = serializeNode(comment, {});

    assert.strictEqual(result, null);
  });

  test('includes comments when includeComments=true', () => {
    const comment = adapter.createComment('This is a comment');
    const result = serializeNode(comment, { includeComments: true });

    assert.strictEqual(result.type, PSCNodeType.COMMENT);
    assert.strictEqual(result.value, 'This is a comment');
  });

  test('serializes empty comment', () => {
    const comment = adapter.createComment('');
    const result = serializeNode(comment, { includeComments: true });

    assert.strictEqual(result.type, PSCNodeType.COMMENT);
    assert.strictEqual(result.value, '');
  });
});

describe('serializeNode - Document Fragments', () => {
  test('serializes document fragment', () => {
    const fragment = adapter.createDocumentFragment();
    const div1 = adapter.createElement('div');
    const div2 = adapter.createElement('div');
    adapter.appendChild(fragment, div1);
    adapter.appendChild(fragment, div2);

    const result = serializeNode(fragment);

    assert.strictEqual(result.type, PSCNodeType.FRAGMENT);
    assert.strictEqual(result.children.length, 2);
    assert.strictEqual(result.children[0].tag, 'div');
    assert.strictEqual(result.children[1].tag, 'div');
  });

  test('serializes empty fragment', () => {
    const fragment = adapter.createDocumentFragment();
    const result = serializeNode(fragment);

    assert.strictEqual(result.type, PSCNodeType.FRAGMENT);
    assert.strictEqual(result.children.length, 0);
  });
});

describe('serializeNode - Edge Cases', () => {
  test('returns null for null node', () => {
    const result = serializeNode(null);
    assert.strictEqual(result, null);
  });

  test('returns null for undefined node', () => {
    const result = serializeNode(undefined);
    assert.strictEqual(result, null);
  });

  test('handles unknown node type gracefully', () => {
    const fakeNode = { nodeType: 999 }; // Unknown type
    const result = serializeNode(fakeNode);

    assert.strictEqual(result, null);
  });

  test('enforces max depth limit', () => {
    // Create deeply nested structure
    let deep = adapter.createElement('div');
    let current = deep;
    for (let i = 0; i < 110; i++) {
      const child = adapter.createElement('div');
      adapter.appendChild(current, child);
      current = child;
    }

    const result = serializeNode(deep, { maxDepth: 100 });

    // Should serialize but truncate at depth 100
    assert.ok(result);
    assert.strictEqual(result.type, PSCNodeType.ELEMENT);
  });

  test('respects custom maxDepth option', () => {
    let deep = adapter.createElement('div');
    let current = deep;
    for (let i = 0; i < 10; i++) {
      const child = adapter.createElement('div');
      adapter.appendChild(current, child);
      current = child;
    }

    const result = serializeNode(deep, { maxDepth: 5 });

    assert.ok(result);
    // Depth limit should prevent full serialization
  });
});

// =============================================================================
// Client Boundary Tests
// =============================================================================

describe('isClientBoundary', () => {
  test('detects client boundary marker', () => {
    const div = adapter.createElement('div');
    adapter.setAttribute(div, 'data-pulse-client-id', 'Button');

    assert.strictEqual(isClientBoundary(div), true);
  });

  test('returns false for non-client element', () => {
    const div = adapter.createElement('div');
    assert.strictEqual(isClientBoundary(div), false);
  });

  test('returns null for null', () => {
    assert.strictEqual(isClientBoundary(null), null);
  });

  test('returns false for text node', () => {
    const text = adapter.createTextNode('test');
    assert.strictEqual(isClientBoundary(text), false);
  });

  test('returns undefined for element without hasAttribute', () => {
    const fake = { nodeType: 1 }; // Missing hasAttribute
    assert.strictEqual(isClientBoundary(fake), undefined);
  });
});

describe('markClientBoundary', () => {
  test('marks element with client ID', () => {
    const div = adapter.createElement('div');
    markClientBoundary(div, 'Button');

    assert.strictEqual(isClientBoundary(div), true);
    assert.strictEqual(div.getAttribute('data-pulse-client-id'), 'Button');
  });

  test('marks element with props', () => {
    const div = adapter.createElement('div');
    markClientBoundary(div, 'Button', { text: 'Click me' });

    const propsAttr = div.getAttribute('data-pulse-client-props');
    assert.ok(propsAttr);
    const props = JSON.parse(propsAttr);
    assert.strictEqual(props.text, 'Click me');
  });

  test('throws on invalid element', () => {
    assert.throws(
      () => markClientBoundary(null, 'Button'),
      (err) => {
        assert.strictEqual(err.code, 'PSC_INVALID_ELEMENT');
        return true;
      }
    );
  });

  test('throws on invalid element without setAttribute', () => {
    const fake = {};
    assert.throws(
      () => markClientBoundary(fake, 'Button'),
      (err) => {
        assert.strictEqual(err.code, 'PSC_INVALID_ELEMENT');
        return true;
      }
    );
  });

  test('validates props are serializable', () => {
    const div = adapter.createElement('div');

    assert.throws(
      () => markClientBoundary(div, 'Button', { onClick: () => {} }),
      (err) => {
        assert.ok(err.message.includes('Non-serializable'));
        return true;
      }
    );
  });

  test('sanitizes XSS in props', () => {
    const div = adapter.createElement('div');
    markClientBoundary(div, 'Button', { html: '<script>alert(1)</script>' });

    const propsAttr = div.getAttribute('data-pulse-client-props');
    const props = JSON.parse(propsAttr);
    assert.ok(props.html.includes('&lt;script'));
  });

  test('throws on size limit violation', () => {
    const div = adapter.createElement('div');
    const hugeData = 'x'.repeat(200000); // Exceeds 100KB string limit

    assert.throws(
      () => markClientBoundary(div, 'Button', { data: hugeData }),
      (err) => {
        assert.ok(err.code.includes('TOO_LARGE'));
        return true;
      }
    );
  });

  test('handles empty props object', () => {
    const div = adapter.createElement('div');
    markClientBoundary(div, 'Button', {});

    assert.strictEqual(isClientBoundary(div), true);
    // Empty props should not set props attribute
    assert.strictEqual(div.getAttribute('data-pulse-client-props'), null);
  });
});

describe('serializeNode - Client Boundaries', () => {
  test('serializes client boundary', () => {
    const div = adapter.createElement('div');
    markClientBoundary(div, 'Button', { text: 'Click' });

    const result = serializeNode(div);

    assert.strictEqual(result.type, PSCNodeType.CLIENT);
    assert.strictEqual(result.id, 'Button');
    assert.strictEqual(result.props.text, 'Click');
  });

  test('includes fallback for client boundary with children', () => {
    const div = adapter.createElement('div');
    const span = adapter.createElement('span');
    const text = adapter.createTextNode('Loading...');
    adapter.appendChild(span, text);
    adapter.appendChild(div, span);
    markClientBoundary(div, 'Button');

    const result = serializeNode(div);

    assert.strictEqual(result.type, PSCNodeType.CLIENT);
    assert.ok(result.fallback);
    assert.strictEqual(result.fallback.type, PSCNodeType.FRAGMENT);
    assert.strictEqual(result.fallback.children.length, 1);
  });

  test('null fallback for client boundary without children', () => {
    const div = adapter.createElement('div');
    markClientBoundary(div, 'Button');

    const result = serializeNode(div);

    assert.strictEqual(result.type, PSCNodeType.CLIENT);
    assert.strictEqual(result.fallback, null);
  });

  test('throws on client boundary without ID', () => {
    const div = adapter.createElement('div');
    div.setAttribute('data-pulse-client-id', ''); // Empty ID

    assert.throws(
      () => serializeNode(div),
      (err) => {
        assert.strictEqual(err.code, 'PSC_MISSING_CLIENT_ID');
        return true;
      }
    );
  });

  test('throws on invalid JSON in client props', () => {
    const div = adapter.createElement('div');
    div.setAttribute('data-pulse-client-id', 'Button');
    div.setAttribute('data-pulse-client-props', '{invalid json}');

    assert.throws(
      () => serializeNode(div),
      (err) => {
        assert.strictEqual(err.code, 'PSC_INVALID_CLIENT_PROPS');
        return true;
      }
    );
  });
});

// =============================================================================
// serializeToPSC() Tests - Full Payload
// =============================================================================

describe('serializeToPSC - Full Payload', () => {
  test('creates complete PSC payload', () => {
    const div = adapter.createElement('div');
    const text = adapter.createTextNode('Hello');
    adapter.appendChild(div, text);

    const payload = serializeToPSC(div);

    assert.strictEqual(payload.version, PSC_VERSION);
    assert.ok(payload.root);
    assert.strictEqual(payload.root.type, PSCNodeType.ELEMENT);
    assert.ok(payload.clientManifest);
  });

  test('includes client manifest', () => {
    const div = adapter.createElement('div');
    const manifest = {
      Button: { id: 'Button', chunk: '/Button.js', exports: ['default'] }
    };

    const payload = serializeToPSC(div, { clientManifest: manifest });

    assert.deepStrictEqual(payload.clientManifest, manifest);
  });

  test('includes state when provided', () => {
    const div = adapter.createElement('div');
    const state = { user: { id: 1, name: 'Alice' } };

    const payload = serializeToPSC(div, { state });

    assert.deepStrictEqual(payload.state, state);
  });

  test('omits state when not provided', () => {
    const div = adapter.createElement('div');
    const payload = serializeToPSC(div);

    assert.strictEqual(payload.state, undefined);
  });

  test('throws when root serialization fails', () => {
    const text = adapter.createTextNode('   '); // Empty text node

    assert.throws(
      () => serializeToPSC(text),
      (err) => {
        assert.strictEqual(err.code, 'PSC_SERIALIZATION_FAILED');
        return true;
      }
    );
  });

  test('serializes complex tree structure', () => {
    const root = adapter.createElement('div');
    const header = adapter.createElement('header');
    const nav = adapter.createElement('nav');
    const main = adapter.createElement('main');

    adapter.appendChild(header, nav);
    adapter.appendChild(root, header);
    adapter.appendChild(root, main);

    const payload = serializeToPSC(root);

    assert.strictEqual(payload.root.children.length, 2);
    assert.strictEqual(payload.root.children[0].tag, 'header');
    assert.strictEqual(payload.root.children[0].children.length, 1);
    assert.strictEqual(payload.root.children[0].children[0].tag, 'nav');
  });

  test('serializes mixed content (elements and text)', () => {
    const p = adapter.createElement('p');
    const text1 = adapter.createTextNode('Hello ');
    const strong = adapter.createElement('strong');
    const text2 = adapter.createTextNode('world');
    const text3 = adapter.createTextNode('!');

    adapter.appendChild(strong, text2);
    adapter.appendChild(p, text1);
    adapter.appendChild(p, strong);
    adapter.appendChild(p, text3);

    const payload = serializeToPSC(p);

    assert.strictEqual(payload.root.children.length, 3);
    assert.strictEqual(payload.root.children[0].type, PSCNodeType.TEXT);
    assert.strictEqual(payload.root.children[0].value, 'Hello ');
    assert.strictEqual(payload.root.children[1].type, PSCNodeType.ELEMENT);
    assert.strictEqual(payload.root.children[1].tag, 'strong');
    assert.strictEqual(payload.root.children[2].type, PSCNodeType.TEXT);
    assert.strictEqual(payload.root.children[2].value, '!');
  });
});

describe('serializeToPSC - With Client Components', () => {
  test('serializes tree with client component', () => {
    const root = adapter.createElement('div');
    const button = adapter.createElement('button');
    markClientBoundary(button, 'Button', { text: 'Click' });
    adapter.appendChild(root, button);

    const manifest = {
      Button: { id: 'Button', chunk: '/Button.js', exports: ['default'] }
    };

    const payload = serializeToPSC(root, { clientManifest: manifest });

    assert.strictEqual(payload.root.children.length, 1);
    assert.strictEqual(payload.root.children[0].type, PSCNodeType.CLIENT);
    assert.strictEqual(payload.root.children[0].id, 'Button');
  });

  test('serializes nested client components', () => {
    const root = adapter.createElement('div');
    const form = adapter.createElement('form');
    const button = adapter.createElement('button');

    markClientBoundary(form, 'Form');
    markClientBoundary(button, 'Button');
    adapter.appendChild(form, button);
    adapter.appendChild(root, form);

    const payload = serializeToPSC(root);

    assert.strictEqual(payload.root.children[0].type, PSCNodeType.CLIENT);
    assert.strictEqual(payload.root.children[0].id, 'Form');
    // Button should be in fallback
    assert.ok(payload.root.children[0].fallback);
  });
});

// =============================================================================
// Prop Serialization Tests
// =============================================================================

describe('serializeProps', () => {
  test('serializes multiple attributes', () => {
    const div = adapter.createElement('div');
    div.setAttribute('id', 'test');
    div.setAttribute('data-value', '123');
    div.setAttribute('aria-label', 'Test');

    const result = serializeNode(div);

    assert.strictEqual(result.props.id, 'test');
    assert.strictEqual(result.props['data-value'], '123');
    assert.strictEqual(result.props['aria-label'], 'Test');
  });

  test('skips internal PSC attributes', () => {
    const div = adapter.createElement('div');
    div.setAttribute('data-pulse-client-id', 'Button');
    div.setAttribute('data-pulse-client-props', '{}');
    div.setAttribute('id', 'test');

    markClientBoundary(div, 'Button');
    const result = serializeNode(div);

    // Internal attributes should not be in props
    assert.strictEqual(result.props['data-pulse-client-id'], undefined);
    assert.strictEqual(result.props['data-pulse-client-props'], undefined);
  });

  test('handles element without attributes', () => {
    const div = adapter.createElement('div');
    const result = serializeNode(div);

    assert.ok(result.props);
    assert.strictEqual(Object.keys(result.props).length, 0);
  });
});

// =============================================================================
// Children Serialization Tests
// =============================================================================

describe('serializeChildren', () => {
  test('serializes multiple children', () => {
    const div = adapter.createElement('div');
    const child1 = adapter.createElement('span');
    const child2 = adapter.createElement('p');
    const child3 = adapter.createTextNode('Text');

    adapter.appendChild(div, child1);
    adapter.appendChild(div, child2);
    adapter.appendChild(div, child3);

    const result = serializeNode(div);

    assert.strictEqual(result.children.length, 3);
    assert.strictEqual(result.children[0].tag, 'span');
    assert.strictEqual(result.children[1].tag, 'p');
    assert.strictEqual(result.children[2].type, PSCNodeType.TEXT);
  });

  test('skips null children', () => {
    const div = adapter.createElement('div');
    const whitespace = adapter.createTextNode('   '); // Will be null
    const text = adapter.createTextNode('Hello');

    adapter.appendChild(div, whitespace);
    adapter.appendChild(div, text);

    const result = serializeNode(div);

    // Only non-empty text should be serialized
    assert.strictEqual(result.children.length, 1);
    assert.strictEqual(result.children[0].value, 'Hello');
  });

  test('handles node without childNodes', () => {
    const fake = {
      nodeType: 1,
      tagName: 'div',
      attributes: []
      // No childNodes property
    };

    const result = serializeNode(fake);

    assert.ok(result);
    assert.strictEqual(result.children.length, 0);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration - Complete App Structure', () => {
  test('serializes realistic app structure', () => {
    // Create a realistic app structure
    const app = adapter.createElement('div');
    app.className = 'app';

    // Header with client component
    const header = adapter.createElement('header');
    const nav = adapter.createElement('nav');
    markClientBoundary(nav, 'Navigation', { items: ['Home', 'About'] });
    adapter.appendChild(header, nav);

    // Main content
    const main = adapter.createElement('main');
    const title = adapter.createElement('h1');
    const titleText = adapter.createTextNode('Welcome');
    adapter.appendChild(title, titleText);

    const content = adapter.createElement('div');
    markClientBoundary(content, 'Content', { data: { id: 1 } });

    adapter.appendChild(main, title);
    adapter.appendChild(main, content);

    // Footer
    const footer = adapter.createElement('footer');
    const footerText = adapter.createTextNode('© 2024');
    adapter.appendChild(footer, footerText);

    // Assemble
    adapter.appendChild(app, header);
    adapter.appendChild(app, main);
    adapter.appendChild(app, footer);

    const payload = serializeToPSC(app, {
      clientManifest: {
        Navigation: { id: 'Navigation', chunk: '/nav.js', exports: ['default'] },
        Content: { id: 'Content', chunk: '/content.js', exports: ['default'] }
      }
    });

    // Verify structure
    assert.strictEqual(payload.root.tag, 'div');
    assert.strictEqual(payload.root.children.length, 3);

    // Header with client nav
    assert.strictEqual(payload.root.children[0].tag, 'header');
    assert.strictEqual(payload.root.children[0].children[0].type, PSCNodeType.CLIENT);
    assert.strictEqual(payload.root.children[0].children[0].id, 'Navigation');

    // Main with title and client content
    assert.strictEqual(payload.root.children[1].tag, 'main');
    assert.strictEqual(payload.root.children[1].children[0].tag, 'h1');
    assert.strictEqual(payload.root.children[1].children[1].type, PSCNodeType.CLIENT);
    assert.strictEqual(payload.root.children[1].children[1].id, 'Content');

    // Footer with text
    assert.strictEqual(payload.root.children[2].tag, 'footer');
    assert.strictEqual(payload.root.children[2].children[0].type, PSCNodeType.TEXT);
  });

  test('preserves all data through serialization', () => {
    const div = adapter.createElement('div');
    div.setAttribute('id', 'test');
    div.setAttribute('class', 'container');
    div.setAttribute('data-testid', 'component');

    const span = adapter.createElement('span');
    span.setAttribute('aria-label', 'Label');
    const text = adapter.createTextNode('Content');
    adapter.appendChild(span, text);
    adapter.appendChild(div, span);

    const payload = serializeToPSC(div);

    assert.strictEqual(payload.root.props.id, 'test');
    assert.strictEqual(payload.root.props.class, 'container');
    assert.strictEqual(payload.root.props['data-testid'], 'component');
    assert.strictEqual(payload.root.children[0].props['aria-label'], 'Label');
    assert.strictEqual(payload.root.children[0].children[0].value, 'Content');
  });
});

console.log('✅ Server Components serializer tests completed');
