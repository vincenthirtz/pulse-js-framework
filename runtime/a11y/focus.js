/**
 * Pulse A11y - Focus Management
 *
 * Focus management, skip links, and keyboard navigation
 *
 * @module pulse-js-framework/runtime/a11y/focus
 */

import { pulse, effect } from '../pulse.js';

// =============================================================================
// FOCUS MANAGEMENT
// =============================================================================

const focusStack = [];

/** Focusable element selector */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'details > summary',
  'iframe'
].join(', ');

/**
 * Get all focusable elements within a container
 * @param {HTMLElement} container - Container element
 * @returns {HTMLElement[]} Array of focusable elements
 */
export function getFocusableElements(container) {
  if (!container) return [];
  const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return elements.filter(el => {
    // Check visibility
    const style = getComputedStyle(el);
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           el.offsetParent !== null;
  });
}

/**
 * Focus the first focusable element in a container
 * @param {HTMLElement} container - Container element
 * @returns {HTMLElement|null} The focused element or null
 */
export function focusFirst(container) {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[0].focus();
    return focusable[0];
  }
  return null;
}

/**
 * Focus the last focusable element in a container
 * @param {HTMLElement} container - Container element
 * @returns {HTMLElement|null} The focused element or null
 */
export function focusLast(container) {
  const focusable = getFocusableElements(container);
  if (focusable.length > 0) {
    focusable[focusable.length - 1].focus();
    return focusable[focusable.length - 1];
  }
  return null;
}

/**
 * Trap focus within a container (for modals, dialogs)
 * @param {HTMLElement} container - Container to trap focus in
 * @param {object} options - Options
 * @param {boolean} options.autoFocus - Auto focus first element (default: true)
 * @param {boolean} options.returnFocus - Return focus on release (default: true)
 * @param {HTMLElement} options.initialFocus - Element to focus initially
 * @returns {Function} Release function to remove trap
 */
export function trapFocus(container, options = {}) {
  const { autoFocus = true, returnFocus = true, initialFocus = null } = options;

  if (!container) return () => {};

  // Save current focus
  const previouslyFocused = document.activeElement;
  if (returnFocus) {
    focusStack.push(previouslyFocused);
  }

  // Handle Tab key
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: going backwards
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab: going forwards
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  // Handle focus leaving container
  const handleFocusOut = (e) => {
    if (!container.contains(e.relatedTarget)) {
      // Focus is leaving container, bring it back
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  container.addEventListener('focusout', handleFocusOut);

  // Set initial focus
  if (autoFocus) {
    requestAnimationFrame(() => {
      if (initialFocus && container.contains(initialFocus)) {
        initialFocus.focus();
      } else {
        focusFirst(container);
      }
    });
  }

  // Return release function
  return function releaseFocusTrap() {
    container.removeEventListener('keydown', handleKeyDown);
    container.removeEventListener('focusout', handleFocusOut);

    if (returnFocus && focusStack.length > 0) {
      const toFocus = focusStack.pop();
      if (toFocus && typeof toFocus.focus === 'function') {
        toFocus.focus();
      }
    }
  };
}

/**
 * Save current focus to stack
 */
export function saveFocus() {
  focusStack.push(document.activeElement);
}

/**
 * Restore focus from stack
 */
export function restoreFocus() {
  if (focusStack.length > 0) {
    const element = focusStack.pop();
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }
}

/**
 * Clear focus stack
 */
export function clearFocusStack() {
  focusStack.length = 0;
}

/**
 * Add escape key handler for dismissing modals/dialogs
 * @param {HTMLElement} container - Container element
 * @param {Function} onEscape - Callback when escape is pressed
 * @param {object} options - Options
 * @param {boolean} options.stopPropagation - Stop event propagation (default: true)
 * @returns {Function} Cleanup function to remove handler
 */
export function onEscapeKey(container, onEscape, options = {}) {
  const { stopPropagation = true } = options;

  if (!container) return () => {};

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (stopPropagation) {
        e.stopPropagation();
      }
      onEscape(e);
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Track whether the user is navigating with keyboard
 * Useful for implementing :focus-visible behavior
 * @returns {{ isKeyboardUser: object, cleanup: Function }} isKeyboardUser is a pulse
 */
export function createFocusVisibleTracker() {
  const isKeyboardUser = pulse(false);

  if (typeof document === 'undefined') {
    return { isKeyboardUser, cleanup: () => {} };
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      isKeyboardUser.set(true);
    }
  };

  const handleMouseDown = () => {
    isKeyboardUser.set(false);
  };

  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('mousedown', handleMouseDown, true);

  return {
    isKeyboardUser,
    cleanup: () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
    }
  };
}

// =============================================================================
// SKIP LINKS
// =============================================================================

/**
 * Create a skip link for keyboard navigation
 * @param {string} targetId - ID of target element to skip to
 * @param {string} text - Link text (default: 'Skip to main content')
 * @param {object} options - Options
 * @returns {HTMLElement} The skip link element
 */
export function createSkipLink(targetId, text = 'Skip to main content', options = {}) {
  const { className = 'pulse-skip-link' } = options;

  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = text;
  link.className = className;

  // Visually hidden but focusable styles
  Object.assign(link.style, {
    position: 'absolute',
    top: '-40px',
    left: '0',
    padding: '8px 16px',
    background: '#000',
    color: '#fff',
    textDecoration: 'none',
    zIndex: '10000',
    transition: 'top 0.2s'
  });

  // Show on focus
  link.addEventListener('focus', () => {
    link.style.top = '0';
  });

  link.addEventListener('blur', () => {
    link.style.top = '-40px';
  });

  // Handle click
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.removeAttribute('tabindex');
    }
  });

  return link;
}

