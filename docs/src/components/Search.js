/**
 * Pulse Documentation - Search Component
 * Global search with Cmd/Ctrl+K shortcut
 */

import { el, effect, pulse } from '/runtime/index.js';
import { searchOpen, navStructureFlat, navigateLocale, t, locale } from '../state.js';

// Search state
const searchQuery = pulse('');
const selectedIndex = pulse(0);

// SVG icons (aria-hidden for decorative icons)
const SearchIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

/**
 * Get filtered search results
 * @param {string} query - Search query
 * @returns {Array} Filtered results
 */
function getSearchResults(query) {
  if (!query.trim()) {
    return navStructureFlat.slice(0, 8); // Show first 8 pages when empty
  }

  const normalizedQuery = query.toLowerCase().trim();

  return navStructureFlat
    .filter(item => {
      const label = t(item.labelKey).toLowerCase();
      // Remove emoji for matching
      const cleanLabel = label.replace(/^[^\s]+\s/, '');
      return cleanLabel.includes(normalizedQuery) || label.includes(normalizedQuery);
    })
    .slice(0, 10); // Limit to 10 results
}

/**
 * Create Search Button for header
 * @returns {HTMLElement}
 */
export function SearchButton() {
  const btn = el('button.search-btn');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Open search');

  btn.innerHTML = `
    ${SearchIcon}
    <span>Search</span>
    <span class="search-shortcut">⌘K</span>
  `;

  btn.addEventListener('click', () => {
    searchOpen.set(true);
  });

  // Update text reactively
  effect(() => {
    locale.get();
    const span = btn.querySelector('span:not(.search-shortcut)');
    if (span) span.textContent = t('actions.search');
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
  input.type = 'text';
  input.setAttribute('aria-label', 'Search');

  const closeBtn = el('button.search-close', 'Esc');
  closeBtn.type = 'button';
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
          navigateLocale(selected.path);
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
      `;
      results.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const result = el('div.search-result');
      result.setAttribute('role', 'option');
      result.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');

      if (index === activeIndex) {
        result.classList.add('active');
      }

      const label = t(item.labelKey);
      const emoji = label.match(/^[^\s]+/)?.[0] || '📄';
      const title = label.replace(/^[^\s]+\s/, '');

      result.innerHTML = `
        <span class="search-result-icon">${emoji}</span>
        <div class="search-result-content">
          <div class="search-result-title">${title}</div>
        </div>
        <span class="search-result-arrow">→</span>
      `;

      result.addEventListener('click', () => {
        navigateLocale(item.path);
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
