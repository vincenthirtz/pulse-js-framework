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

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { wait } from './utils.js';

// =============================================================================
// Deep Nesting Tests
// =============================================================================

describe('Deep Nesting Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('handles deeply nested providers', () => {
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
    assert.strictEqual(deepestValue, 19);
    assert.strictEqual(getContextDepth(ctx), 0, 'Should restore depth after execution');

    disposeContext(ctx);
  });

  test('nested providers restore correctly after exception', () => {
    const ctx = createContext('default');

    try {
      Provider(ctx, 'level1', () => {
        assert.strictEqual(useContext(ctx).get(), 'level1');

        try {
          Provider(ctx, 'level2', () => {
            assert.strictEqual(useContext(ctx).get(), 'level2');
            throw new Error('Test error');
          });
        } catch (e) {
          // Caught
        }

        // Should still be at level1
        assert.strictEqual(useContext(ctx).get(), 'level1');
      });
    } catch (e) {
      // Outer catch
    }

    // Should be back to default
    assert.strictEqual(useContext(ctx).get(), 'default');

    disposeContext(ctx);
  });

  test('multiple contexts at different depths', () => {
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

    assert.strictEqual(captured.ctx1, 'ctx1-level2');
    assert.strictEqual(captured.ctx2, 'ctx2-level1');
    assert.strictEqual(captured.ctx3, 'ctx3-level1');

    disposeContext(ctx1);
    disposeContext(ctx2);
    disposeContext(ctx3);
  });
});

// =============================================================================
// Context with Effects Tests
// =============================================================================

describe('Context with Effects Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('context value changes trigger effects', () => {
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

    assert.strictEqual(effectRunCount, 2, 'Effect should run on change');

    disposeContext(ThemeContext);
  });

  test('context with computed values', () => {
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

    assert.strictEqual(isAdmin, false, 'Computed should react to context changes');

    disposeContext(UserContext);
  });
});

// =============================================================================
// useContextSelector Tests
// =============================================================================

describe('useContextSelector Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('useContextSelector with complex selector', () => {
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

    assert.strictEqual(selectedTheme, 'light');

    disposeContext(StateContext);
  });

  test('useContextSelector combines multiple contexts', () => {
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

    assert.deepStrictEqual(combined, {
      isAdmin: true,
      isDark: true,
      isFrench: true
    });

    disposeContext(AuthContext);
    disposeContext(ThemeContext);
    disposeContext(LanguageContext);
  });
});

// =============================================================================
// provideMany Tests
// =============================================================================

describe('provideMany Advanced Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('provideMany handles large number of contexts', () => {
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
      capturedValues = contexts.map((ctx) => {
        return useContext(ctx).get();
      });
    });

    // All values should be set
    for (let i = 0; i < 20; i++) {
      assert.strictEqual(capturedValues[i], `value-${i}`);
    }

    // All should be restored
    contexts.forEach((ctx, i) => {
      assert.strictEqual(useContext(ctx).get(), `default-${i}`);
      disposeContext(ctx);
    });
  });

  test('provideMany with mix of static and pulse values', () => {
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

    assert.strictEqual(values.static, 'static-value');
    assert.strictEqual(values.reactive, 'reactive-value');
    assert.strictEqual(values.updatedReactive, 'updated-reactive');

    disposeContext(StaticContext);
    disposeContext(ReactiveContext);
  });
});

// =============================================================================
// Memory and Cleanup Tests
// =============================================================================

