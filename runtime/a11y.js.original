/**
 * Pulse A11y - Accessibility Utilities
 * Zero-dependency accessibility helpers for inclusive web applications
 *
 * Features:
 * - Screen reader announcements (live regions)
 * - Focus management (trap, restore, skip links)
 * - User preferences detection (reduced motion, color scheme)
 * - ARIA validation and helpers
 * - Keyboard navigation utilities
 */

import { pulse, effect } from './pulse.js';

// =============================================================================
// LIVE REGIONS - Screen Reader Announcements
// =============================================================================

let liveRegionPolite = null;
let liveRegionAssertive = null;

/**
 * Initialize live regions for screen reader announcements
 * Called automatically on first announce
 */
function ensureLiveRegions() {
  if (typeof document === 'undefined') return;

  if (!liveRegionPolite) {
    liveRegionPolite = document.createElement('div');
    liveRegionPolite.setAttribute('role', 'status');
    liveRegionPolite.setAttribute('aria-live', 'polite');
    liveRegionPolite.setAttribute('aria-atomic', 'true');
    Object.assign(liveRegionPolite.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    });
    liveRegionPolite.id = 'pulse-a11y-polite';
    document.body.appendChild(liveRegionPolite);
  }

  if (!liveRegionAssertive) {
    liveRegionAssertive = document.createElement('div');
    liveRegionAssertive.setAttribute('role', 'alert');
    liveRegionAssertive.setAttribute('aria-live', 'assertive');
    liveRegionAssertive.setAttribute('aria-atomic', 'true');
    Object.assign(liveRegionAssertive.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    });
    liveRegionAssertive.id = 'pulse-a11y-assertive';
    document.body.appendChild(liveRegionAssertive);
  }
}

/**
 * Announce a message to screen readers
 * @param {string} message - Message to announce
 * @param {object} options - Options
 * @param {'polite'|'assertive'} options.priority - Announcement priority (default: 'polite')
 * @param {number} options.clearAfter - Clear message after ms (default: 1000)
 */
export function announce(message, options = {}) {
  const { priority = 'polite', clearAfter = 1000 } = options;

  ensureLiveRegions();

  const region = priority === 'assertive' ? liveRegionAssertive : liveRegionPolite;
  if (!region) return;

  // Clear and set new message (needed for repeated announcements)
  region.textContent = '';

  // Use requestAnimationFrame to ensure the clear is processed
  requestAnimationFrame(() => {
    region.textContent = message;

    if (clearAfter > 0) {
      setTimeout(() => {
        region.textContent = '';
      }, clearAfter);
    }
  });
}

/**
 * Announce politely (waits for user to finish current task)
 * @param {string} message - Message to announce
 */
export function announcePolite(message) {
  announce(message, { priority: 'polite' });
}

/**
 * Announce assertively (interrupts current announcement)
 * Use sparingly - only for critical updates
 * @param {string} message - Message to announce
 */
export function announceAssertive(message) {
  announce(message, { priority: 'assertive' });
}

/**
 * Create a reactive live region that announces when value changes
 * @param {Function} getter - Function that returns the message
 * @param {object} options - Announce options
 * @returns {Function} Cleanup function
 */
export function createLiveAnnouncer(getter, options = {}) {
  let lastValue = null;

  return effect(() => {
    const value = getter();
    if (value !== lastValue && value) {
      announce(value, options);
      lastValue = value;
    }
  });
}

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

// =============================================================================
// ARIA HELPERS
// =============================================================================

/**
 * Set multiple ARIA attributes on an element
 * @param {HTMLElement} element - Target element
 * @param {object} attrs - ARIA attributes (without 'aria-' prefix)
 */
export function setAriaAttributes(element, attrs) {
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      element.removeAttribute(`aria-${key}`);
    } else {
      element.setAttribute(`aria-${key}`, String(value));
    }
  });
}

/**
 * Create an ARIA-compliant disclosure widget
 * @param {HTMLElement} trigger - Button that toggles disclosure
 * @param {HTMLElement} content - Content to show/hide
 * @param {object} options - Options
 * @returns {object} Control object with toggle, open, close methods
 */
