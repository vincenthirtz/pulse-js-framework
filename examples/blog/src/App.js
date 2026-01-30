import { pulse, computed, effect, batch, el, text, on, list, when, mount, model } from 'pulse-framework/runtime';

// State
const currentView = pulse("list");
const selectedPostId = pulse(null);
const selectedCategory = pulse(null);
const searchQuery = pulse("");
const darkMode = pulse(false);
const nextId = pulse(6);
const posts = pulse([{ id: 1, title: "Getting Started with Pulse Framework", excerpt: "Learn how to build reactive web applications with Pulse.", content: "Pulse is a lightweight framework for building reactive SPAs.", author: "Vincent Hirtz", category: "Tutorial", tags: ["pulse", "framework", "javascript"], publishedAt: "2024-01-15", readTime: 5 }, { id: 2, title: "Understanding Reactive State", excerpt: "Deep dive into signals, effects, and computed values.", content: "State management is at the heart of any reactive framework.", author: "Vincent Hirtz", category: "Deep Dive", tags: ["state", "reactivity", "signals"], publishedAt: "2024-01-20", readTime: 8 }, { id: 3, title: "Building Components with .pulse Files", excerpt: "Discover the elegant .pulse file format.", content: "The .pulse format provides a clean way to write components.", author: "Vincent Hirtz", category: "Tutorial", tags: ["components", "pulse-files", "dsl"], publishedAt: "2024-01-25", readTime: 6 }, { id: 4, title: "Routing in Pulse Applications", excerpt: "Build SPAs with Pulse's built-in router.", content: "Pulse includes a full-featured router for building SPAs.", author: "Vincent Hirtz", category: "Deep Dive", tags: ["router", "spa", "navigation"], publishedAt: "2024-02-01", readTime: 7 }, { id: 5, title: "Mobile Apps with Pulse", excerpt: "Build native apps using Pulse Mobile.", content: "Pulse Mobile lets you build native mobile apps.", author: "Vincent Hirtz", category: "Mobile", tags: ["mobile", "android", "ios"], publishedAt: "2024-02-10", readTime: 6 }]);

// Actions
function getFilteredPosts() {
  let filtered = posts.get() ; const category = selectedCategory.get() ; const query = searchQuery.get().toLowerCase() ; if(category) {filtered = filtered.filter(p => p.category === category)} ; if(query) {filtered = filtered.filter(p => p.title.toLowerCase().includes(query) || p.excerpt.toLowerCase().includes(query))} ; return filtered
}

function getSelectedPost() {
  const id = selectedPostId.get() ; return posts.get().find(p => p.id === id) || null
}

function getCategories() {
  return[...new Set(posts.get().map(p => p.category))]
}

function showList() {
  currentView.set("list"); selectedPostId.set(null);
}

function viewPost(id) {
  currentView.set("view"); selectedPostId.set(id);
}

function showCreateForm() {
  currentView.set("create"); selectedPostId.set(null); setTimeout(() => clearForm(), 0)
}

function showEditForm(id) {
  currentView.set("edit"); selectedPostId.set(id); setTimeout(() => populateForm(id), 0)
}

function createPost(data) {
  const newPost = {...data, id : nextId.get(), publishedAt : new Date().toISOString().split('T')[0], readTime : Math.ceil(data.content.split(' ').length / 200), tags :[]} ; posts.set([...posts, newPost]); nextId.set(nextId.get() + 1); viewPost(newPost.id)
}

function updatePost(id, updates) {
  posts.set(posts.get().map(p => p.id === id ? {...p, ...updates} : p)); viewPost(id)
}

function deletePost(id) {
  if(confirm('Delete this post?')) {posts.set(posts.get().filter(p => p.id !== id)); showList()}
}

function filterByCategory(category) {
  selectedCategory.set(category); currentView.set("list");
}

function clearFilter() {
  selectedCategory.set(null); searchQuery.set("");
}

function handleSearch(event) {
  searchQuery.set(event.target.value);
}

function toggleDarkMode() {
  darkMode.set(!darkMode.get()); document.body.classList.toggle('dark', darkMode.get())
}

function clearForm() {
  const title = document.getElementById('form-title') ; const excerpt = document.getElementById('form-excerpt') ; const content = document.getElementById('form-content') ; const author = document.getElementById('form-author') ; if(title) title.value = '' ; if(excerpt) excerpt.value = '' ; if(content) content.value = '' ; if(author) author.value = ''
}

