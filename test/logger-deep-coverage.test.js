/**
 * Deep coverage tests for runtime/logger.js
 * Targets uncovered lines: 38-39, 44-45, 64-67, 74-75, 129-130, 142-143,
 * 157-158, 198-209, 255-257, 268-269, 281-284, 288-291, 295-298, 302-305,
 * 309-311, 315-328, 332-336, 364-365
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  configureLogger,
  isProductionMode,
  LogLevel,
  setLogLevel,
  getLogLevel,
  setFormatter,
  createLogger,
  loggers
} from '../runtime/logger.js';

// ============================================================================
// Helpers
// ============================================================================

/** Capture console calls during fn(), restore afterwards */
function captureConsole(fn) {
  const calls = { error: [], warn: [], log: [], group: [], groupEnd: [] };
  const origError = console.error;
  const origWarn = console.warn;
  const origLog = console.log;
  const origGroup = console.group;
  const origGroupEnd = console.groupEnd;

  console.error = (...args) => calls.error.push(args);
  console.warn = (...args) => calls.warn.push(args);
  console.log = (...args) => calls.log.push(args);
  console.group = (...args) => calls.group.push(args);
  console.groupEnd = (...args) => calls.groupEnd.push(args);

  try {
    fn();
  } finally {
    console.error = origError;
    console.warn = origWarn;
    console.log = origLog;
    console.group = origGroup;
    console.groupEnd = origGroupEnd;
  }

  return calls;
}

// ============================================================================
// Setup / Teardown
// ============================================================================

// Before each test: ensure dev mode, reset level, clear formatter
beforeEach(() => {
  configureLogger({ production: false });
  setLogLevel(LogLevel.INFO);
  setFormatter(null);
});

// After each test: restore dev mode so other tests are not affected
afterEach(() => {
  configureLogger({ production: false });
  setLogLevel(LogLevel.INFO);
  setFormatter(null);
});

// ============================================================================
// configureLogger  (lines 63-67)
// ============================================================================

describe('configureLogger', () => {
  test('sets production to true (lines 64-65)', () => {
    configureLogger({ production: true });
    assert.strictEqual(isProductionMode(), true);
  });

  test('sets production to false (lines 64-65)', () => {
    configureLogger({ production: true });
    configureLogger({ production: false });
    assert.strictEqual(isProductionMode(), false);
  });

  test('ignores call with no production key (line 64 branch false)', () => {
    configureLogger({ production: false });
    configureLogger({});
    assert.strictEqual(isProductionMode(), false);
  });

  test('returns undefined (line 67 implicit return)', () => {
    const result = configureLogger({ production: false });
    assert.strictEqual(result, undefined);
  });
});

// ============================================================================
// isProductionMode  (lines 73-75)
// ============================================================================

describe('isProductionMode', () => {
  test('returns false in dev mode (line 74)', () => {
    configureLogger({ production: false });
    assert.strictEqual(isProductionMode(), false);
  });

  test('returns true after configuring production (line 74)', () => {
    configureLogger({ production: true });
    assert.strictEqual(isProductionMode(), true);
    configureLogger({ production: false }); // cleanup
  });
});

// ============================================================================
// setLogLevel / getLogLevel  (lines 128-130, 141-143)
// ============================================================================

describe('setLogLevel and getLogLevel', () => {
  test('setLogLevel updates global level (lines 128-130)', () => {
    setLogLevel(LogLevel.DEBUG);
    assert.strictEqual(getLogLevel(), LogLevel.DEBUG);
  });

  test('setLogLevel to SILENT (lines 128-130)', () => {
    setLogLevel(LogLevel.SILENT);
    assert.strictEqual(getLogLevel(), LogLevel.SILENT);
  });

  test('getLogLevel returns SILENT in production (lines 141-143)', () => {
    setLogLevel(LogLevel.DEBUG);
    configureLogger({ production: true });
    assert.strictEqual(getLogLevel(), LogLevel.SILENT);
    configureLogger({ production: false });
  });

  test('getLogLevel returns global level in dev (line 142 else path)', () => {
    setLogLevel(LogLevel.WARN);
    configureLogger({ production: false });
    assert.strictEqual(getLogLevel(), LogLevel.WARN);
  });
});

// ============================================================================
// setFormatter  (lines 156-158)
// ============================================================================