export function createDisclosure(trigger, content, options = {}) {
  const { defaultOpen = false, onToggle = null } = options;

  const expanded = pulse(defaultOpen);
  const id = content.id || `pulse-disclosure-${Date.now()}`;

  content.id = id;
  trigger.setAttribute('aria-controls', id);
  trigger.setAttribute('aria-expanded', String(expanded.get()));

  // Update visibility
  effect(() => {
    const isOpen = expanded.get();
    trigger.setAttribute('aria-expanded', String(isOpen));
    content.hidden = !isOpen;
    if (onToggle) onToggle(isOpen);
  });

  // Handle click
  trigger.addEventListener('click', () => {
    expanded.update(v => !v);
  });

  // Handle keyboard
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      expanded.update(v => !v);
    }
  });

  return {
    expanded,
    toggle: () => expanded.update(v => !v),
    open: () => expanded.set(true),
    close: () => expanded.set(false)
  };
}

/**
 * Create ARIA-compliant tabs
 * @param {HTMLElement} tablist - Container with role="tablist"
 * @param {object} options - Options
 * @returns {object} Control object
 */
export function createTabs(tablist, options = {}) {
  const { defaultIndex = 0, orientation = 'horizontal', onSelect = null } = options;

  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(tab => {
    const panelId = tab.getAttribute('aria-controls');
    return document.getElementById(panelId);
  });

  const selectedIndex = pulse(defaultIndex);

  tablist.setAttribute('aria-orientation', orientation);

  // Update selection
  effect(() => {
    const index = selectedIndex.get();

    tabs.forEach((tab, i) => {
      const isSelected = i === index;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    panels.forEach((panel, i) => {
      if (panel) {
        panel.hidden = i !== index;
      }
    });

    if (onSelect) onSelect(index);
  });

  // Handle click
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      selectedIndex.set(i);
      tab.focus();
    });
  });

  // Handle keyboard navigation
  tablist.addEventListener('keydown', (e) => {
    const currentIndex = selectedIndex.get();
    let newIndex = currentIndex;

    const isHorizontal = orientation === 'horizontal';
    const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';

    switch (e.key) {
      case prevKey:
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case nextKey:
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    selectedIndex.set(newIndex);
    tabs[newIndex].focus();
  });

  return {
    selectedIndex,
    select: (index) => selectedIndex.set(index),
    tabs,
    panels
  };
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

// =============================================================================
// ARIA WIDGETS
// =============================================================================

/**
 * Create an accessible modal dialog
 * Composes trapFocus, onEscapeKey, and proper ARIA attributes
 * @param {HTMLElement} dialog - Dialog element
 * @param {object} options - Options
 * @param {HTMLElement} options.triggerElement - Element that triggered the dialog
 * @param {string} options.labelledBy - ID of element labeling the dialog
 * @param {string} options.describedBy - ID of element describing the dialog
 * @param {HTMLElement} options.initialFocus - Element to focus initially
 * @param {Function} options.onClose - Callback when dialog should close
 * @param {boolean} options.closeOnBackdropClick - Close on backdrop click (default: true)
 * @param {boolean} options.inertBackground - Make background inert (default: true)
 * @returns {object} Control object with open, close methods and isOpen pulse
 */
export function createModal(dialog, options = {}) {
  const {
    labelledBy = null,
    describedBy = null,
    initialFocus = null,
    onClose = null,
    closeOnBackdropClick = true,
    inertBackground = true
  } = options;

  const isOpen = pulse(false);
  let releaseFocusTrap = null;
  let removeEscapeHandler = null;
  let restoreInertFns = null;
  let backdropHandler = null;

  // Set ARIA attributes
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  if (labelledBy) dialog.setAttribute('aria-labelledby', labelledBy);
  if (describedBy) dialog.setAttribute('aria-describedby', describedBy);

  const open = () => {
    if (isOpen.get()) return;

    dialog.hidden = false;
    isOpen.set(true);

    // Make background inert
    if (inertBackground && typeof document !== 'undefined') {
      const siblings = Array.from(document.body.children)
        .filter(el => el !== dialog && !el.hasAttribute('inert'));
      restoreInertFns = siblings.map(el => makeInert(el));
    }

    // Trap focus
    releaseFocusTrap = trapFocus(dialog, {
      autoFocus: true,
      returnFocus: true,
      initialFocus
    });

    // Handle escape key
    removeEscapeHandler = onEscapeKey(dialog, close);

    // Handle backdrop click
    if (closeOnBackdropClick) {
      backdropHandler = (e) => {
        if (e.target === dialog) close();
      };
      dialog.addEventListener('click', backdropHandler);
    }

    // Announce to screen readers
    announce('Dialog opened');
  };

  const close = () => {
    if (!isOpen.get()) return;

    dialog.hidden = true;
    isOpen.set(false);

    // Clean up
    if (releaseFocusTrap) {
      releaseFocusTrap();
      releaseFocusTrap = null;
    }
    if (removeEscapeHandler) {
      removeEscapeHandler();
      removeEscapeHandler = null;
    }
    if (restoreInertFns) {
      restoreInertFns.forEach(restore => restore());
      restoreInertFns = null;
    }
    if (backdropHandler) {
      dialog.removeEventListener('click', backdropHandler);
      backdropHandler = null;
    }

    if (onClose) onClose();
    announce('Dialog closed');
  };

  return { isOpen, open, close };
}

/**
 * Create an accessible tooltip
 * Manages aria-describedby and visibility
 * @param {HTMLElement} trigger - Element that triggers tooltip
 * @param {HTMLElement} tooltip - Tooltip element
 * @param {object} options - Options
 * @param {number} options.showDelay - Delay before showing (ms, default: 500)
 * @param {number} options.hideDelay - Delay before hiding (ms, default: 100)
 * @returns {object} Control object with show, hide methods and isVisible pulse
 */
export function createTooltip(trigger, tooltip, options = {}) {
  const {
    showDelay = 500,
    hideDelay = 100
  } = options;

  const isVisible = pulse(false);
  let showTimer = null;
  let hideTimer = null;

  // Generate ID if needed
  const tooltipId = tooltip.id || generateId('tooltip');
  tooltip.id = tooltipId;

  // Set ARIA attributes
  tooltip.setAttribute('role', 'tooltip');
  trigger.setAttribute('aria-describedby', tooltipId);
  tooltip.hidden = true;

  const show = () => {
    clearTimeout(hideTimer);
    showTimer = setTimeout(() => {
      tooltip.hidden = false;
      isVisible.set(true);
    }, showDelay);
  };

  const hide = () => {
    clearTimeout(showTimer);
    hideTimer = setTimeout(() => {
      tooltip.hidden = true;
      isVisible.set(false);
    }, hideDelay);
  };

  const showImmediate = () => {
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    tooltip.hidden = false;
    isVisible.set(true);
  };

  const hideImmediate = () => {
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    tooltip.hidden = true;
    isVisible.set(false);
  };

  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') hideImmediate();
  };

  // Event listeners
  trigger.addEventListener('mouseenter', show);
  trigger.addEventListener('mouseleave', hide);
  trigger.addEventListener('focus', showImmediate);
  trigger.addEventListener('blur', hideImmediate);
  trigger.addEventListener('keydown', handleEscapeKey);

  const cleanup = () => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    trigger.removeEventListener('mouseenter', show);
    trigger.removeEventListener('mouseleave', hide);
    trigger.removeEventListener('focus', showImmediate);
    trigger.removeEventListener('blur', hideImmediate);
    trigger.removeEventListener('keydown', handleEscapeKey);
    trigger.removeAttribute('aria-describedby');
  };

  return { isVisible, show: showImmediate, hide: hideImmediate, cleanup };
}

