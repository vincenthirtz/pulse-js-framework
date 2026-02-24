/**
 * Pulse i18n Module Type Definitions
 * @module pulse-js-framework/runtime/i18n
 */

import { Pulse } from './pulse';

// ============================================================================
// I18n Error
// ============================================================================

/**
 * I18n-specific error
 */
export declare class I18nError extends Error {
  readonly name: 'I18nError';

  constructor(message: string, options?: {
    suggestion?: string;
  });

  /** Check if an error is an I18nError */
  static isI18nError(error: unknown): error is I18nError;
}

// ============================================================================
// Types
// ============================================================================

/** Nested message object where leaves are translation strings */
export interface MessageObject {
  [key: string]: string | MessageObject;
}

/** Messages organized by locale */
export interface Messages {
  [locale: string]: MessageObject;
}

/** Plural rule function: takes a count and returns the plural form index */
export type PluralRule = (count: number) => number;

/** Plural rules organized by locale */
export interface PluralRules {
  [locale: string]: PluralRule;
}

/** Missing key handler */
export type MissingHandler = (locale: string, key: string) => string;

/** Text modifier function (used with pipe syntax) */
export type Modifier = (value: string) => string;

/** Modifier map */
export interface Modifiers {
  [name: string]: Modifier;
}

/** Interpolation parameters */
export interface InterpolationParams {
  [key: string]: string | number | boolean;
}

// ============================================================================
// createI18n Options
// ============================================================================

/** Options for createI18n */
export interface I18nOptions {
  /** Initial locale (default: 'en') */
  locale?: string;

  /** Fallback locale when a key is missing (default: 'en') */
  fallbackLocale?: string;

  /** Message dictionaries organized by locale */
  messages?: Messages;

  /** Custom pluralization rules by locale */
  pluralRules?: PluralRules | null;

  /** Handler called when a translation key is missing */
  missing?: MissingHandler | null;

  /** Text modifiers for pipe syntax (e.g., 'key | upper') */
  modifiers?: Modifiers | null;
}

// ============================================================================
// I18n Instance
// ============================================================================

/** I18n instance returned by createI18n */
export interface I18nInstance {
  /** Reactive current locale */
  locale: Pulse<string>;

  /** List of available locale codes */
  readonly availableLocales: string[];

  /**
   * Translate a key with optional interpolation.
   * Supports dot notation (e.g., 'nav.home') and pipe modifiers (e.g., 'greeting | upper').
   *
   * @param key Translation key
   * @param params Interpolation parameters (replaces {param} in message)
   * @returns Translated string, or the key itself if not found
   */
  t(key: string, params?: InterpolationParams): string;

  /**
   * Translate with pluralization.
   * The message value should contain plural forms separated by ' | '.
   * (e.g., 'no items | one item | {count} items')
   *
   * @param key Translation key
   * @param count Count for pluralization
   * @param params Additional interpolation parameters (count is added automatically)
   * @returns Pluralized translated string
   */
  tc(key: string, count: number, params?: InterpolationParams): string;

  /**
   * Check if a translation key exists.
   *
   * @param key Translation key
   * @param locale Locale to check (defaults to current locale)
   * @returns True if the key exists
   */
  te(key: string, locale?: string): boolean;

  /**
   * Get the raw message value without interpolation.
   *
   * @param key Translation key
   * @returns Raw message value (string, nested object, or undefined)
   */
  tm(key: string): string | MessageObject | undefined;

  /**
   * Change the current locale.
   * Triggers reactive updates in all computed translations.
   *
   * @param newLocale Locale code to switch to
   */
  setLocale(newLocale: string): void;

  /**
   * Dynamically load messages for a locale.
   * Merges with existing messages if the locale is already loaded.
   *
   * @param locale Locale code
   * @param messages Message dictionary
   */
  loadMessages(locale: string, messages: MessageObject): void;

  /**
   * Set this instance as the global default for useI18n().
   */
  install(): void;

  /**
   * Format a number using Intl.NumberFormat with the current locale.
   *
   * @param value Number to format
   * @param options Intl.NumberFormat options
   * @returns Formatted number string
   */
  n(value: number, options?: Intl.NumberFormatOptions): string;

  /**
   * Format a date using Intl.DateTimeFormat with the current locale.
   *
   * @param value Date or timestamp to format
   * @param options Intl.DateTimeFormat options
   * @returns Formatted date string
   */
  d(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
}

/**
 * Create an i18n instance with reactive locale switching,
 * interpolation, pluralization, and modifiers.
 *
 * @param options Configuration options
 * @returns I18n instance
 *
 * @example
 * const i18n = createI18n({
 *   locale: 'en',
 *   fallbackLocale: 'en',
 *   messages: {
 *     en: {
 *       greeting: 'Hello, {name}!',
 *       items: 'no items | one item | {count} items',
 *       nav: { home: 'Home', about: 'About' },
 *     },
 *     fr: {
 *       greeting: 'Bonjour, {name} !',
 *       items: 'aucun | un | {count} articles',
 *       nav: { home: 'Accueil', about: 'A propos' },
 *     },
 *   },
 *   modifiers: {
 *     upper: (v) => v.toUpperCase(),
 *     lower: (v) => v.toLowerCase(),
 *   },
 * });
 *
 * i18n.install(); // Set as global default
 *
 * i18n.t('greeting', { name: 'Alice' }); // 'Hello, Alice!'
 * i18n.tc('items', 5);                   // '5 items'
 * i18n.t('greeting | upper', { name: 'Alice' }); // 'HELLO, ALICE!'
 *
 * i18n.setLocale('fr'); // Switch locale reactively
 * i18n.t('greeting', { name: 'Alice' }); // 'Bonjour, Alice !'
 */
export declare function createI18n(options?: I18nOptions): I18nInstance;

// ============================================================================
// useI18n Hook
// ============================================================================

/** Return type of useI18n() */
export interface UseI18nReturn {
  /** Translate a key with optional interpolation */
  t: I18nInstance['t'];

  /** Translate with pluralization */
  tc: I18nInstance['tc'];

  /** Check if a translation key exists */
  te: I18nInstance['te'];

  /** Get the raw message value */
  tm: I18nInstance['tm'];

  /** Reactive current locale */
  locale: Pulse<string>;

  /** Change the current locale */
  setLocale: I18nInstance['setLocale'];

  /** List of available locale codes */
  availableLocales: string[];

  /** Format a number using Intl.NumberFormat */
  n: I18nInstance['n'];

  /** Format a date using Intl.DateTimeFormat */
  d: I18nInstance['d'];
}

/**
 * Get the global i18n instance (set via createI18n().install()).
 * Throws I18nError if no instance has been installed.
 *
 * @returns I18n methods and reactive locale
 * @throws I18nError if no i18n instance is installed
 *
 * @example
 * // First, install a global instance
 * const i18n = createI18n({ ... });
 * i18n.install();
 *
 * // Then use in components
 * const { t, locale, setLocale } = useI18n();
 * const greeting = computed(() => t('greeting', { name: user.get() }));
 */
export declare function useI18n(): UseI18nReturn;

// ============================================================================
// Default Export
// ============================================================================

declare const _default: {
  createI18n: typeof createI18n;
  useI18n: typeof useI18n;
  I18nError: typeof I18nError;
};

export default _default;