/**
 * Install skip links at the beginning of the document
 * @param {Array<{target: string, text: string}>} links - Skip link definitions
 */
export function installSkipLinks(links) {
  const container = document.createElement('nav');
  container.setAttribute('aria-label', 'Skip links');
  container.className = 'pulse-skip-links';

  links.forEach(({ target, text }) => {
    container.appendChild(createSkipLink(target, text));
  });

  document.body.insertBefore(container, document.body.firstChild);
  return container;
}
// =============================================================================
// KEYBOARD NAVIGATION
// =============================================================================

/**
 * Handle arrow key navigation within a container (roving tabindex)
 * @param {HTMLElement} container - Container element
 * @param {object} options - Options
 * @returns {Function} Cleanup function
 */
export function createRovingTabindex(container, options = {}) {
  const {
    selector = '[role="option"], [role="menuitem"], [role="treeitem"]',
    orientation = 'vertical',
    loop = true,
    onSelect = null
  } = options;

  const getItems = () => Array.from(container.querySelectorAll(selector))
    .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');

  const items = getItems();
  if (items.length === 0) return () => {};

  // Initialize tabindex
  items.forEach((item, i) => {
    item.setAttribute('tabindex', i === 0 ? '0' : '-1');
  });

  const handleKeyDown = (e) => {
    const items = getItems();
    const currentIndex = items.findIndex(item => item === document.activeElement);
    if (currentIndex === -1) return;

    const isVertical = orientation === 'vertical';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    let newIndex = currentIndex;

    switch (e.key) {
      case prevKey:
        if (loop) {
          newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        } else {
          newIndex = Math.max(0, currentIndex - 1);
        }
        break;
      case nextKey:
        if (loop) {
          newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          newIndex = Math.min(items.length - 1, currentIndex + 1);
        }
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        if (onSelect) {
          e.preventDefault();
          onSelect(items[currentIndex], currentIndex);
        }
        return;
      default:
        return;
    }

    e.preventDefault();

    // Update tabindex
    items.forEach((item, i) => {
      item.setAttribute('tabindex', i === newIndex ? '0' : '-1');
    });

    items[newIndex].focus();
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}