/**
 * Create an accessible accordion (composed of disclosures)
 * @param {HTMLElement} container - Accordion container
 * @param {object} options - Options
 * @param {string} options.triggerSelector - Selector for accordion triggers
 * @param {string} options.panelSelector - Selector for accordion panels
 * @param {boolean} options.allowMultiple - Allow multiple panels open (default: false)
 * @param {number} options.defaultOpen - Index of initially open panel (-1 for none)
 * @param {Function} options.onToggle - Callback (index, isOpen) => void
 * @returns {object} Control object
 */
export function createAccordion(container, options = {}) {
  const {
    triggerSelector = '[data-accordion-trigger]',
    panelSelector = '[data-accordion-panel]',
    allowMultiple = false,
    defaultOpen = -1,
    onToggle = null
  } = options;

  const triggers = Array.from(container.querySelectorAll(triggerSelector));
  const panels = Array.from(container.querySelectorAll(panelSelector));
  const disclosures = [];
  const openIndices = pulse(defaultOpen >= 0 ? [defaultOpen] : []);

  triggers.forEach((trigger, index) => {
    const panel = panels[index];
    if (!panel) return;

    const disclosure = createDisclosure(trigger, panel, {
      defaultOpen: index === defaultOpen,
      onToggle: (isExpanded) => {
        if (isExpanded) {
          if (allowMultiple) {
            openIndices.update(arr => arr.includes(index) ? arr : [...arr, index]);
          } else {
            // Close other panels
            disclosures.forEach((d, i) => {
              if (i !== index && d.expanded.get()) d.close();
            });
            openIndices.set([index]);
          }
        } else {
          openIndices.update(arr => arr.filter(i => i !== index));
        }
        if (onToggle) onToggle(index, isExpanded);
      }
    });

    disclosures.push(disclosure);
  });

  return {
    openIndices,
    disclosures,
    openAll: () => {
      if (allowMultiple) {
        disclosures.forEach(d => d.open());
      }
    },
    closeAll: () => {
      disclosures.forEach(d => d.close());
    },
    open: (index) => {
      if (disclosures[index]) disclosures[index].open();
    },
    close: (index) => {
      if (disclosures[index]) disclosures[index].close();
    },
    toggle: (index) => {
      if (disclosures[index]) disclosures[index].toggle();
    }
  };
}

