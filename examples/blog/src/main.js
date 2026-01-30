/**
 * Pulse Blog - Full blog example built with Pulse Framework
 */

import {
  pulse,
  effect,
  el,
  mount,
} from '/runtime/index.js';

// =============================================================================
// State
// =============================================================================

const currentView = pulse('list'); // 'list', 'view', 'create', 'edit'
const selectedPostId = pulse(null);
const selectedCategory = pulse(null);
const searchQuery = pulse('');
const darkMode = pulse(localStorage.getItem('pulse-blog-dark') === 'true');

const posts = pulse([
  {
    id: 1,
    title: "Getting Started with Pulse Framework",
    excerpt: "Learn how to build reactive web applications with Pulse's declarative syntax and signal-based reactivity.",
    content: "Pulse is a lightweight, declarative JavaScript framework for building reactive Single Page Applications. It features CSS selector-based DOM creation, signal-based reactivity (pulsations), and a custom DSL for cleaner code.\n\n## Key Features\n\n- **CSS Selector Syntax** - Create DOM elements using familiar CSS selectors\n- **Reactive Pulsations** - Automatic UI updates when state changes\n- **Custom DSL** - Optional .pulse file format for cleaner code\n- **Zero Dependencies** - Completely self-contained\n\n## Getting Started\n\nCreate a new project with:\n\n```bash\nnpx pulse create my-app\ncd my-app\nnpm install\nnpm run dev\n```",
    author: "Vincent Hirtz",
    category: "Tutorial",
    tags: ["pulse", "framework", "javascript"],
    publishedAt: "2024-01-15",
    readTime: 5
  },
  {
    id: 2,
    title: "Understanding Reactive State Management",
    excerpt: "Deep dive into how Pulse handles state with signals, effects, and computed values.",
    content: "State management is at the heart of any reactive framework. Pulse uses a signal-based approach that makes state changes predictable and efficient.\n\n## Signals (Pulses)\n\nA pulse is a reactive container for a value:\n\n```javascript\nconst count = pulse(0);\ncount.get();  // Read value\ncount.set(5); // Set value\ncount.update(n => n + 1); // Update with function\n```\n\n## Effects\n\nEffects automatically re-run when their dependencies change:\n\n```javascript\neffect(() => {\n  console.log('Count is:', count.get());\n});\n```",
    author: "Vincent Hirtz",
    category: "Deep Dive",
    tags: ["state", "reactivity", "signals"],
    publishedAt: "2024-01-20",
    readTime: 8
  },
  {
    id: 3,
    title: "Building Components with .pulse Files",
    excerpt: "Discover the elegant .pulse file format for writing cleaner, more maintainable components.",
    content: "The .pulse file format provides a clean, declarative way to write components with integrated state, view, and styles.\n\n## Basic Structure\n\n```pulse\n@page Counter\n\nstate {\n  count: 0\n}\n\nview {\n  .counter {\n    h1 \"Count: {count}\"\n    button @click(count++) \"+\"\n  }\n}\n```",
    author: "Vincent Hirtz",
    category: "Tutorial",
    tags: ["components", "pulse-files", "dsl"],
    publishedAt: "2024-01-25",
    readTime: 6
  },
  {
    id: 4,
    title: "Routing in Pulse Applications",
    excerpt: "Build single-page applications with Pulse's powerful built-in router.",
    content: "Pulse includes a full-featured router for building SPAs with nested routes, guards, and more.\n\n## Basic Setup\n\n```javascript\nimport { createRouter } from 'pulse-framework/runtime/router.js';\n\nconst router = createRouter({\n  routes: {\n    '/': HomePage,\n    '/about': AboutPage,\n    '/posts/:id': PostPage\n  }\n});\n```",
    author: "Vincent Hirtz",
    category: "Deep Dive",
    tags: ["router", "spa", "navigation"],
    publishedAt: "2024-02-01",
    readTime: 7
  },
  {
    id: 5,
    title: "Mobile Apps with Pulse",
    excerpt: "Learn how to build native Android and iOS apps using Pulse Mobile with zero dependencies.",
    content: "Pulse Mobile lets you build native mobile apps from your Pulse web app without any external dependencies.\n\n## Getting Started\n\n```bash\npulse mobile init\npulse build\npulse mobile build android\n```",
    author: "Vincent Hirtz",
    category: "Mobile",
    tags: ["mobile", "android", "ios"],
    publishedAt: "2024-02-10",
    readTime: 6
  }
]);

