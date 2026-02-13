/**
 * Pulse A11y - Utilities
 *
 * Utility functions for accessibility features
 *
 * @module pulse-js-framework/runtime/a11y/utils
 */

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique ID for ARIA relationships
 * @param {string} prefix - ID prefix
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'pulse') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Compute the accessible name of an element
 * Follows simplified ARIA accessible name computation algorithm
 * @param {HTMLElement} element - Element to get name for
 * @returns {string} The accessible name
 */
export function getAccessibleName(element) {
  if (!element) return '';

  // 1. aria-labelledby takes precedence
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/);
    const names = ids
      .map(id => document.getElementById(id))
      .filter(Boolean)
      .map(el => el.textContent?.trim() || '');
    if (names.length > 0) {
      return names.join(' ');
    }
  }

  // 2. aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  // 3. Native label association (for form controls)
  if (element.labels && element.labels.length > 0) {
    return Array.from(element.labels)
      .map(label => label.textContent?.trim() || '')
      .join(' ');
  }

  // 4. title attribute
  const title = element.getAttribute('title');
  if (title && title.trim()) {
    return title.trim();
  }

  // 5. Placeholder (for inputs)
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      return placeholder.trim();
    }
  }

  // 6. alt attribute (for images)
  if (element.tagName === 'IMG') {
    const alt = element.getAttribute('alt');
    if (alt) return alt;
  }

  // 7. Text content (for buttons, links)
  const textContent = element.textContent?.trim();
  if (textContent) {
    return textContent;
  }

  // 8. value attribute (for inputs with type=button/submit)
  const type = element.getAttribute('type');
  if (element.tagName === 'INPUT' && (type === 'button' || type === 'submit')) {
    return element.value || '';
  }

  return '';
}

/**
 * Check if an element is hidden from accessibility tree
 * Considers aria-hidden, display:none, visibility:hidden, and inert
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is hidden from a11y
 */
export function isAccessiblyHidden(element) {
  if (!element) return true;

  // Check aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') return true;

  // Check CSS
  const style = getComputedStyle(element);
  if (style.display === 'none') return true;
  if (style.visibility === 'hidden') return true;

  // Check inert
  if (element.hasAttribute('inert')) return true;

  // Check ancestors
  let parent = element.parentElement;
  while (parent) {
    if (parent.getAttribute('aria-hidden') === 'true') return true;
    if (parent.hasAttribute('inert')) return true;
    parent = parent.parentElement;
  }

  return false;
}

/**
 * Make an element and its descendants inert (non-interactive)
 * Sets both inert attribute and aria-hidden="true"
 * @param {HTMLElement} element - Element to make inert
 * @returns {Function} Restore function to undo inert state
 */
export function makeInert(element) {
  const wasInert = element.hasAttribute('inert');
  element.setAttribute('inert', '');
  element.setAttribute('aria-hidden', 'true');

  return () => {
    if (!wasInert) {
      element.removeAttribute('inert');
    }
    element.removeAttribute('aria-hidden');
  };
}

/**
 * Create a visually hidden element (screen reader only)
 * Uses the "sr-only" pattern: visible to assistive tech, hidden visually
 * @param {string} text - Text content for screen readers
 * @returns {HTMLElement} The sr-only element
 */
export function srOnly(text) {
  const span = document.createElement('span');
  span.textContent = text;
  span.className = 'sr-only';
  span.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `;
  return span;
}
