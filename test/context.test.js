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

import {
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// Reset context between tests to avoid pollution
function beforeEach() {
  resetContext();
}

// =============================================================================
// createContext Tests
// =============================================================================

printSection('createContext Tests');

test('creates a context with default value', () => {
  beforeEach();
  const ctx = createContext('default');
  assertEqual(ctx.defaultValue, 'default');
  assert(ctx._id !== undefined, 'Context should have an _id');
  assert(ctx.displayName.startsWith('Context'), 'Should have a displayName');
  disposeContext(ctx);
});

test('creates a context with custom displayName', () => {
  beforeEach();
  const ctx = createContext(null, { displayName: 'ThemeContext' });
  assertEqual(ctx.displayName, 'ThemeContext');
  disposeContext(ctx);
});

test('creates a context with object default', () => {
  beforeEach();
  const defaultUser = { name: 'Guest', role: 'anonymous' };
  const ctx = createContext(defaultUser);
  assertEqual(ctx.defaultValue, defaultUser);
  disposeContext(ctx);
});

test('context is frozen', () => {
  beforeEach();
  const ctx = createContext('value');
  let threw = false;
  try {
    ctx.defaultValue = 'newValue';
  } catch (e) {
    threw = true;
  }
  // In strict mode, this throws. In non-strict, it silently fails.
  assertEqual(ctx.defaultValue, 'value', 'Context properties should not be mutable');
  disposeContext(ctx);
});

// =============================================================================
// useContext Tests
// =============================================================================

printSection('useContext Tests');

test('useContext returns default value when no provider', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  const theme = useContext(ThemeContext);
  assertEqual(theme.get(), 'light');
  disposeContext(ThemeContext);
});

test('useContext returns default object when no provider', () => {
  beforeEach();
  const UserContext = createContext({ name: 'Guest' });
  const user = useContext(UserContext);
  assertDeepEqual(user.get(), { name: 'Guest' });
  disposeContext(UserContext);
});

test('useContext throws for invalid context', () => {
  beforeEach();
  let threw = false;
  try {
    useContext(null);
  } catch (e) {
    threw = true;
    assert(e.message.includes('valid context'), 'Should mention valid context');
  }
  assert(threw, 'Should throw for null context');
});

test('useContext throws for plain object (not a context)', () => {
  beforeEach();
  let threw = false;
  try {
    useContext({ defaultValue: 'test' });
  } catch (e) {
    threw = true;
  }
  assert(threw, 'Should throw for plain object');
});

// =============================================================================
// Provider Tests
// =============================================================================

printSection('Provider Tests');

test('Provider provides value to children', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  let capturedTheme;

  Provider(ThemeContext, 'dark', () => {
    capturedTheme = useContext(ThemeContext).get();
  });

  assertEqual(capturedTheme, 'dark');
  disposeContext(ThemeContext);
});

test('Provider works with reactive pulse values', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  const themePulse = pulse('dark');
  let capturedPulse;

  Provider(ThemeContext, themePulse, () => {
    capturedPulse = useContext(ThemeContext);
  });

  assertEqual(capturedPulse.get(), 'dark');

  // Update the pulse
  themePulse.set('light');
  assertEqual(capturedPulse.get(), 'light');
  disposeContext(ThemeContext);
});

test('Provider restores context after children render', () => {
  beforeEach();
  const ThemeContext = createContext('default');

  // Before provider
  assertEqual(useContext(ThemeContext).get(), 'default');

  Provider(ThemeContext, 'provided', () => {
    assertEqual(useContext(ThemeContext).get(), 'provided');
  });

  // After provider - should be back to default
  assertEqual(useContext(ThemeContext).get(), 'default');
  disposeContext(ThemeContext);
});

test('Provider supports nested providers', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  let innerTheme;
  let outerTheme;

  Provider(ThemeContext, 'dark', () => {
    outerTheme = useContext(ThemeContext).get();

    Provider(ThemeContext, 'blue', () => {
      innerTheme = useContext(ThemeContext).get();
    });

    // After inner provider, should be back to dark
    assertEqual(useContext(ThemeContext).get(), 'dark');
  });

  assertEqual(outerTheme, 'dark');
  assertEqual(innerTheme, 'blue');
  disposeContext(ThemeContext);
});

