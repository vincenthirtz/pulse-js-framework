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
  localStorage.setItem("pulse-dashboard", JSON.stringify({users.get() : users.get(), products.get() : products.get(), orders.get() : orders.get(), theme.get() : theme.get()}))
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
  const data = {users.get() : users.get(), products.get() : products.get(), orders.get() : orders.get()} ; const blob = new Blob([JSON.stringify(data, null, 2)], {type : "application/json"}) ; const url = URL.createObjectURL(blob) ; const a = document.createElement("a") a.href = url a.download = "dashboard-export.json" a.click() ; addNotification("success", "Data exported successfully")
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
bind(    el('.p6wkk7x.app',
      when(
        () => !isAuthenticated.get(),
        () =>           el('.p6wkk7x.login-page',
            el('.p6wkk7x.login-card',
              el('.p6wkk7x.login-logo',
                "📊"),
              el('h1.p6wkk7x',
                "Admin Dashboard"),
              el('p.p6wkk7x.login-subtitle',
                "Sign in to your account"),
on(              el('form.p6wkk7x.login-form',
                el('.p6wkk7x.form-group',
                  el('label.p6wkk7x',
                    "Email"),
                  el('input.p6wkk7x', { 'type': 'email', 'placeholder': 'admin@example.com', 'value': 'admin@example.com' })),
                el('.p6wkk7x.form-group',
                  el('label.p6wkk7x',
                    "Password"),
                  el('input.p6wkk7x', { 'type': 'password', 'placeholder': '••••••••', 'value': 'password' })),
                el('button.p6wkk7x.btn.btn-primary.btn-block', { 'type': 'submit' },
                  "Sign In")), 'submit', (event) => { handleLogin(event); })))
      ),
      when(
        () => isAuthenticated.get(),
        () => [
bind(          el('nav.p6wkk7x.sidebar',
            el('.p6wkk7x.sidebar-logo',
              el('span.p6wkk7x.logo-icon',
                "📊"),
              el('span.p6wkk7x.logo-text',
                "Dashboard")),
            el('ul.p6wkk7x.nav-list',
              el('li.p6wkk7x.nav-item',
bind(on(                el('a.p6wkk7x.nav-link',
                  el('span.p6wkk7x.nav-icon',
                    "🏠"),
                  el('span.p6wkk7x.nav-label',
                    "Dashboard")), 'click', (event) => { setPage("dashboard"); }), 'class', () => currentPage.get() === 'dashboard' ? 'active' : '')),
              el('li.p6wkk7x.nav-item',
bind(on(                el('a.p6wkk7x.nav-link',
                  el('span.p6wkk7x.nav-icon',
                    "👥"),
                  el('span.p6wkk7x.nav-label',
                    "Users")), 'click', (event) => { setPage("users"); }), 'class', () => currentPage.get() === 'users.get()' ? 'active' : '')),
              el('li.p6wkk7x.nav-item',
bind(on(                el('a.p6wkk7x.nav-link',
                  el('span.p6wkk7x.nav-icon',
                    "📦"),
                  el('span.p6wkk7x.nav-label',
                    "Products")), 'click', (event) => { setPage("products"); }), 'class', () => currentPage.get() === 'products.get()' ? 'active' : '')),
              el('li.p6wkk7x.nav-item',
bind(on(                el('a.p6wkk7x.nav-link',
                  el('span.p6wkk7x.nav-icon',
                    "🛒"),
                  el('span.p6wkk7x.nav-label',
                    "Orders")), 'click', (event) => { setPage("orders"); }), 'class', () => currentPage.get() === 'orders.get()' ? 'active' : '')),
              el('li.p6wkk7x.nav-item',
bind(on(                el('a.p6wkk7x.nav-link',
                  el('span.p6wkk7x.nav-icon',
                    "📈"),
                  el('span.p6wkk7x.nav-label',
                    "Analytics")), 'click', (event) => { setPage("analytics"); }), 'class', () => currentPage.get() === 'analytics' ? 'active' : '')),
              el('li.p6wkk7x.nav-item',
bind(on(                el('a.p6wkk7x.nav-link',
                  el('span.p6wkk7x.nav-icon',
                    "⚙️"),
                  el('span.p6wkk7x.nav-label',
                    "Settings")), 'click', (event) => { setPage("settings"); }), 'class', () => currentPage.get() === 'settings' ? 'active' : ''))),
            el('.p6wkk7x.sidebar-user',
              el('.p6wkk7x.user-avatar',
                text(() => `${currentUser.get() ? currentUser.get().name[0] : 'U'}`)),
              el('.p6wkk7x.user-info',
                el('.p6wkk7x.user-name',
                  text(() => `${currentUser.get() ? currentUser.get().name : 'User'}`)),
                el('.p6wkk7x.user-role',
                  text(() => `${currentUser.get() ? currentUser.get().role : 'Admin'}`))))), 'class', () => sidebarOpen.get() ? 'open' : 'collapsed'),
          el('.p6wkk7x.main-wrapper',
            el('header.p6wkk7x.header',
on(              el('button.p6wkk7x.header-toggle',
                "☰"), 'click', (event) => { toggleSidebar(); }),
              el('.p6wkk7x.header-search',
bind(on(                el('input.p6wkk7x', { 'type': 'search', 'placeholder': 'Search...' }), 'input', (event) => { setSearchQuery(event.target.value); }), 'value', () => searchQuery.get())),
              el('.p6wkk7x.header-right',
on(                el('button.p6wkk7x.header-btn.theme-toggle',
                  text(() => `${theme.get() === 'dark' ? '🌙' : '☀️'}`)), 'click', (event) => { toggleTheme(); }),
                el('button.p6wkk7x.header-btn.notif-btn',
                  el('span.p6wkk7x',
                    "🔔"),
                  when(
                    () => (notifications.get().length > 0),
                    () =>                       el('span.p6wkk7x.notif-badge',
                        text(() => `${notifications.get().length}`))
                  )),
                el('.p6wkk7x.user-menu',
on(                  el('button.p6wkk7x.user-btn',
                    el('span.p6wkk7x.avatar',
                      text(() => `${currentUser.get() ? currentUser.get().name[0] : 'U'}`))), 'click', (event) => { handleLogout(); })))),
            el('.p6wkk7x.content',
              when(
                () => (currentPage.get() === "dashboard"),
                () =>                   el('.p6wkk7x.page.dashboard-page',
                    el('.p6wkk7x.page-header',
                      el('div.p6wkk7x',
                        el('h1.p6wkk7x',
                          "Dashboard"),
                        el('p.p6wkk7x',
                          "Welcome back! Here's what's happening."))),
                    el('.p6wkk7x.stats-grid',
                      el('.p6wkk7x.stat-card.stat-primary',
                        el('.p6wkk7x.stat-icon',
                          "👥"),
                        el('.p6wkk7x.stat-content',
                          el('.p6wkk7x.stat-title',
                            "Total Users"),
                          el('.p6wkk7x.stat-value',
                            text(() => `${users.get().length}`)),
                          el('.p6wkk7x.stat-trend.up',
                            "↑ 12%"))),
                      el('.p6wkk7x.stat-card.stat-success',
                        el('.p6wkk7x.stat-icon',
                          "📦"),
                        el('.p6wkk7x.stat-content',
                          el('.p6wkk7x.stat-title',
                            "Products"),
                          el('.p6wkk7x.stat-value',
                            text(() => `${products.get().length}`)),
                          el('.p6wkk7x.stat-trend.up',
                            "↑ 5%"))),
                      el('.p6wkk7x.stat-card.stat-warning',
                        el('.p6wkk7x.stat-icon',
                          "🛒"),
                        el('.p6wkk7x.stat-content',
                          el('.p6wkk7x.stat-title',
                            "Orders"),
                          el('.p6wkk7x.stat-value',
                            text(() => `${orders.get().length}`)),
                          el('.p6wkk7x.stat-trend.down',
                            "↓ 3%"))),
                      el('.p6wkk7x.stat-card.stat-info',
                        el('.p6wkk7x.stat-icon',
                          "💰"),
                        el('.p6wkk7x.stat-content',
                          el('.p6wkk7x.stat-title',
                            "Revenue"),
                          el('.p6wkk7x.stat-value',
                            text(() => `\$${getTotalRevenue()}`)),
                          el('.p6wkk7x.stat-trend.up',
                            "↑ 8%")))),
                    el('.p6wkk7x.charts-row',
                      el('.p6wkk7x.chart-container',
                        el('h3.p6wkk7x.chart-title',
                          "Monthly Revenue"),
                        el('.p6wkk7x.bar-chart',
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 48%' }),
                            el('.p6wkk7x.bar-label',
                              "Jan")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 76%' }),
                            el('.p6wkk7x.bar-label',
                              "Feb")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 60%' }),
                            el('.p6wkk7x.bar-label',
                              "Mar")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 88%' }),
                            el('.p6wkk7x.bar-label',
                              "Apr")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 72%' }),
                            el('.p6wkk7x.bar-label',
                              "May")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 100%' }),
                            el('.p6wkk7x.bar-label',
                              "Jun")))),
                      el('.p6wkk7x.chart-container',
                        el('h3.p6wkk7x.chart-title',
                          "User Activity"),
                        el('.p6wkk7x.bar-chart',
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 58%' }),
                            el('.p6wkk7x.bar-label',
                              "Mon")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 79%' }),
                            el('.p6wkk7x.bar-label',
                              "Tue")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 71%' }),
                            el('.p6wkk7x.bar-label',
                              "Wed")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 100%' }),
                            el('.p6wkk7x.bar-label',
                              "Thu")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 83%' }),
                            el('.p6wkk7x.bar-label',
                              "Fri")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 45%' }),
                            el('.p6wkk7x.bar-label',
                              "Sat")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: 36%' }),
                            el('.p6wkk7x.bar-label',
                              "Sun"))))),
                    el('.p6wkk7x.section',
                      el('h2.p6wkk7x',
                        "Recent Orders"),
                      el('.p6wkk7x.table-container',
                        el('table.p6wkk7x.data-table',
                          el('thead.p6wkk7x',
                            el('tr.p6wkk7x',
                              el('th.p6wkk7x',
                                "ID"),
                              el('th.p6wkk7x',
                                "Customer"),
                              el('th.p6wkk7x',
                                "Product"),
                              el('th.p6wkk7x',
                                "Total"),
                              el('th.p6wkk7x',
                                "Status"))),
                          el('tbody.p6wkk7x',
                            list(
                              () => getRecentOrders(),
                              (order, _index) => (
                              el('tr.p6wkk7x',
                                el('td.p6wkk7x',
                                  text(() => `#${order.id}`)),
                                el('td.p6wkk7x',
                                  text(() => `${order.customer}`)),
                                el('td.p6wkk7x',
                                  text(() => `${order.product}`)),
                                el('td.p6wkk7x',
                                  text(() => `\$${order.total}`)),
                                el('td.p6wkk7x',
                                  el('span.p6wkk7x.badge', { 'class': 'badge-{order.status}' },
                                    text(() => `${order.status}`))))
                              )
                            ))))))
              ),
              when(
                () => (currentPage.get() === "users"),
                () =>                   el('.p6wkk7x.page.users-page',
                    el('.p6wkk7x.page-header',
                      el('div.p6wkk7x',
                        el('h1.p6wkk7x',
                          "Users"),
                        el('p.p6wkk7x',
                          "Manage your team members")),
on(                      el('button.p6wkk7x.btn.btn-primary',
                        "+ Add User"), 'click', (event) => { openAddUserModal(); })),
                    el('.p6wkk7x.toolbar',
bind(on(                      el('input.p6wkk7x.search-input', { 'type': 'search', 'placeholder': 'Search users...' }), 'input', (event) => { setSearchQuery(event.target.value); }), 'value', () => searchQuery.get())),
                    el('.p6wkk7x.table-container',
                      el('table.p6wkk7x.data-table',
                        el('thead.p6wkk7x',
                          el('tr.p6wkk7x',
                            el('th.p6wkk7x',
                              text(() => ``)),
                            el('th.p6wkk7x',
                              "Name"),
                            el('th.p6wkk7x',
                              "Email"),
                            el('th.p6wkk7x',
                              "Role"),
                            el('th.p6wkk7x',
                              "Status"),
                            el('th.p6wkk7x',
                              "Actions"))),
                        el('tbody.p6wkk7x',
                          list(
                            () => getFilteredUsers(),
                            (user, _index) => (
on(                            el('tr.p6wkk7x.clickable',
                              el('td.p6wkk7x',
                                el('.p6wkk7x.avatar',
                                  text(() => `${user.name[0]}`))),
                              el('td.p6wkk7x',
                                text(() => `${user.name}`)),
                              el('td.p6wkk7x',
                                text(() => `${user.email}`)),
                              el('td.p6wkk7x',
                                el('span.p6wkk7x.badge',
                                  text(() => `${user.role}`))),
                              el('td.p6wkk7x',
                                el('span.p6wkk7x.badge', { 'class': 'badge-{user.status}' },
                                  text(() => `${user.status}`))),
                              el('td.p6wkk7x.actions-cell',
on(                                el('button.p6wkk7x.action-btn', { 'title': 'Edit' },
                                  "✏️"), 'click', (event) => { openEditUserModal(event, user); }),
on(                                el('button.p6wkk7x.action-btn', { 'title': 'Delete' },
                                  "🗑️"), 'click', (event) => { confirmDeleteUser(event, user); }))), 'click', (event) => { viewUserDetail(user.id); })
                            )
                          )))))
              ),
              when(
                () => (currentPage.get() === "user-detail"),
                () =>                   el('.p6wkk7x.page.user-detail-page',
                    el('.p6wkk7x.page-header',
on(                      el('button.p6wkk7x.btn.btn-secondary',
                        "← Back"), 'click', (event) => { setPage("users"); })),
                    when(
                      () => getSelectedUser(),
                      () => [
                        el('.p6wkk7x.user-detail-card',
                          el('.p6wkk7x.user-avatar-large',
                            text(() => `${getSelectedUser().name[0]}`)),
                          el('h2.p6wkk7x',
                            text(() => `${getSelectedUser().name}`)),
                          el('p.p6wkk7x.user-email',
                            text(() => `${getSelectedUser().email}`)),
                          el('.p6wkk7x.user-badges',
                            el('span.p6wkk7x.badge',
                              text(() => `${getSelectedUser().role}`)),
                            el('span.p6wkk7x.badge', { 'class': 'badge-{getSelectedUser().status}' },
                              text(() => `${getSelectedUser().status}`)))),
                        el('.p6wkk7x.section',
                          el('h3.p6wkk7x',
                            "Recent Activity"),
                          el('ul.p6wkk7x.activity-list',
                            el('li.p6wkk7x',
                              el('span.p6wkk7x.activity-time',
                                "2 hours ago"),
                              el('span.p6wkk7x',
                                "Logged in")),
                            el('li.p6wkk7x',
                              el('span.p6wkk7x.activity-time',
                                "1 day ago"),
                              el('span.p6wkk7x',
                                "Updated profile")),
                            el('li.p6wkk7x',
                              el('span.p6wkk7x.activity-time',
                                "3 days ago"),
                              el('span.p6wkk7x',
                                "Changed password"))))
                        ]
                    ))
              ),
              when(
                () => (currentPage.get() === "products"),
                () =>                   el('.p6wkk7x.page.products-page',
                    el('.p6wkk7x.page-header',
                      el('div.p6wkk7x',
                        el('h1.p6wkk7x',
                          "Products"),
                        el('p.p6wkk7x',
                          "Manage your product catalog")),
on(                      el('button.p6wkk7x.btn.btn-primary',
                        "+ Add Product"), 'click', (event) => { addRandomProduct(); })),
                    el('.p6wkk7x.products-grid',
                      list(
                        () => products.get(),
                        (product, _index) => (
                        el('.p6wkk7x.product-card',
                          el('.p6wkk7x.product-icon',
                            "📦"),
                          el('h3.p6wkk7x',
                            text(() => `${product.name}`)),
                          el('p.p6wkk7x.product-category',
                            text(() => `${product.category}`)),
                          el('.p6wkk7x.product-price',
                            text(() => `\$${product.price}`)),
                          el('.p6wkk7x.product-stock',
                            text(() => `Stock: ${product.stock}`)))
                        )
                      )))
              ),
              when(
                () => (currentPage.get() === "orders"),
                () =>                   el('.p6wkk7x.page.orders-page',
                    el('.p6wkk7x.page-header',
                      el('div.p6wkk7x',
                        el('h1.p6wkk7x',
                          "Orders"),
                        el('p.p6wkk7x',
                          "Track and manage orders"))),
                    el('.p6wkk7x.filter-bar',
bind(on(                      el('button.p6wkk7x.filter-btn',
                        "All"), 'click', (event) => { setOrderFilter("all"); }), 'class', () => orderFilter.get() === 'all' ? 'active' : ''),
bind(on(                      el('button.p6wkk7x.filter-btn',
                        "Pending"), 'click', (event) => { setOrderFilter("pending"); }), 'class', () => orderFilter.get() === 'pending' ? 'active' : ''),
bind(on(                      el('button.p6wkk7x.filter-btn',
                        "Processing"), 'click', (event) => { setOrderFilter("processing"); }), 'class', () => orderFilter.get() === 'processing' ? 'active' : ''),
bind(on(                      el('button.p6wkk7x.filter-btn',
                        "Completed"), 'click', (event) => { setOrderFilter("completed"); }), 'class', () => orderFilter.get() === 'completed' ? 'active' : '')),
                    el('.p6wkk7x.table-container',
                      el('table.p6wkk7x.data-table',
                        el('thead.p6wkk7x',
                          el('tr.p6wkk7x',
                            el('th.p6wkk7x',
                              "Order ID"),
                            el('th.p6wkk7x',
                              "Date"),
                            el('th.p6wkk7x',
                              "Customer"),
                            el('th.p6wkk7x',
                              "Product"),
                            el('th.p6wkk7x',
                              "Total"),
                            el('th.p6wkk7x',
                              "Status"))),
                        el('tbody.p6wkk7x',
                          list(
                            () => getFilteredOrders(),
                            (order, _index) => (
                            el('tr.p6wkk7x',
                              el('td.p6wkk7x',
                                text(() => `#${order.id}`)),
                              el('td.p6wkk7x',
                                text(() => `${order.date}`)),
                              el('td.p6wkk7x',
                                text(() => `${order.customer}`)),
                              el('td.p6wkk7x',
                                text(() => `${order.product}`)),
                              el('td.p6wkk7x',
                                text(() => `\$${order.total}`)),
                              el('td.p6wkk7x',
                                el('span.p6wkk7x.badge', { 'class': 'badge-{order.status}' },
                                  text(() => `${order.status}`))))
                            )
                          )))))
              ),
              when(
                () => (currentPage.get() === "analytics"),
                () =>                   el('.p6wkk7x.page.analytics-page',
                    el('.p6wkk7x.page-header',
                      el('div.p6wkk7x',
                        el('h1.p6wkk7x',
                          "Analytics"),
                        el('p.p6wkk7x',
                          "Insights and performance metrics"))),
                    el('.p6wkk7x.stats-row',
                      el('.p6wkk7x.stat-box',
                        el('.p6wkk7x.stat-label',
                          "Total Revenue"),
                        el('.p6wkk7x.stat-value',
                          text(() => `\$${getTotalRevenue()}`))),
                      el('.p6wkk7x.stat-box',
                        el('.p6wkk7x.stat-label',
                          "Average Order"),
                        el('.p6wkk7x.stat-value',
                          text(() => `\$${getAverageOrder()}`))),
                      el('.p6wkk7x.stat-box',
                        el('.p6wkk7x.stat-label',
                          "Largest Order"),
                        el('.p6wkk7x.stat-value',
                          text(() => `\$${getLargestOrder()}`))),
                      el('.p6wkk7x.stat-box',
                        el('.p6wkk7x.stat-label',
                          "Total Orders"),
                        el('.p6wkk7x.stat-value',
                          text(() => `${orders.get().length}`)))),
                    el('.p6wkk7x.charts-section',
                      el('.p6wkk7x.chart-container',
                        el('h3.p6wkk7x.chart-title',
                          "Orders by Status"),
                        el('.p6wkk7x.bar-chart',
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: {getStatusPercentage(\'completed\')}%' }),
                            el('.p6wkk7x.bar-label',
                              "Completed")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: {getStatusPercentage(\'pending\')}%' }),
                            el('.p6wkk7x.bar-label',
                              "Pending")),
                          el('.p6wkk7x.bar-item',
                            el('.p6wkk7x.bar', { 'style': 'height: {getStatusPercentage(\'processing\')}%' }),
                            el('.p6wkk7x.bar-label',
                              "Processing"))))))
              ),
              when(
                () => (currentPage.get() === "settings"),
                () =>                   el('.p6wkk7x.page.settings-page',
                    el('.p6wkk7x.page-header',
                      el('div.p6wkk7x',
                        el('h1.p6wkk7x',
                          "Settings"),
                        el('p.p6wkk7x',
                          "Configure your preferences"))),
                    el('.p6wkk7x.settings-container',
                      el('.p6wkk7x.settings-section',
                        el('h3.p6wkk7x',
                          "Appearance"),
                        el('.p6wkk7x.settings-row',
                          el('.p6wkk7x.settings-label',
                            el('strong.p6wkk7x',
                              "Theme"),
                            el('p.p6wkk7x',
                              "Choose your preferred color scheme")),
                          el('.p6wkk7x.theme-toggle',
bind(on(                            el('button.p6wkk7x.theme-btn',
                              "☀️ Light"), 'click', (event) => { setTheme("light"); }), 'class', () => theme.get() === 'light' ? 'active' : ''),
bind(on(                            el('button.p6wkk7x.theme-btn',
                              "🌙 Dark"), 'click', (event) => { setTheme("dark"); }), 'class', () => theme.get() === 'dark' ? 'active' : '')))),
                      el('.p6wkk7x.settings-section',
                        el('h3.p6wkk7x',
                          "Data Management"),
                        el('.p6wkk7x.settings-row',
                          el('.p6wkk7x.settings-label',
                            el('strong.p6wkk7x',
                              "Export Data"),
                            el('p.p6wkk7x',
                              "Download all your data as JSON")),
on(                          el('button.p6wkk7x.btn.btn-secondary',
                            "Export"), 'click', (event) => { exportData(); })),
                        el('.p6wkk7x.settings-row',
                          el('.p6wkk7x.settings-label',
                            el('strong.p6wkk7x',
                              "Reset Data"),
                            el('p.p6wkk7x',
                              "Clear all data and start fresh")),
on(                          el('button.p6wkk7x.btn.btn-danger',
                            "Reset"), 'click', (event) => { confirmResetData(); })))))
              ))),
          el('.p6wkk7x.toast-container',
            list(
              () => notifications.get(),
              (notif, _index) => (
              el('.p6wkk7x.toast', { 'class': 'toast-{notif.type}' },
                el('span.p6wkk7x.toast-icon',
                  text(() => `${notif.type === 'success' ? '✓' : notif.type === 'error' ? '✗' : 'ℹ'}`)),
                el('span.p6wkk7x.toast-message',
                  text(() => `${notif.message}`)),
on(                el('button.p6wkk7x.toast-close',
                  "×"), 'click', (event) => { removeNotification(notif.id); }))
              )
            )),
          when(
            () => modalOpen.get(),
            () => on(              el('.p6wkk7x.modal-backdrop',
                el('.p6wkk7x.modal-container',
                  el('.p6wkk7x.modal',
                    el('.p6wkk7x.modal-header',
                      el('h3.p6wkk7x',
                        text(() => `${getModalTitle()}`)),
on(                      el('button.p6wkk7x.modal-close',
                        "×"), 'click', (event) => { closeModal(); })),
                    el('.p6wkk7x.modal-body',
                      when(
                        () => (modalType.get() === "confirm"),
                        () =>                           el('p.p6wkk7x',
                            text(() => `${modalData.get() ? modalData.get().message : ''}`))
                      ),
                      when(
                        () => (modalType.get() === "user-form"),
                        () => on(                          el('form.p6wkk7x.user-form',
                            el('.p6wkk7x.form-group',
                              el('label.p6wkk7x',
                                "Name"),
bind(on(                              el('input.p6wkk7x', { 'type': 'text', 'placeholder': 'Full name' }), 'input', (event) => { updateEditingUser("name", event.target.value); }), 'value', () => editingUser.get() ? editingUser.get().name : '')),
                            el('.p6wkk7x.form-group',
                              el('label.p6wkk7x',
                                "Email"),
bind(on(                              el('input.p6wkk7x', { 'type': 'email', 'placeholder': 'email@example.com' }), 'input', (event) => { updateEditingUser("email", event.target.value); }), 'value', () => editingUser.get() ? editingUser.get().email : '')),
                            el('.p6wkk7x.form-group',
                              el('label.p6wkk7x',
                                "Role"),
on(                              el('select.p6wkk7x',
bind(                                el('option.p6wkk7x', { 'value': 'Admin' },
                                  "Admin"), 'selected', () => editingUser.get() && editingUser.get().role === 'Admin'),
bind(                                el('option.p6wkk7x', { 'value': 'Editor' },
                                  "Editor"), 'selected', () => editingUser.get() && editingUser.get().role === 'Editor'),
bind(                                el('option.p6wkk7x', { 'value': 'Viewer' },
                                  "Viewer"), 'selected', () => editingUser.get() && editingUser.get().role === 'Viewer')), 'change', (event) => { updateEditingUser("role", event.target.value); })),
                            el('.p6wkk7x.form-group',
                              el('label.p6wkk7x',
                                "Status"),
on(                              el('select.p6wkk7x',
bind(                                el('option.p6wkk7x', { 'value': 'active' },
                                  "Active"), 'selected', () => editingUser.get() && editingUser.get().status === 'active'),
bind(                                el('option.p6wkk7x', { 'value': 'inactive' },
                                  "Inactive"), 'selected', () => editingUser.get() && editingUser.get().status === 'inactive')), 'change', (event) => { updateEditingUser("status", event.target.value); })),
                            el('button.p6wkk7x.btn.btn-primary', { 'type': 'submit' },
                              text(() => `${modalData.get() && modalData.get().isEdit ? 'Update' : 'Create'}`))), 'submit', (event) => { handleUserFormSubmit(event); })
                      )),
                    when(
                      () => (modalType.get() === "confirm"),
                      () =>                         el('.p6wkk7x.modal-footer',
on(                          el('button.p6wkk7x.btn.btn-secondary',
                            "Cancel"), 'click', (event) => { closeModal(); }),
on(                          el('button.p6wkk7x.btn.btn-danger',
                            text(() => `${modalData.get() ? modalData.get().confirmText : 'Confirm'}`)), 'click', (event) => { handleConfirm(); }))
                    )))), 'click', (event) => { closeModalBackdrop(event); })
          )
          ]
      )), 'class', () => theme.get() === 'dark' ? 'theme.get()-dark' : 'theme.get()-light')
  );
}

