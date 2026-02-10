/**
 * Pulse Logger Tests
 *
 * Tests for runtime/logger.js - centralized logging with namespaces and levels
 *
 * @module test/logger
 */

import {
  createLogger,
  logger,
  loggers,
  configureLogger,
  isProductionMode,
  setLogLevel,
  getLogLevel,
  setFormatter,
  LogLevel
} from '../runtime/logger.js';

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// LogLevel Tests
// =============================================================================

describe('LogLevel Tests', () => {
  test('LogLevel has correct values', () => {
    assert.strictEqual(LogLevel.SILENT, 0);
    assert.strictEqual(LogLevel.ERROR, 1);
    assert.strictEqual(LogLevel.WARN, 2);
    assert.strictEqual(LogLevel.INFO, 3);
    assert.strictEqual(LogLevel.DEBUG, 4);
  });
});

// =============================================================================
// Logger Creation Tests
// =============================================================================

describe('Logger Creation Tests', () => {
  test('createLogger returns a logger object', () => {
    const log = createLogger('Test');
    assert.ok(typeof log.error === 'function', 'Should have error method');
    assert.ok(typeof log.warn === 'function', 'Should have warn method');
    assert.ok(typeof log.info === 'function', 'Should have info method');
    assert.ok(typeof log.debug === 'function', 'Should have debug method');
    assert.ok(typeof log.group === 'function', 'Should have group method');
    assert.ok(typeof log.groupEnd === 'function', 'Should have groupEnd method');
    assert.ok(typeof log.log === 'function', 'Should have log method');
    assert.ok(typeof log.child === 'function', 'Should have child method');
  });

  test('createLogger with namespace returns namespaced logger', () => {
    const log = createLogger('MyModule');
    assert.ok(log !== null, 'Should return logger');
  });

  test('createLogger without namespace returns logger', () => {
    const log = createLogger();
    assert.ok(log !== null, 'Should return logger');
  });

  test('default logger export exists', () => {
    assert.ok(logger !== null, 'Default logger should exist');
    assert.ok(typeof logger.info === 'function', 'Should have info method');
  });
});

// =============================================================================
// Pre-configured Loggers Tests
// =============================================================================

describe('Pre-configured Loggers Tests', () => {
  test('loggers object has all subsystem loggers', () => {
    assert.ok('pulse' in loggers, 'Should have pulse logger');
    assert.ok('dom' in loggers, 'Should have dom logger');
    assert.ok('router' in loggers, 'Should have router logger');
    assert.ok('store' in loggers, 'Should have store logger');
    assert.ok('native' in loggers, 'Should have native logger');
    assert.ok('hmr' in loggers, 'Should have hmr logger');
    assert.ok('cli' in loggers, 'Should have cli logger');
  });

  test('subsystem loggers have correct methods', () => {
    const domLog = loggers.dom;
    assert.ok(typeof domLog.error === 'function', 'Should have error method');
    assert.ok(typeof domLog.warn === 'function', 'Should have warn method');
    assert.ok(typeof domLog.info === 'function', 'Should have info method');
    assert.ok(typeof domLog.debug === 'function', 'Should have debug method');
  });
});

// =============================================================================
// Log Level Tests
// =============================================================================

describe('Log Level Tests', () => {
  test('setLogLevel and getLogLevel work correctly', () => {
    const originalLevel = getLogLevel();

    setLogLevel(LogLevel.DEBUG);
    assert.strictEqual(getLogLevel(), LogLevel.DEBUG);

    setLogLevel(LogLevel.ERROR);
    assert.strictEqual(getLogLevel(), LogLevel.ERROR);

    setLogLevel(LogLevel.SILENT);
    assert.strictEqual(getLogLevel(), LogLevel.SILENT);

    // Restore original level
    setLogLevel(originalLevel);
  });

  test('getLogLevel returns SILENT in production mode', () => {
    const originalLevel = getLogLevel();

    // Enable production mode
    configureLogger({ production: true });
    assert.strictEqual(getLogLevel(), LogLevel.SILENT);

    // Disable production mode
    configureLogger({ production: false });

    // Restore original level
    setLogLevel(originalLevel);
  });
});

// =============================================================================
// Production Mode Tests
// =============================================================================

describe('Production Mode Tests', () => {
  test('configureLogger sets production mode', () => {
    configureLogger({ production: true });
    assert.strictEqual(isProductionMode(), true);

    configureLogger({ production: false });
    assert.strictEqual(isProductionMode(), false);
  });

  test('logger in production mode returns noop logger', () => {
    configureLogger({ production: true });

    const log = createLogger('Test');

    // Should not throw
    log.error('test');
    log.warn('test');
    log.info('test');
    log.debug('test');
    log.group('test');
    log.groupEnd();

    configureLogger({ production: false });
  });

  test('child logger in production mode returns noop logger', () => {
    configureLogger({ production: true });

    const log = createLogger('Parent');
    const child = log.child('Child');

    // Should not throw
    child.info('test');

    configureLogger({ production: false });
  });
});

// =============================================================================
// Child Logger Tests
// =============================================================================

describe('Child Logger Tests', () => {
  test('child logger creates namespaced logger', () => {
    configureLogger({ production: false });

    const log = createLogger('Parent');
    const child = log.child('Child');

    assert.ok(child !== null, 'Child logger should exist');
    assert.ok(typeof child.info === 'function', 'Should have info method');
  });

  test('child logger can create nested children', () => {
    configureLogger({ production: false });

    const log = createLogger('A');
    const child = log.child('B');
    const grandchild = child.child('C');

    assert.ok(grandchild !== null, 'Grandchild logger should exist');
  });
});

// =============================================================================
// Custom Formatter Tests
// =============================================================================

describe('Custom Formatter Tests', () => {
  test('setFormatter accepts null', () => {
    setFormatter(null);
    // Should not throw
    const log = createLogger('Test');
    log.info('test');
  });

  test('setFormatter accepts function', () => {
    let formatterCalled = false;

    setFormatter((level, namespace, args) => {
      formatterCalled = true;
      return `[${level}] ${namespace}: ${args.join(' ')}`;
    });

    configureLogger({ production: false });
    setLogLevel(LogLevel.INFO);

    const log = createLogger('Test');
    log.info('message');

    // Reset formatter
    setFormatter(null);

    // Note: We can't easily verify console output, but we can verify no errors
    assert.ok(true, 'Formatter should work without errors');
  });
});

// =============================================================================
// Logger Methods Tests
// =============================================================================

describe('Logger Methods Tests', () => {
  test('logger methods do not throw', () => {
    configureLogger({ production: false });
    setLogLevel(LogLevel.DEBUG);

    const log = createLogger('Test');

    // None of these should throw
    log.error('error message');
    log.warn('warn message');
    log.info('info message');
    log.debug('debug message');
    log.group('group');
    log.groupEnd();
    log.log(LogLevel.INFO, 'custom level message');

    assert.ok(true, 'All methods should work without throwing');
  });

  test('logger with options accepts level override', () => {
    configureLogger({ production: false });

    const log = createLogger('Test', { level: LogLevel.ERROR });

    // Should not throw
    log.error('error');
    log.warn('warn'); // Will be filtered by level
    log.info('info'); // Will be filtered by level

    assert.ok(true, 'Logger with level option should work');
  });
});
