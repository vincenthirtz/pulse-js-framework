/**
 * Pulse A11y - Accessibility Validation
 *
 * A11y validation and auditing tools
 *
 * @module pulse-js-framework/runtime/a11y/validation
 */

import { pulse } from '../pulse.js';

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
