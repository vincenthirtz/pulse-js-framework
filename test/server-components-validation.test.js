/**
 * Comprehensive Tests for Server Components - Prop Serialization Validation
 * Tests security-validation.js to achieve 92%+ coverage
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  detectNonSerializable,
  detectEnvironmentVariables,
  validatePropSerialization
} from '../runtime/server-components/security-validation.js';

// =============================================================================
// detectNonSerializable() Tests
// =============================================================================

describe('detectNonSerializable - Primitive Types', () => {
  test('allows null', () => {
    const result = detectNonSerializable(null);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  test('allows serializable primitives', () => {
    const values = [
      42,
      'string',
      true,
      false,
      0,
      '',
      -100,
      3.14
    ];

    for (const val of values) {
      const result = detectNonSerializable(val);
      assert.strictEqual(result.valid, true, `Failed for value: ${val}`);
    }
  });

  test('detects top-level undefined (allowed)', () => {
    const result = detectNonSerializable(undefined);
    // Top-level undefined is allowed (will be omitted by JSON.stringify)
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  test('detects nested undefined (error)', () => {
    const result = detectNonSerializable({ key: undefined });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'undefined');
    assert.strictEqual(result.errors[0].path, 'props.key');
    assert.ok(result.errors[0].message.includes('undefined'));
  });

  test('detects function', () => {
    const result = detectNonSerializable({ onClick: () => {} });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'function');
    assert.strictEqual(result.errors[0].path, 'props.onClick');
  });

  test('detects symbol', () => {
    const sym = Symbol('test');
    const result = detectNonSerializable({ id: sym });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'symbol');
    assert.strictEqual(result.errors[0].path, 'props.id');
  });
});

describe('detectNonSerializable - Class Instances', () => {
  test('detects WeakMap instance', () => {
    const result = detectNonSerializable({ cache: new WeakMap() });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'class-instance');
    assert.strictEqual(result.errors[0].className, 'WeakMap');
  });

  test('detects WeakSet instance', () => {
    const result = detectNonSerializable({ visited: new WeakSet() });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].className, 'WeakSet');
  });

  test('detects Promise instance', () => {
    const result = detectNonSerializable({ data: Promise.resolve(42) });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].className, 'Promise');
  });

  test('detects Error instance', () => {
    const result = detectNonSerializable({ error: new Error('test') });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].className, 'Error');
  });

  test('detects RegExp instance', () => {
    const result = detectNonSerializable({ pattern: /test/g });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].className, 'RegExp');
  });

  test('detects Date instance', () => {
    const result = detectNonSerializable({ timestamp: new Date() });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].className, 'Date');
    assert.ok(result.errors[0].message.includes('Date'));
  });

  test('detects custom class instance', () => {
    class MyClass {
      constructor() {
        this.value = 42;
      }
    }

    const result = detectNonSerializable({ obj: new MyClass() });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'class-instance');
    assert.strictEqual(result.errors[0].className, 'MyClass');
    assert.ok(result.errors[0].message.includes('custom class'));
  });

  test('detects custom class without constructor name', () => {
    const obj = Object.create({ customProto: true });
    obj.value = 42;

    const result = detectNonSerializable({ obj });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'class-instance');
  });
});

describe('detectNonSerializable - Arrays', () => {
  test('allows plain array', () => {
    const result = detectNonSerializable([1, 2, 3]);
    assert.strictEqual(result.valid, true);
  });

  test('allows nested arrays', () => {
    const result = detectNonSerializable({ items: [[1, 2], [3, 4]] });
    assert.strictEqual(result.valid, true);
  });

  test('detects function in array', () => {
    const result = detectNonSerializable([1, () => {}, 3]);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].path, 'props[1]');
    assert.strictEqual(result.errors[0].type, 'function');
  });

  test('detects non-serializable in nested array', () => {
    const result = detectNonSerializable({
      matrix: [[1, 2], [3, Symbol('test')]]
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].path, 'props.matrix[1][1]');
  });
});

describe('detectNonSerializable - Plain Objects', () => {
  test('allows plain object', () => {
    const result = detectNonSerializable({ name: 'Alice', age: 30 });
    assert.strictEqual(result.valid, true);
  });

  test('allows null-prototype object', () => {
    const obj = Object.create(null);
    obj.key = 'value';
    const result = detectNonSerializable(obj);
    assert.strictEqual(result.valid, true);
  });

  test('allows deeply nested plain objects', () => {
    const result = detectNonSerializable({
      level1: {
        level2: {
          level3: {
            value: 42
          }
        }
      }
    });
    assert.strictEqual(result.valid, true);
  });

  test('detects function in nested object', () => {
    const result = detectNonSerializable({
      user: {
        name: 'Alice',
        onClick: () => {}
      }
    });
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].path, 'props.user.onClick');
  });
});

describe('detectNonSerializable - Circular References', () => {
  test('detects circular reference (object)', () => {
    const obj = { name: 'Test' };
    obj.self = obj;

    const result = detectNonSerializable(obj);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'circular');
    assert.ok(result.errors[0].message.includes('Circular'));
  });

  test('detects circular reference (array)', () => {
    const arr = [1, 2, 3];
    arr.push(arr);

    const result = detectNonSerializable(arr);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'circular');
  });

  test('detects circular reference (nested)', () => {
    const parent = { name: 'parent' };
    const child = { name: 'child', parent };
    parent.child = child;

    const result = detectNonSerializable(parent);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'circular');
  });
});

describe('detectNonSerializable - Dangerous Keys', () => {
  test('detects constructor key', () => {
    const result = detectNonSerializable({ constructor: 'malicious' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.type === 'dangerous-key'));
    assert.ok(result.errors.some(e => e.path.includes('constructor')));
  });

  test('detects prototype key', () => {
    const result = detectNonSerializable({ prototype: 'malicious' });
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.type === 'dangerous-key'));
    assert.ok(result.errors.some(e => e.path.includes('prototype')));
  });

  test('detects multiple dangerous keys', () => {
    const obj = {
      constructor: 'test',
      prototype: 'test'
    };

    const result = detectNonSerializable(obj);
    assert.strictEqual(result.valid, false);
    // Should have 2 dangerous-key errors (constructor + prototype)
    // Note: __proto__ cannot be set as own property in object literal
    const dangerousErrors = result.errors.filter(e => e.type === 'dangerous-key');
    assert.ok(dangerousErrors.length >= 2);
  });
});

describe('detectNonSerializable - Multiple Errors', () => {
  test('detects multiple types of errors', () => {
    const result = detectNonSerializable({
      onClick: () => {},        // function
      id: Symbol('test'),       // symbol
      error: new Error('test'), // Error instance
      __proto__: 'malicious'    // dangerous key
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length >= 3); // At least function, symbol, Error (dangerous-key may be additional)

    // Check for each error type
    const types = result.errors.map(e => e.type);
    assert.ok(types.includes('function'));
    assert.ok(types.includes('symbol'));
    assert.ok(types.includes('class-instance') || types.includes('dangerous-key'));
  });

  test('returns all errors (not just first)', () => {
    const result = detectNonSerializable({
      fn1: () => {},
      fn2: () => {},
      fn3: () => {}
    });

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 3);
  });
});

// =============================================================================
// detectEnvironmentVariables() Tests
// =============================================================================

describe('detectEnvironmentVariables - Node.js process.env', () => {
  test('detects process.env.API_KEY', () => {
    const result = detectEnvironmentVariables({ apiKey: 'process.env.API_KEY' });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings.length, 1);
    assert.strictEqual(result.warnings[0].variable, 'API_KEY');
    assert.strictEqual(result.warnings[0].pattern, 'process.env.API_KEY');
    assert.strictEqual(result.warnings[0].platform, 'Node.js');
  });

  test('detects process.env.DATABASE_URL', () => {
    const result = detectEnvironmentVariables({ db: 'process.env.DATABASE_URL' });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings[0].variable, 'DATABASE_URL');
  });

  test('detects lowercase env var names', () => {
    const result = detectEnvironmentVariables({ key: 'process.env.api_key' });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings[0].variable, 'api_key');
  });

  test('detects mixed case env var names', () => {
    const result = detectEnvironmentVariables({ key: 'process.env.apiKey123' });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings[0].variable, 'apiKey123');
  });

  test('detects multiple process.env in same string', () => {
    const result = detectEnvironmentVariables({
      url: 'process.env.HOST:process.env.PORT'
    });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings.length, 2);
    assert.strictEqual(result.warnings[0].variable, 'HOST');
    assert.strictEqual(result.warnings[1].variable, 'PORT');
  });
});

describe('detectEnvironmentVariables - Vite import.meta.env', () => {
  test('detects import.meta.env.VITE_API_KEY', () => {
    const result = detectEnvironmentVariables({ apiKey: 'import.meta.env.VITE_API_KEY' });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings.length, 1);
    assert.strictEqual(result.warnings[0].variable, 'VITE_API_KEY');
    assert.strictEqual(result.warnings[0].platform, 'Vite');
  });

  test('detects import.meta.env.VITE_BASE_URL', () => {
    const result = detectEnvironmentVariables({ baseUrl: 'import.meta.env.VITE_BASE_URL' });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings[0].variable, 'VITE_BASE_URL');
  });
});

describe('detectEnvironmentVariables - Deno.env.get', () => {
  test('detects Deno.env.get("API_KEY")', () => {
    const result = detectEnvironmentVariables({ apiKey: 'Deno.env.get("API_KEY")' });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings.length, 1);
    assert.strictEqual(result.warnings[0].variable, 'API_KEY');
    assert.strictEqual(result.warnings[0].platform, 'Deno');
  });

  test('detects Deno.env.get with single quotes', () => {
    const result = detectEnvironmentVariables({ key: "Deno.env.get('SECRET')" });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings[0].variable, 'SECRET');
  });

  test('detects Deno.env.get without quotes (variable name)', () => {
    const result = detectEnvironmentVariables({ key: 'Deno.env.get(API_KEY)' });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings[0].variable, 'API_KEY');
  });
});

describe('detectEnvironmentVariables - Nested Objects/Arrays', () => {
  test('detects env var in nested object', () => {
    const result = detectEnvironmentVariables({
      config: {
        api: {
          key: 'process.env.API_KEY'
        }
      }
    });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings.length, 1);
    assert.strictEqual(result.warnings[0].path, 'props.config.api.key');
  });

  test('detects env var in array', () => {
    const result = detectEnvironmentVariables(['process.env.KEY1', 'process.env.KEY2']);
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings.length, 2);
    assert.strictEqual(result.warnings[0].path, 'props[0]');
    assert.strictEqual(result.warnings[1].path, 'props[1]');
  });

  test('detects env var in nested array', () => {
    const result = detectEnvironmentVariables({
      keys: [['process.env.KEY1'], ['process.env.KEY2']]
    });
    assert.strictEqual(result.detected, true);
    assert.strictEqual(result.warnings.length, 2);
    assert.strictEqual(result.warnings[0].path, 'props.keys[0][0]');
  });
});

describe('detectEnvironmentVariables - Edge Cases', () => {
  test('skips null', () => {
    const result = detectEnvironmentVariables({ value: null });
    assert.strictEqual(result.detected, false);
    assert.strictEqual(result.warnings.length, 0);
  });

  test('skips undefined', () => {
    const result = detectEnvironmentVariables({ value: undefined });
    assert.strictEqual(result.detected, false);
  });

  test('skips non-string primitives', () => {
    const result = detectEnvironmentVariables({ num: 42, bool: true });
    assert.strictEqual(result.detected, false);
  });

  test('skips very large strings (DoS protection)', () => {
    const hugeString = 'x'.repeat(20000) + 'process.env.API_KEY';
    const result = detectEnvironmentVariables({ data: hugeString });
    // Should skip due to MAX_ENV_SCAN_SIZE (10000)
    assert.strictEqual(result.detected, false);
  });

  test('handles circular references gracefully', () => {
    const obj = { name: 'test' };
    obj.self = obj;

    const result = detectEnvironmentVariables(obj);
    // Should not crash, just skip circular
    assert.strictEqual(result.detected, false);
  });

  test('truncates value preview for long strings', () => {
    const longString = 'process.env.API_KEY' + 'x'.repeat(100);
    const result = detectEnvironmentVariables({ key: longString });
    assert.strictEqual(result.detected, true);
    assert.ok(result.warnings[0].valuePreview.length < longString.length);
    assert.ok(result.warnings[0].valuePreview.endsWith('...'));
  });

  test('removes newlines from value preview', () => {
    const result = detectEnvironmentVariables({ key: 'process.env.API_KEY\n\r' });
    assert.strictEqual(result.detected, true);
    assert.ok(!result.warnings[0].valuePreview.includes('\n'));
    assert.ok(!result.warnings[0].valuePreview.includes('\r'));
  });

  test('handles env var at end of string without truncation marker', () => {
    const result = detectEnvironmentVariables({ key: 'process.env.API_KEY' });
    assert.strictEqual(result.detected, true);
    assert.ok(!result.warnings[0].valuePreview.endsWith('...'));
  });
});

// =============================================================================
// validatePropSerialization() Tests
// =============================================================================

describe('validatePropSerialization - Basic Validation', () => {
  test('passes for valid props', () => {
    const result = validatePropSerialization(
      { name: 'Alice', age: 30 },
      'MyComponent'
    );
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.warnings.length, 0);
    assert.deepStrictEqual(result.sanitized, { name: 'Alice', age: 30 });
  });

  test('detects non-serializable props', () => {
    const result = validatePropSerialization(
      { onClick: () => {} },
      'MyComponent'
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.errors[0].type, 'function');
  });

  test('detects environment variables', () => {
    const result = validatePropSerialization(
      { apiKey: 'process.env.API_KEY' },
      'MyComponent'
    );
    // Should be valid (warnings, not errors)
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.warnings.length, 1);
    assert.strictEqual(result.warnings[0].variable, 'API_KEY');
  });
});

describe('validatePropSerialization - Options', () => {
  test('throws error when throwOnError=true', () => {
    assert.throws(
      () => {
        validatePropSerialization(
          { onClick: () => {} },
          'MyComponent',
          { throwOnError: true }
        );
      },
      (err) => {
        assert.ok(err.message.includes('Non-serializable prop'));
        assert.ok(err.message.includes('MyComponent'));
        assert.strictEqual(err.code, 'PSC_NON_SERIALIZABLE');
        assert.ok(err.suggestion.includes('Server Actions'));
        return true;
      }
    );
  });

  test('throws with custom error message for different types', () => {
    // Test symbol error
    assert.throws(
      () => {
        validatePropSerialization(
          { id: Symbol('test') },
          'MyComponent',
          { throwOnError: true }
        );
      },
      (err) => {
        assert.ok(err.message.includes('symbol'));
        return true;
      }
    );

    // Test class instance error
    assert.throws(
      () => {
        validatePropSerialization(
          { date: new Date() },
          'MyComponent',
          { throwOnError: true }
        );
      },
      (err) => {
        assert.ok(err.message.includes('Date'));
        assert.ok(err.suggestion.includes('Cannot serialize Date instances'));
        return true;
      }
    );

    // Test circular reference error
    const obj = {};
    obj.self = obj;
    assert.throws(
      () => {
        validatePropSerialization(obj, 'MyComponent', { throwOnError: true });
      },
      (err) => {
        assert.ok(err.suggestion.includes('circular'));
        return true;
      }
    );
  });

  test('skips env var detection when detectEnvVars=false', () => {
    const result = validatePropSerialization(
      { apiKey: 'process.env.API_KEY' },
      'MyComponent',
      { detectEnvVars: false }
    );
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.warnings.length, 0);
  });

  test('returns sanitized props (same as input)', () => {
    const props = { name: 'Alice', age: 30 };
    const result = validatePropSerialization(props, 'MyComponent');
    assert.deepStrictEqual(result.sanitized, props);
  });
});

describe('validatePropSerialization - Combined Errors/Warnings', () => {
  test('returns both errors and warnings', () => {
    const result = validatePropSerialization(
      {
        onClick: () => {},              // Error
        apiKey: 'process.env.API_KEY'   // Warning
      },
      'MyComponent'
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 1);
    assert.strictEqual(result.warnings.length, 1);
  });

  test('returns multiple errors', () => {
    const result = validatePropSerialization(
      {
        onClick: () => {},
        onSubmit: () => {},
        symbol: Symbol('test')
      },
      'MyComponent'
    );
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length, 3);
  });

  test('returns multiple warnings', () => {
    const result = validatePropSerialization(
      {
        apiKey: 'process.env.API_KEY',
        secret: 'import.meta.env.VITE_SECRET'
      },
      'MyComponent'
    );
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.warnings.length, 2);
  });
});

// Constants are not exported, so we test their behavior indirectly through the main functions

console.log('✅ Server Components validation tests completed');
