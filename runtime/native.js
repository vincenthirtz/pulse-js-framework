/**
 * Pulse Native Runtime Module
 * Reactive wrappers for native mobile APIs
 * Integrates with Pulse reactivity system
 */

import { pulse, effect, batch } from './pulse.js';
import { loggers } from './logger.js';

const log = loggers.native;

// ============================================================================
// Internal Helpers - Reduce code duplication
// ============================================================================

/**
 * Safely parse JSON, returning the original value if parsing fails
 * @param {string} value - Value to parse
 * @returns {*} Parsed value or original string
 */
function _tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Execute a storage operation with native/localStorage fallback
 * @param {Object} options - Operation options
 * @param {Function} options.native - Native storage operation (async)
 * @param {Function} options.web - localStorage fallback operation
 * @returns {Promise<*>} Operation result
 */
async function _withStorageFallback({ native, web }) {
  if (isNativeAvailable()) {
    return native(getNative().Storage);
  }
  if (typeof localStorage !== 'undefined') {
    return web(localStorage);
  }
  return null;
}

/**
 * Execute a storage operation synchronously with native/localStorage fallback
 * @param {Object} options - Operation options
 * @param {Function} options.native - Native storage operation
 * @param {Function} options.web - localStorage fallback operation
 */
function _withStorageFallbackSync({ native, web }) {
  if (isNativeAvailable()) {
    native(getNative().Storage);
  } else if (typeof localStorage !== 'undefined') {
    web(localStorage);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Check if PulseMobile bridge is available
 */
export function isNativeAvailable() {
  return typeof window !== 'undefined' && typeof window.PulseMobile !== 'undefined';
}

/**
 * Get the PulseMobile instance
 */
export function getNative() {
  if (!isNativeAvailable()) {
    throw new Error(
      '[Pulse Native] PulseMobile bridge is not available. ' +
      'This API only works in a Pulse native mobile app. ' +
      'For web, use isNativeAvailable() to check before calling native APIs, ' +
      'or use getPlatform() to detect the current environment.'
    );
  }
  return window.PulseMobile;
}

/**
 * Get current platform
 */
export function getPlatform() {
  if (!isNativeAvailable()) return 'web';
  return getNative().platform;
}

/**
 * Check if running in native environment
 */
export function isNative() {
  return isNativeAvailable() && getNative().isNative;
}

/**
 * Create reactive native storage
 * Syncs between native storage and Pulse reactivity
 */
export function createNativeStorage(prefix = '') {
  const cache = new Map();

  return {
    /**
     * Get a reactive value from native storage
     * Returns a Pulse signal that auto-persists
     */
    get(key, defaultValue = null) {
      const fullKey = prefix + key;

      if (cache.has(fullKey)) {
        return cache.get(fullKey);
      }

      const p = pulse(defaultValue);
      cache.set(fullKey, p);

      // Load initial value from storage
      _withStorageFallback({
        native: async (storage) => {
          const value = await storage.getItem(fullKey);
          if (value !== null) {
            p.set(_tryParseJson(value));
          }
        },
        web: (storage) => {
          const value = storage.getItem(fullKey);
          if (value !== null) {
            p.set(_tryParseJson(value));
          }
        }
      });

      // Auto-persist on changes
      let initialized = false;
      effect(() => {
        const value = p.get();
        // Skip first effect run (initial load)
        if (!initialized) {
          initialized = true;
          return;
        }
        const serialized = JSON.stringify(value);
        _withStorageFallbackSync({
          native: (storage) => storage.setItem(fullKey, serialized),
          web: (storage) => storage.setItem(fullKey, serialized)
        });
      });

      return p;
    },

    /**
     * Remove a value from storage
     */
    async remove(key) {
      const fullKey = prefix + key;
      cache.delete(fullKey);
      await _withStorageFallback({
        native: (storage) => storage.removeItem(fullKey),
        web: (storage) => storage.removeItem(fullKey)
      });
    },

    /**
     * Clear all storage with prefix
     */
    async clear() {
      cache.clear();
      await _withStorageFallback({
        native: async (storage) => {
          const keys = await storage.keys();
          for (const key of keys) {
            if (key.startsWith(prefix)) {
              await storage.removeItem(key);
            }
          }
        },
        web: (storage) => {
          const keysToRemove = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          for (const key of keysToRemove) {
            storage.removeItem(key);
          }
        }
      });
    }
  };
}

/**
 * Create reactive device info
 */
export function createDeviceInfo() {
  const info = pulse(null);
  const network = pulse({ connected: true, type: 'unknown' });

  // Load device info
  if (isNativeAvailable()) {
    getNative().Device.getInfo().then(data => {
      info.set(data);
    });

    getNative().Device.getNetworkStatus().then(status => {
      network.set(status);
    });

    // Listen for network changes
    getNative().Device.onNetworkChange(status => {
      network.set(status);
    });
  } else {
    // Web fallback
    info.set({
      platform: 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      language: typeof navigator !== 'undefined' ? navigator.language : 'en'
    });

    if (typeof navigator !== 'undefined') {
      network.set({
        connected: navigator.onLine,
        type: 'unknown'
      });

      window.addEventListener('online', () => {
        network.set({ connected: true, type: 'unknown' });
      });

      window.addEventListener('offline', () => {
        network.set({ connected: false, type: 'none' });
      });
    }
  }

  return {
    /** Device info as reactive Pulse */
    info,

    /** Network status as reactive Pulse */
    network,

    /** Current platform */
    get platform() {
      return getPlatform();
    },

    /** Is running in native app */
    get isNative() {
      return isNative();
    },

    /** Is currently online */
    get isOnline() {
      return network.get().connected;
    }
  };
}

/**
 * Native UI helpers
 */
export const NativeUI = {
  /**
   * Show a toast message
   */
  toast(message, isLong = false) {
    if (isNativeAvailable()) {
      return getNative().UI.showToast(message, isLong);
    }
    // Fallback: log toast message
    log.info('Toast:', message);
    return Promise.resolve();
  },

  /**
   * Trigger haptic feedback / vibration
   */
  vibrate(duration = 100) {
    if (isNativeAvailable()) {
      return getNative().UI.vibrate(duration);
    }
    // Web fallback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(duration);
    }
    return Promise.resolve();
  }
};

/**
 * Native clipboard helpers
 */
export const NativeClipboard = {
  /**
   * Copy text to clipboard
   */
  async copy(text) {
    if (isNativeAvailable()) {
      return getNative().Clipboard.copy(text);
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('Clipboard not available'));
  },

  /**
   * Read text from clipboard
   */
  async read() {
    if (isNativeAvailable()) {
      return getNative().Clipboard.read();
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      return navigator.clipboard.readText();
    }
    return '';
  }
};

/**
 * App lifecycle - pause handler
 */
export function onAppPause(callback) {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) callback();
    });
  }
  if (isNativeAvailable()) {
    getNative().App.onPause(callback);
  }
}

