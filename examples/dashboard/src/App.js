import { pulse, computed, effect, batch, el, text, on, bind, list, when, mount, model } from 'pulse-js-framework/runtime';

// State
const isAuthenticated = pulse(false);
const currentUser = pulse(null);
const sidebarOpen = pulse(true);
const theme = pulse("dark");
const currentPage = pulse("dashboard");
const users = pulse([]);
const products = pulse([]);
const orders = pulse([]);
const notifications = pulse([]);
const searchQuery = pulse("");
const userFilter = pulse("all");
const orderFilter = pulse("all");
const modalOpen = pulse(false);
const modalType = pulse("");
const modalData = pulse(null);
const selectedUserId = pulse(null);
const editingUser = pulse(null);

// Actions
function init() {
  const saved = localStorage.getItem("pulse-dashboard") ; if(saved) {const data = JSON.parse(saved) ; if(data.users) users.set(data.users); if(data.products) products.set(data.products); if(data.orders) orders.set(data.orders); if(data.theme) theme.set(data.theme);} ; if(users.get().length === 0) {users.set([{id : 1, name : "Alice Martin", email : "alice@example.com", role : "Admin", status : "active"}, {id : 2, name : "Bob Johnson", email : "bob@example.com", role : "Editor", status : "active"}, {id : 3, name : "Carol Williams", email : "carol@example.com", role : "Viewer", status : "inactive"}, {id : 4, name : "David Brown", email : "david@example.com", role : "Editor", status : "active"}, {id : 5, name : "Eva Davis", email : "eva@example.com", role : "Admin", status : "active"}]);} ; if(products.get().length === 0) {products.set([{id : 1, name : "Pro Plan", price : 99, category : "Subscription", stock : 999}, {id : 2, name : "Enterprise Plan", price : 299, category : "Subscription", stock : 999}, {id : 3, name : "Custom Theme", price : 49, category : "Add-on", stock : 100}, {id : 4, name : "API Access", price : 149, category : "Add-on", stock : 50}]);} ; if(orders.get().length === 0) {orders.set([{id : 1, customer : "Tech Corp", product : "Enterprise Plan", total : 299, status : "completed", date : "2024-01-15"}, {id : 2, customer : "StartupXYZ", product : "Pro Plan", total : 99, status : "completed", date : "2024-01-16"}, {id : 3, customer : "MegaCo", product : "Enterprise Plan", total : 299, status : "pending", date : "2024-01-17"}, {id : 4, customer : "SmallBiz", product : "Pro Plan", total : 99, status : "completed", date : "2024-01-18"}, {id : 5, customer : "DevTeam", product : "API Access", total : 149, status : "processing", date : "2024-01-19"}]);} ; saveData()
}

function saveData() {
  localStorage.setItem("pulse-dashboard", JSON.stringify({users : users.get(), products : products.get(), orders : orders.get(), theme : theme.get()}))
}

function handleLogin(e) {
  e.preventDefault() ; isAuthenticated.set(true); currentUser.set({name : "Admin User", email : "admin@example.com", role : "Administrator"}); addNotification("success", "Welcome back!")
}

function handleLogout() {
  isAuthenticated.set(false); currentUser.set(null); currentPage.set("dashboard");
}

function setPage(page) {
  currentPage.set(page); selectedUserId.set(null);
}

function toggleSidebar() {
  sidebarOpen.set(!sidebarOpen.get());
}

function toggleTheme() {
  theme.set(theme.get() === "dark" ? "light" : "dark"); saveData()
}

function setTheme(t) {
  theme.set(t); saveData()
}

function setSearchQuery(query) {
  searchQuery.set(query);
}

function setOrderFilter(filter) {
  orderFilter.set(filter);
}

function getFilteredUsers() {
  const query = searchQuery.get().toLowerCase() ; if(!query) return users.get() ; return users.get().filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
}

function viewUserDetail(id) {
  selectedUserId.set(id); currentPage.set("user-detail");
}

function getSelectedUser() {
  return users.get().find(u => u.id === selectedUserId.get())
}

function openAddUserModal() {
  editingUser.set({name : "", email : "", role : "Viewer", status : "active"}); modalType.set("user-form"); modalData.set({isEdit : false, title : "Add New User"}); modalOpen.set(true);
}

function openEditUserModal(e, user) {
  e.stopPropagation() ; editingUser.set({...user}); modalType.set("user-form"); modalData.set({isEdit : true, title : "Edit User", userId : user.id}); modalOpen.set(true);
}

function updateEditingUser(field, value) {
  editingUser.set({...editingUser.get(),[field] : value});
}

function handleUserFormSubmit(e) {
  e.preventDefault() ; if(modalData.get().isEdit) {users.set(users.get().map(u => u.id === modalData.get().userId ? {...u, ...editingUser.get()} : u)); addNotification("success", "User updated")} else {users.set([...users.get(), {...editingUser.get(), id : Date.now()}]); addNotification("success", "User created")} ; saveData() ; closeModal()
}

function confirmDeleteUser(e, user) {
  e.stopPropagation() ; modalType.set("confirm"); modalData.set({title : "Delete User", message : "Are you sure you want to delete " + user.name + "?", confirmText : "Delete", onConfirm :() => {users.set(users.get().filter(u => u.id !== user.id)); saveData() ; addNotification("success", "User deleted")}}); modalOpen.set(true);
}

function addRandomProduct() {
  const id = Date.now() ; products.set([...products.get(), {id : id, name : "New Product " +(id % 1000), price : Math.floor(Math.random() * 200) + 10, category : "Add-on", stock : Math.floor(Math.random() * 100)}]); saveData() ; addNotification("success", "Product added")
}

function getFilteredOrders() {
  if(orderFilter.get() === "all") return orders.get() ; return orders.get().filter(o => o.status === orderFilter.get())
}

function getRecentOrders() {
  return orders.get().slice(- 5).reverse()
}

function getTotalRevenue() {
  return orders.get().reduce((sum, o) => sum + o.total, 0)
}

function getAverageOrder() {
  if(orders.get().length === 0) return 0 ; return Math.round(getTotalRevenue() / orders.get().length)
}

function getLargestOrder() {
  if(orders.get().length === 0) return 0 ; return Math.max(...orders.get().map(o => o.total))
}

