/**
 * Pulse Documentation - Testing Page
 * Comprehensive guide to testing Pulse applications
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations, navigateLocale } from '../state.js';

export function TestingPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="testing.title"></h1>
    <p class="page-intro" data-i18n="testing.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="testing.quickStart"></h2>
      <p data-i18n="testing.quickStartDesc"></p>

      <h3 data-i18n="testing.runningTests"></h3>
      <div class="code-block">
        <pre><code># Run all tests
npm test

# Run tests with coverage
pulse test --coverage

# Run tests in watch mode
pulse test --watch

# Run a specific test file
node --test test/pulse.test.js

# Generate a test file for a component
pulse test --create MyComponent</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.writingTests"></h2>
      <p data-i18n="testing.writingTestsDesc"></p>

      <h3 data-i18n="testing.basicStructure"></h3>
      <div class="code-block">
        <pre><code>import { test, describe } from 'node:test';
import assert from 'node:assert';
import { pulse, computed, effect } from 'pulse-js-framework/runtime/pulse';

describe('Counter', () => {
  test('increments correctly', () => {
    const count = pulse(0);
    count.update(n => n + 1);
    assert.strictEqual(count.get(), 1);
  });

  test('computed updates automatically', () => {
    const count = pulse(5);
    const doubled = computed(() => count.get() * 2);

    assert.strictEqual(doubled.get(), 10);
    count.set(10);
    assert.strictEqual(doubled.get(), 20);
  });
});</code></pre>
      </div>

      <h3 data-i18n="testing.pulseTestUtils"></h3>
      <p data-i18n="testing.pulseTestUtilsDesc"></p>
      <div class="code-block">
        <pre><code>import {
  test,
  testAsync,
  runAsyncTests,
  assert,
  assertEqual,
  assertDeepEqual,
  assertThrows,
  assertThrowsAsync,
  printResults,
  exitWithCode,
  printSection,
  createSpy,
  wait,
  waitFor
} from 'pulse-js-framework/test/utils';

// Sync test
test('adds numbers correctly', () => {
  assertEqual(1 + 1, 2, 'Expected 2');
});

// Async test
testAsync('fetches data', async () => {
  const data = await fetchData();
  assertEqual(data.status, 'success');
});

// Run async tests at end
await runAsyncTests();
printResults();
exitWithCode();</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.isolatedContexts"></h2>
      <p data-i18n="testing.isolatedContextsDesc"></p>

      <div class="code-block">
        <pre><code>import { createContext, withContext, resetContext } from 'pulse-js-framework/runtime/pulse';

describe('User Store', () => {
  // Create isolated context for each test
  let ctx;

  beforeEach(() => {
    ctx = createContext({ name: 'test' });
  });

  afterEach(() => {
    ctx.reset();
    resetContext();
  });

  test('isolated state does not leak', () => {
    withContext(ctx, () => {
      const user = pulse({ name: 'Alice' });
      user.set({ name: 'Bob' });
      assert.strictEqual(user.get().name, 'Bob');
    });
    // State is isolated to ctx, doesn't affect other tests
  });

  test('effects run in isolated context', () => {
    let runCount = 0;

    withContext(ctx, () => {
      const count = pulse(0);
      effect(() => {
        count.get();
        runCount++;
      });
      count.set(1);
    });

    assert.strictEqual(runCount, 2); // Initial + update
  });
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.testingReactivity"></h2>
      <p data-i18n="testing.testingReactivityDesc"></p>

      <h3 data-i18n="testing.testingPulses"></h3>
      <div class="code-block">
        <pre><code>import { pulse, computed, effect, batch } from 'pulse-js-framework/runtime/pulse';

test('pulse notifies subscribers on change', () => {
  const count = pulse(0);
  const values = [];

  effect(() => {
    values.push(count.get());
  });

  count.set(1);
  count.set(2);

  assertDeepEqual(values, [0, 1, 2]);
});

test('pulse skips notification for same value', () => {
  const count = pulse(5);
  let runCount = 0;

  effect(() => {
    count.get();
    runCount++;
  });

  count.set(5); // Same value
  count.set(5); // Same value

  assertEqual(runCount, 1); // Only initial run
});

test('batch defers notifications', () => {
  const a = pulse(1);
  const b = pulse(2);
  let runCount = 0;

  effect(() => {
    a.get();
    b.get();
    runCount++;
  });

  batch(() => {
    a.set(10);
    b.set(20);
  });

  assertEqual(runCount, 2); // Initial + one batch
});</code></pre>
      </div>

      <h3 data-i18n="testing.testingComputed"></h3>
      <div class="code-block">
        <pre><code>test('computed caches value', () => {
  let computeCount = 0;
  const count = pulse(5);

  const doubled = computed(() => {
    computeCount++;
    return count.get() * 2;
  });

  // Access multiple times
  doubled.get();
  doubled.get();
  doubled.get();

  assertEqual(computeCount, 1); // Only computed once
});

test('computed invalidates on dependency change', () => {
  const items = pulse([1, 2, 3]);
  const sum = computed(() => items.get().reduce((a, b) => a + b, 0));

  assertEqual(sum.get(), 6);

  items.set([1, 2, 3, 4]);
  assertEqual(sum.get(), 10);
});</code></pre>
      </div>

      <h3 data-i18n="testing.testingEffects"></h3>
      <div class="code-block">
        <pre><code>test('effect cleanup runs before re-run', () => {
  const active = pulse(true);
  const cleanups = [];

  effect(() => {
    const isActive = active.get();
    return () => {
      cleanups.push(isActive);
    };
  });

  active.set(false);
  active.set(true);

  assertDeepEqual(cleanups, [true, false]);
});

test('effect cleanup runs on dispose', () => {
  let cleaned = false;
  const count = pulse(0);

  const dispose = effect(() => {
    count.get();
    return () => { cleaned = true; };
  });

  assertEqual(cleaned, false);
  dispose();
  assertEqual(cleaned, true);
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.testingDom"></h2>
      <p data-i18n="testing.testingDomDesc"></p>

      <h3 data-i18n="testing.mockDomSetup"></h3>
      <div class="code-block">
        <pre><code>import { createDOM } from 'pulse-js-framework/test/mock-dom';

// Set up mock DOM before importing dom.js
const { document, HTMLElement, Node, Event } = createDOM();
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.Node = Node;
globalThis.Event = Event;

// Now import DOM utilities
import { el, mount, list, when } from 'pulse-js-framework/runtime/dom';
import { pulse } from 'pulse-js-framework/runtime/pulse';</code></pre>
      </div>

      <h3 data-i18n="testing.testingElements"></h3>
      <div class="code-block">
        <pre><code>test('el creates element with correct tag', () => {
  const div = el('div');
  assertEqual(div.tagName.toLowerCase(), 'div');
});

test('el applies classes from selector', () => {
  const btn = el('button.primary.large');
  assert(btn.classList.contains('primary'));
  assert(btn.classList.contains('large'));
});

test('el sets attributes', () => {
  const input = el('input', {
    type: 'email',
    placeholder: 'Enter email'
  });
  assertEqual(input.getAttribute('type'), 'email');
  assertEqual(input.getAttribute('placeholder'), 'Enter email');
});

test('reactive attribute updates', () => {
  const disabled = pulse(false);
  const btn = el('button', {
    disabled: () => disabled.get()
  }, 'Submit');

  assertEqual(btn.disabled, false);
  disabled.set(true);
  assertEqual(btn.disabled, true);
});</code></pre>
      </div>

      <h3 data-i18n="testing.testingLists"></h3>
      <div class="code-block">
        <pre><code>test('list renders items', () => {
  const items = pulse(['a', 'b', 'c']);
  const container = el('ul');
  const listEl = list(
    () => items.get(),
    (item) => el('li', item),
    (item) => item
  );
  container.appendChild(listEl);

  assertEqual(container.querySelectorAll('li').length, 3);
});

test('list updates on change', () => {
  const items = pulse([1, 2]);
  const container = el('ul');
  const listEl = list(
    () => items.get(),
    (item) => el('li', String(item)),
    (item) => item
  );
  container.appendChild(listEl);

  items.set([1, 2, 3, 4]);
  assertEqual(container.querySelectorAll('li').length, 4);
});</code></pre>
      </div>

      <h3 data-i18n="testing.testingConditionals"></h3>
      <div class="code-block">
        <pre><code>test('when renders correct branch', () => {
  const show = pulse(true);
  const container = el('div');

  const conditional = when(
    () => show.get(),
    () => el('span.shown', 'Visible'),
    () => el('span.hidden', 'Hidden')
  );
  container.appendChild(conditional);

  assert(container.querySelector('.shown'));
  assert(!container.querySelector('.hidden'));

  show.set(false);

  assert(!container.querySelector('.shown'));
  assert(container.querySelector('.hidden'));
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.mockDomAdapter"></h2>
      <p data-i18n="testing.mockDomAdapterDesc"></p>

      <div class="code-block">
        <pre><code>import {
  MockDOMAdapter,
  setAdapter,
  resetAdapter
} from 'pulse-js-framework/runtime/dom-adapter';

describe('Component with MockDOMAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MockDOMAdapter();
    setAdapter(adapter);
  });

  afterEach(() => {
    resetAdapter();
  });

  test('creates elements without browser', () => {
    const div = adapter.createElement('div');
    adapter.setAttribute(div, 'id', 'test');
    adapter.appendChild(adapter.getBody(), div);

    assertEqual(adapter.getAttribute(div, 'id'), 'test');
  });

  test('flushes microtasks synchronously', () => {
    let resolved = false;
    Promise.resolve().then(() => { resolved = true; });

    assertEqual(resolved, false);
    adapter.flushMicrotasks();
    assertEqual(resolved, true);
  });

  test('runs timers synchronously', () => {
    let fired = false;
    setTimeout(() => { fired = true; }, 1000);

    assertEqual(fired, false);
    adapter.runAllTimers();
    assertEqual(fired, true);
  });
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.testingAsync"></h2>
      <p data-i18n="testing.testingAsyncDesc"></p>

      <div class="code-block">
        <pre><code>import { useAsync, useResource } from 'pulse-js-framework/runtime/async';

testAsync('useAsync handles success', async () => {
  const mockFetch = () => Promise.resolve({ data: 'test' });
  const { data, loading, error, execute } = useAsync(mockFetch, {
    immediate: false
  });

  assertEqual(loading.get(), false);
  assertEqual(data.get(), null);

  await execute();

  assertEqual(loading.get(), false);
  assertEqual(data.get().data, 'test');
  assertEqual(error.get(), null);
});

testAsync('useAsync handles error', async () => {
  const mockFetch = () => Promise.reject(new Error('Network error'));
  const { data, loading, error, execute } = useAsync(mockFetch, {
    immediate: false
  });

  try {
    await execute();
  } catch (e) {
    // Expected
  }

  assertEqual(loading.get(), false);
  assertEqual(data.get(), null);
  assert(error.get().message.includes('Network'));
});

testAsync('useAsync can be aborted', async () => {
  let aborted = false;
  const mockFetch = (signal) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => {
      aborted = true;
      reject(new Error('Aborted'));
    });
    setTimeout(resolve, 1000);
  });

  const { execute, abort } = useAsync(
    (opts) => mockFetch(opts.signal),
    { immediate: false }
  );

  const promise = execute();
  abort();

  try {
    await promise;
  } catch (e) {
    // Expected
  }

  assertEqual(aborted, true);
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.testingForms"></h2>
      <p data-i18n="testing.testingFormsDesc"></p>

      <div class="code-block">
        <pre><code>import { useForm, useField, validators } from 'pulse-js-framework/runtime/form';

test('useField validates on change', () => {
  const email = useField('', [
    validators.required('Email is required'),
    validators.email('Invalid email')
  ]);

  assertEqual(email.error.get(), null); // No error initially

  email.value.set('invalid');
  email.validate();

  assertEqual(email.error.get(), 'Invalid email');

  email.value.set('test@example.com');
  email.validate();

  assertEqual(email.error.get(), null);
});

test('useForm tracks validity', () => {
  const { fields, isValid, errors } = useForm(
    { email: '', password: '' },
    {
      email: [validators.required(), validators.email()],
      password: [validators.required(), validators.minLength(8)]
    }
  );

  assertEqual(isValid.get(), false);

  fields.email.value.set('test@example.com');
  fields.password.value.set('password123');

  assertEqual(isValid.get(), true);
  assertEqual(Object.keys(errors.get()).length, 0);
});

testAsync('async validation works', async () => {
  const username = useField('', [
    validators.required(),
    validators.asyncCustom(async (value) => {
      // Simulate API check
      await wait(10);
      return value !== 'taken';
    }, 'Username is taken')
  ]);

  username.value.set('taken');
  await username.validate();

  assertEqual(username.error.get(), 'Username is taken');

  username.value.set('available');
  await username.validate();

  assertEqual(username.error.get(), null);
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.testingStore"></h2>
      <p data-i18n="testing.testingStoreDesc"></p>

      <div class="code-block">
        <pre><code>import {
  createStore,
  createActions,
  createGetters
} from 'pulse-js-framework/runtime/store';

test('store initializes with default state', () => {
  const store = createStore({
    count: 0,
    user: null
  });

  assertEqual(store.count.get(), 0);
  assertEqual(store.user.get(), null);
});

test('actions update store', () => {
  const store = createStore({ count: 0 });
  const actions = createActions(store, {
    increment: (store) => store.count.update(n => n + 1),
    add: (store, amount) => store.count.update(n => n + amount)
  });

  actions.increment();
  assertEqual(store.count.get(), 1);

  actions.add(5);
  assertEqual(store.count.get(), 6);
});

test('getters derive values', () => {
  const store = createStore({ items: [1, 2, 3, 4, 5] });
  const getters = createGetters(store, {
    count: (store) => store.items.get().length,
    sum: (store) => store.items.get().reduce((a, b) => a + b, 0)
  });

  assertEqual(getters.count.get(), 5);
  assertEqual(getters.sum.get(), 15);

  store.items.set([1, 2]);
  assertEqual(getters.count.get(), 2);
  assertEqual(getters.sum.get(), 3);
});

test('store $reset restores initial state', () => {
  const store = createStore({ count: 0 });
  store.count.set(100);

  assertEqual(store.count.get(), 100);

  store.$reset();
  assertEqual(store.count.get(), 0);
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.testingRouter"></h2>
      <p data-i18n="testing.testingRouterDesc"></p>

      <div class="code-block">
        <pre><code>import { createRouter } from 'pulse-js-framework/runtime/router';

// Mock history API
globalThis.history = {
  pushState: () => {},
  replaceState: () => {},
  back: () => {},
  forward: () => {}
};
globalThis.location = { pathname: '/', search: '', hash: '' };

test('router matches routes', () => {
  const Home = () => el('div', 'Home');
  const About = () => el('div', 'About');

  const router = createRouter({
    routes: {
      '/': Home,
      '/about': About
    },
    mode: 'history'
  });

  assertEqual(router.path.get(), '/');
});

test('router extracts params', async () => {
  const User = (ctx) => el('div', \`User \${ctx.params.id}\`);

  const router = createRouter({
    routes: {
      '/users/:id': User
    }
  });

  await router.navigate('/users/123');
  assertEqual(router.params.get().id, '123');
});

test('router guards can block navigation', async () => {
  let blocked = false;

  const router = createRouter({
    routes: {
      '/': () => el('div', 'Home'),
      '/admin': {
        handler: () => el('div', 'Admin'),
        beforeEnter: () => {
          blocked = true;
          return '/'; // Redirect
        }
      }
    }
  });

  await router.navigate('/admin');
  assertEqual(blocked, true);
  assertEqual(router.path.get(), '/');
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.testingHttp"></h2>
      <p data-i18n="testing.testingHttpDesc"></p>

      <div class="code-block">
        <pre><code>import { createHttp, HttpError } from 'pulse-js-framework/runtime/http';

// Mock fetch
const mockResponses = new Map();

globalThis.fetch = async (url, options) => {
  const mock = mockResponses.get(url);
  if (!mock) {
    throw new Error(\`No mock for \${url}\`);
  }
  return {
    ok: mock.ok ?? true,
    status: mock.status ?? 200,
    statusText: mock.statusText ?? 'OK',
    headers: new Map(Object.entries(mock.headers || {})),
    json: async () => mock.data,
    text: async () => JSON.stringify(mock.data)
  };
};

test('http.get fetches data', async () => {
  mockResponses.set('/api/users', {
    data: [{ id: 1, name: 'Alice' }]
  });

  const http = createHttp({ baseURL: '' });
  const response = await http.get('/api/users');

  assertEqual(response.data.length, 1);
  assertEqual(response.data[0].name, 'Alice');
});

test('http handles errors', async () => {
  mockResponses.set('/api/error', {
    ok: false,
    status: 404,
    statusText: 'Not Found',
    data: { error: 'Not found' }
  });

  const http = createHttp({ baseURL: '' });

  try {
    await http.get('/api/error');
    assert(false, 'Should have thrown');
  } catch (error) {
    assert(HttpError.isHttpError(error));
    assertEqual(error.status, 404);
  }
});

test('interceptors transform requests', async () => {
  mockResponses.set('/api/data', { data: 'test' });

  const http = createHttp({ baseURL: '' });
  let intercepted = false;

  http.interceptors.request.use((config) => {
    intercepted = true;
    config.headers['X-Custom'] = 'value';
    return config;
  });

  await http.get('/api/data');
  assertEqual(intercepted, true);
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.testHelpers"></h2>
      <p data-i18n="testing.testHelpersDesc"></p>

      <h3 data-i18n="testing.assertions"></h3>
      <table class="doc-table">
        <caption data-i18n="testing.assertionsCaption"></caption>
        <thead>
          <tr>
            <th scope="col" data-i18n="testing.function"></th>
            <th scope="col" data-i18n="testing.description"></th>
            <th scope="col" data-i18n="testing.example"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>assert(cond, msg?)</code></td>
            <td data-i18n="testing.assertDesc"></td>
            <td><code>assert(user !== null)</code></td>
          </tr>
          <tr>
            <td><code>assertEqual(a, b, msg?)</code></td>
            <td data-i18n="testing.assertEqualDesc"></td>
            <td><code>assertEqual(count, 5)</code></td>
          </tr>
          <tr>
            <td><code>assertDeepEqual(a, b, msg?)</code></td>
            <td data-i18n="testing.assertDeepEqualDesc"></td>
            <td><code>assertDeepEqual(arr, [1,2])</code></td>
          </tr>
          <tr>
            <td><code>assertThrows(fn, msg?, errMsg?)</code></td>
            <td data-i18n="testing.assertThrowsDesc"></td>
            <td><code>assertThrows(() => { throw Error() })</code></td>
          </tr>
          <tr>
            <td><code>assertThrowsAsync(fn, msg?)</code></td>
            <td data-i18n="testing.assertThrowsAsyncDesc"></td>
            <td><code>await assertThrowsAsync(asyncFn)</code></td>
          </tr>
          <tr>
            <td><code>assertTruthy(val, msg?)</code></td>
            <td data-i18n="testing.assertTruthyDesc"></td>
            <td><code>assertTruthy(result)</code></td>
          </tr>
          <tr>
            <td><code>assertFalsy(val, msg?)</code></td>
            <td data-i18n="testing.assertFalsyDesc"></td>
            <td><code>assertFalsy(error)</code></td>
          </tr>
          <tr>
            <td><code>assertInstanceOf(val, Class)</code></td>
            <td data-i18n="testing.assertInstanceOfDesc"></td>
            <td><code>assertInstanceOf(err, TypeError)</code></td>
          </tr>
          <tr>
            <td><code>assertType(val, type)</code></td>
            <td data-i18n="testing.assertTypeDesc"></td>
            <td><code>assertType(fn, 'function')</code></td>
          </tr>
        </tbody>
      </table>

      <h3 data-i18n="testing.spiesAndMocks"></h3>
      <div class="code-block">
        <pre><code>import { createSpy, wait, waitFor } from 'pulse-js-framework/test/utils';

test('createSpy tracks calls', () => {
  const spy = createSpy();

  spy('arg1', 'arg2');
  spy('arg3');

  assertEqual(spy.callCount, 2);
  assertDeepEqual(spy.calls[0], ['arg1', 'arg2']);
  assertDeepEqual(spy.lastCall(), ['arg3']);

  spy.reset();
  assertEqual(spy.callCount, 0);
});

test('spy with implementation', () => {
  const spy = createSpy((x) => x * 2);
  const result = spy(5);

  assertEqual(result, 10);
  assertEqual(spy.callCount, 1);
});

testAsync('wait pauses execution', async () => {
  const start = Date.now();
  await wait(50);
  const elapsed = Date.now() - start;

  assert(elapsed >= 50);
});

testAsync('waitFor polls condition', async () => {
  let ready = false;
  setTimeout(() => { ready = true; }, 50);

  await waitFor(() => ready, 1000, 10);
  assertEqual(ready, true);
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.coverageReporting"></h2>
      <p data-i18n="testing.coverageReportingDesc"></p>

      <div class="code-block">
        <pre><code># Run tests with coverage
pulse test --coverage

# Output:
# Coverage Report:
# ├── runtime/pulse.js ........... 98.5%
# ├── runtime/dom.js ............. 95.2%
# ├── runtime/router.js .......... 92.1%
# └── runtime/store.js ........... 97.8%
#
# Total Coverage: 95.9%</code></pre>
      </div>

      <h3 data-i18n="testing.coverageTips"></h3>
      <ul>
        <li data-i18n="testing.coverageTip1"></li>
        <li data-i18n="testing.coverageTip2"></li>
        <li data-i18n="testing.coverageTip3"></li>
        <li data-i18n="testing.coverageTip4"></li>
      </ul>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.bestPractices"></h2>

      <h3 data-i18n="testing.practice1Title"></h3>
      <p data-i18n="testing.practice1Desc"></p>
      <div class="code-block">
        <pre><code>// Good: Isolated test
test('increments count', () => {
  const ctx = createContext({ name: 'test' });
  withContext(ctx, () => {
    const count = pulse(0);
    count.update(n => n + 1);
    assertEqual(count.get(), 1);
  });
  ctx.reset();
});

// Bad: Shared state between tests
const count = pulse(0); // Leaks between tests!</code></pre>
      </div>

      <h3 data-i18n="testing.practice2Title"></h3>
      <p data-i18n="testing.practice2Desc"></p>
      <div class="code-block">
        <pre><code>// Good: Test behavior, not implementation
test('filters active items', () => {
  const store = createStore({ items: [
    { id: 1, active: true },
    { id: 2, active: false }
  ]});
  const active = computed(() =>
    store.items.get().filter(i => i.active)
  );

  assertEqual(active.get().length, 1);
  assertEqual(active.get()[0].id, 1);
});

// Bad: Testing internal implementation details
test('uses Map internally', () => {
  // Don't test private implementation
});</code></pre>
      </div>

      <h3 data-i18n="testing.practice3Title"></h3>
      <p data-i18n="testing.practice3Desc"></p>
      <div class="code-block">
        <pre><code>// Good: Descriptive test name
test('useForm returns validation errors for invalid email format', () => {
  // ...
});

// Bad: Vague test name
test('email validation', () => {
  // ...
});</code></pre>
      </div>

      <h3 data-i18n="testing.practice4Title"></h3>
      <p data-i18n="testing.practice4Desc"></p>
      <div class="code-block">
        <pre><code>// Good: AAA pattern (Arrange, Act, Assert)
test('adds item to cart', () => {
  // Arrange
  const cart = createStore({ items: [] });
  const item = { id: 1, name: 'Widget' };

  // Act
  cart.items.update(items => [...items, item]);

  // Assert
  assertEqual(cart.items.get().length, 1);
  assertEqual(cart.items.get()[0].name, 'Widget');
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="testing.ciIntegration"></h2>
      <p data-i18n="testing.ciIntegrationDesc"></p>

      <h3>GitHub Actions</h3>
      <div class="code-block">
        <pre><code># .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: pulse test --coverage</code></pre>
      </div>
    </section>

    <div class="next-section"></div>
  `;

  // Reactive i18n: update all translated elements when locale/translations change
  effect(() => {
    locale.get();
    translations.get();

    page.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  });

  // Add navigation button
  const nextSection = page.querySelector('.next-section');
  const nextBtn = el('button.btn.btn-primary');
  effect(() => {
    nextBtn.textContent = t('testing.nextDebugging');
  });
  nextBtn.onclick = () => navigateLocale('/debugging');
  nextSection.appendChild(nextBtn);

  return page;
}
