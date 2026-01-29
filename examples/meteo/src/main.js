/**
 * Pulse Weather App
 * Using Open-Meteo API (free, no API key required)
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

const city = pulse('Paris');
const searchInput = pulse('');
const weather = pulse(null);
const forecast = pulse([]);
const loading = pulse(false);
const error = pulse(null);
const unit = pulse('celsius'); // celsius or fahrenheit
const favorites = pulse(JSON.parse(localStorage.getItem('weather-favorites') || '["Paris", "London", "New York", "Tokyo"]'));

// =============================================================================
// API Functions
// =============================================================================

// Geocoding API to get coordinates from city name
async function getCoordinates(cityName) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
  );
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${cityName}" not found`);
  }

  return {
    lat: data.results[0].latitude,
    lon: data.results[0].longitude,
    name: data.results[0].name,
    country: data.results[0].country
  };
}

// Weather API
async function getWeather(lat, lon) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
  );
  return response.json();
}

// =============================================================================
// Weather Code to Icon/Description
// =============================================================================

const weatherCodes = {
  0: { icon: '☀️', desc: 'Clear sky' },
  1: { icon: '🌤️', desc: 'Mainly clear' },
  2: { icon: '⛅', desc: 'Partly cloudy' },
  3: { icon: '☁️', desc: 'Overcast' },
  45: { icon: '🌫️', desc: 'Foggy' },
  48: { icon: '🌫️', desc: 'Depositing rime fog' },
  51: { icon: '🌧️', desc: 'Light drizzle' },
  53: { icon: '🌧️', desc: 'Moderate drizzle' },
  55: { icon: '🌧️', desc: 'Dense drizzle' },
  61: { icon: '🌧️', desc: 'Slight rain' },
  63: { icon: '🌧️', desc: 'Moderate rain' },
  65: { icon: '🌧️', desc: 'Heavy rain' },
  66: { icon: '🌨️', desc: 'Light freezing rain' },
  67: { icon: '🌨️', desc: 'Heavy freezing rain' },
  71: { icon: '❄️', desc: 'Slight snow' },
  73: { icon: '❄️', desc: 'Moderate snow' },
  75: { icon: '❄️', desc: 'Heavy snow' },
  77: { icon: '🌨️', desc: 'Snow grains' },
  80: { icon: '🌦️', desc: 'Slight rain showers' },
  81: { icon: '🌦️', desc: 'Moderate rain showers' },
  82: { icon: '⛈️', desc: 'Violent rain showers' },
  85: { icon: '🌨️', desc: 'Slight snow showers' },
  86: { icon: '🌨️', desc: 'Heavy snow showers' },
  95: { icon: '⛈️', desc: 'Thunderstorm' },
  96: { icon: '⛈️', desc: 'Thunderstorm with slight hail' },
  99: { icon: '⛈️', desc: 'Thunderstorm with heavy hail' }
};

function getWeatherInfo(code) {
  return weatherCodes[code] || { icon: '❓', desc: 'Unknown' };
}

// =============================================================================
// Actions
// =============================================================================

async function fetchWeather(cityName) {
  loading.set(true);
  error.set(null);

  try {
    const coords = await getCoordinates(cityName);
    const data = await getWeather(coords.lat, coords.lon);

    weather.set({
      city: coords.name,
      country: coords.country,
      temp: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
      windDir: data.current.wind_direction_10m,
      code: data.current.weather_code
    });

    // Process forecast
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push({
        date: data.daily.time[i],
        code: data.daily.weather_code[i],
        tempMax: Math.round(data.daily.temperature_2m_max[i]),
        tempMin: Math.round(data.daily.temperature_2m_min[i]),
        precipitation: data.daily.precipitation_probability_max[i]
      });
    }
    forecast.set(days);
    city.set(coords.name);

  } catch (err) {
    error.set(err.message);
    weather.set(null);
    forecast.set([]);
  } finally {
    loading.set(false);
  }
}

function search() {
  const query = searchInput.peek().trim();
  if (query) {
    fetchWeather(query);
    searchInput.set('');
  }
}

function toggleUnit() {
  unit.update(u => u === 'celsius' ? 'fahrenheit' : 'celsius');
}

function convertTemp(celsius) {
  if (unit.peek() === 'fahrenheit') {
    return Math.round(celsius * 9/5 + 32);
  }
  return celsius;
}

function getUnitSymbol() {
  return unit.peek() === 'celsius' ? '°C' : '°F';
}

function addToFavorites() {
  const currentCity = city.peek();
  const favs = favorites.peek();
  if (!favs.includes(currentCity)) {
    const newFavs = [...favs, currentCity];
    favorites.set(newFavs);
    localStorage.setItem('weather-favorites', JSON.stringify(newFavs));
  }
}

function removeFromFavorites(cityName) {
  const newFavs = favorites.peek().filter(f => f !== cityName);
  favorites.set(newFavs);
  localStorage.setItem('weather-favorites', JSON.stringify(newFavs));
}

function isFavorite() {
  return favorites.peek().includes(city.peek());
}

// =============================================================================
// Components
// =============================================================================

function SearchBar() {
  const container = el('.search-bar');

  const input = el('input[type=text][placeholder="Search city..."]');
  input.addEventListener('input', (e) => searchInput.set(e.target.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search();
  });

  const btn = el('button.search-btn', '🔍');
  btn.addEventListener('click', search);

  container.appendChild(input);
  container.appendChild(btn);

  return container;
}

function FavoritesList() {
  const container = el('.favorites');

  const title = el('h3', '⭐ Favorites');
  container.appendChild(title);

  const list = el('.favorites-list');

  effect(() => {
    list.innerHTML = '';
    const favs = favorites.get();

    for (const fav of favs) {
      const item = el('.favorite-item');

      const name = el('span.fav-name', fav);
      name.addEventListener('click', () => fetchWeather(fav));

      const removeBtn = el('button.fav-remove', '×');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromFavorites(fav);
      });

      item.appendChild(name);
      item.appendChild(removeBtn);
      list.appendChild(item);
    }
  });

  container.appendChild(list);
  return container;
}

function CurrentWeather() {
  const container = el('.current-weather');

  effect(() => {
    container.innerHTML = '';
    const data = weather.get();
    const isLoading = loading.get();
    const err = error.get();

    if (isLoading) {
      container.appendChild(el('.loading', '⏳ Loading...'));
      return;
    }

    if (err) {
      container.appendChild(el('.error', `❌ ${err}`));
      return;
    }

    if (!data) {
      container.appendChild(el('.placeholder', '🌍 Search for a city to see weather'));
      return;
    }

    const info = getWeatherInfo(data.code);

    // Header
    const header = el('.weather-header');
    const location = el('h2.location', `${data.city}, ${data.country}`);

    const favBtn = el('button.fav-btn');
    favBtn.innerHTML = isFavorite() ? '⭐' : '☆';
    favBtn.title = isFavorite() ? 'Remove from favorites' : 'Add to favorites';
    favBtn.addEventListener('click', () => {
      if (isFavorite()) {
        removeFromFavorites(data.city);
      } else {
        addToFavorites();
      }
    });

    header.appendChild(location);
    header.appendChild(favBtn);
    container.appendChild(header);

    // Main temp
    const main = el('.weather-main');
    main.appendChild(el('.weather-icon', info.icon));

    const tempContainer = el('.temp-container');
    const temp = el('.temperature', `${convertTemp(data.temp)}${getUnitSymbol()}`);
    temp.addEventListener('click', toggleUnit);
    temp.title = 'Click to toggle °C/°F';
    tempContainer.appendChild(temp);
    tempContainer.appendChild(el('.weather-desc', info.desc));
    main.appendChild(tempContainer);

    container.appendChild(main);

    // Details
    const details = el('.weather-details');
    details.appendChild(createDetail('🌡️', 'Feels like', `${convertTemp(data.feelsLike)}${getUnitSymbol()}`));
    details.appendChild(createDetail('💧', 'Humidity', `${data.humidity}%`));
    details.appendChild(createDetail('💨', 'Wind', `${data.windSpeed} km/h`));
    details.appendChild(createDetail('🧭', 'Direction', `${data.windDir}°`));
    container.appendChild(details);
  });

  return container;
}

function createDetail(icon, label, value) {
  const detail = el('.detail');
  detail.appendChild(el('.detail-icon', icon));
  detail.appendChild(el('.detail-label', label));
  detail.appendChild(el('.detail-value', value));
  return detail;
}

function Forecast() {
  const container = el('.forecast');

  const title = el('h3', '📅 7-Day Forecast');
  container.appendChild(title);

  const list = el('.forecast-list');

  effect(() => {
    list.innerHTML = '';
    const days = forecast.get();

    if (days.length === 0) return;

    for (const day of days) {
      const info = getWeatherInfo(day.code);
      const date = new Date(day.date);
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });

      const item = el('.forecast-item');
      item.appendChild(el('.forecast-day', dayName));
      item.appendChild(el('.forecast-icon', info.icon));
      item.appendChild(el('.forecast-temps',
        `${convertTemp(day.tempMax)}° / ${convertTemp(day.tempMin)}°`
      ));
      item.appendChild(el('.forecast-precip', `💧 ${day.precipitation}%`));
      list.appendChild(item);
    }
  });

  container.appendChild(list);
  return container;
}

function App() {
  const app = el('.weather-app');

  app.appendChild(el('h1.app-title', '🌤️ Pulse Weather'));
  app.appendChild(SearchBar());

  const content = el('.content');

  const sidebar = el('.sidebar');
  sidebar.appendChild(FavoritesList());
  content.appendChild(sidebar);

  const main = el('.main');
  main.appendChild(CurrentWeather());
  main.appendChild(Forecast());
  content.appendChild(main);

  app.appendChild(content);
  app.appendChild(el('footer.app-footer', 'Built with ✨ Pulse Framework • Data by Open-Meteo'));

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --card-bg: rgba(255, 255, 255, 0.95);
  --card-bg-hover: rgba(255, 255, 255, 1);
  --text: #333;
  --text-light: #666;
  --primary: #667eea;
  --shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  --radius: 16px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--text);
}

.weather-app {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
}

.app-title {
  text-align: center;
  color: white;
  font-size: 2.5em;
  margin-bottom: 24px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

/* Search Bar */
.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.search-bar input {
  flex: 1;
  padding: 16px 20px;
  font-size: 1.1em;
  border: none;
  border-radius: var(--radius);
  background: var(--card-bg);
  box-shadow: var(--shadow);
  outline: none;
  transition: transform 0.2s;
}

