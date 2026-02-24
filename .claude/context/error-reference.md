# Error Code Reference

> Load this context file when debugging errors or writing validators.

## Error Codes

### Compiler Errors

| Code | Message | Cause |
|------|---------|-------|
| `PARSE_ERROR` | Unexpected token | Syntax error in .pulse file |
| `DUPLICATE_BLOCK` | Duplicate {block} block | Multiple state/view/style blocks |
| `INVALID_IMPORT` | Invalid import statement | Malformed import syntax |
| `UNCLOSED_BLOCK` | Unclosed {block} | Missing closing brace |
| `INVALID_DIRECTIVE` | Unknown directive @{name} | Unrecognized @ directive |

### Runtime Errors

| Code | Message | Cause |
|------|---------|-------|
| `CIRCULAR_DEPENDENCY` | Circular dependency detected | Effect triggers itself (max 100 iterations) |
| `INVALID_PULSE` | Expected Pulse instance | Passing non-pulse to reactive API |
| `MOUNT_ERROR` | Mount target not found | Invalid selector for mount() |
| `ROUTER_NO_MATCH` | No route matched | Navigation to undefined route |

### Lint Errors

| Rule | Message | Fix |
|------|---------|-----|
| `no-unused-state` | State '{name}' is never used | Remove or use the state variable |
| `no-missing-key` | List missing key function | Add key function: `list(items, render, item => item.id)` |
| `no-direct-mutation` | Direct state mutation | Use `.set()` or `.update()` instead of assignment |
| `prefer-computed` | Derivable value in effect | Use `computed()` for derived values |
| `no-async-effect` | Async effect without cleanup | Return cleanup function or use `useAsync` |

### Accessibility Lint Rules

| Rule | Message | Fix |
|------|---------|-----|
| `a11y-img-alt` | Image missing alt attribute | Add `alt="description"` or `alt=""` for decorative |
| `a11y-button-text` | Button has no accessible name | Add text content, `aria-label`, or `title` |
| `a11y-link-text` | Link has no accessible name | Add text content, `aria-label`, or image with alt |
| `a11y-input-label` | Form input missing label | Add `aria-label`, `id` with `<label>`, or `aria-labelledby` |
| `a11y-click-key` | Click on non-interactive element | Add `role="button"` + keyboard handler, or use `<button>` |
| `a11y-no-autofocus` | Avoid autofocus | Remove `autofocus` - disorients screen readers |
| `a11y-no-positive-tabindex` | Avoid positive tabindex | Use `tabindex="0"` or `"-1"`, rely on DOM order |
| `a11y-heading-order` | Heading level skipped | Use sequential headings (h1, h2, h3...) |
| `a11y-aria-props` | Invalid ARIA attribute | Check attribute name against WAI-ARIA spec |
| `a11y-role-props` | Role requires specific attributes | Add required ARIA attributes for the role |

### Form Validation Errors

| Validator | Default Message |
|-----------|-----------------|
| `required` | This field is required |
| `minLength(n)` | Must be at least {n} characters |
| `maxLength(n)` | Must be at most {n} characters |
| `email` | Invalid email address |
| `url` | Invalid URL |
| `min(n)` | Must be at least {n} |
| `max(n)` | Must be at most {n} |
| `matches(field)` | Must match {field} |
| `asyncEmail` | Email is already taken |
| `asyncUnique` | This value is already taken |
