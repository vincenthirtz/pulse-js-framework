# API Reference: Router, Store & Context

> Load this context file when working on routing, state management, or context API.

### Router (runtime/router.js)

```javascript
import { createRouter, lazy, preload } from 'pulse-js-framework/runtime/router';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/users/:id': UserPage,
    '/files/*path': FilePage,
    // Lazy loading with options
    '/dashboard': lazy(() => import('./Dashboard.js')),
    '/settings': lazy(() => import('./Settings.js'), {
      loading: () => el('.spinner'),
      error: (err) => el('.error', err.message),
      timeout: 5000
    }),
    '/admin': {
      handler: AdminPage,
      meta: { requiresAuth: true },
      beforeEnter: (to, from) => {
        if (!isAuth()) return '/login';
      },
      children: {
        '/users': AdminUsersPage,
        '/settings': SettingsPage
      }
    }
  },
  mode: 'history',  // 'history' (default) or 'hash' for #/path URLs
  base: '',         // Base path prefix for all routes
  scrollBehavior: (to, from, saved) => saved || { x: 0, y: 0 },
  // Scroll persistence (persist positions across sessions)
  persistScroll: true,              // Save scroll positions to sessionStorage
  persistScrollKey: 'my-app-scroll', // Custom storage key (default: 'pulse-router-scroll')
  // Middleware (Koa-style)
  middleware: [
    async (ctx, next) => {
      if (ctx.to.meta.requiresAuth && !isAuth()) {
        return ctx.redirect('/login');
      }
      await next();
    }
  ]
});

// Hash mode (for static hosting without server config)
const hashRouter = createRouter({
  routes: { '/': HomePage, '/about': AboutPage },
  mode: 'hash'  // URLs become /#/, /#/about
});

// Guards
router.beforeEach((to, from) => { /* global guard */ });
router.beforeResolve((to, from) => { /* after per-route guards */ });
router.afterEach((to) => { /* after navigation */ });

// Dynamic middleware
const unsubscribe = router.use(async (ctx, next) => { await next(); });

// ===== Navigation =====

// Basic navigation
router.navigate('/users/123');

// navigate() options
await router.navigate('/search', {
  replace: true,                    // Replace history instead of push (default: false)
  query: { q: 'test', page: 1 },    // Query parameters -> /search?q=test&page=1
  state: { scrollY: 100 }           // History state (accessible via history.state)
});

// Query parameters
router.navigate('/products', { query: { category: 'books', sort: 'price' } });
// URL: /products?category=books&sort=price

// Accessing route state (all reactive Pulses)
router.path.get();    // '/users/123'
router.params.get();  // { id: '123' }
router.query.get();   // { q: 'test', page: '1' } - values are strings
router.meta.get();    // { requiresAuth: true }

// Check if route is active
router.isActive('/admin');           // true if current path starts with /admin
router.isActive('/admin', true);     // true only if exact match

// Route context in handlers
const UserPage = (ctx) => {
  const { params, query, path, navigate, router } = ctx;
  console.log(params.id);       // Route param
  console.log(query.tab);       // Query param
  return el('div', `User ${params.id}`);
};

// ===== Programmatic navigation patterns =====

// Navigate with confirmation
async function navigateWithConfirm(path) {
  if (hasUnsavedChanges && !confirm('Discard changes?')) return;
  await router.navigate(path);
}

// Navigate and scroll to element
await router.navigate('/docs#installation');  // Hash in path

// Custom scroll behavior
const router = createRouter({
  routes,
  scrollBehavior: (to, from, savedPosition) => {
    if (savedPosition) return savedPosition;     // Back/forward: restore position
    if (to.path.includes('#')) {                 // Hash: scroll to element
      return { selector: to.path.split('#')[1], behavior: 'smooth' };
    }
    return { x: 0, y: 0 };                       // Default: top
  }
});

// Router outlet - renders current route
router.outlet('#app');

// Route error handling
const router = createRouter({
  routes,
  onRouteError: (error, ctx) => {
    console.error('Route error:', error);
    return el('.error-page', error.message);  // Return error UI
  }
});

// Preload components (prefetch on hover, etc.)
const DashboardLazy = lazy(() => import('./Dashboard.js'));
linkElement.addEventListener('mouseenter', () => preload(DashboardLazy));

// Router links (auto-handle navigation)
const nav = el('nav', [
  router.link('/', 'Home'),
  router.link('/about', 'About'),
  router.link('/users', 'Users', { activeClass: 'nav-active' })
]);
```

