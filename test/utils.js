/**
 * @fileoverview Shared Test Utilities for Pulse Framework
 *
 * This module provides common testing utilities used across all Pulse test files.
 * It includes a simple test runner, assertion functions, DOM mocking utilities,
 * and storage mocks.
 *
 * @module test/utils
 * @author Pulse Framework Team
 * @license MIT
 */

// =============================================================================
// Test Runner
// =============================================================================

/**
 * Test statistics tracking
 * @typedef {Object} TestStats
 * @property {number} passed - Number of passed tests
 * @property {number} failed - Number of failed tests
 */

/**
 * Global test statistics
 * @type {TestStats}
 */
const stats = {
  passed: 0,
  failed: 0
};

/**
 * Collection of async tests to be run after sync tests
 * @type {Array<{name: string, fn: Function}>}
 */
const asyncTests = [];

/**
 * Optional setup function to run before each test
 * @type {Function|null}
 */
let beforeEachFn = null;

/**
 * Creates a new test context with isolated statistics
 *
 * @returns {TestContext} A new test context
 *
 * @example
 * const ctx = createTestContext();
 * ctx.test('example test', () => {
 *   ctx.assertEqual(1 + 1, 2);
 * });
 * ctx.printResults();
 */
export function createTestContext() {
  return new TestContext();
}

/**
 * Test context class for isolated test runs
 */
class TestContext {
  constructor() {
    /** @type {number} */
    this.passed = 0;
    /** @type {number} */
    this.failed = 0;
    /** @type {Array<{name: string, fn: Function}>} */
    this.asyncTests = [];
    /** @type {Function|null} */
    this.beforeEachFn = null;
  }

