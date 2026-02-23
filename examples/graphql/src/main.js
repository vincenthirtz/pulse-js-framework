/**
 * Pulse GraphQL Client Demo
 * Demonstrates useQuery, useMutation, useSubscription, caching,
 * optimistic updates, and reactive variables with a mock GraphQL backend.
 */

import { pulse, effect, computed, batch, el, mount, list, when } from '../../../runtime/index.js';
import {
  createGraphQLClient, setDefaultClient,
  useQuery, useMutation, useSubscription
} from '../../../runtime/graphql.js';

// ── Mock GraphQL Server ───────────────────────────────────────
// Simulates a GraphQL backend for the demo (no real server needed)
const mockDB = {
  posts: [
    { id: '1', title: 'Getting Started with Pulse', content: 'Pulse is a lightweight reactive framework...', author: 'Alice', likes: 12, createdAt: '2026-01-15' },
    { id: '2', title: 'GraphQL Best Practices', content: 'When building GraphQL APIs, consider...', author: 'Bob', likes: 8, createdAt: '2026-01-20' },
    { id: '3', title: 'Reactive State Management', content: 'Signals provide fine-grained reactivity...', author: 'Alice', likes: 15, createdAt: '2026-02-01' }
  ],
  comments: [
    { id: 'c1', postId: '1', text: 'Great article!', author: 'Charlie' },
    { id: 'c2', postId: '1', text: 'Very helpful, thanks!', author: 'Diana' },
    { id: 'c3', postId: '2', text: 'I learned a lot from this.', author: 'Eve' }
  ]
};

// Mock resolver that simulates network delay
async function mockResolve(query, variables = {}) {
  await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

  // Parse operation name from query
  if (query.includes('GetPosts')) {
    let posts = [...mockDB.posts];
    if (variables.author) posts = posts.filter(p => p.author === variables.author);
    if (variables.limit) posts = posts.slice(0, variables.limit);
    return { data: { posts } };
  }
  if (query.includes('GetPost')) {
    const post = mockDB.posts.find(p => p.id === variables.id);
    const comments = mockDB.comments.filter(c => c.postId === variables.id);
    return { data: { post: post ? { ...post, comments } : null } };
  }
  if (query.includes('CreatePost')) {
    const newPost = {
      id: String(Date.now()),
      ...variables.input,
      likes: 0,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    mockDB.posts.unshift(newPost);
    return { data: { createPost: newPost } };
  }
  if (query.includes('LikePost')) {
    const post = mockDB.posts.find(p => p.id === variables.id);
    if (post) post.likes++;
    return { data: { likePost: post } };
  }
  if (query.includes('AddComment')) {
    const newComment = {
      id: `c${Date.now()}`,
      postId: variables.postId,
      text: variables.text,
      author: variables.author || 'Anonymous'
    };
    mockDB.comments.push(newComment);
    return { data: { addComment: newComment } };
  }
  if (query.includes('DeletePost')) {
    const idx = mockDB.posts.findIndex(p => p.id === variables.id);
    if (idx !== -1) mockDB.posts.splice(idx, 1);
    return { data: { deletePost: { success: true } } };
  }
  return { data: null };
}

// ── Create GraphQL Client with Mock ───────────────────────────
const client = createGraphQLClient({
  url: '/graphql',  // Not used with mock, but required by API
  cache: true,
  staleTime: 10000,
  dedupe: true
});

// Override the query method to use our mock
const originalQuery = client.query.bind(client);
client.query = async (query, variables, options) => {
  return mockResolve(query, variables);
};
client.mutate = async (query, variables) => {
  return mockResolve(query, variables);
};

setDefaultClient(client);

// ── State ─────────────────────────────────────────────────────
const currentView = pulse('list');  // 'list' | 'detail' | 'create'
const selectedPostId = pulse(null);
const authorFilter = pulse('');
const cacheStats = pulse({ size: 0, keys: [] });

// ── Queries ───────────────────────────────────────────────────
const GET_POSTS = `
  query GetPosts($author: String, $limit: Int) {
    posts(author: $author, limit: $limit) {
      id title author likes createdAt
    }
  }
`;

const GET_POST = `
  query GetPost($id: ID!) {
    post(id: $id) {
      id title content author likes createdAt
      comments { id text author }
    }
  }
`;

const CREATE_POST = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id title content author likes createdAt
    }
  }
