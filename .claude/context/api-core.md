# API Reference: Core (Reactivity + DOM)

> Load this context file when working on reactivity (pulse, effect, computed) or DOM creation (el, mount, list, when).

### Reactivity (runtime/pulse.js)

```javascript
// Create reactive values
const count = pulse(0);
count.get();              // Read (tracks dependency)
count.peek();             // Read without tracking
count.set(5);             // Direct set
count.update(n => n + 1); // Functional update
count.subscribe(v => console.log(v)); // Manual subscription, returns unsubscribe fn
count.derive(n => n * 2); // Create derived pulse (shorthand for computed)

// pulse() options
const user = pulse({ name: 'Alice' }, {
  equals: (a, b) => a.id === b.id  // Custom equality (default: Object.is)
});

// Effects auto-run when dependencies change
const dispose = effect(() => console.log(count.get()));
dispose(); // Stop the effect

// effect() options
effect(() => {
  // Effect logic that might fail
  riskyOperation();
}, {
  id: 'data-sync',                            // Custom ID for debugging
  onError: (err) => {
    console.error('Effect failed:', err.effectId, err.phase, err.cause);
  }
});

// Global effect error handler
import { onEffectError, EffectError } from 'pulse-js-framework/runtime/pulse';
onEffectError((err) => {
  reportError({ id: err.effectId, phase: err.phase, cause: err.cause });
});

// Effect cleanup (runs before re-run or dispose)
effect(() => {
  const timer = setInterval(() => tick(), 1000);
  return () => clearInterval(timer);  // Cleanup function
});

// Alternative: onCleanup() for multiple cleanups
import { onCleanup } from 'pulse-js-framework/runtime/pulse';
effect(() => {
  const sub1 = eventBus.on('event1', handler1);
  const sub2 = eventBus.on('event2', handler2);
  onCleanup(() => sub1.unsubscribe());
  onCleanup(() => sub2.unsubscribe());
});

// Computed values (derived state)
const doubled = computed(() => count.get() * 2);

// computed() options
const expensive = computed(() => heavyCalculation(data.get()), {
  lazy: true  // Only compute when read (default: false = eager)
});
expensive.dispose(); // Clean up computed when no longer needed

// Batch updates (defer effects until complete)
batch(() => {
  count.set(1);
  count.set(2);
}); // Effects run once with final value

// Untrack reads (read without creating dependency)
import { untrack } from 'pulse-js-framework/runtime/pulse';
effect(() => {
  const tracked = count.get();        // Creates dependency
  const untracked = untrack(() => other.get());  // No dependency
});

// Isolated reactive contexts (for testing/SSR)
import { createContext, withContext, resetContext } from 'pulse-js-framework/runtime/pulse';

// Testing with isolated context
const testCtx = createContext({ name: 'test' });
withContext(testCtx, () => {
  const count = pulse(0);  // Only exists in testCtx
  effect(() => console.log(count.get()));
});
testCtx.reset();  // Clean up after test
resetContext();   // Reset global context

// ===== watch() =====
// Watch specific pulses and run callback on change (simpler than effect())
import { watch } from 'pulse-js-framework/runtime/pulse';

// Single source - callback receives ([newVal], [oldVal])
const stop = watch(count, ([newVal], [oldVal]) => {
  console.log(`Changed from ${oldVal} to ${newVal}`);
});
stop(); // Stop watching

// Multiple sources
watch([firstName, lastName], ([newFirst, newLast], [oldFirst, oldLast]) => {
  console.log(`Name changed to ${newFirst} ${newLast}`);
});

// ===== createState() =====
// Create a reactive object (proxy-based) from a plain object
import { createState } from 'pulse-js-framework/runtime/pulse';

const state = createState({ count: 0, name: 'Alice', items: [1, 2, 3] });

// Read/write like plain object (reactive under the hood)
state.count = 5;           // Triggers effects
console.log(state.count);  // 5

// Reactive in effects
effect(() => console.log(state.name));
state.name = 'Bob';  // Effect re-runs

// Access underlying pulse
const countPulse = state.$pulse('count');

// Array helpers (reactive mutations)
state.items$push(4, 5);        // [1, 2, 3, 4, 5]
state.items$pop();             // Removes last
state.items$shift();           // Removes first
state.items$unshift(0);        // Adds to front
state.items$splice(1, 2);      // Splice
state.items$filter(x => x > 2); // In-place filter
state.items$map(x => x * 2);    // In-place map
state.items$sort((a, b) => a - b); // In-place sort

// ===== memo() =====
// Memoize expensive function calls (caches last call)
import { memo } from 'pulse-js-framework/runtime/pulse';

const expensiveCalc = memo((x, y) => {
  console.log('Computing...');
  return x * y;
});

expensiveCalc(2, 3); // Logs "Computing...", returns 6
expensiveCalc(2, 3); // Returns 6 (cached, no log)
expensiveCalc(3, 4); // Logs "Computing...", returns 12

// Custom equality for object args
const memoized = memo(
  (obj) => obj.value * 2,
  { equals: (a, b) => a?.value === b?.value }
);

// ===== memoComputed() =====
// Memoized computed value - only recalculates when deps actually change
import { memoComputed } from 'pulse-js-framework/runtime/pulse';

const items = pulse([1, 2, 3, 4, 5]);
const filter = pulse('');

const filtered = memoComputed(
  () => items.get().filter(i => String(i).includes(filter.get())),
  { deps: [items, filter] }
);

// ===== fromPromise() =====
// Wrap a Promise into reactive state { value, loading, error }
import { fromPromise } from 'pulse-js-framework/runtime/pulse';

const { value, loading, error } = fromPromise(
  fetch('/api/data').then(r => r.json()),
  []  // Optional initial value
);

effect(() => {
  if (loading.get()) return console.log('Loading...');
  if (error.get()) return console.log('Error:', error.get());
  console.log('Data:', value.get());
});
```

