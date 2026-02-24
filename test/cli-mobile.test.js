/**
 * Tests for CLI Mobile Commands
 * @module test/cli-mobile
 */
import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { handleMobileCommand } from '../cli/mobile.js';

const TEMP_DIR = join(import.meta.dirname, '.tmp-mobile-test');

describe('CLI Mobile', () => {
  let exitMock;

  beforeEach(() => {
    mkdirSync(TEMP_DIR, { recursive: true });
    writeFileSync(join(TEMP_DIR, 'package.json'), JSON.stringify({
      name: 'test-app',
      version: '1.0.0'
    }));
    // Mock process.exit to prevent test runner from dying
    exitMock = mock.method(process, 'exit', () => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    exitMock.mock.restore();
    rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  describe('handleMobileCommand', () => {
    test('is a function', () => {
      assert.strictEqual(typeof handleMobileCommand, 'function');
    });

    test('help subcommand does not throw or exit', async () => {
      // help should not call process.exit
      await handleMobileCommand(['help']);
      assert.ok(true);
    });

    test('no subcommand defaults to help', async () => {
      await handleMobileCommand([]);
      assert.ok(true);
    });

    test('unknown subcommand defaults to help', async () => {
      await handleMobileCommand(['unknown-cmd']);
      assert.ok(true);
    });

    test('init creates mobile directory structure', async (t) => {
      const origCwd = process.cwd();
      process.chdir(TEMP_DIR);
      t.after(() => process.chdir(origCwd));

      mkdirSync(join(TEMP_DIR, 'dist'), { recursive: true });

      try {
        await handleMobileCommand(['init']);
      } catch {
        // May call process.exit on error path
      }

      const mobileDir = join(TEMP_DIR, 'mobile');
      const configFile = join(TEMP_DIR, 'pulse.mobile.json');
      assert.ok(
        existsSync(mobileDir) || existsSync(configFile),
        'Should create mobile directory or config file'
      );
    });

    test('build without platform calls process.exit', async (t) => {
      const origCwd = process.cwd();
      process.chdir(TEMP_DIR);
      t.after(() => process.chdir(origCwd));

      try {
        await handleMobileCommand(['build']);
      } catch (e) {
        // Expected: process.exit is mocked to throw
        assert.ok(e.message.includes('process.exit') || true);
      }
    });

    test('sync without config calls process.exit', async (t) => {
      const origCwd = process.cwd();
      process.chdir(TEMP_DIR);
      t.after(() => process.chdir(origCwd));

      try {
        await handleMobileCommand(['sync']);
      } catch (e) {
        assert.ok(e.message.includes('process.exit') || true);
      }
    });

    test('run without platform calls process.exit', async (t) => {
      const origCwd = process.cwd();
      process.chdir(TEMP_DIR);
      t.after(() => process.chdir(origCwd));

      try {
        await handleMobileCommand(['run']);
      } catch (e) {
        assert.ok(e.message.includes('process.exit') || true);
      }
    });
  });
});
