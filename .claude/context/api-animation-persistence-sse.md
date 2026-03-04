# Animation, Persistence & SSE API Reference

This document covers three runtime modules that are not part of the core Pulse bundle but are available as optional imports.

## Table of Contents

1. [Animation (`runtime/animation.js`)](#animation)
2. [Persistence (`runtime/persistence.js`)](#persistence)
3. [SSE – Server-Sent Events (`runtime/sse.js`)](#sse)

---

## Animation

**Import:**
```javascript
import { animate, useTransition, useSpring, stagger, configureAnimations }
  from 'pulse-js-framework/runtime/animation';
```

### `configureAnimations(options)`

Set global defaults for all animations. Call once at app startup.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `respectReducedMotion` | boolean | `true` | Respect `prefers-reduced-motion` OS setting |
| `defaultDuration` | number | `300` | Default duration in ms |
| `defaultEasing` | string | `'ease-out'` | Default CSS easing function |
| `disabled` | boolean | `false` | Kill switch — disables all animations globally |

```javascript
configureAnimations({ defaultDuration: 200, disabled: false });
```

In SSR mode, animations are automatically disabled (no-op controls returned).

---

### `animate(element, keyframes, options?) → AnimationControl`

Wrap the Web Animations API with reactive state. Returns an `AnimationControl` object.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `element` | `HTMLElement` | Element to animate |
| `keyframes` | `Array<Object> \| Object` | WAAPI keyframe array or shorthand object |
| `options.duration` | `number` | Duration in ms (falls back to `configureAnimations` default) |
| `options.easing` | `string` | CSS easing (e.g. `'ease-in-out'`, `'cubic-bezier(…)'`) |
| `options.fill` | `string` | Fill mode: `'none'` (default), `'forwards'`, `'backwards'`, `'both'` |
| `options.delay` | `number` | Delay in ms (default: `0`) |
| `options.iterations` | `number` | Repeat count (default: `1`, use `Infinity` to loop) |
| `options.direction` | `string` | `'normal'` (default), `'reverse'`, `'alternate'` |

**Returns — `AnimationControl`:**

| Property / Method | Description |
|-------------------|-------------|
| `isPlaying` | `Pulse<boolean>` — reactive playing state |
| `progress` | `Pulse<number>` — reactive progress 0–1 |
| `finished` | `Promise<void>` — resolves when animation ends or is cancelled |
| `play()` | Resume a paused animation |
| `pause()` | Pause the animation |
| `reverse()` | Reverse playback direction |
| `cancel()` | Cancel and reset to initial state |
| `finish()` | Jump to end state immediately |
| `dispose()` | Clean up resources (cancel animation + RAF) |

```javascript
import { animate } from 'pulse-js-framework/runtime/animation';
import { effect } from 'pulse-js-framework/runtime';

const ctrl = animate(
  document.querySelector('.box'),
  [{ opacity: 0, transform: 'translateY(-20px)' }, { opacity: 1, transform: 'translateY(0)' }],
  { duration: 400, easing: 'ease-out' }
);

effect(() => {
  console.log('Playing:', ctrl.isPlaying.get());
  console.log('Progress:', ctrl.progress.get());
});

ctrl.finished.then(() => console.log('Done!'));
```

---

### `useTransition(condition, options?) → { container, isEntering, isLeaving }`

Reactive enter/leave transition hook. Automatically animates DOM nodes in/out when a reactive condition changes.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `condition` | `Function \| boolean` | Reactive condition (called in an `effect`) |
| `options.enter` | `Object` | Enter keyframes (default: `{ opacity: [0, 1] }`) |
| `options.leave` | `Object` | Leave keyframes (default: `{ opacity: [1, 0] }`) |
| `options.duration` | `number` | Duration for both enter/leave |
| `options.easing` | `string` | Easing for both enter/leave |
| `options.onEnter` | `Function` | Factory: `() → Node \| Node[]` — called when condition becomes truthy |
| `options.onLeave` | `Function` | Optional factory for leave content |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `container` | `DocumentFragment` | Mount this fragment into the DOM |
| `isEntering` | `Pulse<boolean>` | True during enter animation |
| `isLeaving` | `Pulse<boolean>` | True during leave animation |

```javascript
import { useTransition } from 'pulse-js-framework/runtime/animation';
import { pulse, mount, el } from 'pulse-js-framework/runtime';

const visible = pulse(false);
const { container, isEntering } = useTransition(
  () => visible.get(),
  {
    enter: [{ opacity: 0 }, { opacity: 1 }],
    leave: [{ opacity: 1 }, { opacity: 0 }],
    duration: 300,
    onEnter: () => el('.modal', 'Content'),
  }
);

mount(document.body, container);
visible.set(true); // triggers enter animation
```

---

### `useSpring(target, options?) → { value, isAnimating, set, dispose }`

Physics-based spring animation using a damped harmonic oscillator. Great for smooth, natural-feeling transitions.

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `target` | `number \| Function` | — | Initial/target value. Pass a reactive function for auto-tracking |
| `options.stiffness` | `number` | `170` | Higher = snappier spring |
| `options.damping` | `number` | `26` | Higher = less oscillation |
| `options.mass` | `number` | `1` | Higher = slower response |
| `options.precision` | `number` | `0.01` | Settlement threshold |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `value` | `Pulse<number>` | Current animated value |
| `isAnimating` | `Pulse<boolean>` | True while spring is settling |
| `set(n)` | `Function` | Jump to a new target and start animating |
| `dispose()` | `Function` | Cancel RAF loop and clean up |

```javascript
import { useSpring } from 'pulse-js-framework/runtime/animation';
import { pulse, effect, el, bind } from 'pulse-js-framework/runtime';

const mouseX = pulse(0);
const springX = useSpring(() => mouseX.get(), { stiffness: 120, damping: 20 });

document.addEventListener('mousemove', e => mouseX.set(e.clientX));

const cursor = el('.cursor');
effect(() => {
  cursor.style.transform = `translateX(${springX.value.get()}px)`;
});
```

---

### `stagger(elements, keyframes, options?) → AnimationControl[]`

Animate a list of elements with a staggered delay between each.

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `elements` | `HTMLElement[]` | — | Elements to animate |
| `keyframes` | `Array\|Object` | — | WAAPI keyframes |
| `options.duration` | `number` | — | Per-element duration |
| `options.staggerDelay` | `number` | `50` | Extra delay (ms) added per element index |
| `options.easing` | `string` | — | Easing function |

Returns an `AnimationControl[]` — one control per element.

```javascript
import { stagger } from 'pulse-js-framework/runtime/animation';

const items = [...document.querySelectorAll('.list-item')];
const controls = stagger(
  items,
  [{ opacity: 0, transform: 'translateX(-20px)' }, { opacity: 1, transform: 'translateX(0)' }],
  { duration: 300, staggerDelay: 60 }
);
// controls[0] animates at delay 0ms, controls[1] at 60ms, controls[2] at 120ms …
```

---

## Persistence

**Import:**
```javascript
import {
  createLocalStorageAdapter,
  createSessionStorageAdapter,
  createIndexedDBAdapter,
  createMemoryAdapter,
  createPersistenceAdapter,
  withPersistence,
  PersistenceError,
} from 'pulse-js-framework/runtime/persistence';
```

### Adapters

All adapters share the same async interface:

```typescript
interface PersistenceAdapter {
  name: string;
  getItem(key: string): Promise<any>;
  setItem(key: string, value: any): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}
```

#### `createLocalStorageAdapter()`

Uses `window.localStorage`. Falls back to memory adapter if not available (SSR).

```javascript
const adapter = createLocalStorageAdapter();
await adapter.setItem('user', { id: 1, name: 'Aru' });
const user = await adapter.getItem('user'); // { id: 1, name: 'Aru' }
```

#### `createSessionStorageAdapter()`

Uses `window.sessionStorage`. Falls back to memory adapter if not available.

#### `createIndexedDBAdapter(options?)`

For large or complex datasets. Automatically falls back to memory adapter in non-browser environments.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dbName` | `string` | `'pulse-store'` | IndexedDB database name |
| `storeName` | `string` | `'state'` | Object store name |
| `version` | `number` | `1` | Database schema version |

```javascript
const idb = createIndexedDBAdapter({ dbName: 'myapp', storeName: 'cache' });
```

#### `createMemoryAdapter()`

In-memory only — data is lost on page reload. Useful for testing or SSR.

#### `createPersistenceAdapter(type, options?)`

Factory shorthand:

```javascript
const adapter = createPersistenceAdapter('localStorage');
const adapter = createPersistenceAdapter('sessionStorage');
const adapter = createPersistenceAdapter('indexedDB', { dbName: 'myapp' });
const adapter = createPersistenceAdapter('memory');
```

---

### `withPersistence(store, adapter, options?) → disposeFn`

Connect a Pulse store to a persistence adapter. State is automatically saved on changes and restored on load.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `store` | `Object` | Pulse store (result of `createStore()`) |
| `adapter` | `PersistenceAdapter` | Storage adapter |
| `options.key` | `string` | Storage key (default: `'pulse-store'`) |
| `options.debounce` | `number` | Save debounce in ms (default: `100`) |
| `options.include` | `string[]` | Only persist these keys (default: all) |
| `options.exclude` | `string[]` | Skip these keys |
| `options.serialize` | `Function` | Custom serializer (default: `JSON.stringify`) |
| `options.deserialize` | `Function` | Custom deserializer (default: `JSON.parse`) |
| `options.maxDepth` | `number` | Max object nesting depth (default: `10`) |
| `options.onError` | `Function` | Error callback `(err) => void` |

**Returns:** `disposeFn` — call to stop persistence and clean up.

```javascript
import { createStore } from 'pulse-js-framework/runtime/store';
import { withPersistence, createLocalStorageAdapter } from 'pulse-js-framework/runtime/persistence';

const store = createStore({ theme: 'light', language: 'fr', sessionId: null });
const adapter = createLocalStorageAdapter();

const dispose = withPersistence(store, adapter, {
  key: 'app-settings',
  exclude: ['sessionId'],       // don't persist session-only data
  debounce: 200,
  onError: err => console.error('Persist error:', err),
});

// State is restored from storage on next load
// Call dispose() to stop watching
```

### `PersistenceError`

Thrown when an adapter operation fails.

```javascript
import { PersistenceError } from 'pulse-js-framework/runtime/persistence';

try {
  await adapter.setItem('key', largeData);
} catch (err) {
  if (PersistenceError.isPersistenceError(err)) {
    console.error('Storage full?', err.message, err.adapterName);
  }
}
```

**Security:** The persistence module automatically strips keys that match the `DANGEROUS_KEYS` allowlist (e.g. `__proto__`, `constructor`) from persisted objects to prevent prototype pollution.

---

## SSE — Server-Sent Events

**Import:**
```javascript
import { createSSE, useSSE, SSEError }
  from 'pulse-js-framework/runtime/sse';
```

### `createSSE(url, options?) → SSEInstance`

Low-level SSE connection with automatic reconnect and exponential backoff.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `withCredentials` | `boolean` | `false` | Send cookies with request |
| `reconnect` | `boolean` | `true` | Auto-reconnect on disconnect |
| `maxRetries` | `number` | `5` | Max reconnect attempts |
| `baseDelay` | `number` | `1000` | Initial reconnect delay (ms) |
| `maxDelay` | `number` | `30000` | Max reconnect delay (ms) |
| `events` | `string[]` | `['message']` | Event types to listen for |
| `parseJSON` | `boolean` | `true` | Auto-parse JSON event data |
| `immediate` | `boolean` | `true` | Connect immediately on creation |
| `onMessage` | `Function` | `null` | `(data, event) => void` |
| `onOpen` | `Function` | `null` | `() => void` |
| `onError` | `Function` | `null` | `(err) => void` |

**Returns — `SSEInstance`:**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `state` | `Pulse<string>` | `'closed'`, `'connecting'`, `'open'` |
| `connected` | `Pulse<boolean>` | Computed `state === 'open'` |
| `reconnecting` | `Pulse<boolean>` | True during reconnect delay |
| `reconnectAttempt` | `Pulse<number>` | Current attempt count |
| `error` | `Pulse<SSEError\|null>` | Last error |
| `lastEventId` | `Pulse<string\|null>` | Last `event.lastEventId` |
| `connect()` | Function | Manually connect / reset retries |
| `close()` | Function | Close connection |
| `addEventListener(event, handler)` | Function | Add event listener (alias: `on`) |
| `removeEventListener(event, handler)` | Function | Remove listener (alias: `off`) |
| `dispose()` | Function | Close + clear all listeners |

```javascript
import { createSSE } from 'pulse-js-framework/runtime/sse';
import { effect } from 'pulse-js-framework/runtime';

const sse = createSSE('/api/events', {
  events: ['message', 'notification'],
  onMessage: (data) => console.log('Got:', data),
});

effect(() => {
  if (!sse.connected.get()) console.log('Disconnected — retrying…');
});

sse.on('notification', (data) => {
  console.log('Notification:', data);
});

// Later:
sse.dispose();
```

---

### `useSSE(url, options?) → ReactiveSSE`

High-level reactive hook with automatic lifecycle management. Registers cleanup with `onCleanup()` — use inside a Pulse effect or component.

**Additional options (beyond `createSSE`):**

| Option | Type | Description |
|--------|------|-------------|
| `messageHistorySize` | `number` | If > 0, keeps a sliding window of last N messages |

**Returns — `ReactiveSSE`:**

| Property | Type | Description |
|----------|------|-------------|
| `data` | `Pulse<any>` | Most recent message data |
| `connected` | `Pulse<boolean>` | Connection status |
| `error` | `Pulse<SSEError\|null>` | Last error |
| `reconnecting` | `Pulse<boolean>` | In reconnect backoff |
| `lastEventId` | `Pulse<string\|null>` | Last event ID |
| `messages` | `Pulse<any[]>` | (Only if `messageHistorySize > 0`) History array |
| `close()` | Function | Close connection |
| `reconnect()` | Function | Force reconnect |
| `clearMessages()` | Function | (Only if `messageHistorySize > 0`) Clear history |
| `sse` | `SSEInstance` | Underlying instance from `createSSE` |

```javascript
import { useSSE } from 'pulse-js-framework/runtime/sse';
import { el, text, list } from 'pulse-js-framework/runtime';

function LiveFeed() {
  const { data, connected, messages, clearMessages } = useSSE('/api/feed', {
    messageHistorySize: 50,
    parseJSON: true,
  });

  return el('.feed', [
    el('.status', text(() => connected.get() ? '🟢 Live' : '🔴 Offline')),
    list(messages, (msg) => el('.entry', msg.text)),
    el('button', { onclick: clearMessages }, 'Clear'),
  ]);
}
```

---

### `SSEError`

```javascript
import { SSEError } from 'pulse-js-framework/runtime/sse';

sse.error.subscribe(err => {
  if (!err) return;
  if (err.isMaxRetries())    console.error('Gave up reconnecting');
  if (err.isConnectFailed()) console.error('Could not connect');
  if (err.isTimeout())       console.error('Connection timed out');
});
```

**Methods:** `isConnectFailed()`, `isTimeout()`, `isMaxRetries()`, `isClosed()`

**Property:** `sseCode` — one of `'CONNECT_FAILED'`, `'TIMEOUT'`, `'MAX_RETRIES'`, `'CLOSED'`, `'UNKNOWN'`

---

## Reconnect Backoff Formula

Both `createSSE` and `createWebSocket` use the same exponential backoff with ±25 % jitter:

```
delay = min(baseDelay × 2^attempt, maxDelay) ± 25%
```

With defaults (`baseDelay=1000`, `maxDelay=30000`):

| Attempt | Approx delay |
|---------|-------------|
| 0 | ~1 s |
| 1 | ~2 s |
| 2 | ~4 s |
| 3 | ~8 s |
| 4 | ~16 s |
| 5+ | ~30 s (capped) |

After `maxRetries` attempts, the connection gives up and sets `error` to a `SSEError` with `sseCode: 'MAX_RETRIES'`. Call `connect()` to manually restart.
