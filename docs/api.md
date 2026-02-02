# Pulse API Reference

Complete API documentation for Pulse framework.

## Table of Contents

- [Reactivity](#reactivity)
- [DOM](#dom)
- [Router](#router)
- [Store](#store)
- [Form](#form)
- [Async](#async)
- [DevTools](#devtools)
- [HMR](#hmr)
- [Logger](#logger)
- [Native](#native)

---

## Reactivity

```javascript
import { pulse, effect, computed, batch } from 'pulse-js-framework/runtime';
```

### pulse(value, options?)

Create a reactive value.

```javascript
const count = pulse(0);
const user = pulse({ name: 'John' });

// With custom equality
const config = pulse({ theme: 'dark' }, {
  equals: (a, b) => a.theme === b.theme
});
```

### pulse.get()

Read the value and track as a dependency.

```javascript
const count = pulse(0);
console.log(count.get()); // 0
```

### pulse.peek()

Read the value without tracking as a dependency.

```javascript
effect(() => {
  const value = count.peek(); // Won't re-run when count changes
});
```

### pulse.set(value)

Set a new value and notify subscribers.

```javascript
count.set(5);
```

### pulse.update(fn)

Update the value using a function.

```javascript
count.update(n => n + 1);
```

### pulse.subscribe(fn)

Subscribe to changes. Returns unsubscribe function.

```javascript
const unsubscribe = count.subscribe(value => {
  console.log('New value:', value);
});
```

### effect(fn)

Create a reactive side effect that runs when dependencies change.

```javascript
effect(() => {
  console.log(`Count is ${count.get()}`);
});

// With cleanup
effect(() => {
  const id = setInterval(() => tick(), 1000);
  return () => clearInterval(id);
});
```

### computed(fn, options?)

Create a derived value.

```javascript
const doubled = computed(() => count.get() * 2);

// Eager evaluation (default is lazy)
const eager = computed(() => count.get() * 2, { lazy: false });
```

### batch(fn)

Batch multiple updates into a single effect run.

```javascript
batch(() => {
  count.set(1);
  name.set('John');
  items.set([]);
}); // Effects run once after all updates
```

### watch(source, callback)

Watch specific pulses and run callback on change.

```javascript
watch(count, (newValue, oldValue) => {
  console.log(`Changed from ${oldValue} to ${newValue}`);
});

// Watch multiple
watch([firstName, lastName], ([newFirst, newLast], [oldFirst, oldLast]) => {
  console.log('Name changed');
});
```

### untrack(fn)

Read pulses without creating dependencies.

```javascript
effect(() => {
  const a = count.get(); // tracked
  const b = untrack(() => other.get()); // not tracked
});
```

### onCleanup(fn)

Register cleanup function for current effect.

```javascript
effect(() => {
  const subscription = subscribe();
  onCleanup(() => subscription.unsubscribe());
});
```

---

## DOM

```javascript
import { el, text, bind, on, list, when, mount, model } from 'pulse-js-framework/runtime';
```

### el(selector, ...children)

Create a DOM element using CSS selector syntax.

```javascript
el('div')                    // <div></div>
el('.container')             // <div class="container"></div>
el('#app')                   // <div id="app"></div>
el('button.btn.primary')     // <button class="btn primary"></button>
el('input[type=text]')       // <input type="text">
el('h1', 'Hello World')      // <h1>Hello World</h1>
el('.card', el('h2', title), el('p', body))
```

### text(fn)

Create a reactive text node.

```javascript
const node = text(() => `Count: ${count.get()}`);
```

### bind(element, attribute, fn)

Bind an attribute to a reactive value.

```javascript
bind(button, 'disabled', () => loading.get());
bind(div, 'class', () => isActive.get() ? 'active' : '');
```

### on(element, event, handler, options?)

Add event listener with automatic cleanup.

```javascript
on(button, 'click', () => count.update(n => n + 1));
on(input, 'input', (e) => text.set(e.target.value));
```

### list(items, template, key?)

Render a reactive list with efficient diffing.

```javascript
list(
  () => items.get(),
  (item) => el('li', item.name),
  (item) => item.id // Key function for efficient updates
);
```

### when(condition, thenFn, elseFn?)

Conditional rendering.

```javascript
when(
  () => loading.get(),
  () => el('.spinner'),
  () => el('.content', data)
);
```

### mount(target, element)

Mount an element to the DOM.

```javascript
mount('#app', Counter());
mount(document.body, App());
```

### model(input, pulse)

Two-way data binding.

```javascript
const value = pulse('');
model(input, value);
```

---

## Router

```javascript
import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';
```

### createRouter(options)

Create a router instance.

```javascript
const router = createRouter({
  routes: {
    '/': HomePage,
    '/users/:id': UserPage,
    '/files/*path': FilePage,
    '/admin': {
      handler: AdminPage,
      meta: { requiresAuth: true },
      beforeEnter: (to, from) => {
        if (!isAuth()) return '/login';
      },
      children: {
        '/users': AdminUsersPage
      }
    }
  },
  mode: 'history', // or 'hash'
  scrollBehavior: (to, from, saved) => saved || { x: 0, y: 0 }
});
```

### router.navigate(path, options?)

Navigate to a path.

```javascript
router.navigate('/users/123');
router.navigate('/login', { replace: true });
```

### router.params

Reactive route params.

```javascript
effect(() => {
  console.log('User ID:', router.params.get().id);
});
```

### router.meta

Reactive route meta.

```javascript
effect(() => {
  if (router.meta.get().requiresAuth) {
    // Show auth UI
  }
});
```

### router.beforeEach(guard)

Add global navigation guard.

```javascript
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuth()) {
    return '/login';
  }
});
```

### lazy(loader, options?)

Create a lazy-loaded route handler.

```javascript
const routes = {
  '/dashboard': lazy(() => import('./Dashboard.js')),
  '/settings': lazy(() => import('./Settings.js'), {
    loading: () => el('.spinner'),
    error: (err) => el('.error', err.message),
    timeout: 5000
  })
};
```

### preload(lazyHandler)

Preload a lazy route.

```javascript
link.addEventListener('mouseenter', () => {
  preload(routes['/dashboard']);
});
```

### Middleware

```javascript
const router = createRouter({
  routes,
  middleware: [
    async (ctx, next) => {
      console.log('Navigating to:', ctx.to.path);
      await next();
    },
    async (ctx, next) => {
      if (ctx.to.meta.requiresAuth && !isAuth()) {
        return ctx.redirect('/login');
      }
      await next();
    }
  ]
});

// Add middleware dynamically
const unsubscribe = router.use(async (ctx, next) => {
  await next();
});
```

---

## Store

```javascript
import { createStore, createActions, createGetters } from 'pulse-js-framework/runtime/store';
```

### createStore(initialState, options?)

Create a global store.

```javascript
const store = createStore({
  user: null,
  theme: 'light',
  items: []
}, { persist: true });

// Access as pulses
store.user.get();
store.theme.set('dark');

// Methods
store.$getState();     // Get snapshot
store.$setState({ theme: 'dark' }); // Batch update
store.$reset();        // Reset to initial
store.$subscribe(fn);  // Subscribe to all changes
```

### createActions(store, actions)

Create bound actions.

```javascript
const actions = createActions(store, {
  login: (store, userData) => store.user.set(userData),
  logout: (store) => store.user.set(null),
  toggleTheme: (store) => store.theme.update(t => t === 'light' ? 'dark' : 'light')
});

// Usage
actions.login({ name: 'John' });
actions.toggleTheme();
```

### createGetters(store, getters)

Create computed getters.

```javascript
const getters = createGetters(store, {
  isLoggedIn: (store) => store.user.get() !== null,
  itemCount: (store) => store.items.get().length
});

// Usage (returns Pulse)
getters.isLoggedIn.get(); // true/false
```

---

## Form

```javascript
import { useForm, useField, useFieldArray, validators } from 'pulse-js-framework/runtime/form';
```

### useForm(initialValues, schema?, options?)

Create a reactive form with validation.

```javascript
const { fields, handleSubmit, isValid, errors, reset } = useForm(
  { email: '', password: '' },
  {
    email: [validators.required(), validators.email()],
    password: [validators.required(), validators.minLength(8)]
  },
  {
    onSubmit: (values) => console.log('Submit:', values),
    onError: (errors) => console.log('Errors:', errors)
  }
);

// Bind to inputs
el('input', {
  value: fields.email.value.get(),
  onInput: fields.email.onChange,
  onBlur: fields.email.onBlur
});
```

### validators

Built-in validators.

```javascript
// Sync validators
validators.required(message?)
validators.minLength(length, message?)
validators.maxLength(length, message?)
validators.email(message?)
validators.url(message?)
validators.pattern(regex, message?)
validators.min(value, message?)
validators.max(value, message?)
validators.matches(fieldName, message?)
validators.custom((value, allValues) => true | 'error')

// Async validators
validators.asyncCustom(async (value) => true | 'error', { debounce: 300 })
validators.asyncEmail(async (email) => isAvailable, message?, { debounce: 300 })
validators.asyncUnique(async (value) => isUnique, message?, { debounce: 300 })
validators.asyncServer(async (value) => null | 'error', { debounce: 300 })
```

### useField(initialValue, rules?, options?)

Create a single field outside of a form.

```javascript
const email = useField('', [validators.required(), validators.email()]);

email.value.get();      // Current value
email.error.get();      // Error message or null
email.touched.get();    // true after blur
email.valid.get();      // Validation state
email.validating.get(); // true during async validation
```

### useFieldArray(initialValues, rules?)

Create a dynamic field array.

```javascript
const tags = useFieldArray(['tag1'], [validators.required()]);

tags.append('new tag');
tags.remove(0);
tags.move(0, 1);

tags.fields.get().forEach((field, i) => {
  el('input', { value: field.value.get(), onInput: field.onChange });
});
```

---

## Async

```javascript
import { useAsync, useResource, usePolling, createVersionedAsync } from 'pulse-js-framework/runtime/async';
```

### useAsync(asyncFn, options?)

Handle async operations with loading/error states.

```javascript
const { data, loading, error, execute, reset, abort } = useAsync(
  () => fetch('/api/users').then(r => r.json()),
  {
    immediate: true,
    initialData: null,
    retries: 3,
    retryDelay: 1000,
    onSuccess: (data) => console.log('Got:', data),
    onError: (err) => console.error('Failed:', err)
  }
);

// Re-execute
execute();

// Abort current request
abort();
```

### useResource(key, fetcher, options?)

SWR-style resource fetching with caching.

```javascript
const users = useResource(
  'users',
  () => fetch('/api/users').then(r => r.json()),
  {
    refreshInterval: 30000,
    refreshOnFocus: true,
    refreshOnReconnect: true,
    staleTime: 5000,
    cacheTime: 300000
  }
);

// Dynamic key (re-fetches when key changes)
const userId = pulse(1);
const user = useResource(
  () => `user-${userId.get()}`,
  () => fetch(`/api/users/${userId.get()}`).then(r => r.json())
);
```

### usePolling(asyncFn, options)

Repeated async operations.

```javascript
const { data, start, stop, isPolling } = usePolling(
  () => fetch('/api/status').then(r => r.json()),
  {
    interval: 5000,
    pauseOnHidden: true,
    pauseOnOffline: true,
    maxErrors: 3
  }
);

start();
stop();
```

### createVersionedAsync(options?)

Low-level race condition handling.

```javascript
const controller = createVersionedAsync();

async function search(query) {
  const ctx = controller.begin(); // Invalidates previous
  const results = await searchApi(query);
  ctx.ifCurrent(() => setResults(results)); // Only if still current
}
```

---

## DevTools

```javascript
import {
  enableDevTools, trackedPulse, trackedEffect,
  getDiagnostics, getDependencyGraph, takeSnapshot, travelTo
} from 'pulse-js-framework/runtime/devtools';
```

### enableDevTools(options?)

Enable dev tools (development only).

```javascript
enableDevTools({
  logUpdates: true,
  logEffects: true,
  warnOnSlowEffects: true,
  slowEffectThreshold: 16
});
```

### trackedPulse(value, name)

Create a pulse that's tracked by dev tools.

```javascript
const count = trackedPulse(0, 'count');
```

### getDiagnostics()

Get runtime statistics.

```javascript
const stats = getDiagnostics();
// { pulseCount, effectCount, avgEffectTime, pendingEffects, ... }
```

### getDependencyGraph()

Get reactive dependency graph for visualization.

```javascript
const { nodes, edges } = getDependencyGraph();
```

### Time-travel

```javascript
takeSnapshot('before-update');
getHistory();
travelTo(0);
back();
forward();
```

---

## HMR

```javascript
import { createHMRContext } from 'pulse-js-framework/runtime/hmr';
```

### createHMRContext(moduleUrl)

Create HMR context for state preservation.

```javascript
const hmr = createHMRContext(import.meta.url);

const count = hmr.preservePulse('count', 0);

hmr.setup(() => {
  effect(() => {
    document.title = `Count: ${count.get()}`;
  });
});

hmr.accept();
```

---

## Logger

```javascript
import { createLogger, setLogLevel, LogLevel } from 'pulse-js-framework/runtime/logger';
```

### createLogger(namespace)

Create a namespaced logger.

```javascript
const log = createLogger('MyComponent');

log.info('Initialized');
log.warn('Deprecated');
log.error('Failed', error);
log.debug('Details');

// Child logger
const childLog = log.child('Validation');
```

### setLogLevel(level)

Set global log level.

```javascript
setLogLevel(LogLevel.DEBUG); // SILENT, ERROR, WARN, INFO, DEBUG
```

---

## Native

```javascript
import {
  createNativeStorage, createDeviceInfo,
  NativeUI, NativeClipboard,
  onAppPause, onAppResume, onNativeReady
} from 'pulse-js-framework/runtime/native';
```

### createNativeStorage(prefix?)

Create reactive persistent storage.

```javascript
const storage = createNativeStorage('app_');
const theme = storage.get('theme', 'light'); // Returns pulse
theme.set('dark'); // Auto-persists
```

### createDeviceInfo()

Get device information.

```javascript
const device = createDeviceInfo();
device.platform;      // 'ios' | 'android' | 'web'
device.isOnline;      // boolean
device.info.get();    // { platform, userAgent, language, ... }
device.network.get(); // { connected, type }
```

### NativeUI

Native UI controls.

```javascript
NativeUI.toast('Message!', isLong?);
NativeUI.vibrate(duration?);
```

### App Lifecycle

```javascript
onNativeReady(({ platform }) => init());
onAppPause(() => saveState());
onAppResume(() => refreshData());
onBackButton(() => handleBack()); // Android only
```
