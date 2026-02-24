/**
 * Mock API for Async Patterns Demo
 * Simulates network requests with configurable delay and failure rate.
 */

let requestCount = 0;

export function mockFetch(url, { delay = 500, failRate = 0 } = {}) {
  requestCount++;
  const id = requestCount;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) {
        reject(new Error(`Request #${id} failed (simulated)`));
        return;
      }

      if (url === '/api/users') {
        resolve([
          { id: 1, name: 'Alice', email: 'alice@example.com', status: 'online' },
          { id: 2, name: 'Bob', email: 'bob@example.com', status: 'away' },
          { id: 3, name: 'Charlie', email: 'charlie@example.com', status: 'offline' },
          { id: 4, name: 'Diana', email: 'diana@example.com', status: Math.random() > 0.5 ? 'online' : 'away' }
        ]);
      } else if (url.startsWith('/api/users/')) {
        const userId = parseInt(url.split('/').pop());
        resolve({
          id: userId,
          name: ['Alice', 'Bob', 'Charlie', 'Diana'][userId - 1],
          email: `user${userId}@example.com`,
          bio: 'A passionate developer who loves building with Pulse.',
          joinedAt: '2025-06-15',
          posts: Math.floor(Math.random() * 50)
        });
      } else if (url === '/api/search') {
        resolve([
          { id: 1, title: 'Result A', score: 0.95 },
          { id: 2, title: 'Result B', score: 0.87 },
          { id: 3, title: 'Result C', score: 0.72 }
        ]);
      } else if (url === '/api/status') {
        resolve({
          uptime: Math.floor(Math.random() * 86400),
          requests: Math.floor(Math.random() * 10000),
          cpu: (Math.random() * 100).toFixed(1),
          memory: (Math.random() * 100).toFixed(1),
          timestamp: new Date().toISOString()
        });
      } else {
        resolve({ message: 'OK' });
      }
    }, delay);
  });
}
