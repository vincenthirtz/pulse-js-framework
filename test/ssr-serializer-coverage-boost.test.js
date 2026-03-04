/**
 * SSR Serializer - Coverage Boost Tests
 *
 * Targets uncovered branches and edge cases in runtime/ssr-serializer.js:
 * - serializeChildren() function
 * - Pretty-print mode (indent, indentStr, newlines)
 * - Document fragment serialization (nodeType 11)
 * - Unknown node type returns empty string
 * - Comment data sanitization (-- and > chars)
 * - Style object serialization (camelCase → kebab-case)
 * - Boolean attributes: 'true', true, name-matching, ''
 * - Event handler attributes skipped (on* attrs)
 * - escapeAttr() edge cases
 * - Null / undefined inputs
 *
 * @module test/ssr-serializer-coverage-boost
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

import {
  serializeToHTML,
  serializeChildren,
  escapeHTML,
  escapeAttr,
} from '../runtime/ssr-serializer.js';

// Access internal constants via default export
import mod from '../runtime/ssr-serializer.js';
const { VOID_ELEMENTS, BOOLEAN_ATTRS } = mod;

import {
  MockDOMAdapter,
} from '../runtime/dom-adapter.js';

// Helper: create a fresh adapter
function mkAdapter() {
  return new MockDOMAdapter();
}

// ============================================================================
// escapeHTML edge cases
// ============================================================================

describe('escapeHTML - edge cases', () => {
  test('returns empty string for null', () => {
    assert.strictEqual(escapeHTML(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(escapeHTML(undefined), '');
  });

  test('converts numbers to string before escaping', () => {
    assert.strictEqual(escapeHTML(42), '42');
  });

  test('handles already-safe strings unchanged', () => {
    assert.strictEqual(escapeHTML('hello world'), 'hello world');
  });

  test('escapes all HTML special chars in one string', () => {
    assert.strictEqual(escapeHTML('<a & b>'), '&lt;a &amp; b&gt;');
  });
});

// ============================================================================
// escapeAttr edge cases
// ============================================================================

describe('escapeAttr - edge cases', () => {
  test('returns empty string for null', () => {
    assert.strictEqual(escapeAttr(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(escapeAttr(undefined), '');
  });

  test('escapes double quotes', () => {
    assert.strictEqual(escapeAttr('"hello"'), '&quot;hello&quot;');
  });

  test('escapes all special chars', () => {
    assert.strictEqual(escapeAttr('<a & b>'), '&lt;a &amp; b&gt;');
  });

  test('converts number to string', () => {
    assert.strictEqual(escapeAttr(0), '0');
  });
});

// ============================================================================
// serializeToHTML - null/undefined input
// ============================================================================

describe('serializeToHTML - null/undefined', () => {
  test('returns empty string for null', () => {
    assert.strictEqual(serializeToHTML(null), '');
  });

  test('returns empty string for undefined', () => {
    assert.strictEqual(serializeToHTML(undefined), '');
  });
});

// ============================================================================
// serializeToHTML - comment node sanitization
// ============================================================================

describe('serializeToHTML - comment sanitization', () => {
  const adapter = mkAdapter();

  test('serializes a plain comment', () => {
    const comment = adapter.createComment('safe comment');
    const html = serializeToHTML(comment);
    assert.ok(html.includes('safe comment'), 'Should include comment text');
    assert.ok(html.startsWith('<!--'), 'Should start with <!--');
    assert.ok(html.endsWith('-->'), 'Should end with -->');
  });

  test('sanitizes double dashes in comment data', () => {
    // "-- foo --" would cause a premature close if not escaped.
    const comment = adapter.createComment('-- bad comment --');
    const html = serializeToHTML(comment);
    // Extract the inner data (between <!-- and the closing -->)
    // The closing --> is always there; we verify the *data portion* has no bare "--"
    const inner = html.slice(4, html.length - 3); // strip <!-- and -->
    assert.ok(!inner.includes('--'), `Inner comment data should not contain bare "--": got "${inner}"`);
  });

  test('serializes comment with node.data property', () => {
    const comment = adapter.createComment('my note');
    // Access via both data and textContent
    const html = serializeToHTML(comment);
    assert.ok(html.includes('my note'));
  });
});

// ============================================================================
// serializeToHTML - document fragment (nodeType 11)
// ============================================================================

describe('serializeToHTML - document fragment', () => {
  const adapter = mkAdapter();

  test('serializes empty fragment as empty string', () => {
    const frag = adapter.createDocumentFragment();
    assert.strictEqual(serializeToHTML(frag), '');
  });

  test('serializes fragment with one child', () => {
    const frag = adapter.createDocumentFragment();
    const span = adapter.createElement('span');
    adapter.appendChild(frag, span);
    const html = serializeToHTML(frag);
    assert.strictEqual(html, '<span></span>');
  });

  test('serializes fragment with multiple children', () => {
    const frag = adapter.createDocumentFragment();
    const p1 = adapter.createElement('p');
    const p2 = adapter.createElement('p');
    adapter.appendChild(frag, p1);
    adapter.appendChild(frag, p2);
    const html = serializeToHTML(frag);
    assert.strictEqual(html, '<p></p><p></p>');
  });
});

// ============================================================================
// serializeToHTML - unknown node type
// ============================================================================

describe('serializeToHTML - unknown node type', () => {
  test('returns empty string for unknown node type', () => {
    const fakeNode = { nodeType: 99, tagName: 'div' };
    assert.strictEqual(serializeToHTML(fakeNode), '');
  });
});

// ============================================================================
// serializeToHTML - pretty print
// ============================================================================

describe('serializeToHTML - pretty print', () => {
  const adapter = mkAdapter();

  test('adds newlines and indentation with pretty=true', () => {
    const div = adapter.createElement('div');
    const span = adapter.createElement('span');
    adapter.appendChild(span, adapter.createTextNode('hi'));
    adapter.appendChild(div, span);

    const html = serializeToHTML(div, { pretty: true });
    assert.ok(html.includes('\n'), 'Pretty print should include newlines');
    assert.ok(html.includes('  '), 'Pretty print should include indentation');
  });

  test('uses custom indentStr', () => {
    const div = adapter.createElement('div');
    const span = adapter.createElement('span');
    adapter.appendChild(div, span);

    const html = serializeToHTML(div, { pretty: true, indentStr: '\t' });
    assert.ok(html.includes('\t'), 'Should use tab indentation');
  });

  test('without pretty, no extra whitespace added', () => {
    const div = adapter.createElement('div');
    const span = adapter.createElement('span');
    adapter.appendChild(div, span);

    const html = serializeToHTML(div, { pretty: false });
    assert.strictEqual(html, '<div><span></span></div>');
  });

  test('fragment with pretty=true joins with newlines', () => {
    const frag = adapter.createDocumentFragment();
    adapter.appendChild(frag, adapter.createElement('p'));
    adapter.appendChild(frag, adapter.createElement('p'));

    const html = serializeToHTML(frag, { pretty: true });
    assert.ok(html.includes('\n'));
  });
});

// ============================================================================
// serializeToHTML - boolean attributes
// ============================================================================

describe('serializeToHTML - boolean attributes', () => {
  const adapter = mkAdapter();

  test('renders boolean attr when value is "true"', () => {
    const input = adapter.createElement('input');
    input.setAttribute('disabled', 'true');
    const html = serializeToHTML(input);
    assert.ok(html.includes('disabled'), 'disabled attr should be present');
    assert.ok(!html.includes('disabled="'), 'boolean attr should not have value');
  });

  test('renders boolean attr when value is attribute name', () => {
    const input = adapter.createElement('input');
    input.setAttribute('required', 'required');
    const html = serializeToHTML(input);
    assert.ok(html.includes('required'));
  });

  test('renders boolean attr when value is empty string', () => {
    const input = adapter.createElement('input');
    input.setAttribute('readonly', '');
    const html = serializeToHTML(input);
    assert.ok(html.includes('readonly'));
  });

  test('omits boolean attr when value is "false"', () => {
    const input = adapter.createElement('input');
    input.setAttribute('disabled', 'false');
    const html = serializeToHTML(input);
    assert.ok(!html.includes('disabled'), 'disabled should be absent for value=false');
  });
});

// ============================================================================
// serializeToHTML - style serialization
// ============================================================================

describe('serializeToHTML - style serialization', () => {
  const adapter = mkAdapter();

  test('serializes camelCase style properties to kebab-case', () => {
    const div = adapter.createElement('div');
    div._style = { backgroundColor: 'red', fontSize: '16px' };

    const html = serializeToHTML(div);
    assert.ok(html.includes('background-color: red'), 'camelCase → kebab-case');
    assert.ok(html.includes('font-size: 16px'));
  });

  test('omits null/empty style values', () => {
    const div = adapter.createElement('div');
    div._style = { color: null, margin: '', padding: '10px' };

    const html = serializeToHTML(div);
    assert.ok(!html.includes('color:'), 'null style value should be omitted');
    assert.ok(!html.includes('margin:'), 'empty style value should be omitted');
    assert.ok(html.includes('padding: 10px'));
  });

  test('handles no style gracefully', () => {
    const div = adapter.createElement('div');
    // No _style set
    const html = serializeToHTML(div);
    assert.ok(!html.includes('style='), 'Should not include style attr when no styles');
  });
});

// ============================================================================
// serializeToHTML - void elements
// ============================================================================

describe('serializeToHTML - void elements', () => {
  const adapter = mkAdapter();

  test('all standard void elements are self-closing', () => {
    for (const tag of ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'wbr']) {
      const el = adapter.createElement(tag);
      const html = serializeToHTML(el);
      assert.ok(html.startsWith(`<${tag}`), `<${tag}> should start with tag`);
      assert.ok(!html.includes(`</${tag}>`), `<${tag}> should not have closing tag`);
    }
  });

  test('VOID_ELEMENTS set contains expected elements', () => {
    assert.ok(VOID_ELEMENTS.has('input'));
    assert.ok(VOID_ELEMENTS.has('br'));
    assert.ok(VOID_ELEMENTS.has('img'));
    assert.ok(!VOID_ELEMENTS.has('div'));
    assert.ok(!VOID_ELEMENTS.has('span'));
  });
});

// ============================================================================
// serializeChildren()
// ============================================================================

describe('serializeChildren()', () => {
  const adapter = mkAdapter();

  test('returns empty string for null node', () => {
    assert.strictEqual(serializeChildren(null), '');
  });

  test('returns empty string for node without childNodes', () => {
    assert.strictEqual(serializeChildren({}), '');
  });

  test('serializes all children of a node', () => {
    const div = adapter.createElement('div');
    const span = adapter.createElement('span');
    const text = adapter.createTextNode('hello');
    adapter.appendChild(div, span);
    adapter.appendChild(div, text);

    const html = serializeChildren(div);
    assert.strictEqual(html, '<span></span>hello');
  });

  test('excludes the wrapper element itself', () => {
    const div = adapter.createElement('div');
    div.id = 'wrapper';
    const p = adapter.createElement('p');
    adapter.appendChild(div, p);

    const html = serializeChildren(div);
    assert.ok(!html.includes('id="wrapper"'), 'Wrapper element should not appear in output');
    assert.strictEqual(html, '<p></p>');
  });

  test('serializes children with pretty=true', () => {
    const div = adapter.createElement('div');
    adapter.appendChild(div, adapter.createElement('span'));
    adapter.appendChild(div, adapter.createElement('span'));

    const html = serializeChildren(div, { pretty: true });
    assert.ok(html.includes('\n'));
  });

  test('handles empty children list', () => {
    const div = adapter.createElement('div');
    // No children added
    assert.strictEqual(serializeChildren(div), '');
  });
});

// ============================================================================
// BOOLEAN_ATTRS constant
// ============================================================================

describe('BOOLEAN_ATTRS constant', () => {
  test('includes standard boolean attributes', () => {
    const expected = ['disabled', 'checked', 'readonly', 'required', 'autofocus', 'multiple', 'selected', 'hidden'];
    for (const attr of expected) {
      assert.ok(BOOLEAN_ATTRS.has(attr), `BOOLEAN_ATTRS should include "${attr}"`);
    }
  });

  test('includes media-related boolean attrs', () => {
    assert.ok(BOOLEAN_ATTRS.has('autoplay'));
    assert.ok(BOOLEAN_ATTRS.has('controls'));
    assert.ok(BOOLEAN_ATTRS.has('loop'));
    assert.ok(BOOLEAN_ATTRS.has('muted'));
  });

  test('does not include regular attrs', () => {
    assert.ok(!BOOLEAN_ATTRS.has('class'));
    assert.ok(!BOOLEAN_ATTRS.has('id'));
    assert.ok(!BOOLEAN_ATTRS.has('href'));
    assert.ok(!BOOLEAN_ATTRS.has('src'));
  });
});
