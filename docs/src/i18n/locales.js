/**
 * Pulse Documentation - Supported Locales
 */

export const locales = {
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr' },
  fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  de: { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' }
};

export const defaultLocale = 'en';

export const localeKeys = Object.keys(locales);

/**
 * Check if a string is a valid locale code
 */
export function isValidLocale(code) {
  return code in locales;
}
