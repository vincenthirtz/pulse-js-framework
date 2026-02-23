/**
 * Server Actions Rate Limiting Example
 *
 * Demonstrates:
 * - Per-action rate limits (different limits per action)
 * - Per-user rate limits (by IP)
 * - Global rate limits (total across all users)
 * - Automatic retry on client
 * - Rate limit headers
 *
 * Run: node examples/server-actions-ratelimit/server.js
 * Test: curl -X POST http://localhost:3000/_actions -H "Content-Type: application/json" ...
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createServerActionMiddleware,
  registerServerAction
} from '../../runtime/server-components/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// Server Actions
// ============================================================================

// Expensive action - limited to 3 requests/min
async function createUser(data) {
  console.log('[createUser] Processing:', data);
  // Simulate database work
  await new Promise(resolve => setTimeout(resolve, 100));
  return { id: Math.random().toString(36), ...data };
}

// Standard action - default limit of 20 requests/min
async function updateProfile(data) {
  console.log('[updateProfile] Processing:', data);
  await new Promise(resolve => setTimeout(resolve, 50));
  return { success: true, ...data };
}

// Bulk action - higher limit of 50 requests/min
async function fetchItems(query) {
  console.log('[fetchItems] Query:', query);
  return Array.from({ length: 10 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    query
  }));
}

// Register actions
registerServerAction('createUser', createUser);
registerServerAction('updateProfile', updateProfile);
registerServerAction('fetchItems', fetchItems);

// ============================================================================
// Express Server
// ============================================================================

const app = express();
app.use(express.json());

// Rate limiting configuration
app.use(createServerActionMiddleware({
  csrfValidation: false, // Disabled for demo simplicity

  // Per-action limits (most specific)
  rateLimitPerAction: {
    'createUser': { maxRequests: 3, windowMs: 60000 },    // 3/min - expensive
    'fetchItems': { maxRequests: 50, windowMs: 60000 },   // 50/min - bulk
    'default': { maxRequests: 20, windowMs: 60000 }       // 20/min - standard
  },

  // Per-user limits (by IP)
  rateLimitPerUser: {
    maxRequests: 100,
    windowMs: 60000  // 100 requests/min per IP
  },

  // Global limits (broadest)
  rateLimitGlobal: {
    maxRequests: 500,
    windowMs: 60000  // 500 requests/min total
  },

  // Custom user identification
  rateLimitIdentify: (context) => {
    return context.ip || 'anonymous';
  },

  // Trusted IPs bypass rate limits
  rateLimitTrustedIPs: ['127.0.0.1', '::1']
}));

// Serve demo page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Actions Rate Limiting Demo</title>
      <style>
        body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        .action { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 4px; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        .rate-limit { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 4px; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
        .status { margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Server Actions Rate Limiting Demo</h1>

      <div class="info">
        <h3>Rate Limits:</h3>
        <ul>
          <li><strong>createUser:</strong> 3 requests/min (per-action)</li>
          <li><strong>updateProfile:</strong> 20 requests/min (default)</li>
          <li><strong>fetchItems:</strong> 50 requests/min (per-action)</li>
          <li><strong>Per-user:</strong> 100 requests/min (by IP)</li>
          <li><strong>Global:</strong> 500 requests/min (total)</li>
          <li><strong>Note:</strong> Localhost is trusted (bypasses limits)</li>
        </ul>
      </div>

      <div class="action">
        <h3>Create User (Limited: 3/min)</h3>
        <button onclick="createUser()">Create User</button>
        <button onclick="createUserBurst()">Burst Test (10 requests)</button>
        <div id="createUser-status" class="status"></div>
      </div>

      <div class="action">
        <h3>Update Profile (Default: 20/min)</h3>
        <button onclick="updateProfile()">Update Profile</button>
        <button onclick="updateProfileBurst()">Burst Test (25 requests)</button>
        <div id="updateProfile-status" class="status"></div>
      </div>

      <div class="action">
        <h3>Fetch Items (Limited: 50/min)</h3>
        <button onclick="fetchItems()">Fetch Items</button>
        <button onclick="fetchItemsBurst()">Burst Test (60 requests)</button>
        <div id="fetchItems-status" class="status"></div>
      </div>

      <script>
        // Helper to display status
        function showStatus(actionId, message, type = 'info') {
          const status = document.getElementById(actionId + '-status');
          const className = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
          status.innerHTML = '<div class="' + className + '">' + message + '</div>';
        }

        // Helper to display rate limit info
        function showRateLimit(actionId, headers) {
          const limit = headers['x-ratelimit-limit'];
          const remaining = headers['x-ratelimit-remaining'];
          const reset = headers['x-ratelimit-reset'];

          if (limit) {
            showStatus(actionId,
              \`Rate Limit: \${remaining}/\${limit} remaining. Resets at \${reset}\`,
              'info'
            );
          }
        }

        // Create User action
        async function createUser() {
          showStatus('createUser', 'Creating user...', 'info');
          try {
            const response = await fetch('/_actions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Pulse-Action': 'createUser'
              },
              body: JSON.stringify({
                args: [{ name: 'John Doe', email: 'john@example.com' }]
              })
            });

            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              const error = await response.json();
              showStatus('createUser',
                \`❌ Rate limited! Retry after \${retryAfter}s. Reason: \${error.reason}\`,
                'error'
              );
            } else {
              const result = await response.json();
              showStatus('createUser', \`✅ User created: \${JSON.stringify(result)}\`, 'success');
              showRateLimit('createUser', Object.fromEntries(response.headers.entries()));
            }
          } catch (error) {
            showStatus('createUser', '❌ Error: ' + error.message, 'error');
          }
        }

        async function createUserBurst() {
          showStatus('createUser', 'Sending 10 requests...', 'info');
          let success = 0, failed = 0;

          for (let i = 0; i < 10; i++) {
            const response = await fetch('/_actions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Pulse-Action': 'createUser'
              },
              body: JSON.stringify({
                args: [{ name: \`User \${i}\`, email: \`user\${i}@example.com\` }]
              })
            });

            if (response.status === 429) {
              failed++;
            } else {
              success++;
            }
          }

          showStatus('createUser',
            \`Burst complete: \${success} succeeded, \${failed} rate limited\`,
            failed > 0 ? 'error' : 'success'
          );
        }

        // Update Profile action
        async function updateProfile() {
          showStatus('updateProfile', 'Updating profile...', 'info');
          try {
            const response = await fetch('/_actions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Pulse-Action': 'updateProfile'
              },
              body: JSON.stringify({
                args: [{ bio: 'Updated bio', avatar: 'avatar.jpg' }]
              })
            });

            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              showStatus('updateProfile', \`❌ Rate limited! Retry after \${retryAfter}s\`, 'error');
            } else {
              const result = await response.json();
              showStatus('updateProfile', \`✅ Profile updated: \${JSON.stringify(result)}\`, 'success');
              showRateLimit('updateProfile', Object.fromEntries(response.headers.entries()));
            }
          } catch (error) {
            showStatus('updateProfile', '❌ Error: ' + error.message, 'error');
          }
        }

        async function updateProfileBurst() {
          showStatus('updateProfile', 'Sending 25 requests...', 'info');
          let success = 0, failed = 0;

          for (let i = 0; i < 25; i++) {
            const response = await fetch('/_actions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Pulse-Action': 'updateProfile'
              },
              body: JSON.stringify({
                args: [{ bio: \`Bio \${i}\` }]
              })
            });

            response.status === 429 ? failed++ : success++;
          }

          showStatus('updateProfile',
            \`Burst complete: \${success} succeeded, \${failed} rate limited\`,
            failed > 0 ? 'error' : 'success'
          );
        }

        // Fetch Items action
        async function fetchItems() {
          showStatus('fetchItems', 'Fetching items...', 'info');
          try {
            const response = await fetch('/_actions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Pulse-Action': 'fetchItems'
              },
              body: JSON.stringify({
                args: [{ category: 'electronics' }]
              })
            });

            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              showStatus('fetchItems', \`❌ Rate limited! Retry after \${retryAfter}s\`, 'error');
            } else {
              const result = await response.json();
              showStatus('fetchItems', \`✅ Fetched \${result.length} items\`, 'success');
              showRateLimit('fetchItems', Object.fromEntries(response.headers.entries()));
            }
          } catch (error) {
            showStatus('fetchItems', '❌ Error: ' + error.message, 'error');
          }
        }

        async function fetchItemsBurst() {
          showStatus('fetchItems', 'Sending 60 requests...', 'info');
          let success = 0, failed = 0;

          for (let i = 0; i < 60; i++) {
            const response = await fetch('/_actions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Pulse-Action': 'fetchItems'
              },
              body: JSON.stringify({
                args: [{ query: \`search-\${i}\` }]
              })
            });

            response.status === 429 ? failed++ : success++;
          }

          showStatus('fetchItems',
            \`Burst complete: \${success} succeeded, \${failed} rate limited\`,
            failed > 0 ? 'error' : 'success'
          );
        }
      </script>
    </body>
    </html>
  `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Server Actions Rate Limiting Demo                           ║
╚══════════════════════════════════════════════════════════════╝

Server running at: http://localhost:${PORT}

Rate Limits:
  • createUser:     3 requests/min  (per-action limit)
  • updateProfile:  20 requests/min (default limit)
  • fetchItems:     50 requests/min (per-action limit)
  • Per-user:       100 requests/min (by IP)
  • Global:         500 requests/min (total)

Note: Localhost (127.0.0.1, ::1) is trusted and bypasses limits.
      To test rate limiting, use a different IP or disable trustedIPs.

Try the burst tests to see rate limiting in action!
  `);
});
