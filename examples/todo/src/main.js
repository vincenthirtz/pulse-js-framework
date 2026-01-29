/**
 * Pulse Todo App - Enhanced Version
 */

import {
  pulse,
  effect,
  el,
  mount,
} from '/runtime/index.js';

// =============================================================================
// LocalStorage Persistence
// =============================================================================

function loadTodos() {
  try {
    const saved = localStorage.getItem('pulse-todos');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Learn Pulse Framework', completed: true },
      { id: 2, text: 'Build something awesome', completed: false },
      { id: 3, text: 'Share with the world', completed: false }
    ];
  } catch {
    return [];
  }
}

function saveTodos(items) {
  localStorage.setItem('pulse-todos', JSON.stringify(items));
}

// =============================================================================
// State
// =============================================================================

const todos = pulse(loadTodos());
const filter = pulse('all');
const newTodoText = pulse('');
const editingId = pulse(null);
const editText = pulse('');
const darkMode = pulse(localStorage.getItem('pulse-dark') === 'true');

let nextId = Math.max(0, ...loadTodos().map(t => t.id)) + 1;

// Manual save function - called after mutations
function persistTodos() {
  saveTodos(todos.peek());
}

function persistDarkMode() {
  localStorage.setItem('pulse-dark', darkMode.peek());
  document.body.classList.toggle('dark', darkMode.peek());
}

// =============================================================================
// Computed Values
// =============================================================================

function getFilteredTodos() {
  const items = todos.get();
  const currentFilter = filter.get();
  switch (currentFilter) {
    case 'active': return items.filter(t => !t.completed);
    case 'completed': return items.filter(t => t.completed);
    default: return items;
  }
}

function getRemainingCount() {
  return todos.get().filter(t => !t.completed).length;
}

function getCompletedCount() {
  return todos.get().filter(t => t.completed).length;
}

function getProgress() {
  const items = todos.get();
  if (items.length === 0) return 0;
  return Math.round((getCompletedCount() / items.length) * 100);
}

// =============================================================================
// Actions
// =============================================================================

function addTodo() {
  const text = newTodoText.get().trim();
  if (!text) return;
  todos.update(items => [...items, {
    id: nextId++,
    text,
    completed: false,
    createdAt: Date.now()
  }]);
  newTodoText.set('');
  persistTodos();
}

function toggleTodo(id) {
  todos.update(items =>
    items.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
  );
  persistTodos();
}

function deleteTodo(id) {
  todos.update(items => items.filter(t => t.id !== id));
  persistTodos();
}

function clearCompleted() {
  todos.update(items => items.filter(t => !t.completed));
  persistTodos();
}

function toggleAll() {
  const allCompleted = todos.peek().every(t => t.completed);
  todos.update(items => items.map(t => ({ ...t, completed: !allCompleted })));
  persistTodos();
}

function startEdit(todo) {
  editingId.set(todo.id);
  editText.set(todo.text);
}

function saveEdit() {
  const id = editingId.peek();
  const text = editText.peek().trim();
  if (text && id) {
    todos.update(items =>
      items.map(t => t.id === id ? { ...t, text } : t)
    );
    persistTodos();
  }
  editingId.set(null);
  editText.set('');
}

function cancelEdit() {
  editingId.set(null);
  editText.set('');
}

function toggleDarkMode() {
  darkMode.update(v => !v);
  persistDarkMode();
}

// =============================================================================
// Components
// =============================================================================

