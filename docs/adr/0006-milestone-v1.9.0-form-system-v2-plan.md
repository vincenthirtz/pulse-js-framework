# ADR-0006: Milestone v1.9.0 Form System v2 — Implementation Plan

## Status

Accepted

## Date

2026-02-11

## Context

Milestone 6 "Form System v2 (v1.9.0)" has 5 open GitHub issues (#29, #30, #32, #34, #36).
The goal is to improve form handling to match Formik/React Hook Form capabilities while
maintaining Pulse's zero-dependency, signal-based architecture.

### Current State Assessment

| Feature | File | Completeness | Key Gap |
|---------|------|-------------|---------|
| Form submission state | `form.js` | 60% | `isSubmitting`/`submitCount` exist but no `submitError`, no async wrapping |
| Conditional validation | `form.js` | 0% | No `when()`/`unless()` validators |
| Cross-field validation | `form.js` | 30% | `matches()` exists; no form-level `validate()` |
| File upload field | `form.js` | 0% | No `useFileField()` at all |
| Draft persistence | `form.js` | 0% | No localStorage persistence option |

All existing 1,563 lines of tests pass. No regressions detected.

### Existing API Surface (Backward Compatibility Required)

```
useForm(initialValues, validationSchema, options) → { fields, isValid, isSubmitting, ... }
useField(initialValue, rules, options) → { value, error, touched, ... }
useFieldArray(initialValues, itemRules) → { fields, values, append, ... }
validators.{ required, minLength, maxLength, email, url, pattern, min, max, custom, matches }
validators.{ asyncCustom, asyncEmail, asyncUnique, asyncServer }
```

All existing APIs must remain unchanged. New features are additive only.

## Decision

### Implementation Plan (5 Tasks, Ordered by Dependencies)

```
Task 1: Form submission state management (#29)
    │   (no dependencies — enhances existing handleSubmit)
    │
Task 2: Conditional field validation (#30)
    │   (no dependencies — new validator factories)
    │
Task 3: Cross-field and form-level validation (#32)
    │   (depends on: Task 1 for submitError integration)
    │
Task 4: File upload support (#34)
    │   (no dependencies — new useFileField function)
    │
Task 5: Form draft persistence (#36)
    │   (depends on: Task 1, Task 3 for complete form state)
    │
```

### Task Details

---

#### Task 1: Form Submission State Management
**Issue:** #29 | **File:** `runtime/form.js` — `useForm()`
**Problem:** `isSubmitting` and `submitCount` exist (lines 512-513) but:
- `submitError` pulse is missing for server-side error tracking
- `handleSubmit()` catches errors but only passes them to `onError` callback
- No way for components to reactively display submission errors

**Solution:** Add `submitError` pulse and enhance `handleSubmit()` to properly
manage the full submission lifecycle.

**API Additions:**
```javascript
const { isSubmitting, submitCount, submitError, handleSubmit } = useForm(...);

// submitError: Pulse<string|null> — set on submit failure, cleared on next submit
submitError.get(); // null | 'Server error message'

// handleSubmit now properly wraps async onSubmit
await handleSubmit(); // Sets isSubmitting, catches errors into submitError
```

**Changes:**
- Add `submitError = pulse(null)` after `submitCount` (line ~513)
- In `handleSubmit()`: clear `submitError` at start, set on catch
- Add `submitError` to the return object
- Existing `onError` callback still fires (non-breaking)

---

#### Task 2: Conditional Field Validation
**Issue:** #30 | **File:** `runtime/form.js` — `validators`
**Problem:** No way to conditionally enable/disable validation rules based on
form state or external conditions.

**Solution:** Add `validators.when()` and `validators.unless()` factory functions
that wrap other validators with a condition.

**API Additions:**
```javascript
validators.when(condition, rules)
validators.unless(condition, rules)

// condition: (value, allValues) => boolean
// rules: ValidationRule[] — validators to apply when condition is met

// Example: only validate shipping if different from billing
validators.when(
  (value, allValues) => allValues.differentShipping,
  [validators.required(), validators.minLength(5)]
)

// Example: skip validation unless field is filled
validators.unless(
  (value, allValues) => !value,
  [validators.email()]
)
```

**Implementation:**
- `when()` returns a composite validator that checks condition before running rules
- `unless()` is `when()` with inverted condition
- If any inner rule is async, the composite is marked async
- Debounce inherits from the first async inner rule

**Changes:**
- Add `when()` and `unless()` to `validators` object (after `matches`)
- Each returns `{ validate, async?, debounce? }` conforming to existing rule interface

---

#### Task 3: Cross-Field and Form-Level Validation
**Issue:** #32 | **File:** `runtime/form.js` — `useForm()`
**Problem:** Only field-level validation exists. No way to validate relationships
between fields or set form-wide errors.

**Solution:** Add optional `validate` function to form options that runs after
field-level validation and can set errors on any field or the form itself.

**API Additions:**
```javascript
const { errors, formError, handleSubmit } = useForm(
  { password: '', confirmPassword: '' },
  { password: [validators.required()] },
  {
    validate: (allValues) => {
      const errors = {};
      if (allValues.password !== allValues.confirmPassword) {
        errors.confirmPassword = 'Passwords must match';
      }
      if (allValues.password.length < 8 && allValues.password.length > 0) {
        errors._form = 'Please fix the errors above';
      }
      return errors; // {} means valid
    }
  }
);

// formError: Pulse<string|null> — from validate() returning { _form: 'msg' }
formError.get(); // null | 'Please fix the errors above'
```

**Implementation:**
- Add `formError = pulse(null)` to form state
- Add `validate` option to `useForm` options destructuring
- `validate()` runs after field-level validation in `validateAll()` and `handleSubmit()`
- It receives `allValues` and returns an error map `{ fieldName: msg, _form: msg }`
- `_form` key maps to `formError` pulse, other keys map to field errors
- `formError` is included in `errors` computed under `_form` key
- Form-level `validate()` can be sync or async (check return for `.then`)

**Changes:**
- Add `formError` pulse
- Extract `validate` from options
- Add form-level validation step in `validateAll()` and `handleSubmit()`
- Add `formError` to return object
- Include `_form` in `errors` computed
- Include `formError` in `isValid` computation

---

#### Task 4: File Upload Support
**Issue:** #34 | **File:** `runtime/form.js` — new `useFileField()`
**Problem:** No built-in support for file inputs, drag-and-drop, previews, or
upload progress tracking.

**Solution:** Add `useFileField()` function that provides reactive file handling
with validation, preview generation, and drag-and-drop support.

**API Additions:**
```javascript
import { useFileField } from 'pulse-js-framework/runtime/form';

const avatar = useFileField({
  accept: ['image/png', 'image/jpeg'],  // Allowed MIME types
  maxSize: 5 * 1024 * 1024,             // 5MB max
  multiple: false,                        // Single file (default)
  maxFiles: 1,                           // Max files when multiple=true
  preview: true,                          // Generate preview URLs
  validate: (files) => {                  // Custom validation
    if (files[0]?.size < 1024) return 'File too small';
    return true;
  }
});

// Reactive state
avatar.files.get();        // Pulse<File[]>
avatar.previews.get();     // Pulse<string[]> — object URLs for images
avatar.error.get();        // Pulse<string|null>
avatar.touched.get();      // Pulse<boolean>
avatar.valid.get();        // Computed<boolean>
avatar.isDragging.get();   // Pulse<boolean> — true during drag-over

// Event handlers (for input[type=file] and drop zones)
avatar.onChange;            // (event) => void — for <input> onChange
avatar.onDragEnter;        // (event) => void
avatar.onDragOver;         // (event) => void
avatar.onDragLeave;        // (event) => void
avatar.onDrop;             // (event) => void

// Control methods
avatar.clear();            // Remove all files
avatar.removeFile(index);  // Remove specific file
avatar.reset();            // Reset to initial state
avatar.dispose();          // Cleanup preview URLs

// Usage with el()
el('input[type=file]', { onchange: avatar.onChange, accept: 'image/*' });
el('.dropzone', {
  ondragenter: avatar.onDragEnter,
  ondragover: avatar.onDragOver,
  ondragleave: avatar.onDragLeave,
  ondrop: avatar.onDrop,
  class: () => avatar.isDragging.get() ? 'drag-over' : ''
});
```

**Implementation:**
- `useFileField(options)` creates reactive state for file management
- File validation: type check against `accept`, size check against `maxSize`, count check
- Preview generation: `URL.createObjectURL()` for image files (with cleanup via `revokeObjectURL`)
- Drag-and-drop: event handlers manage `isDragging` state and file extraction from `DataTransfer`
- SSR-safe: checks for `File` and `URL.createObjectURL` availability
- `dispose()` revokes all object URLs to prevent memory leaks

**Changes:**
- Add `useFileField()` function after `useFieldArray()`
- Add to exports and default export object
- No changes to existing functions

---

#### Task 5: Form Draft Persistence
**Issue:** #36 | **File:** `runtime/form.js` — `useForm()`
**Problem:** Form data is lost on page reload. Users want auto-save drafts.

**Solution:** Add `persist` option to `useForm()` that saves field values to
localStorage on change and restores them on initialization.

**API Additions:**
```javascript
const form = useForm(
  { email: '', message: '' },
  schema,
  {
    persist: true,                    // Enable draft persistence
    persistKey: 'contact-form',       // localStorage key (default: 'pulse-form-draft')
    persistDebounce: 300,             // Debounce save (ms, default: 300)
    persistExclude: ['password'],     // Fields to never persist
    onSubmit: async (values) => {
      await api.submit(values);
      // Draft automatically cleared on successful submit
    }
  }
);

// Manual draft control
form.clearDraft();   // Remove saved draft from localStorage
form.hasDraft.get(); // Pulse<boolean> — true if a saved draft exists
```

**Implementation:**
- On init: check localStorage for saved draft, merge with initialValues
- On field change: debounced save of all non-excluded field values to localStorage
- On successful submit: clear the draft from localStorage
- On reset: clear the draft from localStorage
- `hasDraft` computed checks localStorage key existence
- JSON serialization (skip non-serializable values like Files)
- SSR-safe: check for `localStorage` availability before using
- `persistExclude` filters out sensitive fields (passwords, tokens)

**Changes:**
- Extract `persist`, `persistKey`, `persistDebounce`, `persistExclude` from options
- Add draft restore logic before field creation loop
- Add debounced save effect after field creation
- Modify `handleSubmit()` to clear draft on success
- Modify `reset()` to clear draft
- Add `clearDraft()` and `hasDraft` to return object

## Consequences

### Positive

- Form submission errors are now reactive and visible in UI (#29)
- Conditional validation reduces boilerplate for complex forms (#30)
- Form-level validation enables cross-field rules and global error messages (#32)
- File uploads are first-class with preview, drag-drop, and validation (#34)
- Draft persistence prevents data loss on accidental navigation (#36)
- All features are backward-compatible — existing code unchanged

### Negative

- `useFileField` adds ~150 lines to form.js (mitigated: tree-shakeable named export)
- Draft persistence uses localStorage (synchronous API, 5MB limit)
- File preview URLs must be manually disposed (mitigated: `dispose()` handles cleanup)

### Neutral

- No new external dependencies
- Bundle size increase is ~4KB minified for all features combined
- All features are opt-in (persist: false by default, validate optional, etc.)
- `formError` is a new pulse that existing code won't access (non-breaking)

## Alternatives Considered

### Alternative 1: Separate form-persistence.js Module
Create a separate module for persistence logic.
**Not chosen:** Persistence is tightly coupled to form lifecycle (init, change, submit, reset).
Extracting it would require exposing internal hooks and add cross-module coordination complexity.

### Alternative 2: IndexedDB Instead of localStorage
Use IndexedDB for larger storage and async API.
**Not chosen:** Adds unnecessary complexity for form drafts (typically < 10KB).
localStorage is simpler, synchronous, and sufficient. Can be revisited if needed.

### Alternative 3: Built-in Upload Progress (XMLHttpRequest)
Track upload progress using XHR instead of fetch.
**Not chosen:** Upload progress tracking is a network concern, not a form concern.
`useFileField` provides the files; users should use `runtime/http.js` for upload with progress.
The field provides file validation and preview — upload is a separate responsibility.

## Implementation Notes

| File | Change |
|------|--------|
| `runtime/form.js` | Add submitError, formError, validate option, when/unless validators, useFileField, persist |
| `test/form.test.js` | Add tests for all 5 features |
| `test/form-edge-cases.test.js` | Add edge-case tests for persistence, file validation |
| `CLAUDE.md` | Update form API documentation |
| `package.json` | Version bump to 1.9.0 |

## Principles Applied

- P1: Zero dependencies — all features use only built-in browser APIs
- P2: Signal-based reactivity — all state exposed as Pulse instances
- P3: Opt-in complexity — persistence, file fields, form validation are all opt-in
- P4: Backward compatibility — existing useForm/useField/validators API unchanged
- P7: Clean public API — follows `use*` naming convention for hooks

## Related

- [ADR-0005](0005-milestone-v1.8.1-runtime-performance-plan.md) — Previous milestone plan (format reference)
- GitHub Milestone: https://github.com/vincenthirtz/pulse-js-framework/milestone/6
- Issues: #29, #30, #32, #34, #36