/**
 * Create an accessible dropdown menu
 * @param {HTMLElement} button - Menu button
 * @param {HTMLElement} menu - Menu container
 * @param {object} options - Options
 * @param {string} options.itemSelector - Selector for menu items (default: '[role="menuitem"]')
 * @param {Function} options.onSelect - Callback when item is selected
 * @param {boolean} options.closeOnSelect - Close menu on item selection (default: true)
 * @returns {object} Control object with open, close, toggle methods and isOpen pulse
 */
export function createMenu(button, menu, options = {}) {
  const {
    itemSelector = '[role="menuitem"]',
    onSelect = null,
    closeOnSelect = true
  } = options;

  const isOpen = pulse(false);
  const menuId = menu.id || generateId('menu');
  let rovingCleanup = null;
  let documentClickHandler = null;

  // Set ARIA attributes
  menu.id = menuId;
  menu.setAttribute('role', 'menu');
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-controls', menuId);
  button.setAttribute('aria-expanded', 'false');
  menu.hidden = true;

  const open = () => {
    if (isOpen.get()) return;

    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    isOpen.set(true);

    // Setup roving tabindex for menu items
    rovingCleanup = createRovingTabindex(menu, {
      selector: itemSelector,
      orientation: 'vertical',
      onSelect: (el, index) => {
        if (onSelect) onSelect(el, index);
        if (closeOnSelect) close();
      }
    });

    // Focus first item
    const firstItem = menu.querySelector(itemSelector);
    if (firstItem) firstItem.focus();

    // Close on click outside (delay to avoid immediate close)
    setTimeout(() => {
      documentClickHandler = (e) => {
        if (!button.contains(e.target) && !menu.contains(e.target)) {
          close();
        }
      };
      document.addEventListener('click', documentClickHandler);
    }, 0);
  };

  const close = () => {
    if (!isOpen.get()) return;

    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    isOpen.set(false);

    if (rovingCleanup) {
      rovingCleanup();
      rovingCleanup = null;
    }

    if (documentClickHandler) {
      document.removeEventListener('click', documentClickHandler);
      documentClickHandler = null;
    }

    button.focus();
  };

  const toggle = () => isOpen.get() ? close() : open();

  // Button click
  button.addEventListener('click', toggle);

  // Keyboard navigation on button
  const handleButtonKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      open();
    }
  };
  button.addEventListener('keydown', handleButtonKeyDown);

  // Close on escape
  const handleMenuKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  menu.addEventListener('keydown', handleMenuKeyDown);

  const cleanup = () => {
    button.removeEventListener('click', toggle);
    button.removeEventListener('keydown', handleButtonKeyDown);
    menu.removeEventListener('keydown', handleMenuKeyDown);
    if (documentClickHandler) {
      document.removeEventListener('click', documentClickHandler);
    }
    if (rovingCleanup) {
      rovingCleanup();
    }
  };

  return { isOpen, open, close, toggle, cleanup };
}

