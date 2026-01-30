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
    el('.po9cwtk.blog-app',
      el('header.po9cwtk.header',
        el('nav.po9cwtk.nav',
on(          el('.po9cwtk.logo',
            el('span.po9cwtk.logo-icon',
              "📰"),
            el('span.po9cwtk',
              "Pulse Blog")), 'click', () => { showList(); }),
          el('.po9cwtk.search-box',
on(            el('input.po9cwtk.search-input[type=text][placeholder="Search posts..."]'), 'input', () => { handleSearch(event); })),
          el('.po9cwtk.nav-actions',
on(            el('button.po9cwtk.btn.btn-primary',
              "+ New Post"), 'click', () => { showCreateForm(); }),
on(            el('button.po9cwtk.dark-toggle',
              text(() => `${darkMode.get() ? '☀️' : '🌙'}`)), 'click', () => { toggleDarkMode(); })))),
      el('main.po9cwtk.main-content',
        when(
          () => (currentView.get() === "list"),
          () => (
          el('.po9cwtk.content-wrapper',
            el('.po9cwtk.post-list',
              list(
                () => getFilteredPosts(),
                (post, _index) => (
on(                el('.po9cwtk.post-card',
                  el('.po9cwtk.post-meta',
                    el('span.po9cwtk.category',
                      text(() => `${post.category}`)),
                    el('span.po9cwtk.separator',
                      "•"),
                    el('span.po9cwtk.read-time',
                      text(() => `${post.readTime}" min read"`))),
                  el('h3.po9cwtk.post-title',
                    text(() => `${post.title}`)),
                  el('p.po9cwtk.post-excerpt',
                    text(() => `${post.excerpt}`)),
                  el('.po9cwtk.post-footer',
                    el('.po9cwtk.author',
                      el('span.po9cwtk.author-avatar',
                        text(() => `${post.author.charAt(0)}`)),
                      el('span.po9cwtk.author-name',
                        text(() => `${post.author}`))),
                    el('span.po9cwtk.date',
                      text(() => `${post.publishedAt}`)))), 'click', () => { viewPost(post.id); })
                )
              )),
            el('aside.po9cwtk.sidebar',
              el('.po9cwtk.sidebar-section',
                el('h3.po9cwtk.section-title',
                  "Categories"),
                el('.po9cwtk.category-list',
on(                  el('button.po9cwtk.category-item',
                    el('span.po9cwtk.category-name',
                      "All Posts"),
                    el('span.po9cwtk.category-count',
                      text(() => `${posts.get()?.length}`))), 'click', () => { clearFilter(); }),
                  list(
                    () => getCategories(),
                    (cat, _index) => (
on(                    el('button.po9cwtk.category-item',
                      el('span.po9cwtk.category-name',
                        text(() => `${cat}`)),
                      el('span.po9cwtk.category-count',
                        text(() => `${posts.get()?.filter(p => p.category === cat)?.length}`))), 'click', () => { filterByCategory(cat); })
                    )
                  ))),
              el('.po9cwtk.sidebar-section',
                el('h3.po9cwtk.section-title',
                  "Recent Posts"),
                el('.po9cwtk.recent-posts',
                  list(
                    () => posts.get().slice(0, 3),
                    (post, _index) => (
on(                    el('.po9cwtk.recent-post',
                      el('h4.po9cwtk.recent-title',
                        text(() => `${post.title}`)),
                      el('span.po9cwtk.recent-date',
                        text(() => `${post.publishedAt}`))), 'click', () => { viewPost(post.id); })
                    )
                  )))))
          )
        ),
        when(
          () => (currentView.get() === "view"),
          () => (
          el('.po9cwtk.post-view',
            el('.po9cwtk.post-header',
on(              el('button.po9cwtk.back-btn',
                el('span.po9cwtk.arrow',
                  "←"),
                el('span.po9cwtk',
                  "Back to posts")), 'click', () => { showList(); }),
              el('.po9cwtk.post-actions',
on(                el('button.po9cwtk.btn.btn-secondary',
                  "Edit"), 'click', () => { showEditForm(selectedPostId.get()); }),
on(                el('button.po9cwtk.btn.btn-danger',
                  "Delete"), 'click', () => { deletePost(selectedPostId.get()); }))),
            when(
              () => getSelectedPost(),
              () => (
              el('article.po9cwtk.post-content',
                el('.po9cwtk.post-meta',
                  el('span.po9cwtk.category',
                    text(() => `${getSelectedPost()?.category}`)),
                  el('span.po9cwtk.separator',
                    "|"),
                  el('span.po9cwtk.read-time',
                    text(() => `${getSelectedPost()?.readTime}" min read"`)),
                  el('span.po9cwtk.separator',
                    "|"),
                  el('span.po9cwtk.date',
                    text(() => `${getSelectedPost()?.publishedAt}`))),
                el('h1.po9cwtk.post-title',
                  text(() => `${getSelectedPost()?.title}`)),
                el('.po9cwtk.author-info',
                  el('.po9cwtk.author-avatar',
                    text(() => `${getSelectedPost()?.author.charAt(0)}`)),
                  el('.po9cwtk.author-details',
                    el('span.po9cwtk.author-name',
                      text(() => `${getSelectedPost()?.author}`)),
                    el('span.po9cwtk.author-role',
                      "Author"))),
                el('.po9cwtk.post-body',
                  text(() => `${getSelectedPost()?.content}`)))
              )
            ))
          )
        ),
        when(
          () => ((currentView.get() === "create") || (currentView.get() === "edit")),
          () => (
          el('.po9cwtk.post-form',
            el('.po9cwtk.form-header',
              el('h2.po9cwtk',
                text(() => `${currentView.get() === 'edit' ? 'Edit Post' : 'Create New Post'}`)),
              el('p.po9cwtk.form-subtitle',
                text(() => `${currentView.get() === 'edit' ? 'Update your blog post' : 'Share your thoughts'}`))),
on(            el('form.po9cwtk.form',
              el('.po9cwtk.form-group',
                el('label.po9cwtk.form-label',
                  "Title"),
                el('input.po9cwtk#form-title.form-input[type=text][placeholder="Enter post title..."]')),
              el('.po9cwtk.form-group',
                el('label.po9cwtk.form-label',
                  "Excerpt"),
                el('textarea.po9cwtk#form-excerpt.form-textarea[placeholder="Brief summary..."][rows=2]')),
              el('.po9cwtk.form-group',
                el('label.po9cwtk.form-label',
                  "Content"),
                el('textarea.po9cwtk#form-content.form-textarea.large[placeholder="Write your post..."][rows=8]')),
              el('.po9cwtk.form-row',
                el('.po9cwtk.form-group',
                  el('label.po9cwtk.form-label',
                    "Author"),
                  el('input.po9cwtk#form-author.form-input[type=text][placeholder="Your name"]')),
                el('.po9cwtk.form-group',
                  el('label.po9cwtk.form-label',
                    "Category"),
                  el('select.po9cwtk#form-category.form-select',
                    el('option[value="Tutorial"].po9cwtk',
                      "Tutorial"),
                    el('option[value="Deep Dive"].po9cwtk',
                      "Deep Dive"),
                    el('option[value="Mobile"].po9cwtk',
                      "Mobile"),
                    el('option[value="News"].po9cwtk',
                      "News")))),
              el('.po9cwtk.form-actions',
on(                el('button.po9cwtk.btn.btn-secondary[type=button]',
                  "Cancel"), 'click', () => { cancelForm(); }),
                el('button.po9cwtk.btn.btn-primary[type=submit]',
                  text(() => `${currentView.get() === 'edit' ? 'Update Post' : 'Publish Post'}`)))), 'submit', () => { handleSubmit(event); }))
          )
        )),
      el('footer.po9cwtk.footer',
        el('p.po9cwtk',
          "Built with Pulse Framework")))
  );
}

