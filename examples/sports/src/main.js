/**
 * Pulse Sports News App
 * Demonstrates the HTTP Client system with reactive data fetching
 */

import { pulse, effect, mount, el } from '/runtime/index.js';
import { createHttp, useHttp, useHttpResource } from '/runtime/http.js';

// =============================================================================
// HTTP Client Configuration
// =============================================================================

// Create HTTP client instance with default configuration
export const api = createHttp({
  baseURL: 'https://api.example.com', // Would be real API in production
  timeout: 10000,
  headers: {
    'Accept': 'application/json'
  }
});

// Add request interceptor for logging
api.interceptors.request.use(config => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('[API Error]', error.message);
    throw error;
  }
);

// =============================================================================
// Mock Data (simulates API responses)
// =============================================================================

const MOCK_NEWS = {
  football: [
    { id: 1, title: 'Champions League Final Preview', category: 'football', image: '⚽', time: '2h ago', source: 'ESPN', summary: 'The biggest match in European football is upon us. Teams prepare for glory.' },
    { id: 2, title: 'Transfer Window: Top 10 Deals', category: 'football', image: '💰', time: '4h ago', source: 'Sky Sports', summary: 'This summer\'s biggest transfers that shaped the leagues.' },
    { id: 3, title: 'Premier League Title Race Heats Up', category: 'football', image: '🏆', time: '6h ago', source: 'BBC Sport', summary: 'Three teams within points of each other as season reaches climax.' },
    { id: 4, title: 'World Cup Qualifiers Results', category: 'football', image: '🌍', time: '8h ago', source: 'FIFA', summary: 'All the results from last night\'s qualifying matches.' },
  ],
  basketball: [
    { id: 5, title: 'NBA Finals Game 7 Thriller', category: 'basketball', image: '🏀', time: '1h ago', source: 'NBA.com', summary: 'Historic overtime finish decides the championship.' },
    { id: 6, title: 'Rookie of the Year Announced', category: 'basketball', image: '⭐', time: '3h ago', source: 'ESPN', summary: 'The standout first-year player takes home the award.' },
    { id: 7, title: 'All-Star Game Rosters Revealed', category: 'basketball', image: '✨', time: '5h ago', source: 'Bleacher Report', summary: 'The best players selected for the showcase event.' },
  ],
  tennis: [
    { id: 8, title: 'Wimbledon Draw Released', category: 'tennis', image: '🎾', time: '30m ago', source: 'ATP Tour', summary: 'Top seeds learn their paths to the title.' },
    { id: 9, title: 'New World No. 1 Crowned', category: 'tennis', image: '👑', time: '2h ago', source: 'WTA', summary: 'Rankings shake-up after thrilling tournament finale.' },
    { id: 10, title: 'Grand Slam Record Broken', category: 'tennis', image: '📊', time: '1d ago', source: 'Tennis Magazine', summary: 'A new milestone in tennis history achieved.' },
  ],
  f1: [
    { id: 11, title: 'Monaco GP: Qualifying Results', category: 'f1', image: '🏎️', time: '45m ago', source: 'F1.com', summary: 'Pole position secured in dramatic fashion.' },
    { id: 12, title: 'New Team Joins the Grid', category: 'f1', image: '🆕', time: '4h ago', source: 'Autosport', summary: 'Expansion brings new competition to Formula 1.' },
    { id: 13, title: 'Driver Championship Standings', category: 'f1', image: '📈', time: '1d ago', source: 'Motorsport', summary: 'The battle for the title intensifies.' },
  ],
  mma: [
    { id: 14, title: 'UFC Title Fight Announced', category: 'mma', image: '🥊', time: '1h ago', source: 'UFC', summary: 'The most anticipated matchup of the year is official.' },
    { id: 15, title: 'Fighter Rankings Updated', category: 'mma', image: '📋', time: '6h ago', source: 'MMA Fighting', summary: 'New contenders emerge after weekend results.' },
  ],
  cycling: [
    { id: 16, title: 'Tour de France Stage Results', category: 'cycling', image: '🚴', time: '3h ago', source: 'Cycling News', summary: 'Yellow jersey changes hands in mountain stage.' },
    { id: 17, title: 'Olympic Team Selection', category: 'cycling', image: '🥇', time: '1d ago', source: 'UCI', summary: 'National federations announce their representatives.' },
  ]
};

