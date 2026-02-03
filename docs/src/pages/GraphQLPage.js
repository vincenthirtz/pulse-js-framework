/**
 * Pulse Documentation - GraphQL Client Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function GraphQLPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="graphql.title"></h1>
    <p class="page-intro" data-i18n="graphql.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="graphql.quickStart"></h2>
      <p data-i18n="graphql.quickStartDesc"></p>
      <div class="code-block">
        <pre><code>import { createGraphQLClient, useQuery, setDefaultClient } from 'pulse-js-framework/runtime/graphql';

// Create client
const client = createGraphQLClient({
  url: 'https://api.example.com/graphql',
  wsUrl: 'wss://api.example.com/graphql',  // For subscriptions
  headers: { 'Authorization': 'Bearer token' }
});

// Set as default for hooks
setDefaultClient(client);

// Query with caching
const { data, loading, error } = useQuery(\`
  query GetUsers {
    users { id name email }
  }
\`);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="graphql.creatingClient"></h2>
      <div class="code-block">
        <pre><code>const client = createGraphQLClient({
  url: 'https://api.example.com/graphql',
  wsUrl: 'wss://api.example.com/graphql',  // For subscriptions
  headers: { 'Authorization': 'Bearer token' },
  timeout: 30000,                          // Request timeout (ms)
  cache: true,                             // Enable query caching (default: true)
  staleTime: 5000,                         // Data fresh for 5s
  dedupe: true                             // Deduplicate in-flight queries
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="graphql.queries"></h2>

      <h3>useQuery</h3>
      <div class="code-block">
        <pre><code>const { data, loading, error, refetch, isStale } = useQuery(
  \`query GetUsers($limit: Int) {
    users(limit: $limit) { id name email }
  }\`,
  { limit: 10 },
  {
    staleTime: 30000,           // Data fresh for 30s
    refetchOnFocus: true,       // Refetch when tab gains focus
    refetchInterval: 60000,     // Poll every 60s
    onSuccess: (data) => console.log('Loaded:', data)
  }
);</code></pre>
      </div>

      <h3 data-i18n="graphql.usingQueryData"></h3>
      <div class="code-block">
        <pre><code>effect(() => {
  if (loading.get()) return el('.spinner');
  if (error.get()) return el('.error', error.get().message);
  return el('ul', data.get()?.users.map(u => el('li', u.name)));
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="graphql.mutations"></h2>

      <h3>useMutation</h3>
      <div class="code-block">
        <pre><code>const { mutate, loading: saving } = useMutation(
  \`mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) { id name }
  }\`,
  {
    onSuccess: (data) => console.log('Created:', data),
    invalidateQueries: ['gql:GetUsers']  // Invalidate related queries
  }
);

// Execute mutation
await mutate({ input: { name: 'John', email: 'john@example.com' } });</code></pre>
      </div>

      <h3 data-i18n="graphql.optimisticUpdates"></h3>
      <p data-i18n="graphql.optimisticUpdatesDesc"></p>
      <div class="code-block">
        <pre><code>const { mutate } = useMutation(
  \`mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) { id name }
  }\`,
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
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="graphql.subscriptions"></h2>

      <h3>useSubscription</h3>
      <div class="code-block">
        <pre><code>const { data: liveData, status, unsubscribe } = useSubscription(
  \`subscription OnNewMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content author createdAt }
  }\`,
  { channelId: '123' },
  {
    onData: (message) => {
      notifications.update(n => [...n, message]);
    },
    shouldResubscribe: true  // Auto-resubscribe on error
  }
);</code></pre>
      </div>

      <h3 data-i18n="graphql.reactiveVariables"></h3>
      <div class="code-block">
        <pre><code>const channelId = pulse('123');

const { data: messages } = useSubscription(
  \`subscription OnMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content }
  }\`,
  () => ({ channelId: channelId.get() }),  // Reactive variables
  { enabled: computed(() => !!channelId.get()) }
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="graphql.errorHandling"></h2>
      <p data-i18n="graphql.errorHandlingDesc"></p>
      <div class="code-block">
        <pre><code>import { GraphQLError } from 'pulse-js-framework/runtime/graphql';

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
}</code></pre>
      </div>

      <h3 data-i18n="graphql.errorCodes"></h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th>Code</th>
              <th data-i18n="graphql.description"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>GRAPHQL_ERROR</code></td>
              <td data-i18n="graphql.errorGraphql"></td>
            </tr>
            <tr>
              <td><code>NETWORK_ERROR</code></td>
              <td data-i18n="graphql.errorNetwork"></td>
            </tr>
            <tr>
              <td><code>TIMEOUT</code></td>
              <td data-i18n="graphql.errorTimeout"></td>
            </tr>
            <tr>
              <td><code>PARSE_ERROR</code></td>
              <td data-i18n="graphql.errorParse"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="graphql.interceptors"></h2>
      <div class="code-block">
        <pre><code>// Request interceptor
client.interceptors.request.use((config) => {
  return { ...config, timestamp: Date.now() };
});

// Response interceptor
client.interceptors.response.use((result) => {
  return { ...result, cached: true };
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="graphql.cacheManagement"></h2>
      <div class="code-block">
        <pre><code>// Invalidate specific query
client.invalidate('gql:GetUsers');

// Clear all cache
client.invalidateAll();

// Get cache statistics
const stats = client.getCacheStats();  // { size, keys }</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="graphql.patterns"></h2>

      <h3 data-i18n="graphql.pagination"></h3>
      <div class="code-block">
        <pre><code>const { data, loading, fetchMore } = useQuery(
  \`query GetUsers($cursor: String) {
    users(after: $cursor, first: 10) {
      edges { node { id name } }
      pageInfo { hasNextPage endCursor }
    }
  }\`
);

const loadMore = () => {
  const pageInfo = data.get()?.users.pageInfo;
  if (pageInfo?.hasNextPage) {
    fetchMore({ cursor: pageInfo.endCursor });
  }
};</code></pre>
      </div>

      <h3 data-i18n="graphql.dependentQueries"></h3>
      <div class="code-block">
        <pre><code>const { data: user } = useQuery(
  \`query GetUser($id: ID!) { user(id: $id) { id teamId } }\`,
  { id: userId }
);

const { data: team } = useQuery(
  \`query GetTeam($id: ID!) { team(id: $id) { id name } }\`,
  () => ({ id: user.get()?.teamId }),
  { enabled: computed(() => !!user.get()?.teamId) }
);</code></pre>
      </div>

      <h3 data-i18n="graphql.realTimeChat"></h3>
      <div class="code-block">
        <pre><code>const { data: messages } = useQuery(\`
  query GetMessages($channelId: ID!) {
    messages(channelId: $channelId) { id content author }
  }
\`, { channelId });

useSubscription(\`
  subscription OnMessage($channelId: ID!) {
    messageAdded(channelId: $channelId) { id content author }
  }
\`, { channelId }, {
  onData: (message) => {
    // Add new message to cache
    client.updateQuery('gql:GetMessages', (data) => ({
      messages: [...data.messages, message]
    }));
  }
});

const { mutate: sendMessage } = useMutation(\`
  mutation SendMessage($channelId: ID!, $content: String!) {
    sendMessage(channelId: $channelId, content: $content) { id }
  }
\`);</code></pre>
      </div>
    </section>
  `;

  // Reactive i18n: update all translated elements when locale/translations change
  effect(() => {
    locale.get();
    translations.get();

    page.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  });

  return page;
}
