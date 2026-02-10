/**
 * Pulse Context API Tests
 *
 * Tests for runtime/context.js - the context/dependency injection system
 *
 * @module test/context
 */

import { pulse, effect, computed, resetContext } from '../runtime/pulse.js';
import {
  createContext,
  useContext,
  Provider,
  Consumer,
  isContext,
  getContextDepth,
  disposeContext,
  useContextSelector,
  provideMany
} from '../runtime/context.js';

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// createContext Tests
// =============================================================================

describe('createContext Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('creates a context with default value', () => {
    const ctx = createContext('default');
    assert.strictEqual(ctx.defaultValue, 'default');
    assert.ok(ctx._id !== undefined, 'Context should have an _id');
    assert.ok(ctx.displayName.startsWith('Context'), 'Should have a displayName');
    disposeContext(ctx);
  });

  test('creates a context with custom displayName', () => {
    const ctx = createContext(null, { displayName: 'ThemeContext' });
    assert.strictEqual(ctx.displayName, 'ThemeContext');
    disposeContext(ctx);
  });

  test('creates a context with object default', () => {
    const defaultUser = { name: 'Guest', role: 'anonymous' };
    const ctx = createContext(defaultUser);
    assert.strictEqual(ctx.defaultValue, defaultUser);
    disposeContext(ctx);
  });

  test('context is frozen', () => {
    const ctx = createContext('value');
    let threw = false;
    try {
      ctx.defaultValue = 'newValue';
    } catch (e) {
      threw = true;
    }
    // In strict mode, this throws. In non-strict, it silently fails.
    assert.strictEqual(ctx.defaultValue, 'value', 'Context properties should not be mutable');
    disposeContext(ctx);
  });
});

// =============================================================================
// useContext Tests
// =============================================================================

describe('useContext Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('useContext returns default value when no provider', () => {
    const ThemeContext = createContext('light');
    const theme = useContext(ThemeContext);
    assert.strictEqual(theme.get(), 'light');
    disposeContext(ThemeContext);
  });

  test('useContext returns default object when no provider', () => {
    const UserContext = createContext({ name: 'Guest' });
    const user = useContext(UserContext);
    assert.deepStrictEqual(user.get(), { name: 'Guest' });
    disposeContext(UserContext);
  });

  test('useContext throws for invalid context', () => {
    let threw = false;
    try {
      useContext(null);
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('valid context'), 'Should mention valid context');
    }
    assert.ok(threw, 'Should throw for null context');
  });

  test('useContext throws for plain object (not a context)', () => {
    let threw = false;
    try {
      useContext({ defaultValue: 'test' });
    } catch (e) {
      threw = true;
    }
    assert.ok(threw, 'Should throw for plain object');
  });
});

// =============================================================================
// Provider Tests
// =============================================================================

describe('Provider Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('Provider provides value to children', () => {
    const ThemeContext = createContext('light');
    let capturedTheme;

    Provider(ThemeContext, 'dark', () => {
      capturedTheme = useContext(ThemeContext).get();
    });

    assert.strictEqual(capturedTheme, 'dark');
    disposeContext(ThemeContext);
  });

  test('Provider works with reactive pulse values', () => {
    const ThemeContext = createContext('light');
    const themePulse = pulse('dark');
    let capturedPulse;

    Provider(ThemeContext, themePulse, () => {
      capturedPulse = useContext(ThemeContext);
    });

    assert.strictEqual(capturedPulse.get(), 'dark');

    // Update the pulse
    themePulse.set('light');
    assert.strictEqual(capturedPulse.get(), 'light');
    disposeContext(ThemeContext);
  });

  test('Provider restores context after children render', () => {
    const ThemeContext = createContext('default');

    // Before provider
    assert.strictEqual(useContext(ThemeContext).get(), 'default');

    Provider(ThemeContext, 'provided', () => {
      assert.strictEqual(useContext(ThemeContext).get(), 'provided');
    });

    // After provider - should be back to default
    assert.strictEqual(useContext(ThemeContext).get(), 'default');
    disposeContext(ThemeContext);
  });

  test('Provider supports nested providers', () => {
    const ThemeContext = createContext('light');
    let innerTheme;
    let outerTheme;

    Provider(ThemeContext, 'dark', () => {
      outerTheme = useContext(ThemeContext).get();

      Provider(ThemeContext, 'blue', () => {
        innerTheme = useContext(ThemeContext).get();
      });

      // After inner provider, should be back to dark
      assert.strictEqual(useContext(ThemeContext).get(), 'dark');
    });

    assert.strictEqual(outerTheme, 'dark');
    assert.strictEqual(innerTheme, 'blue');
    disposeContext(ThemeContext);
  });

  test('Provider throws for invalid context', () => {
    let threw = false;
    try {
      Provider(null, 'value', () => {});
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('valid context'), 'Should mention valid context');
    }
    assert.ok(threw, 'Should throw for null context');
  });

  test('Provider can return children directly (not a function)', () => {
    const ThemeContext = createContext('light');
    const result = Provider(ThemeContext, 'dark', 'static-content');
    assert.strictEqual(result, 'static-content');
    disposeContext(ThemeContext);
  });
});

