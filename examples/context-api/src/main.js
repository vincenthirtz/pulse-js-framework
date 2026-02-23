/**
 * Pulse Context API Demo
 * Demonstrates createContext, Provider, useContext, provideMany,
 * nested providers, reactive context values, and compound components.
 */

import { pulse, effect, computed, el, mount, when } from '../../../runtime/index.js';
import {
  createContext, useContext, Provider, Consumer,
  provideMany, useContextSelector
} from '../../../runtime/context.js';

// ══════════════════════════════════════════════════════════════
// 1. Theme Context - Basic context with provider/consumer
// ══════════════════════════════════════════════════════════════

const ThemeContext = createContext('light', { displayName: 'ThemeContext' });

const themes = {
  light: { bg: '#ffffff', text: '#1a1a2e', card: '#f8f8ff', accent: '#646cff', border: '#e0e0e0' },
  dark:  { bg: '#1a1a2e', text: '#e0e0e0', card: '#2a2a3e', accent: '#818cf8', border: '#3a3a4e' },
  ocean: { bg: '#0d1b2a', text: '#e0e8f0', card: '#1b2838', accent: '#48cae4', border: '#2a3a4a' }
};

function ThemeToggle() {
  const theme = useContext(ThemeContext);
  return el('div.theme-toggle',
    el('span', 'Theme:'),
    ['light', 'dark', 'ocean'].map(t =>
      el('button', t, {
        class: () => theme.get() === t ? 'active' : '',
        onclick: () => theme.set(t),
        'aria-pressed': () => String(theme.get() === t)
      })
    )
  );
}

function ThemedCard({ title, children }) {
  const theme = useContext(ThemeContext);
  const colors = computed(() => themes[theme.get()] || themes.light);

  return el('div.themed-card', {
    style: () => `background: ${colors.get().card}; color: ${colors.get().text}; border-color: ${colors.get().border}`
  },
    el('h3', { style: () => `color: ${colors.get().accent}` }, title),
    ...(Array.isArray(children) ? children : [children])
  );
}

// ══════════════════════════════════════════════════════════════
// 2. Auth Context - Reactive context with user state
// ══════════════════════════════════════════════════════════════

const AuthContext = createContext(null, { displayName: 'AuthContext' });

const mockUsers = [
  { id: 1, name: 'Alice', role: 'admin', avatar: 'A' },
  { id: 2, name: 'Bob', role: 'editor', avatar: 'B' },
  { id: 3, name: 'Charlie', role: 'viewer', avatar: 'C' }
];

function UserBadge() {
  const user = useContext(AuthContext);
  return when(
    () => user.get(),
    () => {
      const u = user.get();
      return el('div.user-badge',
        el('div.avatar', u.avatar),
        el('div.user-info',
          el('span.name', u.name),
          el('span.role', u.role)
        ),
        el('button.logout', 'Logout', {
          onclick: () => user.set(null)
        })
      );
    },
    () => el('div.user-badge.logged-out', el('span', 'Not logged in'))
  );
}

function LoginPanel() {
  const user = useContext(AuthContext);
  return when(
    () => !user.get(),
    () => el('div.login-panel',
      el('p', 'Select a user to log in:'),
      el('div.user-list',
        mockUsers.map(u =>
          el('button.user-option', {
            onclick: () => user.set(u)
          },
            el('span.avatar-small', u.avatar),
            el('span', `${u.name} (${u.role})`)
          )
        )
      )
    )
  );
}

function AdminPanel() {
  const user = useContext(AuthContext);
  return when(
    () => user.get()?.role === 'admin',
    () => el('div.admin-panel',
      el('h4', 'Admin Panel'),
      el('p', 'Only visible to admin users. You can manage settings here.'),
      el('ul',
        el('li', 'Manage users'),
        el('li', 'View analytics'),
        el('li', 'System settings')
      )
    ),
    () => when(
      () => user.get(),
      () => el('div.admin-panel.restricted',
        el('p', `Logged in as ${user.get()?.name} (${user.get()?.role}). Admin access required.`)
      )
    )
  );
}

// ══════════════════════════════════════════════════════════════
// 3. Locale Context - Internationalization with nested providers
// ══════════════════════════════════════════════════════════════

const LocaleContext = createContext('en', { displayName: 'LocaleContext' });

const translations = {
  en: { greeting: 'Hello', welcome: 'Welcome to Pulse', language: 'Language' },
  fr: { greeting: 'Bonjour', welcome: 'Bienvenue dans Pulse', language: 'Langue' },
  es: { greeting: 'Hola', welcome: 'Bienvenido a Pulse', language: 'Idioma' },
  ja: { greeting: 'こんにちは', welcome: 'Pulseへようこそ', language: '言語' }
};