let nextId = 6;

// =============================================================================
// Computed Values
// =============================================================================

function getFilteredPosts() {
  const allPosts = posts.get();
  const category = selectedCategory.get();
  const query = searchQuery.get().toLowerCase();

  let filtered = allPosts;

  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }

  if (query) {
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.excerpt.toLowerCase().includes(query)
    );
  }

  return filtered;
}

function getSelectedPost() {
  const id = selectedPostId.get();
  return posts.get().find(p => p.id === id) || null;
}

function getCategories() {
  return [...new Set(posts.get().map(p => p.category))];
}

function getAllTags() {
  return [...new Set(posts.get().flatMap(p => p.tags))].slice(0, 10);
}

// =============================================================================
// Actions
// =============================================================================

function showList() {
  currentView.set('list');
  selectedPostId.set(null);
}

function viewPost(id) {
  currentView.set('view');
  selectedPostId.set(id);
}

function showCreateForm() {
  currentView.set('create');
  selectedPostId.set(null);
}

function showEditForm(id) {
  currentView.set('edit');
  selectedPostId.set(id);
}

function createPost(postData) {
  const newPost = {
    ...postData,
    id: nextId++,
    publishedAt: new Date().toISOString().split('T')[0],
    readTime: Math.ceil(postData.content.split(' ').length / 200)
  };
  posts.update(p => [...p, newPost]);
  currentView.set('view');
  selectedPostId.set(newPost.id);
}

function updatePost(id, updates) {
  posts.update(p => p.map(post => post.id === id ? { ...post, ...updates } : post));
  currentView.set('view');
  selectedPostId.set(id);
}

function deletePost(id) {
  posts.update(p => p.filter(post => post.id !== id));
  currentView.set('list');
  selectedPostId.set(null);
}

function filterByCategory(category) {
  selectedCategory.set(category);
  currentView.set('list');
}

function clearFilter() {
  selectedCategory.set(null);
  searchQuery.set('');
}

function search(query) {
  searchQuery.set(query);
}

function toggleDarkMode() {
  darkMode.update(v => !v);
  localStorage.setItem('pulse-blog-dark', darkMode.peek());
  document.body.classList.toggle('dark', darkMode.peek());
}

// =============================================================================
// Components
// =============================================================================

function Header() {
  const header = el('header.header');

  const nav = el('nav.nav');
  const logo = el('.logo');
  logo.innerHTML = '<span class="logo-icon">📰</span><span>Pulse Blog</span>';
  logo.addEventListener('click', showList);
  logo.style.cursor = 'pointer';
  nav.appendChild(logo);

  // Search
  const searchBox = el('.search-box');
  const searchInput = el('input.search-input[type=text][placeholder="Search posts..."]');
  effect(() => { searchInput.value = searchQuery.get(); });
  searchInput.addEventListener('input', (e) => search(e.target.value));
  searchBox.appendChild(searchInput);
  nav.appendChild(searchBox);

  // Actions
  const actions = el('.nav-actions');

  const newPostBtn = el('button.btn.btn-primary', '+ New Post');
  newPostBtn.addEventListener('click', showCreateForm);
  actions.appendChild(newPostBtn);

  const darkBtn = el('button.dark-toggle');
  effect(() => {
    darkBtn.innerHTML = darkMode.get() ? '☀️' : '🌙';
  });
  darkBtn.addEventListener('click', toggleDarkMode);
  actions.appendChild(darkBtn);

  nav.appendChild(actions);
  header.appendChild(nav);

  return header;
}

