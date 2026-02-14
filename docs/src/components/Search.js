/**
 * Pulse Documentation - Search Component
 * Global search with Cmd/Ctrl+K shortcut
 *
 * Features:
 * - Page search with descriptions
 * - Quick links to API concepts
 * - External resources (GitHub, NPM)
 * - Category-based filtering
 */

import { el, effect, pulse } from '/runtime/index.js';
import { searchOpen, navStructure, navigateLocale, t, locale, translations } from '../state.js';

// Search state
const searchQuery = pulse('');
const selectedIndex = pulse(0);

// SVG icons (aria-hidden for decorative icons)
const SearchIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
const ExternalLinkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="12" height="12"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const HashIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="14" height="14"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>`;

/**
 * Quick links for common API concepts
 * These provide direct links to specific sections within pages
 */
const quickLinks = [
  // Reactivity
  { path: '/api-reference#pulse', label: 'pulse()', desc: 'Create reactive state', category: 'Reactivity', emoji: '💫' },
  { path: '/api-reference#effect', label: 'effect()', desc: 'Run side effects on state changes', category: 'Reactivity', emoji: '⚡' },
  { path: '/api-reference#computed', label: 'computed()', desc: 'Derived reactive values', category: 'Reactivity', emoji: '🔄' },
  { path: '/api-reference#batch', label: 'batch()', desc: 'Group multiple updates', category: 'Reactivity', emoji: '📦' },
  // DOM
  { path: '/api-reference#el', label: 'el()', desc: 'Create DOM elements', category: 'DOM', emoji: '🏗️' },
  { path: '/api-reference#mount', label: 'mount()', desc: 'Attach components to DOM', category: 'DOM', emoji: '📌' },
  { path: '/api-reference#list', label: 'list()', desc: 'Render reactive lists', category: 'DOM', emoji: '📋' },
  { path: '/api-reference#when', label: 'when()', desc: 'Conditional rendering', category: 'DOM', emoji: '❓' },
  // Router
  { path: '/api-reference#createRouter', label: 'createRouter()', desc: 'Create SPA router', category: 'Router', emoji: '🧭' },
  { path: '/api-reference#lazy', label: 'lazy()', desc: 'Code-split routes', category: 'Router', emoji: '⏳' },
  // Store
  { path: '/api-reference#createStore', label: 'createStore()', desc: 'Global state management', category: 'Store', emoji: '🗄️' },
  // HTTP & WebSocket
  { path: '/http#createHttp', label: 'createHttp()', desc: 'HTTP client with interceptors', category: 'HTTP', emoji: '🌐' },
  { path: '/websocket#createWebSocket', label: 'createWebSocket()', desc: 'WebSocket with auto-reconnect', category: 'WebSocket', emoji: '🔌' },
  { path: '/graphql#useQuery', label: 'useQuery()', desc: 'GraphQL queries with caching', category: 'GraphQL', emoji: '🔮' },
  // Forms & Async
  { path: '/api-reference#useForm', label: 'useForm()', desc: 'Form state & validation', category: 'Forms', emoji: '📝' },
  { path: '/api-reference#useAsync', label: 'useAsync()', desc: 'Async operations with loading states', category: 'Async', emoji: '⏱️' },
  // Context & SSR
  { path: '/context#createContext', label: 'createContext()', desc: 'Dependency injection', category: 'Context', emoji: '🎯' },
  { path: '/ssr#renderToString', label: 'renderToString()', desc: 'Server-side rendering', category: 'SSR', emoji: '🖥️' },
];

/**
 * External resources (open in new tab)
 */
const externalLinks = [
  { url: 'https://github.com/vincenthirtz/pulse-js-framework', label: 'GitHub Repository', desc: 'Source code & issues', category: 'External', emoji: '📂' },
  { url: 'https://www.npmjs.com/package/pulse-js-framework', label: 'NPM Package', desc: 'Install via npm', category: 'External', emoji: '📦' },
  { url: 'https://github.com/vincenthirtz/pulse-js-framework/releases', label: 'Releases', desc: 'Version history & downloads', category: 'External', emoji: '🏷️' },
  { url: 'https://github.com/vincenthirtz/pulse-js-framework/issues', label: 'Issues & Bugs', desc: 'Report problems or request features', category: 'External', emoji: '🐛' },
  { url: 'https://github.com/vincenthirtz/pulse-js-framework/discussions', label: 'Discussions', desc: 'Community Q&A', category: 'External', emoji: '💬' },
];

/**
 * Build the full list of nav items with descriptions from navStructure
 */
function getNavItemsWithDesc() {
  return navStructure
    .flatMap(item => {
      if (item.hidden) return [];
      if (item.children) {
        return item.children.map(child => ({
          path: child.path,
          labelKey: child.labelKey,
          descKey: child.descKey,
          type: 'page'
        }));
      }
      return [{
        path: item.path,
        labelKey: item.labelKey,
        descKey: item.descKey,
        type: 'page'
      }];
    });
}

/**
 * Get filtered search results
 * Searches pages, quick links, and external resources
 * @param {string} query - Search query
 * @returns {Array} Filtered results with type indicators
 */
function getSearchResults(query) {
  const navItems = getNavItemsWithDesc();

  if (!query.trim()) {
    // Show mix of pages and quick links when empty
    const pages = navItems.slice(0, 5).map(item => ({
      ...item,
      label: t(item.labelKey),
      desc: item.descKey ? t(item.descKey) : ''
    }));
    const links = quickLinks.slice(0, 3).map(item => ({
      ...item,
      type: 'quicklink'
    }));
    return [...pages, ...links];
  }

  const normalizedQuery = query.toLowerCase().trim();

  // Search pages
  const pageResults = navItems
    .filter(item => {
      const label = t(item.labelKey).toLowerCase();
      const desc = item.descKey ? t(item.descKey).toLowerCase() : '';
      const cleanLabel = label.replace(/^[^\s]+\s/, '');
      return cleanLabel.includes(normalizedQuery) ||
             label.includes(normalizedQuery) ||
             desc.includes(normalizedQuery);
    })
    .map(item => ({
      ...item,
      label: t(item.labelKey),
      desc: item.descKey ? t(item.descKey) : ''
    }));

  // Search quick links
  const quickLinkResults = quickLinks
    .filter(item => {
      const label = item.label.toLowerCase();
      const desc = item.desc.toLowerCase();
      const category = item.category.toLowerCase();
      return label.includes(normalizedQuery) ||
             desc.includes(normalizedQuery) ||
             category.includes(normalizedQuery);
    })
    .map(item => ({ ...item, type: 'quicklink' }));

  // Search external links
  const externalResults = externalLinks
    .filter(item => {
      const label = item.label.toLowerCase();
      const desc = item.desc.toLowerCase();
      return label.includes(normalizedQuery) ||
             desc.includes(normalizedQuery);
    })
    .map(item => ({ ...item, type: 'external' }));

  // Combine and limit results (prioritize pages, then quick links, then external)
  return [...pageResults, ...quickLinkResults, ...externalResults].slice(0, 12);
}

/**
 * Create Search Button for header
 * @returns {HTMLElement}
 */
export function SearchButton() {
  const btn = el('button.search-btn');
  btn.type = 'button';
  // Note: aria-label is set dynamically to match visible text (WCAG 2.5.3)

  btn.innerHTML = `
    ${SearchIcon}
    <span>Search</span>
    <span class="search-shortcut">⌘K</span>
  `;

  btn.addEventListener('click', () => {
    searchOpen.set(true);
  });

  // Update text and aria-label reactively (WCAG 2.5.3: aria-label must match visible text)
  effect(() => {
    locale.get();
    const span = btn.querySelector('span:not(.search-shortcut)');
    const searchText = t('actions.search');
    if (span) span.textContent = searchText;
    btn.setAttribute('aria-label', searchText);
  });

  return btn;
}

/**
 * Create Search Modal
 * @returns {HTMLElement}
 */
export function SearchModal() {
  const overlay = el('div.search-overlay');
  overlay.style.display = 'none';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'search-modal-title');

  const modal = el('div.search-modal');

  // Hidden title for screen readers (WCAG 4.1.2)
  const modalTitle = el('h2#search-modal-title');
  modalTitle.textContent = 'Search documentation';
  modalTitle.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;';
  modal.appendChild(modalTitle);

  // Track previously focused element for focus restoration
  let previouslyFocused = null;

  // Header with input
  const header = el('div.search-header');
  header.innerHTML = SearchIcon;

  const input = el('input.search-input');
  input.type = 'search';
  input.id = 'search-input';
  input.setAttribute('aria-label', 'Search documentation');
  input.setAttribute('aria-describedby', 'search-modal-title');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');

  const closeBtn = el('button.search-close', 'Esc');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close search');
  closeBtn.addEventListener('click', () => searchOpen.set(false));

  header.appendChild(input);
  header.appendChild(closeBtn);

  // Results container
  const results = el('div.search-results');
  results.setAttribute('role', 'listbox');
  results.setAttribute('aria-label', 'Search results');

  // Keyboard hints
  const hints = el('div.search-hint');
  hints.innerHTML = `
    <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
    <span><kbd>Enter</kbd> Select</span>
    <span><kbd>Esc</kbd> Close</span>
  `;

  modal.appendChild(header);
  modal.appendChild(results);
  modal.appendChild(hints);
  overlay.appendChild(modal);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      searchOpen.set(false);
    }
  });

  // Input handling
  input.addEventListener('input', (e) => {
    searchQuery.set(e.target.value);
    selectedIndex.set(0);
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const resultItems = getSearchResults(searchQuery.get());

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex.update(i => Math.min(i + 1, resultItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex.update(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        const selected = resultItems[selectedIndex.get()];
        if (selected) {
          if (selected.type === 'external') {
            window.open(selected.url, '_blank', 'noopener,noreferrer');
          } else {
            navigateLocale(selected.path);
          }
          searchOpen.set(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        searchOpen.set(false);
        break;
    }
  });

  // Render results
  function renderResults() {
    const query = searchQuery.get();
    const items = getSearchResults(query);
    const activeIndex = selectedIndex.get();

    results.innerHTML = '';

    if (items.length === 0) {
      const empty = el('div.search-empty');
      empty.innerHTML = `
        <div class="search-empty-icon">🔍</div>
        <div>${t('search.noResults')} "${query}"</div>
        <div class="search-empty-hint">${t('search.tryDifferent')}</div>
      `;
      results.appendChild(empty);
      return;
    }

    // Group results by type for visual separation
    let lastType = null;

    items.forEach((item, index) => {
      // Add section divider when type changes (only when searching)
      if (item.type !== lastType && query.trim()) {
        const divider = el('div.search-divider');
        const typeLabels = {
          'page': t('search.pages'),
          'quicklink': t('search.quickLinks'),
          'external': t('search.externalLinks')
        };
        divider.textContent = typeLabels[item.type] || '';
        results.appendChild(divider);
        lastType = item.type;
      }

      const result = el('div.search-result');
      result.setAttribute('role', 'option');
      result.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');

      if (index === activeIndex) {
        result.classList.add('active');
      }

      // Handle different result types
      let emoji, title, desc, category, isExternal;

      if (item.type === 'page') {
        const label = item.label || t(item.labelKey);
        emoji = label.match(/^[^\s]+/)?.[0] || '📄';
        title = label.replace(/^[^\s]+\s/, '');
        desc = item.desc || '';
        isExternal = false;
      } else if (item.type === 'quicklink') {
        emoji = item.emoji || '🔗';
        title = item.label;
        desc = item.desc;
        category = item.category;
        isExternal = false;
      } else if (item.type === 'external') {
        emoji = item.emoji || '🔗';
        title = item.label;
        desc = item.desc;
        isExternal = true;
      }

      // Build result HTML with description and category
      const descHtml = desc ? `<div class="search-result-desc">${desc}</div>` : '';
      const categoryHtml = category ? `<span class="search-result-category">${category}</span>` : '';
      const externalHtml = isExternal ? `<span class="search-result-external">${ExternalLinkIcon}</span>` : '';
      const hashHtml = item.type === 'quicklink' ? `<span class="search-result-hash">${HashIcon}</span>` : '';

      result.innerHTML = `
        <span class="search-result-icon">${emoji}</span>
        <div class="search-result-content">
          <div class="search-result-title">
            ${hashHtml}${title}${categoryHtml}
          </div>
          ${descHtml}
        </div>
        ${externalHtml}<span class="search-result-arrow">${isExternal ? '↗' : '→'}</span>
      `;

      result.addEventListener('click', () => {
        if (item.type === 'external') {
          window.open(item.url, '_blank', 'noopener,noreferrer');
        } else {
          navigateLocale(item.path);
        }
        searchOpen.set(false);
      });

      result.addEventListener('mouseenter', () => {
        selectedIndex.set(index);
      });

      results.appendChild(result);
    });
  }

  // Focus trap for modal (WCAG 2.4.3)
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const focusable = modal.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // React to state changes
  effect(() => {
    const isOpen = searchOpen.get();
    overlay.style.display = isOpen ? 'flex' : 'none';

    if (isOpen) {
      // Save currently focused element
      previouslyFocused = document.activeElement;
      searchQuery.set('');
      selectedIndex.set(0);
      // Focus input after render
      requestAnimationFrame(() => {
        input.focus();
        input.placeholder = t('actions.searchPlaceholder');
      });
    } else if (previouslyFocused) {
      // Restore focus when closing (WCAG 2.4.3)
      requestAnimationFrame(() => {
        previouslyFocused.focus();
        previouslyFocused = null;
      });
    }
  });

  effect(() => {
    searchQuery.get();
    selectedIndex.get();
    locale.get();
    translations.get();
    renderResults();
  });

  return overlay;
}

/**
 * Initialize global keyboard shortcut
 */
export function initSearchKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchOpen.update(v => !v);
    }
  });
}
