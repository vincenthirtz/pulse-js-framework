/**
 * Form Benchmarks - Pulse Framework
 *
 * Measures: form creation, validation, field updates, reset, submit
 *
 * @module benchmarks/form
 */

import { useForm, validators } from '../runtime/form.js';
import { bench, suite } from './utils.js';

export async function runFormBenchmarks() {
  return await suite('Form', [
    // Form creation - small
    bench('useForm() 5 fields', () => {
      useForm(
        { name: '', email: '', password: '', age: '', city: '' },
        {
          name: [validators.required()],
          email: [validators.required(), validators.email()],
          password: [validators.required(), validators.minLength(8)],
          age: [validators.min(0), validators.max(150)],
          city: [validators.required()]
        }
      );
    }),

    // Form creation - large
    bench('useForm() 20 fields', () => {
      const values = {};
      const schema = {};
      for (let i = 0; i < 20; i++) {
        values[`field${i}`] = '';
        schema[`field${i}`] = [validators.required(), validators.minLength(2)];
      }
      useForm(values, schema);
    }, { iterations: 50 }),

    // Single validator execution
    bench('validators.required() (1000x)', () => {
      const rule = validators.required();
      for (let i = 0; i < 1000; i++) {
        rule.validate('');
        rule.validate('value');
      }
    }),

    // Validator chain
    bench('validator chain 5 rules (1000x)', () => {
      const rules = [
        validators.required(),
        validators.minLength(3),
        validators.maxLength(50),
        validators.pattern(/^[a-zA-Z0-9]+$/),
        validators.custom((v) => v !== 'admin' || 'Reserved name')
      ];
      for (let i = 0; i < 1000; i++) {
        for (const rule of rules) {
          rule.validate('testuser123');
        }
      }
    }),

    // Field updates with validation
    bench('field.setValue() with validation (500x)', () => {
      const { fields } = useForm(
        { email: '' },
        { email: [validators.required(), validators.email()] },
        { validateOnChange: true }
      );
      for (let i = 0; i < 500; i++) {
        fields.email.onChange(`user${i}@example.com`);
      }
    }),

    // Form reset
    bench('form reset() 10 fields', () => {
      const values = {};
      const schema = {};
      for (let i = 0; i < 10; i++) {
        values[`field${i}`] = '';
        schema[`field${i}`] = [validators.required()];
      }
      const form = useForm(values, schema);
      // Dirty the fields
      for (let i = 0; i < 10; i++) {
        form.fields[`field${i}`].onChange(`value${i}`);
      }
      for (let i = 0; i < 100; i++) {
        form.reset();
      }
    }),

    // Full submit cycle
    bench('handleSubmit() 10 fields', () => {
      const values = {};
      const schema = {};
      for (let i = 0; i < 10; i++) {
        values[`field${i}`] = `valid${i}`;
        schema[`field${i}`] = [validators.required(), validators.minLength(2)];
      }
      let submitted = false;
      const form = useForm(values, schema, {
        onSubmit: () => { submitted = true; }
      });
      for (let i = 0; i < 100; i++) {
        form.handleSubmit();
      }
    })
  ]);
}
