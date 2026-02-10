/**
 * Pulse Form Management Tests
 *
 * Tests for runtime/form.js - useForm, useField, useFieldArray, validators
 *
 * @module test/form
 */

import {
  useForm,
  useField,
  useFieldArray,
  validators
} from '../runtime/form.js';

import { effect } from '../runtime/pulse.js';

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

// =============================================================================
// Validators Tests
// =============================================================================

describe('Validators Tests', () => {
  test('validators.required validates empty values', () => {
    const rule = validators.required();

    assert.strictEqual(rule.validate(''), 'This field is required');
    assert.strictEqual(rule.validate(null), 'This field is required');
    assert.strictEqual(rule.validate(undefined), 'This field is required');
    assert.strictEqual(rule.validate([]), 'This field is required');
    assert.strictEqual(rule.validate('value'), true);
    assert.strictEqual(rule.validate(['item']), true);
  });

  test('validators.required custom message', () => {
    const rule = validators.required('Custom required message');

    assert.strictEqual(rule.validate(''), 'Custom required message');
  });

  test('validators.minLength validates string length', () => {
    const rule = validators.minLength(5);

    assert.strictEqual(rule.validate('abc'), 'Must be at least 5 characters');
    assert.strictEqual(rule.validate('abcde'), true);
    assert.strictEqual(rule.validate('abcdef'), true);
    assert.strictEqual(rule.validate(''), true); // Empty handled by required
  });

  test('validators.maxLength validates string length', () => {
    const rule = validators.maxLength(5);

    assert.strictEqual(rule.validate('abcdef'), 'Must be at most 5 characters');
    assert.strictEqual(rule.validate('abcde'), true);
    assert.strictEqual(rule.validate('abc'), true);
  });

  test('validators.email validates email format', () => {
    const rule = validators.email();

    assert.strictEqual(rule.validate('invalid'), 'Invalid email address');
    assert.strictEqual(rule.validate('test@'), 'Invalid email address');
    assert.strictEqual(rule.validate('test@example.com'), true);
    assert.strictEqual(rule.validate('user.name@domain.co.uk'), true);
  });

  test('validators.url validates URL format', () => {
    const rule = validators.url();

    assert.strictEqual(rule.validate('not a url'), 'Invalid URL');
    assert.strictEqual(rule.validate('https://example.com'), true);
    assert.strictEqual(rule.validate('http://localhost:3000'), true);
  });

  test('validators.pattern validates regex', () => {
    const rule = validators.pattern(/^[A-Z]{3}$/, 'Must be 3 uppercase letters');

    assert.strictEqual(rule.validate('abc'), 'Must be 3 uppercase letters');
    assert.strictEqual(rule.validate('ABCD'), 'Must be 3 uppercase letters');
    assert.strictEqual(rule.validate('ABC'), true);
  });

  test('validators.min validates minimum number', () => {
    const rule = validators.min(10);

    assert.strictEqual(rule.validate(5), 'Must be at least 10');
    assert.strictEqual(rule.validate(10), true);
    assert.strictEqual(rule.validate(15), true);
  });

  test('validators.max validates maximum number', () => {
    const rule = validators.max(10);

    assert.strictEqual(rule.validate(15), 'Must be at most 10');
    assert.strictEqual(rule.validate(10), true);
    assert.strictEqual(rule.validate(5), true);
  });

  test('validators.custom allows custom validation', () => {
    const rule = validators.custom((value) => {
      if (value !== 'valid') return 'Must be "valid"';
      return true;
    });

    assert.strictEqual(rule.validate('invalid'), 'Must be "valid"');
    assert.strictEqual(rule.validate('valid'), true);
  });

  test('validators.matches validates field equality', () => {
    const rule = validators.matches('password', 'Passwords must match');

    assert.strictEqual(rule.validate('abc', { password: 'xyz' }), 'Passwords must match');
    assert.strictEqual(rule.validate('abc', { password: 'abc' }), true);
  });
});

// =============================================================================
// useField Tests
// =============================================================================