  /**
   * Sets a function to run before each test
   * @param {Function} fn - Setup function
   */
  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  /**
   * Runs a synchronous test
   * @param {string} name - Test name
   * @param {Function} fn - Test function
   */
  test(name, fn) {
    if (this.beforeEachFn) this.beforeEachFn();
    try {
      fn();
      console.log(`\u2713 ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`\u2717 ${name}`);
      console.log(`  Error: ${error.message}`);
      this.failed++;
    }
  }

  /**
   * Queues an async test for later execution
   * @param {string} name - Test name
   * @param {Function} fn - Async test function
   */
  testAsync(name, fn) {
    this.asyncTests.push({ name, fn });
  }

  /**
   * Runs all queued async tests
   * @returns {Promise<void>}
   */
  async runAsyncTests() {
    for (const { name, fn } of this.asyncTests) {
      if (this.beforeEachFn) this.beforeEachFn();
      try {
        await fn();
        console.log(`\u2713 ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`\u2717 ${name}`);
        console.log(`  Error: ${error.message}`);
        this.failed++;
      }
    }
  }

  /**
   * Prints test results summary
   */
  printResults() {
    console.log('\n--- Results ---\n');
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total:  ${this.passed + this.failed}`);
  }

  /**
   * Exits with appropriate code based on test results
   */
  exit() {
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

/**
 * Sets a function to run before each test in the global context
 *
 * @param {Function} fn - The setup function to run before each test
 *
 * @example
 * beforeEach(() => {
 *   localStorage.clear();
 * });
 */
export function beforeEach(fn) {
  beforeEachFn = fn;
}

/**
 * Runs a synchronous test case
 *
 * @param {string} name - The name/description of the test
 * @param {Function} fn - The test function to execute
 *
 * @example
 * test('adds two numbers correctly', () => {
 *   assertEqual(1 + 1, 2, 'Expected sum to be 2');
 * });
 */
export function test(name, fn) {
  if (beforeEachFn) beforeEachFn();
  try {
    fn();
    console.log(`\u2713 ${name}`);
    stats.passed++;
  } catch (error) {
    console.log(`\u2717 ${name}`);
    console.log(`  Error: ${error.message}`);
    stats.failed++;
  }
}

/**
 * Queues an asynchronous test for later execution
 *
 * Async tests are collected and run after all sync tests complete.
 * Use {@link runAsyncTests} to execute queued tests.
 *
 * @param {string} name - The name/description of the test
 * @param {Function} fn - The async test function to execute
 *
 * @example
 * testAsync('fetches data successfully', async () => {
 *   const data = await fetchData();
 *   assertEqual(data.status, 'success');
 * });
 */
export function testAsync(name, fn) {
  asyncTests.push({ name, fn });
}

/**
 * Runs all queued async tests sequentially
 *
 * @returns {Promise<void>}
 *
 * @example
 * // At the end of your test file:
 * await runAsyncTests();
 * printResults();
 * exitWithCode();
 */
export async function runAsyncTests() {
  for (const { name, fn } of asyncTests) {
    if (beforeEachFn) beforeEachFn();
    try {
      await fn();
      console.log(`\u2713 ${name}`);
      stats.passed++;
    } catch (error) {
      console.log(`\u2717 ${name}`);
      console.log(`  Error: ${error.message}`);
      stats.failed++;
    }
  }
}

/**
 * Prints the test results summary to console
 *
 * @example
 * printResults();
 * // Output:
 * // --- Results ---
 * // Passed: 10
 * // Failed: 2
 * // Total:  12
 */
export function printResults() {
  console.log('\n--- Results ---\n');
  console.log(`Passed: ${stats.passed}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Total:  ${stats.passed + stats.failed}`);
}

/**
 * Exits the process with appropriate exit code
 *
 * Exits with code 1 if any tests failed, 0 otherwise.
 */
export function exitWithCode() {
  process.exit(stats.failed > 0 ? 1 : 0);
}

/**
 * Gets the current test statistics
 *
 * @returns {TestStats} Current test statistics
 */
export function getStats() {
  return { ...stats };
}

/**
 * Resets test statistics to zero
 *
 * Useful when running multiple test suites in sequence.
 */
export function resetStats() {
  stats.passed = 0;
  stats.failed = 0;
  asyncTests.length = 0;
  beforeEachFn = null;
}

// =============================================================================
// Assertion Functions
// =============================================================================

/**
 * Asserts that a condition is truthy
 *
 * @param {*} condition - The condition to check
 * @param {string} [message='Assertion failed'] - Error message if assertion fails
 * @throws {Error} If condition is falsy
 *
 * @example
 * assert(user !== null, 'User should exist');
 * assert(items.length > 0, 'Should have at least one item');
 */
export function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Asserts that two values are strictly equal (===)
 *
 * @param {*} actual - The actual value
 * @param {*} expected - The expected value
 * @param {string} [message] - Custom error message
 * @throws {Error} If values are not strictly equal
 *
 * @example
 * assertEqual(result, 42, 'Result should be 42');
 * assertEqual(user.name, 'John');
 */
export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

/**
 * Asserts that two values are not strictly equal (!==)
 *
 * @param {*} actual - The actual value
 * @param {*} unexpected - The value that should not match
 * @param {string} [message] - Custom error message
 * @throws {Error} If values are strictly equal
 *
 * @example
 * assertNotEqual(error, null, 'Should have an error');
 */
export function assertNotEqual(actual, unexpected, message) {
  if (actual === unexpected) {
    throw new Error(message || `Expected ${actual} to not equal ${unexpected}`);
  }
}

/**
 * Asserts that two values are deeply equal using JSON comparison
 *
 * @param {*} actual - The actual value
 * @param {*} expected - The expected value
 * @param {string} [message] - Custom error message
 * @throws {Error} If values are not deeply equal
 *
 * @example
 * assertDeepEqual({ a: 1, b: 2 }, { a: 1, b: 2 });
 * assertDeepEqual([1, 2, 3], [1, 2, 3], 'Arrays should match');
 */
export function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

/**
 * Asserts that a function throws an error
 *
 * @param {Function} fn - The function that should throw
 * @param {string|RegExp} [expectedMessage] - Expected error message or pattern
 * @param {string} [message] - Custom error message if assertion fails
 * @throws {Error} If function doesn't throw or message doesn't match
 *
 * @example
 * assertThrows(() => { throw new Error('oops'); });
 * assertThrows(() => divide(1, 0), /division by zero/i);
 */
export function assertThrows(fn, expectedMessage, message) {
  let threw = false;
  let error = null;

  try {
    fn();
  } catch (e) {
    threw = true;
    error = e;
  }

  if (!threw) {
    throw new Error(message || 'Expected function to throw');
  }

  if (expectedMessage) {
    const errorMsg = error?.message || String(error);
    if (typeof expectedMessage === 'string') {
      if (!errorMsg.includes(expectedMessage)) {
        throw new Error(
          message || `Expected error message to include "${expectedMessage}", got "${errorMsg}"`
        );
      }
    } else if (expectedMessage instanceof RegExp) {
      if (!expectedMessage.test(errorMsg)) {
        throw new Error(
          message || `Expected error message to match ${expectedMessage}, got "${errorMsg}"`
        );
      }
    }
  }
}

/**
 * Asserts that a function does not throw an error
 *
 * @param {Function} fn - The function that should not throw
 * @param {string} [message] - Custom error message if assertion fails
 * @throws {Error} If function throws
 *
 * @example
 * assertDoesNotThrow(() => safeOperation());
 */
export function assertDoesNotThrow(fn, message) {
  try {
    fn();
  } catch (error) {
    throw new Error(message || `Expected function not to throw, but it threw: ${error.message}`);
  }
}

/**
 * Asserts that an async function throws an error
 *
 * @param {Function} fn - The async function that should throw
 * @param {string|RegExp} [expectedMessage] - Expected error message or pattern
 * @param {string} [message] - Custom error message if assertion fails
 * @returns {Promise<void>}
 * @throws {Error} If function doesn't throw or message doesn't match
 *
 * @example
 * await assertThrowsAsync(async () => {
 *   await fetchData('invalid');
 * }, 'Not found');
 */
export async function assertThrowsAsync(fn, expectedMessage, message) {
  let threw = false;
  let error = null;

  try {
    await fn();
  } catch (e) {
    threw = true;
    error = e;
  }

  if (!threw) {
    throw new Error(message || 'Expected async function to throw');
  }

  if (expectedMessage) {
    const errorMsg = error?.message || String(error);
    if (typeof expectedMessage === 'string') {
      if (!errorMsg.includes(expectedMessage)) {
        throw new Error(
          message || `Expected error message to include "${expectedMessage}", got "${errorMsg}"`
        );
      }
    } else if (expectedMessage instanceof RegExp) {
      if (!expectedMessage.test(errorMsg)) {
        throw new Error(
          message || `Expected error message to match ${expectedMessage}, got "${errorMsg}"`
        );
      }
    }
  }
}

/**
 * Asserts that a value is truthy
 *
 * @param {*} value - The value to check
 * @param {string} [message] - Custom error message
 * @throws {Error} If value is falsy
 *
 * @example
 * assertTruthy(user);
 * assertTruthy(result.length, 'Should have results');
 */
export function assertTruthy(value, message) {
  if (!value) {
    throw new Error(message || `Expected truthy value, got ${value}`);
  }
}

/**
 * Asserts that a value is falsy
 *
 * @param {*} value - The value to check
 * @param {string} [message] - Custom error message
 * @throws {Error} If value is truthy
 *
 * @example
 * assertFalsy(error);
 * assertFalsy(warning, 'Should have no warnings');
 */
export function assertFalsy(value, message) {
  if (value) {
    throw new Error(message || `Expected falsy value, got ${value}`);
  }
}

/**
 * Asserts that a value is an instance of a class
 *
 * @param {*} value - The value to check
 * @param {Function} constructor - The expected constructor
 * @param {string} [message] - Custom error message
 * @throws {Error} If value is not an instance of constructor
 *
 * @example
 * assertInstanceOf(error, TypeError);
 * assertInstanceOf(user, User, 'Should be a User instance');
 */
export function assertInstanceOf(value, constructor, message) {
  if (!(value instanceof constructor)) {
    throw new Error(
      message || `Expected instance of ${constructor.name}, got ${value?.constructor?.name || typeof value}`
    );
  }
}

/**
 * Asserts that a value matches a type
 *
 * @param {*} value - The value to check
 * @param {string} expectedType - The expected type (from typeof)
 * @param {string} [message] - Custom error message
 * @throws {Error} If typeof value doesn't match expectedType
 *
 * @example
 * assertType(callback, 'function');
 * assertType(count, 'number', 'Count should be a number');
 */
export function assertType(value, expectedType, message) {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw new Error(message || `Expected type ${expectedType}, got ${actualType}`);
  }
}

// =============================================================================
// DOM Mocking Utilities
// =============================================================================

/**
 * DOM mock configuration
 * @typedef {Object} DOMConfig
 * @property {Document} document - The mock document
 * @property {Object} window - The mock window
 * @property {Function} Node - The Node constructor
 */

/**
 * Creates a mock DOM environment using linkedom
 *
 * @param {string} [html='<!DOCTYPE html><html><body></body></html>'] - Initial HTML
 * @returns {Promise<DOMConfig>} DOM configuration object
 *
 * @example
 * const { document, window } = await createDOM();
 * const div = document.createElement('div');
 */
export async function createDOM(html = '<!DOCTYPE html><html><body></body></html>') {
  const { parseHTML } = await import('linkedom');
  const { document, HTMLElement, Node, DocumentFragment, Comment, Event } = parseHTML(html);

  // Set globals
  globalThis.document = document;
  globalThis.HTMLElement = HTMLElement;
  globalThis.Node = Node;
  globalThis.DocumentFragment = DocumentFragment;
  globalThis.Comment = Comment;
  globalThis.Event = Event;

  return { document, window: document.defaultView, Node };
}

/**
 * History mock state
 * @typedef {Object} HistoryState
 * @property {Array<{path: string, state: *}>} stack - History stack
 * @property {number} index - Current history index
 * @property {Function|null} popStateCallback - Callback for popstate events
 */

/**
 * Creates a mock window object with history and location APIs
 *
 * This is useful for testing router functionality without a real browser.
 *
 * @param {Document} document - The document object (from linkedom)
 * @returns {{window: Object, resetHistory: Function}} Mock window and reset function
 *
 * @example
 * const { document } = await createDOM();
 * const { window, resetHistory } = createMockWindow(document);
 * global.window = window;
 *
 * // Test navigation
 * window.history.pushState({}, '', '/about');
 *
 * // Reset between tests
 * resetHistory();
 */
export function createMockWindow(document) {
  /** @type {Array<{path: string, state: *}>} */
  let historyStack = [{ path: '/', state: null }];
  let historyIndex = 0;
  /** @type {Function|null} */
  let popStateCallback = null;

  const mockLocation = {
    pathname: '/',
    search: '',
    hash: '',
    href: 'http://localhost/'
  };

  /**
   * Updates location based on URL
   * @param {string} url - The URL to parse
   */
  function updateLocation(url) {
    if (url.startsWith('#')) {
      mockLocation.hash = url;
      mockLocation.pathname = '/';
    } else if (url.includes('?')) {
      const [path, query] = url.split('?');
      mockLocation.pathname = path;
      mockLocation.search = '?' + query;
    } else {
      mockLocation.pathname = url;
      mockLocation.search = '';
    }
  }

  const mockHistory = {
    /**
     * Pushes a new state onto the history stack
     * @param {*} state - State object
     * @param {string} _title - Title (ignored)
     * @param {string} url - URL
     */
    pushState: (state, _title, url) => {
      historyIndex++;
      historyStack.splice(historyIndex);
      const path = url.startsWith('#') ? url.slice(1) : url;
      historyStack.push({ path, state });
      updateLocation(url);
    },
    /**
     * Replaces current state
     * @param {*} state - State object
     * @param {string} _title - Title (ignored)
     * @param {string} url - URL
     */
    replaceState: (state, _title, url) => {
      const path = url.startsWith('#') ? url.slice(1) : url;
      historyStack[historyIndex] = { path, state };
      updateLocation(url);
    },
    /**
     * Goes back in history
     */
    back: () => {
      if (historyIndex > 0) {
        historyIndex--;
        const entry = historyStack[historyIndex];
        updateLocation(entry.path);
        if (popStateCallback) popStateCallback({ state: entry.state });
      }
    },
    /**
     * Goes forward in history
     */
    forward: () => {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        const entry = historyStack[historyIndex];
        updateLocation(entry.path);
        if (popStateCallback) popStateCallback({ state: entry.state });
      }
    },
    /**
     * Goes to a specific point in history
     * @param {number} delta - Number of steps (positive or negative)
     */
    go: (delta) => {
      const newIndex = historyIndex + delta;
      if (newIndex >= 0 && newIndex < historyStack.length) {
        historyIndex = newIndex;
        const entry = historyStack[historyIndex];
        updateLocation(entry.path);
        if (popStateCallback) popStateCallback({ state: entry.state });
      }
    }
  };

  const mockWindow = {
    location: mockLocation,
    history: mockHistory,
    scrollX: 0,
    scrollY: 0,
    /**
     * Adds event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener: (event, callback) => {
      if (event === 'popstate') popStateCallback = callback;
    },
    removeEventListener: () => {},
    scrollTo: () => {},
    Node: document.defaultView?.Node || class Node {}
  };

  /**
   * Resets history state for testing
   */
  function resetHistory() {
    historyStack = [{ path: '/', state: null }];
    historyIndex = 0;
    mockLocation.pathname = '/';
    mockLocation.search = '';
    mockLocation.hash = '';
    popStateCallback = null;
  }

  return { window: mockWindow, resetHistory };
}

// =============================================================================
// Storage Mocks
// =============================================================================

/**
 * Creates a mock localStorage implementation
 *
 * @returns {{storage: Storage, data: Object, clear: Function}} Mock storage and utilities
 *
 * @example
 * const { storage, clear } = createMockLocalStorage();
 * global.localStorage = storage;
 *
 * storage.setItem('key', 'value');
 * storage.getItem('key'); // 'value'
 *
 * clear(); // Reset between tests
 */
export function createMockLocalStorage() {
  /** @type {Record<string, string>} */
  const data = {};

  const storage = {
    /**
     * Gets an item from storage
     * @param {string} key - Storage key
     * @returns {string|null} Stored value or null
     */
    getItem: (key) => data[key] || null,

    /**
     * Sets an item in storage
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     */
    setItem: (key, value) => { data[key] = value; },

    /**
     * Removes an item from storage
     * @param {string} key - Storage key
     */
    removeItem: (key) => { delete data[key]; },

    /**
     * Clears all items from storage
     */
    clear: () => {
      Object.keys(data).forEach(k => delete data[k]);
    },

    /**
     * Gets the number of items in storage
     * @type {number}
     */
    get length() { return Object.keys(data).length; },

    /**
     * Gets key at index
     * @param {number} index - Index
     * @returns {string|null} Key or null
     */
    key: (index) => Object.keys(data)[index] || null
  };

  return {
    storage,
    data,
    clear: () => storage.clear()
  };
}

/**
 * Creates a mock sessionStorage implementation
 *
 * @returns {{storage: Storage, data: Object, clear: Function}} Mock storage and utilities
 *
 * @example
 * const { storage } = createMockSessionStorage();
 * global.sessionStorage = storage;
 */
export function createMockSessionStorage() {
  return createMockLocalStorage();
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Waits for a specified duration
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 *
 * @example
 * await wait(100); // Wait 100ms
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Waits for a condition to be true
 *
 * @param {Function} condition - Function that returns boolean
 * @param {number} [timeout=5000] - Maximum wait time in ms
 * @param {number} [interval=10] - Check interval in ms
 * @returns {Promise<void>}
 * @throws {Error} If timeout is reached before condition is true
 *
 * @example
 * await waitFor(() => element.classList.contains('active'));
 * await waitFor(() => fetchComplete, 10000);
 */
export async function waitFor(condition, timeout = 5000, interval = 10) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout exceeded');
    }
    await wait(interval);
  }
}

/**
 * Creates a spy function that tracks calls
 *
 * @param {Function} [implementation] - Optional implementation
 * @returns {SpyFunction} A spy function
 *
 * @example
 * const spy = createSpy();
 * element.addEventListener('click', spy);
 * element.click();
 * assertEqual(spy.callCount, 1);
 * assertDeepEqual(spy.calls[0], [event]);
 */
export function createSpy(implementation = () => {}) {
  const calls = [];

  const spy = function(...args) {
    calls.push(args);
    return implementation.apply(this, args);
  };

  /** @type {Array<Array<*>>} */
  spy.calls = calls;

  /** @type {number} */
  Object.defineProperty(spy, 'callCount', {
    get() { return calls.length; }
  });

  /**
   * Resets the spy
   */
  spy.reset = () => { calls.length = 0; };

  /**
   * Gets the last call arguments
   * @returns {Array<*>|undefined}
   */
  spy.lastCall = () => calls[calls.length - 1];

  return spy;
}

/**
 * @typedef {Function & {calls: Array<Array<*>>, callCount: number, reset: Function, lastCall: Function}} SpyFunction
 */

/**
 * Prints a section header to console
 *
 * @param {string} title - Section title
 *
 * @example
 * printSection('Router Tests');
 * // Output: --- Router Tests ---
 */
export function printSection(title) {
  console.log(`\n--- ${title} ---\n`);
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  // Test runner
  test,
  testAsync,
  runAsyncTests,
  beforeEach,
  printResults,
  exitWithCode,
  getStats,
  resetStats,
  createTestContext,

  // Assertions
  assert,
  assertEqual,
  assertNotEqual,
  assertDeepEqual,
  assertThrows,
  assertDoesNotThrow,
  assertThrowsAsync,
  assertTruthy,
  assertFalsy,
  assertInstanceOf,
  assertType,

  // DOM mocking
  createDOM,
  createMockWindow,

  // Storage mocking
  createMockLocalStorage,
  createMockSessionStorage,

  // Helpers
  wait,
  waitFor,
  createSpy,
  printSection
};
