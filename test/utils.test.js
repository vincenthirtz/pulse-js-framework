/**
 * Utils Tests
 * Tests for runtime/utils.js
 */

import {
  escapeHtml,
  unescapeHtml,
  escapeAttribute,
  sanitizeUrl,
  deepClone,
  debounce,
  throttle
} from '../runtime/utils.js';

// Simple test utilities
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  ${error.message}`);
    failed++;
  }
}

console.log('\n--- Utils Tests ---\n');

// ============================================================================
// escapeHtml Tests
// ============================================================================

console.log('escapeHtml:');

test('escapes < and >', () => {
  assertEqual(escapeHtml('<div>'), '&lt;div&gt;');
});

test('escapes &', () => {
  assertEqual(escapeHtml('a & b'), 'a &amp; b');
});

test('escapes quotes', () => {
  assertEqual(escapeHtml('"hello"'), '&quot;hello&quot;');
  assertEqual(escapeHtml("'hello'"), '&#39;hello&#39;');
});

test('escapes script tags', () => {
  const input = '<script>alert("xss")</script>';
  const output = escapeHtml(input);
  assert(!output.includes('<script>'), 'Should not contain script tag');
  assertEqual(output, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
});

test('handles null and undefined', () => {
  assertEqual(escapeHtml(null), '');
  assertEqual(escapeHtml(undefined), '');
});

test('handles numbers', () => {
  assertEqual(escapeHtml(42), '42');
  assertEqual(escapeHtml(3.14), '3.14');
});

test('handles empty string', () => {
  assertEqual(escapeHtml(''), '');
});

test('passes through safe strings', () => {
  assertEqual(escapeHtml('Hello World'), 'Hello World');
});

// ============================================================================
// unescapeHtml Tests
// ============================================================================

console.log('\nunescapeHtml:');

test('unescapes &lt; and &gt;', () => {
  assertEqual(unescapeHtml('&lt;div&gt;'), '<div>');
});

test('unescapes &amp;', () => {
  assertEqual(unescapeHtml('a &amp; b'), 'a & b');
});

test('unescapes quotes', () => {
  assertEqual(unescapeHtml('&quot;hello&quot;'), '"hello"');
  assertEqual(unescapeHtml('&#39;hello&#39;'), "'hello'");
});

test('handles null and undefined', () => {
  assertEqual(unescapeHtml(null), '');
  assertEqual(unescapeHtml(undefined), '');
});

test('roundtrip escape/unescape', () => {
  const original = '<script>alert("xss")</script>';
  const escaped = escapeHtml(original);
  const unescaped = unescapeHtml(escaped);
  assertEqual(unescaped, original);
});

// ============================================================================
// escapeAttribute Tests
// ============================================================================

console.log('\nescapeAttribute:');

test('escapes double quotes', () => {
  assertEqual(escapeAttribute('hello"world'), 'hello&quot;world');
});

test('escapes single quotes', () => {
  assertEqual(escapeAttribute("hello'world"), 'hello&#39;world');
});

test('escapes angle brackets', () => {
  assertEqual(escapeAttribute('<div>'), '&lt;div&gt;');
});

test('handles null and undefined', () => {
  assertEqual(escapeAttribute(null), '');
  assertEqual(escapeAttribute(undefined), '');
});

// ============================================================================
// sanitizeUrl Tests
// ============================================================================

console.log('\nsanitizeUrl:');

test('allows http URLs', () => {
  assertEqual(sanitizeUrl('http://example.com'), 'http://example.com');
});

test('allows https URLs', () => {
  assertEqual(sanitizeUrl('https://example.com'), 'https://example.com');
});

test('blocks javascript: URLs', () => {
  assertEqual(sanitizeUrl('javascript:alert(1)'), null);
});

test('blocks javascript: URLs case insensitive', () => {
  assertEqual(sanitizeUrl('JAVASCRIPT:alert(1)'), null);
  assertEqual(sanitizeUrl('JavaScript:alert(1)'), null);
});

test('blocks javascript: with spaces', () => {
  assertEqual(sanitizeUrl('java script:alert(1)'), null);
});

test('blocks data: URLs by default', () => {
  assertEqual(sanitizeUrl('data:text/html,<script>'), null);
});

test('allows data: URLs with allowData option', () => {
  const url = 'data:image/png;base64,abc';
  assertEqual(sanitizeUrl(url, { allowData: true }), url);
});

test('allows relative URLs by default', () => {
  assertEqual(sanitizeUrl('/path/to/page'), '/path/to/page');
  assertEqual(sanitizeUrl('./relative'), './relative');
  assertEqual(sanitizeUrl('../parent'), '../parent');
});

test('allows relative paths without slashes', () => {
  assertEqual(sanitizeUrl('page.html'), 'page.html');
  assertEqual(sanitizeUrl('path/to/page'), 'path/to/page');
});

test('handles null and empty string', () => {
  assertEqual(sanitizeUrl(null), null);
  assertEqual(sanitizeUrl(''), null);
  assertEqual(sanitizeUrl(undefined), null);
});

test('trims whitespace', () => {
  assertEqual(sanitizeUrl('  https://example.com  '), 'https://example.com');
});

test('blocks other protocols', () => {
  assertEqual(sanitizeUrl('ftp://example.com'), null);
  assertEqual(sanitizeUrl('file:///etc/passwd'), null);
});

// ============================================================================
// deepClone Tests
// ============================================================================

console.log('\ndeepClone:');

test('clones primitive values', () => {
  assertEqual(deepClone(42), 42);
  assertEqual(deepClone('hello'), 'hello');
  assertEqual(deepClone(true), true);
  assertEqual(deepClone(null), null);
});

test('clones simple objects', () => {
  const original = { a: 1, b: 2 };
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone !== original, 'Should be different object');
});

test('clones nested objects', () => {
  const original = { a: { b: { c: 1 } } };
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone.a !== original.a, 'Nested object should be different');
  assert(clone.a.b !== original.a.b, 'Deep nested object should be different');
});

test('clones arrays', () => {
  const original = [1, 2, 3];
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone !== original, 'Should be different array');
});

test('clones nested arrays', () => {
  const original = [[1, 2], [3, 4]];
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone[0] !== original[0], 'Nested array should be different');
});

test('clones mixed objects and arrays', () => {
  const original = {
    arr: [1, { a: 2 }],
    obj: { arr: [3, 4] }
  };
  const clone = deepClone(original);

  assertDeepEqual(clone, original);
  assert(clone.arr !== original.arr, 'Nested array should be different');
  assert(clone.obj !== original.obj, 'Nested object should be different');
});

test('clones Date objects', () => {
  const original = new Date('2024-01-15T12:00:00Z');
  const clone = deepClone(original);

  assertEqual(clone.getTime(), original.getTime());
  assert(clone !== original, 'Should be different Date object');
});

test('mutations do not affect original', () => {
  const original = { a: 1, b: { c: 2 } };
  const clone = deepClone(original);

  clone.a = 100;
  clone.b.c = 200;

  assertEqual(original.a, 1);
  assertEqual(original.b.c, 2);
});

// ============================================================================
// debounce Tests
// ============================================================================

console.log('\ndebounce:');

await testAsync('calls function after delay', async () => {
  let called = 0;
  const debounced = debounce(() => called++, 50);

  debounced();
  assertEqual(called, 0, 'Should not be called immediately');

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 1, 'Should be called after delay');
});

await testAsync('resets timer on subsequent calls', async () => {
  let called = 0;
  const debounced = debounce(() => called++, 50);

  debounced();
  await new Promise(r => setTimeout(r, 30));
  debounced(); // Reset timer
  await new Promise(r => setTimeout(r, 30));
  debounced(); // Reset timer again

  assertEqual(called, 0, 'Should not be called during resets');

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 1, 'Should be called only once after final delay');
});

await testAsync('cancel prevents execution', async () => {
  let called = 0;
  const debounced = debounce(() => called++, 50);

  debounced();
  debounced.cancel();

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 0, 'Should not be called after cancel');
});

await testAsync('passes arguments correctly', async () => {
  let receivedArgs = null;
  const debounced = debounce((...args) => { receivedArgs = args; }, 50);

  debounced(1, 2, 3);
  await new Promise(r => setTimeout(r, 60));

  assertDeepEqual(receivedArgs, [1, 2, 3]);
});

// ============================================================================
// throttle Tests
// ============================================================================

console.log('\nthrottle:');

await testAsync('calls function immediately first time', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled();
  assertEqual(called, 1, 'Should be called immediately');
});

await testAsync('ignores calls within interval', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled(); // Called immediately
  throttled(); // Ignored
  throttled(); // Ignored

  assertEqual(called, 1, 'Should only be called once during interval');
});

await testAsync('allows calls after interval', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled(); // Called immediately
  await new Promise(r => setTimeout(r, 60));
  throttled(); // Called after interval

  assertEqual(called, 2, 'Should be called after interval');
});

await testAsync('schedules trailing call', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled(); // Called immediately
  throttled(); // Scheduled for later
  throttled(); // Updates scheduled call

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 2, 'Should call trailing after interval');
});

await testAsync('cancel prevents scheduled call', async () => {
  let called = 0;
  const throttled = throttle(() => called++, 50);

  throttled(); // Called immediately
  throttled(); // Scheduled
  throttled.cancel();

  await new Promise(r => setTimeout(r, 60));
  assertEqual(called, 1, 'Should not call after cancel');
});

await testAsync('passes arguments correctly', async () => {
  let receivedArgs = null;
  const throttled = throttle((...args) => { receivedArgs = args; }, 50);

  throttled(1, 2, 3);
  assertDeepEqual(receivedArgs, [1, 2, 3]);
});

// ============================================================================
// Results
// ============================================================================

console.log('\n--- Results ---\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
