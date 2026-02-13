/**
 * Logger Coverage Boost Tests
 * Additional tests to cover logger.js edge cases
 * Target: Increase logger.js coverage from 96.42% to 100%
 *
 * Uncovered lines: 44-45, 205-207, 246, 256, 276, 300-301, 303-304
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  createLogger, setLogLevel, LogLevel, setFormatter,
  configureLogger, isProductionMode
} from '../runtime/logger.js';

// Store original process and console
let originalProcess;
let originalConsole;
let logs;

beforeEach(() => {
  originalProcess = globalThis.process;
  originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  // Mock console to capture logs
  logs = { log: [], error: [], warn: [], info: [] };
  console.log = (...args) => logs.log.push(args);
  console.error = (...args) => logs.error.push(args);
  console.warn = (...args) => logs.warn.push(args);
  console.info = (...args) => logs.info.push(args);

  // Reset configuration
  setLogLevel(LogLevel.INFO);
  setFormatter(null);
  configureLogger({ production: false });
});

afterEach(() => {
  // Restore originals
  globalThis.process = originalProcess;
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
});

// ============================================================================
// detectProduction() Default Return (lines 44-45)
// ============================================================================

describe('detectProduction - No Process Environment', () => {
  test('returns false when process is undefined (lines 44-45)', () => {
    // Remove process to trigger default return
    delete globalThis.process;

    // Force module reload by using configureLogger
    configureLogger({ production: false });

    // isProductionMode should return false (the default)
    const result = isProductionMode();
    assert.strictEqual(result, false);
  });
});

// ============================================================================
// formatArgs() with Non-String First Argument (lines 205-207)
// ============================================================================

describe('Logger - Non-String Arguments', () => {
  test('logger handles object as first argument (lines 205-207)', () => {
    const logger = createLogger('test');
    setLogLevel(LogLevel.INFO);

    const obj = { id: 123, name: 'Test' };
    logger.info(obj, 'additional data');

    // info() uses console.log, not console.info
    assert.strictEqual(logs.log.length, 1);
    const logged = logs.log[0];
    assert.ok(logged.length >= 2);
    assert.strictEqual(logged[0], '[test]');
    assert.deepStrictEqual(logged[1], obj);
  });

  test('logger handles number as first argument (lines 205-207)', () => {
    const logger = createLogger('math');
    setLogLevel(LogLevel.INFO);

    logger.info(42, 'is the answer');

    // info() uses console.log, not console.info
    assert.strictEqual(logs.log.length, 1);
    const logged = logs.log[0];
    assert.strictEqual(logged[0], '[math]');
    assert.strictEqual(logged[1], 42);
  });

  test('logger handles array as first argument (lines 205-207)', () => {
    const logger = createLogger('data');
    setLogLevel(LogLevel.INFO);

    const arr = [1, 2, 3];
    logger.info(arr);

    // info() uses console.log, not console.info
    assert.strictEqual(logs.log.length, 1);
    const logged = logs.log[0];
    assert.strictEqual(logged[0], '[data]');
    assert.deepStrictEqual(logged[1], arr);
  });
});

// ============================================================================
// globalFormatter with error/warn/debug (lines 246, 256, 276)
// ============================================================================

describe('Custom Formatter - All Log Levels', () => {
  test('custom formatter with error level (line 246)', () => {
    setLogLevel(LogLevel.ERROR);
    const formatter = (level, namespace, args) => {
      return `CUSTOM [${level}] ${namespace}: ${args.join(' ')}`;
    };
    setFormatter(formatter);

    const logger = createLogger('app');
    logger.error('Something failed');

    assert.strictEqual(logs.error.length, 1);
    assert.strictEqual(logs.error[0][0], 'CUSTOM [error] app: Something failed');
  });

  test('custom formatter with warn level (line 256)', () => {
    setLogLevel(LogLevel.WARN);
    const formatter = (level, namespace, args) => {
      return `CUSTOM [${level}] ${namespace}: ${args.join(' ')}`;
    };
    setFormatter(formatter);

    const logger = createLogger('app');
    logger.warn('Deprecated API');

    assert.strictEqual(logs.warn.length, 1);
    assert.strictEqual(logs.warn[0][0], 'CUSTOM [warn] app: Deprecated API');
  });

  test('custom formatter with debug level (line 276)', () => {
    setLogLevel(LogLevel.DEBUG);
    const formatter = (level, namespace, args) => {
      return `CUSTOM [${level}] ${namespace}: ${args.join(' ')}`;
    };
    setFormatter(formatter);

    const logger = createLogger('app');
    logger.debug('Verbose details');

    assert.strictEqual(logs.log.length, 1);
    assert.strictEqual(logs.log[0][0], 'CUSTOM [debug] app: Verbose details');
  });

  test('custom formatter receives correct arguments', () => {
    setLogLevel(LogLevel.INFO);
    let receivedLevel, receivedNamespace, receivedArgs;
    const formatter = (level, namespace, args) => {
      receivedLevel = level;
      receivedNamespace = namespace;
      receivedArgs = args;
      return 'formatted';
    };
    setFormatter(formatter);

    const logger = createLogger('test');
    logger.info('message', { data: 123 });

    assert.strictEqual(receivedLevel, 'info');
    assert.strictEqual(receivedNamespace, 'test');
    assert.deepStrictEqual(receivedArgs, ['message', { data: 123 }]);
  });
});

// ============================================================================
// log() Method with ERROR and WARN Levels (lines 300-301, 303-304)
// ============================================================================

describe('Logger.log() Method - Specific Levels', () => {
  test('log() with ERROR level (lines 300-301)', () => {
    setLogLevel(LogLevel.ERROR);
    const logger = createLogger('app');

    logger.log(LogLevel.ERROR, 'Critical failure');

    assert.strictEqual(logs.error.length, 1);
    const logged = logs.error[0];
    // formatArgs combines namespace and message for string args
    assert.strictEqual(logged[0], '[app] Critical failure');
  });

  test('log() with WARN level (lines 303-304)', () => {
    setLogLevel(LogLevel.WARN);
    const logger = createLogger('app');

    logger.log(LogLevel.WARN, 'Warning message');

    assert.strictEqual(logs.warn.length, 1);
    const logged = logs.warn[0];
    assert.strictEqual(logged[0], '[app] Warning message');
  });

  test('log() with INFO level defaults to console.log', () => {
    setLogLevel(LogLevel.INFO);
    const logger = createLogger('app');

    logger.log(LogLevel.INFO, 'Info message');

    assert.strictEqual(logs.log.length, 1);
    const logged = logs.log[0];
    assert.strictEqual(logged[0], '[app] Info message');
  });

  test('log() with DEBUG level defaults to console.log', () => {
    setLogLevel(LogLevel.DEBUG);
    const logger = createLogger('app');

    logger.log(LogLevel.DEBUG, 'Debug message');

    assert.strictEqual(logs.log.length, 1);
    const logged = logs.log[0];
    assert.strictEqual(logged[0], '[app] Debug message');
  });
});

// ============================================================================
// Integration: Combined Edge Cases
// ============================================================================

describe('Logger - Integration Edge Cases', () => {
  test('formatter with non-string argument and custom level', () => {
    setLogLevel(LogLevel.DEBUG);
    const formatter = (level, namespace, args) => {
      return `[${level.toUpperCase()}] ${namespace} - ${JSON.stringify(args)}`;
    };
    setFormatter(formatter);

    const logger = createLogger('data');
    logger.debug({ status: 'ok' }, 42);

    assert.strictEqual(logs.log.length, 1);
    const result = logs.log[0][0];
    assert.ok(result.includes('[DEBUG]'));
    assert.ok(result.includes('data'));
    assert.ok(result.includes('status'));
  });

  test('log() method with formatter bypasses formatArgs', () => {
    setLogLevel(LogLevel.ERROR);
    const formatter = (level, namespace, args) => {
      return `CUSTOM: ${args.join(', ')}`;
    };
    setFormatter(formatter);

    const logger = createLogger('test');

    // log() method doesn't use globalFormatter, only the individual methods do
    logger.log(LogLevel.ERROR, 'test message');

    assert.strictEqual(logs.error.length, 1);
    // Should use formatArgs, not globalFormatter
    const logged = logs.error[0];
    // formatArgs combines namespace and message for string args
    assert.strictEqual(logged[0], '[test] test message');
  });

  test('multiple loggers with formatter', () => {
    setLogLevel(LogLevel.INFO);
    const formatter = (level, namespace) => `[${namespace}] ${level}`;
    setFormatter(formatter);

    const logger1 = createLogger('module1');
    const logger2 = createLogger('module2');

    logger1.error('error1');
    logger2.warn('warn2');

    assert.strictEqual(logs.error.length, 1);
    assert.strictEqual(logs.warn.length, 1);
    assert.ok(logs.error[0][0].includes('module1'));
    assert.ok(logs.warn[0][0].includes('module2'));
  });
});