/**
 * App lifecycle - resume handler
 */
export function onAppResume(callback) {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) callback();
    });
  }
  if (isNativeAvailable()) {
    getNative().App.onResume(callback);
  }
}

/**
 * Handle Android back button
 */
export function onBackButton(callback) {
  if (isNativeAvailable()) {
    getNative().App.onBackButton(callback);
  }
}

/**
 * Wait for native bridge to be ready
 */
export function onNativeReady(callback) {
  if (typeof window === 'undefined') return;

  window.addEventListener('pulse:ready', (e) => {
    callback(e.detail);
  });

  // If already ready (web or native initialized)
  if (typeof window.PulseMobile !== 'undefined') {
    const platform = window.PulseMobile.platform;
    setTimeout(() => callback({ platform }), 0);
  }
}

/**
 * Exit the app (Android only)
 */
export function exitApp() {
  if (isNativeAvailable() && getNative().isAndroid) {
    return getNative().App.exit();
  }
  log.warn('exitApp is only available on Android');
  return Promise.resolve();
}

/**
 * Minimize the app
 */
export function minimizeApp() {
  if (isNativeAvailable()) {
    return getNative().App.minimize();
  }
  log.warn('minimizeApp is only available in native apps');
  return Promise.resolve();
}

export default {
  isNativeAvailable,
  getNative,
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
};