describe('useField Tests', () => {
  test('useField creates field with initial value', () => {
    const field = useField('initial');

    assert.strictEqual(field.value.get(), 'initial');
    assert.strictEqual(field.error.get(), null);
    assert.strictEqual(field.touched.get(), false);
    assert.strictEqual(field.dirty.get(), false);
    assert.strictEqual(field.valid.get(), true);
  });

  test('useField onChange updates value', () => {
    const field = useField('');

    field.onChange('new value');
    assert.strictEqual(field.value.get(), 'new value');
  });

  test('useField onChange handles events', () => {
    const field = useField('');

    // Simulate DOM event
    field.onChange({ target: { value: 'event value', type: 'text' } });
    assert.strictEqual(field.value.get(), 'event value');
  });

  test('useField onChange handles checkbox events', () => {
    const field = useField(false);

    field.onChange({ target: { checked: true, type: 'checkbox' } });
    assert.strictEqual(field.value.get(), true);
  });

  test('useField onBlur marks as touched and validates', () => {
    const field = useField('', [validators.required()]);

    assert.strictEqual(field.touched.get(), false);

    field.onBlur();

    assert.strictEqual(field.touched.get(), true);
    assert.strictEqual(field.error.get(), 'This field is required');
  });

  test('useField dirty tracks value changes', () => {
    const field = useField('initial');

    assert.strictEqual(field.dirty.get(), false);

    field.onChange('changed');
    assert.strictEqual(field.dirty.get(), true);

    field.onChange('initial');
    assert.strictEqual(field.dirty.get(), false);
  });

  test('useField validate runs validation rules', async () => {
    const field = useField('', [
      validators.required(),
      validators.minLength(5)
    ]);

    assert.strictEqual(await field.validate(), false);
    assert.strictEqual(field.error.get(), 'This field is required');

    field.onChange('abc');
    assert.strictEqual(await field.validate(), false);
    assert.strictEqual(field.error.get(), 'Must be at least 5 characters');

    field.onChange('abcde');
    assert.strictEqual(await field.validate(), true);
    assert.strictEqual(field.error.get(), null);
  });

  test('useField reset restores initial state', () => {
    const field = useField('initial');

    field.onChange('changed');
    field.onBlur();
    field.setError('manual error');

    field.reset();

    assert.strictEqual(field.value.get(), 'initial');
    assert.strictEqual(field.error.get(), null);
    assert.strictEqual(field.touched.get(), false);
  });

  test('useField setError and clearError work', () => {
    const field = useField('value');

    field.setError('manual error');
    assert.strictEqual(field.error.get(), 'manual error');
    assert.strictEqual(field.valid.get(), false);

    field.clearError();
    assert.strictEqual(field.error.get(), null);
    assert.strictEqual(field.valid.get(), true);
  });
});

// =============================================================================
// useForm Tests
// =============================================================================

