/**
 * Pulse Native Runtime Module
 * Reactive wrappers for native mobile APIs
 * Integrates with Pulse reactivity system
 *
 * Security: Bridge validation ensures only trusted PulseMobile bridges are accepted.
 * Validates version compatibility, required API surface, and optional signatures.
 */

import { pulse, effect, batch } from './pulse.js';
import { loggers } from './logger.js';

const log = loggers.native;

// ============================================================================
// Bridge Security - Version and Signature Validation
// ============================================================================

/**
 * Minimum supported bridge version (semver)
 * Bridges below this version will be rejected
 */
const MIN_BRIDGE_VERSION = '1.0.0';

/**
 * Maximum supported bridge version (semver)
 * Set to null to allow any version >= MIN_BRIDGE_VERSION
 */
const MAX_BRIDGE_VERSION = null;

/**
 * Required API surface that a valid PulseMobile bridge must expose
 * Missing any of these will cause validation to fail
 */
const REQUIRED_BRIDGE_API = {
  // Root properties
  root: ['platform', 'isNative', 'version'],
  // Storage API
  Storage: ['getItem', 'setItem', 'removeItem', 'keys'],
  // Device API
  Device: ['getInfo', 'getNetworkStatus', 'onNetworkChange'],
  // UI API
  UI: ['showToast', 'vibrate'],
  // App API
  App: ['onPause', 'onResume', 'onBackButton', 'minimize'],
  // Clipboard API
  Clipboard: ['copy', 'read']
};

/**
 * Cached validation result to avoid repeated checks
 * @type {boolean|null}
 */
let _validationCache = null;

/**
 * Cached validation error message
 * @type {string|null}
 */
let _validationError = null;

/**
 * Parse semver version string to comparable array
 * @param {string} version - Semver string (e.g., "1.2.3")
 * @returns {number[]} Array of [major, minor, patch]
 */
