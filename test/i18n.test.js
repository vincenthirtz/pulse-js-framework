/**
 * i18n Module Tests
 * Tests for runtime/i18n.js — createI18n, useI18n, I18nError
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

import { pulse, effect, resetContext } from '../runtime/pulse.js';
import { createI18n, useI18n, I18nError } from '../runtime/i18n.js';

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeEach(() => {
  resetContext();
});

afterEach(() => {
  resetContext();
});

// ============================================================================
// I18nError Tests
// ============================================================================

describe('I18nError', () => {
  test('creates error with correct name', () => {
    const err = new I18nError('test');
    assert.strictEqual(err.name, 'I18nError');
  });

  test('isI18nError detects correctly', () => {
    assert.ok(I18nError.isI18nError(new I18nError('test')));
    assert.ok(!I18nError.isI18nError(new Error('test')));
  });
});

// ============================================================================
// createI18n - Basic Translation (t)
// ============================================================================

describe('t() — simple translations', () => {
  test('translates a simple key', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' }
      }
    });
    assert.strictEqual(i18n.t('hello'), 'Hello');
  });

  test('returns key when translation is missing', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    });
    assert.strictEqual(i18n.t('missing.key'), 'missing.key');
  });

  test('resolves nested keys with dot notation', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          greeting: {
            morning: 'Good morning',
            evening: 'Good evening'
          }
        }
      }
    });
    assert.strictEqual(i18n.t('greeting.morning'), 'Good morning');
    assert.strictEqual(i18n.t('greeting.evening'), 'Good evening');
  });

  test('returns key for non-string message (object)', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { greeting: { morning: 'hi' } }
      }
    });
    // 'greeting' resolves to an object, not a string
    assert.strictEqual(i18n.t('greeting'), 'greeting');
  });
});

// ============================================================================
// t() — Interpolation
// ============================================================================

describe('t() — interpolation', () => {
  test('interpolates {param} placeholders', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { welcome: 'Welcome, {name}!' }
      }
    });
    assert.strictEqual(i18n.t('welcome', { name: 'Alice' }), 'Welcome, Alice!');
  });

  test('leaves unmatched placeholders as-is', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { msg: 'Hello {name}, age {age}' }
      }
    });
    assert.strictEqual(i18n.t('msg', { name: 'Bob' }), 'Hello Bob, age {age}');
  });

  test('interpolates numbers and booleans', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { info: 'Count: {count}, active: {active}' }
      }
    });
    assert.strictEqual(
      i18n.t('info', { count: 42, active: true }),
      'Count: 42, active: true'
    );
  });
});

// ============================================================================
// t() — Modifiers
// ============================================================================

describe('t() — modifiers', () => {
  test('applies single modifier', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { greeting: 'hello world' }
      },
      modifiers: {
        upper: (v) => v.toUpperCase()
      }
    });
    assert.strictEqual(i18n.t('greeting | upper'), 'HELLO WORLD');
  });

  test('applies chained modifiers', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { name: 'alice' }
      },
      modifiers: {
        upper: (v) => v.toUpperCase(),
        trim: (v) => v.trim(),
      }
    });
    // Pipe chaining
    assert.strictEqual(i18n.t('name | upper'), 'ALICE');
  });

  test('ignores unknown modifiers', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { val: 'test' }
      },
      modifiers: {}
    });
    assert.strictEqual(i18n.t('val | nonexistent'), 'test');
  });
});

// ============================================================================
// tc() — Pluralization
// ============================================================================

describe('tc() — pluralization', () => {
  test('selects zero form for count 0', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { items: 'no items | one item | {count} items' }
      }
    });
    assert.strictEqual(i18n.tc('items', 0), 'no items');
  });

  test('selects one form for count 1', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { items: 'no items | one item | {count} items' }
      }
    });
    assert.strictEqual(i18n.tc('items', 1), 'one item');
  });

  test('selects other form for count > 1', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { items: 'no items | one item | {count} items' }
      }
    });
    assert.strictEqual(i18n.tc('items', 5), '5 items');
  });

  test('interpolates count and additional params', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { tasks: 'no tasks for {user} | one task for {user} | {count} tasks for {user}' }
      }
    });
    assert.strictEqual(i18n.tc('tasks', 3, { user: 'Alice' }), '3 tasks for Alice');
  });

  test('falls back to last form when fewer forms than needed', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { things: 'one thing | many things' }
      }
    });
    // zero → index 0 → 'one thing' (clamps to available)
    // For count=0, plural index is 0 → 'one thing'
    assert.strictEqual(i18n.tc('things', 0), 'one thing');
    assert.strictEqual(i18n.tc('things', 1), 'many things');
    assert.strictEqual(i18n.tc('things', 5), 'many things');
  });

  test('uses custom plural rules', () => {
    const i18n = createI18n({
      locale: 'ru',
      messages: {
        ru: { apples: 'яблоко | яблока | яблок' }
      },
      pluralRules: {
        ru: (count) => {
          const mod10 = count % 10;
          const mod100 = count % 100;
          if (mod10 === 1 && mod100 !== 11) return 0;
          if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 1;
          return 2;
        }
      }
    });
    assert.strictEqual(i18n.tc('apples', 1), 'яблоко');
    assert.strictEqual(i18n.tc('apples', 3), 'яблока');
    assert.strictEqual(i18n.tc('apples', 5), 'яблок');
    assert.strictEqual(i18n.tc('apples', 21), 'яблоко');
  });

  test('returns key for missing pluralization key', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    });
    assert.strictEqual(i18n.tc('missing', 5), 'missing');
  });
});

// ============================================================================
// te() — Key Existence
// ============================================================================

describe('te() — key existence', () => {
  test('returns true for existing key', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' } }
    });
    assert.strictEqual(i18n.te('hello'), true);
  });

  test('returns false for missing key', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    });
    assert.strictEqual(i18n.te('nope'), false);
  });

  test('checks specific locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: { bonjour: 'Bonjour' }
      }
    });
    assert.strictEqual(i18n.te('bonjour', 'fr'), true);
    assert.strictEqual(i18n.te('bonjour', 'en'), false);
  });
});

// ============================================================================
// tm() — Raw Message
// ============================================================================

describe('tm() — raw message', () => {
  test('returns raw message string', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { welcome: 'Welcome {name}!' } }
    });
    assert.strictEqual(i18n.tm('welcome'), 'Welcome {name}!');
  });

  test('returns nested object for parent key', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { nav: { home: 'Home', about: 'About' } } }
    });
    const raw = i18n.tm('nav');
    assert.deepStrictEqual(raw, { home: 'Home', about: 'About' });
  });

  test('returns undefined for missing key', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    });
    assert.strictEqual(i18n.tm('nope'), undefined);
  });

  test('falls back to fallback locale', () => {
    const i18n = createI18n({
      locale: 'fr',
      fallbackLocale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: {}
      }
    });
    assert.strictEqual(i18n.tm('hello'), 'Hello');
  });
});

// ============================================================================
// setLocale() — Reactive Locale Switching
// ============================================================================

describe('setLocale() — locale switching', () => {
  test('changes locale reactively', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { greeting: 'Hello' },
        fr: { greeting: 'Bonjour' }
      }
    });

    assert.strictEqual(i18n.t('greeting'), 'Hello');
    assert.strictEqual(i18n.locale.get(), 'en');

    i18n.setLocale('fr');

    assert.strictEqual(i18n.locale.get(), 'fr');
    assert.strictEqual(i18n.t('greeting'), 'Bonjour');
  });

  test('setting locale to unknown does not crash', () => {
    const i18n = createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      messages: { en: { hello: 'Hello' } }
    });
    i18n.setLocale('xx');
    assert.strictEqual(i18n.locale.get(), 'xx');
    // Falls back to 'en' fallback locale
    assert.strictEqual(i18n.t('hello'), 'Hello');
  });
});

// ============================================================================
// loadMessages() — Dynamic Loading
// ============================================================================

describe('loadMessages() — dynamic loading', () => {
  test('loads new locale messages', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hello: 'Hello' } }
    });

    i18n.loadMessages('fr', { hello: 'Bonjour', goodbye: 'Au revoir' });

    i18n.setLocale('fr');
    assert.strictEqual(i18n.t('hello'), 'Bonjour');
    assert.strictEqual(i18n.t('goodbye'), 'Au revoir');
  });

  test('deep merges into existing locale', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: {
          nav: { home: 'Home' },
          greeting: 'Hello'
        }
      }
    });

    i18n.loadMessages('en', {
      nav: { about: 'About' },
      farewell: 'Goodbye'
    });

    assert.strictEqual(i18n.t('nav.home'), 'Home');
    assert.strictEqual(i18n.t('nav.about'), 'About');
    assert.strictEqual(i18n.t('greeting'), 'Hello');
    assert.strictEqual(i18n.t('farewell'), 'Goodbye');
  });

  test('deep merge blocks prototype pollution', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { safe: 'yes' } }
    });

    i18n.loadMessages('en', JSON.parse('{"__proto__": {"polluted": true}, "safe": "still yes"}'));

    // Object.prototype should NOT be polluted
    assert.strictEqual(({}).polluted, undefined);
    assert.strictEqual(i18n.t('safe'), 'still yes');
  });
});

// ============================================================================
// n() — Number Formatting
// ============================================================================

describe('n() — number formatting', () => {
  test('formats numbers using locale', () => {
    const i18n = createI18n({ locale: 'en' });
    const formatted = i18n.n(1234.56);
    assert.ok(formatted.includes('1'));
    assert.ok(typeof formatted === 'string');
  });

  test('formats with options', () => {
    const i18n = createI18n({ locale: 'en' });
    const formatted = i18n.n(0.75, { style: 'percent' });
    assert.ok(formatted.includes('75'));
  });

  test('returns string for invalid input', () => {
    const i18n = createI18n({ locale: 'en' });
    const result = i18n.n(NaN);
    assert.strictEqual(typeof result, 'string');
  });
});

// ============================================================================
// d() — Date Formatting
// ============================================================================

describe('d() — date formatting', () => {
  test('formats dates using locale', () => {
    const i18n = createI18n({ locale: 'en' });
    const date = new Date(2025, 0, 15);
    const formatted = i18n.d(date);
    assert.ok(typeof formatted === 'string');
    assert.ok(formatted.length > 0);
  });

  test('formats with options', () => {
    const i18n = createI18n({ locale: 'en' });
    const date = new Date(2025, 0, 15);
    const formatted = i18n.d(date, { year: 'numeric', month: 'long' });
    assert.ok(formatted.includes('2025'));
    assert.ok(formatted.includes('January'));
  });
});

// ============================================================================
// Fallback Locale
// ============================================================================

describe('Fallback locale', () => {
  test('falls back to fallbackLocale when key missing in current locale', () => {
    const i18n = createI18n({
      locale: 'fr',
      fallbackLocale: 'en',
      messages: {
        en: { hello: 'Hello', goodbye: 'Goodbye' },
        fr: { hello: 'Bonjour' }
      }
    });

    assert.strictEqual(i18n.t('hello'), 'Bonjour');
    assert.strictEqual(i18n.t('goodbye'), 'Goodbye'); // fallback
  });

  test('returns key when both current and fallback miss', () => {
    const i18n = createI18n({
      locale: 'fr',
      fallbackLocale: 'en',
      messages: { en: {}, fr: {} }
    });
    assert.strictEqual(i18n.t('nope'), 'nope');
  });
});

// ============================================================================
// Missing Key Handler
// ============================================================================

describe('Missing key handler', () => {
  test('calls custom missing handler', () => {
    const missing = [];
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} },
      missing: (locale, key) => {
        missing.push({ locale, key });
        return `[${locale}:${key}]`;
      }
    });

    const result = i18n.t('unknown');
    assert.strictEqual(result, '[en:unknown]');
    assert.strictEqual(missing.length, 1);
    assert.strictEqual(missing[0].key, 'unknown');
  });
});

// ============================================================================
// useI18n Hook
// ============================================================================

describe('useI18n', () => {
  test('throws when no instance installed', () => {
    assert.throws(
      () => useI18n(),
      (err) => I18nError.isI18nError(err)
    );
  });

  test('returns i18n methods after install()', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: { hi: 'Hi' } }
    });
    i18n.install();

    const { t, tc, te, tm, locale, setLocale, n, d } = useI18n();
    assert.strictEqual(typeof t, 'function');
    assert.strictEqual(typeof tc, 'function');
    assert.strictEqual(typeof te, 'function');
    assert.strictEqual(typeof tm, 'function');
    assert.strictEqual(typeof setLocale, 'function');
    assert.strictEqual(typeof n, 'function');
    assert.strictEqual(typeof d, 'function');
    assert.strictEqual(t('hi'), 'Hi');
  });
});

// ============================================================================
// availableLocales
// ============================================================================

describe('availableLocales', () => {
  test('returns list of loaded locales', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: {
        en: { hello: 'Hello' },
        fr: { hello: 'Bonjour' },
        de: { hello: 'Hallo' }
      }
    });
    const locales = i18n.availableLocales;
    assert.deepStrictEqual(locales.sort(), ['de', 'en', 'fr']);
  });

  test('updates after loadMessages', () => {
    const i18n = createI18n({
      locale: 'en',
      messages: { en: {} }
    });
    assert.deepStrictEqual(i18n.availableLocales, ['en']);

    i18n.loadMessages('ja', { hello: 'こんにちは' });
    assert.ok(i18n.availableLocales.includes('ja'));
  });
});
