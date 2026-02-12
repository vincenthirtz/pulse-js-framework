/**
 * Pulse Service Worker Module (Main Thread)
 * Registration helper with reactive lifecycle state and update notifications.
 *
 * @module pulse-js-framework/runtime/sw
 */

import { pulse, effect, onCleanup } from './pulse.js';
import { loggers } from './logger.js';
import { RuntimeError } from './errors.js';

const log = loggers.pulse;

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS = {
  scope: '/',
  updateInterval: 0,
  immediate: true,
  onUpdate: null,
  onActivate: null,
  onError: null,
};

// =============================================================================
// HELPERS
// =============================================================================

function _isSWSupported() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

// =============================================================================
// registerServiceWorker()
// =============================================================================

/**
 * Register a service worker with lifecycle monitoring
 *
 * @param {string} url - Path to the service worker file
 * @param {Object} [options] - Configuration options
 * @returns {Object} { update, unregister, registration }
 */
export function registerServiceWorker(url, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  let registration = null;
  let updateTimer = null;

  if (!_isSWSupported()) {
    log.warn('Service Workers not supported in this environment');
    return {
      update: () => Promise.resolve(null),
      unregister: () => Promise.resolve(false),
      registration: null,
    };
  }

  async function _register() {
    try {
      registration = await navigator.serviceWorker.register(url, {
        scope: config.scope,
      });

      log.info(`Service worker registered: ${url}`);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              config.onActivate?.(registration);
            }
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              config.onUpdate?.(registration);
            }
          });
        }
      });

      // Set up periodic update checks
      if (config.updateInterval > 0) {
        updateTimer = setInterval(() => {
          registration?.update().catch(e => {
            log.warn('SW update check failed:', e.message);
          });
        }, config.updateInterval);
      }

      return registration;
    } catch (e) {
      log.error('SW registration failed:', e.message);
      config.onError?.(e);
      return null;
    }
  }

  if (config.immediate) {
    _register();
  }

  return {
    async update() {
      if (registration) {
        return registration.update();
      }
      return null;
    },

    async unregister() {
      if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
      }
      if (registration) {
        const result = await registration.unregister();
        log.info('Service worker unregistered');
        return result;
      }
      return false;
    },

    get registration() { return registration; },
  };
}

// =============================================================================
// useServiceWorker()
// =============================================================================

/**
 * Reactive service worker hook for UI integration
 *
 * @param {string} url - Path to the service worker file
 * @param {Object} [options] - Configuration options
 * @returns {Object} Reactive SW state and control methods
 */
export function useServiceWorker(url, options = {}) {
  const supported = _isSWSupported();

  const registered = pulse(false);
  const installing = pulse(false);
  const waiting = pulse(false);
  const active = pulse(false);
  const updateAvailable = pulse(false);
  const error = pulse(null);

  let swRegistration = null;

  if (!supported) {
    return {
      supported,
      registered,
      installing,
      waiting,
      active,
      updateAvailable,
      error,
      update: () => Promise.resolve(null),
      skipWaiting: () => Promise.resolve(),
      unregister: () => Promise.resolve(false),
    };
  }

  function _updateState(reg) {
    if (!reg) return;
    installing.set(!!reg.installing);
    waiting.set(!!reg.waiting);
    active.set(!!reg.active);
  }

  const sw = registerServiceWorker(url, {
    ...options,
    onUpdate: (reg) => {
      updateAvailable.set(true);
      _updateState(reg);
      options.onUpdate?.(reg);
    },
    onActivate: (reg) => {
      _updateState(reg);
      options.onActivate?.(reg);
    },
    onError: (err) => {
      error.set(err);
      options.onError?.(err);
    },
  });

  // Monitor registration state
  if (supported) {
    navigator.serviceWorker.ready.then(reg => {
      swRegistration = reg;
      registered.set(true);
      _updateState(reg);
    }).catch(e => {
      error.set(e);
    });
  }

  async function update() {
    return sw.update();
  }

  async function skipWaiting() {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  async function unregister() {
    const result = await sw.unregister();
    registered.set(false);
    active.set(false);
    installing.set(false);
    waiting.set(false);
    updateAvailable.set(false);
    return result;
  }

  onCleanup(() => {
    // Don't unregister on cleanup — just stop monitoring
  });

  return {
    supported,
    registered,
    installing,
    waiting,
    active,
    updateAvailable,
    error,

    update,
    skipWaiting,
    unregister,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  registerServiceWorker,
  useServiceWorker,
};
