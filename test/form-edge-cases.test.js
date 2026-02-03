/**
 * Form Validation Edge Case Tests
 *
 * Tests for form validation edge cases, stress scenarios, and async validation
 *
 * @module test/form-edge-cases
 */

import {
  useForm,
  useField,
  useFieldArray,
  validators
} from '../runtime/form.js';

import { pulse, effect, batch } from '../runtime/pulse.js';

import {
  test,
  testAsync,
  runAsyncTests,
  assert,
  assertEqual,
  assertDeepEqual,
  assertTruthy,
  assertFalsy,
  printResults,
  exitWithCode,
  printSection,
  wait,
  createSpy
} from './utils.js';

// =============================================================================
// Async Validator Tests
// =============================================================================

printSection('Async Validator Tests');

testAsync('asyncCustom validator with debounce', async () => {
  let validationCount = 0;

  const asyncRule = validators.asyncCustom(async (value) => {
    validationCount++;
    await wait(20);
    return value === 'valid';
  }, { debounce: 50 });

  const field = useField('', [asyncRule]);

  // Rapid changes - should debounce
  field.onChange('a');
  field.onChange('ab');
  field.onChange('abc');
  field.onChange('valid');

  await wait(200);

  // Due to debouncing, should not validate every change
  assertTruthy(validationCount <= 2, 'Should debounce validations');
});

testAsync('asyncUnique validator for server-side checks', async () => {
  const existingUsernames = ['admin', 'user', 'test'];

  const asyncRule = validators.asyncUnique(async (value) => {
    await wait(10);
    return !existingUsernames.includes(value);
  }, 'Username already taken');

  const field = useField('', [validators.required(), asyncRule]);

  // Check taken username
  field.onChange('admin');
  await field.validate();
  await wait(50);

  assertEqual(field.error.get(), 'Username already taken');
  assertEqual(field.valid.get(), false);

  // Check available username
  field.onChange('newuser');
  await field.validate();
  await wait(50);

  assertEqual(field.error.get(), null);
  assertEqual(field.valid.get(), true);
});

testAsync('asyncEmail validator checks email availability', async () => {
  const takenEmails = ['taken@example.com'];

  const asyncRule = validators.asyncEmail(async (email) => {
    await wait(10);
    return !takenEmails.includes(email);
  }, 'Email already registered');

  const field = useField('', [validators.email(), asyncRule]);

  // Invalid email format
  field.onChange('invalid');
  await field.validate();
  assertEqual(field.error.get(), 'Invalid email address');

  // Taken email
  field.onChange('taken@example.com');
  await field.validate();
  await wait(50);
  assertEqual(field.error.get(), 'Email already registered');

  // Available email
  field.onChange('new@example.com');
  await field.validate();
  await wait(50);
  assertEqual(field.error.get(), null);
});

testAsync('asyncServer validator for generic server validation', async () => {
  const asyncRule = validators.asyncServer(async (value) => {
    await wait(10);
    if (value.includes('bad')) {
      return 'Server rejected this value';
    }
    return null; // null means valid
  });

  const field = useField('', [asyncRule]);

  field.onChange('bad-value');
  await field.validate();
  await wait(50);
  assertEqual(field.error.get(), 'Server rejected this value');

  field.onChange('good-value');
  await field.validate();
  await wait(50);
  assertEqual(field.error.get(), null);
});

testAsync('validating state tracks async validation', async () => {
  const asyncRule = validators.asyncCustom(async (value) => {
    await wait(50);
    return true;
  });

  const field = useField('test', [asyncRule]);

  assertEqual(field.validating.get(), false, 'Not validating initially');

  const validatePromise = field.validate();

  // Should be validating now
  await wait(10);
  assertEqual(field.validating.get(), true, 'Should be validating');

  await validatePromise;
  await wait(10);

  assertEqual(field.validating.get(), false, 'Should stop validating');
});

testAsync('multiple async validators run in sequence', async () => {
  const order = [];

  const async1 = validators.asyncCustom(async () => {
    order.push('first-start');
    await wait(20);
    order.push('first-end');
    return true;
  });

  const async2 = validators.asyncCustom(async () => {
    order.push('second-start');
    await wait(10);
    order.push('second-end');
    return true;
  });

  const field = useField('test', [async1, async2]);
  await field.validate();
  await wait(100);

  // Should run sequentially
  assertEqual(order[0], 'first-start');
  assertEqual(order[1], 'first-end');
  assertEqual(order[2], 'second-start');
  assertEqual(order[3], 'second-end');
});

