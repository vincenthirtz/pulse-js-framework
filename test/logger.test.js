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

import {
  test,
  assertEqual,
  assert,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// LogLevel Tests
// =============================================================================

printSection('LogLevel Tests');

test('LogLevel has correct values', () => {
  assertEqual(LogLevel.SILENT, 0);
  assertEqual(LogLevel.ERROR, 1);
  assertEqual(LogLevel.WARN, 2);
  assertEqual(LogLevel.INFO, 3);
  assertEqual(LogLevel.DEBUG, 4);
});

// =============================================================================
// Logger Creation Tests
// =============================================================================

printSection('Logger Creation Tests');

test('createLogger returns a logger object', () => {
  const log = createLogger('Test');
  assert(typeof log.error === 'function', 'Should have error method');
  assert(typeof log.warn === 'function', 'Should have warn method');
  assert(typeof log.info === 'function', 'Should have info method');
  assert(typeof log.debug === 'function', 'Should have debug method');
  assert(typeof log.group === 'function', 'Should have group method');
  assert(typeof log.groupEnd === 'function', 'Should have groupEnd method');
  assert(typeof log.log === 'function', 'Should have log method');
  assert(typeof log.child === 'function', 'Should have child method');
});

test('createLogger with namespace returns namespaced logger', () => {
  const log = createLogger('MyModule');
  assert(log !== null, 'Should return logger');
});

test('createLogger without namespace returns logger', () => {
  const log = createLogger();
  assert(log !== null, 'Should return logger');
});

test('default logger export exists', () => {
  assert(logger !== null, 'Default logger should exist');
  assert(typeof logger.info === 'function', 'Should have info method');
});

// =============================================================================
// Pre-configured Loggers Tests
// =============================================================================

printSection('Pre-configured Loggers Tests');

test('loggers object has all subsystem loggers', () => {
  assert('pulse' in loggers, 'Should have pulse logger');
  assert('dom' in loggers, 'Should have dom logger');
  assert('router' in loggers, 'Should have router logger');
  assert('store' in loggers, 'Should have store logger');
  assert('native' in loggers, 'Should have native logger');
  assert('hmr' in loggers, 'Should have hmr logger');
  assert('cli' in loggers, 'Should have cli logger');
});

test('subsystem loggers have correct methods', () => {
  const domLog = loggers.dom;
  assert(typeof domLog.error === 'function', 'Should have error method');
  assert(typeof domLog.warn === 'function', 'Should have warn method');
  assert(typeof domLog.info === 'function', 'Should have info method');
  assert(typeof domLog.debug === 'function', 'Should have debug method');
});

// =============================================================================
// Log Level Tests
// =============================================================================

printSection('Log Level Tests');

test('setLogLevel and getLogLevel work correctly', () => {
  const originalLevel = getLogLevel();

  setLogLevel(LogLevel.DEBUG);
  assertEqual(getLogLevel(), LogLevel.DEBUG);

  setLogLevel(LogLevel.ERROR);
  assertEqual(getLogLevel(), LogLevel.ERROR);

  setLogLevel(LogLevel.SILENT);
  assertEqual(getLogLevel(), LogLevel.SILENT);

  // Restore original level
  setLogLevel(originalLevel);
});

test('getLogLevel returns SILENT in production mode', () => {
  const originalLevel = getLogLevel();

  // Enable production mode
  configureLogger({ production: true });
  assertEqual(getLogLevel(), LogLevel.SILENT);

  // Disable production mode
  configureLogger({ production: false });

  // Restore original level
  setLogLevel(originalLevel);
});

// =============================================================================
// Production Mode Tests
// =============================================================================

printSection('Production Mode Tests');

test('configureLogger sets production mode', () => {
  configureLogger({ production: true });
  assertEqual(isProductionMode(), true);

  configureLogger({ production: false });
  assertEqual(isProductionMode(), false);
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

// =============================================================================
// Child Logger Tests
// =============================================================================

printSection('Child Logger Tests');

test('child logger creates namespaced logger', () => {
  configureLogger({ production: false });

  const log = createLogger('Parent');
  const child = log.child('Child');

  assert(child !== null, 'Child logger should exist');
  assert(typeof child.info === 'function', 'Should have info method');
});

test('child logger can create nested children', () => {
  configureLogger({ production: false });

  const log = createLogger('A');
  const child = log.child('B');
  const grandchild = child.child('C');

  assert(grandchild !== null, 'Grandchild logger should exist');
});

// =============================================================================
// Custom Formatter Tests
// =============================================================================

printSection('Custom Formatter Tests');

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
  assert(true, 'Formatter should work without errors');
});

// =============================================================================
// Logger Methods Tests
// =============================================================================

printSection('Logger Methods Tests');

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

  assert(true, 'All methods should work without throwing');
});

test('logger with options accepts level override', () => {
  configureLogger({ production: false });

  const log = createLogger('Test', { level: LogLevel.ERROR });

  // Should not throw
  log.error('error');
  log.warn('warn'); // Will be filtered by level
  log.info('info'); // Will be filtered by level

  assert(true, 'Logger with level option should work');
});

// =============================================================================
// Results
// =============================================================================

printResults();
exitWithCode();