function getStatusPercentage(status) {
  const count = orders.get().filter(o => o.status === status).length ; if(orders.get().length === 0) return 0 ; return Math.round((count / orders.get().length) * 100)
}

function exportData() {
  const data = {users : users.get(), products : products.get(), orders : orders.get()} ; const blob = new Blob([JSON.stringify(data, null, 2)], {type : "application/json"}) ; const url = URL.createObjectURL(blob) ; const a = document.createElement("a") ; a.href = url ; a.download = "dashboard-export.json" ; a.click() ; addNotification("success", "Data exported successfully")
}

function confirmResetData() {
  modalType.set("confirm"); modalData.set({title : "Reset All Data", message : "This will delete all users, products, and orders. This action cannot be undone.", confirmText : "Reset Everything", onConfirm :() => {users.set([]); products.set([]); orders.set([]); saveData() ; addNotification("success", "All data has been reset")}}); modalOpen.set(true);
}

function getModalTitle() {
  if(modalData.get() && modalData.get().title) return modalData.get().title ; return "Modal"
}

function closeModal() {
  modalOpen.set(false); modalType.set(""); modalData.set(null); editingUser.set(null);
}

function closeModalBackdrop(e) {
  if(e.target.classList.contains("modal-backdrop")) {closeModal()}
}

function handleConfirm() {
  if(modalData.get() && modalData.get().onConfirm) {modalData.get().onConfirm()} ; closeModal()
}

function addNotification(type, message) {
  const id = Date.now() ; notifications.set([...notifications.get(), {id : id, type : type, message : message}]); setTimeout(() => {notifications.set(notifications.get().filter(n => n.id !== id));}, 5000)
}

function removeNotification(id) {
  notifications.set(notifications.get().filter(n => n.id !== id));
}


