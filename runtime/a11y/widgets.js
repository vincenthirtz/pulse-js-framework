/**
 * Pulse A11y - ARIA Widgets
 *
 * ARIA widget implementations (modal, tabs, accordion, etc.)
 *
 * @module pulse-js-framework/runtime/a11y/widgets
 */

import { pulse, effect } from '../pulse.js';
import { generateId, makeInert } from './utils.js';
import { trapFocus, onEscapeKey, createRovingTabindex } from './focus.js';

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
  let documentClickTimeout = null;

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
    documentClickTimeout = setTimeout(() => {
      documentClickTimeout = null;
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

    if (documentClickTimeout) {
      clearTimeout(documentClickTimeout);
      documentClickTimeout = null;
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
    if (documentClickTimeout) {
      clearTimeout(documentClickTimeout);
      documentClickTimeout = null;
    }
    if (documentClickHandler) {
      document.removeEventListener('click', documentClickHandler);
      documentClickHandler = null;
    }
    if (rovingCleanup) {
      rovingCleanup();
      rovingCleanup = null;
    }
  };

  return { isOpen, open, close, toggle, cleanup };
}
