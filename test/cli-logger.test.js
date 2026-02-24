/**
 * Tests for CLI Logger
 * @module test/cli-logger
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { log, setVerbose, isVerbose, LogLevel } from '../cli/logger.js';
import { setLogLevel } from '../runtime/logger.js';

describe('CLI Logger', () => {
  afterEach(() => {
    setVerbose(false);
    setLogLevel(LogLevel.INFO);
  });

  describe('setVerbose / isVerbose', () => {
    test('verbose is false by default', () => {
      setVerbose(false); // reset
      assert.strictEqual(isVerbose(), false);
    });

    test('setVerbose(true) enables verbose mode', () => {
      setVerbose(true);
      assert.strictEqual(isVerbose(), true);
    });

    test('setVerbose(false) disables verbose mode', () => {
      setVerbose(true);
      setVerbose(false);
      assert.strictEqual(isVerbose(), false);
    });
  });

  describe('log namespace', () => {
    test('log.info is a function', () => {
      assert.strictEqual(typeof log.info, 'function');
    });

    test('log.success is a function', () => {
      assert.strictEqual(typeof log.success, 'function');
    });

    test('log.warn is a function', () => {
      assert.strictEqual(typeof log.warn, 'function');
    });

    test('log.error is a function', () => {
      assert.strictEqual(typeof log.error, 'function');
    });

    test('log.debug is a function', () => {
      assert.strictEqual(typeof log.debug, 'function');
    });

    test('log.verbose is a function', () => {
      assert.strictEqual(typeof log.verbose, 'function');
    });

    test('log.newline is a function', () => {
      assert.strictEqual(typeof log.newline, 'function');
    });

    test('log.child is a function', () => {
      assert.strictEqual(typeof log.child, 'function');
    });
  });

  describe('log.child', () => {
    test('returns a logger object', () => {
      const child = log.child('Build');
      assert.ok(child);
      assert.strictEqual(typeof child.info, 'function');
      assert.strictEqual(typeof child.warn, 'function');
      assert.strictEqual(typeof child.error, 'function');
    });
  });

  describe('verbose-dependent methods', () => {
    test('log.debug does not throw when verbose is off', () => {
      setVerbose(false);
      assert.doesNotThrow(() => log.debug('test message'));
    });

    test('log.debug does not throw when verbose is on', () => {
      setVerbose(true);
      assert.doesNotThrow(() => log.debug('test message'));
    });

    test('log.verbose does not throw when verbose is off', () => {
      setVerbose(false);
      assert.doesNotThrow(() => log.verbose('test message'));
    });

    test('log.verbose does not throw when verbose is on', () => {
      setVerbose(true);
      assert.doesNotThrow(() => log.verbose('test message'));
    });
  });

  describe('log output methods do not throw', () => {
    test('log.info with multiple args', () => {
      assert.doesNotThrow(() => log.info('msg', 1, { key: 'val' }));
    });

    test('log.success with multiple args', () => {
      assert.doesNotThrow(() => log.success('done', 42));
    });

    test('log.warn with multiple args', () => {
      assert.doesNotThrow(() => log.warn('warning', new Error('test')));
    });

    test('log.error with multiple args', () => {
      assert.doesNotThrow(() => log.error('error', 'details'));
    });

    test('log.newline does not throw', () => {
      assert.doesNotThrow(() => log.newline());
    });
  });

  describe('LogLevel export', () => {
    test('LogLevel is exported', () => {
      assert.ok(LogLevel);
    });

    test('LogLevel has expected values', () => {
      assert.strictEqual(typeof LogLevel.SILENT, 'number');
      assert.strictEqual(typeof LogLevel.ERROR, 'number');
      assert.strictEqual(typeof LogLevel.WARN, 'number');
      assert.strictEqual(typeof LogLevel.INFO, 'number');
      assert.strictEqual(typeof LogLevel.DEBUG, 'number');
    });

    test('LogLevel values are ordered', () => {
      assert.ok(LogLevel.SILENT < LogLevel.ERROR);
      assert.ok(LogLevel.ERROR < LogLevel.WARN);
      assert.ok(LogLevel.WARN < LogLevel.INFO);
      assert.ok(LogLevel.INFO < LogLevel.DEBUG);
    });
  });
});
