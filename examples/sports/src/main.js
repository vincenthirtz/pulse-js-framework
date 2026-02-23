/**
 * Pulse Sports News App
 * Demonstrates the HTTP Client system with reactive data fetching
 * News sources: L'Équipe & Sports.fr style
 */

import { pulse, effect, mount, el, on, text } from '/runtime/index.js';
import { createHttp } from '/runtime/http.js';

// =============================================================================
// HTTP Client Configuration
// =============================================================================

// Create HTTP client for RSS/API fetching
export const api = createHttp({
  timeout: 10000,
  headers: {
    'Accept': 'application/json, application/xml, text/xml'
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
// News Data - French Sports Sources (L'Équipe & Sports.fr style)
// =============================================================================

const NEWS_DATA = {
  football: [
    { id: 1, title: 'PSG : Dembélé buteur, Paris s\'impose face à Monaco', category: 'football', image: '⚽', time: 'Il y a 1h', source: "L'Équipe", summary: 'Le Paris Saint-Germain a dominé l\'AS Monaco (3-1) grâce à un doublé de Dembélé et un but de Barcola.', url: 'https://www.lequipe.fr' },
    { id: 2, title: 'Mercato : L\'OM proche de boucler un gros coup', category: 'football', image: '💰', time: 'Il y a 2h', source: 'Sports.fr', summary: 'L\'Olympique de Marseille serait sur le point de finaliser le transfert d\'un international français.', url: 'https://www.sports.fr' },
    { id: 3, title: 'Ligue 1 : Le classement après la 25e journée', category: 'football', image: '🏆', time: 'Il y a 3h', source: "L'Équipe", summary: 'Le PSG creuse l\'écart en tête, Monaco et Lille se disputent la deuxième place.', url: 'https://www.lequipe.fr' },
    { id: 4, title: 'Équipe de France : Deschamps dévoile sa liste', category: 'football', image: '🇫🇷', time: 'Il y a 4h', source: 'Sports.fr', summary: 'Le sélectionneur a convoqué 23 joueurs pour les prochains matchs de qualification.', url: 'https://www.sports.fr' },
    { id: 5, title: 'Real Madrid : Mbappé encore décisif en Liga', category: 'football', image: '⭐', time: 'Il y a 5h', source: "L'Équipe", summary: 'Kylian Mbappé a inscrit son 15e but de la saison lors de la victoire face à Séville.', url: 'https://www.lequipe.fr' },
  ],
  rugby: [
    { id: 6, title: 'XV de France : Victoire historique face aux All Blacks', category: 'rugby', image: '🏉', time: 'Il y a 30min', source: "L'Équipe", summary: 'Les Bleus s\'imposent 28-23 à Auckland, une première depuis 15 ans.', url: 'https://www.lequipe.fr' },
    { id: 7, title: 'Top 14 : Toulouse confirme sa domination', category: 'rugby', image: '🔴', time: 'Il y a 2h', source: 'Sports.fr', summary: 'Le Stade Toulousain s\'impose largement face à La Rochelle et conforte sa place de leader.', url: 'https://www.sports.fr' },
    { id: 8, title: 'Tournoi des 6 Nations : Le calendrier dévoilé', category: 'rugby', image: '📅', time: 'Il y a 4h', source: "L'Équipe", summary: 'La France débutera à domicile face à l\'Irlande le 1er février.', url: 'https://www.lequipe.fr' },
  ],
  tennis: [
    { id: 9, title: 'Roland-Garros : Le tirage au sort effectué', category: 'tennis', image: '🎾', time: 'Il y a 1h', source: "L'Équipe", summary: 'Les Français héritent de tableaux abordables pour le premier tour.', url: 'https://www.lequipe.fr' },
    { id: 10, title: 'ATP : Djokovic de retour au sommet', category: 'tennis', image: '👑', time: 'Il y a 3h', source: 'Sports.fr', summary: 'Le Serbe récupère la place de numéro 1 mondial après sa victoire à Indian Wells.', url: 'https://www.sports.fr' },
    { id: 11, title: 'WTA : Garcia en demi-finale à Miami', category: 'tennis', image: '🇫🇷', time: 'Il y a 5h', source: "L'Équipe", summary: 'Caroline Garcia poursuit son excellent parcours et affrontera Swiatek.', url: 'https://www.lequipe.fr' },
  ],
  f1: [
    { id: 12, title: 'GP de Monaco : Verstappen en pole position', category: 'f1', image: '🏎️', time: 'Il y a 45min', source: "L'Équipe", summary: 'Le triple champion du monde s\'élancera en tête demain dans les rues de la Principauté.', url: 'https://www.lequipe.fr' },
    { id: 13, title: 'Alpine : Gasly prolonge jusqu\'en 2027', category: 'f1', image: '🇫🇷', time: 'Il y a 2h', source: 'Sports.fr', summary: 'Le pilote français s\'engage sur le long terme avec l\'écurie tricolore.', url: 'https://www.sports.fr' },
    { id: 14, title: 'Classement F1 : Verstappen creuse l\'écart', category: 'f1', image: '📊', time: 'Il y a 6h', source: "L'Équipe", summary: 'Le Néerlandais compte désormais 50 points d\'avance sur Leclerc.', url: 'https://www.lequipe.fr' },
  ],
  cyclisme: [
    { id: 15, title: 'Tour de France : Le parcours 2025 dévoilé', category: 'cyclisme', image: '🚴', time: 'Il y a 1h', source: "L'Équipe", summary: 'La Grande Boucle partira de Lille et traversera les Pyrénées avant les Alpes.', url: 'https://www.lequipe.fr' },
    { id: 16, title: 'Pogačar remporte le Giro', category: 'cyclisme', image: '🏆', time: 'Il y a 3h', source: 'Sports.fr', summary: 'Le Slovène signe un doublé historique Giro-Tour en dominant la montagne.', url: 'https://www.sports.fr' },
    { id: 17, title: 'Paris-Roubaix : Van der Poel intouchable', category: 'cyclisme', image: '🪨', time: 'Il y a 1j', source: "L'Équipe", summary: 'Le Néerlandais s\'impose en solitaire sur l\'Enfer du Nord.', url: 'https://www.lequipe.fr' },
  ],
  basket: [
    { id: 18, title: 'NBA : Wembanyama bat un nouveau record', category: 'basket', image: '🏀', time: 'Il y a 2h', source: "L'Équipe", summary: 'Le Français réalise un triple-double historique face aux Lakers.', url: 'https://www.lequipe.fr' },
    { id: 19, title: 'Équipe de France : Les Bleus qualifiés pour les JO', category: 'basket', image: '🇫🇷', time: 'Il y a 4h', source: 'Sports.fr', summary: 'La France valide son billet pour Paris 2024 après sa victoire en TQO.', url: 'https://www.sports.fr' },
    { id: 20, title: 'Euroleague : Monaco en playoffs', category: 'basket', image: '🔴', time: 'Il y a 6h', source: "L'Équipe", summary: 'L\'AS Monaco basket se qualifie pour la phase finale de l\'Euroleague.', url: 'https://www.lequipe.fr' },
  ],
  handball: [
    { id: 21, title: 'Mondial : Les Experts en finale', category: 'handball', image: '🤾', time: 'Il y a 1h', source: "L'Équipe", summary: 'L\'équipe de France domine le Danemark et retrouve la finale du Mondial.', url: 'https://www.lequipe.fr' },
    { id: 22, title: 'Starligue : Montpellier champion', category: 'handball', image: '🏆', time: 'Il y a 5h', source: 'Sports.fr', summary: 'Le MHB remporte son 15e titre de champion de France.', url: 'https://www.sports.fr' },
  ]
};

// =============================================================================
// Fetch Functions
// =============================================================================

// Simulate API delay for realistic UX
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch news (uses local data, could be connected to real RSS feeds via proxy)
async function fetchSportsNews(category = 'all', search = '') {
  // Simulate network latency
  await delay(400 + Math.random() * 400);

  let news = [];

  if (category === 'all') {
    news = Object.values(NEWS_DATA).flat();
  } else if (NEWS_DATA[category]) {
    news = NEWS_DATA[category];
  }

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    news = news.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      item.summary.toLowerCase().includes(searchLower)
    );
  }

  // Sort by time (most recent first in mock data)
  return { articles: news, total: news.length, sources: ["L'Équipe", "Sports.fr"] };
}

// Try to fetch from real RSS feed (requires CORS proxy in production)
async function fetchFromRSS(feedUrl) {
  try {
    // Using a CORS proxy for demo - in production use your own backend
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
    const response = await api.get(proxyUrl);

    if (response.data?.contents) {
      // Parse RSS XML
      const parser = new DOMParser();
      const xml = parser.parseFromString(response.data.contents, 'text/xml');
      const items = xml.querySelectorAll('item');

      return Array.from(items).slice(0, 10).map((item, index) => ({
        id: `rss-${index}`,
        title: item.querySelector('title')?.textContent || 'Sans titre',
        summary: item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '').slice(0, 150) + '...' || '',
        url: item.querySelector('link')?.textContent || '#',
        time: formatDate(item.querySelector('pubDate')?.textContent),
        source: "L'Équipe",
        category: 'football',
        image: '⚽'
      }));
    }
  } catch (error) {
    console.warn('[RSS] Failed to fetch, using local data:', error.message);
  }
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Récent';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  return `Il y a ${diffDays}j`;
}