// =============================================================================
// VALIDATION & AUDITING
// =============================================================================

/**
 * A11y issues found during validation
 * @typedef {object} A11yIssue
 * @property {'error'|'warning'} severity - Issue severity
 * @property {string} rule - Rule identifier
 * @property {string} message - Human-readable message
 * @property {HTMLElement} element - The element with the issue
 */

/**
 * Validate accessibility of a container
 * @param {HTMLElement} container - Container to validate (default: document.body)
 * @returns {A11yIssue[]} Array of issues found
 */
export function validateA11y(container = document.body) {
  const issues = [];

  const addIssue = (severity, rule, message, element) => {
    issues.push({ severity, rule, message, element });
  };

  // Check images for alt text
  container.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('alt')) {
      addIssue('error', 'img-alt', 'Image missing alt attribute', img);
    } else if (img.alt === '') {
      // Empty alt is OK for decorative images, but warn
      if (!img.getAttribute('role')?.includes('presentation')) {
        addIssue('warning', 'img-alt-empty', 'Image has empty alt - ensure it is decorative', img);
      }
    }
  });

  // Check buttons for accessible names
  container.querySelectorAll('button').forEach(button => {
    const hasText = button.textContent.trim().length > 0;
    const hasAriaLabel = button.hasAttribute('aria-label');
    const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');
    const hasTitle = button.hasAttribute('title');

    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      addIssue('error', 'button-name', 'Button has no accessible name', button);
    }
  });

  // Check links for accessible names
  container.querySelectorAll('a[href]').forEach(link => {
    const hasText = link.textContent.trim().length > 0;
    const hasAriaLabel = link.hasAttribute('aria-label');
    const hasImg = link.querySelector('img[alt]');

    if (!hasText && !hasAriaLabel && !hasImg) {
      addIssue('error', 'link-name', 'Link has no accessible name', link);
    }
  });

  // Check form inputs for labels
  container.querySelectorAll('input, select, textarea').forEach(input => {
    if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') return;

    const id = input.id;
    const hasLabel = id && container.querySelector(`label[for="${id}"]`);
    const hasAriaLabel = input.hasAttribute('aria-label');
    const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');
    const isWrappedByLabel = input.closest('label');
    const hasPlaceholder = input.hasAttribute('placeholder');

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !isWrappedByLabel) {
      const msg = hasPlaceholder
        ? 'Form input uses placeholder but missing label (placeholder is not a label substitute)'
        : 'Form input missing associated label';
      addIssue('error', 'input-label', msg, input);
    }
  });

  // Check for positive tabindex (anti-pattern)
  container.querySelectorAll('[tabindex]').forEach(el => {
    const tabindex = parseInt(el.getAttribute('tabindex'), 10);
    if (tabindex > 0) {
      addIssue('warning', 'tabindex-positive', 'Avoid positive tabindex values - use DOM order instead', el);
    }
  });

  // Check for click handlers on non-interactive elements
  container.querySelectorAll('div[onclick], span[onclick]').forEach(el => {
    if (!el.hasAttribute('role') && !el.hasAttribute('tabindex')) {
      addIssue('warning', 'click-non-interactive', 'Click handler on non-interactive element - consider using button', el);
    }
  });

  // Check headings hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1], 10);
    if (level > lastLevel + 1 && lastLevel !== 0) {
      addIssue('warning', 'heading-order', `Heading level skipped (h${lastLevel} to h${level})`, heading);
    }
    lastLevel = level;
  });

  // Check for autoplay media
  container.querySelectorAll('video[autoplay], audio[autoplay]').forEach(media => {
    if (!media.hasAttribute('muted')) {
      addIssue('warning', 'media-autoplay', 'Autoplaying media should be muted', media);
    }
  });

  // Check for duplicate IDs
  const idMap = new Map();
  container.querySelectorAll('[id]').forEach(el => {
    const id = el.id;
    if (id) {
      if (idMap.has(id)) {
        addIssue('error', 'duplicate-id', `Duplicate ID "${id}" found`, el);
      } else {
        idMap.set(id, el);
      }
    }
  });

  // Check for landmark regions (main, nav, etc.)
  if (typeof container.querySelector === 'function' && container === document.body) {
    const hasMain = container.querySelector('main, [role="main"]');
    if (!hasMain) {
      addIssue('warning', 'missing-main', 'Page should have a <main> landmark', document.body);
    }
  }

  // Check for nested interactive elements
  container.querySelectorAll('a, button').forEach(el => {
    if (typeof el.querySelector === 'function') {
      const nestedInteractive = el.querySelector('a, button, input, select, textarea');
      if (nestedInteractive) {
        addIssue('error', 'nested-interactive',
          'Interactive elements should not be nested inside other interactive elements', el);
      }
    }
  });

  // Check for missing html lang attribute
  if (container === document.body && typeof document !== 'undefined' && document.documentElement) {
    const lang = document.documentElement.getAttribute?.('lang');
    if (!lang) {
      addIssue('warning', 'missing-lang',
        'Document should have a lang attribute on <html>', document.documentElement);
    }
  }

  // Check for touch target sizes (WCAG 2.2 - 24x24px minimum)
  if (typeof getComputedStyle === 'function') {
    container.querySelectorAll('a, button, input, select, [role="button"], [role="link"]').forEach(el => {
      if (typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24)) {
          // Only flag if element is visible
          const style = getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            addIssue('warning', 'touch-target-size',
              `Touch target (${Math.round(rect.width)}x${Math.round(rect.height)}px) smaller than 24x24px minimum`,
              el);
          }
        }
      }
    });
  }

  return issues;
}

