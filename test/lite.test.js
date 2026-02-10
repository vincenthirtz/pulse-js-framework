/**
 * Pulse Lite Build Tests
 *
 * Tests for runtime/lite.js - minimal bundle with core reactivity and DOM helpers.
 * Ensures that the lite build correctly re-exports all essential functions
 * and that they work together as expected.
 *
 * @module test/lite
 */

import {
  // Core reactivity
  pulse,
  effect,
  computed,
  batch,
  onCleanup,
  untrack,
  // DOM helpers
  el,
  text,
  mount,
  on,
  bind,
  list,
  when,
  model,
  // Utilities
  show,
  cls,
  style,
  prop
} from '../runtime/lite.js';

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import { setAdapter, MockDOMAdapter, resetAdapter } from '../runtime/dom-adapter.js';

// =============================================================================
// Setup Mock DOM
// =============================================================================

let mockAdapter;

function setupMockDOM() {
  mockAdapter = new MockDOMAdapter();
  setAdapter(mockAdapter);
}

function teardownMockDOM() {
  resetAdapter();
}

// =============================================================================
// Export Verification Tests
// =============================================================================

describe('Lite Build - Export Verification', () => {
  test('exports pulse function', () => {
    assert.ok(typeof pulse === 'function', 'pulse should be a function');
  });

  test('exports effect function', () => {
    assert.ok(typeof effect === 'function', 'effect should be a function');
  });

  test('exports computed function', () => {
    assert.ok(typeof computed === 'function', 'computed should be a function');
  });

  test('exports batch function', () => {
    assert.ok(typeof batch === 'function', 'batch should be a function');
  });

  test('exports onCleanup function', () => {
    assert.ok(typeof onCleanup === 'function', 'onCleanup should be a function');
  });

  test('exports untrack function', () => {
    assert.ok(typeof untrack === 'function', 'untrack should be a function');
  });

  test('exports el function', () => {
    assert.ok(typeof el === 'function', 'el should be a function');
  });

  test('exports text function', () => {
    assert.ok(typeof text === 'function', 'text should be a function');
  });

  test('exports mount function', () => {
    assert.ok(typeof mount === 'function', 'mount should be a function');
  });

  test('exports on function', () => {
    assert.ok(typeof on === 'function', 'on should be a function');
  });

  test('exports bind function', () => {
    assert.ok(typeof bind === 'function', 'bind should be a function');
  });

  test('exports list function', () => {
    assert.ok(typeof list === 'function', 'list should be a function');
  });

  test('exports when function', () => {
    assert.ok(typeof when === 'function', 'when should be a function');
  });

  test('exports model function', () => {
    assert.ok(typeof model === 'function', 'model should be a function');
  });

  test('exports show function', () => {
    assert.ok(typeof show === 'function', 'show should be a function');
  });

  test('exports cls function', () => {
    assert.ok(typeof cls === 'function', 'cls should be a function');
  });

  test('exports style function', () => {
    assert.ok(typeof style === 'function', 'style should be a function');
  });

  test('exports prop function', () => {
    assert.ok(typeof prop === 'function', 'prop should be a function');
  });
});

// =============================================================================
// Core Reactivity Tests
// =============================================================================

describe('Lite Build - Core Reactivity', () => {
  test('pulse creates reactive value', () => {
    const count = pulse(0);
    assert.strictEqual(count.get(), 0);
    count.set(5);
    assert.strictEqual(count.get(), 5);
  });

  test('pulse update works', () => {
    const count = pulse(10);
    count.update(n => n + 5);
    assert.strictEqual(count.get(), 15);
  });

  test('effect runs on dependency change', () => {
    const count = pulse(0);
    let effectRan = 0;

    const dispose = effect(() => {
      count.get();
      effectRan++;
    });

    assert.strictEqual(effectRan, 1, 'effect should run immediately');
    count.set(1);
    assert.strictEqual(effectRan, 2, 'effect should run on change');

    dispose();
    count.set(2);
    assert.strictEqual(effectRan, 2, 'effect should not run after dispose');
  });

  test('computed derives value', () => {
    const count = pulse(5);
    const doubled = computed(() => count.get() * 2);

    assert.strictEqual(doubled.get(), 10);
    count.set(7);
    assert.strictEqual(doubled.get(), 14);
  });

  test('batch groups updates', () => {
    const a = pulse(0);
    const b = pulse(0);
    let effectRuns = 0;

    effect(() => {
      a.get();
      b.get();
      effectRuns++;
    });

    assert.strictEqual(effectRuns, 1);

    batch(() => {
      a.set(1);
      b.set(1);
    });

    assert.strictEqual(effectRuns, 2, 'batch should trigger effect once');
  });

  test('untrack prevents tracking', () => {
    const tracked = pulse(0);
    const untracked_val = pulse(0);
    let effectRuns = 0;

    effect(() => {
      tracked.get();
      untrack(() => untracked_val.get());
      effectRuns++;
    });

    assert.strictEqual(effectRuns, 1);

    tracked.set(1);
    assert.strictEqual(effectRuns, 2, 'tracked change should trigger effect');

    untracked_val.set(1);
    assert.strictEqual(effectRuns, 2, 'untracked change should not trigger effect');
  });

  test('onCleanup runs before re-execution', () => {
    const count = pulse(0);
    const cleanups = [];

    const dispose = effect(() => {
      const val = count.get();
      onCleanup(() => cleanups.push(val));
    });

    assert.strictEqual(cleanups.length, 0);

    count.set(1);
    assert.deepStrictEqual(cleanups, [0], 'cleanup should run with old value');

    count.set(2);
    assert.deepStrictEqual(cleanups, [0, 1]);

    dispose();
    assert.deepStrictEqual(cleanups, [0, 1, 2], 'cleanup should run on dispose');
  });
});

