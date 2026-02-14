/**
 * Server Actions - Comprehensive Tests
 *
 * Tests for Server Actions RPC mechanism (client and server runtime)
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Client-side
import {
  registerAction,
  createActionInvoker,
  useServerAction,
  getActionConfig,
  clearActionRegistry
} from '../runtime/server-components/actions.js';

// Server-side
import {
  registerServerAction,
  executeServerAction,
  createServerActionMiddleware,
  getServerActions,
  clearServerActions
} from '../runtime/server-components/actions-server.js';

// Compiler
import {
  isServerAction,
  hasServerDirective,
  transformServerAction,
  extractServerActions,
  validateServerAction
} from '../compiler/transformer/actions.js';

// ============================================================================
// Client Runtime Tests
// ============================================================================

describe('Server Actions - Client Runtime', () => {
  beforeEach(() => {
    clearActionRegistry();
  });

  test('registerAction adds to registry', () => {
    registerAction('test-action', { endpoint: '/_actions', method: 'POST' });

    const config = getActionConfig('test-action');
    assert.ok(config);
    assert.strictEqual(config.endpoint, '/_actions');
    assert.strictEqual(config.method, 'POST');
  });

  test('registerAction uses default values', () => {
    registerAction('test-action', {});

    const config = getActionConfig('test-action');
    assert.strictEqual(config.endpoint, '/_actions');
    assert.strictEqual(config.method, 'POST');
  });

  test('getActionConfig returns null for unknown action', () => {
    const config = getActionConfig('unknown');
    assert.strictEqual(config, null);
  });

  test('clearActionRegistry removes all actions', () => {
    registerAction('action1', {});
    registerAction('action2', {});

    clearActionRegistry();

    assert.strictEqual(getActionConfig('action1'), null);
    assert.strictEqual(getActionConfig('action2'), null);
  });

  test('createActionInvoker creates function', () => {
    registerAction('test-action', { endpoint: '/_actions' });

    const invoker = createActionInvoker('test-action');
    assert.strictEqual(typeof invoker, 'function');
  });

  test('createActionInvoker throws for unknown action', () => {
    const invoker = createActionInvoker('unknown-action');

    assert.rejects(
      () => invoker(),
      /Server Action not found: unknown-action/
    );
  });

  test('useServerAction returns reactive state', () => {
    registerAction('test-action', { endpoint: '/_actions' });

    const { data, loading, error, invoke, reset } = useServerAction('test-action');

    assert.ok(data);
    assert.ok(loading);
    assert.ok(error);
    assert.strictEqual(typeof invoke, 'function');
    assert.strictEqual(typeof reset, 'function');

    // Initial state
    assert.strictEqual(data.get(), null);
    assert.strictEqual(loading.get(), false);
    assert.strictEqual(error.get(), null);
  });

  test('useServerAction reset clears state', () => {
    registerAction('test-action', { endpoint: '/_actions' });

    const { data, loading, error, reset } = useServerAction('test-action');

    // Set some state
    data.set({ result: 'test' });
    loading.set(true);
    error.set(new Error('test error'));

    // Reset
    reset();

    assert.strictEqual(data.get(), null);
    assert.strictEqual(loading.get(), false);
    assert.strictEqual(error.get(), null);
  });

  test('useServerAction accepts function directly', () => {
    const mockAction = async () => ({ success: true });

    const { invoke } = useServerAction(mockAction);

    assert.strictEqual(typeof invoke, 'function');
  });
});

// ============================================================================
// Server Runtime Tests
// ============================================================================

describe('Server Actions - Server Runtime', () => {
  beforeEach(() => {
    clearServerActions();
  });

  test('registerServerAction adds handler', () => {
    const handler = async () => ({ success: true });
    registerServerAction('test', handler);

    const actions = getServerActions();
    assert.ok(actions.has('test'));
  });

  test('registerServerAction throws for non-function', () => {
    assert.throws(
      () => registerServerAction('test', 'not a function'),
      /handler must be a function/
    );
  });

  test('executeServerAction runs handler', async () => {
    const handler = async (x, y) => x + y;
    registerServerAction('add', handler);

    const result = await executeServerAction('add', [2, 3]);
    assert.strictEqual(result, 5);
  });

  test('executeServerAction passes context', async () => {
    const handler = async (data, context) => {
      assert.ok(context.req);
      assert.ok(context.user);
      return { userId: context.user.id };
    };

    registerServerAction('getUser', handler);

    const result = await executeServerAction('getUser', [{}], {
      req: { path: '/test' },
      user: { id: 123 }
    });

    assert.strictEqual(result.userId, 123);
  });

  test('executeServerAction throws for unknown action', async () => {
    await assert.rejects(
      executeServerAction('unknown', []),
      /Server Action not registered: unknown/
    );
  });

  test('executeServerAction validates JSON serializable args', async () => {
    const handler = async (data) => data;
    registerServerAction('echo', handler);

    // Should throw for non-serializable args
    await assert.rejects(
      executeServerAction('echo', [() => {}]),
      /arguments must be JSON-serializable/
    );
  });

  test('executeServerAction validates JSON serializable result', async () => {
    const handler = async () => (() => {});
    registerServerAction('bad', handler);

    await assert.rejects(
      executeServerAction('bad', []),
      /result must be JSON-serializable/
    );
  });

  test('executeServerAction times out', async () => {
    const handler = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    };
    registerServerAction('slow', handler);

    await assert.rejects(
      executeServerAction('slow', [], { timeout: 50 }),
      /timeout/
    );
  });

  test('executeServerAction uses default timeout', async () => {
    const handler = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true };
    };
    registerServerAction('fast', handler);

    const result = await executeServerAction('fast', []);
    assert.ok(result.success);
  });

  test('getServerActions returns copy', () => {
    const handler = async () => ({ success: true });
    registerServerAction('test', handler);

    const actions1 = getServerActions();
    const actions2 = getServerActions();

    assert.notStrictEqual(actions1, actions2); // Different Map instances
    assert.strictEqual(actions1.size, actions2.size);
  });

  test('clearServerActions removes all', () => {
    registerServerAction('action1', async () => {});
    registerServerAction('action2', async () => {});

    clearServerActions();

    const actions = getServerActions();
    assert.strictEqual(actions.size, 0);
  });
});

// ============================================================================
// Express Middleware Tests
// ============================================================================

describe('Server Actions - Express Middleware', () => {
  beforeEach(() => {
    clearServerActions();
  });

  test('middleware only handles POST to actions endpoint', async () => {
    const middleware = createServerActionMiddleware();

    let nextCalled = false;
    const next = () => { nextCalled = true; };

    // GET request - should call next()
    await middleware(
      { method: 'GET', path: '/_actions' },
      {},
      next
    );
    assert.ok(nextCalled);

    // POST to different path - should call next()
    nextCalled = false;
    await middleware(
      { method: 'POST', path: '/other' },
      {},
      next
    );
    assert.ok(nextCalled);
  });

  test('middleware validates CSRF token', async () => {
    const middleware = createServerActionMiddleware({ csrfValidation: true });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-csrf-token': 'wrong-token' },
      session: { csrfToken: 'correct-token' },
      body: { args: [] }
    };

    let statusCode;
    let response;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        response = data;
      }
    };

    await middleware(req, res, () => {});

    assert.strictEqual(statusCode, 403);
    assert.strictEqual(response.error, 'CSRF validation failed');
  });

  test('middleware validates action ID presence', async () => {
    const middleware = createServerActionMiddleware({ csrfValidation: false });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: {},
      body: { args: [] }
    };

    let statusCode;
    let response;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        response = data;
      }
    };

    await middleware(req, res, () => {});

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(response.error, 'Missing action ID');
  });

  test('middleware executes action successfully', async () => {
    registerServerAction('test', async (x, y) => x + y);

    const middleware = createServerActionMiddleware({ csrfValidation: false });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'test' },
      body: { args: [2, 3] }
    };

    let response;
    const res = {
      json: (data) => {
        response = data;
      }
    };

    await middleware(req, res, () => {});

    assert.strictEqual(response, 5);
  });

  test('middleware handles errors', async () => {
    registerServerAction('error', async () => {
      throw new Error('Test error');
    });

    const middleware = createServerActionMiddleware({ csrfValidation: false });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'error' },
      body: { args: [] }
    };

    let statusCode;
    let response;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        response = data;
      }
    };

    await middleware(req, res, () => {});

    assert.strictEqual(statusCode, 500);
    assert.strictEqual(response.error, 'Test error');
  });

  test('middleware uses custom error handler', async () => {
    registerServerAction('error', async () => {
      throw new Error('Test error');
    });

    let customErrorCalled = false;
    const middleware = createServerActionMiddleware({
      csrfValidation: false,
      onError: (error, req, res) => {
        customErrorCalled = true;
        res.status(500).json({ custom: true, message: error.message });
      }
    });

    const req = {
      method: 'POST',
      path: '/_actions',
      headers: { 'x-pulse-action': 'error' },
      body: { args: [] }
    };

    let response;
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        response = data;
      }
    };

    await middleware(req, res, () => {});

    assert.ok(customErrorCalled);
    assert.ok(response.custom);
    assert.strictEqual(response.message, 'Test error');
  });
});

// ============================================================================
// Compiler Tests
// ============================================================================

describe('Server Actions - Compiler', () => {
  test('isServerAction detects use server directive', () => {
    const functionNode = {
      type: 'FunctionDeclaration',
      name: 'createUser',
      body: [
        { type: 'StringLiteral', value: 'use server' },
        { type: 'ReturnStatement' }
      ]
    };

    assert.ok(isServerAction(functionNode));
  });

  test('isServerAction is case insensitive', () => {
    const functionNode = {
      body: [{ type: 'StringLiteral', value: 'USE SERVER' }]
    };

    assert.ok(isServerAction(functionNode));
  });

  test('isServerAction returns false for no directive', () => {
    const functionNode = {
      body: [{ type: 'ReturnStatement' }]
    };

    assert.strictEqual(isServerAction(functionNode), false);
  });

  test('isServerAction handles empty body', () => {
    const functionNode = { body: [] };

    assert.strictEqual(isServerAction(functionNode), false);
  });

  test('hasServerDirective detects module-level directive', () => {
    const ast = {
      body: [
        { type: 'StringLiteral', value: 'use server' },
        { type: 'FunctionDeclaration', name: 'fn1' }
      ]
    };

    assert.ok(hasServerDirective(ast));
  });

  test('transformServerAction generates RPC stub', () => {
    const functionNode = {
      name: 'createUser',
      params: ['data']
    };

    const result = transformServerAction(functionNode, 'UserForm', 'createUser');

    assert.ok(result.includes('createActionInvoker'));
    assert.ok(result.includes('UserForm$createUser'));
    assert.ok(result.includes('const createUser'));
  });

  test('extractServerActions finds actions in block', () => {
    const actionsBlock = {
      functions: [
        {
          name: 'createUser',
          params: ['data'],
          body: [{ type: 'StringLiteral', value: 'use server' }]
        },
        {
          name: 'normalAction',
          params: [],
          body: [{ type: 'ReturnStatement' }]
        },
        {
          name: 'deleteUser',
          params: ['id'],
          body: [{ type: 'StringLiteral', value: 'use server' }]
        }
      ]
    };

    const actions = extractServerActions(actionsBlock, 'UserForm');

    assert.strictEqual(actions.length, 2);
    assert.strictEqual(actions[0].id, 'UserForm$createUser');
    assert.strictEqual(actions[0].name, 'createUser');
    assert.deepStrictEqual(actions[0].params, ['data']);
    assert.strictEqual(actions[1].id, 'UserForm$deleteUser');
  });

  test('extractServerActions handles empty block', () => {
    const actionsBlock = { functions: [] };

    const actions = extractServerActions(actionsBlock, 'Component');

    assert.strictEqual(actions.length, 0);
  });

  test('extractServerActions handles missing functions', () => {
    const actionsBlock = {};

    const actions = extractServerActions(actionsBlock, 'Component');

    assert.strictEqual(actions.length, 0);
  });

  test('validateServerAction requires async', () => {
    const functionNode = {
      async: false,
      params: []
    };

    const result = validateServerAction(functionNode);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('must be async')));
  });

  test('validateServerAction passes for async function', () => {
    const functionNode = {
      async: true,
      params: []
    };

    const result = validateServerAction(functionNode);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  test('validateServerAction rejects function parameters', () => {
    const functionNode = {
      async: true,
      params: [
        { type: 'Identifier', name: 'data' },
        { type: 'FunctionExpression', name: 'callback' }
      ]
    };

    const result = validateServerAction(functionNode);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('cannot be a function')));
  });
});
