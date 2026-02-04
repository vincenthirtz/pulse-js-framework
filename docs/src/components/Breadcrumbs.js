/**
 * Pulse Documentation - Breadcrumbs Component
 * Shows hierarchical navigation: Home > Category > Page
 */

import { el, effect } from '/runtime/index.js';
import { router, navStructure, navigateLocale, t, locale } from '../state.js';
import { getPathWithoutLocale } from '../i18n/index.js';

/**
 * Get breadcrumb trail for current path
 * @param {string} path - Current path without locale prefix
 * @returns {Array} Array of {path, labelKey, isCurrent}
 */
function getBreadcrumbTrail(path) {
  const trail = [];

  // Always add Home first (but not if we're on home)
  if (path === '/') {
    return [];
  }

  trail.push({ path: '/', labelKey: 'nav.home', isCurrent: false });

  // Find the category and page in navStructure
  for (const item of navStructure) {
    if (item.children) {
      const child = item.children.find(c => c.path === path);
      if (child) {
        // Add category (no link, just label)
        trail.push({ labelKey: item.labelKey, isCurrent: false });
        // Add current page
        trail.push({ path: child.path, labelKey: child.labelKey, isCurrent: true });
        return trail;
      }
    } else if (item.path === path) {
      // Direct top-level item
      trail.push({ path: item.path, labelKey: item.labelKey, isCurrent: true });
      return trail;
    }
  }

  // Fallback: just show the path
  return trail;
}

/**
 * Create Breadcrumbs component
 * @returns {HTMLElement}
 */
export function Breadcrumbs() {
  const nav = el('nav.breadcrumbs');
  nav.setAttribute('aria-label', 'Breadcrumb');

  function render() {
    const path = getPathWithoutLocale();
    const trail = getBreadcrumbTrail(path);

    // Clear existing content
    nav.innerHTML = '';

    if (trail.length === 0) {
      nav.style.display = 'none';
      return;
    }

    nav.style.display = 'flex';

    trail.forEach((item, index) => {
      const wrapper = el('span.breadcrumb-item');

      // Add separator before all except first
      if (index > 0) {
        wrapper.appendChild(el('span.breadcrumb-separator', '›'));
      }

      if (item.isCurrent) {
        // Current page - no link
        const current = el('span.breadcrumb-current');
        current.textContent = t(item.labelKey).replace(/^[^\s]+\s/, ''); // Remove emoji
        wrapper.appendChild(current);
      } else if (item.path) {
        // Linked item
        const link = el('a.breadcrumb-link');
        link.href = item.path;
        link.textContent = t(item.labelKey).replace(/^[^\s]+\s/, ''); // Remove emoji
        link.addEventListener('click', (e) => {
          e.preventDefault();
          navigateLocale(item.path);
        });
        wrapper.appendChild(link);
      } else {
        // Category without link
        const span = el('span.breadcrumb-link');
        span.textContent = t(item.labelKey).replace(/^[^\s]+\s/, ''); // Remove emoji
        wrapper.appendChild(span);
      }

      nav.appendChild(wrapper);
    });
  }

  // Initial render and re-render on route/locale change
  effect(() => {
    locale.get(); // Track locale changes
    if (router) {
      router.path.get(); // Track route changes
    }
    render();
  });

  return nav;
}
