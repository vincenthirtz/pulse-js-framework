/**
 * Pulse Documentation - Home Page
 */

import { el } from '/runtime/index.js';
import { t, navigateLocale } from '../state.js';

export function HomePage() {
  const page = el('.page.home-page');

  // Hero with animated logo and typing effect
  const hero = el('.hero');
  hero.innerHTML = `
    <div class="hero-brand">
      <span class="hero-logo-icon">⚡</span>
      <h1 class="hero-title">Pulse Framework</h1>
    </div>
    <p class="tagline">
      <span class="typing-text"></span>
      <span class="typing-cursor">|</span>
    </p>
    <div class="hero-features">
      <span class="feature feature-highlight">${t('home.features.zeroDeps')}</span>
      <span class="feature">${t('home.features.uniqueSyntax')}</span>
      <span class="feature">${t('home.features.reactive')}</span>
      <span class="feature">${t('home.features.smallBundle')}</span>
      <span class="feature">${t('home.features.noBuild')}</span>
      <span class="feature">${t('home.features.mobile')}</span>
    </div>
    <div class="hero-buttons"></div>
  `;
  page.appendChild(hero);

  // Attach click handlers programmatically for hero buttons
  const heroButtons = hero.querySelector('.hero-buttons');
  const getStartedBtn = el('button.btn.btn-primary', t('home.getStarted'));
  getStartedBtn.onclick = () => navigateLocale('/getting-started');
  const viewExamplesBtn = el('button.btn.btn-secondary', t('home.viewExamples'));
  viewExamplesBtn.onclick = () => navigateLocale('/examples');
  heroButtons.append(getStartedBtn, viewExamplesBtn);

  // Typing effect for tagline
  const tagline = t('home.tagline');
  const typingEl = hero.querySelector('.typing-text');
  const cursorEl = hero.querySelector('.typing-cursor');
  let charIndex = 0;
  const typeInterval = setInterval(() => {
    if (charIndex < tagline.length) {
      typingEl.textContent = tagline.slice(0, charIndex + 1);
      charIndex++;
    } else {
      clearInterval(typeInterval);
      cursorEl.classList.add('typing-done');
    }
  }, 35);

  // Stats Section
  const stats = el('.section.stats-section');
  stats.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">~4kb</div>
        <div class="stat-label">${t('home.stats.gzipped')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">0</div>
        <div class="stat-label">${t('home.stats.dependencies')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">&lt;1s</div>
        <div class="stat-label">${t('home.stats.buildTime')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">♿</div>
        <div class="stat-label">${t('home.stats.a11yBuiltIn')}</div>
      </div>
    </div>
  `;
  page.appendChild(stats);

  // Quick Start Section
  const quickStart = el('.section.quick-start-section');
  quickStart.innerHTML = `
    <h2>${t('home.quickStart.title')}</h2>
    <p class="section-desc">${t('home.quickStart.desc')}</p>
    <div class="quick-start-code">
      <div class="code-block">
        <div class="code-header">
          <span>${t('home.quickStart.terminal')}</span>
          <button class="copy-btn" data-copy="npm create pulse@latest my-app && cd my-app && npm run dev">
            <span class="copy-icon">📋</span>
            <span class="copy-text">${t('home.quickStart.copy')}</span>
          </button>
        </div>
        <pre><code><span class="hljs-comment"># ${t('home.quickStart.createProject')}</span>
npm create pulse@latest my-app

<span class="hljs-comment"># ${t('home.quickStart.navigate')}</span>
cd my-app

<span class="hljs-comment"># ${t('home.quickStart.startDev')}</span>
npm run dev</code></pre>
      </div>
    </div>
  `;
  page.appendChild(quickStart);

  // Copy button functionality
  quickStart.querySelector('.copy-btn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const text = btn.dataset.copy;
    navigator.clipboard.writeText(text).then(() => {
      const copyText = btn.querySelector('.copy-text');
      const originalText = copyText.textContent;
      copyText.textContent = t('home.quickStart.copied');
      btn.classList.add('copied');
      setTimeout(() => {
        copyText.textContent = originalText;
        btn.classList.remove('copied');
      }, 2000);
    });
  });

  // Why Pulse Section
  const whyPulse = el('.section.why-pulse-section');
  whyPulse.innerHTML = `
    <h2>${t('home.whyPulse.title')}</h2>
    <div class="why-pulse-grid">
      <div class="why-card">
        <div class="why-icon">🚀</div>
        <h3>${t('home.whyPulse.performance.title')}</h3>
        <p>${t('home.whyPulse.performance.desc')}</p>
      </div>
      <div class="why-card">
        <div class="why-icon">🎯</div>
        <h3>${t('home.whyPulse.simplicity.title')}</h3>
        <p>${t('home.whyPulse.simplicity.desc')}</p>
      </div>
      <div class="why-card">
        <div class="why-icon">♿</div>
        <h3>${t('home.whyPulse.accessibility.title')}</h3>
        <p>${t('home.whyPulse.accessibility.desc')}</p>
      </div>
      <div class="why-card">
        <div class="why-icon">📱</div>
        <h3>${t('home.whyPulse.mobile.title')}</h3>
        <p>${t('home.whyPulse.mobile.desc')}</p>
      </div>
      <div class="why-card">
        <div class="why-icon">🔧</div>
        <h3>${t('home.whyPulse.noBuild.title')}</h3>
        <p>${t('home.whyPulse.noBuild.desc')}</p>
      </div>
      <div class="why-card">
        <div class="why-icon">🛡️</div>
        <h3>${t('home.whyPulse.security.title')}</h3>
        <p>${t('home.whyPulse.security.desc')}</p>
      </div>
    </div>
  `;
  page.appendChild(whyPulse);

  // What makes Pulse unique (modern comparison cards)
  const unique = el('.section.comparison-section');
  unique.innerHTML = `
    <h2>${t('home.whatMakesUnique')}</h2>
    <div class="comparison-cards">
      <div class="comparison-card">
        <div class="comparison-icon">🎨</div>
        <h3>${t('home.comparison.uiStructure')}</h3>
        <div class="comparison-others">
          <span class="other-fw">React: JSX</span>
          <span class="other-fw">Vue: Templates</span>
          <span class="other-fw">Svelte: HTML+</span>
        </div>
        <div class="comparison-pulse">
          <span class="pulse-badge">${t('home.comparison.cssSelectors')}</span>
        </div>
      </div>

      <div class="comparison-card">
        <div class="comparison-icon">📦</div>
        <h3>${t('home.comparison.bundleSize')}</h3>
        <div class="size-bars">
          <div class="size-bar">
            <span class="bar-label">Angular</span>
            <div class="bar-track"><div class="bar-fill" style="width: 100%"></div></div>
            <span class="bar-value">~130kb</span>
          </div>
          <div class="size-bar">
            <span class="bar-label">React</span>
            <div class="bar-track"><div class="bar-fill" style="width: 35%"></div></div>
            <span class="bar-value">~45kb</span>
          </div>
          <div class="size-bar">
            <span class="bar-label">Vue</span>
            <div class="bar-track"><div class="bar-fill" style="width: 27%"></div></div>
            <span class="bar-value">~35kb</span>
          </div>
          <div class="size-bar highlight">
            <span class="bar-label">Pulse</span>
            <div class="bar-track"><div class="bar-fill pulse-fill" style="width: 3%"></div></div>
            <span class="bar-value">~4kb</span>
          </div>
        </div>
      </div>

      <div class="comparison-card">
        <div class="comparison-icon">🔧</div>
        <h3>${t('home.comparison.buildStep')}</h3>
        <div class="build-comparison">
          <div class="build-others">
            <span class="build-required">React</span>
            <span class="build-required">Vue</span>
            <span class="build-required">Angular</span>
            <span class="build-required">Svelte</span>
          </div>
          <div class="build-pulse">
            <span class="build-optional">Pulse: ${t('home.comparison.optional')}</span>
          </div>
        </div>
      </div>

      <div class="comparison-card">
        <div class="comparison-icon">⚡</div>
        <h3>${t('home.comparison.buildSpeed')}</h3>
        <div class="speed-indicator">
          <div class="speed-item slow"><span>Angular</span><span class="speed-dots">●○○○</span></div>
          <div class="speed-item slow"><span>React</span><span class="speed-dots">●○○○</span></div>
          <div class="speed-item medium"><span>Vue</span><span class="speed-dots">●●○○</span></div>
          <div class="speed-item fast"><span>Svelte</span><span class="speed-dots">●●●○</span></div>
          <div class="speed-item instant"><span>Pulse</span><span class="speed-dots">●●●●</span></div>
        </div>
      </div>

      <div class="comparison-card">
        <div class="comparison-icon">📚</div>
        <h3>${t('home.comparison.learningCurve')}</h3>
        <div class="learning-curve">
          <div class="curve-item steep">Angular <span>📈📈📈</span></div>
          <div class="curve-item steep">React <span>📈📈📈</span></div>
          <div class="curve-item moderate">Vue <span>📈📈</span></div>
          <div class="curve-item easy">Svelte <span>📈</span></div>
          <div class="curve-item minimal">Pulse <span>✨</span></div>
        </div>
      </div>

      <div class="comparison-card">
        <div class="comparison-icon">♿</div>
        <h3>${t('home.comparison.accessibility')}</h3>
        <div class="a11y-comparison">
          <div class="a11y-others">
            <span class="a11y-third">React: ${t('home.comparison.thirdParty')}</span>
            <span class="a11y-third">Vue: ${t('home.comparison.thirdParty')}</span>
            <span class="a11y-third">Svelte: ${t('home.comparison.thirdParty')}</span>
          </div>
          <div class="a11y-pulse">
            <span class="a11y-builtin">Pulse: ${t('home.comparison.builtIn')} ✓</span>
          </div>
        </div>
      </div>
    </div>
  `;
  page.appendChild(unique);

  // Quick example
  const example = el('.section');
  example.innerHTML = `
    <h2>${t('home.quickExample')}</h2>
    <div class="code-example">
      <div class="code-block">
        <div class="code-header">${t('home.pulseSyntax')}</div>
        <pre><code>@page Counter

state {
  count: 0
}

view {
  .counter {
    h1 "Count: {count}"
    button @click(count++) "+"
    button @click(count--) "-"
  }
}

style {
  .counter {
    text-align: center
    padding: 20px
  }
}</code></pre>
      </div>
      <div class="code-block">
        <div class="code-header">${t('home.jsEquivalent')}</div>
        <pre><code>import { pulse, el, mount, effect } from 'pulse';

const count = pulse(0);

function Counter() {
  const div = el('.counter');

  const h1 = el('h1');
  effect(() => {
    h1.textContent = \`Count: \${count.get()}\`;
  });

  const inc = el('button', '+');
  inc.onclick = () => count.update(n => n + 1);

  const dec = el('button', '-');
  dec.onclick = () => count.update(n => n - 1);

  div.append(h1, inc, dec);
  return div;
}

mount('#app', Counter());</code></pre>
      </div>
    </div>
  `;
  page.appendChild(example);

  return page;
}