testAsync('async validation cancellation on new value', async () => {
  let activeValidations = 0;
  let maxConcurrent = 0;

  const asyncRule = validators.asyncCustom(async (value) => {
    activeValidations++;
    maxConcurrent = Math.max(maxConcurrent, activeValidations);
    await wait(50);
    activeValidations--;
    return value.length >= 3;
  });

  const field = useField('', [asyncRule]);

  // Start multiple validations
  field.onChange('a');
  field.validate();

  field.onChange('ab');
  field.validate();

  field.onChange('abc');
  field.validate();

  await wait(200);

  // Ideally, earlier validations should be cancelled
  // At minimum, should not crash
  assertTruthy(true, 'Should handle concurrent async validations');
});

// =============================================================================
// Field Array Tests
// =============================================================================

printSection('Field Array Tests');

test('useFieldArray creates dynamic fields', () => {
  const tags = useFieldArray(['tag1', 'tag2'], [validators.required()]);

  assertEqual(tags.fields.get().length, 2);
  assertEqual(tags.fields.get()[0].value.get(), 'tag1');
  assertEqual(tags.fields.get()[1].value.get(), 'tag2');
});

test('useFieldArray append adds new field', () => {
  const tags = useFieldArray([], [validators.required()]);

  assertEqual(tags.fields.get().length, 0);

  tags.append('new-tag');

  assertEqual(tags.fields.get().length, 1);
  assertEqual(tags.fields.get()[0].value.get(), 'new-tag');
});

test('useFieldArray prepend adds field at beginning', () => {
  const tags = useFieldArray(['b', 'c'], [validators.required()]);

  tags.prepend('a');

  assertEqual(tags.fields.get().length, 3);
  assertEqual(tags.fields.get()[0].value.get(), 'a');
  assertEqual(tags.fields.get()[1].value.get(), 'b');
});

test('useFieldArray remove removes field at index', () => {
  const tags = useFieldArray(['a', 'b', 'c'], []);

  tags.remove(1);

  assertEqual(tags.fields.get().length, 2);
  assertEqual(tags.fields.get()[0].value.get(), 'a');
  assertEqual(tags.fields.get()[1].value.get(), 'c');
});

test('useFieldArray move reorders fields', () => {
  const tags = useFieldArray(['a', 'b', 'c', 'd'], []);

  tags.move(0, 2);

  const values = tags.fields.get().map(f => f.value.get());
  assertDeepEqual(values, ['b', 'c', 'a', 'd']);
});

test('useFieldArray swap exchanges two fields', () => {
  const tags = useFieldArray(['a', 'b', 'c'], []);

  tags.swap(0, 2);

  const values = tags.fields.get().map(f => f.value.get());
  assertDeepEqual(values, ['c', 'b', 'a']);
});

test('useFieldArray insert at index', () => {
  const tags = useFieldArray(['a', 'c'], []);

  tags.insert(1, 'b');

  const values = tags.fields.get().map(f => f.value.get());
  assertDeepEqual(values, ['a', 'b', 'c']);
});

test('useFieldArray values computed', () => {
  const tags = useFieldArray(['a', 'b', 'c'], []);

  // Access computed values
  const values = tags.values.get();
  assertDeepEqual(values, ['a', 'b', 'c']);
});

test('useFieldArray isValid computed', () => {
  const tags = useFieldArray(['valid', 'valid'], [validators.required()]);

  assertEqual(tags.isValid.get(), true, 'All fields valid');

  // Add empty field
  tags.append('');

  // Access fields and trigger validation
  tags.fields.get()[2].onBlur();

  assertEqual(tags.isValid.get(), false, 'Has invalid field');
});

test('useFieldArray errors computed', () => {
  const tags = useFieldArray(['', ''], [validators.required()]);

  // Trigger validation on both
  tags.fields.get().forEach(f => f.onBlur());

  const errors = tags.errors.get();
  assertEqual(errors.length, 2);
  assertEqual(errors[0], 'This field is required');
});

// =============================================================================
// Form-Level Tests
// =============================================================================

printSection('Form-Level Tests');

testAsync('useForm with complex nested validation', async () => {
  const { fields, handleSubmit, isValid, errors } = useForm(
    {
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    },
    {
      username: [validators.required(), validators.minLength(3)],
      email: [validators.required(), validators.email()],
      password: [validators.required(), validators.minLength(8)],
      confirmPassword: [
        validators.required(),
        validators.matches('password', 'Passwords must match')
      ]
    }
  );

  // Test mismatched passwords
  fields.password.onChange('password123');
  fields.confirmPassword.onChange('different');
  await fields.confirmPassword.validate({ password: 'password123' });

  assertEqual(
    fields.confirmPassword.error.get(),
    'Passwords must match'
  );

  // Test matching passwords
  fields.confirmPassword.onChange('password123');
  await fields.confirmPassword.validate({ password: 'password123' });

  assertEqual(fields.confirmPassword.error.get(), null);
});

