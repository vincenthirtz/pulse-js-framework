# API Reference: Forms & Async

> Load this context file when working on form validation, field management, or async operations.

### Form (runtime/form.js)

```javascript
import { useForm, useField, useFieldArray, useFileField, validators } from 'pulse-js-framework/runtime/form';

// Create a form with validation
const { fields, handleSubmit, isValid, errors, reset } = useForm(
  { email: '', password: '', confirmPassword: '' },
  {
    email: [validators.required(), validators.email()],
    password: [validators.required(), validators.minLength(8)],
    confirmPassword: [validators.required(), validators.matches('password', 'Passwords must match')]
  },
  {
    onSubmit: (values) => console.log('Submit:', values),
    onError: (errors) => console.log('Errors:', errors)
  }
);

// Bind to inputs
el('input', { value: fields.email.value.get(), onInput: fields.email.onChange, onBlur: fields.email.onBlur });
el('span.error', fields.email.error.get());

// Form state
isValid.get();        // true if all fields pass validation
errors.get();         // { email: 'Invalid email', _form: 'Form error', ... }
fields.email.dirty.get();    // true if value changed from initial
fields.email.touched.get();  // true if field was blurred

// ===== Submission State (v1.9.0) =====
const { isSubmitting, submitCount, submitError } = useForm(values, schema, {
  onSubmit: async (values) => {
    await api.createUser(values);  // If this throws, submitError is set
  }
});
isSubmitting.get();     // true during async onSubmit
submitCount.get();      // Number of submit attempts
submitError.get();      // null | 'Server error message' (set on submit failure, cleared on next submit)

// ===== Form-Level Validation (v1.9.0) =====
const { formError, clearFormError } = useForm(
  { password: '', confirmPassword: '' },
  { password: [validators.required()] },
  {
    validate: (allValues) => {
      const errors = {};
      if (allValues.password !== allValues.confirmPassword) {
        errors.confirmPassword = 'Passwords must match';
      }
      if (someGlobalCondition) {
        errors._form = 'Please fix the errors above';  // Form-level error
      }
      return errors;  // {} means valid
    },
    // validate can also be async:
    // validate: async (allValues) => { ... return errors; }
  }
);
formError.get();        // null | 'Form-level error message'
clearFormError();       // Clear form-level error only

// ===== Draft Persistence (v1.9.0) =====
const { hasDraft, clearDraft } = useForm(
  { email: '', message: '' },
  schema,
  {
    persist: true,                    // Enable draft persistence to localStorage
    persistKey: 'contact-form',       // localStorage key (default: 'pulse-form-draft')
    persistDebounce: 300,             // Debounce save delay (ms, default: 300)
    persistExclude: ['password'],     // Fields to never persist
    onSubmit: async (values) => {
      await api.submit(values);
      // Draft automatically cleared on successful submit
    }
  }
);
hasDraft.get();         // true if a saved draft exists in localStorage
clearDraft();           // Manually clear saved draft

// Built-in validators (sync)
validators.required(message?)
validators.minLength(length, message?)
validators.maxLength(length, message?)
validators.email(message?)
validators.url(message?)
validators.pattern(regex, message?)
validators.min(value, message?)
validators.max(value, message?)
validators.matches(fieldName, message?)
validators.custom((value, allValues) => true | 'error message')

// ===== Conditional Validators (v1.9.0) =====
// Run rules only when condition is true
validators.when(
  (value, allValues) => allValues.differentShipping,  // Condition
  [validators.required(), validators.minLength(5)]     // Rules to apply
)

// Run rules unless condition is true (inverse of when)
validators.unless(
  (value) => !value,               // Condition
  [validators.email()]              // Rules to apply when condition is false
)

// Conditional validators work with async rules too
validators.when(
  (value, allValues) => allValues.checkUniqueness,
  [validators.required(), validators.asyncUnique(checkFn)]
)

// Async validators (for server-side checks)
validators.asyncCustom(async (value) => true | 'error', { debounce: 300 })
validators.asyncEmail(async (email) => isAvailable, message?, { debounce: 300 })
validators.asyncUnique(async (value) => isUnique, message?, { debounce: 300 })
validators.asyncServer(async (value) => null | 'error', { debounce: 300 })

// Field with async validation
const username = useField('', [
  validators.required(),
  validators.asyncUnique(async (value) => {
    const res = await fetch(`/api/check-username?q=${value}`);
    return (await res.json()).available;
  }, 'Username is taken')
]);
username.validating.get();  // true while async validation runs

// Form with async validation
const { isValidating } = useForm(initialValues, schema, options);
isValidating.get();  // true if any field is validating

// Single field outside form
const email = useField('', [validators.required(), validators.email()]);

// Dynamic field arrays
const tags = useFieldArray(['tag1'], [validators.required()]);
tags.append('tag2');
tags.remove(0);
tags.move(0, 1);
tags.fields.get().forEach(field => field.value.get());

// ===== File Upload Field (v1.9.0) =====
const avatar = useFileField({
  accept: ['image/png', 'image/jpeg'],  // Allowed MIME types
  maxSize: 5 * 1024 * 1024,             // 5MB max
  multiple: false,                        // Single file (default)
  maxFiles: 10,                           // Max files when multiple=true
  preview: true,                          // Generate preview URLs for images
  validate: (files) => {                  // Custom validation
    if (files[0]?.size < 1024) return 'File too small';
    return true;
  }
});

// Reactive state
avatar.files.get();        // Pulse<File[]>
avatar.previews.get();     // Pulse<string[]> — object URLs for image files
avatar.error.get();        // Pulse<string|null>
avatar.touched.get();      // Pulse<boolean>
avatar.valid.get();        // Computed<boolean>
avatar.isDragging.get();   // Pulse<boolean> — true during drag-over

// File input binding
el('input[type=file]', { onchange: avatar.onChange, accept: 'image/*' });

// Drag-and-drop zone
el('.dropzone', {
  ondragenter: avatar.onDragEnter,
  ondragover: avatar.onDragOver,
  ondragleave: avatar.onDragLeave,
  ondrop: avatar.onDrop,
  class: () => avatar.isDragging.get() ? 'drag-over' : ''
});

// Control methods
avatar.clear();            // Remove all files
avatar.removeFile(0);      // Remove file by index
avatar.reset();            // Reset to initial state
avatar.dispose();          // Cleanup preview URLs (called automatically on unmount)
```

