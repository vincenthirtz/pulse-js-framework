# Pulse Example: Accessibility Showcase

Interactive demonstration of Pulse framework's built-in accessibility features, including ARIA widgets, focus management, screen reader announcements, preference detection, and contrast checking.

## Features Demonstrated

- ARIA Widgets: disclosure, accordion, tabs, tooltip, dropdown menu (`runtime/a11y.js`)
- Focus Management: focus trapping, roving tabindex, focus-visible detection
- Screen Reader: polite/assertive announcements, screen-reader-only content
- User Preferences: reduced motion, color scheme, high contrast, forced colors
- Contrast Checker: real-time WCAG AA/AAA validation
- Live Audit: run validateA11y() on the current page

## Getting Started

```bash
cd examples/a11y-showcase
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Full app with all a11y feature demos |
| `src/styles.css` | Accessible styles with dark mode and reduced motion |

## Framework APIs Used

- `createModal()`, `createTooltip()`, `createAccordion()`, `createMenu()` - ARIA widgets
- `createTabs()`, `createDisclosure()`, `createRovingTabindex()` - Navigation patterns
- `trapFocus()`, `onEscapeKey()`, `createFocusVisibleTracker()` - Focus management
- `announce()`, `announcePolite()`, `announceAssertive()`, `srOnly()` - Screen reader
- `createPreferences()` - Reactive user preference detection
- `getContrastRatio()`, `meetsContrastRequirement()` - WCAG contrast checking
- `validateA11y()` - Accessibility auditing
- `installSkipLinks()` - Keyboard navigation

## Learn More

- [Accessibility Guide](https://pulse-js.fr/accessibility)
- [API Reference](https://pulse-js.fr/api-reference)
