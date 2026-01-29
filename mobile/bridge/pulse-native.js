/**
 * Pulse Native Bridge
 * Provides unified API for native mobile features
 * Zero dependencies - works on Android, iOS, and Web
 */

(function() {
  'use strict';

  // Detect platform
  const isAndroid = typeof window.PulseNative !== 'undefined';
  const isIOS = typeof window.webkit?.messageHandlers?.PulseNative !== 'undefined';
  const isNative = isAndroid || isIOS;

  // Callback registry for async operations (iOS)
  const callbacks = new Map();
  let callbackId = 0;

  /**
   * Generate unique callback ID
   */
  function generateCallbackId() {
    return `cb_${++callbackId}_${Date.now()}`;
  }

  /**
   * Global callback handler (called from native iOS)
   */
  window.__pulseNativeCallback = function(id, response) {
    const callback = callbacks.get(id);
    if (callback) {
      callbacks.delete(id);
      if (response.success) {
        callback.resolve(response.data);
      } else {
        callback.reject(new Error(response.error));
      }
    }
  };

  /**
   * Call native method (iOS)
   */
  function callNativeIOS(action, args) {
    return new Promise((resolve, reject) => {
      const id = generateCallbackId();
      callbacks.set(id, { resolve, reject });

      window.webkit.messageHandlers.PulseNative.postMessage({
        action,
        args,
        callbackId: id
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (callbacks.has(id)) {
          callbacks.delete(id);
          reject(new Error('Native call timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Call native method (Android - synchronous)
   */
  function callNativeAndroid(action, args) {
    return new Promise((resolve, reject) => {
      try {
        let result;

        switch (action) {
          // Storage
          case 'setItem':
            window.PulseNative.setItem(args.key, args.value);
            resolve();
            break;
          case 'getItem':
            result = window.PulseNative.getItem(args.key);
            resolve(result);
            break;
          case 'removeItem':
            window.PulseNative.removeItem(args.key);
            resolve();
            break;
          case 'clearStorage':
            window.PulseNative.clearStorage();
            resolve();
            break;
          case 'getAllKeys':
            result = window.PulseNative.getAllKeys();
            resolve(result ? result.split(',').filter(k => k) : []);
            break;

          // Device
          case 'getDeviceInfo':
            result = window.PulseNative.getDeviceInfo();
            resolve(JSON.parse(result));
            break;
          case 'getNetworkStatus':
            result = window.PulseNative.getNetworkStatus();
            resolve(JSON.parse(result));
            break;

          // UI
          case 'showToast':
            window.PulseNative.showToast(args.message, args.isLong || false);
            resolve();
            break;
          case 'vibrate':
            window.PulseNative.vibrate(args.duration || 100);
            resolve();
            break;

          // Clipboard
          case 'copyToClipboard':
            window.PulseNative.copyToClipboard(args.text);
            resolve();
            break;
          case 'getClipboardText':
            result = window.PulseNative.getClipboardText();
            resolve(result);
            break;

          // App Lifecycle
          case 'exitApp':
            window.PulseNative.exitApp();
            resolve();
            break;
          case 'minimizeApp':
            window.PulseNative.minimizeApp();
            resolve();
            break;

          default:
            reject(new Error(`Unknown action: ${action}`));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Call native method
   */
  function callNative(action, args = {}) {
    if (!isNative) {
      return Promise.reject(new Error('Not running in native environment'));
    }
    return isIOS ? callNativeIOS(action, args) : callNativeAndroid(action, args);
  }

  // =========================================================================
  // Public API
  // =========================================================================

  const PulseMobile = {
    /**
     * Platform detection
     */
    isNative,
    isAndroid,
    isIOS,

    get platform() {
      if (isAndroid) return 'android';
      if (isIOS) return 'ios';
      return 'web';
    },

    // =========================================================================
    // Storage API - Native key-value storage
    // =========================================================================
    Storage: {
      async setItem(key, value) {
        if (!isNative) {
          localStorage.setItem(key, value);
          return;
        }
        return callNative('setItem', { key, value: String(value) });
      },

      async getItem(key) {
        if (!isNative) {
          return localStorage.getItem(key);
        }
        return callNative('getItem', { key });
      },

      async removeItem(key) {
        if (!isNative) {
          localStorage.removeItem(key);
          return;
        }
        return callNative('removeItem', { key });
      },

      async clear() {
        if (!isNative) {
          localStorage.clear();
          return;
        }
        return callNative('clearStorage');
      },

      async keys() {
        if (!isNative) {
          return Object.keys(localStorage);
        }
        return callNative('getAllKeys');
      },

      async getObject(key) {
        const value = await this.getItem(key);
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      },

      async setObject(key, value) {
        return this.setItem(key, JSON.stringify(value));
      }
    },

    // =========================================================================
    // Device API - Device information
    // =========================================================================
    Device: {
      async getInfo() {
        if (!isNative) {
          return {
            platform: 'web',
            userAgent: navigator.userAgent,
            language: navigator.language,
            online: navigator.onLine
          };
        }
        return callNative('getDeviceInfo');
      },

      async getNetworkStatus() {
        if (!isNative) {
          return {
            connected: navigator.onLine,
            type: 'unknown'
          };
        }
        return callNative('getNetworkStatus');
      },

      onNetworkChange(callback) {
        window.addEventListener('online', () => callback({ connected: true }));
        window.addEventListener('offline', () => callback({ connected: false }));
        window.addEventListener('pulse:networkChange', (e) => callback(e.detail));
      }
    },

    // =========================================================================
    // UI API - Native UI interactions
    // =========================================================================
    UI: {
      async showToast(message, isLong = false) {
        if (!isNative) {
          // Web fallback
          const toast = document.createElement('div');
          toast.textContent = message;
          toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 99999;
            font-size: 14px;
            font-family: system-ui, sans-serif;
            animation: pulse-toast-in 0.3s ease;
          `;
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.style.animation = 'pulse-toast-out 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
          }, isLong ? 3500 : 2000);
          return;
        }
        return callNative('showToast', { message, isLong });
      },

      async vibrate(duration = 100) {
        if (!isNative) {
          if (navigator.vibrate) {
            navigator.vibrate(duration);
          }
          return;
        }
        return callNative('vibrate', { duration });
      }
    },

    // =========================================================================
    // Clipboard API
    // =========================================================================
    Clipboard: {
      async copy(text) {
        if (!isNative) {
          if (navigator.clipboard) {
            return navigator.clipboard.writeText(text);
          }
          // Fallback
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          return;
        }
        return callNative('copyToClipboard', { text });
      },

      async read() {
        if (!isNative) {
          if (navigator.clipboard) {
            return navigator.clipboard.readText();
          }
          return '';
        }
        return callNative('getClipboardText');
      }
    },

    // =========================================================================
    // App Lifecycle
    // =========================================================================
    App: {
      async exit() {
        if (!isNative || isIOS) {
          console.warn('Cannot exit app on this platform');
          return;
        }
        return callNative('exitApp');
      },

      async minimize() {
        if (!isNative) {
          console.warn('Cannot minimize app on web');
          return;
        }
        return callNative('minimizeApp');
      },

      onPause(callback) {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) callback();
        });
        window.addEventListener('pulse:pause', callback);
      },

      onResume(callback) {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) callback();
        });
        window.addEventListener('pulse:resume', callback);
      },

      onBackButton(callback) {
        window.addEventListener('pulse:backButton', callback);
      }
    }
  };

  // =========================================================================
  // CSS for toast animation
  // =========================================================================
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse-toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes pulse-toast-out {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
  `;
  document.head.appendChild(style);

  // =========================================================================
  // Initialization
  // =========================================================================

  window.initPulseNative = function() {
    console.log('[PulseMobile] Initialized on', PulseMobile.platform);
    window.dispatchEvent(new CustomEvent('pulse:ready', {
      detail: { platform: PulseMobile.platform }
    }));
  };

  // Auto-init on web (native calls this after bridge is ready)
  if (!isNative) {
    if (document.readyState === 'complete') {
      setTimeout(window.initPulseNative, 0);
    } else {
      window.addEventListener('load', () => setTimeout(window.initPulseNative, 0));
    }
  }

  // Export globally
  window.PulseMobile = PulseMobile;

})();
