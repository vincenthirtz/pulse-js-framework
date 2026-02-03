# GraphQL Client

Pulse provides a GraphQL client with query caching, mutations, subscriptions, and reactive integration.

## Installation

```javascript
import {
  createGraphQLClient, useQuery, useMutation, useSubscription, GraphQLError
} from 'pulse-js-framework/runtime/graphql';
```

## Quick Start

```javascript
// Create client
const client = createGraphQLClient({
  url: 'https://api.example.com/graphql',
  wsUrl: 'wss://api.example.com/graphql',  // For subscriptions
  headers: { 'Authorization': 'Bearer token' }
});

// Set as default for hooks
import { setDefaultClient } from 'pulse-js-framework/runtime/graphql';
setDefaultClient(client);

// Query with caching
const { data, loading, error } = useQuery(`
  query GetUsers {
    users { id name email }
  }
`);
```

## Creating a Client

```javascript
const client = createGraphQLClient({
  url: 'https://api.example.com/graphql',
  wsUrl: 'wss://api.example.com/graphql',  // For subscriptions
  headers: { 'Authorization': 'Bearer token' },
  timeout: 30000,                          // Request timeout (ms)
  cache: true,                             // Enable query caching (default: true)
  staleTime: 5000,                         // Data fresh for 5s
  dedupe: true                             // Deduplicate in-flight queries
});
```

## Queries

### useQuery

```javascript
const { data, loading, error, refetch, isStale } = useQuery(
  `query GetUsers($limit: Int) {
    users(limit: $limit) { id name email }
  }`,
  { limit: 10 },
  {
    staleTime: 30000,           // Data fresh for 30s
    refetchOnFocus: true,       // Refetch when tab gains focus
    refetchInterval: 60000,     // Poll every 60s
    onSuccess: (data) => console.log('Loaded:', data)
  }
);
```

### Using Query Data

```javascript
effect(() => {
  if (loading.get()) return el('.spinner');
  if (error.get()) return el('.error', error.get().message);
  return el('ul', data.get()?.users.map(u => el('li', u.name)));
});
```

## Mutations

### useMutation

```javascript
const { mutate, loading: saving } = useMutation(
  `mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) { id name }
  }`,
  {
    onSuccess: (data) => console.log('Created:', data),
    invalidateQueries: ['gql:GetUsers']  // Invalidate related queries
  }
);

// Execute mutation
await mutate({ input: { name: 'John', email: 'john@example.com' } });
```

### Optimistic Updates

```javascript
const { mutate } = useMutation(
  `mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) { id name }
  }`,
  {
    onMutate: (variables) => {
      // Optimistic update - return rollback context
      const previous = usersCache.get();
      usersCache.update(users => [...users, { id: 'temp', ...variables.input }]);
      return { previous };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      usersCache.set(context.previous);
    },
    onSuccess: (data) => {
      // Replace temp with real data
      usersCache.update(users =>
        users.map(u => u.id === 'temp' ? data.createUser : u)
      );
    }
  }
);
```

## Subscriptions

### useSubscription

```javascript
const { data: liveData, status, unsubscribe } = useSubscription(
  `subscription OnNewMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content author createdAt }
  }`,
  { channelId: '123' },
  {
    onData: (message) => {
      notifications.update(n => [...n, message]);
    },
    shouldResubscribe: true  // Auto-resubscribe on error
  }
);
```

### Reactive Variables

```javascript
const channelId = pulse('123');

const { data: messages } = useSubscription(
  `subscription OnMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content }
  }`,
  () => ({ channelId: channelId.get() }),  // Reactive variables
  { enabled: computed(() => !!channelId.get()) }
);
```

## Error Handling

```javascript
try {
  await client.query('query { user { id } }');
} catch (error) {
  if (GraphQLError.isGraphQLError(error)) {
    error.code;                    // 'GRAPHQL_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT' | ...
    error.errors;                  // GraphQL errors array
    error.data;                    // Partial data (if any)

    // Helper methods
    error.hasPartialData();        // true if response has partial data
    error.isAuthenticationError(); // true if UNAUTHENTICATED
    error.isValidationError();     // true if BAD_USER_INPUT
    error.getFirstError();         // First error message
    error.getAllErrors();          // All error messages
  }
}
```

## Interceptors

```javascript
// Request interceptor
client.interceptors.request.use((config) => {
  return { ...config, timestamp: Date.now() };
});

// Response interceptor
client.interceptors.response.use((result) => {
  return { ...result, cached: true };
});
```

## Cache Management

```javascript
// Invalidate specific query
client.invalidate('gql:GetUsers');

// Clear all cache
client.invalidateAll();

// Get cache statistics
const stats = client.getCacheStats();  // { size, keys }
```

## Common Patterns

### Pagination

```javascript
const { data, loading, fetchMore } = useQuery(
  `query GetUsers($cursor: String) {
    users(after: $cursor, first: 10) {
      edges { node { id name } }
      pageInfo { hasNextPage endCursor }
    }
  }`
);

const loadMore = () => {
  const pageInfo = data.get()?.users.pageInfo;
  if (pageInfo?.hasNextPage) {
    fetchMore({ cursor: pageInfo.endCursor });
  }
};
```

### Dependent Queries

```javascript
const { data: user } = useQuery(
  `query GetUser($id: ID!) { user(id: $id) { id teamId } }`,
  { id: userId }
);

const { data: team } = useQuery(
  `query GetTeam($id: ID!) { team(id: $id) { id name } }`,
  () => ({ id: user.get()?.teamId }),
  { enabled: computed(() => !!user.get()?.teamId) }
);
```

### Real-time Chat

```javascript
const { data: messages } = useQuery(`
  query GetMessages($channelId: ID!) {
    messages(channelId: $channelId) { id content author }
  }
`, { channelId });

const { } = useSubscription(`
  subscription OnMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content author }
  }
`, { channelId }, {
  onData: (message) => {
    // Add new message to cache
    client.updateQuery('gql:GetMessages', (data) => ({
      messages: [...data.messages, message]
    }));
  }
});

const { mutate: sendMessage } = useMutation(`
  mutation SendMessage($channelId: ID!, $content: String!) {
    sendMessage(channelId: $channelId, content: $content) { id }
  }
`);
```
