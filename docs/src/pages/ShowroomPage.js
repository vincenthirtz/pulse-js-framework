/**
 * Pulse Documentation - Showroom Page
 * Browse all examples in a single page with iframe preview and select dropdown.
 */

import { el } from '/runtime/index.js';
import { t } from '../state.js';

/**
 * All examples grouped by category.
 * key: translation key under examples.* in pages.js
 * path: subdirectory under /examples/
 * icon: emoji icon
 * category: grouping for <optgroup>
 */
const EXAMPLES = [
  // App Examples
  { key: 'hmrDemo', path: 'hmr', icon: '🔥', category: 'apps' },
  { key: 'blog', path: 'blog', icon: '📰', category: 'apps' },
  { key: 'todoApp', path: 'todo', icon: '📝', category: 'apps' },
  { key: 'weatherApp', path: 'meteo', icon: '🌤️', category: 'apps' },
  { key: 'ecommerce', path: 'ecommerce', icon: '🛒', category: 'apps' },
  { key: 'chatApp', path: 'chat', icon: '💬', category: 'apps' },
  { key: 'routerDemo', path: 'router', icon: '🧭', category: 'apps' },
  { key: 'storeDemo', path: 'store', icon: '📝', category: 'apps' },
  { key: 'dashboard', path: 'dashboard', icon: '📊', category: 'apps' },
  { key: 'sportsNews', path: 'sports', icon: '⚽', category: 'apps' },
  { key: 'formValidation', path: 'form-validation', icon: '📋', category: 'apps' },
  { key: 'a11yShowcase', path: 'a11y-showcase', icon: '♿', category: 'apps' },
  { key: 'graphqlDemo', path: 'graphql', icon: '🔮', category: 'apps' },
  { key: 'contextApi', path: 'context-api', icon: '🎯', category: 'apps' },
  { key: 'ssrDemo', path: 'ssr', icon: '🖥️', category: 'apps' },
  { key: 'asyncPatterns', path: 'async-patterns', icon: '⏳', category: 'apps' },

  // CSS Preprocessors
  { key: 'sassDemo', path: 'sass-example', icon: '🎨', category: 'css' },
  { key: 'lessDemo', path: 'less-example', icon: '🎨', category: 'css' },
  { key: 'stylusDemo', path: 'stylus-example', icon: '💅', category: 'css' },

  // Build Tools
  { key: 'webpackDemo', path: 'webpack-example', icon: '📦', category: 'tools' },
  { key: 'rollupDemo', path: 'rollup-example', icon: '🎲', category: 'tools' },
  { key: 'esbuildDemo', path: 'esbuild-example', icon: '⚡', category: 'tools' },
  { key: 'parcelDemo', path: 'parcel-example', icon: '📦', category: 'tools' },

  // Advanced
  { key: 'electronApp', path: 'electron', icon: '🖥️', category: 'advanced' },
  { key: 'serverActions', path: 'server-actions-ratelimit', icon: '🔒', category: 'advanced' }
];

const CATEGORIES = {
  apps: 'showroom.categoryApps',
  css: 'showroom.categoryCss',
  tools: 'showroom.categoryTools',
  advanced: 'showroom.categoryAdvanced'
};

export function ShowroomPage() {
  const page = el('.page.showroom-page');

  const defaultExample = EXAMPLES[0];

  // Build optgroup HTML
  const optgroupsHtml = Object.entries(CATEGORIES).map(([catKey, labelKey]) => {
    const items = EXAMPLES.filter(ex => ex.category === catKey);
    if (items.length === 0) return '';
    const options = items.map(ex =>
      `<option value="${ex.path}">${ex.icon} ${t('examples.' + ex.key + '.title')}</option>`
    ).join('\n');
    return `<optgroup label="${t(labelKey)}">${options}</optgroup>`;
  }).join('\n');

  page.innerHTML = `
    <h1>${t('showroom.title')}</h1>
    <p class="intro">${t('showroom.intro')}</p>

    <div class="showroom-controls">
      <div class="showroom-select-wrapper">
        <label for="showroom-select">${t('showroom.selectLabel')}</label>
        <select id="showroom-select">
          ${optgroupsHtml}
        </select>
      </div>
      <a id="showroom-open-tab" href="/examples/${defaultExample.path}/" target="_blank" rel="noopener" class="btn btn-primary">
        ${t('showroom.openNewTab')}
      </a>
    </div>

    <div class="showroom-content">
      <div class="showroom-iframe-wrapper">
        <iframe id="showroom-iframe" src="/examples/${defaultExample.path}/" title="${t('examples.' + defaultExample.key + '.title')}"></iframe>
      </div>
      <div class="showroom-info" id="showroom-info">
        <div class="example-icon">${defaultExample.icon}</div>
        <h3>${t('examples.' + defaultExample.key + '.title')}</h3>
        <p>${t('examples.' + defaultExample.key + '.desc')}</p>
        <ul class="example-features">
          ${buildFeaturesList(defaultExample.key)}
        </ul>
        <a href="/examples/${defaultExample.path}/" class="btn btn-secondary showroom-view-link" target="_blank" rel="noopener">
          ${t('examples.viewDemo')}
        </a>
      </div>
    </div>
  `;

  // Wire up select change
  const select = page.querySelector('#showroom-select');
  const iframe = page.querySelector('#showroom-iframe');
  const openTab = page.querySelector('#showroom-open-tab');
  const infoPanel = page.querySelector('#showroom-info');

  select.addEventListener('change', () => {
    const selected = EXAMPLES.find(ex => ex.path === select.value);
    if (!selected) return;

    // Update iframe
    iframe.src = `/examples/${selected.path}/`;
    iframe.title = t('examples.' + selected.key + '.title');

    // Update open-in-tab link
    openTab.href = `/examples/${selected.path}/`;

    // Update info panel
    infoPanel.innerHTML = `
      <div class="example-icon">${selected.icon}</div>
      <h3>${t('examples.' + selected.key + '.title')}</h3>
      <p>${t('examples.' + selected.key + '.desc')}</p>
      <ul class="example-features">
        ${buildFeaturesList(selected.key)}
      </ul>
      <a href="/examples/${selected.path}/" class="btn btn-secondary showroom-view-link" target="_blank" rel="noopener">
        ${t('examples.viewDemo')}
      </a>
    `;
  });

  return page;
}

function buildFeaturesList(key) {
  const features = [];
  for (let i = 0; i < 5; i++) {
    const feat = t('examples.' + key + '.features.' + i);
    if (feat && !feat.startsWith('examples.')) {
      features.push(`<li>${feat}</li>`);
    }
  }
  return features.join('\n');
}