function PostCard(post) {
  const card = el('.post-card');

  const meta = el('.post-meta');
  meta.innerHTML = `
    <span class="category">${post.category}</span>
    <span class="separator">•</span>
    <span class="read-time">${post.readTime} min read</span>
  `;
  card.appendChild(meta);

  const title = el('h3.post-title', post.title);
  title.addEventListener('click', () => viewPost(post.id));
  card.appendChild(title);

  card.appendChild(el('p.post-excerpt', post.excerpt));

  const footer = el('.post-footer');
  const author = el('.author');
  author.innerHTML = `
    <span class="author-avatar">${post.author.charAt(0)}</span>
    <span class="author-name">${post.author}</span>
  `;
  footer.appendChild(author);
  footer.appendChild(el('span.date', post.publishedAt));
  card.appendChild(footer);

  const tags = el('.post-tags');
  post.tags.forEach(tag => {
    tags.appendChild(el('span.tag', `#${tag}`));
  });
  card.appendChild(tags);

  return card;
}

function PostList() {
  const container = el('.post-list');

  effect(() => {
    container.innerHTML = '';
    const filtered = getFilteredPosts();

    if (filtered.length === 0) {
      const empty = el('.empty-state');
      empty.innerHTML = '<span class="empty-icon">📝</span><p>No posts found</p>';
      container.appendChild(empty);
    } else {
      filtered.forEach(post => {
        container.appendChild(PostCard(post));
      });
    }
  });

  return container;
}

function Sidebar() {
  const sidebar = el('aside.sidebar');

  // Categories
  const catSection = el('.sidebar-section');
  catSection.appendChild(el('h3.section-title', 'Categories'));

  const catList = el('.category-list');

  effect(() => {
    catList.innerHTML = '';
    const current = selectedCategory.get();

    const allBtn = el('button.category-item' + (current === null ? '.active' : ''));
    allBtn.innerHTML = `<span class="category-name">All Posts</span><span class="category-count">${posts.get().length}</span>`;
    allBtn.addEventListener('click', clearFilter);
    catList.appendChild(allBtn);

    getCategories().forEach(cat => {
      const count = posts.get().filter(p => p.category === cat).length;
      const btn = el('button.category-item' + (current === cat ? '.active' : ''));
      btn.innerHTML = `<span class="category-name">${cat}</span><span class="category-count">${count}</span>`;
      btn.addEventListener('click', () => filterByCategory(cat));
      catList.appendChild(btn);
    });
  });

  catSection.appendChild(catList);
  sidebar.appendChild(catSection);

  // Tags
  const tagSection = el('.sidebar-section');
  tagSection.appendChild(el('h3.section-title', 'Popular Tags'));

  const tagCloud = el('.tag-cloud');
  effect(() => {
    tagCloud.innerHTML = '';
    getAllTags().forEach(tag => {
      tagCloud.appendChild(el('span.tag', `#${tag}`));
    });
  });
  tagSection.appendChild(tagCloud);
  sidebar.appendChild(tagSection);

  // Recent posts
  const recentSection = el('.sidebar-section');
  recentSection.appendChild(el('h3.section-title', 'Recent Posts'));

  const recentList = el('.recent-posts');
  effect(() => {
    recentList.innerHTML = '';
    posts.get().slice(0, 3).forEach(post => {
      const item = el('.recent-post');
      const title = el('h4.recent-title', post.title);
      title.addEventListener('click', () => viewPost(post.id));
      item.appendChild(title);
      item.appendChild(el('span.recent-date', post.publishedAt));
      recentList.appendChild(item);
    });
  });
  recentSection.appendChild(recentList);
  sidebar.appendChild(recentSection);

  return sidebar;
}

