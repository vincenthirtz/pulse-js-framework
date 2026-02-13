/**
 * Native Module Coverage Boost Tests
 * Additional tests to cover native.js native-specific code paths
 * Target: Increase native.js coverage from 87.25% to 95%+
 *
 * Uncovered lines: 652-653, 661-662, 672, 677-679, 687-688, 698-699
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Mock Setup - Must run BEFORE module import
// =============================================================================

// Storage for callbacks registered by the bridge
const bridgeCallbacks = {
  onPause: [],
  onResume: [],
  onBackButton: []
};

// Create complete mock PulseMobile bridge
global.window = global.window || {};
global.window.PulseMobile = {
  version: '1.0.0',
  isNative: true,
  platform: 'android',
  isAndroid: true,
  isIOS: false,

  Storage: {
    getItem: async (key) => null,
    setItem: async (key, value) => {},
    removeItem: async (key) => {},
    keys: async () => [],
    clear: async () => {},
    getObject: async (key) => null,
    setObject: async (key, value) => {}
  },

  Device: {
    getInfo: async () => ({
      platform: 'android',
      userAgent: 'Test',
      language: 'en',
      online: true
    }),
    getNetworkStatus: async () => ({ connected: true, type: 'wifi' }),
    onNetworkChange: (callback) => {}
  },

  UI: {
    showToast: async (message, long) => {},
    vibrate: async (duration) => {}
  },

  App: {
    onPause: (callback) => bridgeCallbacks.onPause.push(callback),
    onResume: (callback) => bridgeCallbacks.onResume.push(callback),
    onBackButton: (callback) => bridgeCallbacks.onBackButton.push(callback),
    exit: async () => 'exited',
    minimize: async () => 'minimized'
  },

  Clipboard: {
    copy: async (text) => {},
    read: async () => 'test'
  }
};

// Mock document for lifecycle
global.document = global.document || {};
global.document.addEventListener = global.document.addEventListener || ((event, handler) => {
  // Store handlers for testing
  global.document._handlers = global.document._handlers || {};
  global.document._handlers[event] = global.document._handlers[event] || [];
  global.document._handlers[event].push(handler);
});
global.document.hidden = false;

// Mock window.addEventListener for pulse:ready event
global.window.addEventListener = global.window.addEventListener || ((event, handler) => {
  global.window._handlers = global.window._handlers || {};
  global.window._handlers[event] = global.window._handlers[event] || [];
  global.window._handlers[event].push(handler);
});

// Now import the module (after complete mock is set up)
const {
  isNativeAvailable,
  onAppResume,
  onBackButton,
  onNativeReady,
  exitApp,
  minimizeApp,
  clearBridgeValidationCache
} = await import('../runtime/native.js');

// Helper to trigger document visibility change
function triggerVisibilityChange() {
  const handlers = global.document._handlers?.visibilitychange || [];
  handlers.forEach(h => h());
}

// Helper to trigger pulse:ready event
function triggerPulseReady(detail) {
  const handlers = global.window._handlers?.['pulse:ready'] || [];
  handlers.forEach(h => h({ detail }));
}

beforeEach(() => {
  // Clear callback arrays
  bridgeCallbacks.onPause.length = 0;
  bridgeCallbacks.onResume.length = 0;
  bridgeCallbacks.onBackButton.length = 0;

  // Clear validation cache
  clearBridgeValidationCache();

  // Ensure bridge is valid
  assert.strictEqual(isNativeAvailable(), true, 'Bridge should be valid for native tests');
});

// ============================================================================
// onAppResume with Native Bridge (lines 651-653)
// ============================================================================

describe('onAppResume - Native Bridge', () => {
  test('calls native bridge onResume when available (lines 652-653)', () => {
    const callCounts = [];

    onAppResume(() => callCounts.push(1));

    // Verify native callback was registered
    assert.strictEqual(bridgeCallbacks.onResume.length, 1, 'Native onResume callback should be registered');

    // Trigger native resume
    bridgeCallbacks.onResume[0]();
    assert.strictEqual(callCounts.length, 1, 'Callback should be invoked');
  });

  test('registers both document and native handlers', () => {
    let docCalls = 0;
    let nativeCalls = 0;

    onAppResume(() => {
      if (global.document.hidden === false) docCalls++;
      nativeCalls++;
    });

    // Should register native callback
    assert.ok(bridgeCallbacks.onResume.length >= 1, 'Native handler registered');

    // Trigger document visibility change
    global.document.hidden = false;
    triggerVisibilityChange();

    // Trigger native resume
    const resumeCallbacks = bridgeCallbacks.onResume;
    resumeCallbacks.forEach(cb => cb());

    // At least native should have fired
    assert.ok(nativeCalls >= 1, 'Native callback should fire');
  });
});

// ============================================================================
// onBackButton with Native Bridge (lines 660-662)
// ============================================================================

describe('onBackButton - Native Bridge', () => {
  test('calls native bridge onBackButton when available (lines 661-662)', () => {
    const calls = [];

    onBackButton(() => calls.push(1));

    // Verify callback registered
    assert.strictEqual(bridgeCallbacks.onBackButton.length, 1, 'Native onBackButton should be registered');

    // Trigger
    bridgeCallbacks.onBackButton[0]();
    assert.strictEqual(calls.length, 1, 'Callback should fire');
  });

  test('multiple callbacks can be registered', () => {
    let count1 = 0, count2 = 0;

    onBackButton(() => count1++);
    onBackButton(() => count2++);

    assert.ok(bridgeCallbacks.onBackButton.length >= 2, 'Both callbacks registered');

    // Trigger all
    bridgeCallbacks.onBackButton.forEach(cb => cb());

    assert.strictEqual(count1, 1, 'First callback fired');
    assert.strictEqual(count2, 1, 'Second callback fired');
  });
});

// ============================================================================
// onNativeReady Event Callback (line 672)
// ============================================================================

describe('onNativeReady - Event Callback', () => {
  test('calls callback with event detail when pulse:ready fires (line 672)', () => {
    let receivedDetail = null;

    onNativeReady((detail) => {
      receivedDetail = detail;
    });

    // Dispatch pulse:ready event
    const eventDetail = { platform: 'ios', version: '2.0' };
    triggerPulseReady(eventDetail);

    assert.deepStrictEqual(receivedDetail, eventDetail, 'Should receive event detail');
  });

  test('receives platform info from event', () => {
    let platform = null;

    onNativeReady((detail) => {
      platform = detail.platform;
    });

    triggerPulseReady({ platform: 'android' });

    assert.strictEqual(platform, 'android', 'Should extract platform');
  });
});

// ============================================================================
// onNativeReady Immediate Callback (lines 676-679)
// ============================================================================

describe('onNativeReady - Immediate Callback', () => {
  test('calls callback immediately if PulseMobile exists (lines 677-679)', (t, done) => {
    // PulseMobile already exists in our setup

    onNativeReady((detail) => {
      assert.strictEqual(detail.platform, 'android', 'Should have platform from existing bridge');
      done();
    });

    // Callback fires async via setTimeout
  });

  test('provides correct platform when already initialized', (t, done) => {
    let callCount = 0;

    onNativeReady((detail) => {
      callCount++;
      if (callCount === 1) {
        // First call is immediate (setTimeout 0)
        assert.strictEqual(detail.platform, 'android', 'Should match bridge platform');
        done();
      }
    });
  });
});

// ============================================================================
// exitApp Android-specific (lines 686-688)
// ============================================================================

describe('exitApp - Android Native', () => {
  test('calls native exit on Android (lines 687-688)', async () => {
    // Our mock is android with exit method
    const result = await exitApp();
    assert.strictEqual(result, 'exited', 'Should return promise from native exit');
  });

  test('returns value from native App.exit()', async () => {
    const result = await exitApp();
    assert.strictEqual(result, 'exited', 'Should pass through native return value');
  });
});

// ============================================================================
// minimizeApp Native (lines 697-699)
// ============================================================================

describe('minimizeApp - Native', () => {
  test('calls native minimize when available (lines 698-699)', async () => {
    const result = await minimizeApp();
    assert.strictEqual(result, 'minimized', 'Should call native minimize');
  });

  test('returns promise from native App.minimize()', async () => {
    const result = await minimizeApp();
    assert.strictEqual(result, 'minimized', 'Should pass through return value');
  });
});

// ============================================================================
// Integration: Combined Native Features
// ============================================================================

describe('Native - Integration', () => {
  test('full native lifecycle with all callbacks', () => {
    let pauseCount = 0, resumeCount = 0, backCount = 0;

    // Register all lifecycle handlers
    onAppResume(() => resumeCount++);
    onBackButton(() => backCount++);

    // Verify all registered
    assert.ok(bridgeCallbacks.onResume.length >= 1, 'Resume registered');
    assert.ok(bridgeCallbacks.onBackButton.length >= 1, 'Back registered');

    // Trigger callbacks
    bridgeCallbacks.onResume.forEach(cb => cb());
    bridgeCallbacks.onBackButton.forEach(cb => cb());

    assert.strictEqual(resumeCount, 1, 'Resume fired');
    assert.strictEqual(backCount, 1, 'Back fired');
  });

  test('app control methods work in native environment', async () => {
    const exitResult = await exitApp();
    const minimizeResult = await minimizeApp();

    assert.strictEqual(exitResult, 'exited', 'Exit works');
    assert.strictEqual(minimizeResult, 'minimized', 'Minimize works');
  });
});
