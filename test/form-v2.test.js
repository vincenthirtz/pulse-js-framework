/**
 * Pulse Form System v2 Tests (v1.9.0)
 *
 * Tests for the 5 new features in runtime/form.js:
 *   #29 - Form submission state management (submitError)
 *   #30 - Conditional field validation (when/unless)
 *   #32 - Cross-field and form-level validation (formError, validate option)
 *   #34 - File upload support (useFileField)
 *   #36 - Form draft persistence (persist option)
 *
 * @module test/form-v2
 */

import {
  useForm,
  useField,
  useFileField,
  validators
} from '../runtime/form.js';

import { effect } from '../runtime/pulse.js';

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a mock File object for testing
 */
function createMockFile(name, size, type) {
  return { name, size, type };
}

/**
 * Create a mock FileList-like object
 */
function createMockFileList(files) {
  const list = [...files]; // Copy to avoid shared reference
  list.item = (i) => list[i];
  return list;
}

/**
 * Create a mock localStorage for testing
 */
function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    _store: store
  };
}

// =============================================================================
// #29 - Form Submission State Management
// =============================================================================

describe('Form Submission State (#29)', () => {

  test('submitError is null initially', () => {
    const form = useForm({ name: '' });
    assert.strictEqual(form.submitError.get(), null);
  });

  test('submitError is set on submit failure', async () => {
    const form = useForm(
      { name: '' },
      {},
      {
        validateOnSubmit: false,
        onSubmit: async () => {
          throw new Error('Server error');
        }
      }
    );

    const result = await form.handleSubmit();
    assert.strictEqual(result, false);
    assert.strictEqual(form.submitError.get(), 'Server error');
  });

  test('submitError is cleared on next submit attempt', async () => {
    let shouldFail = true;
    const form = useForm(
      { name: '' },
      {},
      {
        validateOnSubmit: false,
        onSubmit: async () => {
          if (shouldFail) throw new Error('Server error');
        }
      }
    );

    // First submit - fails
    await form.handleSubmit();
    assert.strictEqual(form.submitError.get(), 'Server error');

    // Second submit - succeeds
    shouldFail = false;
    await form.handleSubmit();
    assert.strictEqual(form.submitError.get(), null);
  });

  test('submitError uses err.message or fallback', async () => {
    const form = useForm(
      { name: '' },
      {},
      {
        validateOnSubmit: false,
        onSubmit: async () => {
          throw new Error('');
        }
      }
    );

    await form.handleSubmit();
    // Empty message falls back to 'Submit failed'
    assert.strictEqual(form.submitError.get(), 'Submit failed');
  });

  test('submitError coexists with onError callback', async () => {
    let errorFromCallback = null;
    const form = useForm(
      { name: '' },
      {},
      {
        validateOnSubmit: false,
        onSubmit: async () => {
          throw new Error('Server error');
        },
        onError: (err) => { errorFromCallback = err; }
      }
    );

    await form.handleSubmit();
    assert.strictEqual(form.submitError.get(), 'Server error');
    assert.deepStrictEqual(errorFromCallback, { _form: 'Server error' });
  });

  test('submitError is reactive (can be tracked in effects)', async () => {
    const form = useForm(
      { name: '' },
      {},
      {
        validateOnSubmit: false,
        onSubmit: async () => { throw new Error('fail'); }
      }
    );

    const tracked = [];
    effect(() => tracked.push(form.submitError.get()));

    assert.deepStrictEqual(tracked, [null]);

    await form.handleSubmit();
    assert.deepStrictEqual(tracked, [null, 'fail']);
    // null (initial), 'fail' (set on catch) — clearing null→null is no-op (Object.is equality)
  });

  test('submitError is cleared by clearErrors()', async () => {
    const form = useForm(
      { name: '' },
      {},
      {
        validateOnSubmit: false,
        onSubmit: async () => { throw new Error('fail'); }
      }
    );

    await form.handleSubmit();
    assert.strictEqual(form.submitError.get(), 'fail');

    form.clearErrors();
    assert.strictEqual(form.submitError.get(), null);
  });

  test('submitError is cleared by reset()', async () => {
    const form = useForm(
      { name: '' },
      {},
      {
        validateOnSubmit: false,
        onSubmit: async () => { throw new Error('fail'); }
      }
    );

    await form.handleSubmit();
    assert.strictEqual(form.submitError.get(), 'fail');

    form.reset();
    assert.strictEqual(form.submitError.get(), null);
  });

  test('submitError is null on successful submit', async () => {
    const form = useForm(
      { name: 'John' },
      {},
      {
        validateOnSubmit: false,
        onSubmit: async () => { /* success */ }
      }
    );

    const result = await form.handleSubmit();
    assert.strictEqual(result, true);
    assert.strictEqual(form.submitError.get(), null);
  });
});

