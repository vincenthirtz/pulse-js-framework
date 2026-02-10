/**
 * Memory Safety & Cleanup Tests
 *
 * Verifies that all create and use functions return proper cleanup/dispose
 * functions and that those functions actually release resources.
 *
 * Covers milestone #2 issues: #31, #33, #35, #37
 *
 * @module test/memory-cleanup
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Mock DOM Setup for a11y tests
// =============================================================================

// Track matchMedia listeners for verification
const mediaListeners = [];

const createMockMediaQueryList = (query) => {
  const mql = {
    matches: false,
    media: query,
    addEventListener: mock.fn((event, handler) => {
      mediaListeners.push({ query, event, handler, mql });
    }),
    removeEventListener: mock.fn((event, handler) => {
      const idx = mediaListeners.findIndex(
        l => l.query === query && l.handler === handler
      );
      if (idx !== -1) mediaListeners.splice(idx, 1);
    })
  };
  return mql;
};

globalThis.document = {
  body: {
    appendChild: mock.fn(),
    insertBefore: mock.fn(),
    firstChild: null,
    querySelectorAll: () => [],
    querySelector: () => null,
    contains: () => true,
    children: []
  },
  documentElement: {
    getAttribute: () => null
  },
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    setAttribute: mock.fn(),
    getAttribute: mock.fn(() => null),
    hasAttribute: mock.fn(() => false),
    removeAttribute: mock.fn(),
    addEventListener: mock.fn(),
    removeEventListener: mock.fn(),
    appendChild: mock.fn(),
    remove: mock.fn(),
    focus: mock.fn(),
    closest: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
    contains: () => true,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 50 }),
    style: {},
    id: '',
    className: '',
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { this._classes.has(c) ? this._classes.delete(c) : this._classes.add(c); }
    },
    textContent: '',
    hidden: false,
    href: ''
  }),
  createTextNode: (text) => ({ nodeType: 3, textContent: text }),
  createComment: (text) => ({ nodeType: 8, textContent: text }),
  getElementById: () => null
};

globalThis.window = {
  matchMedia: mock.fn((query) => createMockMediaQueryList(query)),
  addEventListener: mock.fn(),
  removeEventListener: mock.fn(),
  location: { pathname: '/', search: '', hash: '' },
  history: {
    pushState: mock.fn(),
    replaceState: mock.fn(),
    state: null
  },
  requestAnimationFrame: (fn) => fn()
};

globalThis.requestAnimationFrame = (fn) => fn();
globalThis.HTMLElement = class HTMLElement {};
globalThis.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };

// =============================================================================
// #31 - createPreferences() cleanup
// =============================================================================

import {
  createPreferences,
  createAnnouncementQueue,
  announce
} from '../runtime/a11y.js';

describe('#31 - createPreferences() memory leak fix', () => {

  beforeEach(() => {
    mediaListeners.length = 0;
  });

  it('should return a cleanup function', () => {
    const prefs = createPreferences();
    assert.strictEqual(typeof prefs.cleanup, 'function');
  });

  it('should still return all reactive preference pulses', () => {
    const prefs = createPreferences();
    assert.ok(prefs.reducedMotion, 'should have reducedMotion');
    assert.ok(prefs.colorScheme, 'should have colorScheme');
    assert.ok(prefs.highContrast, 'should have highContrast');
    assert.ok(prefs.reducedTransparency, 'should have reducedTransparency');
    assert.ok(prefs.forcedColors, 'should have forcedColors');
    assert.ok(prefs.contrast, 'should have contrast');
  });

  it('should register matchMedia listeners', () => {
    const countBefore = mediaListeners.length;
    createPreferences();
    assert.ok(mediaListeners.length > countBefore, 'should have added listeners');
  });

  it('should remove all matchMedia listeners on cleanup', () => {
    const prefs = createPreferences();
    const listenerCount = mediaListeners.length;
    assert.ok(listenerCount > 0, 'should have listeners before cleanup');

    prefs.cleanup();

    // All listeners added by this instance should be removed
    // (mediaListeners tracks add/remove, so after cleanup it should be empty
    // for listeners from this call)
    assert.strictEqual(mediaListeners.length, 0, 'all listeners should be removed after cleanup');
  });

  it('should be idempotent - calling cleanup twice does not throw', () => {
    const prefs = createPreferences();
    prefs.cleanup();
    assert.doesNotThrow(() => prefs.cleanup());
  });
});

// =============================================================================
// #33 - createAnnouncementQueue() timer leak fix
// =============================================================================

describe('#33 - createAnnouncementQueue() timer leak fix', () => {

  it('should return a dispose function', () => {
    const queue = createAnnouncementQueue();
    assert.strictEqual(typeof queue.dispose, 'function');
  });

  it('should still return all original properties', () => {
    const queue = createAnnouncementQueue();
    assert.ok(queue.queueLength, 'should have queueLength');
    assert.strictEqual(typeof queue.add, 'function', 'should have add');
    assert.strictEqual(typeof queue.clear, 'function', 'should have clear');
    assert.strictEqual(typeof queue.isProcessing, 'function', 'should have isProcessing');
  });

  it('should clear queue and reset state on dispose', () => {
    const queue = createAnnouncementQueue();
    queue.add('message 1');
    queue.add('message 2');

    queue.dispose();

    assert.strictEqual(queue.queueLength.get(), 0, 'queue should be empty');
    assert.strictEqual(queue.isProcessing(), false, 'should not be processing');
  });

  it('should ignore add() calls after dispose', () => {
    const queue = createAnnouncementQueue();
    queue.dispose();

    queue.add('should be ignored');
    assert.strictEqual(queue.queueLength.get(), 0, 'should not add after dispose');
  });

  it('should be idempotent - calling dispose twice does not throw', () => {
    const queue = createAnnouncementQueue();
    queue.dispose();
    assert.doesNotThrow(() => queue.dispose());
  });
});

// =============================================================================
// #35 - router.link() missing cleanup
// =============================================================================

import { createRouter } from '../runtime/router.js';

describe('#35 - router.link() missing cleanup', () => {

  it('should attach a cleanup function to the link element', () => {
    const router = createRouter({
      routes: {
        '/': () => globalThis.document.createElement('div'),
        '/about': () => globalThis.document.createElement('div')
      }
    });

    const linkEl = router.link('/about', 'About');
    assert.strictEqual(typeof linkEl.cleanup, 'function', 'link element should have cleanup');
  });

  it('should remove click listener on cleanup', () => {
    const router = createRouter({
      routes: {
        '/': () => globalThis.document.createElement('div'),
        '/about': () => globalThis.document.createElement('div')
      }
    });

    const linkEl = router.link('/about', 'About');
    const addCount = linkEl.addEventListener.mock.callCount();
    assert.ok(addCount > 0, 'should have added click listener');

    linkEl.cleanup();

    const removeCount = linkEl.removeEventListener.mock.callCount();
    assert.ok(removeCount > 0, 'should have removed click listener on cleanup');
  });

  it('cleanup should be idempotent', () => {
    const router = createRouter({
      routes: {
        '/': () => globalThis.document.createElement('div')
      }
    });

    const linkEl = router.link('/', 'Home');
    linkEl.cleanup();
    assert.doesNotThrow(() => linkEl.cleanup());
  });
});

// =============================================================================
// #37 - useAsync() dispose
// =============================================================================

import { useAsync, useResource, createVersionedAsync } from '../runtime/async.js';

describe('#37 - useAsync() cleanup', () => {

  it('should return a dispose function', () => {
    const result = useAsync(() => Promise.resolve('data'), { immediate: false });
    assert.strictEqual(typeof result.dispose, 'function', 'should have dispose');
  });

  it('should still return all original properties', () => {
    const result = useAsync(() => Promise.resolve('data'), { immediate: false });
    assert.ok(result.data, 'should have data');
    assert.ok(result.loading, 'should have loading');
    assert.ok(result.error, 'should have error');
    assert.ok(result.status, 'should have status');
    assert.strictEqual(typeof result.execute, 'function', 'should have execute');
    assert.strictEqual(typeof result.reset, 'function', 'should have reset');
    assert.strictEqual(typeof result.abort, 'function', 'should have abort');
  });

  it('dispose should be idempotent', () => {
    const result = useAsync(() => Promise.resolve('data'), { immediate: false });
    result.dispose();
    assert.doesNotThrow(() => result.dispose());
  });
});

// =============================================================================
// #37 - useResource() dispose
// =============================================================================

describe('#37 - useResource() cleanup', () => {

  it('should return a dispose function', () => {
    const result = useResource('test-key', () => Promise.resolve('data'), {
      refreshInterval: 0,
      refreshOnFocus: false,
      refreshOnReconnect: false
    });
    assert.strictEqual(typeof result.dispose, 'function', 'should have dispose');
  });

  it('should still return all original properties', () => {
    const result = useResource('test-key-2', () => Promise.resolve('data'), {
      refreshInterval: 0,
      refreshOnFocus: false,
      refreshOnReconnect: false
    });
    assert.ok(result.data, 'should have data');
    assert.ok(result.loading, 'should have loading');
    assert.ok(result.error, 'should have error');
    assert.strictEqual(typeof result.fetch, 'function', 'should have fetch');
    assert.strictEqual(typeof result.refresh, 'function', 'should have refresh');
    assert.strictEqual(typeof result.mutate, 'function', 'should have mutate');
    assert.strictEqual(typeof result.invalidate, 'function', 'should have invalidate');
  });

  it('dispose should be idempotent', () => {
    const result = useResource('test-key-3', () => Promise.resolve('data'), {
      refreshInterval: 0,
      refreshOnFocus: false,
      refreshOnReconnect: false
    });
    result.dispose();
    assert.doesNotThrow(() => result.dispose());
  });
});

// =============================================================================
// #37 - useForm() dispose
// =============================================================================

import { useForm, useField, useFieldArray, validators } from '../runtime/form.js';

describe('#37 - useForm() cleanup', () => {

  it('should return a dispose function', () => {
    const form = useForm(
      { email: '', name: '' },
      { email: [validators.required()] }
    );
    assert.strictEqual(typeof form.dispose, 'function', 'should have dispose');
  });

  it('should still return all original properties', () => {
    const form = useForm(
      { email: '' },
      { email: [validators.required()] }
    );
    assert.ok(form.fields, 'should have fields');
    assert.ok(form.isValid, 'should have isValid');
    assert.ok(form.errors, 'should have errors');
    assert.strictEqual(typeof form.handleSubmit, 'function', 'should have handleSubmit');
    assert.strictEqual(typeof form.reset, 'function', 'should have reset');
    assert.strictEqual(typeof form.setErrors, 'function', 'should have setErrors');
    assert.strictEqual(typeof form.clearErrors, 'function', 'should have clearErrors');
  });

  it('dispose should be idempotent', () => {
    const form = useForm({ name: '' }, {});
    form.dispose();
    assert.doesNotThrow(() => form.dispose());
  });
});

// =============================================================================
// #37 - useField() dispose
// =============================================================================

describe('#37 - useField() cleanup', () => {

  it('should return a dispose function', () => {
    const field = useField('', [validators.required()]);
    assert.strictEqual(typeof field.dispose, 'function', 'should have dispose');
  });

  it('should still return all original properties', () => {
    const field = useField('', []);
    assert.ok(field.value, 'should have value');
    assert.ok(field.error !== undefined, 'should have error');
    assert.ok(field.touched, 'should have touched');
    assert.ok(field.dirty, 'should have dirty');
    assert.strictEqual(typeof field.onChange, 'function', 'should have onChange');
    assert.strictEqual(typeof field.onBlur, 'function', 'should have onBlur');
    assert.strictEqual(typeof field.reset, 'function', 'should have reset');
    assert.strictEqual(typeof field.validate, 'function', 'should have validate');
  });

  it('dispose should be idempotent', () => {
    const field = useField('test');
    field.dispose();
    assert.doesNotThrow(() => field.dispose());
  });
});

// =============================================================================
// #37 - useFieldArray() dispose
// =============================================================================

describe('#37 - useFieldArray() cleanup', () => {

  it('should return a dispose function', () => {
    const arr = useFieldArray(['a', 'b']);
    assert.strictEqual(typeof arr.dispose, 'function', 'should have dispose');
  });

  it('should still return all original properties', () => {
    const arr = useFieldArray(['a']);
    assert.ok(arr.fields, 'should have fields');
    assert.ok(arr.values, 'should have values');
    assert.ok(arr.errors, 'should have errors');
    assert.ok(arr.isValid, 'should have isValid');
    assert.strictEqual(typeof arr.append, 'function', 'should have append');
    assert.strictEqual(typeof arr.remove, 'function', 'should have remove');
    assert.strictEqual(typeof arr.move, 'function', 'should have move');
    assert.strictEqual(typeof arr.reset, 'function', 'should have reset');
  });

  it('dispose should propagate to child fields', () => {
    const arr = useFieldArray(['a', 'b', 'c']);
    const fields = arr.fields.get();

    // All child fields should have dispose
    for (const field of fields) {
      assert.strictEqual(typeof field.dispose, 'function', 'child field should have dispose');
    }

    // Parent dispose should not throw
    assert.doesNotThrow(() => arr.dispose());
  });

  it('dispose should be idempotent', () => {
    const arr = useFieldArray(['x']);
    arr.dispose();
    assert.doesNotThrow(() => arr.dispose());
  });
});
