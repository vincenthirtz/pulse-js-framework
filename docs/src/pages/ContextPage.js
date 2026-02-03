/**
 * Pulse Documentation - Context API Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function ContextPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="context.title"></h1>
    <p class="page-intro" data-i18n="context.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="context.quickStart"></h2>
      <p data-i18n="context.quickStartDesc"></p>
      <div class="code-block">
        <pre><code>import { createContext, useContext, Provider } from 'pulse-js-framework/runtime/context';

// Create a context with default value
const ThemeContext = createContext('light');

// Provide value to children
Provider(ThemeContext, 'dark', () => {
  const theme = useContext(ThemeContext);
  console.log(theme.get()); // 'dark'
  return App();
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="context.creatingContexts"></h2>
      <div class="code-block">
        <pre><code>// Simple context with default value
const ThemeContext = createContext('light');

// Context with display name (for debugging)
const UserContext = createContext(null, { displayName: 'UserContext' });

// Context with object default
const ConfigContext = createContext({
  apiUrl: 'https://api.example.com',
  timeout: 5000
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="context.providingValues"></h2>

      <h3 data-i18n="context.basicProvider"></h3>
      <div class="code-block">
        <pre><code>Provider(ThemeContext, 'dark', () => {
  // All children can access 'dark' theme
  return App();
});</code></pre>
      </div>

      <h3 data-i18n="context.reactiveValues"></h3>
      <p data-i18n="context.reactiveValuesDesc"></p>
      <div class="code-block">
        <pre><code>const themePulse = pulse('dark');

Provider(ThemeContext, themePulse, () => {
  const theme = useContext(ThemeContext);
  // theme updates when themePulse changes
  effect(() => {
    document.body.className = theme.get();
  });
});</code></pre>
      </div>

      <h3 data-i18n="context.shorthandSyntax"></h3>
      <div class="code-block">
        <pre><code>ThemeContext.Provider('dark', () => App());
ThemeContext.Consumer((theme) => el(\`div.\${theme.get()}\`));</code></pre>
      </div>

      <h3 data-i18n="context.nestedProviders"></h3>
      <p data-i18n="context.nestedProvidersDesc"></p>
      <div class="code-block">
        <pre><code>Provider(ThemeContext, 'dark', () => {
  Provider(ThemeContext, 'blue', () => {
    useContext(ThemeContext).get(); // 'blue'
  });
  useContext(ThemeContext).get(); // 'dark'
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="context.consumingContext"></h2>

      <h3>useContext</h3>
      <div class="code-block">
        <pre><code>const theme = useContext(ThemeContext);

effect(() => {
  console.log('Theme:', theme.get());
});</code></pre>
      </div>

      <h3 data-i18n="context.consumerComponent"></h3>
      <div class="code-block">
        <pre><code>ThemeContext.Consumer((theme) => {
  return el('div', { class: () => \`theme-\${theme.get()}\` }, 'Content');
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="context.multipleContexts"></h2>

      <h3>provideMany</h3>
      <p data-i18n="context.provideManyDesc"></p>
      <div class="code-block">
        <pre><code>import { provideMany } from 'pulse-js-framework/runtime/context';

provideMany([
  [ThemeContext, 'dark'],
  [UserContext, { name: 'John' }],
  [LocaleContext, 'fr']
], () => App());</code></pre>
      </div>

      <h3>useContextSelector</h3>
      <p data-i18n="context.useContextSelectorDesc"></p>
      <div class="code-block">
        <pre><code>import { useContextSelector } from 'pulse-js-framework/runtime/context';

const effectiveTheme = useContextSelector(
  (theme, user) => user.get()?.preferredTheme || theme.get(),
  ThemeContext,
  UserContext
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="context.utilities"></h2>
      <div class="code-block">
        <pre><code>import { isContext, getContextDepth, disposeContext } from 'pulse-js-framework/runtime/context';

// Check if value is a context
isContext(ThemeContext); // true

// Get nesting depth
const depth = getContextDepth(ThemeContext); // 0, 1, 2, ...

// Clean up context (for tests)
disposeContext(ThemeContext);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="context.patterns"></h2>

      <h3 data-i18n="context.themeProvider"></h3>
      <div class="code-block">
        <pre><code>const ThemeContext = createContext('light');

function ThemeProvider({ children }) {
  const theme = pulse('light');

  const toggleTheme = () => {
    theme.update(t => t === 'light' ? 'dark' : 'light');
  };

  return Provider(ThemeContext, { theme, toggleTheme }, children);
}

// Usage
function ThemedButton() {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return el('button', {
    class: () => \`btn-\${theme.get()}\`,
    onclick: toggleTheme
  }, 'Toggle Theme');
}</code></pre>
      </div>

      <h3 data-i18n="context.authContext"></h3>
      <div class="code-block">
        <pre><code>const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const user = pulse(null);
  const loading = pulse(true);

  // Check auth on mount
  onMount(async () => {
    const session = await checkSession();
    user.set(session?.user || null);
    loading.set(false);
  });

  const login = async (credentials) => {
    const result = await authApi.login(credentials);
    user.set(result.user);
  };

  const logout = async () => {
    await authApi.logout();
    user.set(null);
  };

  return Provider(AuthContext, { user, loading, login, logout }, children);
}

// Usage
function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  return when(
    () => loading.get(),
    () => el('.spinner'),
    () => when(
      () => user.get(),
      () => children(),
      () => el('div', 'Please log in')
    )
  );
}</code></pre>
      </div>

      <h3 data-i18n="context.localizationContext"></h3>
      <div class="code-block">
        <pre><code>const I18nContext = createContext({
  locale: 'en',
  t: (key) => key
});

function I18nProvider({ locale: initialLocale, children }) {
  const locale = pulse(initialLocale);
  const translations = pulse({});

  // Load translations when locale changes
  effect(async () => {
    const lang = locale.get();
    const data = await import(\`./locales/\${lang}.json\`);
    translations.set(data.default);
  });

  const t = (key) => {
    const trans = translations.get();
    return trans[key] || key;
  };

  const setLocale = (newLocale) => locale.set(newLocale);

  return Provider(I18nContext, { locale, t, setLocale }, children);
}

// Usage
function Greeting() {
  const { t } = useContext(I18nContext);
  return el('h1', t('welcome'));
}</code></pre>
      </div>

      <h3 data-i18n="context.compoundComponents"></h3>
      <div class="code-block">
        <pre><code>const TabsContext = createContext(null);

function Tabs({ defaultIndex = 0, children }) {
  const activeIndex = pulse(defaultIndex);

  return Provider(TabsContext, { activeIndex }, () => {
    return el('.tabs', children);
  });
}

function Tab({ index, children }) {
  const { activeIndex } = useContext(TabsContext);

  return el('button.tab[role=tab]', {
    'aria-selected': () => String(activeIndex.get() === index),
    onclick: () => activeIndex.set(index)
  }, children);
}

function TabPanel({ index, children }) {
  const { activeIndex } = useContext(TabsContext);

  return when(
    () => activeIndex.get() === index,
    () => el('.tab-panel[role=tabpanel]', children)
  );
}

// Usage
Tabs({ defaultIndex: 0 }, () => [
  Tab({ index: 0 }, 'Tab 1'),
  Tab({ index: 1 }, 'Tab 2'),
  TabPanel({ index: 0 }, 'Content 1'),
  TabPanel({ index: 1 }, 'Content 2')
]);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="context.testing"></h2>
      <div class="code-block">
        <pre><code>import { test, describe, afterEach } from 'node:test';
import { createContext, Provider, useContext, disposeContext } from 'pulse-js-framework/runtime/context';

describe('ThemeContext', () => {
  const ThemeContext = createContext('light');

  test('provides value to children', () => {
    Provider(ThemeContext, 'dark', () => {
      const theme = useContext(ThemeContext);
      assert.strictEqual(theme.get(), 'dark');
    });
  });

  afterEach(() => {
    disposeContext(ThemeContext);
  });
});</code></pre>
      </div>
    </section>
  `;

  // Reactive i18n: update all translated elements when locale/translations change
  effect(() => {
    locale.get();
    translations.get();

    page.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  });

  return page;
}
