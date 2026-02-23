# Pulse Example: Form Validation

Comprehensive form validation demo showcasing the full `useForm()` API with sync/async validators, file uploads, and draft persistence.

## Features Demonstrated

- `useForm()` with field-level validation schema
- Built-in validators: `required`, `email`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `matches`
- Conditional validators: `when()` for optional age field
- Async validators: `asyncCustom()` with simulated username availability check
- `useFileField()` for avatar upload with drag-and-drop
- Draft persistence to localStorage (auto-saves as you type)
- Submission state tracking (`isSubmitting`, `submitCount`, `submitError`)
- Password strength indicator
- Real-time validation feedback with touched/dirty states

## Getting Started

```bash
cd examples/form-validation
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Full form app with validation logic |
| `src/styles.css` | Form styling with validation states |

## Framework APIs Used

- `useForm()` - Form state management with validation (`runtime/form.js`)
- `validators.*` - Built-in sync and async validators
- `useFileField()` - File upload with preview and drag-and-drop
- `pulse()`, `computed()`, `effect()` - Reactive state
- `el()`, `on()`, `bind()` - DOM creation and events

## Try It

- Type "admin" as username to see async validation error
- Type "error" as username and submit to see server error handling
- Fill the form partially and refresh - draft is restored from localStorage
- Drag an image onto the avatar dropzone
- Check the password strength meter as you type

## Learn More

- [Form API Reference](https://pulse-js.fr/api-reference)
- [Validators Documentation](https://pulse-js.fr/core-concepts)