// =============================================================================
// State
// =============================================================================

export const category = pulse('all');
export const search = pulse('');
export const darkMode = pulse(localStorage.getItem('sports-dark') === 'true');
export const favorites = pulse(JSON.parse(localStorage.getItem('sports-favorites') || '[]'));
export const showFavorites = pulse(false);
export const newsState = pulse({ data: null, loading: true, error: null });

// =============================================================================
// Data Fetching
// =============================================================================

export async function fetchNews() {
  newsState.set({ data: null, loading: true, error: null });

  try {
    // Try RSS first, fall back to local data
    // Uncomment to try real RSS (requires CORS proxy):
    // const rssData = await fetchFromRSS('https://www.lequipe.fr/rss/actu_rss.xml');
    // if (rssData) { ... }

    const result = await fetchSportsNews(category.get(), search.get());
    newsState.set({ data: result, loading: false, error: null });
  } catch (err) {
    newsState.set({ data: null, loading: false, error: err.message });
  }
}

// Watch for category/search changes and refetch
effect(() => {
  category.get();
  search.get();
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
// Categories Configuration (French Sports)
// =============================================================================

export const CATEGORIES = [
  { id: 'all', name: 'Tous', icon: '🏅' },
  { id: 'football', name: 'Football', icon: '⚽' },
  { id: 'rugby', name: 'Rugby', icon: '🏉' },
  { id: 'tennis', name: 'Tennis', icon: '🎾' },
  { id: 'f1', name: 'Formule 1', icon: '🏎️' },
  { id: 'cyclisme', name: 'Cyclisme', icon: '🚴' },
  { id: 'basket', name: 'Basket', icon: '🏀' },
  { id: 'handball', name: 'Handball', icon: '🤾' }
];

// =============================================================================
// Components
// =============================================================================

function Header() {
  const header = el('header.header');

  const logo = el('.logo', [
    el('span.logo-icon', '\u26BD\uFE0F'),
    el('span.logo-text', [
      'Sport',
      el('span.accent', 'Actu')
    ])
  ]);
  header.appendChild(logo);

  // Sources badge
  const sources = el('.sources-badge', [
    el('small', "Sources: L'Équipe • Sports.fr")
  ]);
  header.appendChild(sources);

  // Search
  const searchBox = el('.search-box');
  const searchInput = el('input.search-input[type=text][placeholder="Rechercher..."]');
  let searchTimeout;
  on(searchInput, 'input', (e) => {
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
    favBtn.textContent = showFavorites.get() ? '\u2764\uFE0F' : '\uD83E\uDD0D';
    favBtn.title = showFavorites.get() ? 'Voir tout' : 'Favoris';
    favBtn.className = `icon-btn ${showFavorites.get() ? 'active' : ''}`;
  });
  on(favBtn, 'click', toggleShowFavorites);
  actions.appendChild(favBtn);

  // Dark mode toggle
  const darkBtn = el('button.icon-btn');
  effect(() => {
    darkBtn.textContent = darkMode.get() ? '\u2600\uFE0F' : '\uD83C\uDF19';
    darkBtn.title = darkMode.get() ? 'Mode clair' : 'Mode sombre';
  });
  on(darkBtn, 'click', toggleDarkMode);
  actions.appendChild(darkBtn);

  header.appendChild(actions);

  return header;
}

function CategoryFilter() {
  const nav = el('nav.categories');

  for (const cat of CATEGORIES) {
    const btn = el('button.category-btn', [
      cat.icon + ' ',
      el('span', cat.name)
    ]);
    btn.dataset.category = cat.id;

    effect(() => {
      btn.className = `category-btn ${category.get() === cat.id ? 'active' : ''}`;
    });

    on(btn, 'click', () => setCategory(cat.id));
    nav.appendChild(btn);
  }

  return nav;
}

function NewsCard(article) {
  const card = el('.news-card');
  card.dataset.id = article.id;

  // Image placeholder with category color
  const imageBox = el('.news-image');
  const colors = {
    football: '#1e40af',
    rugby: '#166534',
    tennis: '#ca8a04',
    f1: '#dc2626',
    cyclisme: '#7c3aed',
    basket: '#ea580c',
    handball: '#0891b2'
  };
  imageBox.style.background = `linear-gradient(135deg, ${colors[article.category] || '#3b82f6'}, #8b5cf6)`;
  imageBox.appendChild(el('span.image-emoji', article.image));
  card.appendChild(imageBox);

  // Content
  const content = el('.news-content');

  const meta = el('.news-meta', [
    el('span.source', article.source),
    el('span.time', article.time)
  ]);
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
    favBtn.textContent = isFav ? '\u2764\uFE0F' : '\uD83E\uDD0D';
    favBtn.className = `card-btn fav-btn ${isFav ? 'active' : ''}`;
  });
  on(favBtn, 'click', (e) => {
    e.stopPropagation();
    toggleFavorite(article.id);
  });
  actions.appendChild(favBtn);

  const shareBtn = el('button.card-btn', '\uD83D\uDCE4');
  shareBtn.title = 'Partager';
  on(shareBtn, 'click', (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: article.title, text: article.summary, url: article.url });
    } else {
      navigator.clipboard.writeText(`${article.title} - ${article.url}`);
      alert('Lien copié !');
    }
  });
  actions.appendChild(shareBtn);

  content.appendChild(actions);
  card.appendChild(content);

  // Make card clickable - open source URL
  card.style.cursor = 'pointer';
  on(card, 'click', () => {
    window.open(article.url, '_blank');
  });

  return card;
}