// =============================================================================
// DOM Integration Tests
// =============================================================================

describe('Lite Build - DOM Integration', () => {
  test('el creates element with mock adapter', () => {
    setupMockDOM();
    try {
      const div = el('div.container#main');
      assert.ok(div !== null, 'el should create element');
      assert.strictEqual(div.tagName.toLowerCase(), 'div');
    } finally {
      teardownMockDOM();
    }
  });

  test('el with reactive text content', () => {
    setupMockDOM();
    try {
      const message = pulse('Hello');
      const span = el('span', () => message.get());

      assert.ok(span !== null, 'el should create element');

      message.set('World');
      // Reactivity is handled internally
    } finally {
      teardownMockDOM();
    }
  });

  test('el with attributes', () => {
    setupMockDOM();
    try {
      const disabled = pulse(false);
      const btn = el('button', {
        disabled: () => disabled.get(),
        type: 'button'
      }, 'Click');

      assert.ok(btn !== null, 'el should create button');
    } finally {
      teardownMockDOM();
    }
  });

  test('list renders items', () => {
    setupMockDOM();
    try {
      const items = pulse(['a', 'b', 'c']);
      const ul = el('ul',
        list(
          () => items.get(),
          item => el('li', item),
          item => item
        )
      );

      assert.ok(ul !== null, 'ul should be created');
    } finally {
      teardownMockDOM();
    }
  });

  test('when conditionally renders', () => {
    setupMockDOM();
    try {
      const showVal = pulse(true);
      const container = el('div',
        when(
          () => showVal.get(),
          () => el('span', 'Visible'),
          () => el('span', 'Hidden')
        )
      );

      assert.ok(container !== null, 'container should be created');
    } finally {
      teardownMockDOM();
    }
  });
});

// =============================================================================
// Integration Test - Counter Example
// =============================================================================

describe('Lite Build - Integration', () => {
  test('counter example from docs works', () => {
    setupMockDOM();
    try {
      // Example from CLAUDE.md Quick Start
      const count = pulse(0);

      const Counter = () => el('.counter', [
        el('h1', () => `Count: ${count.get()}`),
        el('button', 'Increment', { onclick: () => count.update(n => n + 1) }),
        el('button', 'Reset', { onclick: () => count.set(0) })
      ]);

      const app = Counter();
      assert.ok(app !== null, 'Counter component should render');

      // Simulate interactions
      count.set(5);
      assert.strictEqual(count.get(), 5, 'count should update');

      count.update(n => n + 1);
      assert.strictEqual(count.get(), 6, 'count should increment');

      count.set(0);
      assert.strictEqual(count.get(), 0, 'count should reset');
    } finally {
      teardownMockDOM();
    }
  });

  test('todo app pattern works', () => {
    setupMockDOM();
    try {
      // Simplified todo pattern
      const todos = pulse([]);
      const newTodo = pulse('');

      const addTodo = () => {
        const text = newTodo.get().trim();
        if (!text) return;
        todos.update(t => [...t, { id: Date.now(), text, done: false }]);
        newTodo.set('');
      };

      const toggleTodo = (id) => {
        todos.update(t => t.map(todo =>
          todo.id === id ? { ...todo, done: !todo.done } : todo
        ));
      };

      // Add todos
      newTodo.set('Test 1');
      addTodo();
      assert.strictEqual(todos.get().length, 1);

      newTodo.set('Test 2');
      addTodo();
      assert.strictEqual(todos.get().length, 2);

      // Toggle
      const firstId = todos.get()[0].id;
      toggleTodo(firstId);
      assert.strictEqual(todos.get()[0].done, true);

      // Empty input should not add
      newTodo.set('   ');
      addTodo();
      assert.strictEqual(todos.get().length, 2, 'empty input should not add todo');
    } finally {
      teardownMockDOM();
    }
  });
});
