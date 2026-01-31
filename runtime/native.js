/**
 * Pulse Native Runtime Module
 * Reactive wrappers for native mobile APIs
 * Integrates with Pulse reactivity system
 */

import { pulse, effect, batch } from './pulse.js';
import { loggers } from './logger.js';

const log = loggers.native;

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
      if (isNativeAvailable()) {
        getNative().Storage.getItem(fullKey).then(value => {
          if (value !== null) {
            try {
              p.set(JSON.parse(value));
            } catch {
              p.set(value);
            }
          }
        });
      } else if (typeof localStorage !== 'undefined') {
        const value = localStorage.getItem(fullKey);
        if (value !== null) {
          try {
            p.set(JSON.parse(value));
          } catch {
            p.set(value);
          }
        }
      }

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
        if (isNativeAvailable()) {
          getNative().Storage.setItem(fullKey, serialized);
        } else if (typeof localStorage !== 'undefined') {
          localStorage.setItem(fullKey, serialized);
        }
      });

      return p;
    },

    /**
     * Remove a value from storage
     */
    async remove(key) {
      const fullKey = prefix + key;
      cache.delete(fullKey);
      if (isNativeAvailable()) {
        await getNative().Storage.removeItem(fullKey);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(fullKey);
      }
    },

    /**
     * Clear all storage with prefix
     */
    async clear() {
      cache.clear();
      if (isNativeAvailable()) {
        const keys = await getNative().Storage.keys();
        for (const key of keys) {
          if (key.startsWith(prefix)) {
            await getNative().Storage.removeItem(key);
          }
        }
      } else if (typeof localStorage !== 'undefined') {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      }
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
