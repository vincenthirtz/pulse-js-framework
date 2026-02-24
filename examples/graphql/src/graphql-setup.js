/**
 * GraphQL Setup - Mock DB, resolver, client, and query constants
 */

import { pulse } from '../../../runtime/index.js';
import { createGraphQLClient, setDefaultClient } from '../../../runtime/graphql.js';

// ── Shared State ─────────────────────────────────────────────
export const currentView = pulse('list');
export const selectedPostId = pulse(null);

// ── Mock GraphQL Server ──────────────────────────────────────
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

async function mockResolve(query, variables = {}) {
  await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

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
    const newPost = { id: String(Date.now()), ...variables.input, likes: 0, createdAt: new Date().toISOString().slice(0, 10) };
    mockDB.posts.unshift(newPost);
    return { data: { createPost: newPost } };
  }
  if (query.includes('LikePost')) {
    const post = mockDB.posts.find(p => p.id === variables.id);
    if (post) post.likes++;
    return { data: { likePost: post } };
  }
  if (query.includes('AddComment')) {
    const newComment = { id: `c${Date.now()}`, postId: variables.postId, text: variables.text, author: variables.author || 'Anonymous' };
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

// ── GraphQL Client ───────────────────────────────────────────
export const client = createGraphQLClient({
  url: '/graphql',
  cache: true,
  staleTime: 10000,
  dedupe: true
});

client.query = async (query, variables) => mockResolve(query, variables);
client.mutate = async (query, variables) => mockResolve(query, variables);
setDefaultClient(client);

// ── Query Constants ──────────────────────────────────────────
export const GET_POSTS = `query GetPosts($author: String, $limit: Int) { posts(author: $author, limit: $limit) { id title author likes createdAt } }`;
export const GET_POST = `query GetPost($id: ID!) { post(id: $id) { id title content author likes createdAt comments { id text author } } }`;
export const CREATE_POST = `mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { id title content author likes createdAt } }`;
export const LIKE_POST = `mutation LikePost($id: ID!) { likePost(id: $id) { id likes } }`;
export const ADD_COMMENT = `mutation AddComment($postId: ID!, $text: String!, $author: String) { addComment(postId: $postId, text: $text, author: $author) { id text author } }`;
