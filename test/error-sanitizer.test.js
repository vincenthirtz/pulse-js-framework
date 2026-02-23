/**
 * Tests for Error Sanitizer (Server Components)
 *
 * Coverage:
 * - Stack trace sanitization
 * - Error message redaction
 * - Production vs development modes
 * - Property filtering
 * - Edge cases
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  sanitizeError,
  sanitizeStackTrace,
  sanitizeErrorMessage,
  truncateStackTrace,
  createProductionSafeError,
  sanitizeErrors,
  sanitizeValidationErrors,
  isProductionMode,
  isDevelopmentMode
} from '../runtime/server-components/error-sanitizer.js';

describe('Error Sanitizer', () => {
  // ========== Stack Trace Sanitization ==========

  describe('sanitizeStackTrace()', () => {
    test('removes node_modules paths', () => {
      const stack = `Error: Test
  at /app/src/index.js:10:5
  at /app/node_modules/express/lib/router.js:42:12
  at /app/src/handler.js:20:3`;

      const sanitized = sanitizeStackTrace(stack);
      assert.ok(!sanitized.includes('node_modules'));
      assert.ok(sanitized.includes('index.js:10:5'));
      assert.ok(sanitized.includes('handler.js:20:3'));
    });

    test('removes user home directories (Unix)', () => {
      const stack = `Error: Test
  at /Users/alice/project/app.js:10:5
  at /Users/alice/project/lib/util.js:42:12`;

      const sanitized = sanitizeStackTrace(stack);
      assert.ok(!sanitized.includes('/Users/alice'));
      assert.ok(sanitized.includes('app.js:10:5'));
    });

    test('removes user home directories (Windows)', () => {
      const stack = `Error: Test
  at C:\\Users\\Alice\\project\\app.js:10:5
  at C:\\Users\\Alice\\project\\lib\\util.js:42:12`;

      const sanitized = sanitizeStackTrace(stack);
      assert.ok(!sanitized.includes('C:\\Users\\Alice'));
    });

    test('removes node:internal paths', () => {
      const stack = `Error: Test
  at node:internal/process/task_queues:95:5
  at /app/src/index.js:10:3`;

      const sanitized = sanitizeStackTrace(stack);
      assert.ok(!sanitized.includes('node:internal'));
      assert.ok(sanitized.includes('index.js:10:3'));
    });

    test('removes anonymous function traces', () => {
      const stack = `Error: Test
  at <anonymous>:1:1
  at /app/src/index.js:10:3`;

      const sanitized = sanitizeStackTrace(stack);
      assert.ok(!sanitized.includes('<anonymous>'));
      assert.ok(sanitized.includes('index.js:10:3'));
    });

    test('preserves error message line', () => {
      const stack = `Error: Connection failed
  at /app/node_modules/pg/lib/client.js:42:12`;

      const sanitized = sanitizeStackTrace(stack);
      assert.ok(sanitized.startsWith('Error: Connection failed'));
    });

    test('handles empty stack', () => {
      assert.strictEqual(sanitizeStackTrace(''), '');
      assert.strictEqual(sanitizeStackTrace(null), '');
      assert.strictEqual(sanitizeStackTrace(undefined), '');
    });

    test('converts absolute paths to relative', () => {
      const stack = `Error: Test
  at /app/src/components/Button.js:10:5`;

      const sanitized = sanitizeStackTrace(stack);
      assert.ok(sanitized.includes('Button.js:10:5'));
      assert.ok(!sanitized.includes('/app/src/components'));
    });
  });

  describe('truncateStackTrace()', () => {
    test('truncates long stack traces', () => {
      const stack = `Error: Test
  at line1.js:1:1
  at line2.js:2:2
  at line3.js:3:3
  at line4.js:4:4
  at line5.js:5:5
  at line6.js:6:6
  at line7.js:7:7`;

      const truncated = truncateStackTrace(stack, 3);
      const lines = truncated.split('\n');
      assert.strictEqual(lines.length, 4); // Error message + 2 stack lines + "... more"
      assert.ok(truncated.includes('... (5 more lines)')); // 8 total - 3 kept = 5 more
    });

    test('does not truncate short stacks', () => {
      const stack = `Error: Test
  at line1.js:1:1
  at line2.js:2:2`;

      const truncated = truncateStackTrace(stack, 5);
      assert.strictEqual(truncated, stack);
    });

    test('handles empty stack', () => {
      assert.strictEqual(truncateStackTrace(''), '');
    });
  });

  // ========== Message Sanitization ==========

  describe('sanitizeErrorMessage()', () => {
    test('redacts PostgreSQL connection strings', () => {
      const message = 'Connection failed: postgres://user:password@localhost:5432/db';
      const sanitized = sanitizeErrorMessage(message);
      assert.ok(!sanitized.includes('postgres://user:password'));
      assert.ok(sanitized.includes('[REDACTED]'));
    });

    test('redacts MongoDB connection strings', () => {
      const message = 'Failed to connect: mongodb://admin:secret@localhost:27017/mydb';
      const sanitized = sanitizeErrorMessage(message);
      assert.ok(!sanitized.includes('mongodb://admin:secret'));
      assert.ok(sanitized.includes('[REDACTED]'));
    });

    test('redacts MongoDB+SRV connection strings', () => {
      const message = 'Error: mongodb+srv://user:pass@cluster.mongodb.net/db';
      const sanitized = sanitizeErrorMessage(message);
      assert.ok(!sanitized.includes('mongodb+srv://user:pass'));
    });

    test('redacts file paths (Unix)', () => {
      const message = 'Failed to read /etc/secrets/api-key.json';
      const sanitized = sanitizeErrorMessage(message);
      assert.ok(!sanitized.includes('/etc/secrets/api-key.json'));
      assert.ok(sanitized.includes('[REDACTED]'));
    });

    test('redacts file paths (Windows)', () => {
      const message = 'Failed to read C:\\secrets\\config.json';
      const sanitized = sanitizeErrorMessage(message);
      assert.ok(!sanitized.includes('C:\\secrets\\config.json'));
    });

    test('redacts email addresses', () => {
      const message = 'Error for user alice@example.com';
      const sanitized = sanitizeErrorMessage(message);
      assert.ok(!sanitized.includes('alice@example.com'));
      assert.ok(sanitized.includes('[REDACTED]'));
    });

    test('redacts IP addresses', () => {
      const message = 'Connection to 192.168.1.100 failed';
      const sanitized = sanitizeErrorMessage(message);
      assert.ok(!sanitized.includes('192.168.1.100'));
    });

    test('redacts environment variables', () => {
      const message = 'Missing API_KEY=sk_live_abc123 in environment';
      const sanitized = sanitizeErrorMessage(message);
      assert.ok(!sanitized.includes('API_KEY=sk_live_abc123'));
    });

    test('handles empty messages', () => {
      assert.strictEqual(sanitizeErrorMessage(''), '');
      assert.strictEqual(sanitizeErrorMessage(null), '');
      assert.strictEqual(sanitizeErrorMessage(undefined), '');
    });
  });

  // ========== Error Object Sanitization ==========

  describe('sanitizeError()', () => {
    test('sanitizes basic error', () => {
      const error = new Error('Test error');
      const sanitized = sanitizeError(error, { includeStack: false });

      assert.strictEqual(sanitized.name, 'Error');
      assert.strictEqual(sanitized.message, 'Test error');
      assert.strictEqual(sanitized.stack, undefined);
    });

    test('includes stack in development mode', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
  at /app/src/index.js:10:5`;

      const sanitized = sanitizeError(error, {
        mode: 'development',
        includeStack: true
      });

      assert.ok(sanitized.stack);
      assert.ok(sanitized.stack.includes('index.js:10:5'));
    });

    test('excludes stack in production mode', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
  at /app/src/index.js:10:5`;

      const sanitized = sanitizeError(error, {
        mode: 'production',
        includeStack: false
      });

      assert.strictEqual(sanitized.stack, undefined);
    });

    test('redacts sensitive messages', () => {
      const error = new Error('Connection failed: postgres://user:pass@localhost/db');
      const sanitized = sanitizeError(error, { redactMessages: true });

      assert.ok(!sanitized.message.includes('postgres://user:pass'));
      assert.ok(sanitized.message.includes('[REDACTED]'));
    });

    test('preserves error code', () => {
      const error = new Error('Test error');
      error.code = 'ECONNREFUSED';

      const sanitized = sanitizeError(error);
      assert.strictEqual(sanitized.code, 'ECONNREFUSED');
    });

    test('preserves allowed custom properties', () => {
      const error = new Error('Test error');
      error.userId = 123;
      error.request = { headers: { Authorization: 'Bearer secret' } };

      const sanitized = sanitizeError(error, {
        allowedProperties: ['userId']
      });

      assert.strictEqual(sanitized.userId, 123);
      assert.strictEqual(sanitized.request, undefined); // Not allowed
    });

    test('preserves Pulse error suggestion', () => {
      const error = new Error('Invalid prop');
      error.suggestion = 'Use a different value';

      const sanitized = sanitizeError(error);
      assert.strictEqual(sanitized.suggestion, 'Use a different value');
    });

    test('sanitizes Pulse error context', () => {
      const error = new Error('Database error');
      error.context = 'Connection: postgres://user:pass@localhost/db';

      const sanitized = sanitizeError(error, { redactMessages: true });
      assert.ok(!sanitized.context.includes('postgres://user:pass'));
    });

    test('truncates stack trace to max lines', () => {
      const error = new Error('Test');
      error.stack = `Error: Test
  at line1.js:1:1
  at line2.js:2:2
  at line3.js:3:3
  at line4.js:4:4
  at line5.js:5:5`;

      const sanitized = sanitizeError(error, {
        includeStack: true,
        maxStackLines: 2
      });

      const lines = sanitized.stack.split('\n');
      assert.ok(lines.length <= 4); // Error message + 2 lines + "... more"
    });
  });

  describe('createProductionSafeError()', () => {
    test('creates minimal error', () => {
      const error = new Error('Detailed internal error with secrets');
      error.stack = 'Long stack trace...';
      error.context = 'Internal database connection';

      const safe = createProductionSafeError(error);

      assert.strictEqual(safe.name, 'Error');
      assert.strictEqual(safe.message, 'An error occurred');
      assert.strictEqual(safe.stack, undefined);
      assert.strictEqual(safe.context, undefined);
    });

    test('uses custom generic message', () => {
      const error = new Error('Internal error');
      const safe = createProductionSafeError(error, 'Something went wrong');

      assert.strictEqual(safe.message, 'Something went wrong');
    });
  });

  describe('sanitizeErrors()', () => {
    test('sanitizes array of errors', () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2: postgres://user:pass@localhost/db')
      ];

      const sanitized = sanitizeErrors(errors, { redactMessages: true });

      assert.strictEqual(sanitized.length, 2);
      assert.strictEqual(sanitized[0].message, 'Error 1');
      assert.ok(!sanitized[1].message.includes('postgres://user:pass'));
    });

    test('handles empty array', () => {
      const sanitized = sanitizeErrors([]);
      assert.strictEqual(sanitized.length, 0);
    });

    test('handles non-array input', () => {
      const sanitized = sanitizeErrors(null);
      assert.strictEqual(sanitized.length, 0);
    });
  });

  describe('sanitizeValidationErrors()', () => {
    test('sanitizes validation error object', () => {
      const errors = {
        email: 'Invalid email: <script>alert(1)</script>',
        password: 'Too short',
        url: 'Invalid URL: postgres://user:pass@localhost/db'
      };

      const sanitized = sanitizeValidationErrors(errors);

      // XSS patterns should be HTML-escaped
      assert.ok(!sanitized.email.includes('<script>'));
      assert.ok(sanitized.email.includes('&lt;script&gt;'));
      assert.strictEqual(sanitized.password, 'Too short');
      // Connection strings should be redacted
      assert.ok(!sanitized.url.includes('postgres://user:pass'));
      assert.ok(sanitized.url.includes('[REDACTED]'));
    });

    test('handles Error objects as values', () => {
      const errors = {
        field1: new Error('Test error')
      };

      const sanitized = sanitizeValidationErrors(errors);
      assert.strictEqual(sanitized.field1, 'Test error');
    });

    test('handles null input', () => {
      const sanitized = sanitizeValidationErrors(null);
      assert.deepStrictEqual(sanitized, {});
    });
  });

  // ========== Mode Detection ==========

  describe('Mode detection', () => {
    test('isProductionMode() checks NODE_ENV', () => {
      const original = process.env.NODE_ENV;

      process.env.NODE_ENV = 'production';
      assert.strictEqual(isProductionMode(), true);

      process.env.NODE_ENV = 'development';
      assert.strictEqual(isProductionMode(), false);

      process.env.NODE_ENV = 'test';
      assert.strictEqual(isProductionMode(), false);

      process.env.NODE_ENV = original;
    });

    test('isDevelopmentMode() checks NODE_ENV', () => {
      const original = process.env.NODE_ENV;

      process.env.NODE_ENV = 'development';
      assert.strictEqual(isDevelopmentMode(), true);

      process.env.NODE_ENV = 'production';
      assert.strictEqual(isDevelopmentMode(), false);

      process.env.NODE_ENV = 'test';
      assert.strictEqual(isDevelopmentMode(), false);

      process.env.NODE_ENV = original;
    });
  });

  // ========== Edge Cases ==========

  describe('Edge cases', () => {
    test('handles error with no message', () => {
      const error = new Error();
      const sanitized = sanitizeError(error);

      assert.strictEqual(sanitized.name, 'Error');
      assert.ok('message' in sanitized);
    });

    test('handles error with no stack', () => {
      const error = new Error('Test');
      delete error.stack;

      const sanitized = sanitizeError(error, { includeStack: true });
      assert.strictEqual(sanitized.stack, undefined);
    });

    test('handles custom error classes', () => {
      class CustomError extends Error {
        constructor(message) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error');
      const sanitized = sanitizeError(error);

      assert.strictEqual(sanitized.name, 'CustomError');
      assert.strictEqual(sanitized.message, 'Custom error');
    });

    test('handles errors with circular references', () => {
      const error = new Error('Test');
      error.circular = error; // Circular reference

      // Should not throw
      const sanitized = sanitizeError(error);
      assert.strictEqual(sanitized.name, 'Error');
      assert.strictEqual(sanitized.circular, undefined); // Not in allowed properties
    });

    test('handles very long error messages', () => {
      const longMessage = 'Error: ' + 'x'.repeat(10000);
      const error = new Error(longMessage);

      const sanitized = sanitizeError(error, { redactMessages: false });
      assert.strictEqual(sanitized.message, longMessage);
    });
  });
});