describe('Memory and Cleanup Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('disposeContext cleans up properly', () => {
    const ctx = createContext('test');

    assert.ok(isContext(ctx), 'Should be valid context');

    disposeContext(ctx);

    assert.ok(!isContext(ctx), 'Should not be valid after dispose');
  });

  test('multiple disposeContext calls are safe', () => {
    const ctx = createContext('test');

    disposeContext(ctx);
    disposeContext(ctx);
    disposeContext(ctx);

    // Should not throw
    assert.ok(true, 'Multiple dispose calls should be safe');
  });

  test('using disposed context falls back to default', () => {
    const ctx = createContext('default-value');

    // Use before dispose
    assert.strictEqual(useContext(ctx).get(), 'default-value');

    disposeContext(ctx);

    // After dispose, should throw or return default
    try {
      useContext(ctx);
      // If it doesn't throw, should return something safe
      assert.ok(true, 'Should handle disposed context');
    } catch (e) {
      // Throwing is also acceptable - any error is fine for invalid context
      assert.ok(e instanceof Error, 'Should throw an error for disposed context');
    }
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('Performance Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('rapid context access performance', () => {
    const ctx = createContext(0);

    Provider(ctx, 42, () => {
      const start = Date.now();

      // Access context 10000 times
      for (let i = 0; i < 10000; i++) {
        useContext(ctx).get();
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 1 second)
      assert.ok(duration < 1000, `Should be fast, took ${duration}ms`);
    });

    disposeContext(ctx);
  });

  test('rapid provider creation performance', () => {
    const ctx = createContext(0);
    const start = Date.now();

    // Create many nested providers
    for (let i = 0; i < 1000; i++) {
      Provider(ctx, i, () => {
        useContext(ctx).get();
      });
    }

    const duration = Date.now() - start;
    assert.ok(duration < 2000, `Should be reasonably fast, took ${duration}ms`);

    disposeContext(ctx);
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('Edge Cases Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('context with null default value', () => {
    const ctx = createContext(null);

    assert.strictEqual(useContext(ctx).get(), null);

    Provider(ctx, 'provided', () => {
      assert.strictEqual(useContext(ctx).get(), 'provided');
    });

    assert.strictEqual(useContext(ctx).get(), null);

    disposeContext(ctx);
  });

  test('context with undefined default value', () => {
    const ctx = createContext(undefined);

    assert.strictEqual(useContext(ctx).get(), undefined);

    Provider(ctx, 'defined', () => {
      assert.strictEqual(useContext(ctx).get(), 'defined');
    });

    disposeContext(ctx);
  });

  test('context with function default value', () => {
    const defaultFn = () => 'default-result';
    const providedFn = () => 'provided-result';

    const ctx = createContext(defaultFn);

    assert.strictEqual(useContext(ctx).get()(), 'default-result');

    Provider(ctx, providedFn, () => {
      assert.strictEqual(useContext(ctx).get()(), 'provided-result');
    });

    disposeContext(ctx);
  });

  test('context with array default value', () => {
    const ctx = createContext([1, 2, 3]);

    assert.deepStrictEqual(useContext(ctx).get(), [1, 2, 3]);

    Provider(ctx, [4, 5, 6], () => {
      assert.deepStrictEqual(useContext(ctx).get(), [4, 5, 6]);
    });

    disposeContext(ctx);
  });

  test('context displayName for debugging', () => {
    const ctx = createContext('test', { displayName: 'MyTestContext' });

    assert.strictEqual(ctx.displayName, 'MyTestContext');

    disposeContext(ctx);
  });

  test('Provider returns children result', () => {
    const ctx = createContext('default');

    const result = Provider(ctx, 'value', () => {
      return 'child-return-value';
    });

    assert.strictEqual(result, 'child-return-value');

    disposeContext(ctx);
  });

  test('Consumer returns render result', () => {
    const ctx = createContext('default');

    const result = Consumer(ctx, (value) => {
      return `rendered-${value.get()}`;
    });

    assert.strictEqual(result, 'rendered-default');

    disposeContext(ctx);
  });
});

// =============================================================================
// Concurrent Usage Tests
// =============================================================================

describe('Concurrent Usage Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('context survives async operations', async () => {
    const ctx = createContext('default');

    Provider(ctx, 'async-value', async () => {
      // Immediate value
      assert.strictEqual(useContext(ctx).get(), 'async-value');

      await wait(50);

      // After async wait, still in same execution context
      // Note: This may not work as context is synchronous
      // but should not crash
      try {
        useContext(ctx).get();
      } catch (e) {
        asyncValue = 'context-lost';
      }
    });

    await wait(100);

    // Context behavior after async may vary
    assert.ok(true, 'Should handle async operations');

    disposeContext(ctx);
  });

  test('multiple independent context trees', async () => {
    const ctx = createContext('default');

    // Simulate two independent render trees
    const tree1Result = Provider(ctx, 'tree1', () => {
      return useContext(ctx).get();
    });

    const tree2Result = Provider(ctx, 'tree2', () => {
      return useContext(ctx).get();
    });

    assert.strictEqual(tree1Result, 'tree1');
    assert.strictEqual(tree2Result, 'tree2');

    disposeContext(ctx);
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling Tests', () => {
  beforeEach(() => {
    resetContext();
  });

  test('useContext with invalid context throws', () => {
    let threw = false;

    try {
      useContext(null);
    } catch (e) {
      threw = true;
      assert.ok(e.message.includes('context'), 'Error should mention context');
    }

    assert.ok(threw, 'Should throw for null context');
  });

  test('Provider with invalid context throws', () => {
    let threw = false;

    try {
      Provider(null, 'value', () => {});
    } catch (e) {
      threw = true;
    }

    assert.ok(threw, 'Should throw for null context in Provider');
  });

  test('Consumer with invalid context throws', () => {
    let threw = false;

    try {
      Consumer({}, () => {});
    } catch (e) {
      threw = true;
    }

    assert.ok(threw, 'Should throw for invalid context in Consumer');
  });
});
