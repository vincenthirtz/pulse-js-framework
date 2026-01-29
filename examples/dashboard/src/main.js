/**
 * Admin Dashboard - Pulse Framework Example
 *
 * Demonstrates ALL Pulse features:
 * - Reactivity: pulse, effect, computed, batch, onCleanup, memo, memoComputed, watch, untrack
 * - DOM: el, text, bind, list, when, match, show, portal, errorBoundary, transition, model
 * - Router: createRouter with params, guards, navigation
 * - Store: createStore with persistence, actions, getters, plugins
 * - Lifecycle: onMount, onUnmount, component factory
 */

import {
  pulse, effect, computed, batch, onCleanup, memo, memoComputed,
  watch, untrack, createState, fromPromise
} from '../../../runtime/pulse.js';

import {
  el, text, bind, list, when, match, show, portal,
  errorBoundary, transition, whenTransition, model, mount,
  component, on, onMount, onUnmount, cls, style, prop
} from '../../../runtime/dom.js';

import { createRouter } from '../../../runtime/router.js';
import { createStore, createActions, createGetters, historyPlugin, loggerPlugin } from '../../../runtime/store.js';

// =============================================================================
// Store - Global State Management
// =============================================================================

// Create base store with persistence
let store = createStore({
  // Auth
  user: null,
  isAuthenticated: false,

  // UI
  sidebarOpen: true,
  theme: 'dark',

  // Data
  users: [],
  products: [],
  orders: [],

  // Notifications
  notifications: []
}, {
  persist: true,
  storageKey: 'pulse-dashboard'
});

// Apply plugins (historyPlugin for undo/redo, loggerPlugin for debugging)
store = historyPlugin(store);
// Uncomment for debug logging: store = loggerPlugin(store);

const actions = createActions(store, {
  // Auth actions
  login: (store, user) => {
    batch(() => {
      store.user.set(user);
      store.isAuthenticated.set(true);
    });
  },

  logout: (store) => {
    batch(() => {
      store.user.set(null);
      store.isAuthenticated.set(false);
    });
  },

  // UI actions
  toggleSidebar: (store) => {
    store.sidebarOpen.update(v => !v);
  },

  toggleTheme: (store) => {
    store.theme.update(t => t === 'dark' ? 'light' : 'dark');
  },

  // Notification actions
  addNotification: (store, notification) => {
    const id = Date.now();
    store.notifications.update(n => [...n, { ...notification, id }]);
    // Auto-remove after 5 seconds
    setTimeout(() => {
      store.notifications.update(n => n.filter(x => x.id !== id));
    }, 5000);
  },

  removeNotification: (store, id) => {
    store.notifications.update(n => n.filter(x => x.id !== id));
  },

  // Data actions
  addUser: (store, user) => {
    store.users.update(u => [...u, { ...user, id: Date.now() }]);
  },

  updateUser: (store, id, data) => {
    store.users.update(u => u.map(x => x.id === id ? { ...x, ...data } : x));
  },

  deleteUser: (store, id) => {
    store.users.update(u => u.filter(x => x.id !== id));
  },

  addProduct: (store, product) => {
    store.products.update(p => [...p, { ...product, id: Date.now() }]);
  },

  addOrder: (store, order) => {
    store.orders.update(o => [...o, { ...order, id: Date.now(), date: new Date().toISOString() }]);
  }
});

const getters = createGetters(store, {
  totalUsers: (store) => store.users.get().length,
  totalProducts: (store) => store.products.get().length,
  totalOrders: (store) => store.orders.get().length,
  totalRevenue: (store) => store.orders.get().reduce((sum, o) => sum + (o.total || 0), 0),
  recentOrders: (store) => store.orders.get().slice(-5).reverse(),
  activeUsers: (store) => store.users.get().filter(u => u.status === 'active').length
});

