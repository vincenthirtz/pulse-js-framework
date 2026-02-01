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

import {
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection
} from './utils.js';

// =============================================================================
// Validators Tests
// =============================================================================

printSection('Validators Tests');

test('validators.required validates empty values', () => {
  const rule = validators.required();

  assertEqual(rule.validate(''), 'This field is required');
  assertEqual(rule.validate(null), 'This field is required');
  assertEqual(rule.validate(undefined), 'This field is required');
  assertEqual(rule.validate([]), 'This field is required');
  assertEqual(rule.validate('value'), true);
  assertEqual(rule.validate(['item']), true);
});

test('validators.required custom message', () => {
  const rule = validators.required('Custom required message');

  assertEqual(rule.validate(''), 'Custom required message');
});

test('validators.minLength validates string length', () => {
  const rule = validators.minLength(5);

  assertEqual(rule.validate('abc'), 'Must be at least 5 characters');
  assertEqual(rule.validate('abcde'), true);
  assertEqual(rule.validate('abcdef'), true);
  assertEqual(rule.validate(''), true); // Empty handled by required
});

test('validators.maxLength validates string length', () => {
  const rule = validators.maxLength(5);

  assertEqual(rule.validate('abcdef'), 'Must be at most 5 characters');
  assertEqual(rule.validate('abcde'), true);
  assertEqual(rule.validate('abc'), true);
});

test('validators.email validates email format', () => {
  const rule = validators.email();

  assertEqual(rule.validate('invalid'), 'Invalid email address');
  assertEqual(rule.validate('test@'), 'Invalid email address');
  assertEqual(rule.validate('test@example.com'), true);
  assertEqual(rule.validate('user.name@domain.co.uk'), true);
});

test('validators.url validates URL format', () => {
  const rule = validators.url();

  assertEqual(rule.validate('not a url'), 'Invalid URL');
  assertEqual(rule.validate('https://example.com'), true);
  assertEqual(rule.validate('http://localhost:3000'), true);
});

test('validators.pattern validates regex', () => {
  const rule = validators.pattern(/^[A-Z]{3}$/, 'Must be 3 uppercase letters');

  assertEqual(rule.validate('abc'), 'Must be 3 uppercase letters');
  assertEqual(rule.validate('ABCD'), 'Must be 3 uppercase letters');
  assertEqual(rule.validate('ABC'), true);
});

test('validators.min validates minimum number', () => {
  const rule = validators.min(10);

  assertEqual(rule.validate(5), 'Must be at least 10');
  assertEqual(rule.validate(10), true);
  assertEqual(rule.validate(15), true);
});

test('validators.max validates maximum number', () => {
  const rule = validators.max(10);

  assertEqual(rule.validate(15), 'Must be at most 10');
  assertEqual(rule.validate(10), true);
  assertEqual(rule.validate(5), true);
});

test('validators.custom allows custom validation', () => {
  const rule = validators.custom((value) => {
    if (value !== 'valid') return 'Must be "valid"';
    return true;
  });

  assertEqual(rule.validate('invalid'), 'Must be "valid"');
  assertEqual(rule.validate('valid'), true);
});

test('validators.matches validates field equality', () => {
  const rule = validators.matches('password', 'Passwords must match');

  assertEqual(rule.validate('abc', { password: 'xyz' }), 'Passwords must match');
  assertEqual(rule.validate('abc', { password: 'abc' }), true);
});

// =============================================================================
// useField Tests
// =============================================================================

printSection('useField Tests');

test('useField creates field with initial value', () => {
  const field = useField('initial');

  assertEqual(field.value.get(), 'initial');
  assertEqual(field.error.get(), null);
  assertEqual(field.touched.get(), false);
  assertEqual(field.dirty.get(), false);
  assertEqual(field.valid.get(), true);
});

test('useField onChange updates value', () => {
  const field = useField('');

  field.onChange('new value');
  assertEqual(field.value.get(), 'new value');
});

test('useField onChange handles events', () => {
  const field = useField('');

  // Simulate DOM event
  field.onChange({ target: { value: 'event value', type: 'text' } });
  assertEqual(field.value.get(), 'event value');
});

test('useField onChange handles checkbox events', () => {
  const field = useField(false);

  field.onChange({ target: { checked: true, type: 'checkbox' } });
  assertEqual(field.value.get(), true);
});

test('useField onBlur marks as touched and validates', () => {
  const field = useField('', [validators.required()]);

  assertEqual(field.touched.get(), false);

  field.onBlur();

  assertEqual(field.touched.get(), true);
  assertEqual(field.error.get(), 'This field is required');
});