// Styles
const SCOPE_ID = 'p6wkk7x';
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
  .theme-light.p6wkk7x {
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
  .app.p6wkk7x {
    display: flex;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
  }
  .main-wrapper.p6wkk7x {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: var(--sidebar-width);
    transition: margin var(--transition);
  }
  .sidebar.p6wkk7x {
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
  .sidebar.p6wkk7x.collapsed.p6wkk7x {
    width: var(--sidebar-collapsed);
  }
  .sidebar.p6wkk7x.collapsed.p6wkk7x.logo-text.p6wkk7x, .sidebar.p6wkk7x.collapsed.p6wkk7x.nav-label.p6wkk7x, .sidebar.p6wkk7x.collapsed.p6wkk7x.user-info.p6wkk7x {
    opacity: 0;
    width: 0;
  }
  .sidebar-logo.p6wkk7x {
    padding: 20px;
    font-size: 1.5em;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border);
  }
  .logo-text.p6wkk7x {
    background: linear-gradient(135deg, var(--primary), #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    white-space: nowrap;
    transition: opacity var(--transition);
  }
  .nav-list.p6wkk7x {
    list-style: none;
    padding: 16px 12px;
    flex: 1;
  }
  .nav-item.p6wkk7x {
    margin-bottom: 4px;
  }
  .nav-link.p6wkk7x {
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
  .nav-link.p6wkk7x:hover {
    background: var(--bg);
    color: var(--text);
  }
  .nav-link.active.p6wkk7x {
    background: var(--primary);
    color: white;
  }
  .nav-icon.p6wkk7x {
    font-size: 1.2em;
    width: 24px;
    text-align: center;
  }
  .nav-label.p6wkk7x {
    white-space: nowrap;
    transition: opacity var(--transition);
  }
  .sidebar-user.p6wkk7x {
    padding: 16px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .user-avatar.p6wkk7x {
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
  .user-info.p6wkk7x {
    white-space: nowrap;
    transition: opacity var(--transition);
  }
  .user-name.p6wkk7x {
    font-weight: 600;
    font-size: 0.9em;
  }
  .user-role.p6wkk7x {
    font-size: 0.75em;
    color: var(--text-muted);
  }
  .header.p6wkk7x {
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
  .header-toggle.p6wkk7x {
    background: none;
    border: none;
    color: var(--text);
    font-size: 1.5em;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    display: none;
  }
  .header-search.p6wkk7x {
    flex: 1;
    max-width: 400px;
  }
  .header-search.p6wkk7xinput.p6wkk7x {
    width: 100%;
    padding: 10px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.9em;
  }
  .header-right.p6wkk7x {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .header-btn.p6wkk7x {
    background: none;
    border: none;
    color: var(--text);
    font-size: 1.3em;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    position: relative;
  }
  .header-btn.p6wkk7x:hover {
    background: var(--bg);
  }
  .notif-badge.p6wkk7x {
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
  .user-btn.p6wkk7x {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }
  .user-btn.p6wkk7x.avatar.p6wkk7x {
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
  .content.p6wkk7x {
    flex: 1;
    padding: 24px 32px;
    overflow-y: auto;
    background: var(--bg);
  }
  .page.p6wkk7x {
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
  .page-header.p6wkk7x {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 24px;
  }
  .page-header.p6wkk7xh1.p6wkk7x {
    font-size: 1.8em;
    margin-bottom: 4px;
  }
  .page-header.p6wkk7xp.p6wkk7x {
    color: var(--text-muted);
  }
  .stats-grid.p6wkk7x {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  .stat-card.p6wkk7x {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid var(--border);
    transition: transform var(--transition);
  }
  .stat-card.p6wkk7x:hover {
    transform: translateY(-2px);
  }
  .stat-icon.p6wkk7x {
    font-size: 2.5em;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }
  .stat-primary.p6wkk7x.stat-icon.p6wkk7x {
    background: rgba(99, 102, 241, 0.1);
  }
  .stat-success.p6wkk7x.stat-icon.p6wkk7x {
    background: rgba(16, 185, 129, 0.1);
  }
  .stat-warning.p6wkk7x.stat-icon.p6wkk7x {
    background: rgba(245, 158, 11, 0.1);
  }
  .stat-info.p6wkk7x.stat-icon.p6wkk7x {
    background: rgba(59, 130, 246, 0.1);
  }
  .stat-title.p6wkk7x {
    font-size: 0.9em;
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .stat-value.p6wkk7x {
    font-size: 1.8em;
    font-weight: 700;
  }
  .stat-trend.p6wkk7x {
    font-size: 0.85em;
    margin-top: 4px;
  }
  .stat-trend.p6wkk7x.up.p6wkk7x {
    color: var(--success);
  }
  .stat-trend.p6wkk7x.down.p6wkk7x {
    color: var(--danger);
  }
  .charts-row.p6wkk7x {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  .chart-container.p6wkk7x {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 24px;
    border: 1px solid var(--border);
  }
  .chart-title.p6wkk7x {
    font-size: 1.1em;
    margin-bottom: 20px;
  }
  .bar-chart.p6wkk7x {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    height: 200px;
    padding-top: 20px;
  }
  .bar-item.p6wkk7x {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
  }
  .bar.p6wkk7x {
    width: 100%;
    max-width: 50px;
    background: linear-gradient(to top, var(--primary), var(--primary-dark));
    border-radius: 4px 4px 0 0;
    margin-top: auto;
  }
  .bar-label.p6wkk7x {
    font-size: 0.75em;
    color: var(--text-muted);
    margin-top: 8px;
  }
  .table-container.p6wkk7x {
    background: var(--bg-card);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    overflow: hidden;
  }
  .data-table.p6wkk7x {
    width: 100%;
    border-collapse: collapse;
  }
  .data-table.p6wkk7xth.p6wkk7x, .data-table.p6wkk7xtd.p6wkk7x {
    padding: 14px 16px;
    text-align: left;
  }
  .data-table.p6wkk7xth.p6wkk7x {
    background: var(--bg);
    font-weight: 600;
    font-size: 0.85em;
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .data-table.p6wkk7xtr.p6wkk7x {
    border-bottom: 1px solid var(--border);
    transition: background var(--transition);
  }
  .data-table.p6wkk7xtr.p6wkk7x:last-child {
    border-bottom: none;
  }
  .data-table.p6wkk7xtr.p6wkk7x.clickable.p6wkk7x {
    cursor: pointer;
  }
  .data-table.p6wkk7xtr.p6wkk7x:hover {
    background: var(--bg);
  }
  .data-table.p6wkk7x.avatar.p6wkk7x {
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
  .actions-cell.p6wkk7x {
    display: flex;
    gap: 8px;
  }
  .action-btn.p6wkk7x {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
  }
  .action-btn.p6wkk7x:hover {
    background: var(--bg);
  }
  .badge.p6wkk7x {
    display: inline-block;
    padding: 4px 10px;
    font-size: 0.75em;
    font-weight: 600;
    border-radius: 100px;
    background: var(--bg);
  }
  .badge-active.p6wkk7x, .badge-completed.p6wkk7x {
    background: rgba(16, 185, 129, 0.1);
    color: var(--success);
  }
  .badge-inactive.p6wkk7x {
    background: rgba(148, 163, 184, 0.1);
    color: var(--text-muted);
  }
  .badge-pending.p6wkk7x {
    background: rgba(245, 158, 11, 0.1);
    color: var(--warning);
  }
  .badge-processing.p6wkk7x {
    background: rgba(59, 130, 246, 0.1);
    color: var(--info);
  }
  .btn.p6wkk7x {
    padding: 10px 20px;
    font-size: 0.9em;
    font-weight: 500;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--transition);
  }
  .btn-primary.p6wkk7x {
    background: var(--primary);
    color: white;
  }
  .btn-primary.p6wkk7x:hover {
    background: var(--primary-dark);
  }
  .btn-secondary.p6wkk7x {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-danger.p6wkk7x {
    background: var(--danger);
    color: white;
  }
  .btn-block.p6wkk7x {
    width: 100%;
  }
  .form-group.p6wkk7x {
    margin-bottom: 16px;
  }
  .form-group.p6wkk7xlabel.p6wkk7x {
    display: block;
    margin-bottom: 6px;
    font-size: 0.9em;
    font-weight: 500;
  }
  .form-group.p6wkk7xinput.p6wkk7x, .form-group.p6wkk7xselect.p6wkk7x {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.95em;
  }
  .form-group.p6wkk7xinput.p6wkk7x:focus, .form-group.p6wkk7xselect.p6wkk7x:focus {
    outline: none;
    border-color: var(--primary);
  }
  .toolbar.p6wkk7x {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }
  .search-input.p6wkk7x {
    flex: 1;
    max-width: 300px;
    padding: 10px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
  }
  .filter-bar.p6wkk7x {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }
  .filter-btn.p6wkk7x {
    padding: 8px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
  }
  .filter-btn.p6wkk7x.active.p6wkk7x {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
  .products-grid.p6wkk7x {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }
  .product-card.p6wkk7x {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 24px;
    border: 1px solid var(--border);
    text-align: center;
    transition: transform var(--transition);
  }
  .product-card.p6wkk7x:hover {
    transform: translateY(-4px);
  }
  .product-icon.p6wkk7x {
    font-size: 3em;
    margin-bottom: 16px;
  }
  .product-category.p6wkk7x {
    font-size: 0.85em;
    color: var(--text-muted);
    margin-bottom: 12px;
  }
  .product-price.p6wkk7x {
    font-size: 1.5em;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 8px;
  }
  .product-stock.p6wkk7x {
    font-size: 0.85em;
    color: var(--text-muted);
  }
  .stats-row.p6wkk7x {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  .stat-box.p6wkk7x {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 24px;
    border: 1px solid var(--border);
    text-align: center;
  }
  .stat-box.p6wkk7x.stat-label.p6wkk7x {
    font-size: 0.9em;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .stat-box.p6wkk7x.stat-value.p6wkk7x {
    font-size: 2em;
    font-weight: 700;
  }
  .charts-section.p6wkk7x {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
  }
  .settings-container.p6wkk7x {
    max-width: 800px;
  }
  .settings-section.p6wkk7x {
    background: var(--bg-card);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    margin-bottom: 24px;
    overflow: hidden;
  }
  .settings-section.p6wkk7xh3.p6wkk7x {
    padding: 16px 24px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    font-size: 1em;
  }
  .settings-row.p6wkk7x {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }
  .settings-row.p6wkk7x:last-child {
    border-bottom: none;
  }
  .settings-label.p6wkk7xstrong.p6wkk7x {
    display: block;
    margin-bottom: 4px;
  }
  .settings-label.p6wkk7xp.p6wkk7x {
    font-size: 0.85em;
    color: var(--text-muted);
    margin: 0;
  }
  .theme-toggle.p6wkk7x {
    display: flex;
    gap: 8px;
  }
  .theme-btn.p6wkk7x {
    padding: 8px 16px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-muted);
    cursor: pointer;
  }
  .theme-btn.p6wkk7x.active.p6wkk7x {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
  .user-detail-card.p6wkk7x {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 40px;
    border: 1px solid var(--border);
    text-align: center;
    max-width: 500px;
    margin: 0 auto 24px;
  }
  .user-avatar-large.p6wkk7x {
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
  .user-email.p6wkk7x {
    color: var(--text-muted);
    margin-bottom: 16px;
  }
  .user-badges.p6wkk7x {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  .activity-list.p6wkk7x {
    list-style: none;
  }
  .activity-list.p6wkk7xli.p6wkk7x {
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .activity-list.p6wkk7xli.p6wkk7x:last-child {
    border-bottom: none;
  }
  .activity-time.p6wkk7x {
    color: var(--text-muted);
    font-size: 0.85em;
    margin-right: 12px;
  }
  .section.p6wkk7x {
    margin-bottom: 24px;
  }
  .section.p6wkk7xh2.p6wkk7x, .section.p6wkk7xh3.p6wkk7x {
    margin-bottom: 16px;
  }
  .login-page.p6wkk7x {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    padding: 20px;
  }
  .login-card.p6wkk7x {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 40px;
    width: 100%;
    max-width: 400px;
    border: 1px solid var(--border);
    text-align: center;
  }
  .login-logo.p6wkk7x {
    font-size: 4em;
    margin-bottom: 16px;
  }
  .login-subtitle.p6wkk7x {
    color: var(--text-muted);
    margin-bottom: 32px;
  }
  .login-form.p6wkk7x {
    text-align: left;
  }
  .login-form.p6wkk7x.btn.p6wkk7x {
    margin-top: 24px;
  }
  .modal-backdrop.p6wkk7x {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: fadeIn 0.2s ease;
  }
  .modal.p6wkk7x {
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
  .modal-header.p6wkk7x {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border);
  }
  .modal-close.p6wkk7x {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5em;
    cursor: pointer;
  }
  .modal-body.p6wkk7x {
    padding: 24px;
  }
  .modal-footer.p6wkk7x {
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
  .toast-container.p6wkk7x {
    position: fixed;
    top: 80px;
    right: 24px;
    z-index: 300;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .toast.p6wkk7x {
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
  .toast-icon.p6wkk7x {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85em;
  }
  .toast-success.p6wkk7x.toast-icon.p6wkk7x {
    background: var(--success);
    color: white;
  }
  .toast-error.p6wkk7x.toast-icon.p6wkk7x {
    background: var(--danger);
    color: white;
  }
  .toast-info.p6wkk7x.toast-icon.p6wkk7x {
    background: var(--info);
    color: white;
  }
  .toast-message.p6wkk7x {
    flex: 1;
  }
  .toast-close.p6wkk7x {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 1.2em;
  }
  @media (max-width:767px) {
    .sidebar.p6wkk7x {
      transform: translateX(-100%);
    }
  }
  @media (max-width:767px) {
    .sidebar.p6wkk7x.open.p6wkk7x {
      transform: translateX(0);
    }
  }
  @media (max-width:767px) {
    .main-wrapper.p6wkk7x {
      margin-left: 0;
    }
  }
  @media (max-width:767px) {
    .header-toggle.p6wkk7x {
      display: block;
    }
  }
  @media (max-width:767px) {
    .stats-grid.p6wkk7x {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width:767px) {
    .charts-row.p6wkk7x {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width:767px) {
    .content.p6wkk7x {
      padding: 16px;
    }
  }
  @media (max-width:767px) {
    .modal.p6wkk7x {
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