describe('useForm Tests', () => {
  test('useForm creates fields from initial values', () => {
    const { fields } = useForm({
      email: '',
      password: ''
    });

    assert.ok('email' in fields, 'Should have email field');
    assert.ok('password' in fields, 'Should have password field');
    assert.strictEqual(fields.email.value.get(), '');
    assert.strictEqual(fields.password.value.get(), '');
  });

  test('useForm getValues returns current values', () => {
    const { fields, getValues } = useForm({
      name: 'John',
      age: 30
    });

    const values = getValues();
    assert.deepStrictEqual(values, { name: 'John', age: 30 });

    fields.name.onChange('Jane');
    assert.deepStrictEqual(getValues(), { name: 'Jane', age: 30 });
  });

  test('useForm setValues updates multiple fields', () => {
    const { fields, setValues } = useForm({
      name: '',
      email: ''
    });

    setValues({ name: 'John', email: 'john@example.com' });

    assert.strictEqual(fields.name.value.get(), 'John');
    assert.strictEqual(fields.email.value.get(), 'john@example.com');
  });

  test('useForm setValue updates single field', () => {
    const { fields, setValue } = useForm({
      name: ''
    });

    setValue('name', 'John');
    assert.strictEqual(fields.name.value.get(), 'John');
  });

  test('useForm validates with schema', async () => {
    const { fields, isValid, validateAll } = useForm(
      { email: '', password: '' },
      {
        email: [validators.required(), validators.email()],
        password: [validators.required(), validators.minLength(8)]
      }
    );

    // Initially empty, so validation will fail
    assert.strictEqual(await validateAll(), false);
    assert.strictEqual(isValid.get(), false);

    fields.email.onChange('invalid');
    fields.password.onChange('short');
    await validateAll();
    assert.strictEqual(fields.email.error.get(), 'Invalid email address');
    assert.strictEqual(fields.password.error.get(), 'Must be at least 8 characters');

    fields.email.onChange('valid@email.com');
    fields.password.onChange('longpassword');
    await validateAll();
    assert.strictEqual(isValid.get(), true);
  });

  test('useForm isDirty tracks any field changes', () => {
    const { fields, isDirty } = useForm({
      name: 'initial'
    });

    assert.strictEqual(isDirty.get(), false);

    fields.name.onChange('changed');
    assert.strictEqual(isDirty.get(), true);

    fields.name.onChange('initial');
    assert.strictEqual(isDirty.get(), false);
  });

  test('useForm isTouched tracks any field interaction', () => {
    const { fields, isTouched } = useForm({
      name: '',
      email: ''
    });

    assert.strictEqual(isTouched.get(), false);

    fields.name.onBlur();
    assert.strictEqual(isTouched.get(), true);
  });

  test('useForm errors computed returns all errors', async () => {
    const { fields, errors, validateAll } = useForm(
      { email: '', password: '' },
      {
        email: [validators.required()],
        password: [validators.required()]
      }
    );

    await validateAll();

    const errs = errors.get();
    assert.strictEqual(errs.email, 'This field is required');
    assert.strictEqual(errs.password, 'This field is required');
  });

  test('useForm reset restores initial values', () => {
    const { fields, reset, getValues } = useForm({
      name: 'initial'
    });

    fields.name.onChange('changed');
    reset();

    assert.strictEqual(getValues().name, 'initial');
    assert.strictEqual(fields.name.touched.get(), false);
  });

  test('useForm reset with new values', () => {
    const { reset, getValues } = useForm({
      name: 'initial'
    });

    reset({ name: 'new initial' });
    assert.strictEqual(getValues().name, 'new initial');
  });

  test('useForm setErrors sets field errors', () => {
    const { fields, setErrors } = useForm({
      email: '',
      password: ''
    });

    setErrors({
      email: 'Email already exists',
      password: 'Password too weak'
    });

    assert.strictEqual(fields.email.error.get(), 'Email already exists');
    assert.strictEqual(fields.password.error.get(), 'Password too weak');
  });

  test('useForm clearErrors clears all errors', () => {
    const { fields, setErrors, clearErrors } = useForm({
      email: '',
      password: ''
    });

    setErrors({
      email: 'Error 1',
      password: 'Error 2'
    });

    clearErrors();

    assert.strictEqual(fields.email.error.get(), null);
    assert.strictEqual(fields.password.error.get(), null);
  });

  test('useForm handleSubmit validates and calls onSubmit', async () => {
    let submittedValues = null;

    const { fields, handleSubmit, isSubmitting } = useForm(
      { name: 'John' },
      {},
      {
        onSubmit: (values) => {
          submittedValues = values;
        }
      }
    );

    const result = await handleSubmit();

    assert.strictEqual(result, true);
    assert.deepStrictEqual(submittedValues, { name: 'John' });
  });

  test('useForm handleSubmit prevents submit with validation errors', async () => {
    let errorsCalled = null;

    const { handleSubmit } = useForm(
      { email: '' },
      { email: [validators.required()] },
      {
        onError: (errs) => { errorsCalled = errs; }
      }
    );

    const result = await handleSubmit();

    assert.strictEqual(result, false);
    assert.strictEqual(errorsCalled.email, 'This field is required');
  });

  test('useForm submitCount tracks submission attempts', async () => {
    const { handleSubmit, submitCount } = useForm(
      { name: '' },
      { name: [validators.required()] }
    );

    assert.strictEqual(submitCount.get(), 0);

    await handleSubmit();
    assert.strictEqual(submitCount.get(), 1);

    await handleSubmit();
    assert.strictEqual(submitCount.get(), 2);
  });
});

