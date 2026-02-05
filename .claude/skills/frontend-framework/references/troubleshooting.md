# Troubleshooting Guide

## Table of Contents

1. [Reactivity Issues](#reactivity-issues)
2. [DOM Rendering Problems](#dom-rendering-problems)
3. [Router Issues](#router-issues)
4. [Form Validation](#form-validation)
5. [Performance Problems](#performance-problems)
6. [Build & Compilation](#build--compilation)
7. [Common Error Messages](#common-error-messages)

## Reactivity Issues

### Changes not updating the UI

**Symptoms:** You call `.set()` or `.update()` but the UI doesn't change.

**Possible causes:**

1. **Not using `.get()` in reactive context**
   ```javascript
   // ❌ Wrong - value read once, not tracked
   const label = el('span', count.peek());

   // ✅ Correct - reactive function
   const label = el('span', () => count.get());
   ```

2. **Mutating object instead of creating new one**
   ```javascript
   // ❌ Wrong - same object reference
   user.update(u => { u.name = 'John'; return u; });

   // ✅ Correct - new object
   user.update(u => ({ ...u, name: 'John' }));
   ```

3. **Custom equality returning true**
   ```javascript
   // Check your equality function
   const data = pulse(obj, {
     equals: (a, b) => a.id === b.id  // May skip updates!
   });
   ```

### Circular dependency detected

**Symptoms:** Error "Circular dependency detected" or infinite loop.

**Cause:** Effect triggers itself by setting a pulse it reads.

```javascript
// ❌ Circular - effect reads and writes same pulse
effect(() => {
  const val = count.get();
  count.set(val + 1);  // Triggers re-run!
});

// ✅ Fixed - use untrack or separate pulses
effect(() => {
  const val = untrack(() => count.get());
  derivedCount.set(val + 1);
});
```

### Effects running too often

**Symptoms:** Effect runs on every change, even unrelated ones.

**Diagnosis:**
```javascript
effect(() => {
  console.log('Effect ran'); // Add logging
  const data = bigObject.get(); // Reading entire object
  // ...
});
```

**Solutions:**

1. **Use computed for derived values**
   ```javascript
   // ❌ Effect recalculates every time
   effect(() => {
     const filtered = items.get().filter(i => i.active);
     render(filtered);
   });

   // ✅ Computed caches the result
   const activeItems = computed(() => items.get().filter(i => i.active));
   effect(() => render(activeItems.get()));
   ```

2. **Use selectors for partial reads**
   ```javascript
   // ❌ Tracks entire user object
   effect(() => console.log(user.get().name));

   // ✅ Only tracks name changes (if using a selector pattern)
   const userName = computed(() => user.get().name);
   effect(() => console.log(userName.get()));
   ```

## DOM Rendering Problems

### Elements not appearing

**Symptoms:** `el()` returns but element not in DOM.

**Checklist:**
1. Did you call `mount()`?
   ```javascript
   const app = App();
   mount('#app', app);  // Don't forget this!
   ```

2. Does the mount target exist?
   ```javascript
   // Check in browser console
   document.querySelector('#app')  // Should not be null
   ```

3. Is the element conditionally rendered?
   ```javascript
   // Make sure condition is reactive
   when(() => show.get(), () => el('div', 'Hello'));
   ```

### List not updating correctly

**Symptoms:** List items duplicate, disappear, or don't reflect data changes.

**Cause:** Missing or incorrect key function.

```javascript
// ❌ Wrong - no key, or using index
list(() => items.get(), (item, i) => el('li', item.name));
list(() => items.get(), item => el('li', item.name), (_, i) => i);

// ✅ Correct - unique stable key
list(() => items.get(), item => el('li', item.name), item => item.id);
```

### Styles not applying

**Symptoms:** CSS in `.pulse` file not working.

**Checklist:**

1. **Check scoping** - styles are auto-scoped
   ```pulse
   style {
     /* This becomes .component-xyz .button */
     .button { color: red; }
   }
   ```

2. **Check specificity** - scoped styles may need `!important` or higher specificity

3. **Check for typos** in class names (case-sensitive)

## Router Issues

### Route not matching

**Symptoms:** Navigation shows blank or 404.

**Checklist:**

1. **Check route definition**
   ```javascript
   const router = createRouter({
     routes: {
       '/users/:id': UserPage,  // Param routes need :
       '/files/*path': FilePage  // Wildcard needs *
     }
   });
   ```

2. **Check base path**
   ```javascript
   // If app is at /app/, set base
   createRouter({ routes, base: '/app' });
   ```

3. **Check mode**
   ```javascript
   // Hash mode: URLs are /#/path
   createRouter({ routes, mode: 'hash' });

   // History mode: needs server config for SPA
   createRouter({ routes, mode: 'history' });
   ```

### History mode 404 on refresh

**Symptoms:** Direct URL access or refresh shows 404.

**Cause:** Server not configured for SPA.

**Solution:** Configure server to serve `index.html` for all routes:

```nginx
# Nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

```apache
# Apache .htaccess
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Guards not running

**Symptoms:** `beforeEnter` or `beforeEach` ignored.

**Check:**
1. Guards must return `undefined` to proceed, or a path to redirect
   ```javascript
   beforeEnter: (to, from) => {
     if (!isAuth()) return '/login';  // Redirect
     // Return nothing to proceed
   }
   ```

2. Async guards must be awaited
   ```javascript
   beforeEnter: async (to, from) => {
     await checkAuth();
     if (!isAuth()) return '/login';
   }
   ```

## Form Validation

### Validation not triggering

**Symptoms:** Errors don't show even with invalid input.

**Checklist:**

1. **Check if field was touched**
   ```javascript
   // Errors only show after blur by default
   fields.email.touched.get()  // true after blur

   // Or trigger validation manually
   fields.email.validate();
   ```

2. **Check validator returns**
   ```javascript
   // Validator must return true (valid) or string (error message)
   validators.custom((value) => {
     if (value.length < 3) return 'Too short';  // Error
     return true;  // Valid
   });
   ```

### Async validation not working

**Symptoms:** Async validators don't run or show stale results.

**Check debounce and race conditions:**
```javascript
validators.asyncUnique(
  async (value) => {
    const res = await fetch(`/api/check?q=${value}`);
    return (await res.json()).available;
  },
  'Already taken',
  { debounce: 300 }  // Wait 300ms before validating
);

// Check validating state
fields.username.validating.get();  // true while checking
```

## Performance Problems

### Slow initial render

**Diagnosis:**
1. Check bundle size: `pulse analyze`
2. Check for eager computeds

**Solutions:**

1. **Lazy load routes**
   ```javascript
   '/admin': lazy(() => import('./Admin.js'))
   ```

2. **Use lazy computeds**
   ```javascript
   computed(() => expensiveCalc(), { lazy: true });
   ```

3. **Use lite runtime if possible**
   ```javascript
   import { pulse, el } from 'pulse-js-framework/runtime/lite';
   ```

### Sluggish UI updates

**Diagnosis:**
```javascript
// Enable devtools to profile
import { enableDevTools, profile } from 'pulse-js-framework/runtime/devtools';
enableDevTools({ logUpdates: true, warnOnSlowEffects: true });

profile('update', () => {
  items.set(newItems);
});
```

**Solutions:**

1. **Batch updates**
   ```javascript
   batch(() => {
     item1.set(val1);
     item2.set(val2);
     item3.set(val3);
   });
   ```

2. **Use keys in lists**
   ```javascript
   list(items, render, item => item.id);
   ```

3. **Virtualize long lists** (render only visible items)

### Memory leaks

**Symptoms:** Memory grows over time, especially with navigation.

**Common causes:**

1. **Effects not cleaned up**
   ```javascript
   effect(() => {
     const interval = setInterval(tick, 1000);
     return () => clearInterval(interval);  // Cleanup!
   });
   ```

2. **Event listeners not removed**
   ```javascript
   onMount(() => {
     window.addEventListener('resize', handler);
     return () => window.removeEventListener('resize', handler);
   });
   ```

3. **Subscriptions not unsubscribed**
   ```javascript
   const unsub = store.subscribe(handler);
   onUnmount(() => unsub());
   ```

## Build & Compilation

### Compilation errors

**Symptoms:** `pulse compile` fails.

**Check:**
1. Syntax errors in `.pulse` file
2. Unclosed blocks (missing `}`)
3. Invalid directives

**Get detailed errors:**
```bash
pulse compile src/App.pulse --verbose
```

### Source maps not working

**Symptoms:** Debugger shows compiled code, not source.

**Check:**
1. Vite plugin configured correctly
   ```javascript
   // vite.config.js
   import pulsePlugin from 'pulse-js-framework/vite';
   export default {
     plugins: [pulsePlugin()]
   };
   ```

2. Browser devtools source maps enabled

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot read properties of null (reading 'get')` | Accessing null pulse | Add null check or optional chaining |
| `Mount target not found` | Invalid selector in `mount()` | Check selector exists in DOM |
| `Circular dependency detected` | Effect triggers itself | Use `untrack()` or restructure |
| `Maximum update depth exceeded` | Infinite loop | Check for circular updates |
| `Invalid route` | Malformed route definition | Check route syntax |
| `Computed values are read-only` | Calling `.set()` on computed | Use regular pulse instead |

## Debug Checklist

When something doesn't work:

1. [ ] Check browser console for errors
2. [ ] Enable devtools: `enableDevTools({ logUpdates: true })`
3. [ ] Add `console.log` in effects to trace execution
4. [ ] Verify pulses have expected values: `pulse.peek()`
5. [ ] Check if elements exist in DOM: browser inspector
6. [ ] Run `pulse lint` for static analysis
7. [ ] Run `pulse doctor` for project diagnostics
8. [ ] Check CLAUDE.md for correct API usage
