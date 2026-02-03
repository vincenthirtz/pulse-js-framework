# Context API

Pulse provides a Context API for dependency injection and avoiding prop drilling, similar to React Context.

## Installation

```javascript
import {
  createContext, useContext, Provider, Consumer, provideMany,
  useContextSelector, disposeContext, isContext, getContextDepth
} from 'pulse-js-framework/runtime/context';
```

## Quick Start

```javascript
// Create a context with default value
const ThemeContext = createContext('light');

// Provide value to children
Provider(ThemeContext, 'dark', () => {
  const theme = useContext(ThemeContext);
  console.log(theme.get()); // 'dark'
  return App();
});
```

## Creating Contexts

```javascript
// Simple context with default value
const ThemeContext = createContext('light');

// Context with display name (for debugging)
const UserContext = createContext(null, { displayName: 'UserContext' });

// Context with object default
const ConfigContext = createContext({
  apiUrl: 'https://api.example.com',
  timeout: 5000
});
```

## Providing Values

### Basic Provider

```javascript
Provider(ThemeContext, 'dark', () => {
  // All children can access 'dark' theme
  return App();
});
```

### Providing Reactive Values

```javascript
const themePulse = pulse('dark');

Provider(ThemeContext, themePulse, () => {
  const theme = useContext(ThemeContext);
  // theme updates when themePulse changes
  effect(() => {
    document.body.className = theme.get();
  });
});
```

### Shorthand Syntax

```javascript
ThemeContext.Provider('dark', () => App());
ThemeContext.Consumer((theme) => el(`div.${theme.get()}`));
```

### Nested Providers

Inner providers override outer ones:

```javascript
Provider(ThemeContext, 'dark', () => {
  Provider(ThemeContext, 'blue', () => {
    useContext(ThemeContext).get(); // 'blue'
  });
  useContext(ThemeContext).get(); // 'dark'
});
```

## Consuming Context

### useContext

```javascript
const theme = useContext(ThemeContext);

effect(() => {
  console.log('Theme:', theme.get());
});
```

### Consumer Component

```javascript
ThemeContext.Consumer((theme) => {
  return el('div', { class: () => `theme-${theme.get()}` }, 'Content');
});
```

## Multiple Contexts

### provideMany

Provide multiple contexts at once:

```javascript
provideMany([
  [ThemeContext, 'dark'],
  [UserContext, { name: 'John' }],
  [LocaleContext, 'fr']
], () => App());
```

### useContextSelector

Derive from multiple contexts:

```javascript
const effectiveTheme = useContextSelector(
  (theme, user) => user.get()?.preferredTheme || theme.get(),
  ThemeContext,
  UserContext
);
```

## Context Utilities

```javascript
// Check if value is a context
isContext(ThemeContext); // true

// Get nesting depth
const depth = getContextDepth(ThemeContext); // 0, 1, 2, ...

// Clean up context (for tests)
disposeContext(ThemeContext);
```

## Common Patterns

### Theme Provider

```javascript
const ThemeContext = createContext('light');

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
    class: () => `btn-${theme.get()}`,
    onclick: toggleTheme
  }, 'Toggle Theme');
}
```

### Auth Context

```javascript
const AuthContext = createContext(null);

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
}
```

### Localization Context

```javascript
const I18nContext = createContext({
  locale: 'en',
  t: (key) => key
});

function I18nProvider({ locale: initialLocale, children }) {
  const locale = pulse(initialLocale);
  const translations = pulse({});

  // Load translations when locale changes
  effect(async () => {
    const lang = locale.get();
    const data = await import(`./locales/${lang}.json`);
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
}
```

### Compound Components

```javascript
const TabsContext = createContext(null);

function Tabs({ defaultIndex = 0, children }) {
  const activeIndex = pulse(defaultIndex);

  return Provider(TabsContext, { activeIndex }, () => {
    return el('.tabs', children);
  });
}

function TabList({ children }) {
  return el('.tab-list[role=tablist]', children);
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
  TabList(() => [
    Tab({ index: 0 }, 'Tab 1'),
    Tab({ index: 1 }, 'Tab 2'),
    Tab({ index: 2 }, 'Tab 3')
  ]),
  TabPanel({ index: 0 }, 'Content 1'),
  TabPanel({ index: 1 }, 'Content 2'),
  TabPanel({ index: 2 }, 'Content 3')
]);
```

## Testing with Context

```javascript
import { test, describe } from 'node:test';
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
});
```