function populateForm(id) {
  const post = posts.get().find(p => p.id === id) ; if(!post) return ; const title = document.getElementById('form-title') ; const excerpt = document.getElementById('form-excerpt') ; const content = document.getElementById('form-content') ; const author = document.getElementById('form-author') ; const category = document.getElementById('form-category') ; if(title) title.value = post.title ; if(excerpt) excerpt.value = post.excerpt ; if(content) content.value = post.content ; if(author) author.value = post.author ; if(category) category.value = post.category
}

function handleSubmit(event) {
  event.preventDefault() ; const title = document.getElementById('form-title') ?.value ?.trim() ; const excerpt = document.getElementById('form-excerpt') ?.value ?.trim() ; const content = document.getElementById('form-content') ?.value ?.trim() ; const author = document.getElementById('form-author') ?.value ?.trim() ; const category = document.getElementById('form-category') ?.value ; if(!title || !content || !author) {alert('Please fill in all required fields') ; return} ; const data = {title, excerpt : excerpt || content.substring(0, 150) + '...', content, author, category} ; if(currentView.get() === 'edit' && selectedPostId.get()) {updatePost(selectedPostId.get(), data)} else {createPost(data)}
}

function cancelForm() {
  if(currentView.get() === 'edit' && selectedPostId.get()) {viewPost(selectedPostId.get())} else {showList()}
}


