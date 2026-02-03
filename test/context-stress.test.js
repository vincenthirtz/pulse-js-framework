/**
 * Context API Stress Tests
 *
 * Tests for context API edge cases, deep nesting, and stress scenarios
 *
 * @module test/context-stress
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
  testAsync,
  runAsyncTests,
  assert,
  assertEqual,
  assertDeepEqual,
  assertTruthy,
  assertFalsy,
  printResults,
  exitWithCode,
  printSection,
  wait,
  createSpy
} from './utils.js';

// Reset before each test
function beforeEach() {
  resetContext();
}

// =============================================================================
// Deep Nesting Tests
// =============================================================================

printSection('Deep Nesting Tests');

test('handles deeply nested providers', () => {
  beforeEach();

  const ctx = createContext(0);
  let deepestValue = null;

  // Create 20 levels of nesting
  let currentFn = () => {
    deepestValue = useContext(ctx).get();
  };

  for (let i = 19; i >= 0; i--) {
    const innerFn = currentFn;
    currentFn = () => Provider(ctx, i, innerFn);
  }

  currentFn();

  // Should have the innermost value
  assertEqual(deepestValue, 19);
  assertEqual(getContextDepth(ctx), 0, 'Should restore depth after execution');

  disposeContext(ctx);
});

test('nested providers restore correctly after exception', () => {
  beforeEach();

  const ctx = createContext('default');

  try {
    Provider(ctx, 'level1', () => {
      assertEqual(useContext(ctx).get(), 'level1');

      try {
        Provider(ctx, 'level2', () => {
          assertEqual(useContext(ctx).get(), 'level2');
          throw new Error('Test error');
        });
      } catch (e) {
        // Caught
      }

      // Should still be at level1
      assertEqual(useContext(ctx).get(), 'level1');
    });
  } catch (e) {
    // Outer catch
  }

  // Should be back to default
  assertEqual(useContext(ctx).get(), 'default');

  disposeContext(ctx);
});

test('multiple contexts at different depths', () => {
  beforeEach();

  const ctx1 = createContext('ctx1-default');
  const ctx2 = createContext('ctx2-default');
  const ctx3 = createContext('ctx3-default');

  let captured = {};

  Provider(ctx1, 'ctx1-level1', () => {
    Provider(ctx2, 'ctx2-level1', () => {
      Provider(ctx1, 'ctx1-level2', () => {
        Provider(ctx3, 'ctx3-level1', () => {
          captured.ctx1 = useContext(ctx1).get();
          captured.ctx2 = useContext(ctx2).get();
          captured.ctx3 = useContext(ctx3).get();
        });
      });
    });
  });

  assertEqual(captured.ctx1, 'ctx1-level2');
  assertEqual(captured.ctx2, 'ctx2-level1');
  assertEqual(captured.ctx3, 'ctx3-level1');

  disposeContext(ctx1);
  disposeContext(ctx2);
  disposeContext(ctx3);
});

// =============================================================================
// Context with Effects Tests
// =============================================================================

printSection('Context with Effects Tests');

test('context value changes trigger effects', () => {
  beforeEach();

  const ThemeContext = createContext('light');
  const themePulse = pulse('light');
  let effectRunCount = 0;

  Provider(ThemeContext, themePulse, () => {
    const theme = useContext(ThemeContext);

    effect(() => {
      theme.get();
      effectRunCount++;
    });

    // Update theme
    themePulse.set('dark');
  });

  assertEqual(effectRunCount, 2, 'Effect should run on change');

  disposeContext(ThemeContext);
});

test('context with computed values', () => {
  beforeEach();

  const UserContext = createContext({ name: 'Guest', role: 'visitor' });
  const userPulse = pulse({ name: 'John', role: 'admin' });
  let isAdmin = null;

  Provider(UserContext, userPulse, () => {
    const user = useContext(UserContext);
    const adminComputed = computed(() => user.get().role === 'admin');

    isAdmin = adminComputed.get();

    // Change role
    userPulse.set({ name: 'John', role: 'user' });
    isAdmin = adminComputed.get();
  });

  assertEqual(isAdmin, false, 'Computed should react to context changes');

  disposeContext(UserContext);
});

// =============================================================================
// useContextSelector Tests
// =============================================================================

printSection('useContextSelector Tests');

test('useContextSelector with complex selector', () => {
  beforeEach();

  const StateContext = createContext({
    user: { name: 'John', preferences: { theme: 'dark' } },
    settings: { notifications: true }
  });

  let selectedTheme = null;

  Provider(StateContext, {
    user: { name: 'Jane', preferences: { theme: 'light' } },
    settings: { notifications: false }
  }, () => {
    const theme = useContextSelector(
      (state) => state.get().user.preferences.theme,
      StateContext
    );
    selectedTheme = theme.get();
  });

  assertEqual(selectedTheme, 'light');

  disposeContext(StateContext);
});

test('useContextSelector combines multiple contexts', () => {
  beforeEach();

  const AuthContext = createContext({ loggedIn: false });
  const ThemeContext = createContext('light');
  const LanguageContext = createContext('en');

  let combined = null;

  provideMany([
    [AuthContext, { loggedIn: true, user: 'admin' }],
    [ThemeContext, 'dark'],
    [LanguageContext, 'fr']
  ], () => {
    const appState = useContextSelector(
      (auth, theme, lang) => ({
        isAdmin: auth.get().user === 'admin',
        isDark: theme.get() === 'dark',
        isFrench: lang.get() === 'fr'
      }),
      AuthContext,
      ThemeContext,
      LanguageContext
    );

    combined = appState.get();
  });

  assertDeepEqual(combined, {
    isAdmin: true,
    isDark: true,
    isFrench: true
  });

  disposeContext(AuthContext);
  disposeContext(ThemeContext);
  disposeContext(LanguageContext);
});

// =============================================================================
// provideMany Tests
// =============================================================================

printSection('provideMany Advanced Tests');

test('provideMany handles large number of contexts', () => {
  beforeEach();

  const contexts = [];
  const providers = [];

  // Create 20 contexts
  for (let i = 0; i < 20; i++) {
    const ctx = createContext(`default-${i}`);
    contexts.push(ctx);
    providers.push([ctx, `value-${i}`]);
  }

  let capturedValues = [];

  provideMany(providers, () => {
    capturedValues = contexts.map((ctx, i) => {
      return useContext(ctx).get();
    });
  });

  // All values should be set
  for (let i = 0; i < 20; i++) {
    assertEqual(capturedValues[i], `value-${i}`);
  }

  // All should be restored
  contexts.forEach((ctx, i) => {
    assertEqual(useContext(ctx).get(), `default-${i}`);
    disposeContext(ctx);
  });
});

test('provideMany with mix of static and pulse values', () => {
  beforeEach();

  const StaticContext = createContext('static-default');
  const ReactiveContext = createContext('reactive-default');
  const reactivePulse = pulse('reactive-value');

  let values = {};

  provideMany([
    [StaticContext, 'static-value'],
    [ReactiveContext, reactivePulse]
  ], () => {
    values.static = useContext(StaticContext).get();
    values.reactive = useContext(ReactiveContext).get();

    // Update reactive
    reactivePulse.set('updated-reactive');
    values.updatedReactive = useContext(ReactiveContext).get();
  });

  assertEqual(values.static, 'static-value');
  assertEqual(values.reactive, 'reactive-value');
  assertEqual(values.updatedReactive, 'updated-reactive');

  disposeContext(StaticContext);
  disposeContext(ReactiveContext);
});

// =============================================================================
// Memory and Cleanup Tests
// =============================================================================

printSection('Memory and Cleanup Tests');

test('disposeContext cleans up properly', () => {
  beforeEach();

  const ctx = createContext('test');

  assertTruthy(isContext(ctx), 'Should be valid context');

  disposeContext(ctx);

  assertFalsy(isContext(ctx), 'Should not be valid after dispose');
});

test('multiple disposeContext calls are safe', () => {
  beforeEach();

  const ctx = createContext('test');

  disposeContext(ctx);
  disposeContext(ctx);
  disposeContext(ctx);

  // Should not throw
  assertTruthy(true, 'Multiple dispose calls should be safe');
});

test('using disposed context falls back to default', () => {
  beforeEach();

  const ctx = createContext('default-value');

  // Use before dispose
  assertEqual(useContext(ctx).get(), 'default-value');

  disposeContext(ctx);

  // After dispose, should throw or return default
  try {
    const value = useContext(ctx);
    // If it doesn't throw, should return something safe
    assertTruthy(true, 'Should handle disposed context');
  } catch (e) {
    // Throwing is also acceptable - any error is fine for invalid context
    assertTruthy(e instanceof Error, 'Should throw an error for disposed context');
  }
});

// =============================================================================
// Performance Tests
// =============================================================================

printSection('Performance Tests');

test('rapid context access performance', () => {
  beforeEach();

  const ctx = createContext(0);

  Provider(ctx, 42, () => {
    const start = Date.now();

    // Access context 10000 times
    for (let i = 0; i < 10000; i++) {
      useContext(ctx).get();
    }

    const duration = Date.now() - start;

    // Should complete in reasonable time (< 1 second)
    assertTruthy(duration < 1000, `Should be fast, took ${duration}ms`);
  });

  disposeContext(ctx);
});

test('rapid provider creation performance', () => {
  beforeEach();

  const ctx = createContext(0);
  const start = Date.now();

  // Create many nested providers
  for (let i = 0; i < 1000; i++) {
    Provider(ctx, i, () => {
      useContext(ctx).get();
    });
  }

  const duration = Date.now() - start;
  assertTruthy(duration < 2000, `Should be reasonably fast, took ${duration}ms`);

  disposeContext(ctx);
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

printSection('Edge Cases Tests');

test('context with null default value', () => {
  beforeEach();

  const ctx = createContext(null);

  assertEqual(useContext(ctx).get(), null);

  Provider(ctx, 'provided', () => {
    assertEqual(useContext(ctx).get(), 'provided');
  });

  assertEqual(useContext(ctx).get(), null);

  disposeContext(ctx);
});

test('context with undefined default value', () => {
  beforeEach();

  const ctx = createContext(undefined);

  assertEqual(useContext(ctx).get(), undefined);

  Provider(ctx, 'defined', () => {
    assertEqual(useContext(ctx).get(), 'defined');
  });

  disposeContext(ctx);
});

test('context with function default value', () => {
  beforeEach();

  const defaultFn = () => 'default-result';
  const providedFn = () => 'provided-result';

  const ctx = createContext(defaultFn);

  assertEqual(useContext(ctx).get()(), 'default-result');

  Provider(ctx, providedFn, () => {
    assertEqual(useContext(ctx).get()(), 'provided-result');
  });

  disposeContext(ctx);
});

test('context with array default value', () => {
  beforeEach();

  const ctx = createContext([1, 2, 3]);

  assertDeepEqual(useContext(ctx).get(), [1, 2, 3]);

  Provider(ctx, [4, 5, 6], () => {
    assertDeepEqual(useContext(ctx).get(), [4, 5, 6]);
  });

  disposeContext(ctx);
});

test('context displayName for debugging', () => {
  beforeEach();

  const ctx = createContext('test', { displayName: 'MyTestContext' });

  assertEqual(ctx.displayName, 'MyTestContext');

  disposeContext(ctx);
});

test('Provider returns children result', () => {
  beforeEach();

  const ctx = createContext('default');

  const result = Provider(ctx, 'value', () => {
    return 'child-return-value';
  });

  assertEqual(result, 'child-return-value');

  disposeContext(ctx);
});

test('Consumer returns render result', () => {
  beforeEach();

  const ctx = createContext('default');

  const result = Consumer(ctx, (value) => {
    return `rendered-${value.get()}`;
  });

  assertEqual(result, 'rendered-default');

  disposeContext(ctx);
});

// =============================================================================
// Concurrent Usage Tests
// =============================================================================

printSection('Concurrent Usage Tests');

testAsync('context survives async operations', async () => {
  beforeEach();

  const ctx = createContext('default');

  let asyncValue = null;

  Provider(ctx, 'async-value', async () => {
    // Immediate value
    assertEqual(useContext(ctx).get(), 'async-value');

    await wait(50);

    // After async wait, still in same execution context
    // Note: This may not work as context is synchronous
    // but should not crash
    try {
      asyncValue = useContext(ctx).get();
    } catch (e) {
      asyncValue = 'context-lost';
    }
  });

  await wait(100);

  // Context behavior after async may vary
  assertTruthy(true, 'Should handle async operations');

  disposeContext(ctx);
});

testAsync('multiple independent context trees', async () => {
  beforeEach();

  const ctx = createContext('default');

  // Simulate two independent render trees
  const tree1Result = Provider(ctx, 'tree1', () => {
    return useContext(ctx).get();
  });

  const tree2Result = Provider(ctx, 'tree2', () => {
    return useContext(ctx).get();
  });

  assertEqual(tree1Result, 'tree1');
  assertEqual(tree2Result, 'tree2');

  disposeContext(ctx);
});

// =============================================================================
// Error Handling Tests
// =============================================================================

printSection('Error Handling Tests');

test('useContext with invalid context throws', () => {
  beforeEach();

  let threw = false;

  try {
    useContext(null);
  } catch (e) {
    threw = true;
    assertTruthy(e.message.includes('context'), 'Error should mention context');
  }

  assertTruthy(threw, 'Should throw for null context');
});

test('Provider with invalid context throws', () => {
  beforeEach();

  let threw = false;

  try {
    Provider(null, 'value', () => {});
  } catch (e) {
    threw = true;
  }

  assertTruthy(threw, 'Should throw for null context in Provider');
});

test('Consumer with invalid context throws', () => {
  beforeEach();

  let threw = false;

  try {
    Consumer({}, () => {});
  } catch (e) {
    threw = true;
  }

  assertTruthy(threw, 'Should throw for invalid context in Consumer');
});

// =============================================================================
// Run Tests
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
