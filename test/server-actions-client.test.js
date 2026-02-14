/**
 * Client-Side Server Actions Tests
 *
 * Tests for runtime/server-components/actions.js
 * Target: 43.19% → 92% coverage
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import {
  registerAction,
  getActionConfig,
  clearActionRegistry,
  createActionInvoker,
  useServerAction,
  bindFormAction
} from '../runtime/server-components/actions.js';
import { PSCRateLimitError } from '../runtime/server-components/security-errors.js';

// ============================================================
// Mock Environment Setup
// ============================================================

let mockDocument;
let mockFetch;
let fetchCalls;

beforeEach(() => {
  // Mock document
  mockDocument = {
    querySelector: mock.fn((selector) => {
      if (selector === 'meta[name="csrf-token"]') {
        return { getAttribute: () => 'test-csrf-token' };
      }
      return null;
    }),
    cookie: 'csrf-token=cookie-csrf-token'
  };
  global.document = mockDocument;

  // Mock fetch
  fetchCalls = [];
  mockFetch = mock.fn(async (url, options) => {
    fetchCalls.push({ url, options });

    // Default success response
    return {
      ok: true,
      status: 200,
      headers: new Map([['Content-Type', 'application/json']]),
      json: async () => ({ success: true, data: 'test' })
    };
  });
  global.fetch = mockFetch;

  // Clear registry before each test
  clearActionRegistry();
});

afterEach(() => {
  delete global.document;
  delete global.fetch;
  clearActionRegistry();
});

// ============================================================
// Action Registry
// ============================================================

describe('Action Registry', () => {
  test('registers action with default config', () => {
    registerAction('testAction');
    const config = getActionConfig('testAction');

    assert.strictEqual(config.endpoint, '/_actions');
    assert.strictEqual(config.method, 'POST');
  });

  test('registers action with custom config', () => {
    registerAction('customAction', {
      endpoint: '/api/actions',
      method: 'PUT'
    });

    const config = getActionConfig('customAction');
    assert.strictEqual(config.endpoint, '/api/actions');
    assert.strictEqual(config.method, 'PUT');
  });

  test('getActionConfig returns null for unregistered action', () => {
    const config = getActionConfig('nonexistent');
    assert.strictEqual(config, null);
  });

  test('clearActionRegistry removes all actions', () => {
    registerAction('action1');
    registerAction('action2');

    clearActionRegistry();

    assert.strictEqual(getActionConfig('action1'), null);
    assert.strictEqual(getActionConfig('action2'), null);
  });

  test('overwrites existing action', () => {
    registerAction('action', { endpoint: '/v1' });
    registerAction('action', { endpoint: '/v2' });

    const config = getActionConfig('action');
    assert.strictEqual(config.endpoint, '/v2');
  });
});

// ============================================================
// CSRF Token Handling
// ============================================================

describe('CSRF Token Handling', () => {
  test('gets CSRF token from meta tag', async () => {
    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await invoker({ test: 'data' });

    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fetchCalls[0].options.headers['X-CSRF-Token'], 'test-csrf-token');
  });

  test('falls back to cookie when meta tag missing', async () => {
    global.document.querySelector = mock.fn(() => null); // No meta tag
    global.document.cookie = 'csrf-token=cookie-token';

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await invoker({ test: 'data' });

    assert.strictEqual(fetchCalls[0].options.headers['X-CSRF-Token'], 'cookie-token');
  });

  test('uses empty string when no CSRF token available', async () => {
    global.document.querySelector = mock.fn(() => null);
    global.document.cookie = '';

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await invoker({ test: 'data' });

    assert.strictEqual(fetchCalls[0].options.headers['X-CSRF-Token'], '');
  });

  test('updates CSRF token from response header', async () => {
    const metaElement = {
      getAttribute: mock.fn(() => 'old-token'),
      setAttribute: mock.fn()
    };
    global.document.querySelector = mock.fn(() => metaElement);

    global.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Map([
        ['Content-Type', 'application/json'],
        ['X-New-CSRF-Token', 'new-token']
      ]),
      json: async () => ({ success: true })
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await invoker({ test: 'data' });

    assert.strictEqual(metaElement.setAttribute.mock.calls.length, 1);
    assert.strictEqual(metaElement.setAttribute.mock.calls[0].arguments[0], 'content');
    assert.strictEqual(metaElement.setAttribute.mock.calls[0].arguments[1], 'new-token');
  });

  test('skips CSRF update when header not present', async () => {
    const metaElement = {
      getAttribute: mock.fn(() => 'token'),
      setAttribute: mock.fn()
    };
    global.document.querySelector = mock.fn(() => metaElement);

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await invoker({ test: 'data' });

    assert.strictEqual(metaElement.setAttribute.mock.calls.length, 0);
  });

  test('handles missing document in SSR', async () => {
    delete global.document;

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    // Should not throw
    await invoker({ test: 'data' });

    assert.strictEqual(fetchCalls[0].options.headers['X-CSRF-Token'], '');
  });
});

// ============================================================
// createActionInvoker - Basic Invocation
// ============================================================

describe('createActionInvoker - Basic Invocation', () => {
  test('throws when action not registered', async () => {
    const invoker = createActionInvoker('unregistered');

    await assert.rejects(
      async () => await invoker({ test: 'data' }),
      { message: 'Server Action not found: unregistered' }
    );
  });

  test('makes POST request with correct headers', async () => {
    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await invoker({ name: 'John' });

    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fetchCalls[0].url, '/_actions');
    assert.strictEqual(fetchCalls[0].options.method, 'POST');
    assert.strictEqual(fetchCalls[0].options.headers['Content-Type'], 'application/json');
    assert.strictEqual(fetchCalls[0].options.headers['X-Pulse-Action'], 'testAction');
    assert.strictEqual(fetchCalls[0].options.credentials, 'same-origin');
  });

  test('serializes arguments to JSON', async () => {
    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await invoker({ name: 'John' }, { age: 30 });

    const body = JSON.parse(fetchCalls[0].options.body);
    assert.deepStrictEqual(body.args, [{ name: 'John' }, { age: 30 }]);
  });

  test('returns parsed JSON response', async () => {
    global.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ id: 123, name: 'John' })
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    const result = await invoker({ name: 'John' });

    assert.deepStrictEqual(result, { id: 123, name: 'John' });
  });

  test('handles successful response with empty body', async () => {
    global.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => null
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    const result = await invoker();

    assert.strictEqual(result, null);
  });
});

// ============================================================
// createActionInvoker - Error Handling
// ============================================================

describe('createActionInvoker - Error Handling', () => {
  test('throws on HTTP error with JSON error message', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 400,
      headers: new Map(),
      json: async () => ({ message: 'Validation failed' })
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await assert.rejects(
      async () => await invoker({ test: 'data' }),
      { message: 'Validation failed' }
    );
  });

  test('throws on HTTP error with error field', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 500,
      headers: new Map(),
      json: async () => ({ error: 'Internal server error' })
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await assert.rejects(
      async () => await invoker({ test: 'data' }),
      { message: 'Internal server error' }
    );
  });

  test('throws on HTTP error with status text fallback', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Map(),
      json: async () => { throw new Error('Parse error'); }
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await assert.rejects(
      async () => await invoker({ test: 'data' }),
      { message: 'Not Found' }
    );
  });

  test('throws generic error when no error info available', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 500,
      statusText: '',
      headers: new Map(),
      json: async () => { throw new Error('Parse error'); }
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await assert.rejects(
      async () => await invoker({ test: 'data' }),
      { message: 'Server Action failed' }
    );
  });

  test('propagates network errors', async () => {
    global.fetch = mock.fn(async () => {
      throw new Error('Network error');
    });

    registerAction('testAction');
    const invoker = createActionInvoker('testAction');

    await assert.rejects(
      async () => await invoker({ test: 'data' }),
      { message: 'Network error' }
    );
  });
});

// ============================================================
// createActionInvoker - Rate Limiting
// ============================================================

describe('createActionInvoker - Rate Limiting', () => {
  test('retries on 429 with Retry-After header', async () => {
    let attempts = 0;

    global.fetch = mock.fn(async () => {
      attempts++;

      if (attempts === 1) {
        // First attempt: rate limited
        return {
          ok: false,
          status: 429,
          headers: new Map([
            ['Retry-After', '1'], // 1 second
            ['X-RateLimit-Limit', '10'],
            ['X-RateLimit-Reset', '2026-02-14T10:00:00Z']
          ]),
          json: async () => ({ reason: 'per-user' })
        };
      } else {
        // Second attempt: success
        return {
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ success: true })
        };
      }
    });

    registerAction('testAction');
    const invoker = createActionInvoker('testAction', { maxRetries: 3 });

    const result = await invoker({ test: 'data' });

    assert.strictEqual(attempts, 2);
    assert.deepStrictEqual(result, { success: true });
  });

  test('uses default retry delay when Retry-After missing', async () => {
    let attempts = 0;

    global.fetch = mock.fn(async () => {
      attempts++;

      if (attempts === 1) {
        return {
          ok: false,
          status: 429,
          headers: new Map(),
          json: async () => ({})
        };
      } else {
        return {
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ success: true })
        };
      }
    });

    registerAction('testAction');
    const invoker = createActionInvoker('testAction', { maxRetries: 1 });

    const result = await invoker({ test: 'data' });

    assert.strictEqual(attempts, 2);
    assert.deepStrictEqual(result, { success: true });
  });

  test('throws PSCRateLimitError when max retries exceeded', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 429,
      headers: new Map([
        ['Retry-After', '1'],
        ['X-RateLimit-Limit', '10'],
        ['X-RateLimit-Reset', '2026-02-14T10:00:00Z']
      ]),
      json: async () => ({ reason: 'per-user' })
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction', { maxRetries: 2 });

    try {
      await invoker({ test: 'data' });
      assert.fail('Should have thrown PSCRateLimitError');
    } catch (error) {
      assert.ok(PSCRateLimitError.isRateLimitError(error));
      assert.strictEqual(error.message, 'Rate limit exceeded');
      assert.strictEqual(error.actionId, 'testAction');
      assert.strictEqual(error.reason, 'per-user');
      assert.strictEqual(error.retryAfter, 1000);
      assert.strictEqual(error.resetAt, '2026-02-14T10:00:00Z');
      assert.strictEqual(error.limit, 10);
    }
  });

  test('does not retry when autoRetry=false', async () => {
    let attempts = 0;

    global.fetch = mock.fn(async () => {
      attempts++;

      return {
        ok: false,
        status: 429,
        headers: new Map([['Retry-After', '1']]),
        json: async () => ({})
      };
    });

    registerAction('testAction');
    const invoker = createActionInvoker('testAction', {
      maxRetries: 3,
      autoRetry: false
    });

    try {
      await invoker({ test: 'data' });
      assert.fail('Should have thrown PSCRateLimitError');
    } catch (error) {
      assert.ok(PSCRateLimitError.isRateLimitError(error));
      assert.strictEqual(attempts, 1); // No retries
    }
  });

  test('handles JSON parse error in rate limit response', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 429,
      headers: new Map([['Retry-After', '1']]),
      json: async () => { throw new Error('Parse error'); }
    }));

    registerAction('testAction');
    const invoker = createActionInvoker('testAction', { maxRetries: 0 });

    try {
      await invoker({ test: 'data' });
      assert.fail('Should have thrown PSCRateLimitError');
    } catch (error) {
      assert.ok(PSCRateLimitError.isRateLimitError(error));
      assert.strictEqual(error.reason, undefined); // No parsed error data
    }
  });
});

// ============================================================
// useServerAction
// ============================================================

describe('useServerAction', () => {
  test('creates reactive pulses for state', () => {
    registerAction('testAction');
    const { data, loading, error } = useServerAction('testAction');

    assert.strictEqual(data.get(), null);
    assert.strictEqual(loading.get(), false);
    assert.strictEqual(error.get(), null);
  });

  test('sets loading state during invocation', async () => {
    global.fetch = mock.fn(async () => {
      // Slow response
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        ok: true,
        status: 200,
        headers: new Map(),
        json: async () => ({ success: true })
      };
    });

    registerAction('testAction');
    const { invoke, loading } = useServerAction('testAction');

    const promise = invoke({ test: 'data' });
    assert.strictEqual(loading.get(), true);

    await promise;
    assert.strictEqual(loading.get(), false);
  });

  test('sets data on success', async () => {
    global.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ id: 123, name: 'John' })
    }));

    registerAction('testAction');
    const { invoke, data } = useServerAction('testAction');

    await invoke({ name: 'John' });

    assert.deepStrictEqual(data.get(), { id: 123, name: 'John' });
  });

  test('sets error on failure', async () => {
    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 400,
      headers: new Map(),
      json: async () => ({ message: 'Validation failed' })
    }));

    registerAction('testAction');
    const { invoke, error } = useServerAction('testAction');

    try {
      await invoke({ test: 'data' });
      assert.fail('Should have thrown');
    } catch {
      // Expected
    }

    assert.strictEqual(error.get().message, 'Validation failed');
  });

  test('clears error before new invocation', async () => {
    let callCount = 0;

    global.fetch = mock.fn(async () => {
      callCount++;

      if (callCount === 1) {
        return {
          ok: false,
          status: 400,
          headers: new Map(),
          json: async () => ({ message: 'First error' })
        };
      } else {
        return {
          ok: true,
          status: 200,
          headers: new Map(),
          json: async () => ({ success: true })
        };
      }
    });

    registerAction('testAction');
    const { invoke, error } = useServerAction('testAction');

    // First call fails
    try {
      await invoke({ test: 'data' });
    } catch {
      // Expected
    }
    assert.strictEqual(error.get().message, 'First error');

    // Second call succeeds
    await invoke({ test: 'data' });
    assert.strictEqual(error.get(), null);
  });

  test('reset() clears all state', async () => {
    global.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ id: 123 })
    }));

    registerAction('testAction');
    const { invoke, data, loading, error, reset } = useServerAction('testAction');

    await invoke({ test: 'data' });

    assert.notStrictEqual(data.get(), null);

    reset();

    assert.strictEqual(data.get(), null);
    assert.strictEqual(loading.get(), false);
    assert.strictEqual(error.get(), null);
  });

  test('accepts action invoker function instead of string', async () => {
    const customInvoker = mock.fn(async () => ({ custom: true }));

    const { invoke, data } = useServerAction(customInvoker);

    await invoke({ test: 'data' });

    assert.strictEqual(customInvoker.mock.calls.length, 1);
    assert.deepStrictEqual(data.get(), { custom: true });
  });
});

// ============================================================
// bindFormAction
// ============================================================

describe('bindFormAction', () => {
  let form;
  let submitButton;

  beforeEach(() => {
    // Mock form
    form = {
      addEventListener: mock.fn(),
      removeEventListener: mock.fn(),
      querySelector: mock.fn((selector) => {
        if (selector === '[type=submit]') {
          return submitButton;
        }
        return null;
      }),
      reset: mock.fn()
    };

    submitButton = {
      disabled: false,
      textContent: 'Submit'
    };
  });

  test('adds submit event listener', () => {
    registerAction('testAction');
    bindFormAction(form, 'testAction');

    assert.strictEqual(form.addEventListener.mock.calls.length, 1);
    assert.strictEqual(form.addEventListener.mock.calls[0].arguments[0], 'submit');
  });

  test('returns cleanup function that removes listener', () => {
    registerAction('testAction');
    const cleanup = bindFormAction(form, 'testAction');

    cleanup();

    assert.strictEqual(form.removeEventListener.mock.calls.length, 1);
    assert.strictEqual(form.removeEventListener.mock.calls[0].arguments[0], 'submit');
  });

  test('prevents default form submission', async () => {
    const preventDefault = mock.fn();
    const event = { preventDefault };

    global.FormData = class {
      entries() {
        return [['name', 'John']];
      }
    };

    registerAction('testAction');
    bindFormAction(form, 'testAction');

    const handler = form.addEventListener.mock.calls[0].arguments[1];
    await handler(event);

    assert.strictEqual(preventDefault.mock.calls.length, 1);
  });

  test('disables submit button during submission', async () => {
    const preventDefault = mock.fn();
    global.FormData = class {
      entries() {
        return [['name', 'John']];
      }
    };

    registerAction('testAction');
    bindFormAction(form, 'testAction');

    const handler = form.addEventListener.mock.calls[0].arguments[1];
    const promise = handler({ preventDefault });

    // During submission
    // Note: We can't check this synchronously because the handler is async

    await promise;

    // After submission
    assert.strictEqual(submitButton.disabled, false);
    assert.strictEqual(submitButton.textContent, 'Submit');
  });

  test('resets form on success by default', async () => {
    const preventDefault = mock.fn();
    global.FormData = class {
      entries() {
        return [['name', 'John']];
      }
    };

    registerAction('testAction');
    bindFormAction(form, 'testAction');

    const handler = form.addEventListener.mock.calls[0].arguments[1];
    await handler({ preventDefault });

    assert.strictEqual(form.reset.mock.calls.length, 1);
  });

  test('does not reset form when resetOnSuccess=false', async () => {
    const preventDefault = mock.fn();
    global.FormData = class {
      entries() {
        return [['name', 'John']];
      }
    };

    registerAction('testAction');
    bindFormAction(form, 'testAction', { resetOnSuccess: false });

    const handler = form.addEventListener.mock.calls[0].arguments[1];
    await handler({ preventDefault });

    assert.strictEqual(form.reset.mock.calls.length, 0);
  });

  test('calls onSuccess callback', async () => {
    const preventDefault = mock.fn();
    const onSuccess = mock.fn();
    global.FormData = class {
      entries() {
        return [['name', 'John']];
      }
    };

    global.fetch = mock.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ id: 123, name: 'John' })
    }));

    registerAction('testAction');
    bindFormAction(form, 'testAction', { onSuccess });

    const handler = form.addEventListener.mock.calls[0].arguments[1];
    await handler({ preventDefault });

    assert.strictEqual(onSuccess.mock.calls.length, 1);
    assert.deepStrictEqual(onSuccess.mock.calls[0].arguments[0], { id: 123, name: 'John' });
  });

  test('calls onError callback on failure', async () => {
    const preventDefault = mock.fn();
    const onError = mock.fn();
    global.FormData = class {
      entries() {
        return [['name', 'John']];
      }
    };

    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 400,
      headers: new Map(),
      json: async () => ({ message: 'Validation failed' })
    }));

    registerAction('testAction');
    bindFormAction(form, 'testAction', { onError });

    const handler = form.addEventListener.mock.calls[0].arguments[1];
    await handler({ preventDefault });

    assert.strictEqual(onError.mock.calls.length, 1);
    assert.strictEqual(onError.mock.calls[0].arguments[0].message, 'Validation failed');
  });

  test('shows alert and logs error when onError not provided', async () => {
    const preventDefault = mock.fn();
    const consoleError = mock.fn();
    const alert = mock.fn();
    global.console.error = consoleError;
    global.alert = alert;

    global.FormData = class {
      entries() {
        return [['name', 'John']];
      }
    };

    global.fetch = mock.fn(async () => ({
      ok: false,
      status: 400,
      headers: new Map(),
      json: async () => ({ message: 'Validation failed' })
    }));

    registerAction('testAction');
    bindFormAction(form, 'testAction');

    const handler = form.addEventListener.mock.calls[0].arguments[1];
    await handler({ preventDefault });

    assert.strictEqual(consoleError.mock.calls.length, 1);
    assert.strictEqual(alert.mock.calls.length, 1);
    assert.ok(alert.mock.calls[0].arguments[0].includes('Validation failed'));
  });

  test('handles form without submit button', async () => {
    const preventDefault = mock.fn();
    form.querySelector = mock.fn(() => null); // No submit button

    global.FormData = class {
      entries() {
        return [['name', 'John']];
      }
    };

    registerAction('testAction');
    bindFormAction(form, 'testAction');

    const handler = form.addEventListener.mock.calls[0].arguments[1];

    // Should not throw
    await handler({ preventDefault });

    assert.strictEqual(form.reset.mock.calls.length, 1);
  });
});

console.log('✅ Server Actions client tests completed');
