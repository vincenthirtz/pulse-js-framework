/**
 * SSR Streaming Tests
 *
 * Comprehensive tests for streaming server-side rendering:
 * SSRStreamContext, boundary markers, replacement scripts,
 * renderToStream, renderToReadableStream, and the runtime script.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import ssrStreamModule, {
  SSRStreamContext,
  createBoundaryStart,
  createBoundaryEnd,
  createBoundaryMarker,
  createReplacementScript,
  renderToStream,
  renderToReadableStream
} from '../runtime/ssr-stream.js';

const { STREAMING_RUNTIME_SCRIPT } = ssrStreamModule;

import {
  MockDOMAdapter,
  MockElement,
  MockTextNode,
  setAdapter,
  resetAdapter
} from '../runtime/dom-adapter.js';

import { resetContext } from '../runtime/pulse.js';

// ============================================================================
// SSRStreamContext Tests
// ============================================================================

describe('SSRStreamContext', () => {
  test('initializes with default values', () => {
    const ctx = new SSRStreamContext();

    assert.strictEqual(ctx._nextId, 0);
    assert.strictEqual(ctx.boundaries.size, 0);
    assert.strictEqual(ctx.shellFlushed, false);
    assert.strictEqual(ctx.timeout, 10000);
    assert.strictEqual(ctx.onShellError, null);
    assert.strictEqual(ctx.onBoundaryError, null);
  });

  test('accepts custom options', () => {
    const onShellError = () => {};
    const onBoundaryError = () => {};
    const ctx = new SSRStreamContext({
      timeout: 5000,
      onShellError,
      onBoundaryError
    });

    assert.strictEqual(ctx.timeout, 5000);
    assert.strictEqual(ctx.onShellError, onShellError);
    assert.strictEqual(ctx.onBoundaryError, onBoundaryError);
  });

  test('createBoundary returns incrementing IDs', () => {
    const ctx = new SSRStreamContext();

    assert.strictEqual(ctx.createBoundary(), 0);
    assert.strictEqual(ctx.createBoundary(), 1);
    assert.strictEqual(ctx.createBoundary(), 2);
  });

  test('registerBoundary stores boundary data', () => {
    const ctx = new SSRStreamContext();
    const promise = Promise.resolve('content');

    ctx.registerBoundary(0, promise, '<div>Loading...</div>');

    assert.strictEqual(ctx.boundaries.size, 1);
    const boundary = ctx.boundaries.get(0);
    assert.strictEqual(boundary.promise, promise);
    assert.strictEqual(boundary.fallback, '<div>Loading...</div>');
  });

  test('registerBoundary stores multiple boundaries', () => {
    const ctx = new SSRStreamContext();

    ctx.registerBoundary(0, Promise.resolve('a'), 'fallback-a');
    ctx.registerBoundary(1, Promise.resolve('b'), 'fallback-b');
    ctx.registerBoundary(2, Promise.resolve('c'), 'fallback-c');

    assert.strictEqual(ctx.boundaries.size, 3);
  });

  test('pendingCount reflects boundaries size', () => {
    const ctx = new SSRStreamContext();

    assert.strictEqual(ctx.pendingCount, 0);

    ctx.registerBoundary(0, Promise.resolve(), 'fallback');
    assert.strictEqual(ctx.pendingCount, 1);

    ctx.registerBoundary(1, Promise.resolve(), 'fallback');
    assert.strictEqual(ctx.pendingCount, 2);
  });

  test('timeout defaults to 10000 when undefined in options', () => {
    const ctx = new SSRStreamContext({});
    assert.strictEqual(ctx.timeout, 10000);
  });

  test('timeout can be set to zero', () => {
    const ctx = new SSRStreamContext({ timeout: 0 });
    assert.strictEqual(ctx.timeout, 0);
  });
});

// ============================================================================
// Boundary Marker Tests
// ============================================================================

describe('createBoundaryStart', () => {
  test('creates opening comment marker with ID', () => {
    assert.strictEqual(createBoundaryStart(0), '<!--$B:0-->');
    assert.strictEqual(createBoundaryStart(5), '<!--$B:5-->');
    assert.strictEqual(createBoundaryStart(99), '<!--$B:99-->');
  });

  test('handles large IDs', () => {
    assert.strictEqual(createBoundaryStart(1000), '<!--$B:1000-->');
  });
});

describe('createBoundaryEnd', () => {
  test('creates closing comment marker with ID', () => {
    assert.strictEqual(createBoundaryEnd(0), '<!--/$B:0-->');
    assert.strictEqual(createBoundaryEnd(5), '<!--/$B:5-->');
    assert.strictEqual(createBoundaryEnd(99), '<!--/$B:99-->');
  });

  test('handles large IDs', () => {
    assert.strictEqual(createBoundaryEnd(1000), '<!--/$B:1000-->');
  });
});

describe('createBoundaryMarker', () => {
  test('creates boundary marker pair with fallback HTML', () => {
    const result = createBoundaryMarker(0, '<div>Loading...</div>');

    assert.ok(result.includes('data-ssr-boundary="0"'));
    assert.ok(result.includes('<div>Loading...</div>'));
    assert.ok(result.startsWith('<template'));
    assert.ok(result.endsWith('</template>'));
  });

  test('wraps fallback between two template tags', () => {
    const result = createBoundaryMarker(3, 'Spinner');
    const templateCount = (result.match(/<template/g) || []).length;
    assert.strictEqual(templateCount, 2);

    const closingCount = (result.match(/<\/template>/g) || []).length;
    assert.strictEqual(closingCount, 2);
  });

  test('both templates have same data-ssr-boundary ID', () => {
    const result = createBoundaryMarker(7, 'content');
    const matches = result.match(/data-ssr-boundary="7"/g);
    assert.strictEqual(matches.length, 2);
  });

  test('templates have display:none style', () => {
    const result = createBoundaryMarker(0, 'test');
    const styleMatches = result.match(/style="display:none"/g);
    assert.strictEqual(styleMatches.length, 2);
  });

  test('handles empty fallback HTML', () => {
    const result = createBoundaryMarker(0, '');
    assert.ok(result.includes('data-ssr-boundary="0"'));
  });

  test('handles HTML content with special characters', () => {
    const result = createBoundaryMarker(1, '<span class="spinner">&hellip;</span>');
    assert.ok(result.includes('<span class="spinner">&hellip;</span>'));
  });
});

// ============================================================================
// Replacement Script Tests
// ============================================================================

describe('createReplacementScript', () => {
  test('creates script that calls $P function', () => {
    const result = createReplacementScript(0, '<div>Hello</div>');
    assert.ok(result.startsWith('<script>'));
    assert.ok(result.endsWith('</script>'));
    assert.ok(result.includes('$P(0,'));
  });

  test('safely embeds single quotes in HTML via JSON.stringify', () => {
    const result = createReplacementScript(0, "It's a test");
    // JSON.stringify uses double quotes, so single quotes pass through unchanged
    assert.ok(result.includes("It's a test"));
  });

  test('escapes backslashes in HTML', () => {
    const result = createReplacementScript(0, 'path\\to\\file');
    // JSON.stringify will double-escape the backslashes
    assert.ok(result.includes('\\\\'));
  });

  test('escapes newlines in HTML', () => {
    const result = createReplacementScript(0, 'line1\nline2');
    assert.ok(result.includes('\\n'));
  });

  test('escapes closing script tags (XSS prevention)', () => {
    const result = createReplacementScript(0, '</script><script>alert(1)</script>');
    // Must not contain literal </script inside the JS string
    const inner = result.slice('<script>'.length, result.length - '</script>'.length);
    assert.ok(!inner.includes('</script'));
    // Uses unicode escape for the forward slash
    assert.ok(inner.includes('\\u002fscript'));
  });

  test('escapes script tags case-insensitively', () => {
    const result = createReplacementScript(0, '</SCRIPT>');
    const inner = result.slice('<script>'.length, result.length - '</script>'.length);
    assert.ok(!inner.includes('</SCRIPT'));
    // Case-insensitive replacement normalizes to lowercase
    assert.ok(inner.includes('\\u002fscript'));
  });

  test('uses the correct boundary ID', () => {
    const result5 = createReplacementScript(5, '<p>Test</p>');
    assert.ok(result5.includes('$P(5,'));

    const result42 = createReplacementScript(42, '<p>Test</p>');
    assert.ok(result42.includes('$P(42,'));
  });

  test('handles empty HTML string', () => {
    const result = createReplacementScript(0, '');
    assert.ok(result.includes('$P(0,""'));
  });
});

// ============================================================================
// STREAMING_RUNTIME_SCRIPT Tests
// ============================================================================

describe('STREAMING_RUNTIME_SCRIPT', () => {
  test('is a non-empty string', () => {
    assert.ok(typeof STREAMING_RUNTIME_SCRIPT === 'string');
    assert.ok(STREAMING_RUNTIME_SCRIPT.length > 0);
  });

  test('is a script tag', () => {
    assert.ok(STREAMING_RUNTIME_SCRIPT.startsWith('<script>'));
    assert.ok(STREAMING_RUNTIME_SCRIPT.endsWith('</script>'));
  });

  test('defines $P function', () => {
    assert.ok(STREAMING_RUNTIME_SCRIPT.includes('function $P'));
  });

  test('uses querySelectorAll for boundary lookup', () => {
    assert.ok(STREAMING_RUNTIME_SCRIPT.includes('querySelectorAll'));
  });

  test('uses data-ssr-boundary attribute', () => {
    assert.ok(STREAMING_RUNTIME_SCRIPT.includes('data-ssr-boundary'));
  });

  test('creates a Range for content replacement', () => {
    assert.ok(STREAMING_RUNTIME_SCRIPT.includes('createRange'));
  });

  test('uses template element for safe HTML insertion', () => {
    assert.ok(STREAMING_RUNTIME_SCRIPT.includes('template'));
  });

  test('removes boundary markers after replacement', () => {
    assert.ok(STREAMING_RUNTIME_SCRIPT.includes('.remove()'));
  });
});

// ============================================================================
// renderToStream Tests
// ============================================================================

describe('renderToStream', () => {
  beforeEach(() => {
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('returns a ReadableStream', () => {
    const stream = renderToStream(() => null);
    assert.ok(stream instanceof ReadableStream);
  });

  test('streams shell HTML with default options', async () => {
    const stream = renderToStream(() => null);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        result += decoder.decode(chunk.value);
      }
    }

    // Should close successfully even with null content
    assert.ok(typeof result === 'string');
  });

  test('includes shellStart content at the beginning', async () => {
    const stream = renderToStream(() => null, {
      shellStart: '<!DOCTYPE html><html><body>'
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        result += decoder.decode(chunk.value);
      }
    }

    assert.ok(result.includes('<!DOCTYPE html><html><body>'));
  });

  test('includes shellEnd content at the end', async () => {
    const stream = renderToStream(() => null, {
      shellEnd: '</body></html>'
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        result += decoder.decode(chunk.value);
      }
    }

    assert.ok(result.includes('</body></html>'));
  });

  test('includes bootstrap script tags for scripts', async () => {
    const stream = renderToStream(() => null, {
      bootstrapScripts: ['/js/vendor.js', '/js/polyfills.js']
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        result += decoder.decode(chunk.value);
      }
    }

    assert.ok(result.includes('<script src="/js/vendor.js"></script>'));
    assert.ok(result.includes('<script src="/js/polyfills.js"></script>'));
  });

  test('calls onShellError when shell rendering fails', async () => {
    let shellError = null;

    const stream = renderToStream(
      () => { throw new Error('Shell render failed'); },
      {
        onShellError: (err) => { shellError = err; }
      }
    );

    const reader = stream.getReader();
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
    }

    assert.ok(shellError !== null);
    assert.ok(shellError.message.includes('Shell render failed'));
  });

  test('renders element content to shell HTML', async () => {
    const stream = renderToStream(() => {
      const adapter = new MockDOMAdapter();
      const div = adapter.createElement('div');
      div.className = 'test-content';
      div.appendChild(adapter.createTextNode('Hello Stream'));
      return div;
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        result += decoder.decode(chunk.value);
      }
    }

    assert.ok(result.includes('test-content') || result.includes('Hello Stream'));
  });
});

// ============================================================================
// renderToReadableStream Tests
// ============================================================================

describe('renderToReadableStream', () => {
  beforeEach(() => {
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('returns an object with stream and abort function', () => {
    const result = renderToReadableStream(() => null);

    assert.ok(result.stream instanceof ReadableStream);
    assert.ok(typeof result.abort === 'function');
  });

  test('stream produces content', async () => {
    const { stream } = renderToReadableStream(() => null, {
      shellStart: '<html>',
      shellEnd: '</html>'
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        result += decoder.decode(chunk.value);
      }
    }

    assert.ok(result.includes('<html>'));
  });

  test('abort does not throw on active stream', async () => {
    const { stream, abort } = renderToReadableStream(() => null);

    // Abort should not throw
    assert.doesNotThrow(() => abort());
  });

  test('abort does not throw when called after creation', () => {
    const { abort } = renderToReadableStream(() => null);

    // Calling abort immediately should not throw
    assert.doesNotThrow(() => abort());

    // Calling abort again should also not throw
    assert.doesNotThrow(() => abort());
  });

  test('propagates onShellError option', async () => {
    let errorReceived = null;

    const { stream } = renderToReadableStream(
      () => { throw new Error('Shell failed'); },
      {
        onShellError: (err) => { errorReceived = err; }
      }
    );

    const reader = stream.getReader();
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
    }

    assert.ok(errorReceived !== null);
    assert.strictEqual(errorReceived.message, 'Shell failed');
  });

  test('passes through all options to renderToStream', async () => {
    const { stream } = renderToReadableStream(() => null, {
      shellStart: '<!-- start -->',
      shellEnd: '<!-- end -->',
      bootstrapScripts: ['/app.js']
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    let done = false;
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        result += decoder.decode(chunk.value);
      }
    }

    assert.ok(result.includes('<!-- start -->'), 'Should include shellStart');
    assert.ok(result.includes('<!-- end -->'), 'Should include shellEnd');
    assert.ok(result.includes('/app.js'), 'Should include bootstrap scripts');
  });
});

console.log('SSR Streaming tests loaded');