// Styles
const SCOPE_ID = 'po9cwtk';
const styles = `
:root.po9cwtk {
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
body.dark.po9cwtk {
  --bg: #0f172a;
  --card-bg: #1e293b;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
}
*.po9cwtk {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body.po9cwtk {
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}
.blog-app.po9cwtk {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header.po9cwtk {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav.po9cwtk {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
}
.logo.po9cwtk {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
}
.search-box.po9cwtk {
  flex: 1;
  max-width: 400px;
}
.search-input.po9cwtk {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
}
.nav-actions.po9cwtk {
  display: flex;
  gap: 12px;
}
.dark-toggle.po9cwtk {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 8px;
}
.main-content.po9cwtk {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}
.content-wrapper.po9cwtk {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 32px;
}
.post-list.po9cwtk {
  display: grid;
  gap: 24px;
}
.post-card.po9cwtk {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.2s;
}
.post-card.po9cwtk:hover {
  transform: translateY(-2px);
}
.post-meta.po9cwtk {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.75rem;
}
.category.po9cwtk {
  padding: 4px 10px;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  font-weight: 600;
}
.post-title.po9cwtk {
  font-size: 1.25rem;
  margin-bottom: 8px;
}
.post-excerpt.po9cwtk {
  color: var(--text-muted);
  margin-bottom: 16px;
}
.post-footer.po9cwtk {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.author.po9cwtk {
  display: flex;
  align-items: center;
  gap: 8px;
}
.author-avatar.po9cwtk {
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
.sidebar.po9cwtk {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.sidebar-section.po9cwtk {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 20px;
}
.section-title.po9cwtk {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.category-list.po9cwtk {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.category-item.po9cwtk {
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
.category-item.po9cwtk:hover {
  background: var(--bg);
}
.recent-posts.po9cwtk {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.recent-post.po9cwtk {
  cursor: pointer;
}
.recent-title.po9cwtk {
  font-size: 0.875rem;
  margin-bottom: 4px;
}
.recent-date.po9cwtk {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.post-view.po9cwtk {
  max-width: 800px;
  margin: 0 auto;
}
.post-header.po9cwtk {
  display: flex;
  justify-content: space-between;
  margin-bottom: 32px;
}
.back-btn.po9cwtk {
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
.post-actions.po9cwtk {
  display: flex;
  gap: 12px;
}
.post-content.po9cwtk {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 40px;
}
.author-info.po9cwtk {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
}
.author-details.po9cwtk {
  display: flex;
  flex-direction: column;
}
.author-role.po9cwtk {
  font-size: 0.875rem;
  color: var(--text-muted);
}
.post-body.po9cwtk {
  font-size: 1.125rem;
  line-height: 1.8;
}
.post-form.po9cwtk {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 40px;
}
.form-header.po9cwtk {
  margin-bottom: 32px;
}
.form-subtitle.po9cwtk {
  color: var(--text-muted);
}
.form.po9cwtk {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.form-row.po9cwtk {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.form-group.po9cwtk {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label.po9cwtk {
  font-weight: 500;
}
.form-input.po9cwtk, .form-textarea.po9cwtk, .form-select.po9cwtk {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
}
.form-input.po9cwtk:focus, .form-textarea.po9cwtk:focus {
  outline: none;
  border-color: var(--primary);
}
.form-textarea.po9cwtk {
  resize: vertical;
  min-height: 100px;
}
.form-textarea.large.po9cwtk {
  min-height: 200px;
}
.form-actions.po9cwtk {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.btn.po9cwtk {
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.btn-primary.po9cwtk {
  background: var(--primary);
  color: white;
}
.btn-primary.po9cwtk:hover {
  background: var(--primary-hover);
}
.btn-secondary.po9cwtk {
  background: var(--border);
  color: var(--text);
}
.btn-danger.po9cwtk {
  background: var(--danger);
  color: white;
}
.footer.po9cwtk {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
}
@media(max-width:900px) {
  .content-wrapper.po9cwtk {
    grid-template-columns: 1fr;
  }
  .sidebar.po9cwtk {
    order: -1;
  }
  .form-row.po9cwtk {
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