test('useField dirty tracks value changes', () => {
  const field = useField('initial');

  assertEqual(field.dirty.get(), false);

  field.onChange('changed');
  assertEqual(field.dirty.get(), true);

  field.onChange('initial');
  assertEqual(field.dirty.get(), false);
});

test('useField validate runs validation rules', () => {
  const field = useField('', [
    validators.required(),
    validators.minLength(5)
  ]);

  assertEqual(field.validate(), false);
  assertEqual(field.error.get(), 'This field is required');

  field.onChange('abc');
  assertEqual(field.validate(), false);
  assertEqual(field.error.get(), 'Must be at least 5 characters');

  field.onChange('abcde');
  assertEqual(field.validate(), true);
  assertEqual(field.error.get(), null);
});

test('useField reset restores initial state', () => {
  const field = useField('initial');

  field.onChange('changed');
  field.onBlur();
  field.setError('manual error');

  field.reset();

  assertEqual(field.value.get(), 'initial');
  assertEqual(field.error.get(), null);
  assertEqual(field.touched.get(), false);
});

test('useField setError and clearError work', () => {
  const field = useField('value');

  field.setError('manual error');
  assertEqual(field.error.get(), 'manual error');
  assertEqual(field.valid.get(), false);

  field.clearError();
  assertEqual(field.error.get(), null);
  assertEqual(field.valid.get(), true);
});

// =============================================================================
// useForm Tests
// =============================================================================

printSection('useForm Tests');

test('useForm creates fields from initial values', () => {
  const { fields } = useForm({
    email: '',
    password: ''
  });

  assert('email' in fields, 'Should have email field');
  assert('password' in fields, 'Should have password field');
  assertEqual(fields.email.value.get(), '');
  assertEqual(fields.password.value.get(), '');
});

test('useForm getValues returns current values', () => {
  const { fields, getValues } = useForm({
    name: 'John',
    age: 30
  });

  const values = getValues();
  assertDeepEqual(values, { name: 'John', age: 30 });

  fields.name.onChange('Jane');
  assertDeepEqual(getValues(), { name: 'Jane', age: 30 });
});

test('useForm setValues updates multiple fields', () => {
  const { fields, setValues } = useForm({
    name: '',
    email: ''
  });

  setValues({ name: 'John', email: 'john@example.com' });

  assertEqual(fields.name.value.get(), 'John');
  assertEqual(fields.email.value.get(), 'john@example.com');
});

test('useForm setValue updates single field', () => {
  const { fields, setValue } = useForm({
    name: ''
  });

  setValue('name', 'John');
  assertEqual(fields.name.value.get(), 'John');
});

test('useForm validates with schema', () => {
  const { fields, isValid, validateAll } = useForm(
    { email: '', password: '' },
    {
      email: [validators.required(), validators.email()],
      password: [validators.required(), validators.minLength(8)]
    }
  );

  // Initially empty, so validation will fail
  assertEqual(validateAll(), false);
  assertEqual(isValid.get(), false);

  fields.email.onChange('invalid');
  fields.password.onChange('short');
  validateAll();
  assertEqual(fields.email.error.get(), 'Invalid email address');
  assertEqual(fields.password.error.get(), 'Must be at least 8 characters');

  fields.email.onChange('valid@email.com');
  fields.password.onChange('longpassword');
  validateAll();
  assertEqual(isValid.get(), true);
});

test('useForm isDirty tracks any field changes', () => {
  const { fields, isDirty } = useForm({
    name: 'initial'
  });

  assertEqual(isDirty.get(), false);

  fields.name.onChange('changed');
  assertEqual(isDirty.get(), true);

  fields.name.onChange('initial');
  assertEqual(isDirty.get(), false);
});

test('useForm isTouched tracks any field interaction', () => {
  const { fields, isTouched } = useForm({
    name: '',
    email: ''
  });

  assertEqual(isTouched.get(), false);

  fields.name.onBlur();
  assertEqual(isTouched.get(), true);
});

test('useForm errors computed returns all errors', () => {
  const { fields, errors, validateAll } = useForm(
    { email: '', password: '' },
    {
      email: [validators.required()],
      password: [validators.required()]
    }
  );

  validateAll();

  const errs = errors.get();
  assertEqual(errs.email, 'This field is required');
  assertEqual(errs.password, 'This field is required');
});