function Header() {
  const container = el('header.header');

  // Title with dark mode toggle
  const titleRow = el('.title-row');
  titleRow.appendChild(el('h1', '✨ todos'));

  const darkBtn = el('button.dark-toggle');
  effect(() => {
    darkBtn.innerHTML = darkMode.get() ? '☀️' : '🌙';
    darkBtn.title = darkMode.get() ? 'Light mode' : 'Dark mode';
  });
  darkBtn.addEventListener('click', toggleDarkMode);
  titleRow.appendChild(darkBtn);
  container.appendChild(titleRow);

  // Progress bar
  const progressContainer = el('.progress-container');
  const progressBar = el('.progress-bar');
  const progressText = el('span.progress-text');

  effect(() => {
    const progress = getProgress();
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${progress}% complete`;
    progressBar.className = `progress-bar ${progress === 100 ? 'complete' : ''}`;
  });

  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressText);
  container.appendChild(progressContainer);

  // Input
  const input = el('input.new-todo[placeholder="What needs to be done?"][autofocus]');
  effect(() => { input.value = newTodoText.get(); });
  input.addEventListener('input', (e) => newTodoText.set(e.target.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo();
  });
  container.appendChild(input);

  return container;
}

function TodoItem(todo, isEditing) {
  const li = el(`li.todo-item${todo.completed ? '.completed' : ''}${isEditing ? '.editing' : ''}`);

  // View mode
  const view = el('.view');

  const checkbox = el('input.toggle[type=checkbox]');
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));
  view.appendChild(checkbox);

  const label = el('label', todo.text);
  label.addEventListener('dblclick', () => startEdit(todo));
  view.appendChild(label);

  // Time ago
  if (todo.createdAt) {
    const timeAgo = el('span.time-ago');
    const diff = Date.now() - todo.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) timeAgo.textContent = `${days}d ago`;
    else if (hours > 0) timeAgo.textContent = `${hours}h ago`;
    else if (minutes > 0) timeAgo.textContent = `${minutes}m ago`;
    else timeAgo.textContent = 'just now';

    view.appendChild(timeAgo);
  }

  const deleteBtn = el('button.destroy');
  deleteBtn.innerHTML = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    li.classList.add('removing');
    setTimeout(() => deleteTodo(todo.id), 200);
  });
  view.appendChild(deleteBtn);

  li.appendChild(view);

  // Edit mode
  const editInput = el('input.edit');
  if (isEditing) {
    editInput.value = todo.text;
    setTimeout(() => editInput.focus(), 0);
  }
  editInput.addEventListener('input', (e) => editText.set(e.target.value));
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  });
  editInput.addEventListener('blur', saveEdit);
  li.appendChild(editInput);

  return li;
}

function TodoList() {
  const container = el('section.main');

  // Toggle all
  const toggleAllCheckbox = el('input#toggle-all.toggle-all[type=checkbox]');
  effect(() => {
    const items = todos.get();
    toggleAllCheckbox.checked = items.length > 0 && items.every(t => t.completed);
  });
  toggleAllCheckbox.addEventListener('change', toggleAll);
  container.appendChild(toggleAllCheckbox);
  container.appendChild(el('label[for=toggle-all]', '❯'));

  // List
  const ul = el('ul.todo-list');
  effect(() => {
    ul.innerHTML = '';
    const filtered = getFilteredTodos();
    const currentEditingId = editingId.get(); // Track editingId dependency

    if (filtered.length === 0) {
      const empty = el('.empty-state');
      const currentFilter = filter.get();
      const icon = currentFilter === 'completed' ? '🎉' : '📝';
      const msg = currentFilter === 'completed'
        ? 'No completed tasks yet'
        : currentFilter === 'active'
          ? 'All done! Take a break 🎊'
          : 'Add your first task above';
      empty.innerHTML = `<span class="empty-icon">${icon}</span><span>${msg}</span>`;
      ul.appendChild(empty);
    } else {
      for (const todo of filtered) {
        ul.appendChild(TodoItem(todo, currentEditingId === todo.id));
      }
    }
  });
  container.appendChild(ul);

  return container;
}

function Footer() {
  const footer = el('footer.footer');

  // Stats
  const stats = el('.stats');

  const countSpan = el('span.todo-count');
  effect(() => {
    const count = getRemainingCount();
    countSpan.innerHTML = `<strong>${count}</strong> task${count !== 1 ? 's' : ''} left`;
  });
  stats.appendChild(countSpan);
  footer.appendChild(stats);

  // Filters
  const filters = el('ul.filters');
  [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'active', label: 'Active', icon: '⏳' },
    { value: 'completed', label: 'Done', icon: '✅' }
  ].forEach(({ value, label, icon }) => {
    const li = el('li');
    const a = el('a', `${icon} ${label}`);
    a.href = `#/${value === 'all' ? '' : value}`;

    effect(() => {
      a.className = filter.get() === value ? 'selected' : '';
    });

    a.addEventListener('click', (e) => {
      e.preventDefault();
      filter.set(value);
    });

    li.appendChild(a);
    filters.appendChild(li);
  });
  footer.appendChild(filters);

  // Clear completed
  const clearBtn = el('button.clear-completed', '🗑️ Clear done');
  clearBtn.addEventListener('click', clearCompleted);
  effect(() => {
    clearBtn.style.visibility = getCompletedCount() > 0 ? 'visible' : 'hidden';
  });
  footer.appendChild(clearBtn);

  return footer;
}

function App() {
  return el('section.todoapp',
    Header(),
    TodoList(),
    Footer(),
    el('footer.info',
      el('p', 'Double-click to edit a task'),
      el('p', 'Built with ✨ Pulse Framework')
    )
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --bg: #f5f5f5;
  --card-bg: #fff;
  --text: #333;
  --text-muted: #888;
  --border: #ededed;
  --primary: #646cff;
  --primary-hover: #535bf2;
  --danger: #ff6b6b;
  --success: #51cf66;
  --shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1), 0 25px 50px 0 rgba(0, 0, 0, 0.08);
}

body.dark {
  --bg: #1a1a2e;
  --card-bg: #16213e;
  --text: #eee;
  --text-muted: #888;
  --border: #2a2a4a;
  --shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.3), 0 25px 50px 0 rgba(0, 0, 0, 0.3);
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
}

