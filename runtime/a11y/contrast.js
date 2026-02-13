/**
 * Pulse A11y - Color Contrast
 *
 * Color contrast calculation and WCAG compliance checking
 *
 * @module pulse-js-framework/runtime/a11y/contrast
 */

// =============================================================================
// COLOR CONTRAST
// =============================================================================

/**
 * Parse a color string to RGB values using canvas
 * @param {string} color - CSS color string
 * @returns {{r: number, g: number, b: number}|null}
 */
function parseColor(color) {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}

/**
 * Calculate relative luminance of a color
 * @param {{r: number, g: number, b: number}} color - RGB color
 * @returns {number} Luminance between 0 and 1
 */
function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} foreground - Foreground color (any CSS color format)
 * @param {string} background - Background color (any CSS color format)
 * @returns {number} Contrast ratio (1 to 21)
 */
export function getContrastRatio(foreground, background) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);

  if (!fg || !bg) return 1;

  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG requirements
 * @param {number} ratio - Contrast ratio
 * @param {'AA'|'AAA'} level - WCAG level (default: 'AA')
 * @param {'normal'|'large'} textSize - Text size category (default: 'normal')
 * @returns {boolean}
 */
export function meetsContrastRequirement(ratio, level = 'AA', textSize = 'normal') {
  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 }
  };
  return ratio >= (requirements[level]?.[textSize] ?? 4.5);
}

/**
 * Get the effective background color of an element (handles transparency)
 * @param {HTMLElement} element - Element to check
 * @returns {string} Computed background color
 */
export function getEffectiveBackgroundColor(element) {
  if (!element || typeof getComputedStyle === 'undefined') return 'rgb(255, 255, 255)';

  let el = element;
  while (el) {
    const bg = getComputedStyle(el).backgroundColor;
    // Check if background is not transparent
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    el = el.parentElement;
  }
  return 'rgb(255, 255, 255)'; // Default to white
}

/**
 * Check color contrast of text in an element
 * @param {HTMLElement} element - Element to check
 * @param {'AA'|'AAA'} level - WCAG level
 * @returns {{ ratio: number, passes: boolean, foreground: string, background: string }}
 */
export function checkElementContrast(element, level = 'AA') {
  if (!element || typeof getComputedStyle === 'undefined') {
    return { ratio: 1, passes: false, foreground: '', background: '' };
  }

  const style = getComputedStyle(element);
  const foreground = style.color;
  const background = getEffectiveBackgroundColor(element);
  const ratio = getContrastRatio(foreground, background);

  // Determine if text is "large" (14pt bold or 18pt+)
  const fontSize = parseFloat(style.fontSize);
  const fontWeight = parseInt(style.fontWeight, 10) || 400;
  const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

  const passes = meetsContrastRequirement(ratio, level, isLarge ? 'large' : 'normal');

  return { ratio, passes, foreground, background };
}