// Initialize with sample data if empty
if (store.users.get().length === 0) {
  batch(() => {
    store.users.set([
      { id: 1, name: 'Alice Martin', email: 'alice@example.com', role: 'Admin', status: 'active', avatar: 'A' },
      { id: 2, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor', status: 'active', avatar: 'B' },
      { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Viewer', status: 'inactive', avatar: 'C' },
      { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Editor', status: 'active', avatar: 'D' },
      { id: 5, name: 'Eva Davis', email: 'eva@example.com', role: 'Admin', status: 'active', avatar: 'E' }
    ]);

    store.products.set([
      { id: 1, name: 'Pro Plan', price: 99, category: 'Subscription', stock: 999 },
      { id: 2, name: 'Enterprise Plan', price: 299, category: 'Subscription', stock: 999 },
      { id: 3, name: 'Custom Theme', price: 49, category: 'Add-on', stock: 100 },
      { id: 4, name: 'API Access', price: 149, category: 'Add-on', stock: 50 }
    ]);

    store.orders.set([
      { id: 1, customer: 'Tech Corp', product: 'Enterprise Plan', total: 299, status: 'completed', date: '2024-01-15' },
      { id: 2, customer: 'StartupXYZ', product: 'Pro Plan', total: 99, status: 'completed', date: '2024-01-16' },
      { id: 3, customer: 'MegaCo', product: 'Enterprise Plan', total: 299, status: 'pending', date: '2024-01-17' },
      { id: 4, customer: 'SmallBiz', product: 'Pro Plan', total: 99, status: 'completed', date: '2024-01-18' },
      { id: 5, customer: 'DevTeam', product: 'API Access', total: 149, status: 'processing', date: '2024-01-19' }
    ]);
  });
}

// =============================================================================
// Router
// =============================================================================

const router = createRouter({
  routes: {
    '/': () => DashboardPage(),
    '/users': () => UsersPage(),
    '/users/:id': ({ params }) => UserDetailPage(params.id),
    '/products': () => ProductsPage(),
    '/orders': () => OrdersPage(),
    '/analytics': () => AnalyticsPage(),
    '/settings': () => SettingsPage(),
    '/login': () => LoginPage()
  },
  mode: 'hash'
});

// Auth guard
router.beforeEach((to, from) => {
  const isAuthenticated = store.isAuthenticated.get();
  const publicRoutes = ['/login'];

  if (!isAuthenticated && !publicRoutes.includes(to.path)) {
    return '/login';
  }

  if (isAuthenticated && to.path === '/login') {
    return '/';
  }

  return true;
});

// =============================================================================
// Modal State
// =============================================================================

const modalState = pulse(null); // { type: 'confirm' | 'form' | 'info', props: {} }

function openModal(type, props = {}) {
  modalState.set({ type, props });
}

function closeModal() {
  modalState.set(null);
}

// =============================================================================
// Components
// =============================================================================

// Sidebar Component
function Sidebar() {
  const nav = el('nav.sidebar');

  effect(() => {
    const isOpen = store.sidebarOpen.get();
    nav.className = `sidebar ${isOpen ? 'open' : 'collapsed'}`;
  });

  // Logo
  const logo = el('.sidebar-logo');
  logo.innerHTML = `<span class="logo-icon">📊</span><span class="logo-text">Dashboard</span>`;
  nav.appendChild(logo);

  // Navigation items
  const navItems = [
    { path: '/', icon: '🏠', label: 'Dashboard' },
    { path: '/users', icon: '👥', label: 'Users' },
    { path: '/products', icon: '📦', label: 'Products' },
    { path: '/orders', icon: '🛒', label: 'Orders' },
    { path: '/analytics', icon: '📈', label: 'Analytics' },
    { path: '/settings', icon: '⚙️', label: 'Settings' }
  ];

  const navList = el('ul.nav-list');

  for (const item of navItems) {
    const li = el('li.nav-item');
    const link = el('a.nav-link');
    link.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;

    effect(() => {
      const currentPath = router.path.get();
      const isActive = currentPath === item.path ||
        (item.path !== '/' && currentPath.startsWith(item.path));
      link.className = `nav-link ${isActive ? 'active' : ''}`;
    });

    on(link, 'click', (e) => {
      e.preventDefault();
      router.navigate(item.path);
    });

    li.appendChild(link);
    navList.appendChild(li);
  }

  nav.appendChild(navList);

  // User section at bottom
  const userSection = el('.sidebar-user');
  effect(() => {
    const user = store.user.get();
    if (user) {
      userSection.innerHTML = `
        <div class="user-avatar">${user.name?.[0] || 'U'}</div>
        <div class="user-info">
          <div class="user-name">${user.name || 'User'}</div>
          <div class="user-role">${user.role || 'Admin'}</div>
        </div>
      `;
    }
  });
  nav.appendChild(userSection);

  return nav;
}

// Header Component
function Header() {
  const header = el('header.header');

  // Toggle sidebar button
  const toggleBtn = el('button.header-toggle', '☰');
  on(toggleBtn, 'click', () => actions.toggleSidebar());
  header.appendChild(toggleBtn);

  // Search bar
  const searchContainer = el('.header-search');
  const searchInput = el('input[type=search][placeholder=Search...]');
  searchContainer.appendChild(searchInput);
  header.appendChild(searchContainer);

  // Right section
  const rightSection = el('.header-right');

  // Theme toggle
  const themeBtn = el('button.header-btn.theme-toggle');
  effect(() => {
    themeBtn.textContent = store.theme.get() === 'dark' ? '🌙' : '☀️';
  });
  on(themeBtn, 'click', () => actions.toggleTheme());
  rightSection.appendChild(themeBtn);

  // Notifications
  const notifBtn = el('button.header-btn.notif-btn');
  notifBtn.innerHTML = '🔔';
  const notifBadge = el('span.notif-badge');
  effect(() => {
    const count = store.notifications.get().length;
    notifBadge.textContent = count > 0 ? count : '';
    notifBadge.style.display = count > 0 ? 'flex' : 'none';
  });
  notifBtn.appendChild(notifBadge);
  rightSection.appendChild(notifBtn);

  // User menu
  const userMenu = el('.user-menu');
  const userBtn = el('button.user-btn');
  effect(() => {
    const user = store.user.get();
    userBtn.innerHTML = `<span class="avatar">${user?.name?.[0] || 'U'}</span>`;
  });

  const dropdown = el('.dropdown');
  dropdown.innerHTML = `
    <a class="dropdown-item" href="#/settings">⚙️ Settings</a>
    <a class="dropdown-item" href="#/profile">👤 Profile</a>
    <hr class="dropdown-divider">
    <button class="dropdown-item logout-btn">🚪 Logout</button>
  `;

  let dropdownOpen = false;
  on(userBtn, 'click', () => {
    dropdownOpen = !dropdownOpen;
    dropdown.classList.toggle('open', dropdownOpen);
  });

  // Close dropdown when clicking outside
  on(document, 'click', (e) => {
    if (!userMenu.contains(e.target) && dropdownOpen) {
      dropdownOpen = false;
      dropdown.classList.remove('open');
    }
  });

  userMenu.appendChild(userBtn);
  userMenu.appendChild(dropdown);
  rightSection.appendChild(userMenu);

  header.appendChild(rightSection);

  // Handle logout
  setTimeout(() => {
    const logoutBtn = dropdown.querySelector('.logout-btn');
    if (logoutBtn) {
      on(logoutBtn, 'click', () => {
        actions.logout();
        router.navigate('/login');
      });
    }
  }, 0);

  return header;
}

// Stat Card Component
function StatCard({ title, value, icon, trend, color = 'primary' }) {
  const card = el(`.stat-card.stat-${color}`);

  const iconEl = el('.stat-icon', icon);
  const content = el('.stat-content');

  const titleEl = el('.stat-title', title);
  const valueEl = el('.stat-value');

  // Handle reactive or static value
  if (typeof value === 'function') {
    effect(() => {
      valueEl.textContent = value();
    });
  } else {
    valueEl.textContent = value;
  }

  content.appendChild(titleEl);
  content.appendChild(valueEl);

  if (trend) {
    const trendEl = el('.stat-trend');
    const trendClass = trend > 0 ? 'up' : 'down';
    const trendIcon = trend > 0 ? '↑' : '↓';
    trendEl.className = `stat-trend ${trendClass}`;
    trendEl.textContent = `${trendIcon} ${Math.abs(trend)}%`;
    content.appendChild(trendEl);
  }

  card.appendChild(iconEl);
  card.appendChild(content);

  return transition(card, { enter: 'fade-in', duration: 300 });
}

// Data Table Component
function DataTable({ columns, data, onRowClick, actions: rowActions }) {
  const container = el('.table-container');
  const table = el('table.data-table');

  // Header
  const thead = el('thead');
  const headerRow = el('tr');
  for (const col of columns) {
    const th = el('th', col.label);
    if (col.sortable) {
      th.classList.add('sortable');
      on(th, 'click', () => {
        // Sorting logic could be added here
      });
    }
    headerRow.appendChild(th);
  }
  if (rowActions) {
    headerRow.appendChild(el('th', 'Actions'));
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = el('tbody');

  effect(() => {
    tbody.innerHTML = '';
    const items = typeof data === 'function' ? data() : data.get();

    for (const item of items) {
      const row = el('tr');

      if (onRowClick) {
        row.classList.add('clickable');
        on(row, 'click', () => onRowClick(item));
      }

      for (const col of columns) {
        const td = el('td');
        const value = item[col.key];

        if (col.render) {
          const rendered = col.render(value, item);
          if (rendered instanceof Node) {
            td.appendChild(rendered);
          } else {
            td.innerHTML = rendered;
          }
        } else {
          td.textContent = value;
        }

        row.appendChild(td);
      }

      if (rowActions) {
        const actionsTd = el('td.actions-cell');
        for (const action of rowActions) {
          const btn = el('button.action-btn', action.icon);
          btn.title = action.label;
          on(btn, 'click', (e) => {
            e.stopPropagation();
            action.handler(item);
          });
          actionsTd.appendChild(btn);
        }
        row.appendChild(actionsTd);
      }

      tbody.appendChild(row);
    }
  });

  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}

// Chart Component (Simple Bar Chart)
function BarChart({ data, title }) {
  const container = el('.chart-container');

  if (title) {
    container.appendChild(el('h3.chart-title', title));
  }

  const chart = el('.bar-chart');

  effect(() => {
    chart.innerHTML = '';
    const items = typeof data === 'function' ? data() : data;
    const maxValue = Math.max(...items.map(d => d.value));

    for (const item of items) {
      const bar = el('.bar-item');
      const height = (item.value / maxValue) * 100;

      bar.innerHTML = `
        <div class="bar" style="height: ${height}%"></div>
        <div class="bar-label">${item.label}</div>
        <div class="bar-value">${item.value}</div>
      `;

      chart.appendChild(bar);
    }
  });

  container.appendChild(chart);
  return container;
}

// Modal Component
function Modal() {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return el('div');

  const backdrop = el('.modal-backdrop');
  const modalContainer = el('.modal-container');

  effect(() => {
    const state = modalState.get();

    if (!state) {
      backdrop.classList.remove('open');
      return;
    }

    backdrop.classList.add('open');
    modalContainer.innerHTML = '';

    const { type, props } = state;

    const modal = el('.modal');
    const header = el('.modal-header');
    header.innerHTML = `<h3>${props.title || 'Modal'}</h3>`;

    const closeBtn = el('button.modal-close', '×');
    on(closeBtn, 'click', closeModal);
    header.appendChild(closeBtn);
    modal.appendChild(header);

    const body = el('.modal-body');

    if (type === 'confirm') {
      body.textContent = props.message || 'Are you sure?';
      modal.appendChild(body);

      const footer = el('.modal-footer');
      const cancelBtn = el('button.btn.btn-secondary', 'Cancel');
      const confirmBtn = el('button.btn.btn-danger', props.confirmText || 'Confirm');

      on(cancelBtn, 'click', closeModal);
      on(confirmBtn, 'click', () => {
        if (props.onConfirm) props.onConfirm();
        closeModal();
      });

      footer.appendChild(cancelBtn);
      footer.appendChild(confirmBtn);
      modal.appendChild(footer);
    } else if (type === 'form') {
      if (props.content) {
        const content = typeof props.content === 'function' ? props.content() : props.content;
        if (content instanceof Node) {
          body.appendChild(content);
        } else {
          body.innerHTML = content;
        }
      }
      modal.appendChild(body);
    } else if (type === 'info') {
      body.innerHTML = props.content || '';
      modal.appendChild(body);

      const footer = el('.modal-footer');
      const okBtn = el('button.btn.btn-primary', 'OK');
      on(okBtn, 'click', closeModal);
      footer.appendChild(okBtn);
      modal.appendChild(footer);
    }

    modalContainer.appendChild(transition(modal, { enter: 'scale-in', duration: 200 }));
  });

  on(backdrop, 'click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  backdrop.appendChild(modalContainer);
  modalRoot.appendChild(backdrop);

  return el('div'); // Placeholder
}

// Notification Toast
function NotificationToast() {
  const container = el('.toast-container');

  effect(() => {
    container.innerHTML = '';
    const notifications = store.notifications.get();

    for (const notif of notifications) {
      const toast = el(`.toast.toast-${notif.type || 'info'}`);
      toast.innerHTML = `
        <span class="toast-icon">${notif.type === 'success' ? '✓' : notif.type === 'error' ? '✗' : 'ℹ'}</span>
        <span class="toast-message">${notif.message}</span>
        <button class="toast-close">×</button>
      `;

      const closeBtn = toast.querySelector('.toast-close');
      on(closeBtn, 'click', () => actions.removeNotification(notif.id));

      container.appendChild(transition(toast, { enter: 'slide-in-right', duration: 300 }));
    }
  });

  return container;
}

// =============================================================================
// Pages
// =============================================================================

function LoginPage() {
  const page = el('.login-page');

  const card = el('.login-card');
  card.innerHTML = `
    <div class="login-logo">📊</div>
    <h1>Admin Dashboard</h1>
    <p class="login-subtitle">Sign in to your account</p>
  `;

  const form = el('form.login-form');

  const emailGroup = el('.form-group');
  emailGroup.innerHTML = '<label>Email</label>';
  const emailInput = el('input[type=email][placeholder=admin@example.com]');
  emailInput.value = 'admin@example.com';
  emailGroup.appendChild(emailInput);
  form.appendChild(emailGroup);

  const passGroup = el('.form-group');
  passGroup.innerHTML = '<label>Password</label>';
  const passInput = el('input[type=password][placeholder=••••••••]');
  passInput.value = 'password';
  passGroup.appendChild(passInput);
  form.appendChild(passGroup);

  const submitBtn = el('button.btn.btn-primary.btn-block[type=submit]', 'Sign In');
  form.appendChild(submitBtn);

  on(form, 'submit', (e) => {
    e.preventDefault();

    // Simulate login
    const email = emailInput.value;
    if (email) {
      actions.login({
        name: 'Admin User',
        email: email,
        role: 'Administrator'
      });
      actions.addNotification({ type: 'success', message: 'Welcome back!' });
      router.navigate('/');
    }
  });

  card.appendChild(form);
  page.appendChild(card);

  return page;
}

function DashboardPage() {
  const page = el('.page.dashboard-page');

  // Page header
  const header = el('.page-header');
  header.innerHTML = '<h1>Dashboard</h1><p>Welcome back! Here\'s what\'s happening.</p>';
  page.appendChild(header);

  // Stats grid
  const statsGrid = el('.stats-grid');

  statsGrid.appendChild(StatCard({
    title: 'Total Users',
    value: () => getters.totalUsers.get().toLocaleString(),
    icon: '👥',
    trend: 12,
    color: 'primary'
  }));

  statsGrid.appendChild(StatCard({
    title: 'Products',
    value: () => getters.totalProducts.get().toLocaleString(),
    icon: '📦',
    trend: 5,
    color: 'success'
  }));

  statsGrid.appendChild(StatCard({
    title: 'Orders',
    value: () => getters.totalOrders.get().toLocaleString(),
    icon: '🛒',
    trend: -3,
    color: 'warning'
  }));

  statsGrid.appendChild(StatCard({
    title: 'Revenue',
    value: () => '$' + getters.totalRevenue.get().toLocaleString(),
    icon: '💰',
    trend: 8,
    color: 'info'
  }));

  page.appendChild(statsGrid);

  // Charts row
  const chartsRow = el('.charts-row');

  // Revenue chart
  const revenueChart = BarChart({
    title: 'Monthly Revenue',
    data: [
      { label: 'Jan', value: 1200 },
      { label: 'Feb', value: 1900 },
      { label: 'Mar', value: 1500 },
      { label: 'Apr', value: 2200 },
      { label: 'May', value: 1800 },
      { label: 'Jun', value: 2500 }
    ]
  });
  chartsRow.appendChild(revenueChart);

  // Activity chart
  const activityChart = BarChart({
    title: 'User Activity',
    data: [
      { label: 'Mon', value: 45 },
      { label: 'Tue', value: 62 },
      { label: 'Wed', value: 55 },
      { label: 'Thu', value: 78 },
      { label: 'Fri', value: 65 },
      { label: 'Sat', value: 35 },
      { label: 'Sun', value: 28 }
    ]
  });
  chartsRow.appendChild(activityChart);

  page.appendChild(chartsRow);

  // Recent orders
  const ordersSection = el('.section');
  ordersSection.innerHTML = '<h2>Recent Orders</h2>';

  const ordersTable = DataTable({
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'customer', label: 'Customer' },
      { key: 'product', label: 'Product' },
      { key: 'total', label: 'Total', render: (v) => `$${v}` },
      { key: 'status', label: 'Status', render: (v) => `<span class="badge badge-${v}">${v}</span>` }
    ],
    data: () => getters.recentOrders.get()
  });

  ordersSection.appendChild(ordersTable);
  page.appendChild(ordersSection);

  return page;
}

function UsersPage() {
  const page = el('.page.users-page');

  const header = el('.page-header');
  const title = el('div');
  title.innerHTML = '<h1>Users</h1><p>Manage your team members</p>';
  header.appendChild(title);

  const addBtn = el('button.btn.btn-primary', '+ Add User');
  on(addBtn, 'click', () => {
    openModal('form', {
      title: 'Add New User',
      content: () => UserForm()
    });
  });
  header.appendChild(addBtn);

  page.appendChild(header);

  // Search and filter
  const toolbar = el('.toolbar');
  const searchInput = el('input.search-input[type=search][placeholder=Search users...]');
  const searchTerm = pulse('');
  model(searchInput, searchTerm);
  toolbar.appendChild(searchInput);
  page.appendChild(toolbar);

  // Filtered users computed
  const filteredUsers = computed(() => {
    const term = searchTerm.get().toLowerCase();
    const users = store.users.get();
    if (!term) return users;
    return users.filter(u =>
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const table = DataTable({
    columns: [
      { key: 'avatar', label: '', render: (v, item) => `<div class="avatar">${item.name[0]}</div>` },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role', render: (v) => `<span class="badge">${v}</span>` },
      { key: 'status', label: 'Status', render: (v) => `<span class="badge badge-${v}">${v}</span>` }
    ],
    data: () => filteredUsers.get(),
    onRowClick: (user) => router.navigate(`/users/${user.id}`),
    actions: [
      { icon: '✏️', label: 'Edit', handler: (user) => {
        openModal('form', {
          title: 'Edit User',
          content: () => UserForm(user)
        });
      }},
      { icon: '🗑️', label: 'Delete', handler: (user) => {
        openModal('confirm', {
          title: 'Delete User',
          message: `Are you sure you want to delete ${user.name}?`,
          confirmText: 'Delete',
          onConfirm: () => {
            actions.deleteUser(user.id);
            actions.addNotification({ type: 'success', message: 'User deleted' });
          }
        });
      }}
    ]
  });

  page.appendChild(table);

  return page;
}

function UserForm(existingUser = null) {
  const form = el('form.user-form');

  const nameState = pulse(existingUser?.name || '');
  const emailState = pulse(existingUser?.email || '');
  const roleState = pulse(existingUser?.role || 'Viewer');
  const statusState = pulse(existingUser?.status || 'active');

  // Name field
  const nameGroup = el('.form-group');
  nameGroup.innerHTML = '<label>Name</label>';
  const nameInput = el('input[type=text][placeholder=Full name]');
  model(nameInput, nameState);
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  // Email field
  const emailGroup = el('.form-group');
  emailGroup.innerHTML = '<label>Email</label>';
  const emailInput = el('input[type=email][placeholder=email@example.com]');
  model(emailInput, emailState);
  emailGroup.appendChild(emailInput);
  form.appendChild(emailGroup);

  // Role field
  const roleGroup = el('.form-group');
  roleGroup.innerHTML = '<label>Role</label>';
  const roleSelect = el('select');
  roleSelect.innerHTML = `
    <option value="Admin">Admin</option>
    <option value="Editor">Editor</option>
    <option value="Viewer">Viewer</option>
  `;
  model(roleSelect, roleState);
  roleGroup.appendChild(roleSelect);
  form.appendChild(roleGroup);

  // Status field
  const statusGroup = el('.form-group');
  statusGroup.innerHTML = '<label>Status</label>';
  const statusSelect = el('select');
  statusSelect.innerHTML = `
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  `;
  model(statusSelect, statusState);
  statusGroup.appendChild(statusSelect);
  form.appendChild(statusGroup);

  // Submit button
  const submitBtn = el('button.btn.btn-primary[type=submit]', existingUser ? 'Update' : 'Create');

  on(form, 'submit', (e) => {
    e.preventDefault();

    const userData = {
      name: nameState.get(),
      email: emailState.get(),
      role: roleState.get(),
      status: statusState.get()
    };

    if (existingUser) {
      actions.updateUser(existingUser.id, userData);
      actions.addNotification({ type: 'success', message: 'User updated' });
    } else {
      actions.addUser(userData);
      actions.addNotification({ type: 'success', message: 'User created' });
    }

    closeModal();
  });

  form.appendChild(submitBtn);

  return form;
}

function UserDetailPage(userId) {
  const page = el('.page.user-detail-page');

  // Find user
  const user = computed(() => {
    const users = store.users.get();
    return users.find(u => u.id === parseInt(userId));
  });

  effect(() => {
    page.innerHTML = '';
    const u = user.get();

    if (!u) {
      page.innerHTML = '<div class="not-found"><h2>User not found</h2><p>The requested user does not exist.</p></div>';
      return;
    }

    const header = el('.page-header');
    const backBtn = el('button.btn.btn-secondary', '← Back');
    on(backBtn, 'click', () => router.navigate('/users'));
    header.appendChild(backBtn);
    page.appendChild(header);

    const card = el('.user-detail-card');
    card.innerHTML = `
      <div class="user-avatar-large">${u.name[0]}</div>
      <h2>${u.name}</h2>
      <p class="user-email">${u.email}</p>
      <div class="user-badges">
        <span class="badge">${u.role}</span>
        <span class="badge badge-${u.status}">${u.status}</span>
      </div>
    `;
    page.appendChild(card);

    // Activity section
    const activitySection = el('.section');
    activitySection.innerHTML = `
      <h3>Recent Activity</h3>
      <ul class="activity-list">
        <li><span class="activity-time">2 hours ago</span> Logged in</li>
        <li><span class="activity-time">1 day ago</span> Updated profile</li>
        <li><span class="activity-time">3 days ago</span> Changed password</li>
      </ul>
    `;
    page.appendChild(activitySection);
  });

  return page;
}

function ProductsPage() {
  const page = el('.page.products-page');

  const header = el('.page-header');
  header.innerHTML = '<div><h1>Products</h1><p>Manage your product catalog</p></div>';

  const addBtn = el('button.btn.btn-primary', '+ Add Product');
  on(addBtn, 'click', () => {
    actions.addProduct({
      name: `New Product ${Date.now() % 1000}`,
      price: Math.floor(Math.random() * 200) + 10,
      category: 'Add-on',
      stock: Math.floor(Math.random() * 100)
    });
    actions.addNotification({ type: 'success', message: 'Product added' });
  });
  header.appendChild(addBtn);
  page.appendChild(header);

  // Product cards
  const grid = el('.products-grid');

  effect(() => {
    grid.innerHTML = '';
    const products = store.products.get();

    for (const product of products) {
      const card = el('.product-card');
      card.innerHTML = `
        <div class="product-icon">📦</div>
        <h3>${product.name}</h3>
        <p class="product-category">${product.category}</p>
        <div class="product-price">$${product.price}</div>
        <div class="product-stock">Stock: ${product.stock}</div>
      `;
      grid.appendChild(transition(card, { enter: 'fade-in', duration: 200 }));
    }
  });

  page.appendChild(grid);

  return page;
}

function OrdersPage() {
  const page = el('.page.orders-page');

  const header = el('.page-header');
  header.innerHTML = '<div><h1>Orders</h1><p>Track and manage orders</p></div>';
  page.appendChild(header);

  // Status filters
  const filterBar = el('.filter-bar');
  const statuses = ['all', 'pending', 'processing', 'completed'];
  const activeFilter = pulse('all');

  for (const status of statuses) {
    const btn = el('button.filter-btn', status.charAt(0).toUpperCase() + status.slice(1));
    effect(() => {
      btn.className = `filter-btn ${activeFilter.get() === status ? 'active' : ''}`;
    });
    on(btn, 'click', () => activeFilter.set(status));
    filterBar.appendChild(btn);
  }
  page.appendChild(filterBar);

  // Filtered orders
  const filteredOrders = computed(() => {
    const filter = activeFilter.get();
    const orders = store.orders.get();
    if (filter === 'all') return orders;
    return orders.filter(o => o.status === filter);
  });

  const table = DataTable({
    columns: [
      { key: 'id', label: 'Order ID', render: (v) => `#${v}` },
      { key: 'date', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
      { key: 'customer', label: 'Customer' },
      { key: 'product', label: 'Product' },
      { key: 'total', label: 'Total', render: (v) => `$${v}` },
      { key: 'status', label: 'Status', render: (v) => `<span class="badge badge-${v}">${v}</span>` }
    ],
    data: () => filteredOrders.get()
  });

  page.appendChild(table);

  return page;
}

function AnalyticsPage() {
  const page = el('.page.analytics-page');

  const header = el('.page-header');
  header.innerHTML = '<div><h1>Analytics</h1><p>Insights and performance metrics</p></div>';
  page.appendChild(header);

  // Memoized expensive computation
  const computeStats = memo((orders) => {
    const total = orders.reduce((sum, o) => sum + o.total, 0);
    const avg = orders.length > 0 ? total / orders.length : 0;
    const max = Math.max(...orders.map(o => o.total), 0);
    return { total, avg, max, count: orders.length };
  });

  const statsRow = el('.stats-row');

  effect(() => {
    const orders = store.orders.get();
    const stats = computeStats(orders);

    statsRow.innerHTML = `
      <div class="stat-box">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">$${stats.total.toLocaleString()}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Average Order</div>
        <div class="stat-value">$${stats.avg.toFixed(2)}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Largest Order</div>
        <div class="stat-value">$${stats.max}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Total Orders</div>
        <div class="stat-value">${stats.count}</div>
      </div>
    `;
  });

  page.appendChild(statsRow);

  // Charts
  const chartsSection = el('.charts-section');

  chartsSection.appendChild(BarChart({
    title: 'Orders by Status',
    data: () => {
      const orders = store.orders.get();
      const statusCounts = {};
      orders.forEach(o => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      });
      return Object.entries(statusCounts).map(([label, value]) => ({ label, value }));
    }
  }));

  page.appendChild(chartsSection);

  return page;
}

function SettingsPage() {
  const page = el('.page.settings-page');

  const header = el('.page-header');
  header.innerHTML = '<div><h1>Settings</h1><p>Configure your preferences</p></div>';
  page.appendChild(header);

  // Settings sections
  const settingsContainer = el('.settings-container');

  // Appearance
  const appearanceSection = el('.settings-section');
  appearanceSection.innerHTML = '<h3>Appearance</h3>';

  const themeRow = el('.settings-row');
  themeRow.innerHTML = '<div class="settings-label"><strong>Theme</strong><p>Choose your preferred color scheme</p></div>';

  const themeToggle = el('.theme-toggle');
  const lightBtn = el('button.theme-btn', '☀️ Light');
  const darkBtn = el('button.theme-btn', '🌙 Dark');

  effect(() => {
    const theme = store.theme.get();
    lightBtn.className = `theme-btn ${theme === 'light' ? 'active' : ''}`;
    darkBtn.className = `theme-btn ${theme === 'dark' ? 'active' : ''}`;
  });

  on(lightBtn, 'click', () => store.theme.set('light'));
  on(darkBtn, 'click', () => store.theme.set('dark'));

  themeToggle.appendChild(lightBtn);
  themeToggle.appendChild(darkBtn);
  themeRow.appendChild(themeToggle);
  appearanceSection.appendChild(themeRow);
  settingsContainer.appendChild(appearanceSection);

  // Data Management
  const dataSection = el('.settings-section');
  dataSection.innerHTML = '<h3>Data Management</h3>';

  const exportRow = el('.settings-row');
  exportRow.innerHTML = '<div class="settings-label"><strong>Export Data</strong><p>Download all your data as JSON</p></div>';
  const exportBtn = el('button.btn.btn-secondary', 'Export');
  on(exportBtn, 'click', () => {
    const data = {
      users: store.users.get(),
      products: store.products.get(),
      orders: store.orders.get()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard-export.json';
    a.click();
    actions.addNotification({ type: 'success', message: 'Data exported successfully' });
  });
  exportRow.appendChild(exportBtn);
  dataSection.appendChild(exportRow);

  const resetRow = el('.settings-row');
  resetRow.innerHTML = '<div class="settings-label"><strong>Reset Data</strong><p>Clear all data and start fresh</p></div>';
  const resetBtn = el('button.btn.btn-danger', 'Reset');
  on(resetBtn, 'click', () => {
    openModal('confirm', {
      title: 'Reset All Data',
      message: 'This will delete all users, products, and orders. This action cannot be undone.',
      confirmText: 'Reset Everything',
      onConfirm: () => {
        batch(() => {
          store.users.set([]);
          store.products.set([]);
          store.orders.set([]);
        });
        actions.addNotification({ type: 'success', message: 'All data has been reset' });
      }
    });
  });
  resetRow.appendChild(resetBtn);
  dataSection.appendChild(resetRow);

  settingsContainer.appendChild(dataSection);
  page.appendChild(settingsContainer);

  return page;
}

// =============================================================================
// Main App Layout
// =============================================================================

function AppLayout() {
  const app = el('.app');

  // Apply theme
  effect(() => {
    const theme = store.theme.get();
    document.body.className = `theme-${theme}`;
  });

  // Check auth and render accordingly
  effect(() => {
    app.innerHTML = '';
    const isAuthenticated = store.isAuthenticated.get();

    if (!isAuthenticated) {
      // Just render router outlet for login page
      const main = el('main.main-content.login-layout');
      router.outlet(main);
      app.appendChild(main);
    } else {
      // Full layout with sidebar
      app.appendChild(Sidebar());

      const mainWrapper = el('.main-wrapper');
      mainWrapper.appendChild(Header());

      const content = el('.content');
      router.outlet(content);
      mainWrapper.appendChild(content);

      app.appendChild(mainWrapper);
    }

    // Add modal and notifications (always)
    app.appendChild(NotificationToast());
  });

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
/* CSS Variables */
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #3b82f6;

  --bg: #0f172a;
  --bg-light: #1e293b;
  --bg-card: #1e293b;
  --border: #334155;
  --text: #e2e8f0;
  --text-muted: #94a3b8;

  --sidebar-width: 260px;
  --sidebar-collapsed: 70px;
  --header-height: 64px;
  --radius: 12px;
  --transition: 0.2s ease;
}

.theme-light {
  --bg: #f8fafc;
  --bg-light: #ffffff;
  --bg-card: #ffffff;
  --border: #e2e8f0;
  --text: #1e293b;
  --text-muted: #64748b;
}

/* Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  overflow-x: hidden;
}

/* App Layout */
.app {
  display: flex;
  min-height: 100vh;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: var(--sidebar-width);
  transition: margin var(--transition);
}

.sidebar.collapsed ~ .main-wrapper {
  margin-left: var(--sidebar-collapsed);
}

/* Sidebar */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-light);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width var(--transition);
  z-index: 100;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.sidebar.collapsed .logo-text,
.sidebar.collapsed .nav-label,
.sidebar.collapsed .user-info {
  opacity: 0;
  width: 0;
}

.sidebar-logo {
  padding: 20px;
  font-size: 1.5em;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}

.logo-icon {
  font-size: 1.2em;
}

.logo-text {
  background: linear-gradient(135deg, var(--primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  white-space: nowrap;
  transition: opacity var(--transition);
}

.nav-list {
  list-style: none;
  padding: 16px 12px;
  flex: 1;
}

.nav-item {
  margin-bottom: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: 8px;
  transition: all var(--transition);
  cursor: pointer;
}

.nav-link:hover {
  background: var(--bg);
  color: var(--text);
}

.nav-link.active {
  background: var(--primary);
  color: white;
}

.nav-icon {
  font-size: 1.2em;
  width: 24px;
  text-align: center;
}

.nav-label {
  white-space: nowrap;
  transition: opacity var(--transition);
}

.sidebar-user {
  padding: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
}

.user-info {
  white-space: nowrap;
  transition: opacity var(--transition);
}

.user-name {
  font-weight: 600;
  font-size: 0.9em;
}

.user-role {
  font-size: 0.75em;
  color: var(--text-muted);
}

/* Header */
.header {
  height: var(--header-height);
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-toggle {
  background: none;
  border: none;
  color: var(--text);
  font-size: 1.5em;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background var(--transition);
}

.header-toggle:hover {
  background: var(--bg);
}

.header-search {
  flex: 1;
  max-width: 400px;
}

.header-search input {
  width: 100%;
  padding: 10px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9em;
}

.header-search input::placeholder {
  color: var(--text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.header-btn {
  background: none;
  border: none;
  color: var(--text);
  font-size: 1.3em;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  position: relative;
  transition: background var(--transition);
}

.header-btn:hover {
  background: var(--bg);
}

.notif-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--danger);
  color: white;
  font-size: 0.65em;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.user-menu {
  position: relative;
}

.user-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.user-btn .avatar {
  width: 36px;
  height: 36px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
}

.dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  min-width: 180px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all var(--transition);
  z-index: 100;
}

.dropdown.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: block;
  padding: 10px 16px;
  color: var(--text);
  text-decoration: none;
  transition: background var(--transition);
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  font-size: 0.9em;
}

.dropdown-item:hover {
  background: var(--bg);
}

.dropdown-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 4px 0;
}

/* Content */
.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* Page */
.page {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 1.8em;
  margin-bottom: 4px;
}

.page-header p {
  color: var(--text-muted);
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--border);
  transition: transform var(--transition), box-shadow var(--transition);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.stat-icon {
  font-size: 2.5em;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.stat-primary .stat-icon { background: rgba(99, 102, 241, 0.1); }
.stat-success .stat-icon { background: rgba(16, 185, 129, 0.1); }
.stat-warning .stat-icon { background: rgba(245, 158, 11, 0.1); }
.stat-info .stat-icon { background: rgba(59, 130, 246, 0.1); }

.stat-title {
  font-size: 0.9em;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.8em;
  font-weight: 700;
}

.stat-trend {
  font-size: 0.85em;
  margin-top: 4px;
}

.stat-trend.up { color: var(--success); }
.stat-trend.down { color: var(--danger); }

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.chart-container {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 24px;
  border: 1px solid var(--border);
}

.chart-title {
  font-size: 1.1em;
  margin-bottom: 20px;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 200px;
  padding-top: 20px;
}

.bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar {
  width: 100%;
  max-width: 50px;
  background: linear-gradient(to top, var(--primary), var(--primary-dark));
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  margin-top: auto;
}

.bar-label {
  font-size: 0.75em;
  color: var(--text-muted);
  margin-top: 8px;
}

.bar-value {
  font-size: 0.8em;
  font-weight: 600;
  position: absolute;
  top: -20px;
}

/* Tables */
.table-container {
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 16px;
  text-align: left;
}

.data-table th {
  background: var(--bg);
  font-weight: 600;
  font-size: 0.85em;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.data-table th.sortable {
  cursor: pointer;
}

.data-table th.sortable:hover {
  color: var(--text);
}

.data-table tr {
  border-bottom: 1px solid var(--border);
  transition: background var(--transition);
}

.data-table tr:last-child {
  border-bottom: none;
}

.data-table tr.clickable {
  cursor: pointer;
}

.data-table tr:hover {
  background: var(--bg);
}

.data-table .avatar {
  width: 32px;
  height: 32px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.9em;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: background var(--transition);
}

.action-btn:hover {
  background: var(--bg);
}

/* Badges */
.badge {
  display: inline-block;
  padding: 4px 10px;
  font-size: 0.75em;
  font-weight: 600;
  border-radius: 100px;
  background: var(--bg);
}

.badge-active, .badge-completed { background: rgba(16, 185, 129, 0.1); color: var(--success); }
.badge-inactive { background: rgba(148, 163, 184, 0.1); color: var(--text-muted); }
.badge-pending { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
.badge-processing { background: rgba(59, 130, 246, 0.1); color: var(--info); }

/* Buttons */
.btn {
  padding: 10px 20px;
  font-size: 0.9em;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--border);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-block {
  width: 100%;
  justify-content: center;
}

/* Forms */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9em;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.95em;
  transition: border-color var(--transition);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  max-width: 300px;
  padding: 10px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-btn {
  padding: 8px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition);
}

.filter-btn:hover {
  color: var(--text);
}

.filter-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

/* Products Grid */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.product-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 24px;
  border: 1px solid var(--border);
  text-align: center;
  transition: transform var(--transition), box-shadow var(--transition);
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.product-icon {
  font-size: 3em;
  margin-bottom: 16px;
}

.product-card h3 {
  margin-bottom: 8px;
}

.product-category {
  font-size: 0.85em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.product-price {
  font-size: 1.5em;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 8px;
}

.product-stock {
  font-size: 0.85em;
  color: var(--text-muted);
}

/* Analytics */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-box {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 24px;
  border: 1px solid var(--border);
  text-align: center;
}

.stat-box .stat-label {
  font-size: 0.9em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.stat-box .stat-value {
  font-size: 2em;
  font-weight: 700;
}

.charts-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

/* Settings */
.settings-container {
  max-width: 800px;
}

.settings-section {
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  margin-bottom: 24px;
  overflow: hidden;
}

.settings-section h3 {
  padding: 16px 24px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-size: 1em;
}

.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.settings-row:last-child {
  border-bottom: none;
}

.settings-label strong {
  display: block;
  margin-bottom: 4px;
}

.settings-label p {
  font-size: 0.85em;
  color: var(--text-muted);
  margin: 0;
}

.theme-toggle {
  display: flex;
  gap: 8px;
}

.theme-btn {
  padding: 8px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition);
}

.theme-btn:hover {
  color: var(--text);
}

.theme-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

/* User Detail */
.user-detail-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 40px;
  border: 1px solid var(--border);
  text-align: center;
  max-width: 500px;
  margin: 0 auto 24px;
}

.user-avatar-large {
  width: 100px;
  height: 100px;
  background: var(--primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5em;
  font-weight: 700;
  color: white;
  margin: 0 auto 16px;
}

.user-detail-card h2 {
  margin-bottom: 8px;
}

.user-email {
  color: var(--text-muted);
  margin-bottom: 16px;
}

.user-badges {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.activity-list {
  list-style: none;
}

.activity-list li {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.activity-list li:last-child {
  border-bottom: none;
}

.activity-time {
  color: var(--text-muted);
  font-size: 0.85em;
  margin-right: 12px;
}

.section {
  margin-bottom: 24px;
}

.section h2, .section h3 {
  margin-bottom: 16px;
}

.not-found {
  text-align: center;
  padding: 60px 20px;
}

.not-found h2 {
  margin-bottom: 8px;
}

.not-found p {
  color: var(--text-muted);
}

/* Login Page */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 20px;
}

.login-layout {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  border: 1px solid var(--border);
  text-align: center;
}

.login-logo {
  font-size: 4em;
  margin-bottom: 16px;
}

.login-card h1 {
  margin-bottom: 8px;
}

.login-subtitle {
  color: var(--text-muted);
  margin-bottom: 32px;
}

.login-form {
  text-align: left;
}

.login-form .btn {
  margin-top: 24px;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition);
}

.modal-backdrop.open {
  opacity: 1;
  visibility: visible;
}

.modal-container {
  max-width: 90%;
  max-height: 90%;
}

.modal {
  background: var(--bg-card);
  border-radius: var(--radius);
  min-width: 400px;
  max-width: 500px;
  border: 1px solid var(--border);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 1.1em;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.5em;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: var(--text);
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toast {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 300px;
}

.toast-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
}

.toast-success .toast-icon { background: var(--success); color: white; }
.toast-error .toast-icon { background: var(--danger); color: white; }
.toast-info .toast-icon { background: var(--info); color: white; }

.toast-message {
  flex: 1;
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 1.2em;
}

/* Animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(100px); }
  to { opacity: 1; transform: translateX(0); }
}

.fade-in { animation: fade-in 0.3s ease; }
.scale-in { animation: scale-in 0.2s ease; }
.slide-in-right { animation: slide-in-right 0.3s ease; }

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main-wrapper {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .charts-row {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-search {
    display: none;
  }

  .modal {
    min-width: auto;
    width: 100%;
    margin: 0 16px;
  }
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Mount App
// =============================================================================

// Initialize modal portal
Modal();

// Mount main app
mount('#app', AppLayout());

// Start router
router.start();

console.log('📊 Admin Dashboard loaded!');
console.log('Features demonstrated:');
console.log('- Reactivity: pulse, effect, computed, batch, memo, watch');
console.log('- DOM: el, text, list, when, show, portal, transition, model');
console.log('- Router: guards, params, navigation');
console.log('- Store: persistence, actions, getters, plugins');