test('Provider throws for invalid context', () => {
  beforeEach();
  let threw = false;
  try {
    Provider(null, 'value', () => {});
  } catch (e) {
    threw = true;
    assert(e.message.includes('valid context'), 'Should mention valid context');
  }
  assert(threw, 'Should throw for null context');
});

test('Provider can return children directly (not a function)', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  const result = Provider(ThemeContext, 'dark', 'static-content');
  assertEqual(result, 'static-content');
  disposeContext(ThemeContext);
});

// =============================================================================
// Consumer Tests
// =============================================================================

printSection('Consumer Tests');

test('Consumer renders with context value', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  let renderedValue;

  Provider(ThemeContext, 'dark', () => {
    Consumer(ThemeContext, (theme) => {
      renderedValue = theme.get();
    });
  });

  assertEqual(renderedValue, 'dark');
  disposeContext(ThemeContext);
});

test('Consumer uses default when no provider', () => {
  beforeEach();
  const ThemeContext = createContext('default-theme');
  let renderedValue;

  Consumer(ThemeContext, (theme) => {
    renderedValue = theme.get();
  });

  assertEqual(renderedValue, 'default-theme');
  disposeContext(ThemeContext);
});

test('Context.Consumer shorthand works', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  let renderedValue;

  Provider(ThemeContext, 'dark', () => {
    ThemeContext.Consumer((theme) => {
      renderedValue = theme.get();
    });
  });

  assertEqual(renderedValue, 'dark');
  disposeContext(ThemeContext);
});

// =============================================================================
// Context.Provider Shorthand Tests
// =============================================================================

printSection('Context Shorthand Tests');

test('Context.Provider shorthand works', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  let capturedTheme;

  ThemeContext.Provider('dark', () => {
    capturedTheme = useContext(ThemeContext).get();
  });

  assertEqual(capturedTheme, 'dark');
  disposeContext(ThemeContext);
});

// =============================================================================
// isContext Tests
// =============================================================================

printSection('isContext Tests');

test('isContext returns true for valid context', () => {
  beforeEach();
  const ctx = createContext('test');
  assert(isContext(ctx), 'Should return true for valid context');
  disposeContext(ctx);
});

test('isContext returns false for non-context objects', () => {
  beforeEach();
  assert(!isContext(null), 'null is not a context');
  assert(!isContext(undefined), 'undefined is not a context');
  assert(!isContext({}), 'plain object is not a context');
  assert(!isContext({ _id: 'not-a-symbol' }), 'object with string _id is not a context');
  assert(!isContext({ _id: Symbol('fake') }), 'object with unknown symbol is not a context');
});

// =============================================================================
// getContextDepth Tests
// =============================================================================

printSection('getContextDepth Tests');

test('getContextDepth returns 0 with no providers', () => {
  beforeEach();
  const ctx = createContext('default');
  assertEqual(getContextDepth(ctx), 0);
  disposeContext(ctx);
});

test('getContextDepth returns correct depth with providers', () => {
  beforeEach();
  const ctx = createContext('default');

  assertEqual(getContextDepth(ctx), 0);

  Provider(ctx, 'level1', () => {
    assertEqual(getContextDepth(ctx), 1);

    Provider(ctx, 'level2', () => {
      assertEqual(getContextDepth(ctx), 2);

      Provider(ctx, 'level3', () => {
        assertEqual(getContextDepth(ctx), 3);
      });

      assertEqual(getContextDepth(ctx), 2);
    });

    assertEqual(getContextDepth(ctx), 1);
  });

  assertEqual(getContextDepth(ctx), 0);
  disposeContext(ctx);
});

test('getContextDepth returns 0 for invalid context', () => {
  beforeEach();
  assertEqual(getContextDepth(null), 0);
  assertEqual(getContextDepth(undefined), 0);
  assertEqual(getContextDepth({}), 0);
});

// =============================================================================
// disposeContext Tests
// =============================================================================

printSection('disposeContext Tests');

