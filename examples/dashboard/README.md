# Pulse Example: Dashboard

Admin dashboard with authentication, multi-page navigation, and data management.

## Features Demonstrated

- Authentication flow (login page with session management)
- Multi-page layout (dashboard, users, products, orders, analytics, settings)
- Sidebar navigation with collapsible sections
- Dark/light theme toggle
- Modal dialogs for data entry
- Responsive admin UI

## Getting Started

```bash
cd examples/dashboard
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/App.pulse` | Main app with auth and page routing |
| `src/main.js` | Entry point and mount |

## Framework APIs Used

- `pulse()` - Reactive state (auth, current page, theme)
- `effect()` - Theme persistence, page transitions
- `el()` - CSS selector DOM creation
- `@if` directives for conditional page rendering
- Event handling for forms and navigation

## Learn More

- [API Reference](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