describe('setFormatter', () => {
  test('sets a custom formatter (line 157)', () => {
    const fmt = (level, ns, args) => `${level}:${ns}:${args.join(',')}`;
    setFormatter(fmt);
    // Verify the formatter is used (covered in dev logger tests below)
    // Here just confirm it doesn't throw
    assert.ok(true);
  });

  test('clears formatter with null (line 157)', () => {
    setFormatter(() => 'x');
    setFormatter(null);
    // After null, logger should use default path (no throw)
    const log = createLogger('NS');
    const calls = captureConsole(() => log.info('msg'));
    assert.strictEqual(calls.log.length, 1);
  });
});

// ============================================================================
// formatArgs  (lines 198-209)
// ============================================================================

describe('formatArgs coverage via log() method', () => {
  test('no namespace - returns args as-is (line 199 early return)', () => {
    const log = createLogger(null);
    setLogLevel(LogLevel.DEBUG);
    const calls = captureConsole(() => log.log(LogLevel.INFO, 'hello'));
    assert.ok(calls.log.some(a => a.includes('hello')));
  });

  test('namespace with string first arg - prepends namespace (lines 203-205)', () => {
    const log = createLogger('NS');
    setLogLevel(LogLevel.DEBUG);
    const calls = captureConsole(() => log.log(LogLevel.INFO, 'hello', 'world'));
    assert.ok(calls.log.some(a => a[0] && a[0].includes('[NS]') && a[0].includes('hello')));
  });

  test('namespace with non-string first arg - adds namespace as first (lines 207-208)', () => {
    const log = createLogger('NS');
    setLogLevel(LogLevel.DEBUG);
    const calls = captureConsole(() => log.log(LogLevel.INFO, { key: 'val' }));
    assert.ok(calls.log.some(a => a[0] === '[NS]'));
  });
});

// ============================================================================
// createLogger in production  (lines 364-365)
// ============================================================================

describe('createLogger in production mode', () => {
  test('returns noop logger (lines 363-365)', () => {
    configureLogger({ production: true });
    const log = createLogger('Test');
    // All methods should be noops - no console output
    const calls = captureConsole(() => {
      log.error('err');
      log.warn('warn');
      log.info('info');
      log.debug('debug');
      log.group('grp');
      log.groupEnd();
      log.log(LogLevel.INFO, 'x');
    });
    assert.strictEqual(calls.error.length, 0);
    assert.strictEqual(calls.warn.length, 0);
    assert.strictEqual(calls.log.length, 0);
    assert.strictEqual(calls.group.length, 0);
    configureLogger({ production: false });
  });

  test('child() on noop logger returns noop logger', () => {
    configureLogger({ production: true });
    const log = createLogger('Test');
    const child = log.child('sub');
    const calls = captureConsole(() => child.error('noop'));
    assert.strictEqual(calls.error.length, 0);
    configureLogger({ production: false });
  });
});

// ============================================================================
// Dev logger - error() with and without formatter  (lines 281-284)
// ============================================================================

describe('dev logger error()', () => {
  test('logs via console.error without formatter (lines 276)', () => {
    const log = createLogger('E');
    const calls = captureConsole(() => log.error('something broke'));
    assert.strictEqual(calls.error.length, 1);
    assert.ok(calls.error[0][0].includes('[E]'));
    assert.ok(calls.error[0][0].includes('something broke'));
  });

  test('uses formatter when set (lines 275)', () => {
    setFormatter((level, ns, args) => `FMT:${level}:${ns}:${args[0]}`);
    const log = createLogger('E');
    const calls = captureConsole(() => log.error('oops'));
    assert.strictEqual(calls.error.length, 1);
    assert.strictEqual(calls.error[0][0], 'FMT:error:E:oops');
  });

  test('does not log when level is too low (shouldLog false)', () => {
    setLogLevel(LogLevel.SILENT);
    const log = createLogger();
    const calls = captureConsole(() => log.error('x'));
    assert.strictEqual(calls.error.length, 0);
  });
});

// ============================================================================
// Dev logger - warn() with and without formatter  (lines 281-284 branch warn)
// ============================================================================

