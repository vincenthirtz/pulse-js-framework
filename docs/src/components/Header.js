/**
 * Pulse Documentation - Header Component
 */

import { effect, el } from '/runtime/index.js';
import { mobileMenuOpen, theme, toggleTheme, navStructure, navStructureFlat, router, version, locale, locales, setLocale, navigateLocale, currentPath, t } from '../state.js';
import { SearchButton } from './Search.js';

export function Header() {
  const header = el('header.header');

  // Skip link for keyboard navigation (WCAG 2.4.1)
  const skipLink = el('a.skip-link');
  skipLink.href = '#main-content';
  effect(() => {
    locale.get();
    skipLink.textContent = t('actions.skipToContent');
  });
  header.appendChild(skipLink);

  const logoContainer = el('.logo-container');

  const logo = el('.logo');
  logo.innerHTML = '⚡ <span>Pulse</span>';
  logo.addEventListener('click', (e) => {
    e.preventDefault();
    navigateLocale('/');
  });
  logo.style.cursor = 'pointer';
  logoContainer.appendChild(logo);

  const versionBadge = el('a.version-badge');
  versionBadge.textContent = `v${version}`;
  versionBadge.href = `https://github.com/vincenthirtz/pulse-js-framework/releases/tag/v${version}`;
  versionBadge.target = '_blank';
  versionBadge.rel = 'noopener noreferrer';
  versionBadge.title = `View release v${version} on GitHub`;
  logoContainer.appendChild(versionBadge);

  // GitHub stars badge
  const starsBadge = el('a.stars-badge');
  starsBadge.innerHTML = '<span class="star-icon" aria-hidden="true">★</span><span class="star-count" aria-live="polite">-</span>';
  starsBadge.href = 'https://github.com/vincenthirtz/pulse-js-framework';
  starsBadge.target = '_blank';
  starsBadge.rel = 'noopener noreferrer';
  starsBadge.setAttribute('aria-label', 'Star on GitHub');
  logoContainer.appendChild(starsBadge);

  // Fetch GitHub stars count
  fetch('https://api.github.com/repos/vincenthirtz/pulse-js-framework')
    .then(res => res.json())
    .then(data => {
      if (data.stargazers_count !== undefined) {
        const count = data.stargazers_count;
        starsBadge.querySelector('.star-count').textContent = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count;
      }
    })
    .catch(() => {
      starsBadge.querySelector('.star-count').textContent = '★';
    });

  header.appendChild(logoContainer);

  // Desktop navigation with dropdowns (uses shared navStructure from state.js)
  const nav = el('nav.nav');

  for (const item of navStructure) {
    if (item.children) {
      // Dropdown menu
      const dropdown = el('.nav-dropdown');

      const trigger = el('button.nav-link.nav-dropdown-trigger');
      const triggerText = el('span');
      trigger.appendChild(triggerText);
      trigger.appendChild(document.createTextNode(' '));
      const arrow = el('span.dropdown-arrow', '▾');
      trigger.appendChild(arrow);

      // Update trigger label when locale changes
      effect(() => {
        locale.get(); // Track locale
        triggerText.textContent = t(item.labelKey);
      });

      dropdown.appendChild(trigger);

      const menu = el('.dropdown-menu');
      for (const child of item.children) {
        const menuItem = el('a.dropdown-item');
        menuItem.href = child.path;

        const labelSpan = el('span.dropdown-item-label');
        const descSpan = el('span.dropdown-item-desc');
        menuItem.appendChild(labelSpan);
        menuItem.appendChild(descSpan);

        // Update labels when locale changes
        effect(() => {
          locale.get(); // Track locale
          labelSpan.textContent = t(child.labelKey);
          descSpan.textContent = t(child.descKey);
        });

        menuItem.addEventListener('click', (e) => {
          e.preventDefault();
          navigateLocale(child.path);
          dropdown.classList.remove('open');
        });

        // Update active state (compare without locale prefix)
        effect(() => {
          const path = currentPath.get();
          if (path === child.path) {
            menuItem.classList.add('active');
            menuItem.setAttribute('aria-current', 'page');
            trigger.classList.add('has-active');
          } else {
            menuItem.classList.remove('active');
            menuItem.removeAttribute('aria-current');
            // Check if any child is active
            const pathWithoutLocale = currentPath.get();
            const anyActive = item.children.some(c => pathWithoutLocale === c.path);
            if (!anyActive) trigger.classList.remove('has-active');
          }
        });

        menu.appendChild(menuItem);
      }
      dropdown.appendChild(menu);

      // Toggle dropdown on click (for touch devices)
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        // Close all other dropdowns
        nav.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
        if (!isOpen) dropdown.classList.add('open');
      });

      nav.appendChild(dropdown);
    } else {
      // Simple link with locale-aware navigation
      const link = el('a.nav-link');
      link.href = item.path;

      // Update label when locale changes
      effect(() => {
        locale.get(); // Track locale
        link.textContent = t(item.labelKey);
      });

      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateLocale(item.path);
      });
      // Update active state
      effect(() => {
        const path = currentPath.get();
        if (path === item.path) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        } else {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        }
      });
      nav.appendChild(link);
    }
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    nav.querySelectorAll('.nav-dropdown.open').forEach(d => d.classList.remove('open'));
  });

  header.appendChild(nav);

  // Header actions container (search + language + theme)
  const headerActions = el('.header-actions');

  // Search button
  headerActions.appendChild(SearchButton());

  // Language selector
  const langSelector = el('.lang-selector');

  const langBtn = el('button.lang-btn');
  langBtn.type = 'button';
  langBtn.setAttribute('aria-haspopup', 'listbox');
  langBtn.setAttribute('aria-expanded', 'false');
  effect(() => {
    const currentLocale = locale.get();
    langBtn.innerHTML = locales[currentLocale]?.flag || '🌐';
    const label = `${t('actions.selectLanguage')}: ${locales[currentLocale]?.name || 'Language'}`;
    langBtn.setAttribute('aria-label', label);
    langBtn.setAttribute('title', t('actions.selectLanguage'));
  });
  langSelector.appendChild(langBtn);

  const langMenu = el('.lang-menu');
  for (const [code, { name, flag }] of Object.entries(locales)) {
    const langOption = el('button.lang-option');
    langOption.dataset.locale = code;
    langOption.innerHTML = `${flag} <span>${name}</span>`;

    // Highlight current locale
    effect(() => {
      if (locale.get() === code) {
        langOption.classList.add('active');
      } else {
        langOption.classList.remove('active');
      }
    });

    langOption.addEventListener('click', (e) => {
      e.stopPropagation();
      setLocale(code, router);
      langSelector.classList.remove('open');
    });

    langMenu.appendChild(langOption);
  }
  langSelector.appendChild(langMenu);

  // Toggle language menu
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = langSelector.classList.toggle('open');
    langBtn.setAttribute('aria-expanded', String(isOpen));
  });

  // Close language menu when clicking outside
  document.addEventListener('click', () => {
    langSelector.classList.remove('open');
    langBtn.setAttribute('aria-expanded', 'false');
  });

  headerActions.appendChild(langSelector);

  // Theme toggle button
  const themeBtn = el('button.theme-btn');
  themeBtn.type = 'button';
  effect(() => {
    locale.get(); // Track locale for translations
    const isDark = theme.get() === 'dark';
    themeBtn.textContent = isDark ? '☀️' : '🌙';
    const label = isDark ? t('theme.switchToLight') : t('theme.switchToDark');
    themeBtn.setAttribute('aria-label', label);
    themeBtn.setAttribute('title', label);
  });
  themeBtn.addEventListener('click', toggleTheme);
  headerActions.appendChild(themeBtn);

  header.appendChild(headerActions);

  // Mobile menu button
  const menuBtn = el('button.menu-btn', '☰');
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-label', 'Toggle navigation menu');
  menuBtn.setAttribute('title', 'Menu');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-controls', 'mobile-nav');
  menuBtn.addEventListener('click', () => {
    const newState = !mobileMenuOpen.get();
    mobileMenuOpen.set(newState);
    menuBtn.setAttribute('aria-expanded', String(newState));
  });
  header.appendChild(menuBtn);

  // Mobile nav (flat structure)
  const mobileNav = el('nav.mobile-nav');
  mobileNav.id = 'mobile-nav';
  mobileNav.setAttribute('aria-label', 'Mobile navigation');
  effect(() => {
    const isOpen = mobileMenuOpen.get();
    mobileNav.className = `mobile-nav ${isOpen ? 'open' : ''}`;
    mobileNav.setAttribute('aria-hidden', String(!isOpen));
  });

  // Mobile navigation (uses shared navStructureFlat from state.js)
  for (const item of navStructureFlat) {
    const link = el('a.nav-link');
    link.href = item.path;

    // Update label when locale changes
    effect(() => {
      locale.get(); // Track locale
      link.textContent = t(item.labelKey);
    });

    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateLocale(item.path);
    });
    // Update active state
    effect(() => {
      const path = currentPath.get();
      if (path === item.path) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
    mobileNav.appendChild(link);
  }
  header.appendChild(mobileNav);

  return header;
}
