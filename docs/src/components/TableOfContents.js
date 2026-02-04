/**
 * Pulse Documentation - Table of Contents Component
 * Shows page sections with scroll-spy highlighting
 */

import { el, effect, pulse } from '/runtime/index.js';
import { router, tocItems, currentSection, tocExpanded, tocSidebarCollapsed, t, locale } from '../state.js';
import { getPathWithoutLocale } from '../i18n/index.js';

// Pages where TOC should not be shown
const EXCLUDED_PATHS = ['/', '/examples', '/playground', '/benchmarks', '/changelog'];

// SVG icons
const ListIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`;
const ChevronIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const ChevronRightIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
const ChevronLeftIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;

/**
 * Convert text to URL-friendly slug
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')      // Spaces to hyphens
    .replace(/-+/g, '-')       // Collapse multiple hyphens
    .trim();
}

/**
 * Extract headings from a container and assign IDs
 * @param {HTMLElement} container
 * @returns {Array} Array of {id, text, level}
 */
export function extractHeadings(container) {
  if (!container) return [];

  const headings = container.querySelectorAll('h2, h3');
  const items = [];
  const usedIds = new Set();

  headings.forEach((heading) => {
    const text = heading.textContent.trim();
    if (!text) return;

    // Generate or get ID
    let id = heading.id;
    if (!id) {
      id = slugify(text);
      // Ensure unique ID
      let uniqueId = id;
      let counter = 2;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${id}-${counter}`;
        counter++;
      }
      id = uniqueId;
      heading.id = id;
    }
    usedIds.add(id);

    items.push({
      id,
      text,
      level: parseInt(heading.tagName[1], 10)
    });
  });

  return items;
}

/**
 * Set up scroll spy to track visible sections
 * @param {Array} items - TOC items
 * @returns {Function} Cleanup function
 */
function setupScrollSpy(items) {
  if (items.length === 0) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      // Find the first visible heading
      for (const entry of entries) {
        if (entry.isIntersecting) {
          currentSection.set(entry.target.id);
          break;
        }
      }
    },
    {
      rootMargin: '-80px 0px -70% 0px', // Account for header and prefer top sections
      threshold: 0
    }
  );

  // Observe all heading elements
  items.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) observer.observe(el);
  });

  return () => observer.disconnect();
}

/**
 * Scroll to a section smoothly
 * @param {string} id - Element ID
 */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    const headerOffset = 80;
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });

    // Update URL hash without scrolling
    history.replaceState(null, '', `#${id}`);
  }
}

/**
 * Create TOC link list
 * @param {Array} items
 * @param {string} activeId
 * @returns {HTMLElement}
 */
function createTocList(items, activeId) {
  const list = el('ul.toc-list');

  items.forEach(item => {
    const li = el('li.toc-item');
    const link = el('a.toc-link');
    link.href = `#${item.id}`;
    link.textContent = item.text;

    if (item.level === 3) {
      link.classList.add('level-3');
    }
    if (item.id === activeId) {
      link.classList.add('active');
    }

    link.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToSection(item.id);
      tocExpanded.set(false); // Close mobile TOC
    });

    li.appendChild(link);
    list.appendChild(li);
  });

  return list;
}

/**
 * Check if TOC should be shown for current path
 * @returns {boolean}
 */
function shouldShowToc() {
  const path = getPathWithoutLocale();
  return !EXCLUDED_PATHS.includes(path);
}

/**
 * Create Desktop TOC Sidebar
 * @returns {HTMLElement}
 */
export function TocSidebar() {
  const container = el('div.toc-sidebar-container');
  const sidebar = el('aside.toc-sidebar');
  sidebar.setAttribute('aria-label', 'Table of contents');

  // Toggle button (always visible)
  const toggleBtn = el('button.toc-toggle-btn');
  toggleBtn.setAttribute('aria-label', 'Toggle table of contents');
  toggleBtn.addEventListener('click', () => {
    tocSidebarCollapsed.update(v => !v);
  });

  let cleanupScrollSpy = () => {};

  function render() {
    const items = tocItems.get();
    const activeId = currentSection.get();
    const isCollapsed = tocSidebarCollapsed.get();

    sidebar.innerHTML = '';

    // Update container collapsed state
    container.className = `toc-sidebar-container ${isCollapsed ? 'collapsed' : ''}`;

    // Update toggle button icon and tooltip
    toggleBtn.innerHTML = isCollapsed ? ChevronLeftIcon : ChevronRightIcon;
    toggleBtn.title = isCollapsed ? t('toc.expand') : t('toc.collapse');

    if (!shouldShowToc() || items.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';

    const title = el('div.toc-title');
    title.textContent = t('toc.title');
    sidebar.appendChild(title);

    sidebar.appendChild(createTocList(items, activeId));
  }

  // Re-render on state changes
  effect(() => {
    tocItems.get();
    currentSection.get();
    tocSidebarCollapsed.get();
    locale.get();
    render();
  });

  // Setup scroll spy when items change
  effect(() => {
    const items = tocItems.get();
    cleanupScrollSpy();
    cleanupScrollSpy = setupScrollSpy(items);
  });

  container.appendChild(toggleBtn);
  container.appendChild(sidebar);

  return container;
}

/**
 * Create Mobile TOC Accordion
 * @returns {HTMLElement}
 */
export function TocMobile() {
  const container = el('div.toc-mobile');

  function render() {
    const items = tocItems.get();
    const activeId = currentSection.get();
    const isExpanded = tocExpanded.get();

    container.innerHTML = '';
    container.className = `toc-mobile ${isExpanded ? 'open' : ''}`;

    if (!shouldShowToc() || items.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    // Header (toggle)
    const header = el('div.toc-mobile-header');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');

    const titleDiv = el('div.toc-mobile-title');
    titleDiv.innerHTML = `${ListIcon}<span>${t('toc.title')}</span>`;

    const arrow = el('span.toc-mobile-arrow');
    arrow.innerHTML = ChevronIcon;

    header.appendChild(titleDiv);
    header.appendChild(arrow);

    header.addEventListener('click', () => {
      tocExpanded.update(v => !v);
    });

    // Content
    const content = el('div.toc-mobile-content');
    content.appendChild(createTocList(items, activeId));

    container.appendChild(header);
    container.appendChild(content);
  }

  // Re-render on state changes
  effect(() => {
    tocItems.get();
    currentSection.get();
    tocExpanded.get();
    locale.get();
    render();
  });

  return container;
}

/**
 * Update TOC items from current page content
 * Call this after page content is rendered
 */
export function updateTocItems() {
  const pageContainer = document.querySelector('.docs-page');
  if (pageContainer && shouldShowToc()) {
    const items = extractHeadings(pageContainer);
    tocItems.set(items);
    currentSection.set(items[0]?.id || '');
  } else {
    tocItems.set([]);
    currentSection.set('');
  }
  tocExpanded.set(false);
}