### DOM Creation (runtime/dom.js)

```javascript
// CSS selector syntax
el('div.container#main')  // <div class="container" id="main">
el('input[type=text]')    // <input type="text">
el('button.btn.primary')  // <button class="btn primary">
el('a[href=/home]')       // <a href="/home">

// ===== el() Full API =====
// el(selector, ...children) or el(selector, attributes, ...children)

// Children can be: strings, numbers, Nodes, arrays, or functions (reactive)
el('div', 'Hello')                       // Text child
el('div', 42)                            // Number becomes text
el('div', childElement)                  // DOM node child
el('div', [child1, child2, child3])      // Array of children
el('div', child1, child2, child3)        // Multiple children as args
el('div', () => `Count: ${count.get()}`) // Reactive child (re-renders on change)

// Nested elements
el('ul', [
  el('li', 'Item 1'),
  el('li', 'Item 2'),
  el('li', 'Item 3')
])

// Attributes object (when first child is plain object)
el('input', { type: 'email', placeholder: 'Enter email' })
el('button', { disabled: true, onclick: handleClick }, 'Submit')

// Reactive/dynamic attributes (functions)
el('button', {
  class: () => isActive.get() ? 'active' : '',      // Reactive class
  disabled: () => isLoading.get(),                   // Reactive attribute
  style: () => `color: ${color.get()}`,              // Reactive style
  onclick: (e) => handleClick(e)                     // Event handler
})

// Dynamic attribute values in selector (for form bindings)
el('input[type=text]', {
  value: () => name.get(),           // One-way binding (display)
  oninput: (e) => name.set(e.target.value)  // Update on input
})

// Combined: selector + attributes + children
el('article.post', { id: 'post-123' },
  el('h2', post.title),
  el('p', post.content)
)

// Falsy children are ignored
el('div',
  showHeader && el('header', 'Header'),  // Renders if showHeader is truthy
  null,                                   // Ignored
  undefined,                              // Ignored
  false                                   // Ignored
)

// Automatic ARIA attributes (enabled by default)
el('dialog')              // Auto: role="dialog" aria-modal="true"
el('button')              // Auto: type="button"
el('a')                   // Auto: role="button" tabindex="0" (if no href)
el('div[role=checkbox]')  // Auto: aria-checked="false"
el('div[role=slider]')    // Auto: aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"

// Configure auto-ARIA behavior
import { configureA11y } from 'pulse-js-framework/runtime';
configureA11y({
  enabled: true,           // Enable/disable all auto-ARIA (default: true)
  autoAria: true,          // Auto-apply ARIA to semantic elements (default: true)
  warnMissingAlt: true,    // Warn when <img> missing alt (default: true)
  warnMissingLabel: true   // Warn when form controls missing labels (default: true)
});

// ===== Reactive Bindings =====
import { text, bind, on, model, prop, cls, style, show } from 'pulse-js-framework/runtime';

// text() - Reactive text node
const greeting = text(() => `Hello, ${name.get()}!`);

// bind() - Reactive attribute binding
bind(element, 'class', () => isActive.get() ? 'active' : '');
bind(element, 'aria-expanded', () => String(isOpen.get()));

// prop() - Reactive property binding (not attribute)
prop(input, 'value', () => text.get());

// cls() - Reactive class toggle
cls(element, 'active', () => isActive.get());
cls(element, 'loading', isLoading);  // Also accepts Pulse directly

// style() - Reactive inline style
style(element, 'color', () => theme.get().textColor);
style(element, 'display', () => visible.get() ? 'block' : 'none');

// show() - Conditional visibility (display: none)
show(element, () => isVisible.get());

// on() - Event listener
on(element, 'click', (e) => handleClick(e));
on(element, 'input', (e) => value.set(e.target.value));

// model() - Two-way binding (like v-model)
model(input, valuePulse);  // Syncs input.value <-> valuePulse

// ===== Conditional & List Rendering =====
import { when, match, list } from 'pulse-js-framework/runtime';

// when() - Conditional rendering
when(
  () => loading.get(),
  () => el('.spinner', 'Loading...'),      // If true
  () => el('.content', data.get())          // If false (optional)
)

// match() - Multi-condition rendering (switch-like)
match(
  [() => status.get() === 'loading', () => el('.spinner')],
  [() => status.get() === 'error', () => el('.error', error.get())],
  [() => status.get() === 'success', () => el('.data', data.get())],
  [() => true, () => el('.empty', 'No data')]  // Default case
)

// list() - Reactive list rendering
list(
  () => items.get(),                        // Data source (reactive)
  (item, index) => el('li', item.name),     // Render function
  (item) => item.id                          // Key function (important for performance)
)

// Mounting to DOM
import { mount } from 'pulse-js-framework/runtime';
const app = el('.app', [Header(), Content(), Footer()]);
const unmount = mount('#root', app);  // Appends to #root, returns unmount function
unmount();  // Removes app from DOM

// Lifecycle hooks
import { onMount, onUnmount, component } from 'pulse-js-framework/runtime';
onMount(() => console.log('Mounted!'));
onUnmount(() => console.log('Unmounted, cleanup here'));

// Component factory with lifecycle
const MyComponent = component((ctx) => {
  const count = ctx.state('count', 0);
  ctx.onMount(() => console.log('Component mounted'));
  ctx.onUnmount(() => console.log('Component unmounted'));
  return ctx.el('div', `Count: ${count.get()}`);
});
```