function NewsList() {
  const container = el('.news-container');

  effect(() => {
    container.textContent = '';
    const state = newsState.get();

    if (state.loading) {
      const loader = el('.loader', [
        el('.spinner'),
        el('p', 'Chargement des actualit\u00E9s...')
      ]);
      container.appendChild(loader);
      return;
    }

    if (state.error) {
      const retryBtn = el('button.retry-btn', 'R\u00E9essayer');
      on(retryBtn, 'click', fetchNews);
      const errorEl = el('.error-state', [
        el('span.error-icon', '\u26A0\uFE0F'),
        el('p', state.error),
        retryBtn
      ]);
      container.appendChild(errorEl);
      return;
    }

    const articles = getFilteredNews();

    if (articles.length === 0) {
      const isShowingFavorites = showFavorites.get();
      const empty = el('.empty-state', [
        el('span.empty-icon', isShowingFavorites ? '\uD83D\uDC94' : '\uD83D\uDD0D'),
        el('p', isShowingFavorites ? 'Aucun favori' : 'Aucun article trouv\u00E9'),
        el('span.empty-hint', isShowingFavorites ? 'Ajoutez des articles en favoris avec \u2764\uFE0F' : 'Essayez une autre cat\u00E9gorie ou recherche')
      ]);
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
  const footer = el('footer.footer', [
    el('div', [
      'Sources: ',
      el('a[href=https://www.lequipe.fr][target=_blank]', "L'\u00C9quipe"),
      ' \u2022 ',
      el('a[href=https://www.sports.fr][target=_blank]', 'Sports.fr')
    ]),
    el('div', [
      'Built with \u2728 ',
      el('strong', 'Pulse Framework'),
      ' \u2022 Zero-Dependency HTTP Client'
    ])
  ]);
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
  --primary: #dc2626;
  --primary-hover: #b91c1c;
  --accent: #dc2626;
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

.sources-badge {
  color: var(--text-muted);
  font-size: 0.85em;
}

.search-box {
  flex: 1;
  max-width: 300px;
  min-width: 180px;
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
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-emoji {
  font-size: 2.5em;
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
  font-size: 1em;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.3;
}

.news-summary {
  font-size: 0.85em;
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
  font-size: 0.85em;
  line-height: 1.8;
}

.footer a {
  color: var(--primary);
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
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

  .sources-badge {
    display: none;
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

console.log('⚽ SportActu - Sources: L\'Équipe & Sports.fr');