// Simulate API delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock fetch function (simulates real API)
async function mockFetch(category = 'all', search = '') {
  await delay(500 + Math.random() * 500); // Simulate network latency

  let news = [];

  if (category === 'all') {
    news = Object.values(MOCK_NEWS).flat();
  } else if (MOCK_NEWS[category]) {
    news = MOCK_NEWS[category];
  }

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    news = news.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      item.summary.toLowerCase().includes(searchLower)
    );
  }

  // Sort by recency (mock)
  news = news.sort(() => Math.random() - 0.5);

  return { articles: news, total: news.length };
}

// =============================================================================
// State
// =============================================================================

export const category = pulse('all');
export const search = pulse('');
export const darkMode = pulse(localStorage.getItem('sports-dark') === 'true');
export const favorites = pulse(JSON.parse(localStorage.getItem('sports-favorites') || '[]'));
export const showFavorites = pulse(false);

// =============================================================================
// Data Fetching with HTTP Client Patterns
// =============================================================================

// Reactive news fetching using useHttp pattern
export const newsState = pulse({ data: null, loading: true, error: null });

export async function fetchNews() {
  newsState.set({ data: null, loading: true, error: null });

  try {
    const result = await mockFetch(category.get(), search.get());
    newsState.set({ data: result, loading: false, error: null });
  } catch (err) {
    newsState.set({ data: null, loading: false, error: err.message });
  }
}

// Watch for category/search changes and refetch
effect(() => {
  const currentCategory = category.get();
  const currentSearch = search.get();
  fetchNews();
});

// =============================================================================
// Actions
// =============================================================================

export function setCategory(cat) {
  category.set(cat);
}

export function setSearch(query) {
  search.set(query);
}

export function toggleDarkMode() {
  darkMode.update(v => !v);
  localStorage.setItem('sports-dark', darkMode.peek());
  document.body.classList.toggle('dark', darkMode.peek());
}

export function toggleFavorite(articleId) {
  favorites.update(favs => {
    const newFavs = favs.includes(articleId)
      ? favs.filter(id => id !== articleId)
      : [...favs, articleId];
    localStorage.setItem('sports-favorites', JSON.stringify(newFavs));
    return newFavs;
  });
}

export function isFavorite(articleId) {
  return favorites.get().includes(articleId);
}

export function toggleShowFavorites() {
  showFavorites.update(v => !v);
}

export function getFilteredNews() {
  const state = newsState.get();
  if (!state.data) return [];

  let articles = state.data.articles;

  if (showFavorites.get()) {
    const favIds = favorites.get();
    articles = articles.filter(a => favIds.includes(a.id));
  }

  return articles;
}

// =============================================================================
// Categories Configuration
// =============================================================================

export const CATEGORIES = [
  { id: 'all', name: 'All Sports', icon: '🏅' },
  { id: 'football', name: 'Football', icon: '⚽' },
  { id: 'basketball', name: 'Basketball', icon: '🏀' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'f1', name: 'Formula 1', icon: '🏎️' },
  { id: 'mma', name: 'MMA', icon: '🥊' },
  { id: 'cycling', name: 'Cycling', icon: '🚴' }
];

// =============================================================================
// Components
// =============================================================================

function Header() {
  const header = el('header.header');

  const logo = el('.logo');
  logo.innerHTML = '<span class="logo-icon">⚽</span><span class="logo-text">Sports<span class="accent">News</span></span>';
  header.appendChild(logo);

  // Search
  const searchBox = el('.search-box');
  const searchInput = el('input.search-input[type=text][placeholder="Search news..."]');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => setSearch(e.target.value), 300);
  });
  searchBox.appendChild(searchInput);
  header.appendChild(searchBox);

  // Actions
  const actions = el('.header-actions');

  // Favorites toggle
  const favBtn = el('button.icon-btn');
  effect(() => {
    favBtn.innerHTML = showFavorites.get() ? '❤️' : '🤍';
    favBtn.title = showFavorites.get() ? 'Show all' : 'Show favorites';
    favBtn.className = `icon-btn ${showFavorites.get() ? 'active' : ''}`;
  });
  favBtn.addEventListener('click', toggleShowFavorites);
  actions.appendChild(favBtn);

  // Dark mode toggle
  const darkBtn = el('button.icon-btn');
  effect(() => {
    darkBtn.innerHTML = darkMode.get() ? '☀️' : '🌙';
    darkBtn.title = darkMode.get() ? 'Light mode' : 'Dark mode';
  });
  darkBtn.addEventListener('click', toggleDarkMode);
  actions.appendChild(darkBtn);

  header.appendChild(actions);

  return header;
}