// View
function render({ props = {}, slots = {} } = {}) {
  return (
bind(    el('.pnecpvn.app',
      when(
        () => !isAuthenticated.get(),
        () =>           el('.pnecpvn.login-page',
            el('.pnecpvn.login-card',
              el('.pnecpvn.login-logo',
                "📊"),
              el('h1.pnecpvn',
                "Admin Dashboard"),
              el('p.pnecpvn.login-subtitle',
                "Sign in to your account"),
on(              el('form.pnecpvn.login-form',
                el('.pnecpvn.form-group',
                  el('label.pnecpvn',
                    "Email"),
                  el('input.pnecpvn', { 'type': 'email', 'placeholder': 'admin@example.com', 'value': 'admin@example.com' })),
                el('.pnecpvn.form-group',
                  el('label.pnecpvn',
                    "Password"),
                  el('input.pnecpvn', { 'type': 'password', 'placeholder': '••••••••', 'value': 'password' })),
                el('button.pnecpvn.btn.btn-primary.btn-block', { 'type': 'submit' },
                  "Sign In")), 'submit', (event) => { handleLogin(event); })))
      ),
      when(
        () => isAuthenticated.get(),
        () => [
bind(          el('nav.pnecpvn.sidebar',
            el('.pnecpvn.sidebar-logo',
              el('span.pnecpvn.logo-icon',
                "📊"),
              el('span.pnecpvn.logo-text',
                "Dashboard")),
            el('ul.pnecpvn.nav-list',
              el('li.pnecpvn.nav-item',
bind(on(                el('a.pnecpvn.nav-link',
                  el('span.pnecpvn.nav-icon',
                    "🏠"),
                  el('span.pnecpvn.nav-label',
                    "Dashboard")), 'click', (event) => { setPage("dashboard"); }), 'class', () => currentPage.get() === 'dashboard' ? 'active' : '')),
              el('li.pnecpvn.nav-item',
bind(on(                el('a.pnecpvn.nav-link',
                  el('span.pnecpvn.nav-icon',
                    "👥"),
                  el('span.pnecpvn.nav-label',
                    "Users")), 'click', (event) => { setPage("users"); }), 'class', () => currentPage.get() === 'users.get()' ? 'active' : '')),
              el('li.pnecpvn.nav-item',
bind(on(                el('a.pnecpvn.nav-link',
                  el('span.pnecpvn.nav-icon',
                    "📦"),
                  el('span.pnecpvn.nav-label',
                    "Products")), 'click', (event) => { setPage("products"); }), 'class', () => currentPage.get() === 'products.get()' ? 'active' : '')),
              el('li.pnecpvn.nav-item',
bind(on(                el('a.pnecpvn.nav-link',
                  el('span.pnecpvn.nav-icon',
                    "🛒"),
                  el('span.pnecpvn.nav-label',
                    "Orders")), 'click', (event) => { setPage("orders"); }), 'class', () => currentPage.get() === 'orders.get()' ? 'active' : '')),
              el('li.pnecpvn.nav-item',
bind(on(                el('a.pnecpvn.nav-link',
                  el('span.pnecpvn.nav-icon',
                    "📈"),
                  el('span.pnecpvn.nav-label',
                    "Analytics")), 'click', (event) => { setPage("analytics"); }), 'class', () => currentPage.get() === 'analytics' ? 'active' : '')),
              el('li.pnecpvn.nav-item',
bind(on(                el('a.pnecpvn.nav-link',
                  el('span.pnecpvn.nav-icon',
                    "⚙️"),
                  el('span.pnecpvn.nav-label',
                    "Settings")), 'click', (event) => { setPage("settings"); }), 'class', () => currentPage.get() === 'settings' ? 'active' : ''))),
            el('.pnecpvn.sidebar-user',
              el('.pnecpvn.user-avatar',
                text(() => `${currentUser.get() ? currentUser.get().name[0] : 'U'}`)),
              el('.pnecpvn.user-info',
                el('.pnecpvn.user-name',
                  text(() => `${currentUser.get() ? currentUser.get().name : 'User'}`)),
                el('.pnecpvn.user-role',
                  text(() => `${currentUser.get() ? currentUser.get().role : 'Admin'}`))))), 'class', () => sidebarOpen.get() ? 'open' : 'collapsed'),
          el('.pnecpvn.main-wrapper',
            el('header.pnecpvn.header',
on(              el('button.pnecpvn.header-toggle',
                "☰"), 'click', (event) => { toggleSidebar(); }),
              el('.pnecpvn.header-search',
bind(on(                el('input.pnecpvn', { 'type': 'search', 'placeholder': 'Search...' }), 'input', (event) => { setSearchQuery(event.target.value); }), 'value', () => searchQuery.get())),
              el('.pnecpvn.header-right',
on(                el('button.pnecpvn.header-btn.theme-toggle',
                  text(() => `${theme.get() === 'dark' ? '🌙' : '☀️'}`)), 'click', (event) => { toggleTheme(); }),
                el('button.pnecpvn.header-btn.notif-btn',
                  el('span.pnecpvn',
                    "🔔"),
                  when(
                    () => (notifications.get().length > 0),
                    () =>                       el('span.pnecpvn.notif-badge',
                        text(() => `${notifications.get().length}`))
                  )),
                el('.pnecpvn.user-menu',
on(                  el('button.pnecpvn.user-btn',
                    el('span.pnecpvn.avatar',
                      text(() => `${currentUser.get() ? currentUser.get().name[0] : 'U'}`))), 'click', (event) => { handleLogout(); })))),
            el('.pnecpvn.content',
              when(
                () => (currentPage.get() === "dashboard"),
                () =>                   el('.pnecpvn.page.dashboard-page',
                    el('.pnecpvn.page-header',
                      el('div.pnecpvn',
                        el('h1.pnecpvn',
                          "Dashboard"),
                        el('p.pnecpvn',
                          "Welcome back! Here's what's happening."))),
                    el('.pnecpvn.stats-grid',
                      el('.pnecpvn.stat-card.stat-primary',
                        el('.pnecpvn.stat-icon',
                          "👥"),
                        el('.pnecpvn.stat-content',
                          el('.pnecpvn.stat-title',
                            "Total Users"),
                          el('.pnecpvn.stat-value',
                            text(() => `${users.get().length}`)),
                          el('.pnecpvn.stat-trend.up',
                            "↑ 12%"))),
                      el('.pnecpvn.stat-card.stat-success',
                        el('.pnecpvn.stat-icon',
                          "📦"),
                        el('.pnecpvn.stat-content',
                          el('.pnecpvn.stat-title',
                            "Products"),
                          el('.pnecpvn.stat-value',
                            text(() => `${products.get().length}`)),
                          el('.pnecpvn.stat-trend.up',
                            "↑ 5%"))),
                      el('.pnecpvn.stat-card.stat-warning',
                        el('.pnecpvn.stat-icon',
                          "🛒"),
                        el('.pnecpvn.stat-content',
                          el('.pnecpvn.stat-title',
                            "Orders"),
                          el('.pnecpvn.stat-value',
                            text(() => `${orders.get().length}`)),
                          el('.pnecpvn.stat-trend.down',
                            "↓ 3%"))),
                      el('.pnecpvn.stat-card.stat-info',
                        el('.pnecpvn.stat-icon',
                          "💰"),
                        el('.pnecpvn.stat-content',
                          el('.pnecpvn.stat-title',
                            "Revenue"),
                          el('.pnecpvn.stat-value',
                            text(() => `\$${getTotalRevenue()}`)),
                          el('.pnecpvn.stat-trend.up',
                            "↑ 8%")))),
                    el('.pnecpvn.charts-row',
                      el('.pnecpvn.chart-container',
                        el('h3.pnecpvn.chart-title',
                          "Monthly Revenue"),
                        el('.pnecpvn.bar-chart',
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 48%' }),
                            el('.pnecpvn.bar-label',
                              "Jan")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 76%' }),
                            el('.pnecpvn.bar-label',
                              "Feb")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 60%' }),
                            el('.pnecpvn.bar-label',
                              "Mar")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 88%' }),
                            el('.pnecpvn.bar-label',
                              "Apr")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 72%' }),
                            el('.pnecpvn.bar-label',
                              "May")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 100%' }),
                            el('.pnecpvn.bar-label',
                              "Jun")))),
                      el('.pnecpvn.chart-container',
                        el('h3.pnecpvn.chart-title',
                          "User Activity"),
                        el('.pnecpvn.bar-chart',
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 58%' }),
                            el('.pnecpvn.bar-label',
                              "Mon")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 79%' }),
                            el('.pnecpvn.bar-label',
                              "Tue")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 71%' }),
                            el('.pnecpvn.bar-label',
                              "Wed")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 100%' }),
                            el('.pnecpvn.bar-label',
                              "Thu")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 83%' }),
                            el('.pnecpvn.bar-label',
                              "Fri")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 45%' }),
                            el('.pnecpvn.bar-label',
                              "Sat")),
                          el('.pnecpvn.bar-item',
                            el('.pnecpvn.bar', { 'style': 'height: 36%' }),
                            el('.pnecpvn.bar-label',
                              "Sun"))))),
                    el('.pnecpvn.section',
                      el('h2.pnecpvn',
                        "Recent Orders"),
                      el('.pnecpvn.table-container',
                        el('table.pnecpvn.data-table',
                          el('thead.pnecpvn',
                            el('tr.pnecpvn',
                              el('th.pnecpvn',
                                "ID"),
                              el('th.pnecpvn',
                                "Customer"),
                              el('th.pnecpvn',
                                "Product"),
                              el('th.pnecpvn',
                                "Total"),
                              el('th.pnecpvn',
                                "Status"))),
                          el('tbody.pnecpvn',
                            list(
                              () => getRecentOrders(),
                              (order, _index) => (
                              el('tr.pnecpvn',
                                el('td.pnecpvn',
                                  text(() => `#${order.id}`)),
                                el('td.pnecpvn',
                                  text(() => `${order.customer}`)),
                                el('td.pnecpvn',
                                  text(() => `${order.product}`)),
                                el('td.pnecpvn',
                                  text(() => `\$${order.total}`)),
                                el('td.pnecpvn',
bind(                                  el('span.pnecpvn.badge',
                                    text(() => `${order.status}`)), 'class', () => `badge-${order.status}`)))
                              )
                            ))))))
              ),
              when(
                () => (currentPage.get() === "users"),
                () =>                   el('.pnecpvn.page.users-page',
                    el('.pnecpvn.page-header',
                      el('div.pnecpvn',
                        el('h1.pnecpvn',
                          "Users"),
                        el('p.pnecpvn',
                          "Manage your team members")),
on(                      el('button.pnecpvn.btn.btn-primary',
                        "+ Add User"), 'click', (event) => { openAddUserModal(); })),
                    el('.pnecpvn.toolbar',
bind(on(                      el('input.pnecpvn.search-input', { 'type': 'search', 'placeholder': 'Search users...' }), 'input', (event) => { setSearchQuery(event.target.value); }), 'value', () => searchQuery.get())),
                    el('.pnecpvn.table-container',
                      el('table.pnecpvn.data-table',
                        el('thead.pnecpvn',
                          el('tr.pnecpvn',
                            el('th.pnecpvn',
                              text(() => ``)),
                            el('th.pnecpvn',
                              "Name"),
                            el('th.pnecpvn',
                              "Email"),
                            el('th.pnecpvn',
                              "Role"),
                            el('th.pnecpvn',
                              "Status"),
                            el('th.pnecpvn',
                              "Actions"))),
                        el('tbody.pnecpvn',
                          list(
                            () => getFilteredUsers(),
                            (user, _index) => (
on(                            el('tr.pnecpvn.clickable',
                              el('td.pnecpvn',
                                el('.pnecpvn.avatar',
                                  text(() => `${user.name[0]}`))),
                              el('td.pnecpvn',
                                text(() => `${user.name}`)),
                              el('td.pnecpvn',
                                text(() => `${user.email}`)),
                              el('td.pnecpvn',
                                el('span.pnecpvn.badge',
                                  text(() => `${user.role}`))),
                              el('td.pnecpvn',
bind(                                el('span.pnecpvn.badge',
                                  text(() => `${user.status}`)), 'class', () => `badge-${user.status}`)),
                              el('td.pnecpvn.actions-cell',
on(                                el('button.pnecpvn.action-btn', { 'title': 'Edit' },
                                  "✏️"), 'click', (event) => { openEditUserModal(event, user); }),
on(                                el('button.pnecpvn.action-btn', { 'title': 'Delete' },
                                  "🗑️"), 'click', (event) => { confirmDeleteUser(event, user); }))), 'click', (event) => { viewUserDetail(user.id); })
                            )
                          )))))
              ),
              when(
                () => (currentPage.get() === "user-detail"),
                () =>                   el('.pnecpvn.page.user-detail-page',
                    el('.pnecpvn.page-header',
on(                      el('button.pnecpvn.btn.btn-secondary',
                        "← Back"), 'click', (event) => { setPage("users"); })),
                    when(
                      () => getSelectedUser(),
                      () => [
                        el('.pnecpvn.user-detail-card',
                          el('.pnecpvn.user-avatar-large',
                            text(() => `${getSelectedUser().name[0]}`)),
                          el('h2.pnecpvn',
                            text(() => `${getSelectedUser().name}`)),
                          el('p.pnecpvn.user-email',
                            text(() => `${getSelectedUser().email}`)),
                          el('.pnecpvn.user-badges',
                            el('span.pnecpvn.badge',
                              text(() => `${getSelectedUser().role}`)),
bind(                            el('span.pnecpvn.badge',
                              text(() => `${getSelectedUser().status}`)), 'class', () => `badge-${getSelectedUser().status}`))),
                        el('.pnecpvn.section',
                          el('h3.pnecpvn',
                            "Recent Activity"),
                          el('ul.pnecpvn.activity-list',
                            el('li.pnecpvn',
                              el('span.pnecpvn.activity-time',
                                "2 hours ago"),
                              el('span.pnecpvn',
                                "Logged in")),
                            el('li.pnecpvn',
                              el('span.pnecpvn.activity-time',
                                "1 day ago"),
                              el('span.pnecpvn',
                                "Updated profile")),
                            el('li.pnecpvn',
                              el('span.pnecpvn.activity-time',
                                "3 days ago"),
                              el('span.pnecpvn',
                                "Changed password"))))
                        ]
                    ))
              ),
              when(
                () => (currentPage.get() === "products"),
                () =>                   el('.pnecpvn.page.products-page',
                    el('.pnecpvn.page-header',
                      el('div.pnecpvn',
                        el('h1.pnecpvn',
                          "Products"),
                        el('p.pnecpvn',
                          "Manage your product catalog")),
on(                      el('button.pnecpvn.btn.btn-primary',
                        "+ Add Product"), 'click', (event) => { addRandomProduct(); })),
                    el('.pnecpvn.products-grid',
                      list(
                        () => products.get(),
                        (product, _index) => (
                        el('.pnecpvn.product-card',
                          el('.pnecpvn.product-icon',
                            "📦"),
                          el('h3.pnecpvn',
                            text(() => `${product.name}`)),
                          el('p.pnecpvn.product-category',
                            text(() => `${product.category}`)),
                          el('.pnecpvn.product-price',
                            text(() => `\$${product.price}`)),
                          el('.pnecpvn.product-stock',
                            text(() => `Stock: ${product.stock}`)))
                        )
                      )))
              ),
              when(
                () => (currentPage.get() === "orders"),
                () =>                   el('.pnecpvn.page.orders-page',
                    el('.pnecpvn.page-header',
                      el('div.pnecpvn',
                        el('h1.pnecpvn',
                          "Orders"),
                        el('p.pnecpvn',
                          "Track and manage orders"))),
                    el('.pnecpvn.filter-bar',
bind(on(                      el('button.pnecpvn.filter-btn',
                        "All"), 'click', (event) => { setOrderFilter("all"); }), 'class', () => orderFilter.get() === 'all' ? 'active' : ''),
bind(on(                      el('button.pnecpvn.filter-btn',
                        "Pending"), 'click', (event) => { setOrderFilter("pending"); }), 'class', () => orderFilter.get() === 'pending' ? 'active' : ''),
bind(on(                      el('button.pnecpvn.filter-btn',
                        "Processing"), 'click', (event) => { setOrderFilter("processing"); }), 'class', () => orderFilter.get() === 'processing' ? 'active' : ''),
bind(on(                      el('button.pnecpvn.filter-btn',
                        "Completed"), 'click', (event) => { setOrderFilter("completed"); }), 'class', () => orderFilter.get() === 'completed' ? 'active' : '')),
                    el('.pnecpvn.table-container',
                      el('table.pnecpvn.data-table',
                        el('thead.pnecpvn',
                          el('tr.pnecpvn',
                            el('th.pnecpvn',
                              "Order ID"),
                            el('th.pnecpvn',
                              "Date"),
                            el('th.pnecpvn',
                              "Customer"),
                            el('th.pnecpvn',
                              "Product"),
                            el('th.pnecpvn',
                              "Total"),
                            el('th.pnecpvn',
                              "Status"))),
                        el('tbody.pnecpvn',
                          list(
                            () => getFilteredOrders(),
                            (order, _index) => (
                            el('tr.pnecpvn',
                              el('td.pnecpvn',
                                text(() => `#${order.id}`)),
                              el('td.pnecpvn',
                                text(() => `${order.date}`)),
                              el('td.pnecpvn',
                                text(() => `${order.customer}`)),
                              el('td.pnecpvn',
                                text(() => `${order.product}`)),
                              el('td.pnecpvn',
                                text(() => `\$${order.total}`)),
                              el('td.pnecpvn',
bind(                                el('span.pnecpvn.badge',
                                  text(() => `${order.status}`)), 'class', () => `badge-${order.status}`)))
                            )
                          )))))
              ),
              when(
                () => (currentPage.get() === "analytics"),
                () =>                   el('.pnecpvn.page.analytics-page',
                    el('.pnecpvn.page-header',
                      el('div.pnecpvn',
                        el('h1.pnecpvn',
                          "Analytics"),
                        el('p.pnecpvn',
                          "Insights and performance metrics"))),
                    el('.pnecpvn.stats-row',
                      el('.pnecpvn.stat-box',
                        el('.pnecpvn.stat-label',
                          "Total Revenue"),
                        el('.pnecpvn.stat-value',
                          text(() => `\$${getTotalRevenue()}`))),
                      el('.pnecpvn.stat-box',
                        el('.pnecpvn.stat-label',
                          "Average Order"),
                        el('.pnecpvn.stat-value',
                          text(() => `\$${getAverageOrder()}`))),
                      el('.pnecpvn.stat-box',
                        el('.pnecpvn.stat-label',
                          "Largest Order"),
                        el('.pnecpvn.stat-value',
                          text(() => `\$${getLargestOrder()}`))),
                      el('.pnecpvn.stat-box',
                        el('.pnecpvn.stat-label',
                          "Total Orders"),
                        el('.pnecpvn.stat-value',
                          text(() => `${orders.get().length}`)))),
                    el('.pnecpvn.charts-section',
                      el('.pnecpvn.chart-container',
                        el('h3.pnecpvn.chart-title',
                          "Orders by Status"),
                        el('.pnecpvn.bar-chart',
                          el('.pnecpvn.bar-item',
bind(                            el('.pnecpvn.bar'), 'style', () => `height: ${getStatusPercentage('completed')}%`),
                            el('.pnecpvn.bar-label',
                              "Completed")),
                          el('.pnecpvn.bar-item',
bind(                            el('.pnecpvn.bar'), 'style', () => `height: ${getStatusPercentage('pending')}%`),
                            el('.pnecpvn.bar-label',
                              "Pending")),
                          el('.pnecpvn.bar-item',
bind(                            el('.pnecpvn.bar'), 'style', () => `height: ${getStatusPercentage('processing')}%`),
                            el('.pnecpvn.bar-label',
                              "Processing"))))))
              ),
              when(
                () => (currentPage.get() === "settings"),
                () =>                   el('.pnecpvn.page.settings-page',
                    el('.pnecpvn.page-header',
                      el('div.pnecpvn',
                        el('h1.pnecpvn',
                          "Settings"),
                        el('p.pnecpvn',
                          "Configure your preferences"))),
                    el('.pnecpvn.settings-container',
                      el('.pnecpvn.settings-section',
                        el('h3.pnecpvn',
                          "Appearance"),
                        el('.pnecpvn.settings-row',
                          el('.pnecpvn.settings-label',
                            el('strong.pnecpvn',
                              "Theme"),
                            el('p.pnecpvn',
                              "Choose your preferred color scheme")),
                          el('.pnecpvn.theme-toggle',
bind(on(                            el('button.pnecpvn.theme-btn',
                              "☀️ Light"), 'click', (event) => { setTheme("light"); }), 'class', () => theme.get() === 'light' ? 'active' : ''),
bind(on(                            el('button.pnecpvn.theme-btn',
                              "🌙 Dark"), 'click', (event) => { setTheme("dark"); }), 'class', () => theme.get() === 'dark' ? 'active' : '')))),
                      el('.pnecpvn.settings-section',
                        el('h3.pnecpvn',
                          "Data Management"),
                        el('.pnecpvn.settings-row',
                          el('.pnecpvn.settings-label',
                            el('strong.pnecpvn',
                              "Export Data"),
                            el('p.pnecpvn',
                              "Download all your data as JSON")),
on(                          el('button.pnecpvn.btn.btn-secondary',
                            "Export"), 'click', (event) => { exportData(); })),
                        el('.pnecpvn.settings-row',
                          el('.pnecpvn.settings-label',
                            el('strong.pnecpvn',
                              "Reset Data"),
                            el('p.pnecpvn',
                              "Clear all data and start fresh")),
on(                          el('button.pnecpvn.btn.btn-danger',
                            "Reset"), 'click', (event) => { confirmResetData(); })))))
              ))),
          el('.pnecpvn.toast-container',
            list(
              () => notifications.get(),
              (notif, _index) => (
bind(              el('.pnecpvn.toast',
                el('span.pnecpvn.toast-icon',
                  text(() => `${notif.type === 'success' ? '✓' : notif.type === 'error' ? '✗' : 'ℹ'}`)),
                el('span.pnecpvn.toast-message',
                  text(() => `${notif.message}`)),
on(                el('button.pnecpvn.toast-close',
                  "×"), 'click', (event) => { removeNotification(notif.id); })), 'class', () => `toast-${notif.type}`)
              )
            )),
          when(
            () => modalOpen.get(),
            () => on(              el('.pnecpvn.modal-backdrop',
                el('.pnecpvn.modal-container',
                  el('.pnecpvn.modal',
                    el('.pnecpvn.modal-header',
                      el('h3.pnecpvn',
                        text(() => `${getModalTitle()}`)),
on(                      el('button.pnecpvn.modal-close',
                        "×"), 'click', (event) => { closeModal(); })),
                    el('.pnecpvn.modal-body',
                      when(
                        () => (modalType.get() === "confirm"),
                        () =>                           el('p.pnecpvn',
                            text(() => `${modalData.get() ? modalData.get().message : ''}`))
                      ),
                      when(
                        () => (modalType.get() === "user-form"),
                        () => on(                          el('form.pnecpvn.user-form',
                            el('.pnecpvn.form-group',
                              el('label.pnecpvn',
                                "Name"),
bind(on(                              el('input.pnecpvn', { 'type': 'text', 'placeholder': 'Full name' }), 'input', (event) => { updateEditingUser("name", event.target.value); }), 'value', () => editingUser.get() ? editingUser.get().name : '')),
                            el('.pnecpvn.form-group',
                              el('label.pnecpvn',
                                "Email"),
bind(on(                              el('input.pnecpvn', { 'type': 'email', 'placeholder': 'email@example.com' }), 'input', (event) => { updateEditingUser("email", event.target.value); }), 'value', () => editingUser.get() ? editingUser.get().email : '')),
                            el('.pnecpvn.form-group',
                              el('label.pnecpvn',
                                "Role"),
on(                              el('select.pnecpvn',
bind(                                el('option.pnecpvn', { 'value': 'Admin' },
                                  "Admin"), 'selected', () => editingUser.get() && editingUser.get().role === 'Admin'),
bind(                                el('option.pnecpvn', { 'value': 'Editor' },
                                  "Editor"), 'selected', () => editingUser.get() && editingUser.get().role === 'Editor'),
bind(                                el('option.pnecpvn', { 'value': 'Viewer' },
                                  "Viewer"), 'selected', () => editingUser.get() && editingUser.get().role === 'Viewer')), 'change', (event) => { updateEditingUser("role", event.target.value); })),
                            el('.pnecpvn.form-group',
                              el('label.pnecpvn',
                                "Status"),
on(                              el('select.pnecpvn',
bind(                                el('option.pnecpvn', { 'value': 'active' },
                                  "Active"), 'selected', () => editingUser.get() && editingUser.get().status === 'active'),
bind(                                el('option.pnecpvn', { 'value': 'inactive' },
                                  "Inactive"), 'selected', () => editingUser.get() && editingUser.get().status === 'inactive')), 'change', (event) => { updateEditingUser("status", event.target.value); })),
                            el('button.pnecpvn.btn.btn-primary', { 'type': 'submit' },
                              text(() => `${modalData.get() && modalData.get().isEdit ? 'Update' : 'Create'}`))), 'submit', (event) => { handleUserFormSubmit(event); })
                      )),
                    when(
                      () => (modalType.get() === "confirm"),
                      () =>                         el('.pnecpvn.modal-footer',
on(                          el('button.pnecpvn.btn.btn-secondary',
                            "Cancel"), 'click', (event) => { closeModal(); }),
on(                          el('button.pnecpvn.btn.btn-danger',
                            text(() => `${modalData.get() ? modalData.get().confirmText : 'Confirm'}`)), 'click', (event) => { handleConfirm(); }))
                    )))), 'click', (event) => { closeModalBackdrop(event); })
          )
          ]
      )), 'class', () => theme.get() === 'dark' ? 'theme.get()-dark' : 'theme.get()-light')
  );
}