/**
 * Log validation results to console
 * @param {A11yIssue[]} issues - Issues from validateA11y
 */
export function logA11yIssues(issues) {
  if (issues.length === 0) {
    console.log('%c✓ No accessibility issues found', 'color: green; font-weight: bold');
    return;
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  console.group(`%cAccessibility Issues (${errors.length} errors, ${warnings.length} warnings)`,
    'color: red; font-weight: bold');

  issues.forEach(issue => {
    const icon = issue.severity === 'error' ? '❌' : '⚠️';
    const color = issue.severity === 'error' ? 'color: red' : 'color: orange';
    console.log(`%c${icon} [${issue.rule}] ${issue.message}`, color, issue.element);
  });

  console.groupEnd();
}

/**
 * Highlight elements with accessibility issues in the DOM
 * @param {A11yIssue[]} issues - Issues from validateA11y
 * @returns {Function} Cleanup function to remove highlights
 */
export function highlightA11yIssues(issues) {
  const highlights = [];

  issues.forEach(issue => {
    const el = issue.element;
    const rect = el.getBoundingClientRect();

    const highlight = document.createElement('div');
    highlight.className = 'pulse-a11y-highlight';
    highlight.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${issue.severity === 'error' ? 'red' : 'orange'};
      background: ${issue.severity === 'error' ? 'rgba(255,0,0,0.1)' : 'rgba(255,165,0,0.1)'};
      pointer-events: none;
      z-index: 99999;
    `;

    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      background: ${issue.severity === 'error' ? 'red' : 'orange'};
      color: white;
      font-size: 10px;
      padding: 2px 4px;
      border-radius: 2px;
      white-space: nowrap;
    `;
    label.textContent = issue.rule;
    highlight.appendChild(label);

    document.body.appendChild(highlight);
    highlights.push(highlight);
  });

  return () => {
    highlights.forEach(h => h.remove());
  };
}

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

// =============================================================================
// ANNOUNCEMENT QUEUE
// =============================================================================

/**
 * Create an announcement queue that handles multiple messages in sequence
 * @param {object} options - Options
 * @param {number} options.minDelay - Minimum delay between announcements (ms, default: 500)
 * @returns {object} Queue control object
 */
export function createAnnouncementQueue(options = {}) {
  const { minDelay = 500 } = options;

  const queue = [];
  let isProcessing = false;
  let currentTimerId = null;
  let aborted = false;
  const queueLength = pulse(0);

  const processQueue = async () => {
    if (isProcessing || queue.length === 0 || aborted) return;

    isProcessing = true;

    while (queue.length > 0 && !aborted) {
      const { message, priority, clearAfter } = queue.shift();
      queueLength.set(queue.length);

      announce(message, { priority, clearAfter });

      // Wait for announcement to be read
      await new Promise(resolve => {
        currentTimerId = setTimeout(resolve,
          Math.max(minDelay, clearAfter || 1000));
      });
      currentTimerId = null;
    }

    isProcessing = false;
  };

  const dispose = () => {
    aborted = true;
    if (currentTimerId !== null) {
      clearTimeout(currentTimerId);
      currentTimerId = null;
    }
    queue.length = 0;
    queueLength.set(0);
    isProcessing = false;
  };

  return {
    queueLength,
    /**
     * Add a message to the queue
     * @param {string} message - Message to announce
     * @param {object} options - Announcement options (priority, clearAfter)
     */
    add: (message, opts = {}) => {
      if (aborted) return;
      queue.push({ message, ...opts });
      queueLength.set(queue.length);
      processQueue();
    },
    /**
     * Clear the queue
     */
    clear: () => {
      queue.length = 0;
      queueLength.set(0);
    },
    /**
     * Check if queue is being processed
     * @returns {boolean}
     */
    isProcessing: () => isProcessing,
    /**
     * Dispose the queue, cancelling any pending timers
     */
    dispose
  };
}

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

  // 5. alt attribute (for images)
  if (element.tagName === 'IMG') {
    const alt = element.getAttribute('alt');
    if (alt) return alt;
  }

  // 6. Text content (for buttons, links)
  const textContent = element.textContent?.trim();
  if (textContent) {
    return textContent;
  }

  // 7. value attribute (for inputs with type=button/submit)
  const type = element.getAttribute('type');
  if (element.tagName === 'INPUT' && (type === 'button' || type === 'submit')) {
    return element.value || '';
  }

  return '';
}

