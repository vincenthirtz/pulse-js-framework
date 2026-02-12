/**
 * Pulse i18n Module
 * Internationalization with reactive locale switching, pluralization, and interpolation.
 *
 * @module pulse-js-framework/runtime/i18n
 */

import { pulse, computed } from './pulse.js';
import { loggers } from './logger.js';
import { RuntimeError } from './errors.js';
import { DANGEROUS_KEYS } from './security.js';

const log = loggers.pulse;

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_OPTIONS = {
  locale: 'en',
  fallbackLocale: 'en',
  messages: {},
  pluralRules: null,
  missing: null,
  modifiers: null,
};

/**
 * Default English pluralization: 0 = zero, 1 = one, 2+ = other
 */
const DEFAULT_PLURAL_RULES = {
  en: (count) => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    return 2;
  },
};

// =============================================================================
// MODULE-LEVEL DEFAULT INSTANCE
// =============================================================================

let _defaultInstance = null;

// =============================================================================
// I18N ERROR
// =============================================================================

export class I18nError extends RuntimeError {
  constructor(message, options = {}) {
    super(message, { code: 'I18N_ERROR', ...options });
    this.name = 'I18nError';
  }

  static isI18nError(error) {
    return error instanceof I18nError;
  }
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Resolve a dot-notated key in a nested object
 * @private
 */
function _resolveKey(messages, key) {
  const parts = key.split('.');
  let current = messages;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Interpolate {param} placeholders in a message string
 * @private
 */
function _interpolate(message, params) {
  if (!params || typeof message !== 'string') return message;

  return message.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in params) {
      return String(params[key]);
    }
    return match;
  });
}

/**
 * Apply modifiers (pipe syntax): 'key | upper'
 * @private
 */
function _applyModifiers(value, modifierStr, modifiers) {
  if (!modifiers || !modifierStr) return value;

  const parts = modifierStr.split('|').map(s => s.trim());
  let result = value;

  for (const mod of parts) {
    if (mod && modifiers[mod]) {
      result = modifiers[mod](result);
    }
  }

  return result;
}

/**
 * Parse key for modifiers: 'hello | upper' -> { key: 'hello', modifiers: 'upper' }
 * @private
 */
function _parseKey(key) {
  const pipeIdx = key.indexOf(' | ');
  if (pipeIdx === -1) {
    return { key: key.trim(), modifierStr: null };
  }
  return {
    key: key.substring(0, pipeIdx).trim(),
    modifierStr: key.substring(pipeIdx + 3),
  };
}

/**
 * Get the plural form index for a locale and count
 * @private
 */
function _getPluralIndex(locale, count, customRules) {
  // Check custom rules first
  if (customRules && customRules[locale]) {
    return customRules[locale](count);
  }

  // Check default rules
  const lang = locale.split('-')[0];
  if (DEFAULT_PLURAL_RULES[lang]) {
    return DEFAULT_PLURAL_RULES[lang](count);
  }

  // Fallback: 0 = zero, 1 = one, 2+ = other
  if (count === 0) return 0;
  if (count === 1) return 1;
  return 2;
}

// =============================================================================
// createI18n
// =============================================================================

/**
 * Create an i18n instance with reactive locale switching
 *
 * @param {Object} [options] - Configuration options
 * @returns {Object} I18n instance
 */