function PostView() {
  const container = el('.post-view');

  effect(() => {
    container.innerHTML = '';
    const post = getSelectedPost();

    if (!post) {
      const notFound = el('.not-found');
      notFound.innerHTML = '<h2>Post not found</h2><p>The post you\'re looking for doesn\'t exist.</p>';
      const backBtn = el('button.btn.btn-primary', 'Back to posts');
      backBtn.addEventListener('click', showList);
      notFound.appendChild(backBtn);
      container.appendChild(notFound);
      return;
    }

    // Header
    const header = el('.post-header');
    const backBtn = el('button.back-btn');
    backBtn.innerHTML = '<span class="arrow">←</span><span>Back to posts</span>';
    backBtn.addEventListener('click', showList);
    header.appendChild(backBtn);

    const actions = el('.post-actions');
    const editBtn = el('button.btn.btn-secondary', 'Edit');
    editBtn.addEventListener('click', () => showEditForm(post.id));
    actions.appendChild(editBtn);

    const deleteBtn = el('button.btn.btn-danger', 'Delete');
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this post?')) {
        deletePost(post.id);
      }
    });
    actions.appendChild(deleteBtn);
    header.appendChild(actions);
    container.appendChild(header);

    // Article
    const article = el('article.post-content');

    const meta = el('.post-meta');
    meta.innerHTML = `
      <span class="category">${post.category}</span>
      <span class="separator">|</span>
      <span class="read-time">${post.readTime} min read</span>
      <span class="separator">|</span>
      <span class="date">${post.publishedAt}</span>
    `;
    article.appendChild(meta);

    article.appendChild(el('h1.post-title', post.title));

    const authorInfo = el('.author-info');
    authorInfo.innerHTML = `
      <div class="author-avatar">${post.author.charAt(0)}</div>
      <div class="author-details">
        <span class="author-name">${post.author}</span>
        <span class="author-role">Author</span>
      </div>
    `;
    article.appendChild(authorInfo);

    const body = el('.post-body');
    body.innerHTML = `<p>${post.content.replace(/\n/g, '</p><p>')}</p>`;
    article.appendChild(body);

    const tags = el('.post-tags');
    post.tags.forEach(tag => {
      tags.appendChild(el('span.tag', `#${tag}`));
    });
    article.appendChild(tags);

    container.appendChild(article);
  });

  return container;
}

function PostForm() {
  const container = el('.post-form');

  // Form state
  const formState = {
    title: '',
    excerpt: '',
    content: '',
    author: '',
    category: 'Tutorial',
    tags: ''
  };

  effect(() => {
    container.innerHTML = '';
    const view = currentView.get();
    const isEdit = view === 'edit';
    const post = isEdit ? getSelectedPost() : null;

    if (isEdit && post) {
      formState.title = post.title;
      formState.excerpt = post.excerpt;
      formState.content = post.content;
      formState.author = post.author;
      formState.category = post.category;
      formState.tags = post.tags.join(', ');
    } else {
      formState.title = '';
      formState.excerpt = '';
      formState.content = '';
      formState.author = '';
      formState.category = 'Tutorial';
      formState.tags = '';
    }

    const header = el('.form-header');
    header.appendChild(el('h2', isEdit ? 'Edit Post' : 'Create New Post'));
    header.appendChild(el('p.form-subtitle', isEdit ? 'Update your blog post' : 'Share your thoughts with the world'));
    container.appendChild(header);

    const form = el('form.form');

    // Title
    const titleGroup = el('.form-group');
    titleGroup.appendChild(el('label.form-label', 'Title'));
    const titleInput = el('input.form-input[type=text][placeholder="Enter post title..."]');
    titleInput.value = formState.title;
    titleInput.addEventListener('input', e => formState.title = e.target.value);
    titleGroup.appendChild(titleInput);
    form.appendChild(titleGroup);

    // Excerpt
    const excerptGroup = el('.form-group');
    excerptGroup.appendChild(el('label.form-label', 'Excerpt'));
    const excerptInput = el('textarea.form-textarea[placeholder="Brief summary..."][rows=2]');
    excerptInput.value = formState.excerpt;
    excerptInput.addEventListener('input', e => formState.excerpt = e.target.value);
    excerptGroup.appendChild(excerptInput);
    form.appendChild(excerptGroup);

    // Content
    const contentGroup = el('.form-group');
    contentGroup.appendChild(el('label.form-label', 'Content'));
    const contentInput = el('textarea.form-textarea.large[placeholder="Write your post..."][rows=12]');
    contentInput.value = formState.content;
    contentInput.addEventListener('input', e => formState.content = e.target.value);
    contentGroup.appendChild(contentInput);
    form.appendChild(contentGroup);

    // Author & Category row
    const row = el('.form-row');

    const authorGroup = el('.form-group');
    authorGroup.appendChild(el('label.form-label', 'Author'));
    const authorInput = el('input.form-input[type=text][placeholder="Your name"]');
    authorInput.value = formState.author;
    authorInput.addEventListener('input', e => formState.author = e.target.value);
    authorGroup.appendChild(authorInput);
    row.appendChild(authorGroup);

    const catGroup = el('.form-group');
    catGroup.appendChild(el('label.form-label', 'Category'));
    const catSelect = el('select.form-select');
    ['Tutorial', 'Deep Dive', 'Mobile', 'News', 'Tips'].forEach(cat => {
      const opt = el('option', cat);
      opt.value = cat;
      if (cat === formState.category) opt.selected = true;
      catSelect.appendChild(opt);
    });
    catSelect.addEventListener('change', e => formState.category = e.target.value);
    catGroup.appendChild(catSelect);
    row.appendChild(catGroup);

    form.appendChild(row);

    // Tags
    const tagsGroup = el('.form-group');
    tagsGroup.appendChild(el('label.form-label', 'Tags'));
    const tagsInput = el('input.form-input[type=text][placeholder="Enter tags separated by commas..."]');
    tagsInput.value = formState.tags;
    tagsInput.addEventListener('input', e => formState.tags = e.target.value);
    tagsGroup.appendChild(tagsInput);
    tagsGroup.appendChild(el('span.form-hint', 'Separate multiple tags with commas'));
    form.appendChild(tagsGroup);

    // Actions
    const actions = el('.form-actions');

    const cancelBtn = el('button.btn.btn-secondary[type=button]', 'Cancel');
    cancelBtn.addEventListener('click', () => {
      if (isEdit && post) {
        viewPost(post.id);
      } else {
        showList();
      }
    });
    actions.appendChild(cancelBtn);

    const submitBtn = el('button.btn.btn-primary[type=submit]', isEdit ? 'Update Post' : 'Publish Post');
    actions.appendChild(submitBtn);

    form.appendChild(actions);

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!formState.title.trim() || !formState.content.trim() || !formState.author.trim()) {
        alert('Please fill in all required fields');
        return;
      }

      const postData = {
        title: formState.title.trim(),
        excerpt: formState.excerpt.trim() || formState.content.substring(0, 150) + '...',
        content: formState.content.trim(),
        author: formState.author.trim(),
        category: formState.category,
        tags: formState.tags.split(',').map(t => t.trim()).filter(t => t)
      };

      if (isEdit && post) {
        updatePost(post.id, postData);
      } else {
        createPost(postData);
      }
    });

    container.appendChild(form);
  });

  return container;
}