// =============================================================================
// Consumer Tests
// =============================================================================

describe('Consumer Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('Consumer renders with context value', () => {
    const ThemeContext = createContext('light');
    let renderedValue;

    Provider(ThemeContext, 'dark', () => {
      Consumer(ThemeContext, (theme) => {
        renderedValue = theme.get();
      });
    });

    assert.strictEqual(renderedValue, 'dark');
    disposeContext(ThemeContext);
  });

  test('Consumer uses default when no provider', () => {
    const ThemeContext = createContext('default-theme');
    let renderedValue;

    Consumer(ThemeContext, (theme) => {
      renderedValue = theme.get();
    });

    assert.strictEqual(renderedValue, 'default-theme');
    disposeContext(ThemeContext);
  });

  test('Context.Consumer shorthand works', () => {
    const ThemeContext = createContext('light');
    let renderedValue;

    Provider(ThemeContext, 'dark', () => {
      ThemeContext.Consumer((theme) => {
        renderedValue = theme.get();
      });
    });

    assert.strictEqual(renderedValue, 'dark');
    disposeContext(ThemeContext);
  });
});

// =============================================================================
// Context.Provider Shorthand Tests
// =============================================================================

describe('Context Shorthand Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('Context.Provider shorthand works', () => {
    const ThemeContext = createContext('light');
    let capturedTheme;

    ThemeContext.Provider('dark', () => {
      capturedTheme = useContext(ThemeContext).get();
    });

    assert.strictEqual(capturedTheme, 'dark');
    disposeContext(ThemeContext);
  });
});

// =============================================================================
// isContext Tests
// =============================================================================

describe('isContext Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('isContext returns true for valid context', () => {
    const ctx = createContext('test');
    assert.ok(isContext(ctx), 'Should return true for valid context');
    disposeContext(ctx);
  });

  test('isContext returns false for non-context objects', () => {
    assert.ok(!isContext(null), 'null is not a context');
    assert.ok(!isContext(undefined), 'undefined is not a context');
    assert.ok(!isContext({}), 'plain object is not a context');
    assert.ok(!isContext({ _id: 'not-a-symbol' }), 'object with string _id is not a context');
    assert.ok(!isContext({ _id: Symbol('fake') }), 'object with unknown symbol is not a context');
  });
});

// =============================================================================
// getContextDepth Tests
// =============================================================================

describe('getContextDepth Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('getContextDepth returns 0 with no providers', () => {
    const ctx = createContext('default');
    assert.strictEqual(getContextDepth(ctx), 0);
    disposeContext(ctx);
  });

  test('getContextDepth returns correct depth with providers', () => {
    const ctx = createContext('default');

    assert.strictEqual(getContextDepth(ctx), 0);

    Provider(ctx, 'level1', () => {
      assert.strictEqual(getContextDepth(ctx), 1);

      Provider(ctx, 'level2', () => {
        assert.strictEqual(getContextDepth(ctx), 2);

        Provider(ctx, 'level3', () => {
          assert.strictEqual(getContextDepth(ctx), 3);
        });

        assert.strictEqual(getContextDepth(ctx), 2);
      });

      assert.strictEqual(getContextDepth(ctx), 1);
    });

    assert.strictEqual(getContextDepth(ctx), 0);
    disposeContext(ctx);
  });

  test('getContextDepth returns 0 for invalid context', () => {
    assert.strictEqual(getContextDepth(null), 0);
    assert.strictEqual(getContextDepth(undefined), 0);
    assert.strictEqual(getContextDepth({}), 0);
  });
});

// =============================================================================
// disposeContext Tests
// =============================================================================

describe('disposeContext Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('disposeContext removes context from registry', () => {
    const ctx = createContext('test');
    assert.ok(isContext(ctx), 'Context should exist before dispose');

    disposeContext(ctx);

    // After disposal, isContext should return false
    assert.ok(!isContext(ctx), 'Context should not exist after dispose');
  });

  test('disposeContext is safe for already disposed context', () => {
    const ctx = createContext('test');
    disposeContext(ctx);
    // Should not throw
    disposeContext(ctx);
  });

  test('disposeContext is safe for invalid input', () => {
    // Should not throw
    disposeContext(null);
    disposeContext(undefined);
    disposeContext({});
  });
});

// =============================================================================
// useContextSelector Tests
// =============================================================================