.search-bar input:focus {
  transform: scale(1.02);
}

.search-btn {
  padding: 16px 24px;
  font-size: 1.2em;
  border: none;
  border-radius: var(--radius);
  background: white;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform 0.2s;
}

.search-btn:hover {
  transform: scale(1.05);
}

/* Content Layout */
.content {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .content {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: 2;
  }
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.favorites {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
}

.favorites h3 {
  margin-bottom: 12px;
  color: var(--text-light);
  font-size: 0.9em;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favorite-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.favorite-item:hover {
  background: #eee;
}

.fav-name {
  font-weight: 500;
}

.fav-remove {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.fav-remove:hover {
  opacity: 1;
}

/* Main */
.main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Current Weather */
.current-weather {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 32px;
  box-shadow: var(--shadow);
}

.loading, .error, .placeholder {
  text-align: center;
  padding: 48px;
  font-size: 1.2em;
  color: var(--text-light);
}

.error {
  color: #e74c3c;
}

.weather-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.location {
  font-size: 1.5em;
}

.fav-btn {
  font-size: 1.5em;
  background: none;
  border: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.fav-btn:hover {
  transform: scale(1.2);
}

.weather-main {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}

.weather-icon {
  font-size: 5em;
}

.temp-container {
  flex: 1;
}

.temperature {
  font-size: 4em;
  font-weight: 300;
  cursor: pointer;
  transition: color 0.2s;
}

.temperature:hover {
  color: var(--primary);
}

.weather-desc {
  font-size: 1.2em;
  color: var(--text-light);
  margin-top: 4px;
}

.weather-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.detail {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.detail-icon {
  font-size: 1.5em;
  margin-bottom: 8px;
}

.detail-label {
  font-size: 0.85em;
  color: var(--text-light);
  margin-bottom: 4px;
}

.detail-value {
  font-size: 1.1em;
  font-weight: 600;
}

/* Forecast */
.forecast {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}

.forecast h3 {
  margin-bottom: 16px;
}

.forecast-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.forecast-item {
  background: #f8f9fa;
  padding: 16px 12px;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.2s;
}

.forecast-item:hover {
  transform: translateY(-4px);
}

.forecast-day {
  font-weight: 600;
  margin-bottom: 8px;
}

.forecast-icon {
  font-size: 2em;
  margin-bottom: 8px;
}

.forecast-temps {
  font-size: 0.9em;
  margin-bottom: 4px;
}

.forecast-precip {
  font-size: 0.8em;
  color: var(--text-light);
}

/* Footer */
.app-footer {
  text-align: center;
  padding: 24px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9em;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.current-weather, .forecast, .favorites {
  animation: fadeIn 0.4s ease;
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Mount & Initial Load
// =============================================================================

mount('#app', App());

// Load initial weather
fetchWeather('Paris');

console.log('🌤️ Pulse Weather App loaded!');
