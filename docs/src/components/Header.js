/**
 * Pulse Documentation - Header Component
 */

import { effect, el } from '/runtime/index.js';
import { mobileMenuOpen, theme, toggleTheme, navStructure, navStructureFlat, router, version, locale, locales, setLocale, navigateLocale, getPathWithoutLocale, t } from '../state.js';
import { SearchButton } from './Search.js';

export function Header() {
  const header = el('header.header');

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
  starsBadge.innerHTML = '<span class="star-icon">★</span><span class="star-count">-</span>';
  starsBadge.href = 'https://github.com/vincenthirtz/pulse-js-framework';
  starsBadge.target = '_blank';
  starsBadge.rel = 'noopener noreferrer';
  starsBadge.title = 'Star on GitHub';
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
          const currentPath = getPathWithoutLocale();
          if (currentPath === child.path) {
            menuItem.classList.add('active');
            trigger.classList.add('has-active');
          } else {
            menuItem.classList.remove('active');
            // Check if any child is active
            const pathWithoutLocale = getPathWithoutLocale();
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
        const currentPath = getPathWithoutLocale();
        if (currentPath === item.path) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
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
  effect(() => {
    const currentLocale = locale.get();
    langBtn.innerHTML = locales[currentLocale]?.flag || '🌐';
    langBtn.title = locales[currentLocale]?.name || 'Language';
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
    langSelector.classList.toggle('open');
  });

  // Close language menu when clicking outside
  document.addEventListener('click', () => {
    langSelector.classList.remove('open');
  });

  headerActions.appendChild(langSelector);

  // Theme toggle button
  const themeBtn = el('button.theme-btn');
  effect(() => {
    locale.get(); // Track locale for translations
    themeBtn.textContent = theme.get() === 'dark' ? '☀️' : '🌙';
    themeBtn.title = theme.get() === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark');
  });
  themeBtn.addEventListener('click', toggleTheme);
  headerActions.appendChild(themeBtn);

  header.appendChild(headerActions);

  // Mobile menu button
  const menuBtn = el('button.menu-btn', '☰');
  menuBtn.addEventListener('click', () => mobileMenuOpen.update(v => !v));
  header.appendChild(menuBtn);

  // Mobile nav (flat structure)
  const mobileNav = el('nav.mobile-nav');
  effect(() => {
    mobileNav.className = `mobile-nav ${mobileMenuOpen.get() ? 'open' : ''}`;
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
      const currentPath = getPathWithoutLocale();
      if (currentPath === item.path) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    mobileNav.appendChild(link);
  }
  header.appendChild(mobileNav);

  return header;
}