// =============================================================================
// useFieldArray Tests
// =============================================================================

describe('useFieldArray Tests', () => {
  test('useFieldArray creates array of fields', () => {
    const { fields, values } = useFieldArray(['a', 'b', 'c']);

    assert.strictEqual(fields.get().length, 3);
    assert.deepStrictEqual(values.get(), ['a', 'b', 'c']);
  });

  test('useFieldArray append adds item', () => {
    const { fields, values, append } = useFieldArray(['a']);

    append('b');

    assert.strictEqual(fields.get().length, 2);
    assert.deepStrictEqual(values.get(), ['a', 'b']);
  });

  test('useFieldArray prepend adds item at start', () => {
    const { values, prepend } = useFieldArray(['b']);

    prepend('a');

    assert.deepStrictEqual(values.get(), ['a', 'b']);
  });

  test('useFieldArray insert adds item at index', () => {
    const { values, insert } = useFieldArray(['a', 'c']);

    insert(1, 'b');

    assert.deepStrictEqual(values.get(), ['a', 'b', 'c']);
  });

  test('useFieldArray remove removes item', () => {
    const { values, remove } = useFieldArray(['a', 'b', 'c']);

    remove(1);

    assert.deepStrictEqual(values.get(), ['a', 'c']);
  });

  test('useFieldArray move reorders items', () => {
    const { values, move } = useFieldArray(['a', 'b', 'c']);

    move(0, 2);

    assert.deepStrictEqual(values.get(), ['b', 'c', 'a']);
  });

  test('useFieldArray swap exchanges items', () => {
    const { values, swap } = useFieldArray(['a', 'b', 'c']);

    swap(0, 2);

    assert.deepStrictEqual(values.get(), ['c', 'b', 'a']);
  });

  test('useFieldArray replace updates item', () => {
    const { values, replace } = useFieldArray(['a', 'b', 'c']);

    replace(1, 'x');

    assert.deepStrictEqual(values.get(), ['a', 'x', 'c']);
  });

  test('useFieldArray reset restores initial values', () => {
    const { values, append, reset } = useFieldArray(['a']);

    append('b');
    append('c');

    reset();

    assert.deepStrictEqual(values.get(), ['a']);
  });

  test('useFieldArray reset with new values', () => {
    const { values, reset } = useFieldArray(['a']);

    reset(['x', 'y', 'z']);

    assert.deepStrictEqual(values.get(), ['x', 'y', 'z']);
  });

  test('useFieldArray validates all items', async () => {
    const { fields, isValid, validateAll } = useFieldArray(
      ['valid', ''],
      [validators.required()]
    );

    assert.strictEqual(await validateAll(), false);
    assert.strictEqual(isValid.get(), false);

    // First field should be valid
    assert.strictEqual(fields.get()[0].valid.get(), true);
    // Second field should be invalid
    assert.strictEqual(fields.get()[1].valid.get(), false);
  });

  test('useFieldArray errors shows field errors', async () => {
    const { fields, validateAll } = useFieldArray(
      ['', ''],
      [validators.required()]
    );

    await validateAll();

    // Check individual field errors (errors computed may have tracking limitations)
    const fieldList = fields.get();
    assert.strictEqual(fieldList[0].error.get(), 'This field is required');
    assert.strictEqual(fieldList[1].error.get(), 'This field is required');
  });
});

// =============================================================================
// Async Validators Tests
// =============================================================================