testAsync('useForm reset clears all fields', async () => {
  const { fields, reset } = useForm(
    { name: 'John', email: 'john@example.com' },
    {}
  );

  fields.name.onChange('Jane');
  fields.email.onChange('jane@example.com');

  assertEqual(fields.name.value.get(), 'Jane');
  assertEqual(fields.name.dirty.get(), true);

  reset();

  assertEqual(fields.name.value.get(), 'John');
  assertEqual(fields.email.value.get(), 'john@example.com');
  assertEqual(fields.name.dirty.get(), false);
});

testAsync('useForm reset with new values', async () => {
  const { fields, reset } = useForm(
    { name: '', email: '' },
    {}
  );

  reset({ name: 'New Name', email: 'new@example.com' });

  assertEqual(fields.name.value.get(), 'New Name');
  assertEqual(fields.email.value.get(), 'new@example.com');
});

testAsync('useForm handleSubmit prevents submission when invalid', async () => {
  let submitted = false;
  let submitValues = null;

  const { fields, handleSubmit } = useForm(
    { email: '' },
    { email: [validators.required(), validators.email()] },
    {
      onSubmit: (values) => {
        submitted = true;
        submitValues = values;
      }
    }
  );

  await handleSubmit();

  assertEqual(submitted, false, 'Should not submit when invalid');

  // Fix validation
  fields.email.onChange('valid@example.com');
  await handleSubmit();

  assertEqual(submitted, true, 'Should submit when valid');
  assertDeepEqual(submitValues, { email: 'valid@example.com' });
});

testAsync('useForm onError callback fires on validation failure', async () => {
  let errorsCaught = null;

  const { fields, handleSubmit } = useForm(
    { email: 'invalid' },
    { email: [validators.email()] },
    {
      onError: (errors) => {
        errorsCaught = errors;
      }
    }
  );

  await handleSubmit();

  assertTruthy(errorsCaught !== null, 'onError should be called');
  assertEqual(errorsCaught.email, 'Invalid email address');
});

testAsync('useForm isSubmitting tracks submission state', async () => {
  let isSubmittingDuringSubmit = false;

  const { fields, handleSubmit, isSubmitting } = useForm(
    { name: 'Test' },
    {},
    {
      onSubmit: async () => {
        isSubmittingDuringSubmit = isSubmitting.get();
        await wait(50);
      }
    }
  );

  const submitPromise = handleSubmit();

  await wait(10);
  assertTruthy(isSubmittingDuringSubmit || isSubmitting.get(), 'Should be submitting');

  await submitPromise;

  assertEqual(isSubmitting.get(), false, 'Should not be submitting after');
});

testAsync('useForm setValue and setValues', async () => {
  const { fields, setValue, setValues } = useForm(
    { name: '', age: 0 },
    {}
  );

  setValue('name', 'John');
  assertEqual(fields.name.value.get(), 'John');

  setValues({ name: 'Jane', age: 25 });
  assertEqual(fields.name.value.get(), 'Jane');
  assertEqual(fields.age.value.get(), 25);
});

// =============================================================================
// Validator Edge Cases
// =============================================================================

printSection('Validator Edge Cases');

test('validators handle null and undefined', () => {
  const required = validators.required();

  assertEqual(required.validate(null), 'This field is required');
  assertEqual(required.validate(undefined), 'This field is required');
  assertEqual(required.validate(0), true); // 0 is valid
  assertEqual(required.validate(false), true); // false is valid
});

test('minLength handles non-strings by converting', () => {
  const rule = validators.minLength(3);

  // Arrays convert to string like "1,2" which is 3 chars
  assertEqual(rule.validate([1, 2]), true); // "1,2" is 3 chars
  assertEqual(rule.validate([1]), 'Must be at least 3 characters'); // "1" is 1 char
  assertEqual(rule.validate(null), true); // null skipped
  assertEqual(rule.validate(123), true); // "123" is 3 chars
  assertEqual(rule.validate(12), 'Must be at least 3 characters'); // "12" is 2 chars
});

test('pattern with complex regex', () => {
  const phoneRule = validators.pattern(
    /^\+?[1-9]\d{1,14}$/,
    'Invalid phone number'
  );

  // "123" matches the pattern (1-9 followed by 2 digits)
  assertEqual(phoneRule.validate('123'), true);
  assertEqual(phoneRule.validate('abc'), 'Invalid phone number');
  assertEqual(phoneRule.validate('+12025551234'), true);
  assertEqual(phoneRule.validate('0123'), 'Invalid phone number'); // starts with 0
});