### Store (runtime/store.js)

```javascript
import {
  createStore, createActions, createGetters,
  combineStores, createModuleStore,
  usePlugin, loggerPlugin, historyPlugin
} from 'pulse-js-framework/runtime/store';

// Basic store
const store = createStore({ user: null, theme: 'light' });
store.user.get();
store.user.set({ name: 'John' });
store.theme.update(t => t === 'light' ? 'dark' : 'light');

// Store with persistence (localStorage)
const store = createStore(
  { user: null, theme: 'light' },
  {
    persist: true,              // Enable localStorage persistence
    storageKey: 'my-app-store'  // Custom key (default: 'pulse-store')
  }
);

// Store methods
store.$getState();              // Get snapshot of all values (without tracking)
store.$setState({ theme: 'dark', user: { name: 'John' } });  // Batch update
store.$reset();                 // Reset to initial state
store.$subscribe(state => console.log('State changed:', state));
store.$pulses;                  // Access underlying pulse objects

// Actions (bound to store)
const actions = createActions(store, {
  toggleTheme: (store) => store.theme.update(t => t === 'light' ? 'dark' : 'light'),
  login: (store, user) => store.user.set(user),
  logout: (store) => store.user.set(null)
});
actions.toggleTheme();
actions.login({ name: 'John', email: 'john@example.com' });

// Getters (computed values from store)
const getters = createGetters(store, {
  isLoggedIn: (store) => store.user.get() !== null,
  userName: (store) => store.user.get()?.name || 'Guest'
});
getters.isLoggedIn.get();  // true/false (reactive)

// Combine multiple stores
const rootStore = combineStores({
  user: createStore({ name: '', email: '' }),
  settings: createStore({ theme: 'dark', lang: 'en' })
});
rootStore.user.name.get();
rootStore.settings.theme.set('light');

// Module-based store (Vuex-like)
const store = createModuleStore({
  user: {
    state: { name: '', loggedIn: false },
    actions: {
      login: (store, name) => {
        store.name.set(name);
        store.loggedIn.set(true);
      }
    },
    getters: {
      displayName: (store) => store.loggedIn.get() ? store.name.get() : 'Guest'
    }
  },
  cart: {
    state: { items: [] },
    actions: {
      addItem: (store, item) => store.items.update(arr => [...arr, item])
    }
  }
});
store.user.login('John');
store.cart.addItem({ id: 1, name: 'Product' });

// Plugins
usePlugin(store, loggerPlugin);  // Log all state changes to console
usePlugin(store, (s) => historyPlugin(s, 100));  // Undo/redo with 100 history states

// History plugin adds methods
store.$undo();     // Undo last change
store.$redo();     // Redo undone change
store.$canUndo();  // true if undo available
store.$canRedo();  // true if redo available
```

### Context API (runtime/context.js)

```javascript
import {
  createContext, useContext, Provider, Consumer, provideMany,
  useContextSelector, disposeContext, isContext, getContextDepth
} from 'pulse-js-framework/runtime/context';

// Create a context with default value
const ThemeContext = createContext('light');
const UserContext = createContext(null, { displayName: 'UserContext' });

// Provide values to children
Provider(ThemeContext, 'dark', () => {
  const theme = useContext(ThemeContext);
  console.log(theme.get()); // 'dark'
  return MyComponent();
});

// Provide reactive values (pulses)
const themePulse = pulse('dark');
Provider(ThemeContext, themePulse, () => {
  const theme = useContext(ThemeContext);
  // theme updates when themePulse changes
});

// Shorthand syntax
ThemeContext.Provider('dark', () => App());
ThemeContext.Consumer((theme) => el(`div.${theme.get()}`));

// Nested providers (inner overrides outer)
Provider(ThemeContext, 'dark', () => {
  Provider(ThemeContext, 'blue', () => {
    useContext(ThemeContext).get(); // 'blue'
  });
  useContext(ThemeContext).get(); // 'dark'
});

// Provide multiple contexts at once
provideMany([
  [ThemeContext, 'dark'],
  [UserContext, { name: 'John' }],
  [LocaleContext, 'fr']
], () => App());

// Derive from multiple contexts
const effectiveTheme = useContextSelector(
  (theme, user) => user.get()?.preferredTheme || theme.get(),
  ThemeContext,
  UserContext
);

// Cleanup context in tests
disposeContext(ThemeContext);
```