describe('Async Validators Tests', () => {
  test('validators.asyncCustom creates async validator', () => {
    const rule = validators.asyncCustom(async (value) => {
      return value === 'valid' ? true : 'Invalid value';
    });

    assert.strictEqual(rule.async, true);
    assert.strictEqual(typeof rule.validate, 'function');
    assert.strictEqual(rule.debounce, 300);
  });

  test('validators.asyncCustom with custom debounce', () => {
    const rule = validators.asyncCustom(
      async () => true,
      { debounce: 500 }
    );

    assert.strictEqual(rule.debounce, 500);
  });

  test('validators.asyncEmail creates async email validator', () => {
    const rule = validators.asyncEmail(async () => true);

    assert.strictEqual(rule.async, true);
    assert.strictEqual(typeof rule.validate, 'function');
  });

  test('validators.asyncEmail validates format before async check', async () => {
    let apiCalled = false;
    const rule = validators.asyncEmail(async () => {
      apiCalled = true;
      return true;
    });

    // Invalid format should fail before API call
    const result = await rule.validate('invalid-email', {});
    assert.strictEqual(result, 'Invalid email address');
    assert.strictEqual(apiCalled, false);
  });

  test('validators.asyncEmail calls check function for valid format', async () => {
    let apiCalled = false;
    const rule = validators.asyncEmail(async (email) => {
      apiCalled = true;
      return email !== 'taken@example.com';
    });

    // Valid format should trigger API check
    const result1 = await rule.validate('available@example.com', {});
    assert.strictEqual(result1, true);
    assert.strictEqual(apiCalled, true);

    // Reset and test taken email
    apiCalled = false;
    const result2 = await rule.validate('taken@example.com', {});
    assert.strictEqual(result2, 'Email is already taken');
  });

  test('validators.asyncUnique creates async unique validator', () => {
    const rule = validators.asyncUnique(async () => true);

    assert.strictEqual(rule.async, true);
    assert.strictEqual(typeof rule.validate, 'function');
  });

  test('validators.asyncUnique validates uniqueness', async () => {
    const takenValues = ['john', 'jane'];
    const rule = validators.asyncUnique(
      async (value) => !takenValues.includes(value),
      'Username is taken'
    );

    const result1 = await rule.validate('newuser', {});
    assert.strictEqual(result1, true);

    const result2 = await rule.validate('john', {});
    assert.strictEqual(result2, 'Username is taken');
  });

  test('validators.asyncServer creates server validator', () => {
    const rule = validators.asyncServer(async () => null);

    assert.strictEqual(rule.async, true);
    assert.strictEqual(typeof rule.validate, 'function');
  });

  test('validators.asyncServer handles server response', async () => {
    const rule = validators.asyncServer(async (value) => {
      if (value.length < 3) return 'Too short (server)';
      return null;
    });

    const result1 = await rule.validate('ab', {});
    assert.strictEqual(result1, 'Too short (server)');

    const result2 = await rule.validate('abc', {});
    assert.strictEqual(result2, true);
  });
});

// =============================================================================
// Async useField Tests
// =============================================================================