function CategoryFilter() {
  const nav = el('nav.categories');

  for (const cat of CATEGORIES) {
    const btn = el('button.category-btn');
    btn.innerHTML = `${cat.icon} <span>${cat.name}</span>`;
    btn.dataset.category = cat.id;

    effect(() => {
      btn.className = `category-btn ${category.get() === cat.id ? 'active' : ''}`;
    });

    btn.addEventListener('click', () => setCategory(cat.id));
    nav.appendChild(btn);
  }

  return nav;
}

function NewsCard(article) {
  const card = el('.news-card');
  card.dataset.id = article.id;

  // Image placeholder
  const imageBox = el('.news-image');
  imageBox.innerHTML = `<span class="image-emoji">${article.image}</span>`;
  card.appendChild(imageBox);

  // Content
  const content = el('.news-content');

  const meta = el('.news-meta');
  meta.innerHTML = `<span class="source">${article.source}</span><span class="time">${article.time}</span>`;
  content.appendChild(meta);

  const title = el('h3.news-title', article.title);
  content.appendChild(title);

  const summary = el('p.news-summary', article.summary);
  content.appendChild(summary);

  // Actions
  const actions = el('.news-actions');

  const favBtn = el('button.card-btn.fav-btn');
  effect(() => {
    const isFav = favorites.get().includes(article.id);
    favBtn.innerHTML = isFav ? '❤️' : '🤍';
    favBtn.className = `card-btn fav-btn ${isFav ? 'active' : ''}`;
  });
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(article.id);
  });
  actions.appendChild(favBtn);

  const shareBtn = el('button.card-btn', '📤');
  shareBtn.title = 'Share';
  shareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: article.title, text: article.summary });
    } else {
      navigator.clipboard.writeText(article.title);
      alert('Title copied to clipboard!');
    }
  });
  actions.appendChild(shareBtn);

  content.appendChild(actions);
  card.appendChild(content);

  // Make card clickable
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => {
    alert(`Opening: ${article.title}\n\n${article.summary}`);
  });

  return card;
}

function NewsList() {
  const container = el('.news-container');

  effect(() => {
    container.innerHTML = '';
    const state = newsState.get();

    if (state.loading) {
      const loader = el('.loader');
      loader.innerHTML = '<div class="spinner"></div><p>Loading news...</p>';
      container.appendChild(loader);
      return;
    }

    if (state.error) {
      const error = el('.error-state');
      error.innerHTML = `<span class="error-icon">⚠️</span><p>${state.error}</p><button class="retry-btn">Retry</button>`;
      error.querySelector('.retry-btn').addEventListener('click', fetchNews);
      container.appendChild(error);
      return;
    }

    const articles = getFilteredNews();

    if (articles.length === 0) {
      const empty = el('.empty-state');
      const isShowingFavorites = showFavorites.get();
      empty.innerHTML = `
        <span class="empty-icon">${isShowingFavorites ? '💔' : '🔍'}</span>
        <p>${isShowingFavorites ? 'No favorites yet' : 'No news found'}</p>
        <span class="empty-hint">${isShowingFavorites ? 'Heart articles to save them here' : 'Try a different category or search'}</span>
      `;
      container.appendChild(empty);
      return;
    }

    // Stats
    const stats = el('.news-stats');
    stats.textContent = `${articles.length} article${articles.length !== 1 ? 's' : ''}`;
    container.appendChild(stats);

    // News grid
    const grid = el('.news-grid');
    for (const article of articles) {
      grid.appendChild(NewsCard(article));
    }
    container.appendChild(grid);
  });

  return container;
}

