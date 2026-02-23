# Pulse Example: Weather App

Weather dashboard using the Open-Meteo API with real-world async data fetching.

## Features Demonstrated

- External API integration (Open-Meteo geocoding + weather)
- Async/await with loading, error, and success states
- Temperature unit conversion (Celsius/Fahrenheit)
- Favorites system with localStorage persistence
- Multi-day forecast display
- Responsive design with weather icons

## Getting Started

```bash
cd examples/meteo
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Full app with API integration (~726 lines) |

## Framework APIs Used

- `pulse()` - Reactive state (weather data, loading, errors, favorites)
- `effect()` - API calls, localStorage sync
- `el()` - CSS selector DOM creation
- `mount()` - Application mounting
- Error handling with try-catch-finally

## Learn More

- [API Reference](https://pulse-js.fr/api-reference)
- [Core Concepts](https://pulse-js.fr/core-concepts)