// =============================================================================
// #30 - Conditional Field Validation
// =============================================================================

describe('Conditional Validators (#30)', () => {

  describe('validators.when()', () => {

    test('runs rules when condition is true', () => {
      const rule = validators.when(
        (value, allValues) => allValues.enabled === true,
        [validators.required()]
      );

      const result = rule.validate('', { enabled: true });
      assert.strictEqual(result, 'This field is required');
    });

    test('skips rules when condition is false', () => {
      const rule = validators.when(
        (value, allValues) => allValues.enabled === true,
        [validators.required()]
      );

      const result = rule.validate('', { enabled: false });
      assert.strictEqual(result, true);
    });

    test('runs multiple rules in order', () => {
      const rule = validators.when(
        () => true,
        [validators.required(), validators.minLength(5)]
      );

      // First rule catches empty
      assert.strictEqual(rule.validate('', {}), 'This field is required');
      // Second rule catches short
      assert.strictEqual(rule.validate('abc', {}), 'Must be at least 5 characters');
      // Both pass
      assert.strictEqual(rule.validate('abcde', {}), true);
    });

    test('returns first failing rule error', () => {
      const rule = validators.when(
        () => true,
        [validators.required(), validators.email()]
      );

      // required fails first
      assert.strictEqual(rule.validate('', {}), 'This field is required');
      // email fails
      assert.strictEqual(rule.validate('notanemail', {}), 'Invalid email address');
      // all pass
      assert.strictEqual(rule.validate('test@example.com', {}), true);
    });

    test('is sync when all inner rules are sync', () => {
      const rule = validators.when(
        () => true,
        [validators.required(), validators.email()]
      );

      assert.strictEqual(rule.async, undefined);
    });

    test('is async when any inner rule is async', () => {
      const rule = validators.when(
        () => true,
        [validators.required(), validators.asyncCustom(async () => true)]
      );

      assert.strictEqual(rule.async, true);
      assert.strictEqual(rule.debounce, 300);
    });

    test('inherits debounce from first async rule', () => {
      const rule = validators.when(
        () => true,
        [validators.asyncCustom(async () => true, { debounce: 500 })]
      );

      assert.strictEqual(rule.debounce, 500);
    });

    test('async when() validates correctly with condition true', async () => {
      const rule = validators.when(
        () => true,
        [validators.asyncCustom(async (value) => {
          return value === 'taken' ? 'Already taken' : true;
        }, { debounce: 0 })]
      );

      const result1 = await rule.validate('taken', {});
      assert.strictEqual(result1, 'Already taken');

      const result2 = await rule.validate('available', {});
      assert.strictEqual(result2, true);
    });

    test('async when() skips rules when condition is false', async () => {
      let asyncCalled = false;
      const rule = validators.when(
        () => false,
        [validators.asyncCustom(async () => {
          asyncCalled = true;
          return 'error';
        }, { debounce: 0 })]
      );

      const result = await rule.validate('anything', {});
      assert.strictEqual(result, true);
      assert.strictEqual(asyncCalled, false);
    });

    test('condition receives value and allValues', () => {
      let receivedValue, receivedAllValues;
      const rule = validators.when(
        (value, allValues) => {
          receivedValue = value;
          receivedAllValues = allValues;
          return false;
        },
        [validators.required()]
      );

      rule.validate('test', { foo: 'bar' });
      assert.strictEqual(receivedValue, 'test');
      assert.deepStrictEqual(receivedAllValues, { foo: 'bar' });
    });

    test('works with useField', async () => {
      const conditionalRule = validators.when(
        (value) => value.length > 0,
        [validators.email()]
      );

      const field = useField('', [conditionalRule]);

      // Empty value - condition false, validation passes
      const result1 = await field.validate();
      assert.strictEqual(result1, true);
      assert.strictEqual(field.error.get(), null);

      // Non-empty invalid value - condition true, email fails
      field.value.set('notanemail');
      const result2 = await field.validate();
      assert.strictEqual(result2, false);
      assert.strictEqual(field.error.get(), 'Invalid email address');

      // Valid email - condition true, passes
      field.value.set('test@example.com');
      const result3 = await field.validate();
      assert.strictEqual(result3, true);
      assert.strictEqual(field.error.get(), null);

      field.dispose();
    });
  });

  describe('validators.unless()', () => {

    test('runs rules when condition is false (inverse of when)', () => {
      const rule = validators.unless(
        (value) => !value,  // condition: field is empty
        [validators.email()]
      );

      // Empty - condition true → unless skips
      assert.strictEqual(rule.validate('', {}), true);
      // Non-empty invalid - condition false → unless runs
      assert.strictEqual(rule.validate('notanemail', {}), 'Invalid email address');
      // Non-empty valid - condition false → unless runs → passes
      assert.strictEqual(rule.validate('test@example.com', {}), true);
    });

    test('skips rules when condition is true', () => {
      const rule = validators.unless(
        () => true,
        [validators.required()]
      );

      assert.strictEqual(rule.validate('', {}), true);
    });

    test('runs rules when condition is false', () => {
      const rule = validators.unless(
        () => false,
        [validators.required()]
      );

      assert.strictEqual(rule.validate('', {}), 'This field is required');
    });

    test('is async when inner rules are async', () => {
      const rule = validators.unless(
        () => false,
        [validators.asyncCustom(async () => true, { debounce: 200 })]
      );

      assert.strictEqual(rule.async, true);
      assert.strictEqual(rule.debounce, 200);
    });

    test('works with useForm cross-field conditions', async () => {
      const form = useForm(
        { email: '', subscribe: false },
        {
          email: [
            validators.unless(
              (value, allValues) => !allValues.subscribe,
              [validators.required(), validators.email()]
            )
          ]
        }
      );

      // subscribe=false → condition true → unless skips validation
      const valid1 = await form.validateAll();
      assert.strictEqual(valid1, true);

      // subscribe=true, email empty → condition false → unless runs → required fails
      form.fields.subscribe.value.set(true);
      const valid2 = await form.validateAll();
      assert.strictEqual(valid2, false);
      assert.strictEqual(form.fields.email.error.get(), 'This field is required');

      // subscribe=true, valid email → passes
      form.fields.email.value.set('test@example.com');
      const valid3 = await form.validateAll();
      assert.strictEqual(valid3, true);

      form.dispose();
    });
  });
});