### Async (runtime/async.js)

```javascript
import { useAsync, useResource, usePolling, createVersionedAsync, useAbortable } from 'pulse-js-framework/runtime/async';

// Basic async operation
const { data, loading, error, execute, reset, abort } = useAsync(
  () => fetch('/api/users').then(r => r.json()),
  {
    immediate: true,     // Execute on creation (default: true)
    initialData: null,   // Initial data value
    retries: 3,          // Retry on failure
    retryDelay: 1000,    // Delay between retries (ms)
    onSuccess: (data) => console.log('Got:', data),
    onError: (err) => console.error('Failed:', err)
  }
);

// Resource with caching (SWR pattern)
const users = useResource(
  'users',                                    // Cache key
  () => fetch('/api/users').then(r => r.json()),
  {
    refreshInterval: 30000,    // Auto-refresh every 30s
    refreshOnFocus: true,      // Refresh when window gains focus
    refreshOnReconnect: true,  // Refresh when network reconnects
    staleTime: 5000,           // Data considered fresh for 5s
    cacheTime: 300000          // Keep in cache for 5 min
  }
);

// Dynamic cache key (re-fetches when userId changes)
const userId = pulse(1);
const user = useResource(
  () => `user-${userId.get()}`,
  () => fetch(`/api/users/${userId.get()}`).then(r => r.json())
);

// Polling for live data
const { data, start, stop, isPolling } = usePolling(
  () => fetch('/api/status').then(r => r.json()),
  {
    interval: 5000,
    pauseOnHidden: true,   // Pause when tab hidden
    pauseOnOffline: true,  // Pause when offline
    maxErrors: 3           // Stop after 3 consecutive errors
  }
);
start();  // Begin polling
stop();   // Stop polling

// Race condition handling — high-level (recommended)
const search = useAbortable(
  async (query) => searchApi(query),
  { onError: (err) => console.error(err) }
);
// In an effect: search.execute(query.get())
// search.isExecuting, search.data, search.error are reactive Pulse signals
// Each call to execute() cancels any previous in-flight call automatically

// Race condition handling — low-level (advanced)
const controller = createVersionedAsync();
async function searchLowLevel(query) {
  const ctx = controller.begin();  // Invalidates previous operations
  const results = await searchApi(query);
  ctx.ifCurrent(() => setResults(results));  // Only runs if still current
}
```