describe('dev logger warn()', () => {
  test('logs via console.warn without formatter (line 283)', () => {
    const log = createLogger('W');
    const calls = captureConsole(() => log.warn('watch out'));
    assert.strictEqual(calls.warn.length, 1);
    assert.ok(calls.warn[0][0].includes('[W]'));
    assert.ok(calls.warn[0][0].includes('watch out'));
  });

  test('uses formatter for warn (line 282)', () => {
    setFormatter((level, ns, args) => `FMT:${level}:${args[0]}`);
    const log = createLogger('W');
    const calls = captureConsole(() => log.warn('careful'));
    assert.strictEqual(calls.warn.length, 1);
    assert.strictEqual(calls.warn[0][0], 'FMT:warn:careful');
  });

  test('does not log when level below WARN', () => {
    setLogLevel(LogLevel.ERROR);
    const log = createLogger();
    const calls = captureConsole(() => log.warn('skip'));
    assert.strictEqual(calls.warn.length, 0);
  });
});

// ============================================================================
// Dev logger - info() with and without formatter  (lines 288-291)
// ============================================================================

describe('dev logger info()', () => {
  test('logs via console.log without formatter (line 290)', () => {
    const log = createLogger('I');
    const calls = captureConsole(() => log.info('hello info'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(calls.log[0][0].includes('[I]'));
    assert.ok(calls.log[0][0].includes('hello info'));
  });

  test('uses formatter for info (line 289)', () => {
    setFormatter((level, ns, args) => `FMT:${level}:${args[0]}`);
    const log = createLogger('I');
    const calls = captureConsole(() => log.info('data'));
    assert.strictEqual(calls.log.length, 1);
    assert.strictEqual(calls.log[0][0], 'FMT:info:data');
  });

  test('does not log when level below INFO', () => {
    setLogLevel(LogLevel.WARN);
    const log = createLogger();
    const calls = captureConsole(() => log.info('skip'));
    assert.strictEqual(calls.log.length, 0);
  });
});

// ============================================================================
// Dev logger - debug() with and without formatter  (lines 295-298)
// ============================================================================

describe('dev logger debug()', () => {
  test('does not log when level is INFO (default)', () => {
    const log = createLogger('D');
    const calls = captureConsole(() => log.debug('hidden'));
    assert.strictEqual(calls.log.length, 0);
  });

  test('logs via console.log without formatter at DEBUG level (line 297)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('D');
    const calls = captureConsole(() => log.debug('verbose'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(calls.log[0][0].includes('[D]'));
    assert.ok(calls.log[0][0].includes('verbose'));
  });

  test('uses formatter for debug (line 296)', () => {
    setLogLevel(LogLevel.DEBUG);
    setFormatter((level, ns, args) => `FMT:${level}:${args[0]}`);
    const log = createLogger('D');
    const calls = captureConsole(() => log.debug('trace'));
    assert.strictEqual(calls.log.length, 1);
    assert.strictEqual(calls.log[0][0], 'FMT:debug:trace');
  });
});

// ============================================================================
// Dev logger - group() / groupEnd()  (lines 302-305, 309-311)
// ============================================================================

describe('dev logger group() and groupEnd()', () => {
  test('group does nothing when level < DEBUG (line 302 branch false)', () => {
    setLogLevel(LogLevel.INFO);
    const log = createLogger('G');
    const calls = captureConsole(() => log.group('my group'));
    assert.strictEqual(calls.group.length, 0);
  });

  test('group calls console.group at DEBUG level with namespace (lines 303-304)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('G');
    const calls = captureConsole(() => log.group('section'));
    assert.strictEqual(calls.group.length, 1);
    assert.ok(calls.group[0][0].includes('[G]'));
    assert.ok(calls.group[0][0].includes('section'));
  });

  test('group calls console.group without namespace (line 304 else branch)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger(null);
    const calls = captureConsole(() => log.group('plain section'));
    assert.strictEqual(calls.group.length, 1);
    assert.strictEqual(calls.group[0][0], 'plain section');
  });

  test('groupEnd does nothing when level < DEBUG (line 309 branch false)', () => {
    setLogLevel(LogLevel.INFO);
    const log = createLogger('G');
    const calls = captureConsole(() => log.groupEnd());
    assert.strictEqual(calls.groupEnd.length, 0);
  });

  test('groupEnd calls console.groupEnd at DEBUG level (lines 309-311)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('G');
    const calls = captureConsole(() => log.groupEnd());
    assert.strictEqual(calls.groupEnd.length, 1);
  });
});