/**
 * Check if an element is visible to screen readers
 * @param {HTMLElement} element - Element to check
 * @returns {boolean}
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
 * Make an element inert (non-interactive, hidden from a11y tree)
 * @param {HTMLElement} element - Element to make inert
 * @returns {Function} Restore function
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
 * Create screen reader only text (visually hidden)
 * @param {string} text - Text content
 * @returns {HTMLElement} Span element
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

// Default export for convenience
export default {
  // Announcements
  announce,
  announcePolite,
  announceAssertive,
  createLiveAnnouncer,
  createAnnouncementQueue,

  // Focus
  trapFocus,
  focusFirst,
  focusLast,
  saveFocus,
  restoreFocus,
  getFocusableElements,
  onEscapeKey,
  createFocusVisibleTracker,

  // Skip links
  createSkipLink,
  installSkipLinks,

  // Preferences
  prefersReducedMotion,
  prefersColorScheme,
  prefersHighContrast,
  prefersReducedTransparency,
  forcedColorsMode,
  prefersContrast,
  createPreferences,

  // ARIA helpers
  setAriaAttributes,
  createDisclosure,
  createTabs,
  createRovingTabindex,

  // ARIA widgets
  createModal,
  createTooltip,
  createAccordion,
  createMenu,

  // Color contrast
  getContrastRatio,
  meetsContrastRequirement,
  getEffectiveBackgroundColor,
  checkElementContrast,

  // Validation
  validateA11y,
  logA11yIssues,
  highlightA11yIssues,

  // Utilities
  generateId,
  getAccessibleName,
  isAccessiblyHidden,
  makeInert,
  srOnly
};