function App() {
  const app = el('.app');

  app.appendChild(Header());
  app.appendChild(CategoryFilter());
  app.appendChild(NewsList());

  // Footer
  const footer = el('footer.footer');
  footer.innerHTML = 'Built with ✨ <strong>Pulse Framework</strong> • Using Zero-Dependency HTTP Client';
  app.appendChild(footer);

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --bg: #f0f2f5;
  --card-bg: #ffffff;
  --text: #1a1a2e;
  --text-muted: #6b7280;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --accent: #ef4444;
  --border: #e5e7eb;
  --shadow: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.1);
  --radius: 12px;
}

body.dark {
  --bg: #0f172a;
  --card-bg: #1e293b;
  --text: #f1f5f9;
  --text-muted: #94a3b8;
  --border: #334155;
  --shadow: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 25px rgba(0,0,0,0.4);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  transition: background 0.3s, color 0.3s;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--card-bg);
  border-radius: var(--radius);
  margin-bottom: 20px;
  box-shadow: var(--shadow);
  gap: 16px;
  flex-wrap: wrap;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.5em;
  font-weight: 700;
}

.logo-icon {
  font-size: 1.2em;
}

.accent {
  color: var(--accent);
}

.search-box {
  flex: 1;
  max-width: 400px;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 2px solid var(--border);
  border-radius: 25px;
  background: var(--bg);
  color: var(--text);
  font-size: 0.95em;
  transition: border-color 0.2s, background 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.search-input::placeholder {
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: var(--bg);
  border-radius: 50%;
  font-size: 1.2em;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.icon-btn:hover {
  transform: scale(1.1);
}

.icon-btn.active {
  background: var(--primary);
}

/* Categories */
.categories {
  display: flex;
  gap: 8px;
  padding: 16px 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.categories::-webkit-scrollbar {
  display: none;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 2px solid var(--border);
  background: var(--card-bg);
  color: var(--text);
  border-radius: 25px;
  font-size: 0.9em;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.category-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.category-btn span {
  font-weight: 500;
}

/* News Container */
.news-container {
  min-height: 400px;
}

.news-stats {
  color: var(--text-muted);
  font-size: 0.9em;
  margin-bottom: 16px;
}

.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* News Card */
.news-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.2s, box-shadow 0.2s;
}

.news-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.news-image {
  height: 120px;
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-emoji {
  font-size: 3em;
}

.news-content {
  padding: 16px;
}

.news-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.source {
  font-weight: 600;
  color: var(--primary);
}

.news-title {
  font-size: 1.1em;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.3;
}

.news-summary {
  font-size: 0.9em;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 12px;
}

.news-actions {
  display: flex;
  gap: 8px;
}

.card-btn {
  padding: 6px 12px;
  border: none;
  background: var(--bg);
  border-radius: 20px;
  font-size: 0.9em;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.card-btn:hover {
  transform: scale(1.1);
}

.fav-btn.active {
  background: #fee2e2;
}

body.dark .fav-btn.active {
  background: #7f1d1d;
}

/* Loading */
.loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: var(--text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Empty & Error States */
.empty-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  text-align: center;
}

.empty-icon, .error-icon {
  font-size: 3em;
  margin-bottom: 16px;
}

.empty-hint {
  color: var(--text-muted);
  font-size: 0.9em;
  margin-top: 8px;
}

.retry-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: var(--primary-hover);
}

/* Footer */
.footer {
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
  font-size: 0.9em;
}

.footer strong {
  color: var(--primary);
}

/* Mobile */
@media (max-width: 640px) {
  .header {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
    order: 3;
  }

  .header-actions {
    position: absolute;
    right: 16px;
    top: 16px;
  }

  .news-grid {
    grid-template-columns: 1fr;
  }
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Initialize
// =============================================================================

// Apply initial dark mode
if (darkMode.get()) {
  document.body.classList.add('dark');
}

// Mount app
mount('#app', App());

console.log('⚽ Sports News App loaded with Pulse HTTP Client!');
