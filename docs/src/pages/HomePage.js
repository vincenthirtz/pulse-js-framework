/**
 * Pulse Documentation - Home Page
 */

import { el } from '/runtime/index.js';
import { t } from '../state.js';

export function HomePage() {
  const page = el('.page.home-page');

  // Hero
  const hero = el('.hero');
  hero.innerHTML = `
    <h1>${t('home.title')}</h1>
    <p class="tagline">${t('home.tagline')}</p>
    <div class="hero-features">
      <span class="feature feature-highlight">${t('home.features.zeroDeps')}</span>
      <span class="feature">${t('home.features.uniqueSyntax')}</span>
      <span class="feature">${t('home.features.reactive')}</span>
      <span class="feature">${t('home.features.smallBundle')}</span>
      <span class="feature">${t('home.features.noBuild')}</span>
      <span class="feature">${t('home.features.mobile')}</span>
    </div>
    <div class="hero-buttons">
      <button class="btn btn-primary" onclick="window.docs.navigate('/getting-started')">${t('home.getStarted')}</button>
      <button class="btn btn-secondary" onclick="window.docs.navigate('/examples')">${t('home.viewExamples')}</button>
    </div>
  `;
  page.appendChild(hero);

  // What makes Pulse unique
  const unique = el('.section');
  unique.innerHTML = `
    <h2>${t('home.whatMakesUnique')}</h2>
    <div class="comparison-table">
      <table>
        <thead>
          <tr>
            <th>${t('home.comparison.feature')}</th>
            <th>${t('comparison.react')}</th>
            <th>${t('comparison.vue')}</th>
            <th>${t('comparison.angular')}</th>
            <th>${t('comparison.svelte')}</th>
            <th><strong>${t('comparison.pulse')}</strong></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${t('home.comparison.uiStructure')}</td>
            <td>JSX</td>
            <td>Templates</td>
            <td>Templates</td>
            <td>HTML+</td>
            <td><strong>${t('home.comparison.cssSelectors')}</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.reactivity')}</td>
            <td>Hooks</td>
            <td>Proxy</td>
            <td>RxJS/Signals</td>
            <td>Compiler</td>
            <td><strong>${t('home.comparison.pulses')}</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.buildStep')}</td>
            <td>${t('home.comparison.required')}</td>
            <td>${t('home.comparison.required')}</td>
            <td>${t('home.comparison.required')}</td>
            <td>${t('home.comparison.required')}</td>
            <td><strong>${t('home.comparison.optional')}</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.bundleSize')}</td>
            <td>~45kb</td>
            <td>~35kb</td>
            <td>~130kb</td>
            <td>~2kb</td>
            <td><strong>~4kb</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.dependencies')}</td>
            <td>${t('home.comparison.many')}</td>
            <td>${t('home.comparison.some')}</td>
            <td>${t('home.comparison.many')}</td>
            <td>${t('home.comparison.few')}</td>
            <td><strong>${t('home.comparison.zero')}</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.buildSpeed')}</td>
            <td>${t('home.comparison.slow')}</td>
            <td>${t('home.comparison.medium')}</td>
            <td>${t('home.comparison.slow')}</td>
            <td>${t('home.comparison.fast')}</td>
            <td><strong>${t('home.comparison.instant')}</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.learningCurve')}</td>
            <td>${t('home.comparison.steep')}</td>
            <td>${t('home.comparison.moderate')}</td>
            <td>${t('home.comparison.steep')}</td>
            <td>${t('home.comparison.easy')}</td>
            <td><strong>${t('home.comparison.minimal')}</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.fileExtension')}</td>
            <td>.jsx/.tsx</td>
            <td>.vue</td>
            <td>.ts/.html</td>
            <td>.svelte</td>
            <td><strong>.pulse / .js</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.mobileApps')}</td>
            <td>React Native</td>
            <td>Capacitor</td>
            <td>Ionic</td>
            <td>Capacitor</td>
            <td><strong>${t('home.comparison.builtIn')}</strong></td>
          </tr>
          <tr>
            <td>${t('home.comparison.typescript')}</td>
            <td>${t('home.comparison.builtIn')}</td>
            <td>${t('home.comparison.builtIn')}</td>
            <td>${t('home.comparison.builtIn')}</td>
            <td>${t('home.comparison.builtIn')}</td>
            <td><strong>${t('home.comparison.builtIn')}</strong></td>
          </tr>
        </tbody>
      </table>
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
