# CSS Patterns for Pulse

## Table of Contents

1. [CSS Variables System](#css-variables-system)
2. [Responsive Design](#responsive-design)
3. [Dark Mode](#dark-mode)
4. [Animations](#animations)
5. [Layout Patterns](#layout-patterns)
6. [Component Styles](#component-styles)

## CSS Variables System

### Theme Foundation

```css
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-primary-dark: #0056b3;
  --color-primary-light: #e7f1ff;

  --color-success: #28a745;
  --color-warning: #ffc107;
  --color-error: #dc3545;
  --color-info: #17a2b8;

  /* Neutrals */
  --color-text: #212529;
  --color-text-muted: #6c757d;
  --color-background: #ffffff;
  --color-surface: #ffffff;
  --color-surface-hover: #f8f9fa;
  --color-border: #dee2e6;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Courier New', monospace;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;

  --line-height-tight: 1.25;
  --line-height-base: 1.5;
  --line-height-relaxed: 1.75;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;

  /* Z-index layers */
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal-backdrop: 300;
  --z-modal: 400;
  --z-popover: 500;
  --z-tooltip: 600;
  --z-toast: 700;
}
```

### Using in Components

```pulse
style {
  .button {
    background: var(--color-primary);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    transition: background var(--transition-fast);
  }

  .button:hover {
    background: var(--color-primary-dark);
  }
}
```

## Responsive Design

### Breakpoint System

```css
/* Mobile-first breakpoints */
/* sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px */

@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Container Queries

```pulse
style {
  .card-container {
    container-type: inline-size;
    container-name: card;
  }

  .card {
    display: grid;
    gap: var(--space-4);
  }

  @container card (min-width: 400px) {
    .card {
      grid-template-columns: auto 1fr;
    }
  }

  @container card (min-width: 600px) {
    .card {
      grid-template-columns: 200px 1fr auto;
    }
  }
}
```

### Responsive Grid

```pulse
style {
  .grid {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: 1fr;
  }

  @media (min-width: 640px) {
    .grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (min-width: 1024px) {
    .grid { grid-template-columns: repeat(3, 1fr); }
  }

  @media (min-width: 1280px) {
    .grid { grid-template-columns: repeat(4, 1fr); }
  }
}
```

## Dark Mode

### CSS-Based Dark Mode

```css
/* System preference */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #f8f9fa;
    --color-text-muted: #adb5bd;
    --color-background: #121212;
    --color-surface: #1e1e1e;
    --color-surface-hover: #2d2d2d;
    --color-border: #333333;
  }
}

/* Manual toggle via class */
.dark {
  --color-text: #f8f9fa;
  --color-text-muted: #adb5bd;
  --color-background: #121212;
  --color-surface: #1e1e1e;
  --color-surface-hover: #2d2d2d;
  --color-border: #333333;
}
```

### Pulse Dark Mode Toggle

```pulse
@component ThemeToggle

import { createPreferences } from 'pulse-js-framework/runtime/a11y'

state {
  prefs: createPreferences()
  theme: localStorage.getItem('theme') || 'system'
}

computed {
  effectiveTheme: theme === 'system'
    ? (prefs.colorScheme.get() === 'dark' ? 'dark' : 'light')
    : theme

  isDark: effectiveTheme === 'dark'
}

watch {
  effectiveTheme: (value) => {
    document.documentElement.classList.toggle('dark', value === 'dark')
  }
}

actions {
  toggleTheme() {
    const next = isDark ? 'light' : 'dark'
    theme = next
    localStorage.setItem('theme', next)
  }
}

view {
  button.theme-toggle
    [type=button]
    [aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}]
    @click(toggleTheme)
  {
    @if(isDark) { "🌙" }
    @else { "☀️" }
  }
}
```

## Animations

### Keyframe Library

```css
/* Fade */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* Slide */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideLeft {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes slideRight {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Scale */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes scaleOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

/* Spin */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Pulse */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Bounce */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Shake */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Animation Utilities

```pulse
style {
  .animate-fade-in {
    animation: fadeIn var(--transition-base);
  }

  .animate-slide-up {
    animation: slideUp var(--transition-base);
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  .animate-pulse {
    animation: pulse 2s ease-in-out infinite;
  }

  /* Staggered children animation */
  .stagger-children > * {
    animation: slideUp var(--transition-base) backwards;
  }

  .stagger-children > *:nth-child(1) { animation-delay: 0ms; }
  .stagger-children > *:nth-child(2) { animation-delay: 50ms; }
  .stagger-children > *:nth-child(3) { animation-delay: 100ms; }
  .stagger-children > *:nth-child(4) { animation-delay: 150ms; }
  .stagger-children > *:nth-child(5) { animation-delay: 200ms; }
}
```

## Layout Patterns

### Stack (Vertical)

```pulse
style {
  .stack {
    display: flex;
    flex-direction: column;
  }

  .stack-sm { gap: var(--space-2); }
  .stack-md { gap: var(--space-4); }
  .stack-lg { gap: var(--space-6); }
}
```

### Cluster (Horizontal Wrap)

```pulse
style {
  .cluster {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }
}
```

### Sidebar Layout

```pulse
style {
  .with-sidebar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-6);
  }

  .with-sidebar > .sidebar {
    flex-basis: 250px;
    flex-grow: 1;
  }

  .with-sidebar > .content {
    flex-basis: 0;
    flex-grow: 999;
    min-inline-size: 60%;
  }
}
```

### Center

```pulse
style {
  .center {
    display: grid;
    place-items: center;
    min-height: 100vh;
  }

  .center-content {
    max-width: 65ch;
    margin-inline: auto;
    padding-inline: var(--space-4);
  }
}
```

## Component Styles

### Button Variants

```pulse
style {
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Variants */
  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }

  .btn-secondary {
    background: transparent;
    border-color: var(--color-border);
    color: var(--color-text);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-text);
  }

  .btn-ghost:hover:not(:disabled) {
    background: var(--color-surface-hover);
  }

  .btn-danger {
    background: var(--color-error);
    color: white;
  }

  /* Sizes */
  .btn-sm {
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
  }

  .btn-lg {
    padding: var(--space-3) var(--space-6);
    font-size: var(--font-size-base);
  }
}
```

### Card

```pulse
style {
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .card-header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .card-body {
    padding: var(--space-4);
  }

  .card-footer {
    padding: var(--space-4);
    border-top: 1px solid var(--color-border);
    background: var(--color-surface-hover);
  }

  /* Interactive card */
  .card-interactive {
    cursor: pointer;
    transition: box-shadow var(--transition-fast), transform var(--transition-fast);
  }

  .card-interactive:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .card-interactive:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}
```

### Form Inputs

```pulse
style {
  .input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: var(--font-size-base);
    background: var(--color-surface);
    color: var(--color-text);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .input:disabled {
    background: var(--color-surface-hover);
    cursor: not-allowed;
  }

  .input[aria-invalid="true"] {
    border-color: var(--color-error);
  }

  .input[aria-invalid="true"]:focus {
    box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.2);
  }

  /* Textarea */
  textarea.input {
    min-height: 100px;
    resize: vertical;
  }

  /* Select */
  select.input {
    appearance: none;
    background-image: url("data:image/svg+xml,..."); /* Chevron */
    background-repeat: no-repeat;
    background-position: right var(--space-3) center;
    padding-right: var(--space-8);
  }
}
```

### Badge

```pulse
style {
  .badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 500;
    border-radius: var(--radius-full);
  }

  .badge-primary {
    background: var(--color-primary-light);
    color: var(--color-primary-dark);
  }

  .badge-success {
    background: #d4edda;
    color: #155724;
  }

  .badge-warning {
    background: #fff3cd;
    color: #856404;
  }

  .badge-error {
    background: #f8d7da;
    color: #721c24;
  }
}
```