body {
  font: 14px 'Segoe UI', system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  transition: background 0.3s, color 0.3s;
}

.todoapp {
  background: var(--card-bg);
  max-width: 550px;
  margin: 40px auto;
  border-radius: 16px;
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: background 0.3s, box-shadow 0.3s;
}

/* Header */
.header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  font-size: 2em;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dark-toggle {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

.dark-toggle:hover {
  background: var(--border);
}

/* Progress */
.progress-container {
  background: var(--border);
  border-radius: 100px;
  height: 8px;
  margin-bottom: 16px;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), #a855f7);
  border-radius: 100px;
  transition: width 0.4s ease;
}

.progress-bar.complete {
  background: linear-gradient(90deg, var(--success), #20c997);
}

.progress-text {
  position: absolute;
  right: 0;
  top: 12px;
  font-size: 0.75em;
  color: var(--text-muted);
}

/* Input */
.new-todo {
  width: 100%;
  padding: 16px;
  font-size: 1.1em;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--bg);
  color: var(--text);
  transition: border-color 0.2s, background 0.3s;
}

.new-todo:focus {
  outline: none;
  border-color: var(--primary);
}

.new-todo::placeholder {
  color: var(--text-muted);
}

/* Main */
.main {
  position: relative;
}

.toggle-all {
  position: absolute;
  top: -60px;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.toggle-all + label {
  position: absolute;
  top: 16px;
  left: 16px;
  font-size: 1.2em;
  color: var(--text-muted);
  cursor: pointer;
  transform: rotate(90deg);
  transition: color 0.2s;
}

.toggle-all:checked + label {
  color: var(--text);
}

/* Todo List */
.todo-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.todo-item {
  position: relative;
  border-bottom: 1px solid var(--border);
  transition: background 0.2s, opacity 0.2s, transform 0.2s;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-item:hover {
  background: var(--bg);
}

.todo-item.removing {
  opacity: 0;
  transform: translateX(50px);
}

.todo-item .view {
  display: flex;
  align-items: center;
  padding: 16px 16px 16px 50px;
}

.todo-item .toggle {
  position: absolute;
  left: 16px;
  width: 24px;
  height: 24px;
  appearance: none;
  border: 2px solid var(--border);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.todo-item .toggle:checked {
  background: var(--success);
  border-color: var(--success);
}

.todo-item .toggle:checked::after {
  content: '✓';
  display: block;
  text-align: center;
  color: white;
  font-size: 14px;
  line-height: 20px;
}

.todo-item label {
  flex: 1;
  word-break: break-word;
  cursor: pointer;
  transition: color 0.2s;
}

.todo-item.completed label {
  color: var(--text-muted);
  text-decoration: line-through;
}

.todo-item .time-ago {
  font-size: 0.75em;
  color: var(--text-muted);
  margin-left: 12px;
}

.todo-item .destroy {
  display: none;
  width: 32px;
  height: 32px;
  margin-left: 8px;
  font-size: 1.5em;
  color: var(--danger);
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
}

.todo-item:hover .destroy {
  display: flex;
  align-items: center;
  justify-content: center;
}

.todo-item .destroy:hover {
  background: rgba(255, 107, 107, 0.1);
}

/* Editing */
.todo-item .edit {
  display: none;
  width: calc(100% - 32px);
  margin: 0 16px;
  padding: 12px 16px;
  font-size: 1em;
  border: 2px solid var(--primary);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text);
}

.todo-item.editing .view {
  display: none;
}

.todo-item.editing .edit {
  display: block;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

/* Footer */
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 0.9em;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 12px;
}

.todo-count strong {
  font-weight: 600;
  color: var(--text);
}

.filters {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
  gap: 4px;
}

.filters a {
  display: block;
  padding: 6px 12px;
  text-decoration: none;
  color: var(--text-muted);
  border-radius: 8px;
  transition: all 0.2s;
}

.filters a:hover {
  background: var(--border);
}

.filters a.selected {
  background: var(--primary);
  color: white;
}

.clear-completed {
  padding: 6px 12px;
  font-size: 0.9em;
  color: var(--text-muted);
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-completed:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: white;
}

/* Info footer */
.info {
  padding: 16px;
  text-align: center;
  font-size: 0.8em;
  color: var(--text-muted);
}

.info p {
  margin: 4px 0;
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.todo-item {
  animation: slideIn 0.2s ease;
}

/* Mobile */
@media (max-width: 550px) {
  .todoapp {
    margin: 0;
    border-radius: 0;
    min-height: 100vh;
  }

  .footer {
    justify-content: center;
  }

  .filters {
    order: -1;
    width: 100%;
    justify-content: center;
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

// Apply initial dark mode
if (darkMode.get()) {
  document.body.classList.add('dark');
}

mount('#app', App());

console.log('🚀 Pulse Todo App loaded!');
