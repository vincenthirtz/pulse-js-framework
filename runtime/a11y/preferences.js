/**
 * Pulse A11y - User Preferences
 *
 * User preference detection (reduced motion, color scheme, etc.)
 *
 * @module pulse-js-framework/runtime/a11y/preferences
 */

import { pulse } from '../pulse.js';

// =============================================================================
// USER PREFERENCES
// =============================================================================

/**
 * Check if user prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check user's preferred color scheme
 * @returns {'light'|'dark'|'no-preference'}
 */
export function prefersColorScheme() {
  if (typeof window === 'undefined') return 'no-preference';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'no-preference';
}

/**
 * Check if user prefers high contrast
 * @returns {boolean}
 */
export function prefersHighContrast() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Check if user prefers reduced transparency
 * @returns {boolean}
 */
export function prefersReducedTransparency() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
}

/**
 * Check if forced-colors mode is active (Windows High Contrast)
 * @returns {'none'|'active'}
 */
export function forcedColorsMode() {
  if (typeof window === 'undefined') return 'none';
  if (window.matchMedia('(forced-colors: active)').matches) return 'active';
  return 'none';
}

/**
 * Check user's contrast preference (more detailed than prefersHighContrast)
 * @returns {'no-preference'|'more'|'less'|'custom'}
 */
export function prefersContrast() {
  if (typeof window === 'undefined') return 'no-preference';
  if (window.matchMedia('(prefers-contrast: more)').matches) return 'more';
  if (window.matchMedia('(prefers-contrast: less)').matches) return 'less';
  if (window.matchMedia('(prefers-contrast: custom)').matches) return 'custom';
  return 'no-preference';
}

/**
 * Create reactive user preferences pulse
 * @returns {object} Object with reactive preference pulses
 */
export function createPreferences() {
  const reducedMotion = pulse(prefersReducedMotion());
  const colorScheme = pulse(prefersColorScheme());
  const highContrast = pulse(prefersHighContrast());
  const reducedTransparency = pulse(prefersReducedTransparency());
  const forcedColors = pulse(forcedColorsMode());
  const contrast = pulse(prefersContrast());

  const listeners = [];

  if (typeof window !== 'undefined') {
    const track = (query, handler) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', handler);
      listeners.push({ mql, handler });
    };

    track('(prefers-reduced-motion: reduce)', (e) => reducedMotion.set(e.matches));
    track('(prefers-color-scheme: dark)', (e) => colorScheme.set(e.matches ? 'dark' : 'light'));
    track('(prefers-contrast: more)', (e) => highContrast.set(e.matches));
    track('(prefers-reduced-transparency: reduce)', (e) => reducedTransparency.set(e.matches));
    track('(forced-colors: active)', (e) => forcedColors.set(e.matches ? 'active' : 'none'));
    track('(prefers-contrast: more)', () => contrast.set(prefersContrast()));
    track('(prefers-contrast: less)', () => contrast.set(prefersContrast()));
  }

  const cleanup = () => {
    for (const { mql, handler } of listeners) {
      mql.removeEventListener('change', handler);
    }
    listeners.length = 0;
  };

  return {
    reducedMotion,
    colorScheme,
    highContrast,
    reducedTransparency,
    forcedColors,
    contrast,
    cleanup
  };
}