function App() {
  const app = el('#app.blog-app');

  app.appendChild(Header());

  const main = el('main.main-content');

  effect(() => {
    main.innerHTML = '';
    const view = currentView.get();

    if (view === 'list') {
      const wrapper = el('.content-wrapper');
      wrapper.appendChild(PostList());
      wrapper.appendChild(Sidebar());
      main.appendChild(wrapper);
    } else if (view === 'view') {
      main.appendChild(PostView());
    } else if (view === 'create' || view === 'edit') {
      main.appendChild(PostForm());
    }
  });

  app.appendChild(main);

  const footer = el('footer.footer');
  footer.appendChild(el('p', 'Built with Pulse Framework'));
  app.appendChild(footer);

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --accent: #8b5cf6;
  --success: #10b981;
  --danger: #ef4444;
  --shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  --radius: 12px;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-serif: 'Merriweather', Georgia, serif;
}

body.dark {
  --bg: #0f172a;
  --card-bg: #1e293b;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
  --shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.3), 0 4px 6px -2px rgba(0,0,0,0.2);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  transition: background 0.3s, color 0.3s;
}

.blog-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.logo-icon { font-size: 1.5rem; }

.search-box { flex: 1; max-width: 400px; }

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dark-toggle {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
}

.dark-toggle:hover { background: var(--border); }

/* Main Content */
.main-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 32px;
}

@media (max-width: 900px) {
  .content-wrapper { grid-template-columns: 1fr; }
}

/* Post List */
.post-list {
  display: grid;
  gap: 24px;
}

.post-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  transition: transform 0.2s, box-shadow 0.2s;
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.75rem;
}

