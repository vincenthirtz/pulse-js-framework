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
    el('.pz9u3kf.blog-app',
      el('header.pz9u3kf.header',
        el('nav.pz9u3kf.nav',
on(          el('.pz9u3kf.logo',
            el('span.pz9u3kf.logo-icon',
              "📰"),
            el('span.pz9u3kf',
              "Pulse Blog")), 'click', () => { showList(); }),
          el('.pz9u3kf.search-box',
on(            el('input.pz9u3kf.search-input[type=text][placeholder="Search posts..."]'), 'input', () => { handleSearch(event); })),
          el('.pz9u3kf.nav-actions',
on(            el('button.pz9u3kf.btn.btn-primary',
              "+ New Post"), 'click', () => { showCreateForm(); }),
on(            el('button.pz9u3kf.dark-toggle',
              text(() => `${darkMode.get() ? '☀️' : '🌙'}`)), 'click', () => { toggleDarkMode(); })))),
      el('main.pz9u3kf.main-content',
        when(
          () => (currentView.get() === "list"),
          () => (
          el('.pz9u3kf.content-wrapper',
            el('.pz9u3kf.post-list',
              list(
                () => getFilteredPosts(),
                (post, _index) => (
on(                el('.pz9u3kf.post-card',
                  el('.pz9u3kf.post-meta',
                    el('span.pz9u3kf.category',
                      text(() => `${post.category}`)),
                    el('span.pz9u3kf.separator',
                      "•"),
                    el('span.pz9u3kf.read-time',
                      text(() => `${post.readTime}" min read"`))),
                  el('h3.pz9u3kf.post-title',
                    text(() => `${post.title}`)),
                  el('p.pz9u3kf.post-excerpt',
                    text(() => `${post.excerpt}`)),
                  el('.pz9u3kf.post-footer',
                    el('.pz9u3kf.author',
                      el('span.pz9u3kf.author-avatar',
                        text(() => `${post.author.charAt(0)}`)),
                      el('span.pz9u3kf.author-name',
                        text(() => `${post.author}`))),
                    el('span.pz9u3kf.date',
                      text(() => `${post.publishedAt}`)))), 'click', () => { viewPost(post.id); })
                )
              )),
            el('aside.pz9u3kf.sidebar',
              el('.pz9u3kf.sidebar-section',
                el('h3.pz9u3kf.section-title',
                  "Categories"),
                el('.pz9u3kf.category-list',
on(                  el('button.pz9u3kf.category-item',
                    el('span.pz9u3kf.category-name',
                      "All Posts"),
                    el('span.pz9u3kf.category-count',
                      text(() => `${posts.get()?.length}`))), 'click', () => { clearFilter(); }),
                  list(
                    () => getCategories(),
                    (cat, _index) => (
on(                    el('button.pz9u3kf.category-item',
                      el('span.pz9u3kf.category-name',
                        text(() => `${cat}`)),
                      el('span.pz9u3kf.category-count',
                        text(() => `${posts.get()?.filter(p => p.category === cat)?.length}`))), 'click', () => { filterByCategory(cat); })
                    )
                  ))),
              el('.pz9u3kf.sidebar-section',
                el('h3.pz9u3kf.section-title',
                  "Recent Posts"),
                el('.pz9u3kf.recent-posts',
                  list(
                    () => posts.get().slice(0, 3),
                    (post, _index) => (
on(                    el('.pz9u3kf.recent-post',
                      el('h4.pz9u3kf.recent-title',
                        text(() => `${post.title}`)),
                      el('span.pz9u3kf.recent-date',
                        text(() => `${post.publishedAt}`))), 'click', () => { viewPost(post.id); })
                    )
                  )))))
          )
        ),
        when(
          () => (currentView.get() === "view"),
          () => (
          el('.pz9u3kf.post-view',
            el('.pz9u3kf.post-header',
on(              el('button.pz9u3kf.back-btn',
                el('span.pz9u3kf.arrow',
                  "←"),
                el('span.pz9u3kf',
                  "Back to posts")), 'click', () => { showList(); }),
              el('.pz9u3kf.post-actions',
on(                el('button.pz9u3kf.btn.btn-secondary',
                  "Edit"), 'click', () => { showEditForm(selectedPostId.get()); }),
on(                el('button.pz9u3kf.btn.btn-danger',
                  "Delete"), 'click', () => { deletePost(selectedPostId.get()); }))),
            when(
              () => getSelectedPost(),
              () => (
              el('article.pz9u3kf.post-content',
                el('.pz9u3kf.post-meta',
                  el('span.pz9u3kf.category',
                    text(() => `${getSelectedPost()?.category}`)),
                  el('span.pz9u3kf.separator',
                    "|"),
                  el('span.pz9u3kf.read-time',
                    text(() => `${getSelectedPost()?.readTime}" min read"`)),
                  el('span.pz9u3kf.separator',
                    "|"),
                  el('span.pz9u3kf.date',
                    text(() => `${getSelectedPost()?.publishedAt}`))),
                el('h1.pz9u3kf.post-title',
                  text(() => `${getSelectedPost()?.title}`)),
                el('.pz9u3kf.author-info',
                  el('.pz9u3kf.author-avatar',
                    text(() => `${getSelectedPost()?.author.charAt(0)}`)),
                  el('.pz9u3kf.author-details',
                    el('span.pz9u3kf.author-name',
                      text(() => `${getSelectedPost()?.author}`)),
                    el('span.pz9u3kf.author-role',
                      "Author"))),
                el('.pz9u3kf.post-body',
                  text(() => `${getSelectedPost()?.content}`)))
              )
            ))
          )
        ),
        when(
          () => ((currentView.get() === "create") || (currentView.get() === "edit")),
          () => (
          el('.pz9u3kf.post-form',
            el('.pz9u3kf.form-header',
              el('h2.pz9u3kf',
                text(() => `${currentView.get() === 'edit' ? 'Edit Post' : 'Create New Post'}`)),
              el('p.pz9u3kf.form-subtitle',
                text(() => `${currentView.get() === 'edit' ? 'Update your blog post' : 'Share your thoughts'}`))),
on(            el('form.pz9u3kf.form',
              el('.pz9u3kf.form-group',
                el('label.pz9u3kf.form-label',
                  "Title"),
                el('input.pz9u3kf#form-title.form-input[type=text][placeholder="Enter post title..."]')),
              el('.pz9u3kf.form-group',
                el('label.pz9u3kf.form-label',
                  "Excerpt"),
                el('textarea.pz9u3kf#form-excerpt.form-textarea[placeholder="Brief summary..."][rows=2]')),
              el('.pz9u3kf.form-group',
                el('label.pz9u3kf.form-label',
                  "Content"),
                el('textarea.pz9u3kf#form-content.form-textarea.large[placeholder="Write your post..."][rows=8]')),
              el('.pz9u3kf.form-row',
                el('.pz9u3kf.form-group',
                  el('label.pz9u3kf.form-label',
                    "Author"),
                  el('input.pz9u3kf#form-author.form-input[type=text][placeholder="Your name"]')),
                el('.pz9u3kf.form-group',
                  el('label.pz9u3kf.form-label',
                    "Category"),
                  el('select.pz9u3kf#form-category.form-select',
                    el('option[value="Tutorial"].pz9u3kf',
                      "Tutorial"),
                    el('option[value="Deep Dive"].pz9u3kf',
                      "Deep Dive"),
                    el('option[value="Mobile"].pz9u3kf',
                      "Mobile"),
                    el('option[value="News"].pz9u3kf',
                      "News")))),
              el('.pz9u3kf.form-actions',
on(                el('button.pz9u3kf.btn.btn-secondary[type=button]',
                  "Cancel"), 'click', () => { cancelForm(); }),
                el('button.pz9u3kf.btn.btn-primary[type=submit]',
                  text(() => `${currentView.get() === 'edit' ? 'Update Post' : 'Publish Post'}`)))), 'submit', () => { handleSubmit(event); }))
          )
        )),
      el('footer.pz9u3kf.footer',
        el('p.pz9u3kf',
          "Built with Pulse Framework")))
  );
}

