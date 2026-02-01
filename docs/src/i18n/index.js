/**
 * Pulse Documentation - i18n Module
 * Lightweight internationalization system using Pulse signals
 */

import { pulse, effect } from '/runtime/index.js';
import { locales, defaultLocale, isValidLocale, localeKeys } from './locales.js';

// Re-export for convenience
export { locales, defaultLocale, isValidLocale, localeKeys };

// =============================================================================
// Translation Cache
// =============================================================================

const translationCache = new Map();

/**
 * Load translations for a locale (lazy loading)
 */
async function loadTranslations(localeCode) {
  if (translationCache.has(localeCode)) {
    return translationCache.get(localeCode);
  }

  try {
    const [common, pages] = await Promise.all([
      import(`./translations/${localeCode}/common.js`).then(m => m.default),
      import(`./translations/${localeCode}/pages.js`).then(m => m.default)
    ]);

    const translations = { ...common, ...pages };
    translationCache.set(localeCode, translations);
    return translations;
  } catch (e) {
    console.warn(`[i18n] Failed to load translations for "${localeCode}", falling back to ${defaultLocale}`);
    // Fallback to default locale
    if (localeCode !== defaultLocale) {
      return loadTranslations(defaultLocale);
    }
    return {};
  }
}

// =============================================================================
// Locale State
// =============================================================================

/**
 * Detect locale from URL, localStorage, or browser settings
 */
function detectLocale() {
  // 1. Check URL prefix (e.g., /fr/getting-started)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0 && isValidLocale(pathParts[0])) {
    return pathParts[0];
  }

  // 2. Check localStorage
  const saved = localStorage.getItem('pulse-docs-locale');
  if (saved && isValidLocale(saved)) {
    return saved;
  }

  // 3. Check browser language
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang && isValidLocale(browserLang)) {
    return browserLang;
  }

  // 4. Fallback to default
  return defaultLocale;
}

/**
 * Current locale signal
 */
export const locale = pulse(detectLocale());

/**
 * Loaded translations signal (starts empty, filled async)
 */
export const translations = pulse({});

/**
 * Loading state
 */
export const isLoading = pulse(true);

// Load translations when locale changes
effect(() => {
  const currentLocale = locale.get();
  isLoading.set(true);

  loadTranslations(currentLocale).then(t => {
    translations.set(t);
    isLoading.set(false);
  });

  // Persist to localStorage
  localStorage.setItem('pulse-docs-locale', currentLocale);

  // Update HTML lang attribute
  document.documentElement.lang = currentLocale;
  document.documentElement.dir = locales[currentLocale]?.dir || 'ltr';
});

// =============================================================================
// Translation Function
// =============================================================================

/**
 * Resolve a nested key like "nav.home" from an object
 */
function resolveKey(obj, key) {
  return key.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Translate a key with optional interpolation
 * @param {string} key - Dot-notation key (e.g., "nav.home", "page.title")
 * @param {Object} params - Interpolation values (e.g., { name: "John" })
 * @returns {string} Translated string or key if not found
 *
 * @example
 * t('nav.home') // "Home"
 * t('greeting', { name: 'John' }) // "Hello, John!"
 */
export function t(key, params = {}) {
  const currentTranslations = translations.get();
  let value = resolveKey(currentTranslations, key);

  // Key not found - return key itself as fallback
  if (value === undefined) {
    return key;
  }

  // Handle interpolation: "Hello {name}" -> "Hello John"
  if (typeof value === 'string' && Object.keys(params).length > 0) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return value;
}

/**
 * Get raw translation value (for HTML content)
 * Same as t() but explicitly for getting HTML strings
 */
export function tHtml(key, params = {}) {
  return t(key, params);
}

// =============================================================================
// URL Helpers
// =============================================================================

/**
 * Get the current path without locale prefix
 */
export function getPathWithoutLocale() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);

  if (parts.length > 0 && isValidLocale(parts[0])) {
    return '/' + parts.slice(1).join('/') || '/';
  }

  return path;
}

/**
 * Build a path with locale prefix
 * @param {string} path - Path without locale (e.g., "/getting-started")
 * @param {string} localeCode - Locale code (defaults to current)
 */
export function localePath(path, localeCode = locale.get()) {
  // English doesn't need prefix (default language)
  if (localeCode === defaultLocale) {
    return path;
  }

  // Add locale prefix
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `/${localeCode}${cleanPath}`;
}

/**
 * Change locale and navigate to equivalent path
 */
export function setLocale(newLocale, router = null) {
  if (!isValidLocale(newLocale)) {
    console.warn(`[i18n] Invalid locale: ${newLocale}`);
    return;
  }

  const currentPath = getPathWithoutLocale();
  locale.set(newLocale);

  if (router) {
    const newPath = localePath(currentPath, newLocale);
    router.navigate(newPath);
  }
}

// =============================================================================
// Initialization
// =============================================================================

// Pre-load default locale translations
loadTranslations(defaultLocale).then(t => {
  if (locale.get() === defaultLocale) {
    translations.set(t);
    isLoading.set(false);
  }
});
