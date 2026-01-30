/**
 * Pulse Documentation - Header Component
 */

import { effect, el } from '/runtime/index.js';
import { mobileMenuOpen, theme, toggleTheme, navigation, router, version } from '../state.js';

export function Header() {
  const header = el('header.header');

  const logoContainer = el('.logo-container');

  const logo = el('.logo');
  logo.innerHTML = '⚡ <span>Pulse</span>';
  logo.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/');
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

  const nav = el('nav.nav');
  for (const item of navigation) {
    // Use router.link() for automatic active class handling
    const link = router.link(item.path, item.label, { activeClass: 'active' });
    link.className = 'nav-link';
    nav.appendChild(link);
  }
  header.appendChild(nav);

  // Theme toggle button
  const themeBtn = el('button.theme-btn');
  effect(() => {
    themeBtn.textContent = theme.get() === 'dark' ? '☀️' : '🌙';
    themeBtn.title = theme.get() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  });
  themeBtn.addEventListener('click', toggleTheme);
  header.appendChild(themeBtn);

  // Mobile menu button
  const menuBtn = el('button.menu-btn', '☰');
  menuBtn.addEventListener('click', () => mobileMenuOpen.update(v => !v));
  header.appendChild(menuBtn);

  // Mobile nav
  const mobileNav = el('nav.mobile-nav');
  effect(() => {
    mobileNav.className = `mobile-nav ${mobileMenuOpen.get() ? 'open' : ''}`;
  });
  for (const item of navigation) {
    const link = router.link(item.path, item.label, { activeClass: 'active' });
    link.className = 'nav-link';
    mobileNav.appendChild(link);
  }
  header.appendChild(mobileNav);

  return header;
}
