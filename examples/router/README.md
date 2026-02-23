# Pulse Example: Router Demo

Single Page Application routing with parameters, query strings, and protected routes.

## Features Demonstrated

- `createRouter()` with multiple page routes
- Dynamic route parameters (`:id`)
- Query parameters for search filtering
- Protected routes with authentication guards
- Active link styling
- 404 not-found handling
- Login/logout flow

## Getting Started

```bash
cd examples/router
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Router setup and page components (~865 lines) |

## Framework APIs Used

- `createRouter()` - SPA router (`runtime/router.js`)
- Route parameters and query strings
- Navigation guards (beforeEnter)
- `router.outlet()` - Route rendering
- `router.link()` - Navigation links
- `pulse()` - Authentication state

## Learn More

- [Router API](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