// Styles
const SCOPE_ID = 'pnecpvn';
const styles = `
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
  .theme-light.pnecpvn {
    --bg: #f8fafc;
    --bg-light: #ffffff;
    --bg-card: #ffffff;
    --border: #e2e8f0;
    --text: #1e293b;
    --text-muted: #64748b;
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
  }
  .app.pnecpvn {
    display: flex;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
  }
  .main-wrapper.pnecpvn {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: var(--sidebar-width);
    transition: margin var(--transition);
  }
  .sidebar.pnecpvn {
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
  .sidebar.collapsed.pnecpvn {
    width: var(--sidebar-collapsed);
  }
  .sidebar.collapsed.pnecpvn.logo-text.pnecpvn, .sidebar.collapsed.pnecpvn.nav-label.pnecpvn, .sidebar.collapsed.pnecpvn.user-info.pnecpvn {
    opacity: 0;
    width: 0;
  }
  .sidebar-logo.pnecpvn {
    padding: 20px;
    font-size: 1.5em;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border);
  }
  .logo-text.pnecpvn {
    background: linear-gradient(135deg, var(--primary), #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: nowrap;
    transition: opacity var(--transition);
  }
  .nav-list.pnecpvn {
    list-style: none;
    padding: 16px 12px;
    flex: 1;
  }
  .nav-item.pnecpvn {
    margin-bottom: 4px;
  }
  .nav-link.pnecpvn {
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
  .nav-link.pnecpvn:hover {
    background: var(--bg);
    color: var(--text);
  }
  .nav-link.active.pnecpvn {
    background: var(--primary);
    color: white;
  }
  .nav-icon.pnecpvn {
    font-size: 1.2em;
    width: 24px;
    text-align: center;
  }
  .nav-label.pnecpvn {
    white-space: nowrap;
    transition: opacity var(--transition);
  }
  .sidebar-user.pnecpvn {
    padding: 16px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .user-avatar.pnecpvn {
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
  .user-info.pnecpvn {
    white-space: nowrap;
    transition: opacity var(--transition);
  }
  .user-name.pnecpvn {
    font-weight: 600;
    font-size: 0.9em;
  }
  .user-role.pnecpvn {
    font-size: 0.75em;
    color: var(--text-muted);
  }
  .header.pnecpvn {
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
  .header-toggle.pnecpvn {
    background: none;
    border: none;
    color: var(--text);
    font-size: 1.5em;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    display: none;
  }
  .header-search.pnecpvn {
    flex: 1;
    max-width: 400px;
  }
  .header-search.pnecpvninput.pnecpvn {
    width: 100%;
    padding: 10px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.9em;
  }
  .header-right.pnecpvn {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .header-btn.pnecpvn {
    background: none;
    border: none;
    color: var(--text);
    font-size: 1.3em;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    position: relative;
  }
  .header-btn.pnecpvn:hover {
    background: var(--bg);
  }
  .notif-badge.pnecpvn {
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
  .user-btn.pnecpvn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }
  .user-btn.pnecpvn.avatar.pnecpvn {
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
  .content.pnecpvn {
    flex: 1;
    padding: 24px 32px;
    overflow-y: auto;
    background: var(--bg);
  }
  .page.pnecpvn {
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .page-header.pnecpvn {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }
  .page-header.pnecpvnh1.pnecpvn {
    font-size: 1.8em;
    margin-bottom: 4px;
  }
  .page-header.pnecpvnp.pnecpvn {
    color: var(--text-muted);
  }
  .stats-grid.pnecpvn {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  .stat-card.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid var(--border);
    transition: transform var(--transition);
  }
  .stat-card.pnecpvn:hover {
    transform: translateY(-2px);
  }
  .stat-icon.pnecpvn {
    font-size: 2.5em;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }
  .stat-primary.pnecpvn.stat-icon.pnecpvn {
    background: rgba(99, 102, 241, 0.1);
  }
  .stat-success.pnecpvn.stat-icon.pnecpvn {
    background: rgba(16, 185, 129, 0.1);
  }
  .stat-warning.pnecpvn.stat-icon.pnecpvn {
    background: rgba(245, 158, 11, 0.1);
  }
  .stat-info.pnecpvn.stat-icon.pnecpvn {
    background: rgba(59, 130, 246, 0.1);
  }
  .stat-title.pnecpvn {
    font-size: 0.9em;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .stat-value.pnecpvn {
    font-size: 1.8em;
    font-weight: 700;
  }
  .stat-trend.pnecpvn {
    font-size: 0.85em;
    margin-top: 4px;
  }
  .stat-trend.up.pnecpvn {
    color: var(--success);
  }
  .stat-trend.down.pnecpvn {
    color: var(--danger);
  }
  .charts-row.pnecpvn {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  .chart-container.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 24px;
    border: 1px solid var(--border);
  }
  .chart-title.pnecpvn {
    font-size: 1.1em;
    margin-bottom: 20px;
  }
  .bar-chart.pnecpvn {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    height: 200px;
    padding-top: 20px;
  }
  .bar-item.pnecpvn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
  }
  .bar.pnecpvn {
    width: 100%;
    max-width: 50px;
    background: linear-gradient(to top, var(--primary), var(--primary-dark));
    border-radius: 4px 4px 0 0;
    margin-top: auto;
  }
  .bar-label.pnecpvn {
    font-size: 0.75em;
    color: var(--text-muted);
    margin-top: 8px;
  }
  .table-container.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .data-table.pnecpvn {
    width: 100%;
    border-collapse: collapse;
  }
  .data-table.pnecpvnth.pnecpvn, .data-table.pnecpvntd.pnecpvn {
    padding: 14px 16px;
    text-align: left;
  }
  .data-table.pnecpvnth.pnecpvn {
    background: var(--bg);
    font-weight: 600;
    font-size: 0.85em;
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .data-table.pnecpvntr.pnecpvn {
    border-bottom: 1px solid var(--border);
    transition: background var(--transition);
  }
  .data-table.pnecpvntr.pnecpvn:last-child {
    border-bottom: none;
  }
  .data-table.pnecpvntr.clickable.pnecpvn {
    cursor: pointer;
  }
  .data-table.pnecpvntr.pnecpvn:hover {
    background: var(--bg);
  }
  .data-table.pnecpvn.avatar.pnecpvn {
    width: 32px;
    height: 32px;
    background: var(--primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
  }
  .actions-cell.pnecpvn {
    display: flex;
    gap: 8px;
  }
  .action-btn.pnecpvn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
  }
  .action-btn.pnecpvn:hover {
    background: var(--bg);
  }
  .badge.pnecpvn {
    display: inline-block;
    padding: 4px 10px;
    font-size: 0.75em;
    font-weight: 600;
    border-radius: 100px;
    background: var(--bg);
  }
  .badge-active.pnecpvn, .badge-completed.pnecpvn {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success);
  }
  .badge-inactive.pnecpvn {
    background: rgba(148, 163, 184, 0.1);
    color: var(--text-muted);
  }
  .badge-pending.pnecpvn {
    background: rgba(245, 158, 11, 0.1);
    color: var(--warning);
  }
  .badge-processing.pnecpvn {
    background: rgba(59, 130, 246, 0.1);
    color: var(--info);
  }
  .btn.pnecpvn {
    padding: 10px 20px;
    font-size: 0.9em;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--transition);
  }
  .btn-primary.pnecpvn {
    background: var(--primary);
    color: white;
  }
  .btn-primary.pnecpvn:hover {
    background: var(--primary-dark);
  }
  .btn-secondary.pnecpvn {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-danger.pnecpvn {
    background: var(--danger);
    color: white;
  }
  .btn-block.pnecpvn {
    width: 100%;
  }
  .form-group.pnecpvn {
    margin-bottom: 16px;
  }
  .form-group.pnecpvnlabel.pnecpvn {
    display: block;
    margin-bottom: 6px;
    font-size: 0.9em;
    font-weight: 500;
  }
  .form-group.pnecpvninput.pnecpvn, .form-group.pnecpvnselect.pnecpvn {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.95em;
  }
  .form-group.pnecpvninput.pnecpvn:focus, .form-group.pnecpvnselect.pnecpvn:focus {
    outline: none;
    border-color: var(--primary);
  }
  .toolbar.pnecpvn {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .search-input.pnecpvn {
    flex: 1;
    max-width: 300px;
    padding: 10px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
  }
  .filter-bar.pnecpvn {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }
  .filter-btn.pnecpvn {
    padding: 8px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
  }
  .filter-btn.active.pnecpvn {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
  .products-grid.pnecpvn {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }
  .product-card.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 24px;
    border: 1px solid var(--border);
    text-align: center;
    transition: transform var(--transition);
  }
  .product-card.pnecpvn:hover {
    transform: translateY(-4px);
  }
  .product-icon.pnecpvn {
    font-size: 3em;
    margin-bottom: 16px;
  }
  .product-category.pnecpvn {
    font-size: 0.85em;
    color: var(--text-muted);
    margin-bottom: 12px;
  }
  .product-price.pnecpvn {
    font-size: 1.5em;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 8px;
  }
  .product-stock.pnecpvn {
    font-size: 0.85em;
    color: var(--text-muted);
  }
  .stats-row.pnecpvn {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  .stat-box.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 24px;
    border: 1px solid var(--border);
    text-align: center;
  }
  .stat-box.pnecpvn.stat-label.pnecpvn {
    font-size: 0.9em;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .stat-box.pnecpvn.stat-value.pnecpvn {
    font-size: 2em;
    font-weight: 700;
  }
  .charts-section.pnecpvn {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
  }
  .settings-container.pnecpvn {
    max-width: 800px;
  }
  .settings-section.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    margin-bottom: 24px;
    overflow: hidden;
  }
  .settings-section.pnecpvnh3.pnecpvn {
    padding: 16px 24px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    font-size: 1em;
  }
  .settings-row.pnecpvn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }
  .settings-row.pnecpvn:last-child {
    border-bottom: none;
  }
  .settings-label.pnecpvnstrong.pnecpvn {
    display: block;
    margin-bottom: 4px;
  }
  .settings-label.pnecpvnp.pnecpvn {
    font-size: 0.85em;
    color: var(--text-muted);
    margin: 0;
  }
  .theme-toggle.pnecpvn {
    display: flex;
    gap: 8px;
  }
  .theme-btn.pnecpvn {
    padding: 8px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
  }
  .theme-btn.active.pnecpvn {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
  .user-detail-card.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 40px;
    border: 1px solid var(--border);
    text-align: center;
    max-width: 500px;
    margin: 0 auto 24px;
  }
  .user-avatar-large.pnecpvn {
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
  .user-email.pnecpvn {
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  .user-badges.pnecpvn {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  .activity-list.pnecpvn {
    list-style: none;
  }
  .activity-list.pnecpvnli.pnecpvn {
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .activity-list.pnecpvnli.pnecpvn:last-child {
    border-bottom: none;
  }
  .activity-time.pnecpvn {
    color: var(--text-muted);
    font-size: 0.85em;
    margin-right: 12px;
  }
  .section.pnecpvn {
    margin-bottom: 24px;
  }
  .section.pnecpvnh2.pnecpvn, .section.pnecpvnh3.pnecpvn {
    margin-bottom: 16px;
  }
  .login-page.pnecpvn {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    padding: 20px;
  }
  .login-card.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 40px;
    width: 100%;
    max-width: 400px;
    border: 1px solid var(--border);
    text-align: center;
  }
  .login-logo.pnecpvn {
    font-size: 4em;
    margin-bottom: 16px;
  }
  .login-subtitle.pnecpvn {
    color: var(--text-muted);
    margin-bottom: 32px;
  }
  .login-form.pnecpvn {
    text-align: left;
  }
  .login-form.pnecpvn.btn.pnecpvn {
    margin-top: 24px;
  }
  .modal-backdrop.pnecpvn {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: fadeIn 0.2s ease;
  }
  .modal.pnecpvn {
    background: var(--bg-card);
    border-radius: var(--radius);
    min-width: 400px;
    max-width: 500px;
    border: 1px solid var(--border);
    animation: scaleIn 0.2s ease;
  }
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  .modal-header.pnecpvn {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }
  .modal-close.pnecpvn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5em;
    cursor: pointer;
  }
  .modal-body.pnecpvn {
    padding: 24px;
  }
  .modal-footer.pnecpvn {
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  .toast-container.pnecpvn {
    position: fixed;
    top: 80px;
    right: 24px;
    z-index: 300;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .toast.pnecpvn {
    background: var(--bg-card);
    border-radius: 8px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 300px;
    animation: slideInRight 0.3s ease;
  }
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(100px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  .toast-icon.pnecpvn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85em;
  }
  .toast-success.pnecpvn.toast-icon.pnecpvn {
    background: var(--success);
    color: white;
  }
  .toast-error.pnecpvn.toast-icon.pnecpvn {
    background: var(--danger);
    color: white;
  }
  .toast-info.pnecpvn.toast-icon.pnecpvn {
    background: var(--info);
    color: white;
  }
  .toast-message.pnecpvn {
    flex: 1;
  }
  .toast-close.pnecpvn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1.2em;
  }
  @media (max-width:767px) {
    .sidebar.pnecpvn {
      transform: translateX(-100%);
    }
  }
  @media (max-width:767px) {
    .sidebar.open.pnecpvn {
      transform: translateX(0);
    }
  }
  @media (max-width:767px) {
    .main-wrapper.pnecpvn {
      margin-left: 0;
    }
  }
  @media (max-width:767px) {
    .header-toggle.pnecpvn {
      display: block;
    }
  }
  @media (max-width:767px) {
    .stats-grid.pnecpvn {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width:767px) {
    .charts-row.pnecpvn {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width:767px) {
    .content.pnecpvn {
      padding: 16px;
    }
  }
  @media (max-width:767px) {
    .modal.pnecpvn {
      min-width: auto;
      width: calc(100% - 32px);
    }
  }
`;

