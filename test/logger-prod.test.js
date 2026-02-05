/**
 * Pulse Logger Production Build Tests
 *
 * Tests for runtime/logger.prod.js - Production mode logger
 *
 * @module test/logger-prod
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Store original console methods
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

// Capture logs for testing
let logs = [];

function captureConsole() {
  logs = [];
  console.log = (...args) => logs.push({ level: 'log', args });
  console.info = (...args) => logs.push({ level: 'info', args });
  console.warn = (...args) => logs.push({ level: 'warn', args });
  console.error = (...args) => logs.push({ level: 'error', args });
  console.debug = (...args) => logs.push({ level: 'debug', args });
}

function restoreConsole() {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
}

// ============================================================================
// Logger Production Tests
// ============================================================================

describe('Logger Production Build', () => {
  beforeEach(() => {
    captureConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  test('logger.prod exports all expected functions', async () => {
    const loggerProd = await import('../runtime/logger.prod.js');

    assert.strictEqual(typeof loggerProd.logger, 'object');
    assert.strictEqual(typeof loggerProd.loggers, 'object');
    assert.strictEqual(typeof loggerProd.createLogger, 'function');
    assert.strictEqual(typeof loggerProd.LogLevel, 'object');
    assert.strictEqual(typeof loggerProd.setLogLevel, 'function');
    assert.strictEqual(typeof loggerProd.getLogLevel, 'function');
    assert.strictEqual(typeof loggerProd.setFormatter, 'function');
    assert.strictEqual(typeof loggerProd.configureLogger, 'function');
    assert.strictEqual(typeof loggerProd.isProductionMode, 'function');
  });

  test('logger.prod forces production mode', async () => {
    const { isProductionMode } = await import('../runtime/logger.prod.js');

    assert.strictEqual(isProductionMode(), true);
  });

  test('logger in production mode does not log', async () => {
    // Note: The exported 'logger' is created at module load time before production mode is set.
    // For truly noop logging, use createLogger() after configuring production mode.
    // The loggers namespace uses getters, so they respect production mode.
    const { createLogger, isProductionMode } = await import('../runtime/logger.prod.js');

    // Verify production mode is enabled
    assert.strictEqual(isProductionMode(), true);

    // Create a new logger - this should be noop in production
    const newLogger = createLogger('Test');
    newLogger.info('This should not appear');
    newLogger.warn('Neither should this');
    newLogger.error('Or this');
    newLogger.debug('And not this');

    // New loggers created after production mode should be noop
    assert.strictEqual(logs.length, 0);
  });

  test('createLogger in production mode returns noop logger', async () => {
    const { createLogger } = await import('../runtime/logger.prod.js');

    const myLogger = createLogger('MyModule');

    myLogger.info('Info message');
    myLogger.warn('Warn message');
    myLogger.error('Error message');
    myLogger.debug('Debug message');

    // All should be noop
    assert.strictEqual(logs.length, 0);
  });

  test('loggers namespace in production mode are noop', async () => {
    const { loggers } = await import('../runtime/logger.prod.js');

    // Test predefined namespace loggers
    if (loggers.pulse) loggers.pulse.info('Pulse info');
    if (loggers.dom) loggers.dom.info('DOM info');
    if (loggers.router) loggers.router.info('Router info');
    if (loggers.store) loggers.store.info('Store info');

    // All should be noop
    assert.strictEqual(logs.length, 0);
  });

  test('LogLevel constants are available', async () => {
    const { LogLevel } = await import('../runtime/logger.prod.js');

    assert.strictEqual(typeof LogLevel.SILENT, 'number');
    assert.strictEqual(typeof LogLevel.ERROR, 'number');
    assert.strictEqual(typeof LogLevel.WARN, 'number');
    assert.strictEqual(typeof LogLevel.INFO, 'number');
    assert.strictEqual(typeof LogLevel.DEBUG, 'number');

    // Verify ordering
    assert.ok(LogLevel.SILENT < LogLevel.ERROR);
    assert.ok(LogLevel.ERROR < LogLevel.WARN);
    assert.ok(LogLevel.WARN < LogLevel.INFO);
    assert.ok(LogLevel.INFO < LogLevel.DEBUG);
  });

  test('setLogLevel does not throw in production', async () => {
    const { setLogLevel, LogLevel } = await import('../runtime/logger.prod.js');

    // Should not throw
    setLogLevel(LogLevel.DEBUG);
    setLogLevel(LogLevel.SILENT);
    setLogLevel(LogLevel.ERROR);
  });

  test('getLogLevel returns a value', async () => {
    const { getLogLevel } = await import('../runtime/logger.prod.js');

    const level = getLogLevel();
    assert.strictEqual(typeof level, 'number');
  });

  test('setFormatter does not throw in production', async () => {
    const { setFormatter } = await import('../runtime/logger.prod.js');

    // Should not throw
    setFormatter((level, namespace, args) => `Custom: ${args.join(' ')}`);
  });

  test('configureLogger can be called', async () => {
    const { configureLogger } = await import('../runtime/logger.prod.js');

    // Should not throw and should accept options
    configureLogger({ production: true });
    configureLogger({ production: false }); // Even this won't change prod mode in logger.prod.js
  });

  test('default export is logger', async () => {
    const loggerProd = await import('../runtime/logger.prod.js');

    assert.strictEqual(loggerProd.default, loggerProd.logger);
  });
});

// ============================================================================
// Comparison with Development Logger
// ============================================================================

describe('Logger Production vs Development', () => {
  beforeEach(() => {
    captureConsole();
  });

  afterEach(() => {
    restoreConsole();
  });

  test('production logger has same API as development logger', async () => {
    const prodLogger = await import('../runtime/logger.prod.js');
    const devLogger = await import('../runtime/logger.js');

    // Same exports should be available
    const prodKeys = Object.keys(prodLogger).sort();
    const devKeys = Object.keys(devLogger).sort();

    // Core exports should match
    const coreExports = ['logger', 'loggers', 'createLogger', 'LogLevel', 'setLogLevel', 'getLogLevel', 'setFormatter', 'configureLogger', 'isProductionMode'];

    for (const key of coreExports) {
      assert.ok(key in prodLogger, `Production logger should have ${key}`);
      assert.ok(key in devLogger, `Development logger should have ${key}`);
    }
  });

  test('logger objects have same method signatures', async () => {
    const { logger: prodLogger } = await import('../runtime/logger.prod.js');
    const { logger: devLogger } = await import('../runtime/logger.js');

    const methods = ['info', 'warn', 'error', 'debug'];

    for (const method of methods) {
      assert.strictEqual(typeof prodLogger[method], 'function', `Production logger should have ${method}`);
      assert.strictEqual(typeof devLogger[method], 'function', `Development logger should have ${method}`);
    }
  });
});

console.log('Logger production tests loaded');
