/**
 * Pulse Router Demo
 * Demonstrates the SPA routing system
 */

import { pulse, effect, el, mount } from '/runtime/index.js';
import { createRouter } from '/runtime/router.js';

// =============================================================================
// Mock Data
// =============================================================================

const users = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', avatar: '👩‍💼' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Developer', avatar: '👨‍💻' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Designer', avatar: '👩‍🎨' },
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Manager', avatar: '👨‍💼' },
];

const posts = [
  { id: 1, title: 'Getting Started with Pulse', author: 'Alice', date: '2024-01-15', excerpt: 'Learn the basics of Pulse Framework...' },
  { id: 2, title: 'Advanced Routing Techniques', author: 'Bob', date: '2024-01-20', excerpt: 'Deep dive into SPA routing...' },
  { id: 3, title: 'State Management Patterns', author: 'Carol', date: '2024-01-25', excerpt: 'Best practices for managing state...' },
];

// =============================================================================
// Auth State (for protected routes demo)
// =============================================================================

const isAuthenticated = pulse(false);
const currentUser = pulse(null);

function login(user) {
  isAuthenticated.set(true);
  currentUser.set(user);
}

function logout() {
  isAuthenticated.set(false);
  currentUser.set(null);
  router.navigate('/');
}

// =============================================================================
// Page Components
// =============================================================================

function HomePage() {
  const page = el('.page.home');
  page.innerHTML = `
    <h1>🏠 Welcome to Pulse Router Demo</h1>
    <p class="intro">This example demonstrates the Pulse routing system with:</p>
    <ul class="features">
      <li>✅ Basic navigation</li>
      <li>✅ Route parameters (<code>/users/:id</code>)</li>
      <li>✅ Query parameters (<code>?search=...</code>)</li>
      <li>✅ Protected routes (requires login)</li>
      <li>✅ 404 handling</li>
      <li>✅ Active link styling</li>
    </ul>
    <div class="cards">
      <div class="card" onclick="window.router.navigate('/users')">
        <span class="icon">👥</span>
        <h3>Users</h3>
        <p>Browse user profiles</p>
      </div>
      <div class="card" onclick="window.router.navigate('/posts')">
        <span class="icon">📝</span>
        <h3>Posts</h3>
        <p>Read blog posts</p>
      </div>
      <div class="card" onclick="window.router.navigate('/dashboard')">
        <span class="icon">📊</span>
        <h3>Dashboard</h3>
        <p>Protected area</p>
      </div>
    </div>
  `;
  return page;
}

function UsersPage() {
  const page = el('.page.users');

  const header = el('h1', '👥 Users');
  page.appendChild(header);

  const searchInput = el('input.search[type=text][placeholder=Search users...]');
  page.appendChild(searchInput);

  // Read initial query
  effect(() => {
    const query = router.query.get();
    if (query.search) {
      searchInput.value = query.search;
    }
  });

  // Update URL on search
  searchInput.addEventListener('input', (e) => {
    const search = e.target.value;
    if (search) {
      router.navigate('/users', { query: { search } });
    } else {
      router.navigate('/users');
    }
  });

  const list = el('.user-list');

  effect(() => {
    list.innerHTML = '';
    const query = router.query.get();
    const searchTerm = (query.search || '').toLowerCase();

    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(searchTerm) ||
      u.role.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
      list.innerHTML = '<p class="empty">No users found</p>';
      return;
    }

    for (const user of filtered) {
      const card = el('.user-card');
      card.innerHTML = `
        <span class="avatar">${user.avatar}</span>
        <div class="info">
          <h3>${user.name}</h3>
          <p>${user.role}</p>
        </div>
      `;
      card.addEventListener('click', () => router.navigate(`/users/${user.id}`));
      list.appendChild(card);
    }
  });

  page.appendChild(list);
  return page;
}

function UserDetailPage() {
  const page = el('.page.user-detail');

  effect(() => {
    const params = router.params.get();
    const userId = parseInt(params.id);
    const user = users.find(u => u.id === userId);

    if (!user) {
      page.innerHTML = `
        <h1>❌ User Not Found</h1>
        <p>User with ID ${params.id} doesn't exist.</p>
        <button onclick="window.router.navigate('/users')">← Back to Users</button>
      `;
      return;
    }

    page.innerHTML = `
      <button class="back-btn" onclick="window.router.navigate('/users')">← Back</button>
      <div class="user-profile">
        <span class="avatar large">${user.avatar}</span>
        <h1>${user.name}</h1>
        <p class="role">${user.role}</p>
        <div class="details">
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>ID:</strong> ${user.id}</p>
        </div>
      </div>
    `;
  });

  return page;
}

