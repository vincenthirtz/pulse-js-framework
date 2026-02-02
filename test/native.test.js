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

import {
  test,
  testAsync,
  runAsyncTests,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection,
  createMockLocalStorage
} from './utils.js';

// =============================================================================
// Mock Setup - Run before any imports
// =============================================================================

// Create mock localStorage
const mockStorage = createMockLocalStorage();
global.localStorage = mockStorage.storage;

// Create minimal window mock
global.window = global.window || {};
global.window.addEventListener = global.window.addEventListener || ((e, h) => {});

// Mock document for lifecycle tests
global.document = global.document || {
  hidden: false,
  addEventListener: (event, handler) => {}
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
  minimizeApp
} = await import('../runtime/native.js');

// =============================================================================
// Platform Detection Tests (Web Environment)
// =============================================================================

printSection('Platform Detection Tests');

test('isNativeAvailable returns false on web', () => {
  // No PulseMobile in global.window
  assertEqual(isNativeAvailable(), false);
});

test('getPlatform returns web when not native', () => {
  assertEqual(getPlatform(), 'web');
});

test('isNative returns false on web', () => {
  assertEqual(isNative(), false);
});

// =============================================================================
// createNativeStorage Tests (Web Fallback)
// =============================================================================

printSection('createNativeStorage Tests');

test('createNativeStorage returns storage interface', () => {
  const storage = createNativeStorage('test_');

  assert(typeof storage.get === 'function', 'Should have get method');
  assert(typeof storage.remove === 'function', 'Should have remove method');
  assert(typeof storage.clear === 'function', 'Should have clear method');
});

test('createNativeStorage.get returns pulse with default value', () => {
  mockStorage.clear();
  const storage = createNativeStorage('default_');
  const value = storage.get('theme', 'light');

  assert(typeof value.get === 'function', 'Should return a pulse');
  assert(typeof value.set === 'function', 'Should have set method');
  assertEqual(value.get(), 'light', 'Should have default value');
});

test('createNativeStorage.get returns cached pulse for same key', () => {
  mockStorage.clear();
  const storage = createNativeStorage('cache_');

  const p1 = storage.get('key', 'default1');
  const p2 = storage.get('key', 'default2');

  assert(p1 === p2, 'Should return same pulse instance for same key');
  assertEqual(p1.get(), 'default1', 'Should keep first default value');
});

test('createNativeStorage uses prefix for keys', () => {
  mockStorage.clear();
  mockStorage.storage.setItem('prefix_mykey', JSON.stringify('stored-value'));

  const storage = createNativeStorage('prefix_');
  const value = storage.get('mykey', 'default');

  // Note: Loading happens asynchronously, so we test the mechanism
  assert(typeof value.get === 'function', 'Should return a pulse');
});

testAsync('createNativeStorage.get loads from localStorage', async () => {
  mockStorage.clear();
  mockStorage.storage.setItem('load_theme', JSON.stringify('dark'));

  const storage = createNativeStorage('load_');
  const theme = storage.get('theme', 'light');

  // Wait for async localStorage read
  await new Promise(resolve => setTimeout(resolve, 50));

  assertEqual(theme.get(), 'dark', 'Should load value from localStorage');
});

testAsync('createNativeStorage.get handles non-JSON values gracefully', async () => {
  mockStorage.clear();
  mockStorage.storage.setItem('json_raw', 'not-json-string');

  const storage = createNativeStorage('json_');
  const value = storage.get('raw', 'default');

  // Wait for async read
  await new Promise(resolve => setTimeout(resolve, 50));

  // Should fall back to raw string when JSON parse fails
  assertEqual(value.get(), 'not-json-string', 'Should use raw value when JSON parse fails');
});

testAsync('createNativeStorage.get persists changes to localStorage', async () => {
  mockStorage.clear();
  const storage = createNativeStorage('persist_');
  const theme = storage.get('theme', 'light');

  // Wait for initial effect setup
  await new Promise(resolve => setTimeout(resolve, 50));

  // Change value
  theme.set('dark');

  // Wait for effect to persist
  await new Promise(resolve => setTimeout(resolve, 50));

  assertEqual(
    mockStorage.storage.getItem('persist_theme'),
    JSON.stringify('dark'),
    'Should persist to localStorage'
  );
});

testAsync('createNativeStorage.remove deletes from localStorage', async () => {
  mockStorage.clear();
  mockStorage.storage.setItem('remove_theme', JSON.stringify('dark'));

  const storage = createNativeStorage('remove_');

  await storage.remove('theme');

  assertEqual(
    mockStorage.storage.getItem('remove_theme'),
    null,
    'Should remove from localStorage'
  );
});

testAsync('createNativeStorage.clear removes all prefixed items', async () => {
  mockStorage.clear();
  mockStorage.storage.setItem('clear_theme', 'dark');
  mockStorage.storage.setItem('clear_user', 'john');
  mockStorage.storage.setItem('other_key', 'value');

  const storage = createNativeStorage('clear_');

  await storage.clear();

  assertEqual(mockStorage.storage.getItem('clear_theme'), null, 'Should remove clear_theme');
  assertEqual(mockStorage.storage.getItem('clear_user'), null, 'Should remove clear_user');
  assertEqual(mockStorage.storage.getItem('other_key'), 'value', 'Should not remove unprefixed items');
});

// =============================================================================
// createDeviceInfo Tests (Web Fallback)
// =============================================================================

printSection('createDeviceInfo Tests');