describe('useContextSelector Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('useContextSelector derives value from single context', () => {
    const SettingsContext = createContext({ theme: 'dark', fontSize: 14 });
    let derivedTheme;

    Provider(SettingsContext, { theme: 'light', fontSize: 16 }, () => {
      const theme = useContextSelector(
        (settings) => settings.get().theme,
        SettingsContext
      );
      derivedTheme = theme.get();
    });

    assert.strictEqual(derivedTheme, 'light');
    disposeContext(SettingsContext);
  });

  test('useContextSelector derives value from multiple contexts', () => {
    const ThemeContext = createContext('light');
    const SizeContext = createContext('medium');
    let derivedValue;

    Provider(ThemeContext, 'dark', () => {
      Provider(SizeContext, 'large', () => {
        const combined = useContextSelector(
          (theme, size) => `${theme.get()}-${size.get()}`,
          ThemeContext,
          SizeContext
        );
        derivedValue = combined.get();
      });
    });

    assert.strictEqual(derivedValue, 'dark-large');
    disposeContext(ThemeContext);
    disposeContext(SizeContext);
  });
});

// =============================================================================
// provideMany Tests
// =============================================================================

describe('provideMany Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('provideMany provides multiple contexts', () => {
    const ThemeContext = createContext('light');
    const UserContext = createContext(null);
    const LocaleContext = createContext('en');
    let capturedTheme, capturedUser, capturedLocale;

    provideMany([
      [ThemeContext, 'dark'],
      [UserContext, { name: 'John' }],
      [LocaleContext, 'fr']
    ], () => {
      capturedTheme = useContext(ThemeContext).get();
      capturedUser = useContext(UserContext).get();
      capturedLocale = useContext(LocaleContext).get();
    });

    assert.strictEqual(capturedTheme, 'dark');
    assert.deepStrictEqual(capturedUser, { name: 'John' });
    assert.strictEqual(capturedLocale, 'fr');

    disposeContext(ThemeContext);
    disposeContext(UserContext);
    disposeContext(LocaleContext);
  });

  test('provideMany works with empty array', () => {
    let executed = false;
    provideMany([], () => {
      executed = true;
    });
    assert.ok(executed, 'Should execute children even with empty providers');
  });

  test('provideMany restores all contexts after children', () => {
    const ThemeContext = createContext('default-theme');
    const UserContext = createContext('default-user');

    provideMany([
      [ThemeContext, 'dark'],
      [UserContext, 'john']
    ], () => {
      assert.strictEqual(useContext(ThemeContext).get(), 'dark');
      assert.strictEqual(useContext(UserContext).get(), 'john');
    });

    // After provideMany, should be back to defaults
    assert.strictEqual(useContext(ThemeContext).get(), 'default-theme');
    assert.strictEqual(useContext(UserContext).get(), 'default-user');

    disposeContext(ThemeContext);
    disposeContext(UserContext);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('context works with effects', () => {
    const ThemeContext = createContext('light');
    const themePulse = pulse('dark');
    let effectRunCount = 0;
    let lastTheme;

    Provider(ThemeContext, themePulse, () => {
      const theme = useContext(ThemeContext);

      effect(() => {
        lastTheme = theme.get();
        effectRunCount++;
      });
    });

    assert.strictEqual(effectRunCount, 1);
    assert.strictEqual(lastTheme, 'dark');

    // Update the pulse
    themePulse.set('light');
    assert.strictEqual(effectRunCount, 2);
    assert.strictEqual(lastTheme, 'light');

    disposeContext(ThemeContext);
  });

  test('multiple independent contexts work correctly', () => {
    const ThemeContext = createContext('light');
    const AuthContext = createContext({ loggedIn: false });
    let capturedTheme, capturedAuth;

    Provider(ThemeContext, 'dark', () => {
      Provider(AuthContext, { loggedIn: true, user: 'admin' }, () => {
        capturedTheme = useContext(ThemeContext).get();
        capturedAuth = useContext(AuthContext).get();
      });
    });

    assert.strictEqual(capturedTheme, 'dark');
    assert.deepStrictEqual(capturedAuth, { loggedIn: true, user: 'admin' });

    disposeContext(ThemeContext);
    disposeContext(AuthContext);
  });

  test('context preserves reactivity through nesting', () => {
    const ThemeContext = createContext('light');
    const themePulse = pulse('dark');
    let innerThemeValue;

    Provider(ThemeContext, themePulse, () => {
      Provider(ThemeContext, 'override', () => {
        // This should see 'override', not themePulse
      });

      // After inner provider, should still see themePulse
      const theme = useContext(ThemeContext);
      innerThemeValue = theme.get();
    });

    assert.strictEqual(innerThemeValue, 'dark');

    // Update should still work
    themePulse.set('blue');
    // Note: innerThemeValue won't update because it was captured during Provider execution
    // This is expected behavior - you need to use effects for reactivity

    disposeContext(ThemeContext);
  });
});