// View
function render() {
  return (
    el('.ptasj7u.blog-app',
      el('header.ptasj7u.header',
        el('nav.ptasj7u.nav',
on(          el('.ptasj7u.logo',
            el('span.ptasj7u.logo-icon',
              "📰"),
            el('span.ptasj7u',
              "Pulse Blog")), 'click', () => { showList(); }),
          el('.ptasj7u.search-box',
on(            el('input.ptasj7u.search-input[type=text][placeholder="Search posts..."]'), 'input', () => { handleSearch(event); })),
          el('.ptasj7u.nav-actions',
on(            el('button.ptasj7u.btn.btn-primary',
              "+ New Post"), 'click', () => { showCreateForm(); }),
on(            el('button.ptasj7u.dark-toggle',
              text(() => `${darkMode.get() ? '☀️' : '🌙'}`)), 'click', () => { toggleDarkMode(); })))),
      el('main.ptasj7u.main-content',
        when(
          () => (currentView.get() === "list"),
          () => (
          el('.ptasj7u.content-wrapper',
            el('.ptasj7u.post-list',
              list(
                () => getFilteredPosts(),
                (post, _index) => (
on(                el('.ptasj7u.post-card',
                  el('.ptasj7u.post-meta',
                    el('span.ptasj7u.category',
                      text(() => `${post.category}`)),
                    el('span.ptasj7u.separator',
                      "•"),
                    el('span.ptasj7u.read-time',
                      text(() => `${post.readTime}" min read"`))),
                  el('h3.ptasj7u.post-title',
                    text(() => `${post.title}`)),
                  el('p.ptasj7u.post-excerpt',
                    text(() => `${post.excerpt}`)),
                  el('.ptasj7u.post-footer',
                    el('.ptasj7u.author',
                      el('span.ptasj7u.author-avatar',
                        text(() => `${post.author.charAt(0)}`)),
                      el('span.ptasj7u.author-name',
                        text(() => `${post.author}`))),
                    el('span.ptasj7u.date',
                      text(() => `${post.publishedAt}`)))), 'click', () => { viewPost(post.id); })
                )
              )),
            el('aside.ptasj7u.sidebar',
              el('.ptasj7u.sidebar-section',
                el('h3.ptasj7u.section-title',
                  "Categories"),
                el('.ptasj7u.category-list',
on(                  el('button.ptasj7u.category-item',
                    el('span.ptasj7u.category-name',
                      "All Posts"),
                    el('span.ptasj7u.category-count',
                      text(() => `${posts.get()?.length}`))), 'click', () => { clearFilter(); }),
                  list(
                    () => getCategories(),
                    (cat, _index) => (
on(                    el('button.ptasj7u.category-item',
                      el('span.ptasj7u.category-name',
                        text(() => `${cat}`)),
                      el('span.ptasj7u.category-count',
                        text(() => `${posts.get()?.filter(p => p.category === cat)?.length}`))), 'click', () => { filterByCategory(cat); })
                    )
                  ))),
              el('.ptasj7u.sidebar-section',
                el('h3.ptasj7u.section-title',
                  "Recent Posts"),
                el('.ptasj7u.recent-posts',
                  list(
                    () => posts.get().slice(0, 3),
                    (post, _index) => (
on(                    el('.ptasj7u.recent-post',
                      el('h4.ptasj7u.recent-title',
                        text(() => `${post.title}`)),
                      el('span.ptasj7u.recent-date',
                        text(() => `${post.publishedAt}`))), 'click', () => { viewPost(post.id); })
                    )
                  )))))
          )
        ),
        when(
          () => (currentView.get() === "view"),
          () => (
          el('.ptasj7u.post-view',
            el('.ptasj7u.post-header',
on(              el('button.ptasj7u.back-btn',
                el('span.ptasj7u.arrow',
                  "←"),
                el('span.ptasj7u',
                  "Back to posts")), 'click', () => { showList(); }),
              el('.ptasj7u.post-actions',
on(                el('button.ptasj7u.btn.btn-secondary',
                  "Edit"), 'click', () => { showEditForm(selectedPostId.get()); }),
on(                el('button.ptasj7u.btn.btn-danger',
                  "Delete"), 'click', () => { deletePost(selectedPostId.get()); }))),
            when(
              () => getSelectedPost(),
              () => (
              el('article.ptasj7u.post-content',
                el('.ptasj7u.post-meta',
                  el('span.ptasj7u.category',
                    text(() => `${getSelectedPost()?.category}`)),
                  el('span.ptasj7u.separator',
                    "|"),
                  el('span.ptasj7u.read-time',
                    text(() => `${getSelectedPost()?.readTime}" min read"`)),
                  el('span.ptasj7u.separator',
                    "|"),
                  el('span.ptasj7u.date',
                    text(() => `${getSelectedPost()?.publishedAt}`))),
                el('h1.ptasj7u.post-title',
                  text(() => `${getSelectedPost()?.title}`)),
                el('.ptasj7u.author-info',
                  el('.ptasj7u.author-avatar',
                    text(() => `${getSelectedPost()?.author.charAt(0)}`)),
                  el('.ptasj7u.author-details',
                    el('span.ptasj7u.author-name',
                      text(() => `${getSelectedPost()?.author}`)),
                    el('span.ptasj7u.author-role',
                      "Author"))),
                el('.ptasj7u.post-body',
                  text(() => `${getSelectedPost()?.content}`)))
              )
            ))
          )
        ),
        when(
          () => ((currentView.get() === "create") || (currentView.get() === "edit")),
          () => (
          el('.ptasj7u.post-form',
            el('.ptasj7u.form-header',
              el('h2.ptasj7u',
                text(() => `${currentView.get() === 'edit' ? 'Edit Post' : 'Create New Post'}`)),
              el('p.ptasj7u.form-subtitle',
                text(() => `${currentView.get() === 'edit' ? 'Update your blog post' : 'Share your thoughts'}`))),
on(            el('form.ptasj7u.form',
              el('.ptasj7u.form-group',
                el('label.ptasj7u.form-label',
                  "Title"),
                el('input.ptasj7u#form-title.form-input[type=text][placeholder="Enter post title..."]')),
              el('.ptasj7u.form-group',
                el('label.ptasj7u.form-label',
                  "Excerpt"),
                el('textarea.ptasj7u#form-excerpt.form-textarea[placeholder="Brief summary..."][rows=2]')),
              el('.ptasj7u.form-group',
                el('label.ptasj7u.form-label',
                  "Content"),
                el('textarea.ptasj7u#form-content.form-textarea.large[placeholder="Write your post..."][rows=8]')),
              el('.ptasj7u.form-row',
                el('.ptasj7u.form-group',
                  el('label.ptasj7u.form-label',
                    "Author"),
                  el('input.ptasj7u#form-author.form-input[type=text][placeholder="Your name"]')),
                el('.ptasj7u.form-group',
                  el('label.ptasj7u.form-label',
                    "Category"),
                  el('select.ptasj7u#form-category.form-select',
                    el('option[value="Tutorial"].ptasj7u',
                      "Tutorial"),
                    el('option[value="Deep Dive"].ptasj7u',
                      "Deep Dive"),
                    el('option[value="Mobile"].ptasj7u',
                      "Mobile"),
                    el('option[value="News"].ptasj7u',
                      "News")))),
              el('.ptasj7u.form-actions',
on(                el('button.ptasj7u.btn.btn-secondary[type=button]',
                  "Cancel"), 'click', () => { cancelForm(); }),
                el('button.ptasj7u.btn.btn-primary[type=submit]',
                  text(() => `${currentView.get() === 'edit' ? 'Update Post' : 'Publish Post'}`)))), 'submit', () => { handleSubmit(event); }))
          )
        )),
      el('footer.ptasj7u.footer',
        el('p.ptasj7u',
          "Built with Pulse Framework")))
  );
}

