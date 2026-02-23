# Pulse Example: GraphQL Client

Interactive blog demo showcasing the Pulse GraphQL client with queries, mutations, optimistic updates, and SWR-style caching. Uses a mock GraphQL backend (no server needed).

## Features Demonstrated

- `useQuery()` with reactive variables and SWR caching (`runtime/graphql.js`)
- `useMutation()` for creating posts, likes, and comments
- Cache invalidation and refetch patterns
- Optimistic updates for instant UI feedback
- Loading and error states
- Mock GraphQL resolver for standalone demo

## Getting Started

```bash
cd examples/graphql
npm run dev
```

Open http://localhost:3000

## Key Files

| File | Description |
|------|-------------|
| `src/main.js` | Full app with mock GraphQL backend, queries, and mutations |
| `src/styles.css` | Blog-style layout with responsive design |

## Framework APIs Used

- `createGraphQLClient()` - Client setup with caching
- `setDefaultClient()` - Set global client for hooks
- `useQuery()` - Reactive query with SWR caching
- `useMutation()` - Execute mutations with loading states
- `client.invalidate()` / `client.invalidateAll()` - Cache management
- `pulse()`, `computed()`, `effect()` - Reactive state
- `el()`, `list()`, `when()` - DOM rendering

## Learn More

- [GraphQL Guide](https://pulse-js.fr/graphql)
- [API Reference](https://pulse-js.fr/api-reference)
