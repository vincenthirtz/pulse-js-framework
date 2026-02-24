/**
 * Tests for CLI Help System
 * @module test/cli-help
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { runHelp, getAvailableCommands, getCommandDefinition } from '../cli/help.js';

describe('CLI Help System', () => {
  describe('getAvailableCommands', () => {
    test('returns an array', () => {
      const commands = getAvailableCommands();
      assert.ok(Array.isArray(commands));
    });

    test('returns non-empty array', () => {
      const commands = getAvailableCommands();
      assert.ok(commands.length > 0, 'Should have at least 1 command');
    });

    test('includes core commands', () => {
      const commands = getAvailableCommands();
      const expected = ['create', 'init', 'dev', 'build', 'test', 'lint', 'format'];
      for (const cmd of expected) {
        assert.ok(commands.includes(cmd), `Should include '${cmd}'`);
      }
    });

    test('includes help command', () => {
      const commands = getAvailableCommands();
      assert.ok(commands.includes('help'));
    });

    test('all entries are strings', () => {
      const commands = getAvailableCommands();
      for (const cmd of commands) {
        assert.strictEqual(typeof cmd, 'string');
      }
    });
  });

  describe('getCommandDefinition', () => {
    test('returns definition for known command', () => {
      const def = getCommandDefinition('create');
      assert.ok(def);
      assert.strictEqual(def.name, 'create');
    });

    test('definition has required fields', () => {
      const def = getCommandDefinition('create');
      assert.strictEqual(typeof def.name, 'string');
      assert.strictEqual(typeof def.summary, 'string');
      assert.strictEqual(typeof def.usage, 'string');
    });

    test('create command has arguments', () => {
      const def = getCommandDefinition('create');
      assert.ok(Array.isArray(def.arguments));
      assert.ok(def.arguments.length > 0);
    });

    test('create command has options', () => {
      const def = getCommandDefinition('create');
      assert.ok(Array.isArray(def.options));
      assert.ok(def.options.length > 0);
    });

    test('create command has examples', () => {
      const def = getCommandDefinition('create');
      assert.ok(Array.isArray(def.examples));
      assert.ok(def.examples.length > 0);
    });

    test('returns undefined for unknown command', () => {
      const def = getCommandDefinition('nonexistent-command');
      assert.strictEqual(def, undefined);
    });

    test('each example has cmd and desc', () => {
      const def = getCommandDefinition('create');
      for (const example of def.examples) {
        assert.strictEqual(typeof example.cmd, 'string');
        assert.strictEqual(typeof example.desc, 'string');
      }
    });

    test('dev command exists', () => {
      const def = getCommandDefinition('dev');
      assert.ok(def);
      assert.strictEqual(def.name, 'dev');
    });

    test('build command exists', () => {
      const def = getCommandDefinition('build');
      assert.ok(def);
      assert.strictEqual(def.name, 'build');
    });

    test('lint command exists', () => {
      const def = getCommandDefinition('lint');
      assert.ok(def);
    });

    test('format command exists', () => {
      const def = getCommandDefinition('format');
      assert.ok(def);
    });

    test('test command exists', () => {
      const def = getCommandDefinition('test');
      assert.ok(def);
    });

    test('scaffold command exists', () => {
      const def = getCommandDefinition('scaffold');
      assert.ok(def);
    });

    test('all commands have name and summary', () => {
      const commands = getAvailableCommands();
      for (const cmd of commands) {
        const def = getCommandDefinition(cmd);
        assert.ok(def, `Definition missing for ${cmd}`);
        assert.strictEqual(typeof def.name, 'string', `${cmd} missing name`);
        assert.strictEqual(typeof def.summary, 'string', `${cmd} missing summary`);
      }
    });
  });

  describe('runHelp', () => {
    test('does not throw with no args', () => {
      assert.doesNotThrow(() => runHelp([]));
    });

    test('does not throw with known command', () => {
      assert.doesNotThrow(() => runHelp(['create']));
    });

    test('does not throw with unknown command', () => {
      assert.doesNotThrow(() => runHelp(['nonexistent']));
    });

    test('does not throw with each available command', () => {
      const commands = getAvailableCommands();
      for (const cmd of commands) {
        assert.doesNotThrow(() => runHelp([cmd]), `runHelp should not throw for '${cmd}'`);
      }
    });
  });
});