// Styles
const SCOPE_ID = 'pz9u3kf';
const styles = `
:root.pz9u3kf {
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
body.dark.pz9u3kf {
  --bg: #0f172a;
  --card-bg: #1e293b;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
}
*.pz9u3kf {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body.pz9u3kf {
  font-family: system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}
.blog-app.pz9u3kf {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.header.pz9u3kf {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav.pz9u3kf {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
}
.logo.pz9u3kf {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25rem;
  font-weight: 700;
  cursor: pointer;
}
.search-box.pz9u3kf {
  flex: 1;
  max-width: 400px;
}
.search-input.pz9u3kf {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
}
.nav-actions.pz9u3kf {
  display: flex;
  gap: 12px;
}
.dark-toggle.pz9u3kf {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 8px;
}
.main-content.pz9u3kf {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}
.content-wrapper.pz9u3kf {
  display: grid;
  grid-template-columns: 1 fr 300px;
  gap: 32px;
}
.post-list.pz9u3kf {
  display: grid;
  gap: 24px;
}
.post-card.pz9u3kf {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.2s;
}
.post-card.pz9u3kf:hover {
  transform: translateY (-2px);
}
.post-meta.pz9u3kf {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.75rem;
}
.category.pz9u3kf {
  padding: 4px 10px;
  background: var(--primary);
  color: white;
  border-radius: 20px;
  font-weight: 600;
}
.post-title.pz9u3kf {
  font-size: 1.25rem;
  margin-bottom: 8px;
}
.post-excerpt.pz9u3kf {
  color: var(--text-muted);
  margin-bottom: 16px;
}
.post-footer.pz9u3kf {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.author.pz9u3kf {
  display: flex;
  align-items: center;
  gap: 8px;
}
.author-avatar.pz9u3kf {
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
.sidebar.pz9u3kf {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.sidebar-section.pz9u3kf {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 20px;
}
.section-title.pz9u3kf {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.category-list.pz9u3kf {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.category-item.pz9u3kf {
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
.category-item.pz9u3kf:hover {
  background: var(--bg);
}
.recent-posts.pz9u3kf {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.recent-post.pz9u3kf {
  cursor: pointer;
}
.recent-title.pz9u3kf {
  font-size: 0.875rem;
  margin-bottom: 4px;
}
.recent-date.pz9u3kf {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.post-view.pz9u3kf {
  max-width: 800px;
  margin: 0 auto;
}
.post-header.pz9u3kf {
  display: flex;
  justify-content: space-between;
  margin-bottom: 32px;
}
.back-btn.pz9u3kf {
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
.post-actions.pz9u3kf {
  display: flex;
  gap: 12px;
}
.post-content.pz9u3kf {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 40px;
}
.author-info.pz9u3kf {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
}
.author-details.pz9u3kf {
  display: flex;
  flex-direction: column;
}
.author-role.pz9u3kf {
  font-size: 0.875rem;
  color: var(--text-muted);
}
.post-body.pz9u3kf {
  font-size: 1.125rem;
  line-height: 1.8;
}
.post-form.pz9u3kf {
  max-width: 800px;
  margin: 0 auto;
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 40px;
}
.form-header.pz9u3kf {
  margin-bottom: 32px;
}
.form-subtitle.pz9u3kf {
  color: var(--text-muted);
}
.form.pz9u3kf {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.form-row.pz9u3kf {
  display: grid;
  grid-template-columns: 1 fr 1 fr;
  gap: 24px;
}
.form-group.pz9u3kf {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-label.pz9u3kf {
  font-weight: 500;
}
.form-input.pz9u3kf, .form-textarea.pz9u3kf, .form-select.pz9u3kf {
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 1rem;
}
.form-input.pz9u3kf:focus, .form-textarea.pz9u3kf:focus {
  outline: none;
  border-color: var(--primary);
}
.form-textarea.pz9u3kf {
  resize: vertical;
  min-height: 100px;
}
.form-textarea.large.pz9u3kf {
  min-height: 200px;
}
.form-actions.pz9u3kf {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
.btn.pz9u3kf {
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.btn-primary.pz9u3kf {
  background: var(--primary);
  color: white;
}
.btn-primary.pz9u3kf:hover {
  background: var(--primary-hover);
}
.btn-secondary.pz9u3kf {
  background: var(--border);
  color: var(--text);
}
.btn-danger.pz9u3kf {
  background: var(--danger);
  color: white;
}
.footer.pz9u3kf {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
}
@media(max-width.pz9u3kf:900px) {
  .content-wrapper.pz9u3kf {
    grid-template-columns: 1 fr;
  }
  .sidebar.pz9u3kf {
    order: -1;
  }
  .form-row.pz9u3kf {
    grid-template-columns: 1 fr;
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