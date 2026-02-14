/**
 * Pulse Documentation - i18n (Internationalization) Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function I18nPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="i18n.title">Internationalization (i18n)</h1>
    <p class="page-intro" data-i18n="i18n.intro">Pulse provides a built-in i18n module with reactive locale switching, interpolation, pluralization, modifiers, and a missing key handler. Translations update automatically across your entire UI when the locale changes.</p>

    <section class="doc-section">
      <h2>Quick Start</h2>
      <p>Create an i18n instance, provide your messages, install it globally, and use the reactive <code>t()</code> function anywhere in your app.</p>
      <div class="code-block">
        <pre><code>import { createI18n, useI18n } from 'pulse-js-framework/runtime/i18n';
import { el, mount, effect } from 'pulse-js-framework/runtime';

// 1. Create an i18n instance with messages
const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      greeting: 'Hello, {name}!',
      nav: { home: 'Home', about: 'About' }
    },
    fr: {
      greeting: 'Bonjour, {name} !',
      nav: { home: 'Accueil', about: '\u00C0 propos' }
    }
  }
});

// 2. Install as the global default
i18n.install();

// 3. Use anywhere via useI18n()
const { t, locale, setLocale } = useI18n();

const App = () => el('.app', [
  el('h1', () => t('greeting', { name: 'Alice' })),
  el('nav', [
    el('a', () => t('nav.home')),
    el('a', () => t('nav.about'))
  ]),
  el('button', {
    onclick: () => setLocale(locale.get() === 'en' ? 'fr' : 'en')
  }, () => \`Language: \${locale.get().toUpperCase()}\`)
]);

mount('#app', App());
// UI updates automatically when locale changes!</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>createI18n(options)</h2>
      <p>The factory function that creates an i18n instance. All options are optional and have sensible defaults.</p>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>Option</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>locale</code></td>
              <td><code>string</code></td>
              <td><code>'en'</code></td>
              <td>Initial active locale</td>
            </tr>
            <tr>
              <td><code>fallbackLocale</code></td>
              <td><code>string</code></td>
              <td><code>'en'</code></td>
              <td>Locale used when a key is missing in the active locale</td>
            </tr>
            <tr>
              <td><code>messages</code></td>
              <td><code>Object</code></td>
              <td><code>{}</code></td>
              <td>Translation messages keyed by locale (e.g. <code>{ en: { ... }, fr: { ... } }</code>)</td>
            </tr>
            <tr>
              <td><code>pluralRules</code></td>
              <td><code>Object | null</code></td>
              <td><code>null</code></td>
              <td>Custom pluralization rules keyed by locale. Each rule is <code>(count) => index</code></td>
            </tr>
            <tr>
              <td><code>missing</code></td>
              <td><code>Function | null</code></td>
              <td><code>null</code></td>
              <td>Handler called when a key is not found: <code>(locale, key) => string</code></td>
            </tr>
            <tr>
              <td><code>modifiers</code></td>
              <td><code>Object | null</code></td>
              <td><code>null</code></td>
              <td>Named transform functions applied via pipe syntax: <code>{ upper: v => v.toUpperCase() }</code></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: { hello: 'Hello', goodbye: 'Goodbye' },
    fr: { hello: 'Bonjour', goodbye: 'Au revoir' }
  },
  pluralRules: {
    // Custom rule for Russian (0=many, 1=one, 2-4=few, 5+=many)
    ru: (count) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return 1;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 2;
      return 0;
    }
  },
  missing: (locale, key) => \`[MISSING: \${locale}.\${key}]\`,
  modifiers: {
    upper: (v) => v.toUpperCase(),
    lower: (v) => v.toLowerCase(),
    capitalize: (v) => v.charAt(0).toUpperCase() + v.slice(1)
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Translation Function &mdash; t(key, params?)</h2>
      <p>The <code>t()</code> function looks up a translation key in the current locale, applies interpolation for <code>{param}</code> placeholders, and falls back to the fallback locale when the key is missing. Dot notation is supported for nested keys.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      hello: 'Hello!',
      greeting: 'Hello, {name}!',
      nested: {
        deep: {
          message: 'Found at {level} levels deep'
        }
      },
      welcome: 'Welcome back, {name}. You have {count} notifications.'
    }
  }
});

// Simple key lookup
i18n.t('hello');
// => 'Hello!'

// Interpolation with named parameters
i18n.t('greeting', { name: 'Alice' });
// => 'Hello, Alice!'

// Dot-notation for nested keys
i18n.t('nested.deep.message', { level: 3 });
// => 'Found at 3 levels deep'

// Multiple interpolation parameters
i18n.t('welcome', { name: 'Bob', count: 5 });
// => 'Welcome back, Bob. You have 5 notifications.'

// Missing key returns the key itself
i18n.t('does.not.exist');
// => 'does.not.exist'</code></pre>
      </div>
      <p>Since <code>t()</code> reads the reactive <code>locale</code> pulse internally, any <code>effect()</code> or computed value that calls <code>t()</code> will automatically re-run when the locale changes.</p>
      <div class="code-block">
        <pre><code>// Reactive usage in the DOM
const label = el('span', () => i18n.t('greeting', { name: 'Alice' }));
// Text updates automatically when locale changes

// In an effect
effect(() => {
  document.title = i18n.t('page.title');
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Pluralization &mdash; tc(key, count, params?)</h2>
      <p>The <code>tc()</code> function handles pluralization using pipe-separated forms in your messages. The default English rule uses three forms: <strong>zero</strong> | <strong>one</strong> | <strong>other</strong>.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      items: 'No items | One item | {count} items',
      messages: 'No messages | {count} message | {count} messages',
      cart: 'Cart is empty | {count} item in cart | {count} items in cart'
    },
    fr: {
      items: 'Aucun \u00e9l\u00e9ment | Un \u00e9l\u00e9ment | {count} \u00e9l\u00e9ments'
    }
  }
});

// Plural forms:  index 0 (zero) | index 1 (one) | index 2 (other)
i18n.tc('items', 0);   // => 'No items'
i18n.tc('items', 1);   // => 'One item'
i18n.tc('items', 5);   // => '5 items'
i18n.tc('items', 42);  // => '42 items'

// {count} is automatically available as a parameter
i18n.tc('messages', 0);   // => 'No messages'
i18n.tc('messages', 1);   // => '1 message'
i18n.tc('messages', 12);  // => '12 messages'

// Additional parameters alongside count
i18n.tc('cart', 3, { currency: 'USD' });
// => '3 items in cart'</code></pre>
      </div>

      <h3>Default Plural Rules (English)</h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>Count</th>
              <th>Index</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>0</td><td>0</td><td>zero</td></tr>
            <tr><td>1</td><td>1</td><td>one</td></tr>
            <tr><td>2+</td><td>2</td><td>other</td></tr>
          </tbody>
        </table>
      </div>

      <h3>Custom Plural Rules</h3>
      <p>Languages with complex plural rules (Slavic, Arabic, etc.) can provide a custom rule function that returns the plural form index for a given count.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {
    ru: {
      // Forms: many | one | few
      apples: '{count} \u044f\u0431\u043b\u043e\u043a | {count} \u044f\u0431\u043b\u043e\u043a\u043e | {count} \u044f\u0431\u043b\u043e\u043a\u0430'
    }
  },
  pluralRules: {
    ru: (count) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return 1;      // one
      if (mod10 >= 2 && mod10 <= 4 &&
          (mod100 < 10 || mod100 >= 20)) return 2;      // few
      return 0;                                          // many
    }
  }
});

i18n.tc('apples', 1);   // => '1 \u044f\u0431\u043b\u043e\u043a\u043e'
i18n.tc('apples', 3);   // => '3 \u044f\u0431\u043b\u043e\u043a\u0430'
i18n.tc('apples', 5);   // => '5 \u044f\u0431\u043b\u043e\u043a'
i18n.tc('apples', 21);  // => '21 \u044f\u0431\u043b\u043e\u043a\u043e'</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Locale Switching</h2>
      <p>The <code>locale</code> property on the i18n instance is a reactive Pulse. When you call <code>setLocale()</code>, every <code>t()</code> call inside an <code>effect()</code> or reactive binding automatically re-evaluates.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { title: 'Welcome', lang: 'English' },
    fr: { title: 'Bienvenue', lang: 'Fran\u00e7ais' },
    es: { title: 'Bienvenido', lang: 'Espa\u00f1ol' }
  }
});

// Read the current locale (reactive)
console.log(i18n.locale.get()); // 'en'

// Switch locale - all UI updates automatically
i18n.setLocale('fr');
console.log(i18n.locale.get()); // 'fr'

// Build a language switcher
const LanguageSwitcher = () => el('.lang-switcher', [
  el('button', {
    onclick: () => i18n.setLocale('en'),
    class: () => i18n.locale.get() === 'en' ? 'active' : ''
  }, 'EN'),
  el('button', {
    onclick: () => i18n.setLocale('fr'),
    class: () => i18n.locale.get() === 'fr' ? 'active' : ''
  }, 'FR'),
  el('button', {
    onclick: () => i18n.setLocale('es'),
    class: () => i18n.locale.get() === 'es' ? 'active' : ''
  }, 'ES')
]);

// Reactive heading that updates on locale change
const heading = el('h1', () => i18n.t('title'));

// Get available locales
console.log(i18n.availableLocales); // ['en', 'fr', 'es']</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Adding Messages Dynamically</h2>
      <p>Use <code>loadMessages(locale, messages)</code> to add or merge translations at runtime. This is useful for lazy-loading translations or loading them from an API. If messages already exist for the locale, they are deep-merged.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { hello: 'Hello' }
  }
});

// Add a new locale entirely
i18n.loadMessages('de', {
  hello: 'Hallo',
  goodbye: 'Tsch\u00fcss',
  nav: { home: 'Startseite', about: '\u00dcber uns' }
});

// Merge into an existing locale (deep merge)
i18n.loadMessages('en', {
  goodbye: 'Goodbye',
  nav: { home: 'Home', about: 'About Us' }
});
// en now has: { hello: 'Hello', goodbye: 'Goodbye', nav: { home: 'Home', about: 'About Us' } }

// Lazy-load translations on locale change
effect(async () => {
  const loc = i18n.locale.get();
    translations.get();
  if (loc !== 'en') {
    const msgs = await fetch(\`/locales/\${loc}.json\`).then(r => r.json());
    i18n.loadMessages(loc, msgs);
  }
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Checking if a Key Exists &mdash; te(key, locale?)</h2>
      <p>The <code>te()</code> function checks whether a translation key exists. Optionally pass a specific locale to check; defaults to the current locale.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { hello: 'Hello', nested: { key: 'value' } },
    fr: { hello: 'Bonjour' }
  }
});

i18n.te('hello');           // true
i18n.te('goodbye');         // false
i18n.te('nested.key');      // true
i18n.te('hello', 'fr');    // true (check specific locale)
i18n.te('nested.key', 'fr'); // false

// Conditional rendering based on key existence
const Greeting = () => el('div',
  i18n.te('greeting')
    ? el('p', () => i18n.t('greeting'))
    : el('p', () => i18n.t('hello'))
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Fallback Locale</h2>
      <p>When a key is not found in the active locale, Pulse automatically tries the <code>fallbackLocale</code> before returning the raw key or calling the missing handler. This ensures your app always displays meaningful text even with incomplete translations.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'fr',
  fallbackLocale: 'en',
  messages: {
    en: {
      greeting: 'Hello!',
      farewell: 'Goodbye!',
      help: 'Need help? Contact us.'
    },
    fr: {
      greeting: 'Bonjour !'
      // 'farewell' and 'help' are missing in French
    }
  }
});

i18n.t('greeting');  // => 'Bonjour !'     (found in 'fr')
i18n.t('farewell');  // => 'Goodbye!'       (fallback to 'en')
i18n.t('help');      // => 'Need help? Contact us.'  (fallback to 'en')
i18n.t('unknown');   // => 'unknown'        (not found anywhere, returns key)</code></pre>
      </div>
      <p>The fallback chain is: <strong>current locale</strong> &rarr; <strong>fallback locale</strong> &rarr; <strong>missing handler</strong> (if set) &rarr; <strong>raw key string</strong>.</p>
    </section>

    <section class="doc-section">
      <h2>Missing Key Handler</h2>
      <p>The <code>missing</code> option lets you intercept keys that are not found in any locale. This is useful for logging, reporting to a translation management system, or providing a custom fallback.</p>
      <div class="code-block">
        <pre><code>// Log missing keys during development
const i18n = createI18n({
  locale: 'en',
  messages: { en: { hello: 'Hello' } },
  missing: (locale, key) => {
    console.warn(\`[i18n] Missing: "\${key}" for locale "\${locale}"\`);
    return \`\u26a0 \${key}\`;
  }
});

i18n.t('hello');        // => 'Hello'
i18n.t('not.found');    // logs warning, returns '\u26a0 not.found'

// Report to translation service
const i18n = createI18n({
  locale: 'en',
  messages: { en: {} },
  missing: (locale, key) => {
    // Send to your TMS for tracking untranslated keys
    fetch('/api/translations/missing', {
      method: 'POST',
      body: JSON.stringify({ locale, key })
    });
    return key;
  }
});

// Return a styled placeholder in development
const i18n = createI18n({
  locale: 'en',
  messages: { en: {} },
  missing: (locale, key) => \`[\${locale}:\${key}]\`
});

i18n.t('page.title');   // => '[en:page.title]'</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Modifiers</h2>
      <p>Modifiers are named transform functions that you apply to translation output using the pipe syntax: <code>t('key | modifier')</code>. Multiple modifiers can be chained with additional pipes.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'hello, {name}',
      title: 'pulse framework',
      status: 'task completed'
    }
  },
  modifiers: {
    upper: (v) => v.toUpperCase(),
    lower: (v) => v.toLowerCase(),
    capitalize: (v) => v.charAt(0).toUpperCase() + v.slice(1),
    titleCase: (v) => v.replace(/\\b\\w/g, c => c.toUpperCase()),
    trim: (v) => v.trim()
  }
});

// Apply a single modifier with ' | '
i18n.t('greeting | upper', { name: 'alice' });
// => 'HELLO, ALICE'

i18n.t('greeting | capitalize', { name: 'alice' });
// => 'Hello, alice'

i18n.t('title | titleCase');
// => 'Pulse Framework'

// Chain multiple modifiers (left to right)
i18n.t('status | upper | trim');
// => 'TASK COMPLETED'

// Note: the pipe separator must be ' | ' (with spaces)
// Modifiers are applied AFTER interpolation</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>useI18n() Hook</h2>
      <p>After calling <code>i18n.install()</code> on an instance, the <code>useI18n()</code> hook provides access to the global i18n instance from anywhere in your application without passing it through props or context.</p>
      <div class="code-block">
        <pre><code>import { createI18n, useI18n } from 'pulse-js-framework/runtime/i18n';

// Setup (typically in your app entry point)
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: { nav: { home: 'Home', settings: 'Settings' } },
    fr: { nav: { home: 'Accueil', settings: 'Param\u00e8tres' } }
  }
});
i18n.install();  // Set as global default

// In any component (no imports of the instance needed)
function NavBar() {
  const { t, locale, setLocale } = useI18n();

  return el('nav', [
    el('a', () => t('nav.home')),
    el('a', () => t('nav.settings')),
    el('span', () => \`Locale: \${locale.get()}\`)
  ]);
}

// useI18n() throws I18nError if no instance is installed
try {
  useI18n();
} catch (e) {
  // I18nError: No i18n instance installed.
  // Call createI18n().install() first.
}</code></pre>
      </div>

      <h3>useI18n() Return Value</h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Type</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>t(key, params?)</code></td>
              <td><code>Function</code></td>
              <td>Translate a key with optional interpolation</td>
            </tr>
            <tr>
              <td><code>tc(key, count, params?)</code></td>
              <td><code>Function</code></td>
              <td>Translate with pluralization</td>
            </tr>
            <tr>
              <td><code>te(key, locale?)</code></td>
              <td><code>Function</code></td>
              <td>Check if a translation key exists</td>
            </tr>
            <tr>
              <td><code>tm(key)</code></td>
              <td><code>Function</code></td>
              <td>Get raw message value without interpolation</td>
            </tr>
            <tr>
              <td><code>locale</code></td>
              <td><code>Pulse&lt;string&gt;</code></td>
              <td>Reactive current locale</td>
            </tr>
            <tr>
              <td><code>setLocale(locale)</code></td>
              <td><code>Function</code></td>
              <td>Change the active locale</td>
            </tr>
            <tr>
              <td><code>availableLocales</code></td>
              <td><code>string[]</code></td>
              <td>List of locales that have messages loaded</td>
            </tr>
            <tr>
              <td><code>n(value, opts?)</code></td>
              <td><code>Function</code></td>
              <td>Format number using Intl.NumberFormat</td>
            </tr>
            <tr>
              <td><code>d(value, opts?)</code></td>
              <td><code>Function</code></td>
              <td>Format date using Intl.DateTimeFormat</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2>I18nError</h2>
      <p>The <code>I18nError</code> class extends <code>RuntimeError</code> and is thrown for i18n-specific issues such as calling <code>useI18n()</code> without a global instance.</p>
      <div class="code-block">
        <pre><code>import { I18nError } from 'pulse-js-framework/runtime/i18n';

// Check if an error is an I18nError
try {
  useI18n();
} catch (error) {
  if (I18nError.isI18nError(error)) {
    console.error('i18n error:', error.message);
    // error.code === 'I18N_ERROR'
  }
}

// I18nError extends RuntimeError extends PulseError
// It includes: message, code, suggestion, stack</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Number &amp; Date Formatting</h2>
      <p>The i18n instance provides <code>n()</code> for locale-aware number formatting and <code>d()</code> for date formatting, both powered by the <code>Intl</code> API.</p>
      <div class="code-block">
        <pre><code>const i18n = createI18n({ locale: 'en' });

// Number formatting
i18n.n(1234567.89);
// => '1,234,567.89' (en)

i18n.n(1234567.89, { style: 'currency', currency: 'USD' });
// => '$1,234,567.89'

i18n.n(0.75, { style: 'percent' });
// => '75%'

// Switch to German locale
i18n.setLocale('de');
i18n.n(1234567.89);
// => '1.234.567,89'

// Date formatting
i18n.setLocale('en');
i18n.d(new Date(2026, 1, 12));
// => '2/12/2026'

i18n.d(new Date(), { dateStyle: 'full' });
// => 'Thursday, February 12, 2026'

i18n.d(new Date(), { year: 'numeric', month: 'long', day: 'numeric' });
// => 'February 12, 2026'

i18n.setLocale('fr');
i18n.d(new Date(2026, 1, 12));
// => '12/02/2026'</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Full Example</h2>
      <p>A complete example bringing together all features: messages, interpolation, pluralization, locale switching, dynamic loading, modifiers, and the <code>useI18n()</code> hook.</p>
      <div class="code-block">
        <pre><code>import { createI18n, useI18n } from 'pulse-js-framework/runtime/i18n';
import { el, mount, effect, pulse, list } from 'pulse-js-framework/runtime';

// ---- Setup ----

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en: {
      app: {
        title: 'My Todo App',
        greeting: 'Hello, {name}!',
        tasks: 'No tasks | {count} task | {count} tasks',
        addTask: 'Add Task',
        placeholder: 'What needs to be done?',
        remaining: '{count} remaining',
        clear: 'Clear completed'
      }
    },
    fr: {
      app: {
        title: 'Mon Appli Tâches',
        greeting: 'Bonjour, {name} !',
        tasks: 'Aucune t\u00e2che | {count} t\u00e2che | {count} t\u00e2ches',
        addTask: 'Ajouter',
        placeholder: 'Que faut-il faire ?',
        remaining: '{count} restante(s)',
        clear: 'Effacer termin\u00e9es'
      }
    }
  },
  missing: (locale, key) => {
    console.warn(\`[i18n] Missing: \${locale}.\${key}\`);
    return key.split('.').pop();
  },
  modifiers: {
    upper: (v) => v.toUpperCase(),
    capitalize: (v) => v.charAt(0).toUpperCase() + v.slice(1)
  }
});

i18n.install();

// ---- App State ----

const userName = pulse('Alice');
const todos = pulse([
  { id: 1, text: 'Learn Pulse', done: false },
  { id: 2, text: 'Build an app', done: false }
]);

// ---- Components ----

function Header() {
  const { t, tc, locale, setLocale } = useI18n();

  return el('header', [
    el('h1', () => t('app.title | upper')),
    el('p', () => t('app.greeting', { name: userName.get() })),
    el('p.count', () => tc('app.tasks', todos.get().length)),
    el('.lang-switch', [
      el('button', {
        onclick: () => setLocale('en'),
        class: () => locale.get() === 'en' ? 'active' : ''
      }, 'EN'),
      el('button', {
        onclick: () => setLocale('fr'),
        class: () => locale.get() === 'fr' ? 'active' : ''
      }, 'FR')
    ])
  ]);
}

function TodoList() {
  const { t } = useI18n();
  const newText = pulse('');

  const addTodo = () => {
    const text = newText.get().trim();
    if (!text) return;
    todos.update(arr => [...arr, { id: Date.now(), text, done: false }]);
    newText.set('');
  };

  return el('.todo-list', [
    el('.input-row', [
      el('input[type=text]', {
        value: () => newText.get(),
        placeholder: () => t('app.placeholder'),
        oninput: (e) => newText.set(e.target.value),
        onkeydown: (e) => e.key === 'Enter' && addTodo()
      }),
      el('button', { onclick: addTodo }, () => t('app.addTask'))
    ]),
    list(
      () => todos.get(),
      (todo) => el('li', { class: () => todo.done ? 'done' : '' }, [
        el('input[type=checkbox]', {
          checked: () => todo.done,
          onchange: () => todos.update(arr =>
            arr.map(t => t.id === todo.id ? { ...t, done: !t.done } : t)
          )
        }),
        el('span', todo.text)
      ]),
      (todo) => todo.id
    )
  ]);
}

function App() {
  return el('.app', [Header(), TodoList()]);
}

mount('#app', App());

// ---- Lazy-load Spanish later ----

setTimeout(async () => {
  i18n.loadMessages('es', {
    app: {
      title: 'Mi App de Tareas',
      greeting: '\u00a1Hola, {name}!',
      tasks: 'Sin tareas | {count} tarea | {count} tareas',
      addTask: 'A\u00f1adir',
      placeholder: '\u00bfQu\u00e9 hay que hacer?',
      remaining: '{count} pendiente(s)',
      clear: 'Borrar completadas'
    }
  });
  // Now 'es' is available: i18n.setLocale('es');
}, 2000);</code></pre>
      </div>
    </section>
  `;

  // Apply i18n translations
  effect(() => {
    locale.get();
    translations.get();
    page.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    page.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  });

  return page;
}
