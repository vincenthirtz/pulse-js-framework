/**
 * Pulse Documentation - Header Component
 */

import { effect, el } from '/runtime/index.js';
import { mobileMenuOpen, theme, toggleTheme, navigation, router } from '../state.js';

export function Header() {
  const header = el('header.header');

  const logo = el('.logo');
  logo.innerHTML = '⚡ <span>Pulse</span>';
  logo.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/');
  });
  logo.style.cursor = 'pointer';
  header.appendChild(logo);

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