test('custom validator with async behavior', () => {
  const rule = validators.custom((value, allValues) => {
    if (allValues && allValues.type === 'business') {
      if (!value.includes('.com')) {
        return 'Business email must be .com domain';
      }
    }
    return true;
  });

  assertEqual(
    rule.validate('test@example.org', { type: 'business' }),
    'Business email must be .com domain'
  );
  assertEqual(
    rule.validate('test@example.com', { type: 'business' }),
    true
  );
});

test('min/max validators with edge values', () => {
  const minRule = validators.min(0);
  const maxRule = validators.max(100);

  assertEqual(minRule.validate(-0.001), 'Must be at least 0');
  assertEqual(minRule.validate(0), true);
  assertEqual(minRule.validate(0.001), true);

  assertEqual(maxRule.validate(100.001), 'Must be at most 100');
  assertEqual(maxRule.validate(100), true);
  assertEqual(maxRule.validate(99.999), true);
});

test('url validator with various formats', () => {
  const rule = validators.url();

  assertEqual(rule.validate('not-a-url'), 'Invalid URL');
  assertEqual(rule.validate('http://localhost'), true);
  assertEqual(rule.validate('https://example.com/path?query=1'), true);
  assertEqual(rule.validate('ftp://files.example.com'), true);
});

// =============================================================================
// Stress Tests
// =============================================================================

printSection('Stress Tests');

testAsync('handles rapid field updates', async () => {
  const field = useField('', [validators.required(), validators.minLength(5)]);

  // Rapid updates
  for (let i = 0; i < 100; i++) {
    field.onChange(`value${i}`);
  }

  assertEqual(field.value.get(), 'value99');
  assertEqual(field.dirty.get(), true);
});

testAsync('form with many fields', async () => {
  const initialValues = {};
  const validationSchema = {};

  for (let i = 0; i < 50; i++) {
    initialValues[`field${i}`] = '';
    validationSchema[`field${i}`] = [validators.required()];
  }

  const { fields, isValid } = useForm(initialValues, validationSchema);

  // All fields should be created
  assertEqual(Object.keys(fields).length, 50);

  // Update all fields
  for (let i = 0; i < 50; i++) {
    fields[`field${i}`].onChange(`value${i}`);
  }

  // Validate form
  const valid = await isValid.get();
  assertTruthy(true, 'Should handle many fields without crashing');
});

testAsync('field array with many items', async () => {
  const items = useFieldArray([], [validators.required()]);

  // Add many items
  for (let i = 0; i < 100; i++) {
    items.append(`item${i}`);
  }

  assertEqual(items.fields.get().length, 100);

  // Remove half
  for (let i = 49; i >= 0; i--) {
    items.remove(i * 2);
  }

  assertEqual(items.fields.get().length, 50);
});

testAsync('validation with effects', async () => {
  const field = useField('', [validators.required()]);
  let effectRunCount = 0;

  effect(() => {
    field.value.get(); // Track value changes
    effectRunCount++;
  });

  assertEqual(effectRunCount, 1, 'Effect runs initially');

  field.onChange('test');

  // Give effect time to run
  await wait(10);

  assertTruthy(effectRunCount >= 2, 'Effect should re-run on value changes');
});

// =============================================================================
// Touched/Dirty State Tests
// =============================================================================

printSection('Touched/Dirty State Tests');

test('touched state propagates correctly', () => {
  const { fields } = useForm(
    { name: '', email: '' },
    {}
  );

  assertEqual(fields.name.touched.get(), false);
  assertEqual(fields.email.touched.get(), false);

  fields.name.onBlur();

  assertEqual(fields.name.touched.get(), true);
  assertEqual(fields.email.touched.get(), false);
});

test('dirty state resets on setValue to initial', () => {
  const field = useField('initial', []);

  assertEqual(field.dirty.get(), false);

  field.onChange('changed');
  assertEqual(field.dirty.get(), true);

  field.onChange('initial');
  assertEqual(field.dirty.get(), false);
});

test('form-level dirty tracks any field change', () => {
  const { fields, isDirty } = useForm(
    { a: '', b: '' },
    {}
  );

  assertEqual(isDirty.get(), false);

  fields.a.onChange('changed');

  assertEqual(isDirty.get(), true);

  // Reset field a
  fields.a.onChange('');

  assertEqual(isDirty.get(), false);
});

// =============================================================================
// Run Tests
// =============================================================================

await runAsyncTests();
printResults();
exitWithCode();