.category {
  padding: 4px 10px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.separator { color: var(--border); }
.read-time, .date { color: var(--text-muted); }

.post-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 8px;
  cursor: pointer;
  transition: color 0.2s;
}

.post-title:hover { color: var(--primary); }

.post-excerpt {
  color: var(--text-muted);
  margin-bottom: 16px;
  line-height: 1.6;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.author-name { font-weight: 500; font-size: 0.875rem; }

.post-tags { display: flex; flex-wrap: wrap; gap: 6px; }

.tag {
  padding: 4px 10px;
  background: var(--bg);
  color: var(--text-muted);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* Sidebar */
.sidebar { display: flex; flex-direction: column; gap: 24px; }

.sidebar-section {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 20px;
  border: 1px solid var(--border);
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.category-list { display: flex; flex-direction: column; gap: 4px; }

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--text);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;
}

.category-item:hover { background: var(--bg); }

.category-item.active {
  background: var(--primary);
  color: white;
}

.category-name { font-weight: 500; }

.category-count {
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.category-item.active .category-count {
  background: rgba(255,255,255,0.2);
  color: white;
}

.tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }

.recent-posts { display: flex; flex-direction: column; gap: 16px; }

.recent-post {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.recent-post:last-child { padding-bottom: 0; border-bottom: none; }

.recent-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
  line-height: 1.4;
  cursor: pointer;
}

.recent-title:hover { color: var(--primary); }

.recent-date { font-size: 0.75rem; color: var(--text-muted); }

/* Post View */
.post-view { max-width: 800px; margin: 0 auto; }

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--border);
  border: none;
  border-radius: 8px;
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover { background: var(--primary); color: white; }

.arrow { font-weight: 700; }

.post-actions { display: flex; gap: 12px; }

.post-content {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 40px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.post-content .post-title {
  font-family: var(--font-serif);
  font-size: 2.5rem;
  cursor: default;
}

.post-content .post-title:hover { color: var(--text); }

.author-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 24px;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--border);
}

.author-info .author-avatar {
  width: 48px;
  height: 48px;
  font-size: 1.25rem;
}

.author-details { display: flex; flex-direction: column; }
.author-role { font-size: 0.875rem; color: var(--text-muted); }

.post-body {
  font-family: var(--font-serif);
  font-size: 1.125rem;
  line-height: 1.8;
  white-space: pre-wrap;
}

.post-body p { margin-bottom: 1.5em; }

.post-content .post-tags {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.not-found {
  text-align: center;
  padding: 60px 24px;
  background: var(--card-bg);
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.not-found h2 { margin-bottom: 8px; }
.not-found p { color: var(--text-muted); margin-bottom: 24px; }

/* Post Form */
.post-form {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 40px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.form-header { margin-bottom: 32px; }
.form-header h2 { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; }
.form-subtitle { color: var(--text-muted); }

.form { display: flex; flex-direction: column; gap: 24px; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.form-group { display: flex; flex-direction: column; gap: 8px; }

.form-label { font-weight: 500; font-size: 0.875rem; }

.form-input, .form-textarea, .form-select {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: var(--primary);
}

.form-textarea { resize: vertical; min-height: 100px; }
.form-textarea.large { min-height: 300px; font-family: monospace; }
.form-select { cursor: pointer; }
.form-hint { font-size: 0.75rem; color: var(--text-muted); }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

@media (max-width: 600px) {
  .post-form { padding: 24px; }
  .form-row { grid-template-columns: 1fr; }
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover { background: var(--primary-hover); }
.btn-secondary { background: var(--border); color: var(--text); }
.btn-secondary:hover { background: var(--text-muted); color: white; }
.btn-danger { background: var(--danger); color: white; }
.btn-danger:hover { opacity: 0.9; }

/* Footer */
.footer {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 0.875rem;
  border-top: 1px solid var(--border);
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  color: var(--text-muted);
}

.empty-icon { font-size: 3em; margin-bottom: 12px; }
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Mount
// =============================================================================

if (darkMode.get()) {
  document.body.classList.add('dark');
}

mount('#app', App());

console.log('📰 Pulse Blog loaded!');
