/**
 * Pulse Native Runtime Tests
 *
 * Tests for runtime/native.js - Native mobile bridge, storage, device info
 *
 * Note: These tests focus on the helper functions and web fallback behavior.
 * Full native bridge testing requires a native app environment.
 *
 * @module test/native
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createMockLocalStorage } from './utils.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// =============================================================================
// Mock Setup - Run before any imports
// =============================================================================

// Create mock localStorage
const mockStorage = createMockLocalStorage();
global.localStorage = mockStorage.storage;

// Create minimal window mock
global.window = global.window || {};
global.window.addEventListener = global.window.addEventListener || (() => {});

// Mock document for lifecycle tests
global.document = global.document || {
  hidden: false,
  addEventListener: () => {}
};

// Now import the module (after mocks are set up)
const {
  isNativeAvailable,
  getPlatform,
  isNative,
  createNativeStorage,
  createDeviceInfo,
  NativeUI,
  NativeClipboard,
  onAppPause,
  onAppResume,
  onBackButton,
  onNativeReady,
  exitApp,
  minimizeApp,
  clearBridgeValidationCache,
  getBridgeValidationError
} = await import('../runtime/native.js');

// =============================================================================
// Platform Detection Tests (Web Environment)
// =============================================================================

describe('Platform Detection Tests', () => {
  test('isNativeAvailable returns false on web', () => {
    // No PulseMobile in global.window
    assert.strictEqual(isNativeAvailable(), false);
  });

  test('getPlatform returns web when not native', () => {
    assert.strictEqual(getPlatform(), 'web');
  });

  test('isNative returns false on web', () => {
    assert.strictEqual(isNative(), false);
  });
});

// =============================================================================
// Bridge Security Validation Tests
// =============================================================================

describe('Bridge Security Tests', () => {
  test('clearBridgeValidationCache clears cached result', () => {
    clearBridgeValidationCache();
    assert.strictEqual(getBridgeValidationError(), null);
  });

  test('isNativeAvailable rejects non-object bridge', () => {
    clearBridgeValidationCache();
    global.window.PulseMobile = 'not an object';
    assert.strictEqual(isNativeAvailable(), false);
    assert.ok(getBridgeValidationError().includes('not a valid object'), 'Should report invalid object');
    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });

  test('isNativeAvailable rejects bridge without version', () => {
    clearBridgeValidationCache();
    global.window.PulseMobile = { platform: 'android' };
    assert.strictEqual(isNativeAvailable(), false);
    assert.ok(getBridgeValidationError().includes('missing version'), 'Should report missing version');
    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });

  test('isNativeAvailable rejects bridge with old version', () => {
    clearBridgeValidationCache();
    global.window.PulseMobile = {
      platform: 'android',
      version: '0.5.0',
      isNative: true
    };
    assert.strictEqual(isNativeAvailable(), false);
    assert.ok(getBridgeValidationError().includes('below minimum'), 'Should report version too low');
    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });

  test('isNativeAvailable rejects bridge with invalid platform', () => {
    clearBridgeValidationCache();
    global.window.PulseMobile = {
      platform: 'windows',
      version: '1.0.0',
      isNative: true
    };
    assert.strictEqual(isNativeAvailable(), false);
    assert.ok(getBridgeValidationError().includes('invalid platform'), 'Should report invalid platform');
    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });

  test('isNativeAvailable rejects bridge missing required API', () => {
    clearBridgeValidationCache();
    global.window.PulseMobile = {
      platform: 'android',
      version: '1.0.0',
      isNative: true,
      Storage: { getItem: () => {} } // Missing other methods
    };
    assert.strictEqual(isNativeAvailable(), false);
    assert.ok(getBridgeValidationError().includes('missing required'), 'Should report missing API');
    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });

  test('isNativeAvailable accepts valid bridge', () => {
    clearBridgeValidationCache();

    // Create a fully valid mock bridge
    global.window.PulseMobile = {
      platform: 'android',
      version: '1.0.0',
      isNative: true,
      isAndroid: true,
      Storage: {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
        keys: () => Promise.resolve([])
      },
      Device: {
        getInfo: () => Promise.resolve({}),
        getNetworkStatus: () => Promise.resolve({ connected: true, type: 'wifi' }),
        onNetworkChange: () => {}
      },
      UI: {
        showToast: () => Promise.resolve(),
        vibrate: () => Promise.resolve()
      },
      App: {
        onPause: () => {},
        onResume: () => {},
        onBackButton: () => {},
        minimize: () => Promise.resolve(),
        exit: () => Promise.resolve()
      },
      Clipboard: {
        copy: () => Promise.resolve(),
        read: () => Promise.resolve('')
      }
    };

    assert.strictEqual(isNativeAvailable(), true);
    assert.strictEqual(getBridgeValidationError(), null);

    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });

  test('isNativeAvailable caches validation result', () => {
    clearBridgeValidationCache();

    // Create a valid bridge
    global.window.PulseMobile = {
      platform: 'ios',
      version: '1.2.0',
      isNative: true,
      Storage: { getItem: () => {}, setItem: () => {}, removeItem: () => {}, keys: () => {} },
      Device: { getInfo: () => {}, getNetworkStatus: () => {}, onNetworkChange: () => {} },
      UI: { showToast: () => {}, vibrate: () => {} },
      App: { onPause: () => {}, onResume: () => {}, onBackButton: () => {}, minimize: () => {} },
      Clipboard: { copy: () => {}, read: () => {} }
    };

    // First call validates and caches true
    assert.strictEqual(isNativeAvailable(), true);

    // Second call uses cached result (no re-validation)
    assert.strictEqual(isNativeAvailable(), true);

    // Modify bridge to be invalid - but cache should still return true
    global.window.PulseMobile.platform = 'invalid';
    assert.strictEqual(isNativeAvailable(), true);

    // Clear cache - now re-validates and should fail
    clearBridgeValidationCache();
    assert.strictEqual(isNativeAvailable(), false);

    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });

  test('isNativeAvailable validates signature structure if present', () => {
    clearBridgeValidationCache();

    global.window.PulseMobile = {
      platform: 'android',
      version: '1.0.0',
      isNative: true,
      Storage: { getItem: () => {}, setItem: () => {}, removeItem: () => {}, keys: () => {} },
      Device: { getInfo: () => {}, getNetworkStatus: () => {}, onNetworkChange: () => {} },
      UI: { showToast: () => {}, vibrate: () => {} },
      App: { onPause: () => {}, onResume: () => {}, onBackButton: () => {}, minimize: () => {} },
      Clipboard: { copy: () => {}, read: () => {} },
      // Invalid signature - missing required fields
      _signature: { timestamp: Date.now() }
    };

    assert.strictEqual(isNativeAvailable(), false);
    assert.ok(getBridgeValidationError().includes('signature verification failed'), 'Should report signature failure');

    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });

  test('isNativeAvailable accepts valid signature', () => {
    clearBridgeValidationCache();

    global.window.PulseMobile = {
      platform: 'android',
      version: '1.0.0',
      isNative: true,
      Storage: { getItem: () => {}, setItem: () => {}, removeItem: () => {}, keys: () => {} },
      Device: { getInfo: () => {}, getNetworkStatus: () => {}, onNetworkChange: () => {} },
      UI: { showToast: () => {}, vibrate: () => {} },
      App: { onPause: () => {}, onResume: () => {}, onBackButton: () => {}, minimize: () => {} },
      Clipboard: { copy: () => {}, read: () => {} },
      // Valid signature structure
      _signature: {
        timestamp: Date.now(),
        nonce: 'abc123',
        hash: 'a'.repeat(64) // 64 hex chars
      }
    };

    assert.strictEqual(isNativeAvailable(), true);
    assert.strictEqual(getBridgeValidationError(), null);

    delete global.window.PulseMobile;
    clearBridgeValidationCache();
  });
});

// =============================================================================
// createNativeStorage Tests (Web Fallback)
// =============================================================================

describe('createNativeStorage Tests', () => {
  test('createNativeStorage returns storage interface', () => {
    const storage = createNativeStorage('test_');

    assert.ok(typeof storage.get === 'function', 'Should have get method');
    assert.ok(typeof storage.remove === 'function', 'Should have remove method');
    assert.ok(typeof storage.clear === 'function', 'Should have clear method');
  });

  test('createNativeStorage.get returns pulse with default value', () => {
    mockStorage.clear();
    const storage = createNativeStorage('default_');
    const value = storage.get('theme', 'light');

    assert.ok(typeof value.get === 'function', 'Should return a pulse');
    assert.ok(typeof value.set === 'function', 'Should have set method');
    assert.strictEqual(value.get(), 'light', 'Should have default value');
  });

  test('createNativeStorage.get returns cached pulse for same key', () => {
    mockStorage.clear();
    const storage = createNativeStorage('cache_');

    const p1 = storage.get('key', 'default1');
    const p2 = storage.get('key', 'default2');

    assert.ok(p1 === p2, 'Should return same pulse instance for same key');
    assert.strictEqual(p1.get(), 'default1', 'Should keep first default value');
  });

  test('createNativeStorage uses prefix for keys', () => {
    mockStorage.clear();
    mockStorage.storage.setItem('prefix_mykey', JSON.stringify('stored-value'));

    const storage = createNativeStorage('prefix_');
    const value = storage.get('mykey', 'default');

    // Note: Loading happens asynchronously, so we test the mechanism
    assert.ok(typeof value.get === 'function', 'Should return a pulse');
  });

  test('createNativeStorage.get loads from localStorage', async () => {
    mockStorage.clear();
    mockStorage.storage.setItem('load_theme', JSON.stringify('dark'));

    const storage = createNativeStorage('load_');
    const theme = storage.get('theme', 'light');

    // Wait for async localStorage read
    await sleep(50);

    assert.strictEqual(theme.get(), 'dark', 'Should load value from localStorage');
  });

  test('createNativeStorage.get handles non-JSON values gracefully', async () => {
    mockStorage.clear();
    mockStorage.storage.setItem('json_raw', 'not-json-string');

    const storage = createNativeStorage('json_');
    const value = storage.get('raw', 'default');

    // Wait for async read
    await sleep(50);

    // Should fall back to raw string when JSON parse fails
    assert.strictEqual(value.get(), 'not-json-string', 'Should use raw value when JSON parse fails');
  });

  test('createNativeStorage.get persists changes to localStorage', async () => {
    mockStorage.clear();
    const storage = createNativeStorage('persist_');
    const theme = storage.get('theme', 'light');

    // Wait for initial effect setup
    await sleep(50);

    // Change value
    theme.set('dark');

    // Wait for effect to persist
    await sleep(50);

    assert.strictEqual(
      mockStorage.storage.getItem('persist_theme'),
      JSON.stringify('dark'),
      'Should persist to localStorage'
    );
  });

  test('createNativeStorage.remove deletes from localStorage', async () => {
    mockStorage.clear();
    mockStorage.storage.setItem('remove_theme', JSON.stringify('dark'));

    const storage = createNativeStorage('remove_');

    await storage.remove('theme');

    assert.strictEqual(
      mockStorage.storage.getItem('remove_theme'),
      null,
      'Should remove from localStorage'
    );
  });

  test('createNativeStorage.clear removes all prefixed items', async () => {
    mockStorage.clear();
    mockStorage.storage.setItem('clear_theme', 'dark');
    mockStorage.storage.setItem('clear_user', 'john');
    mockStorage.storage.setItem('other_key', 'value');

    const storage = createNativeStorage('clear_');

    await storage.clear();

    assert.strictEqual(mockStorage.storage.getItem('clear_theme'), null, 'Should remove clear_theme');
    assert.strictEqual(mockStorage.storage.getItem('clear_user'), null, 'Should remove clear_user');
    assert.strictEqual(mockStorage.storage.getItem('other_key'), 'value', 'Should not remove unprefixed items');
  });
});

// =============================================================================
// createDeviceInfo Tests (Web Fallback)
// =============================================================================

describe('createDeviceInfo Tests', () => {
  test('createDeviceInfo returns device info interface', () => {
    const device = createDeviceInfo();

    assert.ok(device.info !== undefined, 'Should have info pulse');
    assert.ok(device.network !== undefined, 'Should have network pulse');
    assert.ok(typeof device.platform === 'string', 'Should have platform getter');
    assert.ok(typeof device.isNative === 'boolean', 'Should have isNative getter');
    // isOnline depends on network.connected which may be undefined without navigator
    assert.ok('isOnline' in device, 'Should have isOnline getter');
  });

  test('createDeviceInfo.platform returns web', () => {
    const device = createDeviceInfo();
    assert.strictEqual(device.platform, 'web');
  });

  test('createDeviceInfo.isNative returns false on web', () => {
    const device = createDeviceInfo();
    assert.strictEqual(device.isNative, false);
  });

  test('createDeviceInfo.info has web fallback values', () => {
    const device = createDeviceInfo();
    const info = device.info.get();

    assert.strictEqual(info.platform, 'web');
    assert.ok(typeof info.userAgent === 'string', 'Should have userAgent');
    assert.ok(typeof info.language === 'string', 'Should have language');
  });

  test('createDeviceInfo.network has initial state', () => {
    const device = createDeviceInfo();
    const network = device.network.get();

    // Network state may vary depending on navigator availability
    assert.ok(network !== null, 'Should have network state object');
    assert.ok('connected' in network, 'Should have connected property');
    assert.ok('type' in network, 'Should have type property');
  });
});

// =============================================================================
// NativeUI Tests (Web Fallback)
// =============================================================================

describe('NativeUI Tests', () => {
  test('NativeUI.toast resolves on web', async () => {
    await NativeUI.toast('Hello!');
    // Should resolve without error on web
    assert.ok(true, 'Toast should not throw on web');
  });

  test('NativeUI.toast with isLong parameter resolves', async () => {
    await NativeUI.toast('Long message', true);
    assert.ok(true, 'Toast with isLong should not throw');
  });

  test('NativeUI.vibrate resolves on web', async () => {
    await NativeUI.vibrate(100);
    assert.ok(true, 'Vibrate should not throw on web');
  });

  test('NativeUI.vibrate with default duration resolves', async () => {
    await NativeUI.vibrate();
    assert.ok(true, 'Vibrate with default duration should not throw');
  });
});

// =============================================================================
// NativeClipboard Tests (Web Fallback)
// =============================================================================

describe('NativeClipboard Tests', () => {
  test('NativeClipboard.copy handles missing clipboard API', async () => {
    // On Node.js, navigator.clipboard may not exist
    try {
      await NativeClipboard.copy('test text');
      // If it doesn't throw, that's fine
      assert.ok(true, 'Copy should handle missing API');
    } catch (e) {
      // Expected to fail without clipboard API
      assert.strictEqual(e.message, 'Clipboard not available', 'Should throw appropriate error');
    }
  });

  test('NativeClipboard.read handles missing clipboard API', async () => {
    const text = await NativeClipboard.read();
    // Should return empty string when clipboard not available
    assert.strictEqual(text, '', 'Should return empty string when clipboard unavailable');
  });
});

// =============================================================================
// App Lifecycle Tests
// =============================================================================

describe('App Lifecycle Tests', () => {
  test('onAppPause registers handler without error', () => {
    onAppPause(() => {});
    assert.ok(true, 'Should register pause handler');
  });

  test('onAppResume registers handler without error', () => {
    onAppResume(() => {});
    assert.ok(true, 'Should register resume handler');
  });

  test('onBackButton registers handler (no-op on web)', () => {
    let called = false;
    onBackButton(() => { called = true; });
    // On web, this is a no-op
    assert.strictEqual(called, false, 'Should not trigger on web');
  });

  test('onNativeReady can be called on web', () => {
    onNativeReady(() => {});
    // On web without PulseMobile, callback won't be called immediately
    assert.ok(true, 'Should not throw');
  });
});

// =============================================================================
// App Control Tests
// =============================================================================

describe('App Control Tests', () => {
  test('exitApp resolves on web (no-op)', async () => {
    await exitApp();
    assert.ok(true, 'exitApp should not throw on web');
  });

  test('minimizeApp resolves on web (no-op)', async () => {
    await minimizeApp();
    assert.ok(true, 'minimizeApp should not throw on web');
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('Internal Helper Tests', () => {
  test('Storage handles complex objects', () => {
    mockStorage.clear();
    mockStorage.storage.setItem('obj_data', JSON.stringify({ nested: { value: 42 } }));

    const storage = createNativeStorage('obj_');
    const data = storage.get('data', null);

    // Verify it returns a pulse
    assert.ok(typeof data.get === 'function', 'Should return pulse for complex objects');
  });

  test('Storage handles arrays', () => {
    mockStorage.clear();
    mockStorage.storage.setItem('arr_items', JSON.stringify([1, 2, 3]));

    const storage = createNativeStorage('arr_');
    const items = storage.get('items', []);

    assert.ok(typeof items.get === 'function', 'Should return pulse for arrays');
  });

  test('Multiple storage instances are independent', () => {
    mockStorage.clear();
    const storage1 = createNativeStorage('s1_');
    const storage2 = createNativeStorage('s2_');

    const v1 = storage1.get('key', 'value1');
    const v2 = storage2.get('key', 'value2');

    assert.strictEqual(v1.get(), 'value1', 'Storage 1 should have its value');
    assert.strictEqual(v2.get(), 'value2', 'Storage 2 should have its value');
  });
});