// =============================================================================
// #32 - Cross-Field and Form-Level Validation
// =============================================================================

describe('Form-Level Validation (#32)', () => {

  test('formError is null initially', () => {
    const form = useForm({ name: '' });
    assert.strictEqual(form.formError.get(), null);
  });

  test('validate option sets field-level errors', async () => {
    const form = useForm(
      { password: 'abc', confirmPassword: 'xyz' },
      {},
      {
        validate: (allValues) => {
          const errors = {};
          if (allValues.password !== allValues.confirmPassword) {
            errors.confirmPassword = 'Passwords must match';
          }
          return errors;
        }
      }
    );

    const valid = await form.validateAll();
    assert.strictEqual(valid, false);
    assert.strictEqual(form.fields.confirmPassword.error.get(), 'Passwords must match');
  });

  test('validate option sets form-level error via _form key', async () => {
    const form = useForm(
      { a: '', b: '' },
      {},
      {
        validate: () => ({ _form: 'Global error' })
      }
    );

    const valid = await form.validateAll();
    assert.strictEqual(valid, false);
    assert.strictEqual(form.formError.get(), 'Global error');
  });

  test('formError included in errors computed', async () => {
    const form = useForm(
      { name: 'ok' },
      {},
      {
        validate: () => ({ _form: 'Form error' })
      }
    );

    await form.validateAll();
    const errs = form.errors.get();
    assert.strictEqual(errs._form, 'Form error');
  });

  test('isValid considers formError', async () => {
    const form = useForm(
      { name: 'valid' },
      {},
      {
        validate: () => ({ _form: 'Error' })
      }
    );

    // Before validation, isValid is true (no errors)
    assert.strictEqual(form.isValid.get(), true);

    await form.validateAll();
    assert.strictEqual(form.isValid.get(), false);
  });

  test('validate returns empty object means valid', async () => {
    const form = useForm(
      { name: 'value' },
      {},
      {
        validate: () => ({})
      }
    );

    const valid = await form.validateAll();
    assert.strictEqual(valid, true);
    assert.strictEqual(form.formError.get(), null);
  });

  test('validate returning non-object treated as valid', async () => {
    const form = useForm(
      { name: 'value' },
      {},
      {
        validate: () => null
      }
    );

    const valid = await form.validateAll();
    assert.strictEqual(valid, true);
  });

  test('validate returning undefined treated as valid', async () => {
    const form = useForm(
      { name: 'value' },
      {},
      {
        validate: () => undefined
      }
    );

    const valid = await form.validateAll();
    assert.strictEqual(valid, true);
  });

  test('form-level validation only runs when field-level passes', async () => {
    let formValidateCalled = false;
    const form = useForm(
      { name: '' },
      { name: [validators.required()] },
      {
        validate: () => {
          formValidateCalled = true;
          return { _form: 'Should not appear' };
        }
      }
    );

    const valid = await form.validateAll();
    assert.strictEqual(valid, false);
    assert.strictEqual(formValidateCalled, false);
    assert.strictEqual(form.formError.get(), null);
  });

  test('clearFormError() clears only form error', async () => {
    const form = useForm(
      { name: 'ok' },
      {},
      {
        validate: () => ({ name: 'Field error', _form: 'Form error' })
      }
    );

    await form.validateAll();
    assert.strictEqual(form.formError.get(), 'Form error');
    assert.strictEqual(form.fields.name.error.get(), 'Field error');

    form.clearFormError();
    assert.strictEqual(form.formError.get(), null);
    assert.strictEqual(form.fields.name.error.get(), 'Field error');
  });

  test('formError is cleared before re-validation', async () => {
    let callCount = 0;
    const form = useForm(
      { name: 'value' },
      {},
      {
        validate: () => {
          callCount++;
          if (callCount === 1) return { _form: 'Error on first call' };
          return {};
        }
      }
    );

    // First validation sets formError
    await form.validateAll();
    assert.strictEqual(form.formError.get(), 'Error on first call');

    // Second validation clears it
    await form.validateAll();
    assert.strictEqual(form.formError.get(), null);
  });

  test('async validate function is supported', async () => {
    const form = useForm(
      { name: 'test' },
      {},
      {
        validate: async (allValues) => {
          await new Promise(r => setTimeout(r, 10));
          if (allValues.name === 'test') {
            return { _form: 'Async form error' };
          }
          return {};
        }
      }
    );

    const valid = await form.validateAll();
    assert.strictEqual(valid, false);
    assert.strictEqual(form.formError.get(), 'Async form error');
  });

  test('validate function exception sets formError', async () => {
    const form = useForm(
      { name: 'value' },
      {},
      {
        validate: () => {
          throw new Error('Validation crashed');
        }
      }
    );

    const valid = await form.validateAll();
    assert.strictEqual(valid, false);
    assert.strictEqual(form.formError.get(), 'Validation crashed');
  });

  test('handleSubmit runs form-level validation', async () => {
    let submitted = false;
    const form = useForm(
      { name: 'value' },
      {},
      {
        validate: () => ({ _form: 'Not allowed' }),
        onSubmit: () => { submitted = true; }
      }
    );

    const result = await form.handleSubmit();
    assert.strictEqual(result, false);
    assert.strictEqual(submitted, false);
    assert.strictEqual(form.formError.get(), 'Not allowed');
  });

  test('setErrors with _form key sets formError', () => {
    const form = useForm({ name: '' });

    form.setErrors({ name: 'Field error', _form: 'Form error' });
    assert.strictEqual(form.fields.name.error.get(), 'Field error');
    assert.strictEqual(form.formError.get(), 'Form error');
  });

  test('formError cleared by reset()', async () => {
    const form = useForm(
      { name: 'value' },
      {},
      { validate: () => ({ _form: 'Error' }) }
    );

    await form.validateAll();
    assert.strictEqual(form.formError.get(), 'Error');

    form.reset();
    assert.strictEqual(form.formError.get(), null);
  });

  test('formError cleared by clearErrors()', async () => {
    const form = useForm(
      { name: 'value' },
      {},
      { validate: () => ({ _form: 'Error' }) }
    );

    await form.validateAll();
    form.clearErrors();
    assert.strictEqual(form.formError.get(), null);
  });

  test('validate option receives all current form values', async () => {
    let receivedValues;
    const form = useForm(
      { a: 'one', b: 'two' },
      {},
      {
        validate: (allValues) => {
          receivedValues = allValues;
          return {};
        }
      }
    );

    form.fields.a.value.set('updated');
    await form.validateAll();
    assert.deepStrictEqual(receivedValues, { a: 'updated', b: 'two' });
  });

  test('form-level validate sets both field and form errors simultaneously', async () => {
    const form = useForm(
      { a: '', b: '' },
      {},
      {
        validate: () => ({
          a: 'A error',
          b: 'B error',
          _form: 'Overall error'
        })
      }
    );

    await form.validateAll();
    assert.strictEqual(form.fields.a.error.get(), 'A error');
    assert.strictEqual(form.fields.b.error.get(), 'B error');
    assert.strictEqual(form.formError.get(), 'Overall error');

    const errs = form.errors.get();
    assert.strictEqual(errs.a, 'A error');
    assert.strictEqual(errs.b, 'B error');
    assert.strictEqual(errs._form, 'Overall error');
  });
});