// Inject styles
const styleEl = document.createElement("style");
styleEl.setAttribute('data-p-scope', SCOPE_ID);
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Export
export const App = {
  render,
  mount: (target) => {
    const container = typeof target === "string" ? document.querySelector(target) : target;
    let currentEl = null;
    effect(() => {
      // Save focus state before re-render
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
      const focusInfo = isInput ? {
        tag: activeEl.tagName.toLowerCase(),
        type: activeEl.type || "",
        placeholder: activeEl.placeholder || "",
        ariaLabel: activeEl.getAttribute("aria-label") || "",
        start: activeEl.selectionStart,
        end: activeEl.selectionEnd
      } : null;
      const newEl = render();
      if (currentEl) {
        container.replaceChild(newEl, currentEl);
      } else {
        container.appendChild(newEl);
      }
      currentEl = newEl;
      // Restore focus after re-render
      if (focusInfo) {
        let selector = focusInfo.tag;
        if (focusInfo.ariaLabel) selector += `[aria-label="${focusInfo.ariaLabel}"]`;
        else if (focusInfo.placeholder) selector += `[placeholder="${focusInfo.placeholder}"]`;
        const newActive = newEl.querySelector(selector);
        if (newActive) {
          newActive.focus();
          if (typeof focusInfo.start === "number") {
            try { newActive.setSelectionRange(focusInfo.start, focusInfo.end); } catch(e) {}
          }
        }
      }
    });
    init();
    return { unmount: () => currentEl?.remove() };
  }
};

export default App;