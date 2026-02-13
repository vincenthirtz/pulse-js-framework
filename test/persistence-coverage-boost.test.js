/**
 * Persistence Coverage Boost Tests
 * Additional tests to cover IndexedDB adapter (lines 185-234)
 * Target: Increase persistence.js coverage from 84% to 95%+
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// ============================================================================
// IndexedDB Mock
// ============================================================================

class MockIDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
    this.onupgradeneeded = null;
  }

  simulateSuccess(result) {
    this.result = result;
    setTimeout(() => this.onsuccess?.({ target: this }), 0);
  }

  simulateError(error) {
    this.error = error;
    setTimeout(() => this.onerror?.({ target: this }), 0);
  }
}

class MockIDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.mode = mode;
    this.error = null;
    this.objectStoreNames = storeNames;
  }

  objectStore(name) {
    return this.db._stores.get(name);
  }
}

class MockIDBObjectStore {
  constructor(name) {
    this.name = name;
    this._data = new Map();
  }

  get(key) {
    const request = new MockIDBRequest();
    const value = this._data.get(key);
    request.simulateSuccess(value);
    return request;
  }

  put(value, key) {
    const request = new MockIDBRequest();
    this._data.set(key, value);
    request.simulateSuccess(key);
    return request;
  }

  delete(key) {
    const request = new MockIDBRequest();
    this._data.delete(key);
    request.simulateSuccess(undefined);
    return request;
  }

  clear() {
    const request = new MockIDBRequest();
    this._data.clear();
    request.simulateSuccess(undefined);
    return request;
  }

  getAllKeys() {
    const request = new MockIDBRequest();
    request.simulateSuccess([...this._data.keys()]);
    return request;
  }
}

class MockIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this._storeNames = new Set();
    this._stores = new Map();

    // Mock DOMStringList interface
    this.objectStoreNames = {
      contains: (name) => this._storeNames.has(name),
      item: (index) => [...this._storeNames][index],
      get length() { return this._storeNames.size; }
    };
  }

  createObjectStore(name) {
    this._storeNames.add(name);
    const store = new MockIDBObjectStore(name);
    this._stores.set(name, store);
    return store;
  }

  transaction(storeNames, mode = 'readonly') {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, names, mode);
  }

  close() {
    // No-op for mock
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  constructor(name, version) {
    super();
    this.name = name;
    this.version = version;
  }
}

class MockIndexedDB {
  constructor() {
    this._databases = new Map();
    this.shouldFail = false;
    this.failureMessage = 'Mock failure';
  }

  open(name, version = 1) {
    const request = new MockIDBOpenDBRequest(name, version);

    setTimeout(() => {
      if (this.shouldFail) {
        request.error = new Error(this.failureMessage);
        request.onerror?.();
        return;
      }

      let db = this._databases.get(name);
      const needsUpgrade = !db || db.version < version;

      if (needsUpgrade) {
        if (!db) {
          db = new MockIDBDatabase(name, version);
          this._databases.set(name, db);
        } else {
          db.version = version;
        }
        request.result = db;
        request.onupgradeneeded?.();
      }

      request.result = db;
      request.onsuccess?.();
    }, 0);

    return request;
  }

  deleteDatabase(name) {
    const request = new MockIDBRequest();
    this._databases.delete(name);
    request.simulateSuccess(undefined);
    return request;
  }
}

// Setup/teardown
let originalIndexedDB;
let mockIDB;

beforeEach(() => {
  originalIndexedDB = globalThis.indexedDB;
  mockIDB = new MockIndexedDB();
  globalThis.indexedDB = mockIDB;
});

afterEach(() => {
  if (originalIndexedDB) {
    globalThis.indexedDB = originalIndexedDB;
  } else {
    delete globalThis.indexedDB;
  }
  mockIDB = null;
});

// ============================================================================
// IndexedDB Adapter Tests - Coverage for lines 185-234
// ============================================================================

describe('createIndexedDBAdapter - Internal Functions Coverage', () => {
  test('_openDB creates database and object store on first call', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter({
      dbName: 'test-db',
      storeName: 'test-store',
      version: 1
    });

    // First operation triggers _openDB (lines 188-212)
    await adapter.setItem('key1', 'value1');

    // Verify database was created
    assert.ok(mockIDB._databases.has('test-db'));
    const db = mockIDB._databases.get('test-db');
    assert.ok(db.objectStoreNames.contains('test-store'));
  });

  test('_openDB reuses existing database promise', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter({
      dbName: 'test-db-reuse',
      storeName: 'store',
      version: 1
    });

    // Multiple operations should reuse the same db connection
    await Promise.all([
      adapter.setItem('key1', 'value1'),
      adapter.setItem('key2', 'value2'),
      adapter.getItem('key1')
    ]);

    // Only one database should be created
    assert.strictEqual(mockIDB._databases.size, 1);
  });

  test('_openDB handles database open errors', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    // Configure mock to fail
    mockIDB.shouldFail = true;
    mockIDB.failureMessage = 'Database locked';

    const adapter = createIndexedDBAdapter({
      dbName: 'failing-db',
      storeName: 'store',
      version: 1
    });

    // Should throw PersistenceError (lines 202-208)
    await assert.rejects(
      async () => await adapter.getItem('key'),
      {
        name: 'PersistenceError',
        message: /Failed to open database.*Database locked/
      }
    );
  });

  test('_transaction creates readonly transaction', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter({
      dbName: 'tx-test-db',
      storeName: 'tx-store',
      version: 1
    });

    // getItem uses readonly transaction (lines 214-219)
    const result = await adapter.getItem('nonexistent');

    assert.strictEqual(result, null);
  });

  test('_transaction creates readwrite transaction', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter({
      dbName: 'rw-test-db',
      storeName: 'rw-store',
      version: 1
    });

    // setItem uses readwrite transaction (lines 214-219)
    await adapter.setItem('key', { data: 'value' });

    const result = await adapter.getItem('key');
    assert.deepStrictEqual(result, { data: 'value' });
  });

  test('_request wraps get operation', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();

    // Set a value first
    await adapter.setItem('test-key', { value: 42 });

    // _request wraps the get operation (lines 221-230)
    const result = await adapter.getItem('test-key');

    assert.deepStrictEqual(result, { value: 42 });
  });

  test('_request wraps put operation', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();

    // _request wraps the put operation (lines 221-230)
    await adapter.setItem('put-key', { data: 'test' });

    const result = await adapter.getItem('put-key');
    assert.deepStrictEqual(result, { data: 'test' });
  });

  test('_request wraps delete operation', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();

    await adapter.setItem('delete-me', 'value');

    // _request wraps the delete operation (lines 221-230)
    await adapter.removeItem('delete-me');

    const result = await adapter.getItem('delete-me');
    assert.strictEqual(result, null);
  });

  test('_request wraps clear operation', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();

    await adapter.setItem('key1', 'value1');
    await adapter.setItem('key2', 'value2');

    // _request wraps the clear operation (lines 221-230)
    await adapter.clear();

    const result1 = await adapter.getItem('key1');
    const result2 = await adapter.getItem('key2');

    assert.strictEqual(result1, null);
    assert.strictEqual(result2, null);
  });

  test('_request wraps getAllKeys operation', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();

    await adapter.setItem('key1', 'value1');
    await adapter.setItem('key2', 'value2');
    await adapter.setItem('key3', 'value3');

    // _request wraps the getAllKeys operation (lines 221-230)
    const keys = await adapter.keys();

    assert.strictEqual(keys.length, 3);
    assert.ok(keys.includes('key1'));
    assert.ok(keys.includes('key2'));
    assert.ok(keys.includes('key3'));
  });

  test('handles onupgradeneeded when store does not exist', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter({
      dbName: 'upgrade-db',
      storeName: 'new-store',
      version: 2
    });

    // Trigger database open which will call onupgradeneeded (lines 194-199)
    await adapter.setItem('key', 'value');

    const db = mockIDB._databases.get('upgrade-db');
    assert.ok(db.objectStoreNames.contains('new-store'));
  });

  test('resets dbPromise on database open error', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter({
      dbName: 'reset-promise-db',
      storeName: 'store',
      version: 1
    });

    // First attempt fails
    mockIDB.shouldFail = true;
    await assert.rejects(() => adapter.getItem('key'));

    // Second attempt succeeds (dbPromise was reset on line 203)
    mockIDB.shouldFail = false;
    const result = await adapter.getItem('key');
    assert.strictEqual(result, null);
  });
});

// ============================================================================
// IndexedDB Adapter - Complete Workflow Tests
// ============================================================================

describe('createIndexedDBAdapter - Complete Workflows', () => {
  test('complete CRUD workflow', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter({
      dbName: 'crud-db',
      storeName: 'crud-store'
    });

    // Create
    await adapter.setItem('user', { name: 'Alice', age: 30 });

    // Read
    const user = await adapter.getItem('user');
    assert.deepStrictEqual(user, { name: 'Alice', age: 30 });

    // Update
    await adapter.setItem('user', { name: 'Alice', age: 31 });
    const updated = await adapter.getItem('user');
    assert.strictEqual(updated.age, 31);

    // Delete
    await adapter.removeItem('user');
    const deleted = await adapter.getItem('user');
    assert.strictEqual(deleted, null);
  });

  test('handles multiple keys', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();

    await adapter.setItem('key1', 'value1');
    await adapter.setItem('key2', 'value2');
    await adapter.setItem('key3', 'value3');

    const keys = await adapter.keys();
    assert.strictEqual(keys.length, 3);

    await adapter.clear();
    const keysAfterClear = await adapter.keys();
    assert.strictEqual(keysAfterClear.length, 0);
  });

  test('adapter name is IndexedDB', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();
    assert.strictEqual(adapter.name, 'IndexedDB');
  });

  test('returns null for missing keys', async () => {
    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();
    const result = await adapter.getItem('nonexistent-key');
    assert.strictEqual(result, null);
  });
});

// ============================================================================
// IndexedDB Fallback Tests
// ============================================================================

describe('createIndexedDBAdapter - Browser Environment Fallback', () => {
  test('falls back to memory adapter when IndexedDB not available', async () => {
    // Remove IndexedDB to simulate unsupported environment
    delete globalThis.indexedDB;

    const { createIndexedDBAdapter } = await import('../runtime/persistence.js');

    const adapter = createIndexedDBAdapter();

    // Should fall back to memory adapter (lines 181-184)
    assert.strictEqual(adapter.name, 'Memory');

    // Should still work
    await adapter.setItem('key', 'value');
    const result = await adapter.getItem('key');
    assert.strictEqual(result, 'value');
  });
});