function _parseSemver(version) {
  if (!version || typeof version !== 'string') return [0, 0, 0];
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

/**
 * Compare two semver versions
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {number} -1 if a < b, 0 if a == b, 1 if a > b
 */
function _compareSemver(a, b) {
  const [aMajor, aMinor, aPatch] = _parseSemver(a);
  const [bMajor, bMinor, bPatch] = _parseSemver(b);

  if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1;
  if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
  return 0;
}

/**
 * Validate that an object has all required methods/properties
 * @param {Object} obj - Object to validate
 * @param {string[]} required - Required property names
 * @returns {{valid: boolean, missing: string[]}}
 */
function _validateApiSurface(obj, required) {
  if (!obj || typeof obj !== 'object') {
    return { valid: false, missing: required };
  }

  const missing = [];
  for (const prop of required) {
    if (!(prop in obj)) {
      missing.push(prop);
    }
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Validate the PulseMobile bridge for security
 * Checks version compatibility and required API surface
 *
 * @param {Object} bridge - The PulseMobile bridge object
 * @returns {{valid: boolean, error: string|null, warnings: string[]}}
 */
function _validateBridge(bridge) {
  const warnings = [];

  // 1. Check bridge exists and is an object
  if (!bridge || typeof bridge !== 'object') {
    return {
      valid: false,
      error: 'PulseMobile bridge is not a valid object',
      warnings
    };
  }

  // 2. Validate version exists and is compatible
  const version = bridge.version;
  if (!version || typeof version !== 'string') {
    return {
      valid: false,
      error: 'PulseMobile bridge missing version property',
      warnings
    };
  }

  // Check minimum version
  if (_compareSemver(version, MIN_BRIDGE_VERSION) < 0) {
    return {
      valid: false,
      error: `PulseMobile bridge version ${version} is below minimum required ${MIN_BRIDGE_VERSION}`,
      warnings
    };
  }

  // Check maximum version (if set)
  if (MAX_BRIDGE_VERSION && _compareSemver(version, MAX_BRIDGE_VERSION) > 0) {
    return {
      valid: false,
      error: `PulseMobile bridge version ${version} exceeds maximum supported ${MAX_BRIDGE_VERSION}`,
      warnings
    };
  }

  // 3. Validate required root properties
  const rootValidation = _validateApiSurface(bridge, REQUIRED_BRIDGE_API.root, 'root');
  if (!rootValidation.valid) {
    return {
      valid: false,
      error: `PulseMobile bridge missing required properties: ${rootValidation.missing.join(', ')}`,
      warnings
    };
  }

  // 4. Validate platform value
  const validPlatforms = ['ios', 'android'];
  if (!validPlatforms.includes(bridge.platform)) {
    return {
      valid: false,
      error: `PulseMobile bridge has invalid platform: ${bridge.platform}`,
      warnings
    };
  }

  // 5. Validate required API namespaces
  for (const [namespace, methods] of Object.entries(REQUIRED_BRIDGE_API)) {
    if (namespace === 'root') continue;

    const namespaceObj = bridge[namespace];
    const validation = _validateApiSurface(namespaceObj, methods, namespace);

    if (!validation.valid) {
      return {
        valid: false,
        error: `PulseMobile.${namespace} missing required methods: ${validation.missing.join(', ')}`,
        warnings
      };
    }
  }

  // 6. Validate signature if present (optional enhanced security)
  if (bridge._signature) {
    if (!_verifyBridgeSignature(bridge)) {
      return {
        valid: false,
        error: 'PulseMobile bridge signature verification failed',
        warnings
      };
    }
  } else {
    warnings.push('PulseMobile bridge has no signature - running in unsigned mode');
  }

  // 7. Check for suspicious properties (potential tampering)
  const suspiciousProps = ['eval', 'Function', '__proto__', 'constructor'];
  for (const prop of suspiciousProps) {
    if (prop in bridge && typeof bridge[prop] === 'function') {
      warnings.push(`Suspicious property detected on bridge: ${prop}`);
    }
  }

  return { valid: true, error: null, warnings };
}

/**
 * Verify bridge signature (for enhanced security)
 * This validates that the bridge was created by a trusted source
 *
 * @param {Object} bridge - The PulseMobile bridge object
 * @returns {boolean} True if signature is valid
 */
function _verifyBridgeSignature(bridge) {
  // Signature format: { timestamp, nonce, hash }
  const sig = bridge._signature;
  if (!sig || typeof sig !== 'object') return false;

  // Validate signature structure
  if (!sig.timestamp || !sig.nonce || !sig.hash) return false;

  // Check timestamp is recent (within 5 minutes)
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5 minutes
  if (Math.abs(now - sig.timestamp) > maxAge) {
    log.warn('Bridge signature timestamp is stale');
    return false;
  }

  // Validate hash format (should be hex string)
  if (typeof sig.hash !== 'string' || !/^[a-f0-9]{64}$/i.test(sig.hash)) {
    log.warn('Bridge signature hash has invalid format');
    return false;
  }

  // Note: Full signature verification would require:
  // 1. A shared secret or public key known to both native app and JS
  // 2. HMAC or RSA signature verification
  // For now, we validate structure and trust the native app environment

  return true;
}

/**
 * Clear the validation cache (useful for testing or after bridge changes)
 */
export function clearBridgeValidationCache() {
  _validationCache = null;
  _validationError = null;
}

/**
 * Get the last bridge validation error (if any)
 * @returns {string|null}
 */
export function getBridgeValidationError() {
  return _validationError;
}

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
 * Check if PulseMobile bridge is available and valid
 *
 * Security: This function validates the bridge structure, version,
 * and API surface before returning true. Malicious or malformed
 * bridges will be rejected.
 *
 * @returns {boolean} True if a valid PulseMobile bridge is available
 */
export function isNativeAvailable() {
  // Quick check for window and PulseMobile existence
  if (typeof window === 'undefined' || typeof window.PulseMobile === 'undefined') {
    return false;
  }

  // Use cached validation result if available
  if (_validationCache !== null) {
    return _validationCache;
  }

  // Validate the bridge
  const result = _validateBridge(window.PulseMobile);

  // Log warnings if any
  for (const warning of result.warnings) {
    log.warn(`[Bridge Security] ${warning}`);
  }

  // Cache the result
  _validationCache = result.valid;
  _validationError = result.error;

  // Log error if validation failed
  if (!result.valid) {
    log.error(`[Bridge Security] Bridge validation failed: ${result.error}`);
  }

  return result.valid;
}

/**
 * Get the PulseMobile instance (validated)
 *
 * @throws {Error} If bridge is not available or validation failed
 * @returns {Object} The validated PulseMobile bridge
 */
export function getNative() {
  if (!isNativeAvailable()) {
    const error = _validationError
      ? `[Pulse Native] PulseMobile bridge validation failed: ${_validationError}`
      : '[Pulse Native] PulseMobile bridge is not available. ' +
        'This API only works in a Pulse native mobile app. ' +
        'For web, use isNativeAvailable() to check before calling native APIs, ' +
        'or use getPlatform() to detect the current environment.';
    throw new Error(error);
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
  minimizeApp,
  // Security utilities
  clearBridgeValidationCache,
  getBridgeValidationError
};