function PostsPage() {
  const page = el('.page.posts');

  const header = el('h1', '📝 Blog Posts');
  page.appendChild(header);

  const list = el('.post-list');

  for (const post of posts) {
    const card = el('.post-card');
    card.innerHTML = `
      <h3>${post.title}</h3>
      <p class="meta">By ${post.author} • ${post.date}</p>
      <p class="excerpt">${post.excerpt}</p>
    `;
    card.addEventListener('click', () => router.navigate(`/posts/${post.id}`));
    list.appendChild(card);
  }

  page.appendChild(list);
  return page;
}

function PostDetailPage() {
  const page = el('.page.post-detail');

  effect(() => {
    const params = router.params.get();
    const postId = parseInt(params.id);
    const post = posts.find(p => p.id === postId);

    if (!post) {
      page.innerHTML = `
        <h1>❌ Post Not Found</h1>
        <p>Post with ID ${params.id} doesn't exist.</p>
        <button onclick="window.router.navigate('/posts')">← Back to Posts</button>
      `;
      return;
    }

    page.innerHTML = `
      <button class="back-btn" onclick="window.router.navigate('/posts')">← Back</button>
      <article>
        <h1>${post.title}</h1>
        <p class="meta">By ${post.author} • ${post.date}</p>
        <div class="content">
          <p>${post.excerpt}</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p>
        </div>
      </article>
    `;
  });

  return page;
}

function DashboardPage() {
  const page = el('.page.dashboard');

  effect(() => {
    const user = currentUser.get();
    page.innerHTML = `
      <h1>📊 Dashboard</h1>
      <p class="welcome">Welcome back, <strong>${user?.name || 'User'}</strong>!</p>
      <div class="stats">
        <div class="stat">
          <span class="value">42</span>
          <span class="label">Projects</span>
        </div>
        <div class="stat">
          <span class="value">128</span>
          <span class="label">Tasks</span>
        </div>
        <div class="stat">
          <span class="value">8</span>
          <span class="label">Team Members</span>
        </div>
      </div>
      <p class="note">🔒 This is a protected route. Only visible when logged in.</p>
    `;
  });

  return page;
}

function NotFoundPage() {
  const page = el('.page.not-found');

  effect(() => {
    const path = router.path.get();
    page.innerHTML = `
      <h1>404</h1>
      <p>Page not found: <code>${path}</code></p>
      <button onclick="window.router.navigate('/')">Go Home</button>
    `;
  });

  return page;
}

// =============================================================================
// Router Setup
// =============================================================================

const router = createRouter({
  routes: {
    '/': HomePage,
    '/users': UsersPage,
    '/users/:id': UserDetailPage,
    '/posts': PostsPage,
    '/posts/:id': PostDetailPage,
    '/dashboard': DashboardPage,
    '*': NotFoundPage
  },
  mode: 'history'
});

// Route guard for protected routes
router.beforeEach((to, from) => {
  if (to.path.startsWith('/dashboard') && !isAuthenticated.get()) {
    alert('Please login to access the dashboard');
    return '/'; // Redirect to home
  }
  return true; // Allow navigation
});

// Expose router globally for onclick handlers
window.router = router;

// =============================================================================
// App Layout
// =============================================================================

function NavLink(path, label) {
  const link = el('a.nav-link', label);
  link.href = path;

  link.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate(path);
  });

  effect(() => {
    const current = router.path.get();
    const isActive = path === '/'
      ? current === '/'
      : current.startsWith(path);
    link.className = `nav-link ${isActive ? 'active' : ''}`;
  });

  return link;
}

function App() {
  const app = el('.app');

  // Header
  const header = el('header');

  const logo = el('.logo', '🧭 Pulse Router');
  logo.addEventListener('click', () => router.navigate('/'));
  header.appendChild(logo);

  const nav = el('nav');
  nav.appendChild(NavLink('/', '🏠 Home'));
  nav.appendChild(NavLink('/users', '👥 Users'));
  nav.appendChild(NavLink('/posts', '📝 Posts'));
  nav.appendChild(NavLink('/dashboard', '📊 Dashboard'));
  header.appendChild(nav);

  // Auth button
  const authBtn = el('button.auth-btn');
  effect(() => {
    if (isAuthenticated.get()) {
      const user = currentUser.get();
      authBtn.textContent = `${user?.avatar || '👤'} Logout`;
      authBtn.onclick = logout;
    } else {
      authBtn.textContent = '🔐 Login';
      authBtn.onclick = () => login(users[0]);
    }
  });
  header.appendChild(authBtn);

  app.appendChild(header);

  // Main content - router outlet
  const main = el('main');
  router.outlet(main);
  app.appendChild(main);

  // Footer with route info
  const footer = el('footer');
  effect(() => {
    const path = router.path.get();
    const params = router.params.get();
    const query = router.query.get();

    footer.innerHTML = `
      <div class="route-info">
        <span><strong>Path:</strong> ${path}</span>
        <span><strong>Params:</strong> ${JSON.stringify(params)}</span>
        <span><strong>Query:</strong> ${JSON.stringify(query)}</span>
      </div>
    `;
  });
  app.appendChild(footer);

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --bg: #0f172a;
  --bg-light: #1e293b;
  --card: #1e293b;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --border: #334155;
  --success: #10b981;
  --danger: #ef4444;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 1.25em;
  font-weight: 700;
  cursor: pointer;
}

nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 16px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: var(--text);
  background: var(--bg);
}

.nav-link.active {
  color: white;
  background: var(--primary);
}

.auth-btn {
  padding: 8px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.auth-btn:hover {
  background: var(--primary-dark);
}

/* Main */
main {
  flex: 1;
  padding: 32px 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Pages */
.page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page h1 {
  font-size: 2em;
  margin-bottom: 16px;
}

.intro {
  font-size: 1.1em;
  color: var(--text-muted);
  margin-bottom: 24px;
}

.features {
  list-style: none;
  margin-bottom: 32px;
}

.features li {
  padding: 8px 0;
  color: var(--text-muted);
}

.features code {
  background: var(--bg-light);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  color: var(--primary);
}

/* Cards */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  background: var(--card);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.card .icon {
  font-size: 2em;
  display: block;
  margin-bottom: 12px;
}

.card h3 {
  margin-bottom: 8px;
}

.card p {
  color: var(--text-muted);
  font-size: 0.9em;
}

/* User list */
.search {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 1em;
  margin-bottom: 24px;
}

.search:focus {
  outline: none;
  border-color: var(--primary);
}

.user-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--card);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
}

.user-card:hover {
  border-color: var(--primary);
}

.avatar {
  font-size: 2em;
}

.avatar.large {
  font-size: 4em;
}

.user-card .info h3 {
  margin-bottom: 4px;
}

.user-card .info p {
  color: var(--text-muted);
  font-size: 0.9em;
}

/* User profile */
.user-profile {
  text-align: center;
  padding: 32px;
}

.user-profile h1 {
  margin-top: 16px;
}

.user-profile .role {
  color: var(--primary);
  font-size: 1.1em;
  margin-bottom: 24px;
}

.user-profile .details {
  background: var(--bg-light);
  padding: 24px;
  border-radius: 12px;
  text-align: left;
  max-width: 400px;
  margin: 0 auto;
}

.user-profile .details p {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.user-profile .details p:last-child {
  border-bottom: none;
}

/* Posts */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-card {
  background: var(--card);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
}

.post-card:hover {
  border-color: var(--primary);
}

.post-card h3 {
  margin-bottom: 8px;
}

.post-card .meta {
  color: var(--text-muted);
  font-size: 0.85em;
  margin-bottom: 12px;
}

.post-card .excerpt {
  color: var(--text-muted);
}

/* Post detail */
article {
  max-width: 800px;
}

article h1 {
  font-size: 2.5em;
  margin-bottom: 16px;
}

article .meta {
  color: var(--text-muted);
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

article .content p {
  margin-bottom: 16px;
  line-height: 1.8;
}

/* Dashboard */
.welcome {
  font-size: 1.2em;
  margin-bottom: 32px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat {
  background: var(--card);
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  border: 1px solid var(--border);
}

.stat .value {
  font-size: 2.5em;
  font-weight: 700;
  color: var(--primary);
  display: block;
}

.stat .label {
  color: var(--text-muted);
}

.note {
  background: rgba(99, 102, 241, 0.1);
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid var(--primary);
}

/* 404 */
.not-found {
  text-align: center;
  padding: 64px 0;
}

.not-found h1 {
  font-size: 6em;
  color: var(--primary);
  margin-bottom: 16px;
}

.not-found code {
  background: var(--bg-light);
  padding: 4px 12px;
  border-radius: 4px;
}

/* Buttons */
button {
  padding: 12px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  margin-top: 16px;
  transition: background 0.2s;
}

button:hover {
  background: var(--primary-dark);
}

.back-btn {
  background: var(--bg-light);
  margin-bottom: 24px;
}

.back-btn:hover {
  background: var(--border);
}

/* Footer */
footer {
  background: var(--bg-light);
  padding: 16px 24px;
  border-top: 1px solid var(--border);
}

.route-info {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  font-size: 0.85em;
  font-family: 'Fira Code', monospace;
}

.route-info span {
  color: var(--text-muted);
}

.route-info strong {
  color: var(--text);
}

/* Empty state */
.empty {
  text-align: center;
  padding: 48px;
  color: var(--text-muted);
}

/* Responsive */
@media (max-width: 768px) {
  header {
    flex-wrap: wrap;
    gap: 16px;
  }

  nav {
    order: 3;
    width: 100%;
    justify-content: center;
  }

  .nav-link {
    padding: 8px 12px;
    font-size: 0.9em;
  }

  .route-info {
    flex-direction: column;
    gap: 8px;
  }
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Mount
// =============================================================================

mount('#app', App());
router.start();

console.log('🧭 Pulse Router Demo loaded!');