// =============================================================================
// #34 - File Upload Support (useFileField)
// =============================================================================

describe('File Upload Field (#34)', () => {

  describe('Initial state', () => {
    test('has correct initial state', () => {
      const field = useFileField();
      assert.deepStrictEqual(field.files.get(), []);
      assert.deepStrictEqual(field.previews.get(), []);
      assert.strictEqual(field.error.get(), null);
      assert.strictEqual(field.touched.get(), false);
      assert.strictEqual(field.valid.get(), true);
      assert.strictEqual(field.isDragging.get(), false);
      field.dispose();
    });

    test('exports all required methods', () => {
      const field = useFileField();
      assert.strictEqual(typeof field.onChange, 'function');
      assert.strictEqual(typeof field.onDragEnter, 'function');
      assert.strictEqual(typeof field.onDragOver, 'function');
      assert.strictEqual(typeof field.onDragLeave, 'function');
      assert.strictEqual(typeof field.onDrop, 'function');
      assert.strictEqual(typeof field.clear, 'function');
      assert.strictEqual(typeof field.removeFile, 'function');
      assert.strictEqual(typeof field.reset, 'function');
      assert.strictEqual(typeof field.dispose, 'function');
      field.dispose();
    });
  });

  describe('File type validation', () => {
    test('rejects files with disallowed MIME type', () => {
      const field = useFileField({ accept: ['image/png', 'image/jpeg'] });

      const mockEvent = {
        target: {
          files: createMockFileList([
            createMockFile('doc.pdf', 1000, 'application/pdf')
          ])
        }
      };

      field.onChange(mockEvent);
      assert.strictEqual(field.error.get(), 'File type "application/pdf" is not allowed');
      assert.strictEqual(field.valid.get(), false);
      field.dispose();
    });

    test('accepts files with allowed MIME type', () => {
      const field = useFileField({ accept: ['image/png', 'image/jpeg'] });

      const mockEvent = {
        target: {
          files: createMockFileList([
            createMockFile('photo.png', 1000, 'image/png')
          ])
        }
      };

      field.onChange(mockEvent);
      assert.strictEqual(field.error.get(), null);
      assert.strictEqual(field.valid.get(), true);
      assert.strictEqual(field.files.get().length, 1);
      field.dispose();
    });

    test('supports wildcard MIME types (image/*)', () => {
      const field = useFileField({ accept: ['image/*'] });

      // Should accept image/png
      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('photo.webp', 1000, 'image/webp')
          ])
        }
      });
      assert.strictEqual(field.error.get(), null);

      // Should reject application/pdf
      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('doc.pdf', 1000, 'application/pdf')
          ])
        }
      });
      assert.strictEqual(field.error.get(), 'File type "application/pdf" is not allowed');
      field.dispose();
    });

    test('handles files with empty type', () => {
      const field = useFileField({ accept: ['image/png'] });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('unknown', 1000, '')
          ])
        }
      });
      assert.strictEqual(field.error.get(), 'File type "unknown" is not allowed');
      field.dispose();
    });

    test('no type restriction when accept is not provided', () => {
      const field = useFileField();

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('anything.xyz', 1000, 'application/octet-stream')
          ])
        }
      });
      assert.strictEqual(field.error.get(), null);
      field.dispose();
    });
  });

  describe('File size validation', () => {
    test('rejects files exceeding maxSize', () => {
      const field = useFileField({ maxSize: 1024 }); // 1KB

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('big.txt', 2048, 'text/plain')
          ])
        }
      });
      assert.ok(field.error.get().includes('exceeds maximum size'));
      field.dispose();
    });

    test('accepts files within maxSize', () => {
      const field = useFileField({ maxSize: 1024 });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('small.txt', 500, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.error.get(), null);
      field.dispose();
    });

    test('accepts file exactly at maxSize', () => {
      const field = useFileField({ maxSize: 1024 });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('exact.txt', 1024, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.error.get(), null);
      field.dispose();
    });
  });

  describe('File count validation', () => {
    test('rejects multiple files when multiple=false', () => {
      const field = useFileField({ multiple: false });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('a.txt', 100, 'text/plain'),
            createMockFile('b.txt', 100, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.error.get(), 'Only one file is allowed');
      field.dispose();
    });

    test('accepts multiple files when multiple=true', () => {
      const field = useFileField({ multiple: true });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('a.txt', 100, 'text/plain'),
            createMockFile('b.txt', 100, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.error.get(), null);
      assert.strictEqual(field.files.get().length, 2);
      field.dispose();
    });

    test('rejects when exceeding maxFiles', () => {
      const field = useFileField({ multiple: true, maxFiles: 2 });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('a.txt', 100, 'text/plain'),
            createMockFile('b.txt', 100, 'text/plain'),
            createMockFile('c.txt', 100, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.error.get(), 'Maximum 2 files allowed');
      field.dispose();
    });
  });

  describe('Custom validation', () => {
    test('custom validate function receives files', () => {
      const field = useFileField({
        validate: (files) => {
          if (files.length > 0 && files[0].size < 100) {
            return 'File too small';
          }
          return true;
        }
      });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('tiny.txt', 50, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.error.get(), 'File too small');
      field.dispose();
    });

    test('custom validation passes on true', () => {
      const field = useFileField({
        validate: () => true
      });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('ok.txt', 1000, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.error.get(), null);
      field.dispose();
    });
  });

  describe('Drag and drop', () => {
    test('drag events update isDragging state', () => {
      const field = useFileField();
      const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} };

      field.onDragEnter(mockEvent);
      assert.strictEqual(field.isDragging.get(), true);

      field.onDragLeave(mockEvent);
      assert.strictEqual(field.isDragging.get(), false);
      field.dispose();
    });

    test('dragOver keeps isDragging true', () => {
      const field = useFileField();
      const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} };

      field.onDragOver(mockEvent);
      assert.strictEqual(field.isDragging.get(), true);
      field.dispose();
    });

    test('drop processes files and clears isDragging', () => {
      const field = useFileField();

      const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        dataTransfer: {
          files: createMockFileList([
            createMockFile('dropped.txt', 500, 'text/plain')
          ])
        }
      };

      field.onDragEnter({ preventDefault: () => {}, stopPropagation: () => {} });
      assert.strictEqual(field.isDragging.get(), true);

      field.onDrop(mockEvent);
      assert.strictEqual(field.isDragging.get(), false);
      assert.strictEqual(field.files.get().length, 1);
      assert.strictEqual(field.files.get()[0].name, 'dropped.txt');
      field.dispose();
    });

    test('drop with no files does nothing', () => {
      const field = useFileField();

      const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        dataTransfer: { files: createMockFileList([]) }
      };

      field.onDrop(mockEvent);
      assert.strictEqual(field.files.get().length, 0);
      field.dispose();
    });

    test('drop calls preventDefault', () => {
      const field = useFileField();
      let defaultPrevented = false;
      let propagationStopped = false;

      const mockEvent = {
        preventDefault: () => { defaultPrevented = true; },
        stopPropagation: () => { propagationStopped = true; },
        dataTransfer: { files: createMockFileList([]) }
      };

      field.onDrop(mockEvent);
      assert.strictEqual(defaultPrevented, true);
      assert.strictEqual(propagationStopped, true);
      field.dispose();
    });
  });

  describe('Control methods', () => {
    test('clear() removes all files and clears error', () => {
      const field = useFileField();

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('file.txt', 100, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.files.get().length, 1);

      field.clear();
      assert.deepStrictEqual(field.files.get(), []);
      assert.strictEqual(field.error.get(), null);
      field.dispose();
    });

    test('removeFile() removes file at index', () => {
      const field = useFileField({ multiple: true });

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('a.txt', 100, 'text/plain'),
            createMockFile('b.txt', 200, 'text/plain'),
            createMockFile('c.txt', 300, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.files.get().length, 3);

      field.removeFile(1);
      assert.strictEqual(field.files.get().length, 2);
      assert.strictEqual(field.files.get()[0].name, 'a.txt');
      assert.strictEqual(field.files.get()[1].name, 'c.txt');
      field.dispose();
    });

    test('removeFile() with invalid index does nothing', () => {
      const field = useFileField();

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('a.txt', 100, 'text/plain')
          ])
        }
      });

      field.removeFile(-1);
      assert.strictEqual(field.files.get().length, 1);

      field.removeFile(5);
      assert.strictEqual(field.files.get().length, 1);
      field.dispose();
    });

    test('reset() clears everything and resets touched', () => {
      const field = useFileField();

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('file.txt', 100, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.touched.get(), true);
      assert.strictEqual(field.files.get().length, 1);

      field.reset();
      assert.deepStrictEqual(field.files.get(), []);
      assert.strictEqual(field.touched.get(), false);
      assert.strictEqual(field.error.get(), null);
      assert.strictEqual(field.isDragging.get(), false);
      field.dispose();
    });

    test('touched is set on file selection', () => {
      const field = useFileField();
      assert.strictEqual(field.touched.get(), false);

      field.onChange({
        target: {
          files: createMockFileList([
            createMockFile('file.txt', 100, 'text/plain')
          ])
        }
      });
      assert.strictEqual(field.touched.get(), true);
      field.dispose();
    });
  });

  describe('onChange edge cases', () => {
    test('onChange with null event target does nothing', () => {
      const field = useFileField();
      field.onChange(null);
      assert.strictEqual(field.files.get().length, 0);
      field.dispose();
    });

    test('onChange with event without files does nothing', () => {
      const field = useFileField();
      field.onChange({ target: {} });
      assert.strictEqual(field.files.get().length, 0);
      field.dispose();
    });
  });
});