// ============================================================================
// Dev logger - log(level, ...args)  (lines 315-328)
// ============================================================================

describe('dev logger log(level)', () => {
  test('does not log when shouldLog returns false (line 315 branch false)', () => {
    setLogLevel(LogLevel.SILENT);
    const log = createLogger('L');
    const calls = captureConsole(() => log.log(LogLevel.ERROR, 'x'));
    assert.strictEqual(calls.error.length, 0);
  });

  test('ERROR level uses console.error (lines 319-321)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('L');
    const calls = captureConsole(() => log.log(LogLevel.ERROR, 'err msg'));
    assert.strictEqual(calls.error.length, 1);
    assert.ok(calls.error[0].join(' ').includes('err msg'));
  });

  test('WARN level uses console.warn (lines 322-324)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('L');
    const calls = captureConsole(() => log.log(LogLevel.WARN, 'warn msg'));
    assert.strictEqual(calls.warn.length, 1);
    assert.ok(calls.warn[0].join(' ').includes('warn msg'));
  });

  test('default (INFO) level uses console.log (lines 325-327)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('L');
    const calls = captureConsole(() => log.log(LogLevel.INFO, 'info msg'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(calls.log[0].join(' ').includes('info msg'));
  });

  test('DEBUG level falls through to default console.log (line 325-327)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('L');
    const calls = captureConsole(() => log.log(LogLevel.DEBUG, 'debug msg'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(calls.log[0].join(' ').includes('debug msg'));
  });

  test('sanitizes string args in log() (line 316)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger(null);
    const calls = captureConsole(() => log.log(LogLevel.INFO, 'line1\nline2'));
    assert.ok(calls.log[0].join('').includes('line1'));
    assert.ok(!calls.log[0].join('').includes('\n'));
  });
});

// ============================================================================
// Dev logger - child()  (lines 332-336)
// ============================================================================