// Styles
const SCOPE_ID = 'ptasj7u';
const styles = `
:root {
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text: #1e293b;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --danger: #ef4444;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --radius: 12px;
}
body.dark {
  --bg: #0f172a;
  --card-bg: #1e293b;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
}
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}
.blog-app.ptasj7u {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header.ptasj7u {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav.ptasj7u {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
}
.logo.ptasj7u {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
}
.search-box.ptasj7u {
  flex: 1;
  max-width: 400px;
}
.search-input.ptasj7u {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
}
.nav-actions.ptasj7u {
  display: flex;
  gap: 12px;
}
.dark-toggle.ptasj7u {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 8px;
}
.main-content.ptasj7u {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}
.content-wrapper.ptasj7u {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 32px;
}
.post-list.ptasj7u {
  display: grid;
  gap: 24px;
}
.post-card.ptasj7u {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.2s;
}
.post-card.ptasj7u:hover {
  transform: translateY(-2px);
}
.post-meta.ptasj7u {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.75rem;
}
.category.ptasj7u {
  padding: 4px 10px;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  font-weight: 600;
}
.post-title.ptasj7u {
  font-size: 1.25rem;
  margin-bottom: 8px;
}
.post-excerpt.ptasj7u {
  color: var(--text-muted);
  margin-bottom: 16px;
}
.post-footer.ptasj7u {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.author.ptasj7u {
  display: flex;
  align-items: center;
  gap: 8px;
}
.author-avatar.ptasj7u {
  width: 32px;
  height: 32px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.sidebar.ptasj7u {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.sidebar-section.ptasj7u {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 20px;
}
.section-title.ptasj7u {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.category-list.ptasj7u {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.category-item.ptasj7u {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  background: none;
  border: none;
  border-radius: 8px;
  color: var(--text);
  cursor: pointer;
  text-align: left;
  width: 100%;
}
.category-item.ptasj7u:hover {
  background: var(--bg);
}
.recent-posts.ptasj7u {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.recent-post.ptasj7u {
  cursor: pointer;
}
.recent-title.ptasj7u {
  font-size: 0.875rem;
  margin-bottom: 4px;
}
.recent-date.ptasj7u {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.post-view.ptasj7u {
  max-width: 800px;
  margin: 0 auto;
}
.post-header.ptasj7u {
  display: flex;
  justify-content: space-between;
  margin-bottom: 32px;
}
.back-btn.ptasj7u {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--border);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text);
}
.post-actions.ptasj7u {
  display: flex;
  gap: 12px;
}
.post-content.ptasj7u {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 40px;
}
.author-info.ptasj7u {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
}
.author-details.ptasj7u {
  display: flex;
  flex-direction: column;
}
.author-role.ptasj7u {
  font-size: 0.875rem;
  color: var(--text-muted);
}
.post-body.ptasj7u {
  font-size: 1.125rem;
  line-height: 1.8;
}
.post-form.ptasj7u {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 40px;
}
.form-header.ptasj7u {
  margin-bottom: 32px;
}
.form-subtitle.ptasj7u {
  color: var(--text-muted);
}
.form.ptasj7u {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.form-row.ptasj7u {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.form-group.ptasj7u {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label.ptasj7u {
  font-weight: 500;
}
.form-input.ptasj7u, .form-textarea.ptasj7u, .form-select.ptasj7u {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
}
.form-input.ptasj7u:focus, .form-textarea.ptasj7u:focus {
  outline: none;
  border-color: var(--primary);
}
.form-textarea.ptasj7u {
  resize: vertical;
  min-height: 100px;
}
.form-textarea.large.ptasj7u {
  min-height: 200px;
}
.form-actions.ptasj7u {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.btn.ptasj7u {
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.btn-primary.ptasj7u {
  background: var(--primary);
  color: white;
}
.btn-primary.ptasj7u:hover {
  background: var(--primary-hover);
}
.btn-secondary.ptasj7u {
  background: var(--border);
  color: var(--text);
}
.btn-danger.ptasj7u {
  background: var(--danger);
  color: white;
}
.footer.ptasj7u {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
}
@media(max-width:900px) {
  .content-wrapper.ptasj7u {
    grid-template-columns: 1fr;
  }
  .sidebar.ptasj7u {
    order: -1;
  }
  .form-row.ptasj7u {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles
const styleEl = document.createElement("style");
styleEl.setAttribute('data-p-scope', SCOPE_ID);
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Export
export const BlogApp = {
  render,
  mount: (target) => {
    const el = render();
    return mount(target, el);
  }
};

export default BlogApp;