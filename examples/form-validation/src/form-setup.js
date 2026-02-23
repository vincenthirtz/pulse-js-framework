/**
 * Form Setup Module
 * Extracts useForm(), useFileField(), and computed values
 * for import by the App.pulse component.
 */

import { pulse, computed } from '../../../runtime/index.js';
import { useForm, useFileField, validators } from '../../../runtime/form.js';

// ── Registration Form ───────────────────────────────────────────────

export const {
  fields,
  handleSubmit,
  isValid,
  isValidating,
  isSubmitting,
  submitCount,
  submitError,
  errors,
  reset,
  hasDraft,
  clearDraft
} = useForm(
  {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    bio: '',
    role: '',
    acceptTerms: false,
    newsletter: false
  },
  {
    username: [
      validators.required('Username is required'),
      validators.minLength(3, 'Must be at least 3 characters'),
      validators.maxLength(20, 'Must be at most 20 characters'),
      validators.pattern(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
      validators.asyncCustom(async (value) => {
        await new Promise(r => setTimeout(r, 800));
        const taken = ['admin', 'root', 'test', 'user', 'pulse'];
        return !taken.includes(value.toLowerCase()) || 'Username is already taken';
      }, { debounce: 500 })
    ],
    email: [
      validators.required('Email is required'),
      validators.email('Please enter a valid email address')
    ],
    password: [
      validators.required('Password is required'),
      validators.minLength(8, 'Must be at least 8 characters'),
      validators.pattern(/[A-Z]/, 'Must contain at least one uppercase letter'),
      validators.pattern(/[0-9]/, 'Must contain at least one number')
    ],
    confirmPassword: [
      validators.required('Please confirm your password'),
      validators.matches('password', 'Passwords do not match')
    ],
    age: [
      validators.when(
        (value) => value !== '',
        [validators.min(13, 'Must be at least 13 years old'), validators.max(120, 'Invalid age')]
      )
    ],
    role: [
      validators.required('Please select a role')
    ],
    acceptTerms: [
      validators.custom((value) => value === true || 'You must accept the terms')
    ]
  },
  {
    persist: true,
    persistKey: 'pulse-form-demo',
    persistDebounce: 500,
    persistExclude: ['password', 'confirmPassword'],
    onSubmit: async (values) => {
      await new Promise(r => setTimeout(r, 1500));
      if (values.username === 'error') {
        throw new Error('Server error: please try again later');
      }
      console.log('Form submitted:', values);
    },
    onError: (errs) => {
      console.log('Validation errors:', errs);
    }
  }
);

// ── Avatar File Upload ──────────────────────────────────────────────

export const avatar = useFileField({
  accept: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  maxSize: 2 * 1024 * 1024,
  multiple: false,
  preview: true
});

// ── Derived State ───────────────────────────────────────────────────

export const passwordStrength = computed(() => {
  const pw = fields.password.value.get();
  if (!pw) return null;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return 'weak';
  if (score <= 3) return 'medium';
  return 'strong';
});

export const submittedSuccessfully = pulse(false);