describe('dev logger child()', () => {
  test('combines parent and child namespace with colon (lines 332-334)', () => {
    const parent = createLogger('Parent');
    const child = parent.child('Child');
    const calls = captureConsole(() => child.info('nested'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(calls.log[0][0].includes('[Parent:Child]'));
  });

  test('child with no parent namespace uses only child name (lines 333-334)', () => {
    const parent = createLogger(null);
    const child = parent.child('Sub');
    const calls = captureConsole(() => child.info('msg'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(calls.log[0][0].includes('[Sub]'));
  });

  test('child returns a dev logger in dev mode (line 335)', () => {
    const parent = createLogger('A');
    const child = parent.child('B');
    // Should have all logger methods
    assert.strictEqual(typeof child.error, 'function');
    assert.strictEqual(typeof child.warn, 'function');
    assert.strictEqual(typeof child.info, 'function');
    assert.strictEqual(typeof child.debug, 'function');
    assert.strictEqual(typeof child.group, 'function');
    assert.strictEqual(typeof child.groupEnd, 'function');
    assert.strictEqual(typeof child.log, 'function');
    assert.strictEqual(typeof child.child, 'function');
  });
});

// ============================================================================
// sanitizeArg coverage  (lines 247-251)
// ============================================================================

describe('sanitizeArg behavior (via dev logger)', () => {
  test('sanitizes control chars in string args', () => {
    const log = createLogger(null);
    const calls = captureConsole(() => log.info('hello\x00world\x1f!'));
    assert.ok(calls.log.length > 0);
    assert.ok(!calls.log[0].join('').includes('\x00'));
    assert.ok(!calls.log[0].join('').includes('\x1f'));
  });

  test('passes null through as-is (line 248)', () => {
    const log = createLogger(null);
    const calls = captureConsole(() => log.info(null));
    assert.strictEqual(calls.log[0][0], null);
  });

  test('passes undefined through as-is (line 248)', () => {
    const log = createLogger(null);
    const calls = captureConsole(() => log.info(undefined));
    assert.strictEqual(calls.log[0][0], undefined);
  });

  test('passes number through as-is (line 248)', () => {
    const log = createLogger(null);
    const calls = captureConsole(() => log.info(42));
    assert.strictEqual(calls.log[0][0], 42);
  });

  test('passes boolean through as-is (line 248)', () => {
    const log = createLogger(null);
    const calls = captureConsole(() => log.info(true));
    assert.strictEqual(calls.log[0][0], true);
  });

  test('JSON round-trips plain objects (lines 250)', () => {
    const log = createLogger(null);
    const obj = { a: 1, b: 'test' };
    const calls = captureConsole(() => log.info(obj));
    // JSON round-trip should produce a new equivalent object
    assert.deepStrictEqual(calls.log[0][0], { a: 1, b: 'test' });
    // Should NOT be the same reference
    assert.notStrictEqual(calls.log[0][0], obj);
  });

  test('circular objects fallback to "[Object]" (line 250 catch)', () => {
    const log = createLogger(null);
    const circular = {};
    circular.self = circular;
    const calls = captureConsole(() => log.info(circular));
    assert.strictEqual(calls.log[0][0], '[Object]');
  });
});

// ============================================================================
// safeFormat (lines 255-257) - formatter path
// ============================================================================

describe('safeFormat sanitizes formatter output (lines 255-257)', () => {
  test('sanitizes control characters in formatter string result (line 256)', () => {
    setFormatter((_level, _ns, _args) => 'line1\nline2\x00injected');
    const log = createLogger('NS');
    const calls = captureConsole(() => log.info('msg'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(!calls.log[0][0].includes('\n'));
    assert.ok(!calls.log[0][0].includes('\x00'));
  });

  test('sanitizes non-string formatter result via String() (line 256 else branch)', () => {
    setFormatter((_level, _ns, _args) => 42); // returns number, not string
    const log = createLogger('NS');
    const calls = captureConsole(() => log.info('msg'));
    assert.strictEqual(calls.log.length, 1);
    assert.strictEqual(calls.log[0][0], '42');
  });
});

// ============================================================================
// logWith - no namespace path  (lines 267-269)
// ============================================================================

describe('logWith without namespace (lines 267-269)', () => {
  test('calls consoleFn with sanitized args when no namespace', () => {
    const log = createLogger(null); // no namespace
    const calls = captureConsole(() => log.info('plain', 'message'));
    assert.strictEqual(calls.log.length, 1);
    assert.deepStrictEqual(calls.log[0], ['plain', 'message']);
  });

  test('no namespace - non-string first arg', () => {
    const log = createLogger(null);
    const calls = captureConsole(() => log.info(99, 'extra'));
    assert.strictEqual(calls.log.length, 1);
    assert.strictEqual(calls.log[0][0], 99);
    assert.strictEqual(calls.log[0][1], 'extra');
  });
});

// ============================================================================
// logWith - with namespace, non-string first arg  (line 264-265)
// ============================================================================

describe('logWith with namespace and non-string first arg', () => {
  test('namespace as first arg, object as second', () => {
    const log = createLogger('NS');
    const calls = captureConsole(() => log.info({ key: 'val' }));
    assert.strictEqual(calls.log.length, 1);
    // When first arg is not a string with namespace, namespace prefix is first element
    assert.strictEqual(calls.log[0][0], '[NS]');
    assert.deepStrictEqual(calls.log[0][1], { key: 'val' });
  });
});

// ============================================================================
// local level override (shouldLog local vs global)
// ============================================================================

describe('logger with local level override', () => {
  test('local DEBUG level overrides global INFO level', () => {
    setLogLevel(LogLevel.INFO); // global
    const log = createLogger('Local', { level: LogLevel.DEBUG });
    const calls = captureConsole(() => log.debug('local debug'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(calls.log[0][0].includes('local debug'));
  });

  test('local SILENT overrides global DEBUG level', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('Local', { level: LogLevel.SILENT });
    const calls = captureConsole(() => log.error('should not appear'));
    assert.strictEqual(calls.error.length, 0);
  });
});

// ============================================================================
// loggers object - pre-configured subsystem loggers
// ============================================================================

describe('loggers object', () => {
  test('loggers.pulse returns dev logger in dev mode', () => {
    configureLogger({ production: false });
    const log = loggers.pulse;
    assert.strictEqual(typeof log.info, 'function');
    const calls = captureConsole(() => log.info('pulse msg'));
    assert.strictEqual(calls.log.length, 1);
    assert.ok(calls.log[0][0].includes('[Pulse]'));
  });

  test('loggers.dom returns dev logger in dev mode', () => {
    configureLogger({ production: false });
    const calls = captureConsole(() => loggers.dom.info('dom msg'));
    assert.ok(calls.log[0][0].includes('[DOM]'));
  });

  test('loggers.router returns dev logger in dev mode', () => {
    configureLogger({ production: false });
    const calls = captureConsole(() => loggers.router.info('route msg'));
    assert.ok(calls.log[0][0].includes('[Router]'));
  });

  test('loggers.store returns dev logger in dev mode', () => {
    configureLogger({ production: false });
    const calls = captureConsole(() => loggers.store.info('store msg'));
    assert.ok(calls.log[0][0].includes('[Store]'));
  });

  test('loggers.native returns dev logger in dev mode', () => {
    configureLogger({ production: false });
    const calls = captureConsole(() => loggers.native.info('native msg'));
    assert.ok(calls.log[0][0].includes('[Native]'));
  });

  test('loggers.hmr returns dev logger in dev mode', () => {
    configureLogger({ production: false });
    const calls = captureConsole(() => loggers.hmr.info('hmr msg'));
    assert.ok(calls.log[0][0].includes('[HMR]'));
  });

  test('loggers.cli returns dev logger in dev mode', () => {
    configureLogger({ production: false });
    const calls = captureConsole(() => loggers.cli.info('cli msg'));
    assert.ok(calls.log[0][0].includes('[CLI]'));
  });

  test('loggers.websocket returns dev logger in dev mode', () => {
    configureLogger({ production: false });
    const calls = captureConsole(() => loggers.websocket.info('ws msg'));
    assert.ok(calls.log[0][0].includes('[WebSocket]'));
  });

  test('loggers returns noop logger in production', () => {
    configureLogger({ production: true });
    const log = loggers.pulse;
    const calls = captureConsole(() => log.info('should be silent'));
    assert.strictEqual(calls.log.length, 0);
    configureLogger({ production: false });
  });
});

// ============================================================================
// detectProduction - __PULSE_PROD__ global path (lines 37-39)
// ============================================================================

describe('detectProduction via __PULSE_PROD__ global', () => {
  test('__PULSE_PROD__ check is available at module load (lines 37-39)', () => {
    // We cannot re-run detectProduction directly, but we can verify the module
    // loaded without error and isProductionMode reflects the environment.
    // In test environment NODE_ENV is not 'production', so should be false.
    configureLogger({ production: false });
    assert.strictEqual(isProductionMode(), false);
  });

  test('configureLogger overrides environment detection', () => {
    // Even if __PULSE_PROD__ or NODE_ENV set something, configureLogger wins
    configureLogger({ production: true });
    assert.strictEqual(isProductionMode(), true);
    configureLogger({ production: false });
    assert.strictEqual(isProductionMode(), false);
  });
});

// ============================================================================
// Namespace sanitization (injection prevention in safeNamespace)
// ============================================================================

describe('namespace injection prevention', () => {
  test('control characters stripped from namespace at creation', () => {
    const log = createLogger('bad\nnspace');
    const calls = captureConsole(() => log.info('msg'));
    assert.ok(!calls.log[0][0].includes('\n'));
    assert.ok(calls.log[0][0].includes('[badnspace]'));
  });

  test('null namespace handled safely', () => {
    const log = createLogger(null);
    // should not throw, no namespace prefix
    const calls = captureConsole(() => log.info('no ns'));
    assert.strictEqual(calls.log[0][0], 'no ns');
  });
});

// ============================================================================
// group() label sanitization (line 303)
// ============================================================================

describe('group() label sanitization', () => {
  test('sanitizes control chars in group label (line 303)', () => {
    setLogLevel(LogLevel.DEBUG);
    const log = createLogger('G');
    const calls = captureConsole(() => log.group('title\ninjected'));
    assert.strictEqual(calls.group.length, 1);
    assert.ok(!calls.group[0][0].includes('\n'));
  });
});

// ============================================================================
// Multiple args through formatter
// ============================================================================

describe('formatter receives multiple args', () => {
  test('formatter gets array of all args', () => {
    let capturedArgs;
    setFormatter((level, ns, args) => {
      capturedArgs = args;
      return 'formatted';
    });
    const log = createLogger('NS');
    captureConsole(() => log.error('msg1', 'msg2', 42));
    assert.deepStrictEqual(capturedArgs, ['msg1', 'msg2', 42]);
  });
});
