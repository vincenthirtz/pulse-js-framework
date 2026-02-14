# Server Actions Rate Limiting Example

This example demonstrates Pulse Server Actions with flexible rate limiting using the token bucket algorithm.

## Features Demonstrated

- **Per-action rate limits** - Different limits for different actions
- **Per-user rate limits** - Limits by IP address or user ID
- **Global rate limits** - Total limit across all users and actions
- **Token bucket algorithm** - Smooth, burst-tolerant rate limiting (O(1))
- **Automatic retry** - Client automatically retries on 429 (rate limited)
- **Rate limit headers** - Standard headers for client awareness
- **Trusted IPs** - Bypass rate limits for localhost/internal IPs

## Quick Start

### 1. Install Dependencies

```bash
cd examples/server-actions-ratelimit
npm install
```

### 2. Run the Server

```bash
node server.js
```

### 3. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## Rate Limits Configured

| Action | Limit | Type |
|--------|-------|------|
| `createUser` | 3 requests/min | Per-action (expensive) |
| `updateProfile` | 20 requests/min | Default |
| `fetchItems` | 50 requests/min | Per-action (bulk) |
| **Per-user** | 100 requests/min | By IP address |
| **Global** | 500 requests/min | Total across all users |

**Note:** Localhost (`127.0.0.1`, `::1`) is trusted and bypasses rate limits by default.

## Testing Rate Limits

The demo page includes "Burst Test" buttons that send multiple rapid requests to demonstrate rate limiting:

- **Create User Burst** - Sends 10 requests (limit: 3/min) → 7 will be rate limited
- **Update Profile Burst** - Sends 25 requests (limit: 20/min) → 5 will be rate limited
- **Fetch Items Burst** - Sends 60 requests (limit: 50/min) → 10 will be rate limited

### Testing from Command Line

```bash
# Single request
curl -X POST http://localhost:3000/_actions \
  -H "Content-Type: application/json" \
  -H "X-Pulse-Action: createUser" \
  -d '{"args":[{"name":"Alice","email":"alice@example.com"}]}'

# Burst test (requires jq)
for i in {1..10}; do
  curl -X POST http://localhost:3000/_actions \
    -H "Content-Type: application/json" \
    -H "X-Pulse-Action: createUser" \
    -d "{\"args\":[{\"name\":\"User$i\",\"email\":\"user$i@example.com\"}]}" \
    -w "\nStatus: %{http_code}\n" \
    -s | jq .
done
```

## How It Works

### Token Bucket Algorithm

Pulse uses the **token bucket** algorithm for smooth, burst-tolerant rate limiting:

1. Each bucket starts with `maxRequests` tokens
2. Each request consumes 1 token
3. Tokens refill at constant rate: `maxRequests / (windowMs / 1000)` per second
4. Request allowed if bucket has ≥1 token

**Benefits:**
- Allows bursts up to `maxRequests`
- Smooth refill (not window-based)
- O(1) operations
- Memory efficient

### Rate Limit Checking Order

When a request arrives, checks are performed in this order:

1. **Global limit** - Total across all users/actions
2. **Per-user limit** - By IP address or user ID
3. **Per-action limit** - Specific action or default

If any check fails, the request is rejected with HTTP 429.

### Response Headers

All successful responses include rate limit headers:

```
X-RateLimit-Limit: 100          # Max requests allowed
X-RateLimit-Remaining: 95       # Remaining requests
X-RateLimit-Reset: 2026-02-14T10:30:00Z  # When limit resets
```

On rate limit (429):

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30                 # Seconds to wait
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-02-14T10:30:00Z

{
  "error": "Too Many Requests",
  "reason": "Per-action rate limit exceeded: createUser",
  "retryAfter": 30000,
  "code": "PSC_RATE_LIMIT_EXCEEDED"
}
```

## Configuration Options

### Per-Action Limits

Different limits for different actions:

```javascript
rateLimitPerAction: {
  'createUser': { maxRequests: 3, windowMs: 60000 },
  'updateProfile': { maxRequests: 10, windowMs: 60000 },
  'sendEmail': { maxRequests: 5, windowMs: 60000 },
  'default': { maxRequests: 20, windowMs: 60000 }  // Fallback
}
```

### Per-User Limits

Limits per user (identified by IP or user ID):

```javascript
rateLimitPerUser: {
  maxRequests: 100,
  windowMs: 60000  // 100 requests/min per user
}
```

### Global Limits

Total limit across all users and actions:

```javascript
rateLimitGlobal: {
  maxRequests: 10000,
  windowMs: 60000  // 10k requests/min total
}
```

### Custom User Identification

```javascript
rateLimitIdentify: (context) => {
  // Identify by user ID if authenticated, fallback to IP
  return context.userId || context.ip || 'anonymous';
}
```

### Trusted IPs

Bypass rate limits for specific IPs:

```javascript
rateLimitTrustedIPs: [
  '127.0.0.1',        // Localhost
  '::1',              // IPv6 localhost
  '10.0.0.1',         // Internal server
  '172.16.0.1'        // Build server
]
```

## Distributed Rate Limiting (Redis)

For multi-server deployments, use Redis storage:

```javascript
import { createClient } from 'redis';
import {
  createServerActionMiddleware,
  RedisRateLimitStore
} from 'pulse-js-framework/runtime/server-components';

const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

app.use(createServerActionMiddleware({
  rateLimitPerUser: { maxRequests: 100, windowMs: 60000 },
  rateLimitStore: new RedisRateLimitStore(redisClient, {
    prefix: 'myapp:ratelimit:'
  })
}));
```

## Testing Without Trusted IPs

To actually test rate limiting on localhost, disable the trusted IPs:

```javascript
app.use(createServerActionMiddleware({
  // ... rate limit config ...
  rateLimitTrustedIPs: []  // Empty array = no trusted IPs
}));
```

Then restart the server and try the burst tests.

## Performance

All benchmarks run on Node.js v18+ with 100-1000 iterations:

| Operation | Time Complexity | Actual Performance |
|-----------|-----------------|-------------------|
| `check()` | O(1) | ~0.05ms per request |
| Token refill | O(1) | Computed on-demand |
| Memory overhead | O(k) | ~200 bytes per bucket |

## Related Documentation

- [Server Actions](../../CLAUDE.md#server-actions-runtimeserver-componentsactionsjs)
- [Server Components Rate Limiting Guide](../../docs/server-components-rate-limiting.md)
- [Server Components Security](../../docs/security-audit-report.md)
- [CSRF Protection](../../docs/CSRF-IMPLEMENTATION.md)

## Next Steps

1. **Add CSRF Protection** - Enable `csrfValidation: true` for production
2. **Add Authentication** - Use `rateLimitIdentify` to identify by user ID
3. **Monitor Metrics** - Track 429 responses, adjust limits accordingly
4. **Use Redis** - For multi-server deployments
5. **Customize Limits** - Adjust per your application's needs

## License

MIT