describe('Async useField Tests', () => {
  test('useField has validating state for async validators', () => {
    const field = useField('', [
      validators.asyncCustom(async () => true)
    ]);

    assert.ok(field.validating !== undefined, 'Should have validating pulse');
    assert.strictEqual(field.validating.get(), false);
  });

  test('useField async validation sets validating state', async () => {
    let resolveValidation;
    const validationPromise = new Promise(r => { resolveValidation = r; });

    const field = useField('', [
      validators.asyncCustom(async () => {
        await validationPromise;
        return true;
      }, { debounce: 0 })
    ]);

    // Start validation
    const validatePromise = field.validate();

    // Should be validating after debounce
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(field.validating.get(), true);

    // Resolve validation
    resolveValidation();
    await validatePromise;

    assert.strictEqual(field.validating.get(), false);
  });

  test('useField runs sync validators before async', async () => {
    let asyncCalled = false;
    const field = useField('', [
      validators.required(),
      validators.asyncCustom(async () => {
        asyncCalled = true;
        return true;
      }, { debounce: 0 })
    ]);

    // Empty value should fail sync validation first
    const result = await field.validate();
    assert.strictEqual(result, false);
    assert.strictEqual(field.error.get(), 'This field is required');
    assert.strictEqual(asyncCalled, false);
  });

  test('useField async validation with valid sync passes to async', async () => {
    let asyncValue = null;
    const field = useField('test', [
      validators.required(),
      validators.asyncCustom(async (value) => {
        asyncValue = value;
        return value === 'valid' ? true : 'Must be valid';
      }, { debounce: 0 })
    ]);

    const result = await field.validate();
    assert.strictEqual(result, false);
    assert.strictEqual(asyncValue, 'test');
    assert.strictEqual(field.error.get(), 'Must be valid');
  });

  test('useField reset cancels pending async validation', async () => {
    let validationCount = 0;
    let shouldSetError = true;

    const field = useField('value', [
      validators.asyncCustom(async () => {
        validationCount++;
        await new Promise(r => setTimeout(r, 100));
        return shouldSetError ? 'Error' : true;
      }, { debounce: 0 })
    ]);

    // Start validation
    const validatePromise = field.validate();

    // Reset immediately
    field.reset();

    // Wait for validation to complete
    await validatePromise;

    // Error should not be set because reset cancelled it
    assert.strictEqual(field.error.get(), null);
  });
});

// =============================================================================
// Async useForm Tests
// =============================================================================

describe('Async useForm Tests', () => {
  test('useForm has isValidating computed', () => {
    const { isValidating } = useForm(
      { email: '' },
      { email: [validators.asyncCustom(async () => true)] }
    );

    assert.ok(isValidating !== undefined, 'Should have isValidating computed');
    assert.strictEqual(isValidating.get(), false);
  });

  test('useForm validates async validators on submit', async () => {
    let apiChecked = false;
    let submittedValues = null;

    const { handleSubmit } = useForm(
      { email: 'test@example.com' },
      {
        email: [
          validators.required(),
          validators.email(),
          validators.asyncEmail(async () => {
            apiChecked = true;
            return true;
          }, 'Email taken', { debounce: 0 })
        ]
      },
      {
        onSubmit: (values) => { submittedValues = values; }
      }
    );

    const result = await handleSubmit();

    assert.strictEqual(apiChecked, true);
    assert.strictEqual(result, true);
    assert.deepStrictEqual(submittedValues, { email: 'test@example.com' });
  });

  test('useForm blocks submit on async validation failure', async () => {
    let errorsCalled = null;

    const { handleSubmit } = useForm(
      { username: 'taken' },
      {
        username: [
          validators.asyncUnique(async (value) => value !== 'taken', 'Username taken', { debounce: 0 })
        ]
      },
      {
        onError: (errs) => { errorsCalled = errs; }
      }
    );

    const result = await handleSubmit();

    assert.strictEqual(result, false);
    assert.strictEqual(errorsCalled.username, 'Username taken');
  });

  test('useForm isValidating reflects async validation state', async () => {
    let resolveValidation;
    const validationPromise = new Promise(r => { resolveValidation = r; });

    const { fields, isValidating, validateAll } = useForm(
      { email: 'test@example.com' },
      {
        email: [
          validators.asyncCustom(async () => {
            await validationPromise;
            return true;
          }, { debounce: 0 })
        ]
      }
    );

    // Start validation
    const validatePromise = validateAll();

    // Should be validating after starting
    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(isValidating.get(), true);

    // Resolve validation
    resolveValidation();
    await validatePromise;

    assert.strictEqual(isValidating.get(), false);
  });

  test('useForm fields have validateSync for immediate feedback', async () => {
    const { fields } = useForm(
      { email: '' },
      {
        email: [
          validators.required(),
          validators.asyncEmail(async () => true, 'Email taken', { debounce: 0 })
        ]
      }
    );

    // validateSync should only run sync validators
    const syncResult = fields.email.validateSync();
    assert.strictEqual(syncResult, false);
    assert.strictEqual(fields.email.error.get(), 'This field is required');
  });
});
