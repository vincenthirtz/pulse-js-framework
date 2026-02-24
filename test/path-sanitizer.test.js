/**
 * Tests for Path Sanitizer
 * @module test/path-sanitizer
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolve } from 'path';
import {
  sanitizeImportPath,
  sanitizeImportPaths,
  isPathSafe
} from '../runtime/server-components/utils/path-sanitizer.js';

const BASE = '/project';

describe('sanitizeImportPath', () => {
  test('resolves safe relative path', () => {
    const result = sanitizeImportPath('./components/Button.js', BASE);
    assert.strictEqual(result, resolve(BASE, 'components/Button.js'));
  });

  test('resolves nested safe path', () => {
    const result = sanitizeImportPath('./src/utils/helpers.js', BASE);
    assert.strictEqual(result, resolve(BASE, 'src/utils/helpers.js'));
  });

  test('resolves bare filename', () => {
    const result = sanitizeImportPath('index.js', BASE);
    assert.strictEqual(result, resolve(BASE, 'index.js'));
  });

  test('normalizes redundant slashes', () => {
    const result = sanitizeImportPath('./src///utils//file.js', BASE);
    assert.strictEqual(result, resolve(BASE, 'src/utils/file.js'));
  });

  test('normalizes internal ../ that stays within base', () => {
    const result = sanitizeImportPath('./src/../src/file.js', BASE);
    assert.strictEqual(result, resolve(BASE, 'src/file.js'));
  });

  // Security: traversal attacks
  test('throws on ../ escaping base directory', () => {
    assert.throws(
      () => sanitizeImportPath('../../../etc/passwd', BASE),
      /attempts to escape project directory/
    );
  });

  test('throws on ../../ escape', () => {
    assert.throws(
      () => sanitizeImportPath('../../secret.key', BASE),
      /attempts to escape project directory/
    );
  });

  test('throws on deep traversal', () => {
    assert.throws(
      () => sanitizeImportPath('../../../../root/.ssh/id_rsa', BASE),
      /attempts to escape/
    );
  });

  test('throws on Windows absolute path (C:\\)', () => {
    assert.throws(
      () => sanitizeImportPath('C:\\Windows\\System32\\config', BASE),
      /absolute Windows path/
    );
  });

  test('throws on Windows path lowercase drive', () => {
    assert.throws(
      () => sanitizeImportPath('d:\\Users\\admin\\secrets', BASE),
      /absolute Windows path/
    );
  });

  // Input validation
  test('throws on empty string', () => {
    assert.throws(
      () => sanitizeImportPath('', BASE),
      /path must be a non-empty string/
    );
  });

  test('throws on null path', () => {
    assert.throws(
      () => sanitizeImportPath(null, BASE),
      /path must be a non-empty string/
    );
  });

  test('throws on undefined path', () => {
    assert.throws(
      () => sanitizeImportPath(undefined, BASE),
      /path must be a non-empty string/
    );
  });

  test('throws on empty basePath', () => {
    assert.throws(
      () => sanitizeImportPath('./file.js', ''),
      /basePath must be a non-empty string/
    );
  });

  test('throws on null basePath', () => {
    assert.throws(
      () => sanitizeImportPath('./file.js', null),
      /basePath must be a non-empty string/
    );
  });

  test('throws on numeric path', () => {
    assert.throws(
      () => sanitizeImportPath(123, BASE),
      /path must be a non-empty string/
    );
  });
});

describe('sanitizeImportPaths', () => {
  test('sanitizes array of safe paths', () => {
    const paths = ['./a.js', './b.js', './c.js'];
    const result = sanitizeImportPaths(paths, BASE);
    assert.strictEqual(result.length, 3);
    assert.strictEqual(result[0], resolve(BASE, 'a.js'));
    assert.strictEqual(result[1], resolve(BASE, 'b.js'));
    assert.strictEqual(result[2], resolve(BASE, 'c.js'));
  });

  test('throws on first invalid path in array', () => {
    assert.throws(
      () => sanitizeImportPaths(['./safe.js', '../../../etc/passwd', './ok.js'], BASE),
      /attempts to escape/
    );
  });

  test('throws on non-array input', () => {
    assert.throws(
      () => sanitizeImportPaths('not-array', BASE),
      /must be an array/
    );
  });

  test('handles empty array', () => {
    const result = sanitizeImportPaths([], BASE);
    assert.deepStrictEqual(result, []);
  });
});

describe('isPathSafe', () => {
  test('returns true for safe path', () => {
    assert.strictEqual(isPathSafe('./src/file.js', BASE), true);
  });

  test('returns false for traversal path', () => {
    assert.strictEqual(isPathSafe('../../../etc/passwd', BASE), false);
  });

  test('returns false for Windows absolute path', () => {
    assert.strictEqual(isPathSafe('C:\\Windows\\cmd.exe', BASE), false);
  });

  test('returns false for null path', () => {
    assert.strictEqual(isPathSafe(null, BASE), false);
  });

  test('returns false for empty string', () => {
    assert.strictEqual(isPathSafe('', BASE), false);
  });

  test('returns true for nested safe path', () => {
    assert.strictEqual(isPathSafe('./deeply/nested/path/file.js', BASE), true);
  });
});