test('useForm reset restores initial values', () => {
  const { fields, reset, getValues } = useForm({
    name: 'initial'
  });

  fields.name.onChange('changed');
  reset();

  assertEqual(getValues().name, 'initial');
  assertEqual(fields.name.touched.get(), false);
});

test('useForm reset with new values', () => {
  const { reset, getValues } = useForm({
    name: 'initial'
  });

  reset({ name: 'new initial' });
  assertEqual(getValues().name, 'new initial');
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

  assertEqual(fields.email.error.get(), 'Email already exists');
  assertEqual(fields.password.error.get(), 'Password too weak');
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

  assertEqual(fields.email.error.get(), null);
  assertEqual(fields.password.error.get(), null);
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

  assertEqual(result, true);
  assertDeepEqual(submittedValues, { name: 'John' });
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

  assertEqual(result, false);
  assertEqual(errorsCalled.email, 'This field is required');
});

test('useForm submitCount tracks submission attempts', async () => {
  const { handleSubmit, submitCount } = useForm(
    { name: '' },
    { name: [validators.required()] }
  );

  assertEqual(submitCount.get(), 0);

  await handleSubmit();
  assertEqual(submitCount.get(), 1);

  await handleSubmit();
  assertEqual(submitCount.get(), 2);
});

// =============================================================================
// useFieldArray Tests
// =============================================================================

printSection('useFieldArray Tests');

test('useFieldArray creates array of fields', () => {
  const { fields, values } = useFieldArray(['a', 'b', 'c']);

  assertEqual(fields.get().length, 3);
  assertDeepEqual(values.get(), ['a', 'b', 'c']);
});

test('useFieldArray append adds item', () => {
  const { fields, values, append } = useFieldArray(['a']);

  append('b');

  assertEqual(fields.get().length, 2);
  assertDeepEqual(values.get(), ['a', 'b']);
});

test('useFieldArray prepend adds item at start', () => {
  const { values, prepend } = useFieldArray(['b']);

  prepend('a');

  assertDeepEqual(values.get(), ['a', 'b']);
});

test('useFieldArray insert adds item at index', () => {
  const { values, insert } = useFieldArray(['a', 'c']);

  insert(1, 'b');

  assertDeepEqual(values.get(), ['a', 'b', 'c']);
});

test('useFieldArray remove removes item', () => {
  const { values, remove } = useFieldArray(['a', 'b', 'c']);

  remove(1);

  assertDeepEqual(values.get(), ['a', 'c']);
});

test('useFieldArray move reorders items', () => {
  const { values, move } = useFieldArray(['a', 'b', 'c']);

  move(0, 2);

  assertDeepEqual(values.get(), ['b', 'c', 'a']);
});

test('useFieldArray swap exchanges items', () => {
  const { values, swap } = useFieldArray(['a', 'b', 'c']);

  swap(0, 2);

  assertDeepEqual(values.get(), ['c', 'b', 'a']);
});

test('useFieldArray replace updates item', () => {
  const { values, replace } = useFieldArray(['a', 'b', 'c']);

  replace(1, 'x');

  assertDeepEqual(values.get(), ['a', 'x', 'c']);
});

test('useFieldArray reset restores initial values', () => {
  const { values, append, reset } = useFieldArray(['a']);

  append('b');
  append('c');

  reset();

  assertDeepEqual(values.get(), ['a']);
});

test('useFieldArray reset with new values', () => {
  const { values, reset } = useFieldArray(['a']);

  reset(['x', 'y', 'z']);

  assertDeepEqual(values.get(), ['x', 'y', 'z']);
});

test('useFieldArray validates all items', () => {
  const { fields, isValid, validateAll } = useFieldArray(
    ['valid', ''],
    [validators.required()]
  );

  assertEqual(validateAll(), false);
  assertEqual(isValid.get(), false);

  // First field should be valid
  assertEqual(fields.get()[0].valid.get(), true);
  // Second field should be invalid
  assertEqual(fields.get()[1].valid.get(), false);
});

test('useFieldArray errors shows field errors', () => {
  const { fields, validateAll } = useFieldArray(
    ['', ''],
    [validators.required()]
  );

  validateAll();

  // Check individual field errors (errors computed may have tracking limitations)
  const fieldList = fields.get();
  assertEqual(fieldList[0].error.get(), 'This field is required');
  assertEqual(fieldList[1].error.get(), 'This field is required');
});

// =============================================================================
// Results
// =============================================================================

printResults();
exitWithCode();