export function createI18n(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Reactive locale
  const locale = pulse(config.locale);
  const messages = { ...config.messages };

  /**
   * Get available locales
   * @returns {string[]}
   */
  function getAvailableLocales() {
    return Object.keys(messages);
  }

  /**
   * Translate a key with optional interpolation
   *
   * @param {string} key - Translation key (dot notation supported, pipe modifiers supported)
   * @param {Object} [params] - Interpolation parameters
   * @returns {string} Translated string
   */
  function t(key, params) {
    const { key: resolvedKey, modifierStr } = _parseKey(key);
    const currentLocale = locale.get();

    // Look up in current locale
    let message = _resolveKey(messages[currentLocale], resolvedKey);

    // Fallback to fallback locale
    if (message === undefined && config.fallbackLocale && config.fallbackLocale !== currentLocale) {
      message = _resolveKey(messages[config.fallbackLocale], resolvedKey);
    }

    // Missing key handler
    if (message === undefined) {
      if (config.missing) {
        return config.missing(currentLocale, resolvedKey);
      }
      log.warn(`Missing translation: "${resolvedKey}" for locale "${currentLocale}"`);
      return resolvedKey;
    }

    // If message is not a string (e.g., nested object), return key
    if (typeof message !== 'string') {
      return resolvedKey;
    }

    // Interpolate
    let result = _interpolate(message, params);

    // Apply modifiers
    if (modifierStr) {
      result = _applyModifiers(result, modifierStr, config.modifiers);
    }

    return result;
  }

  /**
   * Translate with pluralization
   *
   * @param {string} key - Translation key (message format: 'zero | one | other')
   * @param {number} count - Count for pluralization
   * @param {Object} [params] - Additional interpolation parameters
   * @returns {string} Pluralized translated string
   */
  function tc(key, count, params) {
    const currentLocale = locale.get();

    let message = _resolveKey(messages[currentLocale], key);

    if (message === undefined && config.fallbackLocale && config.fallbackLocale !== currentLocale) {
      message = _resolveKey(messages[config.fallbackLocale], key);
    }

    if (message === undefined) {
      if (config.missing) {
        return config.missing(currentLocale, key);
      }
      log.warn(`Missing translation: "${key}" for locale "${currentLocale}"`);
      return key;
    }

    if (typeof message !== 'string') return key;

    // Split by ' | ' for plural forms
    const forms = message.split(' | ').map(s => s.trim());
    const pluralIndex = _getPluralIndex(currentLocale, count, config.pluralRules);
    const selectedForm = forms[Math.min(pluralIndex, forms.length - 1)] || forms[forms.length - 1];

    // Interpolate with count + additional params
    return _interpolate(selectedForm, { count, ...params });
  }

  /**
   * Check if a translation key exists
   *
   * @param {string} key - Translation key
   * @param {string} [checkLocale] - Locale to check (defaults to current)
   * @returns {boolean}
   */
  function te(key, checkLocale) {
    const loc = checkLocale || locale.get();
    return _resolveKey(messages[loc], key) !== undefined;
  }

  /**
   * Get the raw message value (without interpolation)
   *
   * @param {string} key - Translation key
   * @returns {*} Raw message value
   */
  function tm(key) {
    const currentLocale = locale.get();
    let message = _resolveKey(messages[currentLocale], key);

    if (message === undefined && config.fallbackLocale) {
      message = _resolveKey(messages[config.fallbackLocale], key);
    }

    return message;
  }

  /**
   * Change the current locale
   * @param {string} newLocale
   */
  function setLocale(newLocale) {
    if (!messages[newLocale]) {
      log.warn(`Locale "${newLocale}" not loaded. Available: ${getAvailableLocales().join(', ')}`);
    }
    locale.set(newLocale);
  }

  /**
   * Dynamically load messages for a locale
   *
   * @param {string} loc - Locale code
   * @param {Object} msgs - Message object
   */
  function loadMessages(loc, msgs) {
    if (messages[loc]) {
      // Deep merge
      messages[loc] = _deepMerge(messages[loc], msgs);
    } else {
      messages[loc] = msgs;
    }
    log.info(`Loaded messages for locale "${loc}"`);
  }

  /**
   * Format a number using Intl.NumberFormat
   *
   * @param {number} value - Number to format
   * @param {Object} [opts] - Intl.NumberFormat options
   * @returns {string}
   */
  function n(value, opts) {
    try {
      return new Intl.NumberFormat(locale.get(), opts).format(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Format a date using Intl.DateTimeFormat
   *
   * @param {Date|number} value - Date to format
   * @param {Object} [opts] - Intl.DateTimeFormat options
   * @returns {string}
   */
  function d(value, opts) {
    try {
      return new Intl.DateTimeFormat(locale.get(), opts).format(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Set this instance as the global default for useI18n()
   */
  function install() {
    _defaultInstance = instance;
  }

  const instance = {
    locale,
    get availableLocales() { return getAvailableLocales(); },

    t,
    tc,
    te,
    tm,

    setLocale,
    loadMessages,
    install,

    n,
    d,
  };

  return instance;
}

// =============================================================================
// HOOK: useI18n
// =============================================================================

/**
 * Get the global i18n instance (set via createI18n().install())
 *
 * @returns {Object} { t, tc, locale, setLocale, availableLocales }
 */
export function useI18n() {
  if (!_defaultInstance) {
    throw new I18nError(
      'No i18n instance installed. Call createI18n().install() first.',
      { suggestion: 'Create an i18n instance and call install() before using useI18n()' }
    );
  }

  return {
    t: _defaultInstance.t,
    tc: _defaultInstance.tc,
    te: _defaultInstance.te,
    tm: _defaultInstance.tm,
    locale: _defaultInstance.locale,
    setLocale: _defaultInstance.setLocale,
    availableLocales: _defaultInstance.availableLocales,
    n: _defaultInstance.n,
    d: _defaultInstance.d,
  };
}

// =============================================================================
// INTERNAL: Deep merge
// =============================================================================

const MAX_MERGE_DEPTH = 10;

function _deepMerge(target, source, depth = 0) {
  if (depth > MAX_MERGE_DEPTH) {
    log.warn('Maximum nesting depth exceeded in i18n message merge');
    return target;
  }

  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = _deepMerge(result[key], value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  createI18n,
  useI18n,
  I18nError,
};