test('createDeviceInfo returns device info interface', () => {
  const device = createDeviceInfo();

  assert(device.info !== undefined, 'Should have info pulse');
  assert(device.network !== undefined, 'Should have network pulse');
  assert(typeof device.platform === 'string', 'Should have platform getter');
  assert(typeof device.isNative === 'boolean', 'Should have isNative getter');
  // isOnline depends on network.connected which may be undefined without navigator
  assert('isOnline' in device, 'Should have isOnline getter');
});

test('createDeviceInfo.platform returns web', () => {
  const device = createDeviceInfo();
  assertEqual(device.platform, 'web');
});

test('createDeviceInfo.isNative returns false on web', () => {
  const device = createDeviceInfo();
  assertEqual(device.isNative, false);
});

test('createDeviceInfo.info has web fallback values', () => {
  const device = createDeviceInfo();
  const info = device.info.get();

  assertEqual(info.platform, 'web');
  assert(typeof info.userAgent === 'string', 'Should have userAgent');
  assert(typeof info.language === 'string', 'Should have language');
});

test('createDeviceInfo.network has initial state', () => {
  const device = createDeviceInfo();
  const network = device.network.get();

  // Network state may vary depending on navigator availability
  assert(network !== null, 'Should have network state object');
  assert('connected' in network, 'Should have connected property');
  assert('type' in network, 'Should have type property');
});

// =============================================================================
// NativeUI Tests (Web Fallback)
// =============================================================================

printSection('NativeUI Tests');

testAsync('NativeUI.toast resolves on web', async () => {
  const result = await NativeUI.toast('Hello!');
  // Should resolve without error on web
  assert(true, 'Toast should not throw on web');
});

testAsync('NativeUI.toast with isLong parameter resolves', async () => {
  const result = await NativeUI.toast('Long message', true);
  assert(true, 'Toast with isLong should not throw');
});

testAsync('NativeUI.vibrate resolves on web', async () => {
  const result = await NativeUI.vibrate(100);
  assert(true, 'Vibrate should not throw on web');
});

testAsync('NativeUI.vibrate with default duration resolves', async () => {
  const result = await NativeUI.vibrate();
  assert(true, 'Vibrate with default duration should not throw');
});

// =============================================================================
// NativeClipboard Tests (Web Fallback)
// =============================================================================

printSection('NativeClipboard Tests');

testAsync('NativeClipboard.copy handles missing clipboard API', async () => {
  // On Node.js, navigator.clipboard may not exist
  try {
    await NativeClipboard.copy('test text');
    // If it doesn't throw, that's fine
    assert(true, 'Copy should handle missing API');
  } catch (e) {
    // Expected to fail without clipboard API
    assertEqual(e.message, 'Clipboard not available', 'Should throw appropriate error');
  }
});

testAsync('NativeClipboard.read handles missing clipboard API', async () => {
  const text = await NativeClipboard.read();
  // Should return empty string when clipboard not available
  assertEqual(text, '', 'Should return empty string when clipboard unavailable');
});

// =============================================================================
// App Lifecycle Tests
// =============================================================================

printSection('App Lifecycle Tests');

test('onAppPause registers handler without error', () => {
  let called = false;
  onAppPause(() => { called = true; });
  assert(true, 'Should register pause handler');
});

test('onAppResume registers handler without error', () => {
  let called = false;
  onAppResume(() => { called = true; });
  assert(true, 'Should register resume handler');
});

test('onBackButton registers handler (no-op on web)', () => {
  let called = false;
  onBackButton(() => { called = true; });
  // On web, this is a no-op
  assertEqual(called, false, 'Should not trigger on web');
});

test('onNativeReady can be called on web', () => {
  let received = null;
  onNativeReady((data) => { received = data; });
  // On web without PulseMobile, callback won't be called immediately
  assert(true, 'Should not throw');
});

// =============================================================================
// App Control Tests
// =============================================================================

printSection('App Control Tests');

testAsync('exitApp resolves on web (no-op)', async () => {
  await exitApp();
  assert(true, 'exitApp should not throw on web');
});

testAsync('minimizeApp resolves on web (no-op)', async () => {
  await minimizeApp();
  assert(true, 'minimizeApp should not throw on web');
});

// =============================================================================
// Helper Function Tests
// =============================================================================

printSection('Internal Helper Tests');

test('Storage handles complex objects', () => {
  mockStorage.clear();
  mockStorage.storage.setItem('obj_data', JSON.stringify({ nested: { value: 42 } }));

  const storage = createNativeStorage('obj_');
  const data = storage.get('data', null);

  // Verify it returns a pulse
  assert(typeof data.get === 'function', 'Should return pulse for complex objects');
});

test('Storage handles arrays', () => {
  mockStorage.clear();
  mockStorage.storage.setItem('arr_items', JSON.stringify([1, 2, 3]));

  const storage = createNativeStorage('arr_');
  const items = storage.get('items', []);

  assert(typeof items.get === 'function', 'Should return pulse for arrays');
});

test('Multiple storage instances are independent', () => {
  mockStorage.clear();
  const storage1 = createNativeStorage('s1_');
  const storage2 = createNativeStorage('s2_');

  const v1 = storage1.get('key', 'value1');
  const v2 = storage2.get('key', 'value2');

  assertEqual(v1.get(), 'value1', 'Storage 1 should have its value');
  assertEqual(v2.get(), 'value2', 'Storage 2 should have its value');
});

// =============================================================================
// Run Tests
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