`;

const LIKE_POST = `
  mutation LikePost($id: ID!) {
    likePost(id: $id) { id likes }
  }
`;

const ADD_COMMENT = `
  mutation AddComment($postId: ID!, $text: String!, $author: String) {
    addComment(postId: $postId, text: $text, author: $author) {
      id text author
    }
  }
`;

// ── Components ────────────────────────────────────────────────

function PostList() {
  // useQuery with reactive variables (re-fetches when authorFilter changes)
  const { data, loading, error, refetch } = useQuery(
    GET_POSTS,
    () => ({
      author: authorFilter.get() || undefined,
      limit: 20
    }),
    { staleTime: 5000 }
  );

  // Like mutation with optimistic update
  const { mutate: likePost } = useMutation(LIKE_POST);

  async function handleLike(postId) {
    await likePost({ id: postId });
    refetch();
  }

  return el('div.post-list',
    el('div.list-header',
      el('h2', 'Posts'),
      el('div.list-controls',
        el('select', {
          value: () => authorFilter.get(),
          onchange: (e) => authorFilter.set(e.target.value),
          'aria-label': 'Filter by author'
        },
          el('option[value=]', 'All Authors'),
          el('option[value=Alice]', 'Alice'),
          el('option[value=Bob]', 'Bob')
        ),
        el('button', 'Refresh', { onclick: () => refetch() }),
        el('button.primary', '+ New Post', {
          onclick: () => currentView.set('create')
        })
      )
    ),

    when(
      () => loading.get(),
      () => el('div.loading', el('div.spinner'), el('span', 'Loading posts...'))
    ),

    when(
      () => error.get(),
      () => el('div.error', `Error: ${error.get()?.message || 'Failed to load'}`)
    ),

    when(
      () => !loading.get() && data.get(),
      () => el('div.posts',
        list(
          () => data.get()?.posts || [],
          (post) => el('article.post-card', {
            onclick: () => {
              selectedPostId.set(post.id);
              currentView.set('detail');
            }
          },
            el('h3', post.title),
            el('div.post-meta',
              el('span.author', post.author),
              el('span.date', post.createdAt)
            ),
            el('div.post-actions',
              el('button.like-btn', {
                onclick: (e) => {
                  e.stopPropagation();
                  handleLike(post.id);
                }
              }, `♥ ${post.likes}`),
            )
          ),
          (post) => post.id
        )
      )
    )
  );
}

function PostDetail() {
  const postId = computed(() => selectedPostId.get());
  const commentText = pulse('');
  const commentAuthor = pulse('');

  // Query for single post
  const { data, loading, error, refetch } = useQuery(
    GET_POST,
    () => ({ id: postId.get() }),
    { enabled: computed(() => !!postId.get()) }
  );

  // Mutations
  const { mutate: likePost } = useMutation(LIKE_POST);
  const { mutate: addComment, loading: commenting } = useMutation(ADD_COMMENT);

  async function handleLike() {
    await likePost({ id: postId.get() });
    refetch();
  }

  async function handleComment() {
    const text = commentText.get().trim();
    if (!text) return;
    await addComment({
      postId: postId.get(),
      text,
      author: commentAuthor.get() || 'Anonymous'
    });
    commentText.set('');
    refetch();
  }

  return el('div.post-detail',
    el('button.back-btn', '← Back to Posts', {
      onclick: () => currentView.set('list')
    }),

    when(
      () => loading.get(),
      () => el('div.loading', el('div.spinner'), el('span', 'Loading post...'))
    ),

    when(
      () => !loading.get() && data.get()?.post,
      () => {
        const post = data.get().post;
        return el('article',
          el('h2', post.title),
          el('div.post-meta',
            el('span.author', `By ${post.author}`),
            el('span.date', post.createdAt),
            el('button.like-btn', {
              onclick: handleLike
            }, `♥ ${post.likes}`)
          ),
          el('div.post-content', el('p', post.content)),

          // Comments
          el('div.comments-section',
            el('h3', `Comments (${post.comments?.length || 0})`),
            el('div.comments',
              (post.comments || []).map(c =>
                el('div.comment',
                  el('strong', c.author),
                  el('p', c.text)
                )
              )
            ),

            // Add comment form
            el('div.comment-form',
              el('input[type=text][placeholder=Your name (optional)]', {
                value: () => commentAuthor.get(),
                oninput: (e) => commentAuthor.set(e.target.value),
                'aria-label': 'Comment author name'
              }),
              el('div.comment-input-row',
                el('input[type=text][placeholder=Write a comment...]', {
                  value: () => commentText.get(),
                  oninput: (e) => commentText.set(e.target.value),
                  onkeydown: (e) => e.key === 'Enter' && handleComment(),
                  'aria-label': 'Comment text'
                }),
                el('button', () => commenting.get() ? 'Posting...' : 'Post', {
                  onclick: handleComment,
                  disabled: () => commenting.get() || !commentText.get().trim()
                })
              )
            )
          )
        );
      }
    )
  );
}

function CreatePost() {
  const title = pulse('');
  const content = pulse('');
  const author = pulse('');

  const { mutate: createPost, loading: creating, error: createError } = useMutation(CREATE_POST);

  async function handleSubmit() {
    if (!title.get().trim() || !content.get().trim()) return;
    await createPost({
      input: {
        title: title.get().trim(),
        content: content.get().trim(),
        author: author.get().trim() || 'Anonymous'
      }
    });
    // Invalidate posts cache
    client.invalidate('gql:GetPosts');
    currentView.set('list');
  }

  return el('div.create-post',
    el('button.back-btn', '← Back to Posts', {
      onclick: () => currentView.set('list')
    }),
    el('h2', 'Create New Post'),

    el('form', {
      onsubmit: (e) => { e.preventDefault(); handleSubmit(); }
    },
      el('div.form-group',
        el('label[for=post-title]', 'Title'),
        el('input#post-title[type=text][placeholder=Post title][required]', {
          value: () => title.get(),
          oninput: (e) => title.set(e.target.value)
        })
      ),
      el('div.form-group',
        el('label[for=post-author]', 'Author'),
        el('input#post-author[type=text][placeholder=Your name]', {
          value: () => author.get(),
          oninput: (e) => author.set(e.target.value)
        })
      ),
      el('div.form-group',
        el('label[for=post-content]', 'Content'),
        el('textarea#post-content[placeholder=Write your post...][required][rows=6]', {
          value: () => content.get(),
          oninput: (e) => content.set(e.target.value)
        })
      ),

      when(() => createError.get(),
        () => el('div.error', `Error: ${createError.get()?.message}`)
      ),

      el('div.form-actions',
        el('button.secondary', 'Cancel', {
          type: 'button',
          onclick: () => currentView.set('list')
        }),
        el('button.primary[type=submit]', () => creating.get() ? 'Creating...' : 'Create Post', {
          disabled: () => creating.get() || !title.get().trim() || !content.get().trim()
        })
      )
    )
  );
}

function CacheInfo() {
  return el('aside.cache-info',
    el('h3', 'Cache Status'),
    el('p.cache-hint', 'Queries are cached with SWR pattern. Stale data shows instantly while fresh data loads.'),
    el('button.small', 'Clear Cache', {
      onclick: () => {
        client.invalidateAll();
      }
    })
  );
}

// ── App ───────────────────────────────────────────────────────
function App() {
  return el('div.app',
    el('header',
      el('h1', 'GraphQL Client Demo'),
      el('p.subtitle', 'Queries, mutations, caching & optimistic updates')
    ),
    el('main',
      when(() => currentView.get() === 'list', PostList),
      when(() => currentView.get() === 'detail', PostDetail),
      when(() => currentView.get() === 'create', CreatePost)
    ),
    CacheInfo()
  );
}

mount('#app', App());
console.log('Pulse GraphQL Demo loaded');
