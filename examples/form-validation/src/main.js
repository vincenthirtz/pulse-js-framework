/**
 * Pulse Form Validation Example
 *
 * Demonstrates the form module (runtime/form.js):
 * - useForm() with field-level and form-level validation
 * - Built-in validators (required, email, minLength, pattern, etc.)
 * - Conditional validators (when/unless)
 * - Async validation (simulated username availability check)
 * - useFileField() for file uploads with drag-and-drop
 * - Draft persistence (auto-save to localStorage)
 * - Submission state tracking (isSubmitting, submitCount, submitError)
 * - Password strength indicator
 */

import { pulse, effect, computed, el, text, mount, on, bind } from '../../../runtime/index.js';
import { useForm, useField, useFileField, validators } from '../../../runtime/form.js';

// ── Registration Form ───────────────────────────────────────────────

const {
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
  // Initial values
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
  // Validation schema (per-field validators)
  {
    username: [
      validators.required('Username is required'),
      validators.minLength(3, 'Must be at least 3 characters'),
      validators.maxLength(20, 'Must be at most 20 characters'),
      validators.pattern(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
      // Async validator: simulate checking if username is taken
      validators.asyncCustom(async (value) => {
        // Simulate API call delay
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
  // Form options
  {
    persist: true,
    persistKey: 'pulse-form-demo',
    persistDebounce: 500,
    persistExclude: ['password', 'confirmPassword'],
    onSubmit: async (values) => {
      // Simulate API call
      await new Promise(r => setTimeout(r, 1500));

      // Simulate occasional server error
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

const avatar = useFileField({
  accept: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  maxSize: 2 * 1024 * 1024, // 2MB
  multiple: false,
  preview: true
});

// ── Derived State ───────────────────────────────────────────────────

// Password strength indicator
const passwordStrength = computed(() => {
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

const submittedSuccessfully = pulse(false);

// ── UI Helpers ──────────────────────────────────────────────────────

function createField(name, label, type = 'text', opts = {}) {
  const field = fields[name];
  const container = el('.field');

  // Label
  container.appendChild(el('label', { for: `field-${name}` }, label));

  // Input element
  let input;
  if (type === 'textarea') {
    input = el('textarea', {
      id: `field-${name}`,
      placeholder: opts.placeholder || '',
      rows: opts.rows || 3
    });
  } else if (type === 'select') {
    input = el('select', { id: `field-${name}` });
    if (opts.options) {
      input.appendChild(el('option', { value: '' }, opts.placeholder || 'Select...'));
      opts.options.forEach(opt => {
        input.appendChild(el('option', { value: opt.value }, opt.label));
      });
    }
  } else if (type === 'checkbox') {
    const wrapper = el('.checkbox-field');
    input = el(`input[type=checkbox]`, { id: `field-${name}` });
    wrapper.appendChild(input);
    wrapper.appendChild(el('label', { for: `field-${name}` }, opts.checkboxLabel || label));
    container.textContent = '';
    container.appendChild(wrapper);
  } else {
    input = el(`input[type=${type}]`, {
      id: `field-${name}`,
      placeholder: opts.placeholder || '',
      autocomplete: opts.autocomplete || 'off'
    });
  }

  // Bind value and events
  if (type === 'checkbox') {
    effect(() => {
      input.checked = field.value.get();
    });
    on(input, 'change', (e) => field.onChange(e));
  } else {
    effect(() => {
      input.value = field.value.get();
    });
    on(input, 'input', (e) => field.onChange(e));
  }
  on(input, 'blur', () => field.onBlur());

  if (type !== 'checkbox') {
    container.appendChild(input);
  }

  // Validation state styling
  effect(() => {
    const err = field.error.get();
    const touched = field.touched.get();
    const dirty = field.dirty.get();
    container.classList.toggle('error', !!(touched && err));
    container.classList.toggle('valid', !!(dirty && !err && touched));
  });

  // Validating indicator (for async validators)
  if (field.validating) {
    const validatingEl = el('span.validating', 'Checking...');
    container.appendChild(validatingEl);
    effect(() => {
      validatingEl.style.display = field.validating.get() ? 'block' : 'none';
    });
  }

  // Error message
  const errorEl = el('span.error-message');
  container.appendChild(errorEl);
  effect(() => {
    const err = field.error.get();
    const touched = field.touched.get();
    errorEl.textContent = (touched && err) ? err : '';
    errorEl.style.display = (touched && err) ? 'flex' : 'none';
  });

  // Hint text
  if (opts.hint) {
    container.appendChild(el('span.field-hint', opts.hint));
  }

  return container;
}

// ── Build UI ────────────────────────────────────────────────────────

function App() {
  const app = el('.app');

  // Header
  app.appendChild(el('h1', 'Form Validation'));
  app.appendChild(el('p.subtitle', 'Powered by Pulse useForm() with sync & async validators'));

  // Registration form card
  const card = el('.form-card');
  card.appendChild(el('h2', 'Create Account'));

  // Username with async check
  card.appendChild(createField('username', 'Username', 'text', {
    placeholder: 'Choose a username',
    hint: 'Letters, numbers, underscore. Try "admin" to see async error.'
  }));

  // Email
  card.appendChild(createField('email', 'Email', 'email', {
    placeholder: 'you@example.com',
    autocomplete: 'email'
  }));

  // Password with strength meter
  const pwField = createField('password', 'Password', 'password', {
    placeholder: 'At least 8 chars, 1 uppercase, 1 number'
  });
  const strengthBar = el('.password-strength');
  const strengthInner = el('.password-strength-bar');
  strengthBar.appendChild(strengthInner);
  pwField.appendChild(strengthBar);
  effect(() => {
    const str = passwordStrength.get();
    strengthInner.className = `password-strength-bar ${str || ''}`;
    strengthBar.style.display = fields.password.value.get() ? 'block' : 'none';
  });
  card.appendChild(pwField);

  // Confirm password
  card.appendChild(createField('confirmPassword', 'Confirm Password', 'password', {
    placeholder: 'Re-enter your password'
  }));

  // Age + Role in a row
  const row = el('.field-row');
  row.appendChild(createField('age', 'Age (optional)', 'number', {
    placeholder: '18',
    hint: 'Must be 13+ if provided'
  }));
  row.appendChild(createField('role', 'Role', 'select', {
    placeholder: 'Select a role',
    options: [
      { value: 'developer', label: 'Developer' },
      { value: 'designer', label: 'Designer' },
      { value: 'manager', label: 'Manager' },
      { value: 'other', label: 'Other' }
    ]
  }));
  card.appendChild(row);

  // Bio
  card.appendChild(createField('bio', 'Bio (optional)', 'textarea', {
    placeholder: 'Tell us about yourself...',
    rows: 3
  }));

  // Avatar upload
  const avatarField = el('.field');
  avatarField.appendChild(el('label', 'Avatar (optional)'));

  const dropzone = el('.dropzone');
  const fileInput = el('input[type=file]', { accept: 'image/*' });
  dropzone.appendChild(fileInput);
  dropzone.appendChild(el('p', 'Drop an image here or click to upload'));
  dropzone.appendChild(el('span.field-hint', 'PNG, JPEG, GIF, WebP. Max 2MB.'));

  on(fileInput, 'change', avatar.onChange);
  on(dropzone, 'click', () => fileInput.click());
  on(dropzone, 'dragenter', avatar.onDragEnter);
  on(dropzone, 'dragover', avatar.onDragOver);
  on(dropzone, 'dragleave', avatar.onDragLeave);
  on(dropzone, 'drop', avatar.onDrop);

  effect(() => {
    dropzone.classList.toggle('drag-over', avatar.isDragging.get());
  });

  avatarField.appendChild(dropzone);

  // File preview
  const previewContainer = el('.file-preview');
  effect(() => {
    const files = avatar.files.get();
    const previews = avatar.previews.get();
    previewContainer.textContent = '';

    if (files.length > 0) {
      previewContainer.style.display = 'flex';
      if (previews[0]) {
        previewContainer.appendChild(el('img', { src: previews[0], alt: 'Avatar preview' }));
      }
      const info = el('.file-info');
      info.appendChild(el('div', files[0].name));
      info.appendChild(el('div', `${(files[0].size / 1024).toFixed(1)} KB`));
      previewContainer.appendChild(info);

      const removeBtn = el('button.file-remove', { 'aria-label': 'Remove file' }, '\u00d7');
      on(removeBtn, 'click', () => avatar.clear());
      previewContainer.appendChild(removeBtn);
    } else {
      previewContainer.style.display = 'none';
    }
  });
  avatarField.appendChild(previewContainer);

  // Avatar error
  const avatarError = el('span.error-message');
  effect(() => {
    const err = avatar.error.get();
    avatarError.textContent = err || '';
    avatarError.style.display = err ? 'flex' : 'none';
  });
  avatarField.appendChild(avatarError);

  card.appendChild(avatarField);

  // Terms checkbox
  card.appendChild(createField('acceptTerms', 'Terms', 'checkbox', {
    checkboxLabel: 'I accept the Terms of Service and Privacy Policy'
  }));

  // Newsletter checkbox (no validation)
  card.appendChild(createField('newsletter', 'Newsletter', 'checkbox', {
    checkboxLabel: 'Subscribe to the newsletter (optional)'
  }));

  // Form actions
  const actions = el('.form-actions');

  // Draft indicator
  const draftBadge = el('span.draft-badge', 'Draft saved');
  effect(() => {
    draftBadge.style.display = hasDraft.get() ? 'inline-flex' : 'none';
  });
  actions.appendChild(draftBadge);

  const btnGroup = el('.btn-group');

  // Clear draft button
  const clearBtn = el('button.btn.btn-secondary', 'Clear Draft');
  on(clearBtn, 'click', () => { clearDraft(); reset(); });
  effect(() => {
    clearBtn.style.display = hasDraft.get() ? 'inline-block' : 'none';
  });
  btnGroup.appendChild(clearBtn);

  // Reset button
  const resetBtn = el('button.btn.btn-secondary', 'Reset');
  on(resetBtn, 'click', () => { reset(); avatar.clear(); submittedSuccessfully.set(false); });
  btnGroup.appendChild(resetBtn);

  // Submit button
  const submitBtn = el('button.btn.btn-primary[type=submit]', 'Create Account');
  effect(() => {
    const submitting = isSubmitting.get();
    const valid = isValid.get();
    const validating = isValidating.get();
    submitBtn.disabled = submitting || validating;
    submitBtn.textContent = submitting ? 'Submitting...' : validating ? 'Validating...' : 'Create Account';
  });
  on(submitBtn, 'click', async (e) => {
    e.preventDefault();
    submittedSuccessfully.set(false);
    await handleSubmit();
    if (!submitError.get() && submitCount.get() > 0) {
      submittedSuccessfully.set(true);
    }
  });
  btnGroup.appendChild(submitBtn);

  actions.appendChild(btnGroup);
  card.appendChild(actions);

  // Submit status
  const statusEl = el('.submit-status');
  effect(() => {
    const err = submitError.get();
    const success = submittedSuccessfully.get();
    if (err) {
      statusEl.className = 'submit-status error';
      statusEl.textContent = err;
      statusEl.style.display = 'block';
    } else if (success) {
      statusEl.className = 'submit-status success';
      statusEl.textContent = 'Account created successfully!';
      statusEl.style.display = 'block';
    } else {
      statusEl.style.display = 'none';
    }
  });
  card.appendChild(statusEl);

  // Form stats
  const stats = el('.form-stats');
  const countStat = el('span');
  effect(() => {
    countStat.textContent = `Submissions: ${submitCount.get()}`;
  });
  stats.appendChild(countStat);

  const validStat = el('span');
  effect(() => {
    validStat.textContent = isValid.get() ? 'Valid' : 'Invalid';
    validStat.style.color = isValid.get() ? '#10b981' : '#ef4444';
  });
  stats.appendChild(validStat);

  card.appendChild(stats);
  app.appendChild(card);

  return app;
}

// Mount
mount('#app', App());

console.log('Pulse Form Validation Example');
console.log('Features: useForm, validators, useFileField, draft persistence');