function LocaleSwitcher() {
  const locale = useContext(LocaleContext);
  return el('div.locale-switcher',
    el('span', () => `${translations[locale.get()]?.language || 'Language'}:`),
    ['en', 'fr', 'es', 'ja'].map(l =>
      el('button', l.toUpperCase(), {
        class: () => locale.get() === l ? 'active' : '',
        onclick: () => locale.set(l),
        'aria-pressed': () => String(locale.get() === l)
      })
    )
  );
}

function LocalizedGreeting() {
  const locale = useContext(LocaleContext);
  const t = computed(() => translations[locale.get()] || translations.en);
  return el('div.localized',
    el('h3', () => t.get().greeting),
    el('p', () => t.get().welcome)
  );
}

// ══════════════════════════════════════════════════════════════
// 4. provideMany & useContextSelector - Multiple contexts
// ══════════════════════════════════════════════════════════════

function MultiContextDemo() {
  const theme = useContext(ThemeContext);
  const user = useContext(AuthContext);
  const locale = useContext(LocaleContext);

  return el('div.multi-context',
    el('h3', 'Context Selector Demo'),
    el('p', 'Derived value from multiple contexts:'),
    el('div.context-values',
      el('span.tag', () => `Theme: ${theme.get()}`),
      el('span.tag', () => `User: ${user.get()?.name || 'none'}`),
      el('span.tag', () => `Locale: ${locale.get()}`)
    )
  );
}

// ══════════════════════════════════════════════════════════════
// 5. Nested Provider Override Demo
// ══════════════════════════════════════════════════════════════

function NestedProviderDemo() {
  const outerTheme = useContext(ThemeContext);
  const outerColors = computed(() => themes[outerTheme.get()] || themes.light);

  return el('div.nested-demo',
    el('h3', 'Nested Providers'),
    el('p', 'Inner provider overrides the outer one:'),

    el('div.nested-box', {
      style: () => `background: ${outerColors.get().card}; color: ${outerColors.get().text}; border-color: ${outerColors.get().border}`
    },
      el('p', () => `Outer: ${outerTheme.get()}`),

      // Inner provider overrides theme to 'ocean'
      (() => {
        const innerTheme = pulse('ocean');
        return Provider(ThemeContext, innerTheme, () => {
          const inner = useContext(ThemeContext);
          const innerColors = computed(() => themes[inner.get()] || themes.light);
          return el('div.nested-inner', {
            style: () => `background: ${innerColors.get().card}; color: ${innerColors.get().text}; border-color: ${innerColors.get().border}`
          },
            el('p', () => `Inner: ${inner.get()} (overridden)`),
            el('select', {
              value: () => inner.get(),
              onchange: (e) => innerTheme.set(e.target.value),
              'aria-label': 'Inner theme'
            },
              ['light', 'dark', 'ocean'].map(t =>
                el(`option[value=${t}]`, t)
              )
            )
          );
        });
      })()
    )
  );
}

// ══════════════════════════════════════════════════════════════
// App
// ══════════════════════════════════════════════════════════════

function App() {
  // Create reactive context values
  const themePulse = pulse('light');
  const userPulse = pulse(null);
  const localePulse = pulse('en');

  // Apply theme to body
  effect(() => {
    const colors = themes[themePulse.get()] || themes.light;
    document.body.style.background = colors.bg;
    document.body.style.color = colors.text;
  });

  // Provide all three contexts at once
  return provideMany([
    [ThemeContext, themePulse],
    [AuthContext, userPulse],
    [LocaleContext, localePulse]
  ], () =>
    el('div.app',
      el('header',
        el('h1', 'Context API Demo'),
        el('p.subtitle', 'Dependency injection, theming, auth & i18n')
      ),

      el('main',
        // Section 1: Theme
        el('section',
          el('h2', '1. Theme Context'),
          el('p', 'Share theme state across components without prop drilling.'),
          ThemeToggle(),
          ThemedCard({ title: 'Themed Component', children: [
            el('p', 'This card reads theme from context and applies colors reactively.')
          ]})
        ),

        // Section 2: Auth
        el('section',
          el('h2', '2. Auth Context'),
          el('p', 'Provide user state to the entire component tree.'),
          UserBadge(),
          LoginPanel(),
          AdminPanel()
        ),

        // Section 3: Locale
        el('section',
          el('h2', '3. Locale Context'),
          el('p', 'Internationalization with reactive locale switching.'),
          LocaleSwitcher(),
          LocalizedGreeting()
        ),

        // Section 4: Multiple contexts
        el('section',
          el('h2', '4. Multiple Contexts'),
          el('p', 'provideMany() provides multiple contexts at once. Components can read from any of them.'),
          MultiContextDemo()
        ),

        // Section 5: Nested providers
        el('section',
          el('h2', '5. Nested Providers'),
          el('p', 'Inner providers can override outer ones for specific subtrees.'),
          NestedProviderDemo()
        )
      )
    )
  );
}

mount('#app', App());
console.log('Pulse Context API Demo loaded');