test('disposeContext removes context from registry', () => {
  beforeEach();
  const ctx = createContext('test');
  assert(isContext(ctx), 'Context should exist before dispose');

  disposeContext(ctx);

  // After disposal, isContext should return false
  assert(!isContext(ctx), 'Context should not exist after dispose');
});

test('disposeContext is safe for already disposed context', () => {
  beforeEach();
  const ctx = createContext('test');
  disposeContext(ctx);
  // Should not throw
  disposeContext(ctx);
});

test('disposeContext is safe for invalid input', () => {
  beforeEach();
  // Should not throw
  disposeContext(null);
  disposeContext(undefined);
  disposeContext({});
});

// =============================================================================
// useContextSelector Tests
// =============================================================================

printSection('useContextSelector Tests');

test('useContextSelector derives value from single context', () => {
  beforeEach();
  const SettingsContext = createContext({ theme: 'dark', fontSize: 14 });
  let derivedTheme;

  Provider(SettingsContext, { theme: 'light', fontSize: 16 }, () => {
    const theme = useContextSelector(
      (settings) => settings.get().theme,
      SettingsContext
    );
    derivedTheme = theme.get();
  });

  assertEqual(derivedTheme, 'light');
  disposeContext(SettingsContext);
});

test('useContextSelector derives value from multiple contexts', () => {
  beforeEach();
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

  assertEqual(derivedValue, 'dark-large');
  disposeContext(ThemeContext);
  disposeContext(SizeContext);
});

// =============================================================================
// provideMany Tests
// =============================================================================

printSection('provideMany Tests');

test('provideMany provides multiple contexts', () => {
  beforeEach();
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

  assertEqual(capturedTheme, 'dark');
  assertDeepEqual(capturedUser, { name: 'John' });
  assertEqual(capturedLocale, 'fr');

  disposeContext(ThemeContext);
  disposeContext(UserContext);
  disposeContext(LocaleContext);
});

test('provideMany works with empty array', () => {
  beforeEach();
  let executed = false;
  provideMany([], () => {
    executed = true;
  });
  assert(executed, 'Should execute children even with empty providers');
});

test('provideMany restores all contexts after children', () => {
  beforeEach();
  const ThemeContext = createContext('default-theme');
  const UserContext = createContext('default-user');

  provideMany([
    [ThemeContext, 'dark'],
    [UserContext, 'john']
  ], () => {
    assertEqual(useContext(ThemeContext).get(), 'dark');
    assertEqual(useContext(UserContext).get(), 'john');
  });

  // After provideMany, should be back to defaults
  assertEqual(useContext(ThemeContext).get(), 'default-theme');
  assertEqual(useContext(UserContext).get(), 'default-user');

  disposeContext(ThemeContext);
  disposeContext(UserContext);
});

// =============================================================================
// Integration Tests
// =============================================================================

printSection('Integration Tests');

test('context works with effects', () => {
  beforeEach();
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

  assertEqual(effectRunCount, 1);
  assertEqual(lastTheme, 'dark');

  // Update the pulse
  themePulse.set('light');
  assertEqual(effectRunCount, 2);
  assertEqual(lastTheme, 'light');

  disposeContext(ThemeContext);
});

test('multiple independent contexts work correctly', () => {
  beforeEach();
  const ThemeContext = createContext('light');
  const AuthContext = createContext({ loggedIn: false });
  let capturedTheme, capturedAuth;

  Provider(ThemeContext, 'dark', () => {
    Provider(AuthContext, { loggedIn: true, user: 'admin' }, () => {
      capturedTheme = useContext(ThemeContext).get();
      capturedAuth = useContext(AuthContext).get();
    });
  });

  assertEqual(capturedTheme, 'dark');
  assertDeepEqual(capturedAuth, { loggedIn: true, user: 'admin' });

  disposeContext(ThemeContext);
  disposeContext(AuthContext);
});

test('context preserves reactivity through nesting', () => {
  beforeEach();
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

  assertEqual(innerThemeValue, 'dark');

  // Update should still work
  themePulse.set('blue');
  // Note: innerThemeValue won't update because it was captured during Provider execution
  // This is expected behavior - you need to use effects for reactivity

  disposeContext(ThemeContext);
});

// =============================================================================
// Results
// =============================================================================

const results = printResults();
exitWithCode(results);
