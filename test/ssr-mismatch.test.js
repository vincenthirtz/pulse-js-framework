/**
 * SSR Mismatch Detection Tests
 *
 * Comprehensive tests for hydration mismatch detection:
 * MismatchType enum, diffNodes, logMismatches, getSuggestion,
 * attribute diffing, recursive children diffing, and edge cases.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  MismatchType,
  diffNodes,
  logMismatches,
  getSuggestion
} from '../runtime/ssr-mismatch.js';

import {
  MockElement,
  MockTextNode,
  MockCommentNode
} from '../runtime/dom-adapter.js';

// ============================================================================
// MismatchType Enum Tests
// ============================================================================

describe('MismatchType', () => {
  test('has TAG type', () => {
    assert.strictEqual(MismatchType.TAG, 'tag');
  });

  test('has TEXT type', () => {
    assert.strictEqual(MismatchType.TEXT, 'text');
  });

  test('has ATTRIBUTE type', () => {
    assert.strictEqual(MismatchType.ATTRIBUTE, 'attribute');
  });

  test('has CHILDREN type', () => {
    assert.strictEqual(MismatchType.CHILDREN, 'children');
  });

  test('has EXTRA_NODE type', () => {
    assert.strictEqual(MismatchType.EXTRA_NODE, 'extra');
  });

  test('has MISSING_NODE type', () => {
    assert.strictEqual(MismatchType.MISSING_NODE, 'missing');
  });

  test('contains exactly 6 types', () => {
    assert.strictEqual(Object.keys(MismatchType).length, 6);
  });
});

// ============================================================================
// diffNodes - Basic Tests
// ============================================================================

describe('diffNodes - basic', () => {
  test('returns empty array for two null nodes', () => {
    const reports = diffNodes(null, null);
    assert.deepStrictEqual(reports, []);
  });

  test('detects extra client node when server is null', () => {
    const client = new MockElement('div');
    const reports = diffNodes(null, client);

    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0].type, MismatchType.EXTRA_NODE);
    assert.strictEqual(reports[0].expected, '(nothing)');
    assert.ok(reports[0].actual.includes('<div>'));
  });

  test('detects missing node when client is null', () => {
    const server = new MockElement('div');
    const reports = diffNodes(server, null);

    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0].type, MismatchType.MISSING_NODE);
    assert.ok(reports[0].expected.includes('<div>'));
    assert.strictEqual(reports[0].actual, '(nothing)');
  });

  test('returns empty array for matching elements', () => {
    const server = new MockElement('div');
    const client = new MockElement('div');
    const reports = diffNodes(server, client);

    assert.strictEqual(reports.length, 0);
  });
});

// ============================================================================
// diffNodes - Tag Mismatches
// ============================================================================

describe('diffNodes - tag mismatches', () => {
  test('detects different tag names', () => {
    const server = new MockElement('div');
    const client = new MockElement('span');
    const reports = diffNodes(server, client);

    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0].type, MismatchType.TAG);
    assert.ok(reports[0].expected.includes('<div>'));
    assert.ok(reports[0].actual.includes('<span>'));
  });

  test('detects different node types (element vs text)', () => {
    const server = new MockElement('div');
    const client = new MockTextNode('text');
    const reports = diffNodes(server, client);

    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0].type, MismatchType.TAG);
  });

  test('includes path in tag mismatch report', () => {
    const server = new MockElement('div');
    const client = new MockElement('span');
    const reports = diffNodes(server, client, 'body > main');

    assert.ok(reports[0].path.includes('body > main'));
  });
});

// ============================================================================
// diffNodes - Text Mismatches
// ============================================================================

describe('diffNodes - text mismatches', () => {
  test('detects different text content', () => {
    const server = new MockTextNode('Hello Server');
    const client = new MockTextNode('Hello Client');
    const reports = diffNodes(server, client);

    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0].type, MismatchType.TEXT);
    assert.ok(reports[0].expected.includes('Hello Server'));
    assert.ok(reports[0].actual.includes('Hello Client'));
  });

  test('returns empty for matching text (ignoring whitespace)', () => {
    const server = new MockTextNode('  Hello  ');
    const client = new MockTextNode('Hello');
    const reports = diffNodes(server, client);

    assert.strictEqual(reports.length, 0);
  });

  test('detects empty vs non-empty text', () => {
    const server = new MockTextNode('Content');
    const client = new MockTextNode('   ');
    const reports = diffNodes(server, client);

    assert.strictEqual(reports.length, 1);
    assert.strictEqual(reports[0].type, MismatchType.TEXT);
  });

  test('truncates long text in reports', () => {
    const longText = 'A'.repeat(200);
    const server = new MockTextNode(longText);
    const client = new MockTextNode('Short');
    const reports = diffNodes(server, client);

    assert.strictEqual(reports.length, 1);
    assert.ok(reports[0].expected.length <= 83); // 80 + "..."
  });
});

// ============================================================================
// diffNodes - Attribute Mismatches
// ============================================================================

describe('diffNodes - attribute mismatches', () => {
  test('detects missing client attribute', () => {
    const server = new MockElement('div');
    server.setAttribute('data-id', '123');
    const client = new MockElement('div');

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r =>
      r.type === MismatchType.ATTRIBUTE &&
      r.expected.includes('data-id') &&
      r.actual.includes('missing')
    ));
  });

  test('detects extra client attribute', () => {
    const server = new MockElement('div');
    const client = new MockElement('div');
    client.setAttribute('data-extra', 'value');

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r =>
      r.type === MismatchType.ATTRIBUTE &&
      r.actual.includes('data-extra')
    ));
  });

  test('detects different attribute values', () => {
    const server = new MockElement('div');
    server.setAttribute('class', 'active');
    const client = new MockElement('div');
    client.setAttribute('class', 'inactive');

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r =>
      r.type === MismatchType.ATTRIBUTE &&
      r.expected.includes('active') &&
      r.actual.includes('inactive')
    ));
  });

  test('no report for matching attributes', () => {
    const server = new MockElement('div');
    server.setAttribute('data-id', '123');
    const client = new MockElement('div');
    client.setAttribute('data-id', '123');

    const reports = diffNodes(server, client);

    assert.strictEqual(reports.filter(r => r.type === MismatchType.ATTRIBUTE).length, 0);
  });

  test('compares id and className from MockElement', () => {
    const server = new MockElement('div');
    server.id = 'main';
    server.className = 'container';
    const client = new MockElement('div');
    client.id = 'main';
    client.className = 'wrapper';

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r =>
      r.type === MismatchType.ATTRIBUTE &&
      r.expected.includes('container') &&
      r.actual.includes('wrapper')
    ));
  });
});

// ============================================================================
// diffNodes - Children Mismatches
// ============================================================================

describe('diffNodes - children mismatches', () => {
  test('detects different number of children', () => {
    const server = new MockElement('div');
    server.appendChild(new MockElement('span'));
    server.appendChild(new MockElement('p'));

    const client = new MockElement('div');
    client.appendChild(new MockElement('span'));

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r =>
      r.type === MismatchType.CHILDREN &&
      r.expected.includes('2 children') &&
      r.actual.includes('1 children')
    ));
  });

  test('recursively diffs matching children', () => {
    const server = new MockElement('div');
    const serverChild = new MockElement('span');
    serverChild.appendChild(new MockTextNode('Server text'));
    server.appendChild(serverChild);

    const client = new MockElement('div');
    const clientChild = new MockElement('span');
    clientChild.appendChild(new MockTextNode('Client text'));
    client.appendChild(clientChild);

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r => r.type === MismatchType.TEXT));
  });

  test('skips comment nodes in children comparison', () => {
    const server = new MockElement('div');
    server.appendChild(new MockCommentNode('comment'));
    server.appendChild(new MockElement('span'));

    const client = new MockElement('div');
    client.appendChild(new MockElement('span'));

    const reports = diffNodes(server, client);

    // Comments are filtered out, so children count should match
    assert.ok(!reports.some(r => r.type === MismatchType.CHILDREN));
  });

  test('child path includes nth-child notation', () => {
    const server = new MockElement('ul');
    const serverLi1 = new MockElement('li');
    serverLi1.appendChild(new MockTextNode('Item A'));
    const serverLi2 = new MockElement('li');
    serverLi2.appendChild(new MockTextNode('Item B'));
    server.appendChild(serverLi1);
    server.appendChild(serverLi2);

    const client = new MockElement('ul');
    const clientLi1 = new MockElement('li');
    clientLi1.appendChild(new MockTextNode('Item A'));
    const clientLi2 = new MockElement('li');
    clientLi2.appendChild(new MockTextNode('Item C'));
    client.appendChild(clientLi1);
    client.appendChild(clientLi2);

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r =>
      r.type === MismatchType.TEXT &&
      r.path.includes(':nth-child(2)')
    ));
  });
});

// ============================================================================
// diffNodes - Recursive & Deep Tests
// ============================================================================

describe('diffNodes - deep trees', () => {
  test('diffs deeply nested elements', () => {
    const server = new MockElement('div');
    const serverInner = new MockElement('section');
    const serverDeep = new MockElement('p');
    serverDeep.appendChild(new MockTextNode('Server'));
    serverInner.appendChild(serverDeep);
    server.appendChild(serverInner);

    const client = new MockElement('div');
    const clientInner = new MockElement('section');
    const clientDeep = new MockElement('p');
    clientDeep.appendChild(new MockTextNode('Client'));
    clientInner.appendChild(clientDeep);
    client.appendChild(clientInner);

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r => r.type === MismatchType.TEXT));
    assert.ok(reports.some(r => r.path.includes('section')));
  });

  test('handles identical deep trees with no mismatches', () => {
    const createTree = () => {
      const root = new MockElement('div');
      const child = new MockElement('ul');
      for (let i = 0; i < 3; i++) {
        const li = new MockElement('li');
        li.appendChild(new MockTextNode(`Item ${i}`));
        child.appendChild(li);
      }
      root.appendChild(child);
      return root;
    };

    const reports = diffNodes(createTree(), createTree());
    assert.strictEqual(reports.length, 0);
  });

  test('handles elements with mixed children types', () => {
    const server = new MockElement('div');
    server.appendChild(new MockTextNode('Text'));
    server.appendChild(new MockElement('br'));
    server.appendChild(new MockTextNode('More'));

    const client = new MockElement('div');
    client.appendChild(new MockTextNode('Text'));
    client.appendChild(new MockElement('br'));
    client.appendChild(new MockTextNode('Different'));

    const reports = diffNodes(server, client);

    assert.ok(reports.some(r => r.type === MismatchType.TEXT));
  });
});

// ============================================================================
// getSuggestion Tests
// ============================================================================

describe('getSuggestion', () => {
  test('returns suggestion for TAG mismatch', () => {
    const suggestion = getSuggestion(MismatchType.TAG, {
      serverTag: 'div',
      clientTag: 'span'
    });

    assert.ok(suggestion.includes('div'));
    assert.ok(suggestion.includes('span'));
    assert.ok(suggestion.includes('consistent'));
  });

  test('returns suggestion for TEXT mismatch', () => {
    const suggestion = getSuggestion(MismatchType.TEXT, {
      serverText: 'Hello',
      clientText: 'World'
    });

    assert.ok(suggestion.includes('Text content'));
    assert.ok(typeof suggestion === 'string');
    assert.ok(suggestion.length > 0);
  });

  test('detects timestamp in TEXT mismatch', () => {
    const suggestion = getSuggestion(MismatchType.TEXT, {
      serverText: '2024-01-15T12:00:00Z',
      clientText: '2024-01-15T12:00:01Z'
    });

    assert.ok(suggestion.includes('timestamp'));
  });

  test('detects unix timestamp in TEXT mismatch', () => {
    const suggestion = getSuggestion(MismatchType.TEXT, {
      serverText: '1705312800000',
      clientText: '1705312801000'
    });

    assert.ok(suggestion.includes('timestamp'));
  });

  test('detects time-like pattern in TEXT mismatch', () => {
    const suggestion = getSuggestion(MismatchType.TEXT, {
      serverText: 'Updated at 12:30:00',
      clientText: 'Updated at 12:30:01'
    });

    assert.ok(suggestion.includes('timestamp'));
  });

  test('returns suggestion for CHILDREN mismatch with extra client children', () => {
    const suggestion = getSuggestion(MismatchType.CHILDREN, {
      serverCount: 2,
      clientCount: 5
    });

    assert.ok(suggestion.includes('3 extra children'));
    assert.ok(suggestion.includes('ClientOnly'));
  });

  test('returns suggestion for CHILDREN mismatch with extra server children', () => {
    const suggestion = getSuggestion(MismatchType.CHILDREN, {
      serverCount: 5,
      clientCount: 2
    });

    assert.ok(suggestion.includes('3 extra children'));
    assert.ok(suggestion.includes('server'));
  });

  test('returns suggestion for EXTRA_NODE', () => {
    const suggestion = getSuggestion(MismatchType.EXTRA_NODE, {});

    assert.ok(suggestion.includes('extra node'));
    assert.ok(suggestion.includes('ClientOnly'));
  });

  test('returns suggestion for MISSING_NODE', () => {
    const suggestion = getSuggestion(MismatchType.MISSING_NODE, {});

    assert.ok(suggestion.includes('Server rendered'));
    assert.ok(suggestion.includes('ServerOnly'));
  });

  test('returns suggestion for ATTRIBUTE mismatch', () => {
    const suggestion = getSuggestion(MismatchType.ATTRIBUTE, {});

    assert.ok(suggestion.includes('Attribute'));
    assert.ok(typeof suggestion === 'string');
  });

  test('returns generic suggestion for unknown type', () => {
    const suggestion = getSuggestion('unknown-type', {});

    assert.ok(suggestion.includes('Hydration mismatch'));
  });

  test('TAG suggestion uses node objects when tags not provided', () => {
    const serverNode = new MockElement('article');
    const clientNode = new MockElement('section');

    const suggestion = getSuggestion(MismatchType.TAG, { serverNode, clientNode });

    assert.ok(suggestion.includes('article'));
    assert.ok(suggestion.includes('section'));
  });
});

// ============================================================================
// logMismatches Tests
// ============================================================================

describe('logMismatches', () => {
  let originalWarn;
  let warnings;

  beforeEach(() => {
    warnings = [];
    originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args.join(' '));
  });

  afterEach(() => {
    console.warn = originalWarn;
  });

  test('does nothing for empty reports', () => {
    logMismatches([]);
    assert.strictEqual(warnings.length, 0);
  });

  test('does nothing for null reports', () => {
    logMismatches(null);
    assert.strictEqual(warnings.length, 0);
  });

  test('does nothing for undefined reports', () => {
    logMismatches(undefined);
    assert.strictEqual(warnings.length, 0);
  });

  test('logs header with mismatch count', () => {
    logMismatches([{
      type: MismatchType.TAG,
      path: 'div',
      expected: '<div>',
      actual: '<span>',
      suggestion: 'Fix it'
    }]);

    assert.ok(warnings[0].includes('1 mismatch'));
  });

  test('pluralizes for multiple mismatches', () => {
    logMismatches([
      { type: MismatchType.TAG, path: 'a', expected: 'x', actual: 'y', suggestion: 's' },
      { type: MismatchType.TEXT, path: 'b', expected: 'x', actual: 'y', suggestion: 's' }
    ]);

    assert.ok(warnings[0].includes('2 mismatches'));
  });

  test('logs each mismatch with numbered format', () => {
    logMismatches([{
      type: MismatchType.TAG,
      path: 'body > div',
      expected: '<div>',
      actual: '<span>',
      suggestion: 'Fix the element type'
    }]);

    // Should have header + mismatch detail + tip
    assert.ok(warnings.length >= 2);
    assert.ok(warnings.some(w => w.includes('1.')));
    assert.ok(warnings.some(w => w.includes('[TAG]')));
    assert.ok(warnings.some(w => w.includes('body > div')));
    assert.ok(warnings.some(w => w.includes('Server:')));
    assert.ok(warnings.some(w => w.includes('Client:')));
  });

  test('includes suggestion with arrow marker', () => {
    logMismatches([{
      type: MismatchType.TEXT,
      path: '(text)',
      expected: 'Hello',
      actual: 'World',
      suggestion: 'Check for dynamic values'
    }]);

    assert.ok(warnings.some(w => w.includes('Check for dynamic values')));
  });

  test('logs help tip at the end', () => {
    logMismatches([{
      type: MismatchType.TAG,
      path: 'a',
      expected: 'x',
      actual: 'y',
      suggestion: 's'
    }]);

    const lastWarning = warnings[warnings.length - 1];
    assert.ok(lastWarning.includes('pulse-js.fr'));
    assert.ok(lastWarning.includes('Hydration mismatches'));
  });

  test('logs multiple mismatches with correct numbering', () => {
    const reports = [
      { type: MismatchType.TAG, path: 'a', expected: 'x1', actual: 'y1', suggestion: 's1' },
      { type: MismatchType.TEXT, path: 'b', expected: 'x2', actual: 'y2', suggestion: 's2' },
      { type: MismatchType.ATTRIBUTE, path: 'c', expected: 'x3', actual: 'y3', suggestion: 's3' }
    ];

    logMismatches(reports);

    const allWarnings = warnings.join('\n');
    assert.ok(allWarnings.includes('1.'));
    assert.ok(allWarnings.includes('2.'));
    assert.ok(allWarnings.includes('3.'));
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('diffNodes - edge cases', () => {
  test('uses (root) as default path', () => {
    const reports = diffNodes(null, new MockElement('div'));
    assert.strictEqual(reports[0].path, '(root)');
  });

  test('uses (text) as default path for text nodes', () => {
    const server = new MockTextNode('A');
    const client = new MockTextNode('B');
    const reports = diffNodes(server, client);
    assert.strictEqual(reports[0].path, '(text)');
  });

  test('handles comment nodes in description', () => {
    const server = new MockCommentNode('comment text');
    const client = new MockElement('div');
    const reports = diffNodes(server, client);

    assert.ok(reports.length > 0);
    assert.strictEqual(reports[0].type, MismatchType.TAG);
  });

  test('describes element with id and class', () => {
    const server = new MockElement('div');
    server.id = 'main';
    server.className = 'container';
    const reports = diffNodes(null, server);

    assert.ok(reports[0].actual.includes('#main'));
    assert.ok(reports[0].actual.includes('.container'));
  });

  test('handles node with null textContent', () => {
    const server = { nodeType: 3, textContent: null };
    const client = { nodeType: 3, textContent: null };
    const reports = diffNodes(server, client);
    assert.strictEqual(reports.length, 0);
  });

  test('handles element with no childNodes', () => {
    const server = new MockElement('br');
    const client = new MockElement('br');
    const reports = diffNodes(server, client);
    assert.strictEqual(reports.length, 0);
  });
});

console.log('SSR Mismatch Detection tests loaded');
