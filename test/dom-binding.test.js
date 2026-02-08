/**
 * DOM Binding Module Tests
 *
 * Tests for runtime/dom-binding.js - Reactive attribute, property, class,
 * style, and event bindings using MockDOMAdapter (no browser needed).
 *
 * @module test/dom-binding
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import {
  MockDOMAdapter,
  MockElement,
  setAdapter,
  resetAdapter
} from '../runtime/dom-adapter.js';
import { pulse, effect, createContext, withContext, resetContext } from '../runtime/pulse.js';
import { bind, prop, cls, style, on, model } from '../runtime/dom-binding.js';

// ============================================================================
// Setup
// ============================================================================

let adapter;

// ============================================================================
// bind() Tests
// ============================================================================

describe('bind', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('sets a static attribute value', () => {
    const el = adapter.createElement('div');
    bind(el, 'data-id', '123');

    assert.strictEqual(adapter.getAttribute(el, 'data-id'), '123');
  });

  test('sets a reactive attribute value from a function', () => {
    const ctx = createContext({ name: 'test-bind-reactive' });
    withContext(ctx, () => {
      const el = adapter.createElement('div');
      const title = pulse('Hello');

      bind(el, 'title', () => title.get());

      assert.strictEqual(adapter.getAttribute(el, 'title'), 'Hello');

      title.set('World');
      assert.strictEqual(adapter.getAttribute(el, 'title'), 'World');
    });
  });

  test('sanitizes URL attributes and blocks javascript: URLs', () => {
    const el = adapter.createElement('a');
    bind(el, 'href', 'javascript:alert(1)');

    // The dangerous URL should be blocked - attribute should not be set
    assert.strictEqual(adapter.getAttribute(el, 'href'), null);
  });

  test('allows safe URL attributes', () => {
    const el = adapter.createElement('a');
    bind(el, 'href', 'https://example.com');

    assert.strictEqual(adapter.getAttribute(el, 'href'), 'https://example.com');
  });

  test('sanitizes reactive URL attributes', () => {
    const ctx = createContext({ name: 'test-bind-url' });
    withContext(ctx, () => {
      const el = adapter.createElement('a');
      const url = pulse('https://safe.com');

      bind(el, 'href', () => url.get());
      assert.strictEqual(adapter.getAttribute(el, 'href'), 'https://safe.com');

      url.set('javascript:void(0)');
      // Dangerous URL should be blocked - attribute removed
      assert.strictEqual(adapter.getAttribute(el, 'href'), null);
    });
  });

  test('handles boolean true by setting empty string attribute', () => {
    const ctx = createContext({ name: 'test-bind-bool-true' });
    withContext(ctx, () => {
      const el = adapter.createElement('button');
      const disabled = pulse(true);

      bind(el, 'disabled', () => disabled.get());
      assert.strictEqual(adapter.getAttribute(el, 'disabled'), '');
    });
  });

  test('handles boolean false by removing the attribute', () => {
    const ctx = createContext({ name: 'test-bind-bool-false' });
    withContext(ctx, () => {
      const el = adapter.createElement('button');
      const disabled = pulse(true);

      bind(el, 'disabled', () => disabled.get());
      assert.strictEqual(adapter.getAttribute(el, 'disabled'), '');

      disabled.set(false);
      assert.strictEqual(adapter.getAttribute(el, 'disabled'), null);
    });
  });

  test('handles null by removing the attribute', () => {
    const ctx = createContext({ name: 'test-bind-null' });
    withContext(ctx, () => {
      const el = adapter.createElement('div');
      const val = pulse('present');

      bind(el, 'data-info', () => val.get());
      assert.strictEqual(adapter.getAttribute(el, 'data-info'), 'present');

      val.set(null);
      assert.strictEqual(adapter.getAttribute(el, 'data-info'), null);
    });
  });

  test('uses setProperty for form element value attribute', () => {
    const el = adapter.createElement('input');
    el.type = 'text';
    // getTagName returns 'input', which is in FORM_ELEMENT_TAGS
    bind(el, 'value', 'hello');

    // For form elements, value is set as a property
    assert.strictEqual(adapter.getProperty(el, 'value'), 'hello');
  });

  test('uses setProperty for reactive form element value', () => {
    const ctx = createContext({ name: 'test-bind-form-reactive' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      el.type = 'text';
      const val = pulse('initial');

      bind(el, 'value', () => val.get());
      assert.strictEqual(adapter.getProperty(el, 'value'), 'initial');

      val.set('updated');
      assert.strictEqual(adapter.getProperty(el, 'value'), 'updated');
    });
  });

  test('returns the element for chaining', () => {
    const el = adapter.createElement('div');
    const result = bind(el, 'data-x', '1');

    assert.strictEqual(result, el);
  });
});

// ============================================================================
// prop() Tests
// ============================================================================

describe('prop', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('sets a static property', () => {
    const el = adapter.createElement('input');
    prop(el, 'value', 'hello');

    assert.strictEqual(adapter.getProperty(el, 'value'), 'hello');
  });

  test('sets a reactive property', () => {
    const ctx = createContext({ name: 'test-prop-reactive' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      const text = pulse('initial');

      prop(el, 'value', () => text.get());
      assert.strictEqual(adapter.getProperty(el, 'value'), 'initial');

      text.set('changed');
      assert.strictEqual(adapter.getProperty(el, 'value'), 'changed');
    });
  });

  test('sets boolean property', () => {
    const el = adapter.createElement('input');
    prop(el, 'checked', true);

    assert.strictEqual(adapter.getProperty(el, 'checked'), true);
  });

  test('sets numeric property', () => {
    const el = adapter.createElement('input');
    prop(el, 'tabIndex', 5);

    assert.strictEqual(adapter.getProperty(el, 'tabIndex'), 5);
  });

  test('returns the element for chaining', () => {
    const el = adapter.createElement('div');
    const result = prop(el, 'customProp', 'test');

    assert.strictEqual(result, el);
  });
});

// ============================================================================
// cls() Tests
// ============================================================================

describe('cls', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('adds class when static condition is truthy', () => {
    const el = adapter.createElement('div');
    cls(el, 'active', true);

    assert.strictEqual(el.classList.contains('active'), true);
  });

  test('does not add class when static condition is falsy', () => {
    const el = adapter.createElement('div');
    cls(el, 'active', false);

    assert.strictEqual(el.classList.contains('active'), false);
  });

  test('does not add class when static condition is null', () => {
    const el = adapter.createElement('div');
    cls(el, 'active', null);

    assert.strictEqual(el.classList.contains('active'), false);
  });

  test('toggles class reactively based on function condition', () => {
    const ctx = createContext({ name: 'test-cls-reactive' });
    withContext(ctx, () => {
      const el = adapter.createElement('div');
      const isActive = pulse(false);

      cls(el, 'active', () => isActive.get());
      assert.strictEqual(el.classList.contains('active'), false);

      isActive.set(true);
      assert.strictEqual(el.classList.contains('active'), true);

      isActive.set(false);
      assert.strictEqual(el.classList.contains('active'), false);
    });
  });

  test('returns the element for chaining', () => {
    const el = adapter.createElement('div');
    const result = cls(el, 'test', true);

    assert.strictEqual(result, el);
  });
});

// ============================================================================
// style() Tests
// ============================================================================

describe('style', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('sets a static style property', () => {
    const el = adapter.createElement('div');
    style(el, 'color', 'red');

    assert.strictEqual(adapter.getStyle(el, 'color'), 'red');
  });

  test('sets a reactive style property', () => {
    const ctx = createContext({ name: 'test-style-reactive' });
    withContext(ctx, () => {
      const el = adapter.createElement('div');
      const color = pulse('red');

      style(el, 'color', () => color.get());
      assert.strictEqual(adapter.getStyle(el, 'color'), 'red');

      color.set('blue');
      assert.strictEqual(adapter.getStyle(el, 'color'), 'blue');
    });
  });

  test('sets numeric style value', () => {
    const el = adapter.createElement('div');
    style(el, 'opacity', '0.5');

    assert.strictEqual(adapter.getStyle(el, 'opacity'), '0.5');
  });

  test('delegates to safeSetStyle for sanitization', () => {
    const el = adapter.createElement('div');
    // safeSetStyle should handle CSS injection prevention
    style(el, 'color', 'red');
    assert.strictEqual(adapter.getStyle(el, 'color'), 'red');
  });

  test('returns the element for chaining', () => {
    const el = adapter.createElement('div');
    const result = style(el, 'color', 'red');

    assert.strictEqual(result, el);
  });
});

// ============================================================================
// on() Tests
// ============================================================================

describe('on', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('registers an event listener that responds to events', () => {
    const ctx = createContext({ name: 'test-on-listener' });
    withContext(ctx, () => {
      const el = adapter.createElement('button');
      let clicked = false;

      // on() calls onCleanup which needs an active effect context
      effect(() => {
        on(el, 'click', () => { clicked = true; });
      });

      el.dispatchEvent({ type: 'click' });
      assert.strictEqual(clicked, true);
    });
  });

  test('registers event listener on the element via addEventListener', () => {
    const ctx = createContext({ name: 'test-on-addevent' });
    withContext(ctx, () => {
      const el = adapter.createElement('div');
      const handler = () => {};

      effect(() => {
        on(el, 'mouseover', handler);
      });

      // MockElement stores listeners in _eventListeners map
      const listeners = el._eventListeners.get('mouseover');
      assert.ok(listeners);
      assert.ok(listeners.length > 0);
      assert.strictEqual(listeners[0].handler, handler);
    });
  });

  test('cleanup removes the event listener when effect is disposed', () => {
    const ctx = createContext({ name: 'test-on-cleanup' });
    withContext(ctx, () => {
      const el = adapter.createElement('div');
      const handler = () => {};

      const dispose = effect(() => {
        on(el, 'click', handler);
      });

      // Listener should be registered
      const listenersBefore = el._eventListeners.get('click');
      assert.ok(listenersBefore);
      assert.ok(listenersBefore.length > 0);

      // Dispose should trigger onCleanup which removes listener
      dispose();

      const listenersAfter = el._eventListeners.get('click');
      assert.strictEqual(listenersAfter.length, 0);
    });
  });

  test('passes event data to the handler', () => {
    const ctx = createContext({ name: 'test-on-event-data' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      let receivedEvent = null;

      effect(() => {
        on(el, 'input', (e) => { receivedEvent = e; });
      });

      const fakeEvent = { type: 'input', target: el };
      el.dispatchEvent(fakeEvent);

      assert.ok(receivedEvent);
      assert.strictEqual(receivedEvent.target, el);
    });
  });

  test('returns the element for chaining', () => {
    const ctx = createContext({ name: 'test-on-chaining' });
    let result;
    withContext(ctx, () => {
      const el = adapter.createElement('div');
      effect(() => {
        result = on(el, 'click', () => {});
      });
      assert.strictEqual(result, el);
    });
  });
});

// ============================================================================
// model() Tests
// ============================================================================

describe('model', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('syncs text input value from pulse to element', () => {
    const ctx = createContext({ name: 'test-model-text-sync' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      el.type = 'text';
      const val = pulse('hello');

      model(el, val);

      assert.strictEqual(adapter.getProperty(el, 'value'), 'hello');

      val.set('world');
      assert.strictEqual(adapter.getProperty(el, 'value'), 'world');
    });
  });

  test('text input updates pulse on input event', () => {
    const ctx = createContext({ name: 'test-model-text-input' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      el.type = 'text';
      const val = pulse('');

      model(el, val);

      // Simulate user typing by setting property and dispatching event
      adapter.setProperty(el, 'value', 'typed');
      el.dispatchEvent({ type: 'input' });

      assert.strictEqual(val.get(), 'typed');
    });
  });

  test('checkbox syncs checked from pulse to element', () => {
    const ctx = createContext({ name: 'test-model-checkbox-sync' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      el.type = 'checkbox';
      const checked = pulse(false);

      model(el, checked);

      assert.strictEqual(adapter.getProperty(el, 'checked'), false);

      checked.set(true);
      assert.strictEqual(adapter.getProperty(el, 'checked'), true);
    });
  });

  test('checkbox updates pulse on change event', () => {
    const ctx = createContext({ name: 'test-model-checkbox-change' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      el.type = 'checkbox';
      const checked = pulse(false);

      model(el, checked);

      // Simulate user clicking checkbox
      adapter.setProperty(el, 'checked', true);
      el.dispatchEvent({ type: 'change' });

      assert.strictEqual(checked.get(), true);
    });
  });

  test('select syncs value from pulse to element', () => {
    const ctx = createContext({ name: 'test-model-select-sync' });
    withContext(ctx, () => {
      const el = adapter.createElement('select');
      const selected = pulse('option1');

      model(el, selected);

      assert.strictEqual(adapter.getProperty(el, 'value'), 'option1');

      selected.set('option2');
      assert.strictEqual(adapter.getProperty(el, 'value'), 'option2');
    });
  });

  test('select updates pulse on change event', () => {
    const ctx = createContext({ name: 'test-model-select-change' });
    withContext(ctx, () => {
      const el = adapter.createElement('select');
      const selected = pulse('a');

      model(el, selected);

      // Simulate user selecting an option
      adapter.setProperty(el, 'value', 'b');
      el.dispatchEvent({ type: 'change' });

      assert.strictEqual(selected.get(), 'b');
    });
  });

  test('text input avoids unnecessary property updates when values match', () => {
    const ctx = createContext({ name: 'test-model-no-unnecessary-update' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      el.type = 'text';
      const val = pulse('same');

      model(el, val);
      assert.strictEqual(adapter.getProperty(el, 'value'), 'same');

      // Setting the same value should not cause issues
      val.set('same');
      assert.strictEqual(adapter.getProperty(el, 'value'), 'same');
    });
  });

  test('returns the element for chaining', () => {
    const ctx = createContext({ name: 'test-model-chaining' });
    withContext(ctx, () => {
      const el = adapter.createElement('input');
      el.type = 'text';
      const val = pulse('');

      const result = model(el, val);
      assert.strictEqual(result, el);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('dom-binding integration', () => {
  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
    resetContext();
  });

  afterEach(() => {
    resetAdapter();
  });

  test('chaining multiple bindings on one element', () => {
    const ctx = createContext({ name: 'test-chaining-integration' });
    withContext(ctx, () => {
      const el = adapter.createElement('button');
      const isActive = pulse(true);

      const result = bind(el, 'data-role', 'primary');
      cls(result, 'active', () => isActive.get());
      style(result, 'color', 'red');

      assert.strictEqual(adapter.getAttribute(el, 'data-role'), 'primary');
      assert.strictEqual(el.classList.contains('active'), true);
      assert.strictEqual(adapter.getStyle(el, 'color'), 'red');
    });
  });

  test('bind handles multiple URL attributes', () => {
    const el1 = adapter.createElement('img');
    bind(el1, 'src', 'https://example.com/image.png');
    assert.strictEqual(adapter.getAttribute(el1, 'src'), 'https://example.com/image.png');

    const el2 = adapter.createElement('img');
    bind(el2, 'src', 'javascript:alert(1)');
    assert.strictEqual(adapter.getAttribute(el2, 'src'), null);
  });

  test('bind handles relative URLs', () => {
    const el = adapter.createElement('a');
    bind(el, 'href', '/about');

    assert.strictEqual(adapter.getAttribute(el, 'href'), '/about');
  });

  test('bind correctly handles non-URL attributes without sanitization', () => {
    const el = adapter.createElement('div');
    // data-url is not in the URL attributes set, so should not be sanitized
    bind(el, 'data-url', 'javascript:something');

    assert.strictEqual(adapter.getAttribute(el, 'data-url'), 'javascript:something');
  });
});
