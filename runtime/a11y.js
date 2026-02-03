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
 * Create reactive user preferences pulse
 * @returns {object} Object with reactive preference pulses
 */
export function createPreferences() {
  const reducedMotion = pulse(prefersReducedMotion());
  const colorScheme = pulse(prefersColorScheme());
  const highContrast = pulse(prefersHighContrast());

  if (typeof window !== 'undefined') {
    // Listen for preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      reducedMotion.set(e.matches);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      colorScheme.set(e.matches ? 'dark' : 'light');
    });

    window.matchMedia('(prefers-contrast: more)').addEventListener('change', (e) => {
      highContrast.set(e.matches);
    });
  }

  return {
    reducedMotion,
    colorScheme,
    highContrast
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

  // Focus
  trapFocus,
  focusFirst,
  focusLast,
  saveFocus,
  restoreFocus,
  getFocusableElements,

  // Skip links
  createSkipLink,
  installSkipLinks,

  // Preferences
  prefersReducedMotion,
  prefersColorScheme,
  prefersHighContrast,
  createPreferences,

  // ARIA helpers
  setAriaAttributes,
  createDisclosure,
  createTabs,
  createRovingTabindex,

  // Validation
  validateA11y,
  logA11yIssues,
  highlightA11yIssues,

  // Utilities
  generateId,
  isAccessiblyHidden,
  makeInert,
  srOnly
};
