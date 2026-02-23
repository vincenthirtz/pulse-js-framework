# Pulse Example: Sports News

Sports news aggregator demonstrating the HTTP client with interceptors and reactive data fetching.

## Features Demonstrated

- `createHttp()` HTTP client with request/response interceptors
- Category filtering across 8 sports types
- Search with 300ms debounce
- Favorites system with localStorage
- Dark mode with CSS variables
- Share functionality (native share API with fallback)
- Loading, error, and empty states

## Getting Started

```bash
cd examples/sports
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Full app with HTTP client setup (~878 lines) |
| `src/App.pulse` | App component layout |

## Framework APIs Used

- `createHttp()` - HTTP client with interceptors (`runtime/http.js`)
- `pulse()` - Reactive state (articles, filters, favorites)
- `effect()` - Data fetching, localStorage sync
- `el()` - CSS selector DOM creation
- `mount()` - Application mounting

## Learn More

- [HTTP Client API](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