// =============================================================================
// #36 - Form Draft Persistence
// =============================================================================

describe('Form Draft Persistence (#36)', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = createMockLocalStorage();
  });

  afterEach(() => {
    if (originalLocalStorage !== undefined) {
      globalThis.localStorage = originalLocalStorage;
    } else {
      delete globalThis.localStorage;
    }
  });

  test('hasDraft is false when no draft exists', () => {
    const form = useForm(
      { name: '' },
      {},
      { persist: true }
    );
    assert.strictEqual(form.hasDraft.get(), false);
    form.dispose();
  });

  test('draft is saved on field value change', async () => {
    const form = useForm(
      { name: '' },
      {},
      { persist: true, persistKey: 'test-form', persistDebounce: 0 }
    );

    form.fields.name.value.set('John');

    // Wait for debounced save
    await new Promise(r => setTimeout(r, 50));

    const stored = JSON.parse(globalThis.localStorage.getItem('test-form'));
    assert.strictEqual(stored.name, 'John');
    assert.strictEqual(form.hasDraft.get(), true);
    form.dispose();
  });

  test('draft is restored on form creation', async () => {
    // Save a draft first
    globalThis.localStorage.setItem('test-form', JSON.stringify({ name: 'Saved', email: 'saved@test.com' }));

    const form = useForm(
      { name: '', email: '' },
      {},
      { persist: true, persistKey: 'test-form' }
    );

    assert.strictEqual(form.fields.name.value.get(), 'Saved');
    assert.strictEqual(form.fields.email.value.get(), 'saved@test.com');
    assert.strictEqual(form.hasDraft.get(), true);
    form.dispose();
  });

  test('restored values show fields as dirty', () => {
    globalThis.localStorage.setItem('test-form', JSON.stringify({ name: 'Saved' }));

    const form = useForm(
      { name: '' },
      {},
      { persist: true, persistKey: 'test-form' }
    );

    assert.strictEqual(form.fields.name.dirty.get(), true);
    assert.strictEqual(form.isDirty.get(), true);
    form.dispose();
  });

  test('draft is cleared on successful submit', async () => {
    globalThis.localStorage.setItem('test-form', JSON.stringify({ name: 'Draft' }));

    const form = useForm(
      { name: '' },
      {},
      {
        persist: true,
        persistKey: 'test-form',
        validateOnSubmit: false,
        onSubmit: async () => { /* success */ }
      }
    );

    assert.strictEqual(form.hasDraft.get(), true);

    await form.handleSubmit();
    assert.strictEqual(globalThis.localStorage.getItem('test-form'), null);
    assert.strictEqual(form.hasDraft.get(), false);
    form.dispose();
  });

  test('draft is NOT cleared on failed submit', async () => {
    const form = useForm(
      { name: '' },
      {},
      {
        persist: true,
        persistKey: 'test-form',
        persistDebounce: 0,
        validateOnSubmit: false,
        onSubmit: async () => { throw new Error('fail'); }
      }
    );

    form.fields.name.value.set('Draft data');
    await new Promise(r => setTimeout(r, 50));

    await form.handleSubmit();
    // Draft should still exist after failed submit
    assert.ok(globalThis.localStorage.getItem('test-form') !== null);
    form.dispose();
  });

  test('draft is cleared on reset', async () => {
    const form = useForm(
      { name: '' },
      {},
      { persist: true, persistKey: 'test-form', persistDebounce: 0 }
    );

    form.fields.name.value.set('Draft');
    await new Promise(r => setTimeout(r, 50));
    assert.strictEqual(form.hasDraft.get(), true);

    form.reset();
    assert.strictEqual(globalThis.localStorage.getItem('test-form'), null);
    assert.strictEqual(form.hasDraft.get(), false);
    form.dispose();
  });

  test('clearDraft() removes from storage', async () => {
    const form = useForm(
      { name: '' },
      {},
      { persist: true, persistKey: 'test-form', persistDebounce: 0 }
    );

    form.fields.name.value.set('Draft');
    await new Promise(r => setTimeout(r, 50));

    form.clearDraft();
    assert.strictEqual(globalThis.localStorage.getItem('test-form'), null);
    assert.strictEqual(form.hasDraft.get(), false);
    form.dispose();
  });

  test('persistExclude prevents fields from being saved', async () => {
    const form = useForm(
      { name: '', password: '' },
      {},
      {
        persist: true,
        persistKey: 'test-form',
        persistDebounce: 0,
        persistExclude: ['password']
      }
    );

    form.fields.name.value.set('John');
    form.fields.password.value.set('secret123');
    await new Promise(r => setTimeout(r, 50));

    const stored = JSON.parse(globalThis.localStorage.getItem('test-form'));
    assert.strictEqual(stored.name, 'John');
    assert.strictEqual(stored.password, undefined);
    form.dispose();
  });

  test('persistExclude fields not restored', () => {
    globalThis.localStorage.setItem('test-form', JSON.stringify({
      name: 'Saved',
      password: 'should-not-restore'
    }));

    const form = useForm(
      { name: '', password: '' },
      {},
      {
        persist: true,
        persistKey: 'test-form',
        persistExclude: ['password']
      }
    );

    assert.strictEqual(form.fields.name.value.get(), 'Saved');
    assert.strictEqual(form.fields.password.value.get(), '');
    form.dispose();
  });

  test('default persistKey is pulse-form-draft', async () => {
    const form = useForm(
      { name: '' },
      {},
      { persist: true, persistDebounce: 0 }
    );

    form.fields.name.value.set('value');
    await new Promise(r => setTimeout(r, 50));

    assert.ok(globalThis.localStorage.getItem('pulse-form-draft') !== null);
    form.dispose();
  });

  test('persist=false does not save drafts', async () => {
    const form = useForm(
      { name: '' },
      {},
      { persist: false, persistKey: 'no-persist' }
    );

    form.fields.name.value.set('value');
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(globalThis.localStorage.getItem('no-persist'), null);
    form.dispose();
  });

  test('handles invalid JSON in localStorage gracefully', () => {
    globalThis.localStorage.setItem('test-form', 'not valid json');

    const form = useForm(
      { name: 'default' },
      {},
      { persist: true, persistKey: 'test-form' }
    );

    // Should fall back to initial values
    assert.strictEqual(form.fields.name.value.get(), 'default');
    form.dispose();
  });

  test('handles non-object stored data gracefully', () => {
    globalThis.localStorage.setItem('test-form', JSON.stringify('just a string'));

    const form = useForm(
      { name: 'default' },
      {},
      { persist: true, persistKey: 'test-form' }
    );

    assert.strictEqual(form.fields.name.value.get(), 'default');
    form.dispose();
  });

  test('only restores fields that exist in initialValues', () => {
    globalThis.localStorage.setItem('test-form', JSON.stringify({
      name: 'Saved',
      extraField: 'should be ignored'
    }));

    const form = useForm(
      { name: '' },
      {},
      { persist: true, persistKey: 'test-form' }
    );

    assert.strictEqual(form.fields.name.value.get(), 'Saved');
    assert.strictEqual(form.fields.extraField, undefined);
    form.dispose();
  });

  test('works without localStorage (SSR-safe)', () => {
    // Remove localStorage to simulate SSR
    const saved = globalThis.localStorage;
    delete globalThis.localStorage;

    const form = useForm(
      { name: '' },
      {},
      { persist: true, persistKey: 'test-form' }
    );

    // Should work without errors, just no persistence
    assert.strictEqual(form.fields.name.value.get(), '');
    assert.strictEqual(form.hasDraft.get(), false);

    form.fields.name.value.set('value');
    // No error thrown
    form.dispose();

    // Restore for other tests
    globalThis.localStorage = saved;
  });

  test('multiple forms with different persistKeys are independent', async () => {
    const form1 = useForm(
      { name: '' },
      {},
      { persist: true, persistKey: 'form-1', persistDebounce: 0 }
    );
    const form2 = useForm(
      { name: '' },
      {},
      { persist: true, persistKey: 'form-2', persistDebounce: 0 }
    );

    form1.fields.name.value.set('Form 1');
    form2.fields.name.value.set('Form 2');
    await new Promise(r => setTimeout(r, 50));

    const stored1 = JSON.parse(globalThis.localStorage.getItem('form-1'));
    const stored2 = JSON.parse(globalThis.localStorage.getItem('form-2'));
    assert.strictEqual(stored1.name, 'Form 1');
    assert.strictEqual(stored2.name, 'Form 2');

    form1.dispose();
    form2.dispose();
  });
});
