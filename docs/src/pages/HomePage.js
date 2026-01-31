/**
 * Pulse Documentation - Home Page
 */

import { el } from '/runtime/index.js';

export function HomePage() {
  const page = el('.page.home-page');

  // Hero
  const hero = el('.hero');
  hero.innerHTML = `
    <h1>⚡ Pulse Framework</h1>
    <p class="tagline">A declarative DOM framework with CSS selector-based structure</p>
    <div class="hero-features">
      <span class="feature feature-highlight">0️⃣ Zero Dependencies</span>
      <span class="feature">🎯 Unique Syntax</span>
      <span class="feature">⚡ Reactive</span>
      <span class="feature">📦 ~4kb core</span>
      <span class="feature">🔧 No Build Required</span>
      <span class="feature">📱 Mobile Apps</span>
    </div>
    <div class="hero-buttons">
      <button class="btn btn-primary" onclick="window.docs.navigate('/getting-started')">Get Started →</button>
      <button class="btn btn-secondary" onclick="window.docs.navigate('/examples')">View Examples</button>
    </div>
  `;
  page.appendChild(hero);

  // What makes Pulse unique
  const unique = el('.section');
  unique.innerHTML = `
    <h2>What Makes Pulse Unique?</h2>
    <div class="comparison-table">
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>React</th>
            <th>Vue</th>
            <th>Svelte</th>
            <th><strong>Pulse</strong></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>UI Structure</td>
            <td>JSX</td>
            <td>Templates</td>
            <td>HTML+</td>
            <td><strong>CSS Selectors</strong></td>
          </tr>
          <tr>
            <td>Reactivity</td>
            <td>Hooks</td>
            <td>Proxy</td>
            <td>Compiler</td>
            <td><strong>Signals</strong></td>
          </tr>
          <tr>
            <td>Build Step</td>
            <td>Required</td>
            <td>Required</td>
            <td>Required</td>
            <td><strong>Optional</strong></td>
          </tr>
          <tr>
            <td>Bundle Size</td>
            <td>~45kb</td>
            <td>~35kb</td>
            <td>~2kb</td>
            <td><strong>~4kb</strong></td>
          </tr>
          <tr>
            <td>Dependencies</td>
            <td>Many</td>
            <td>Some</td>
            <td>Few</td>
            <td><strong>Zero</strong></td>
          </tr>
          <tr>
            <td>Build Speed</td>
            <td>Slow</td>
            <td>Medium</td>
            <td>Fast</td>
            <td><strong>Instant</strong></td>
          </tr>
          <tr>
            <td>Learning Curve</td>
            <td>Steep</td>
            <td>Moderate</td>
            <td>Easy</td>
            <td><strong>Minimal</strong></td>
          </tr>
          <tr>
            <td>File Extension</td>
            <td>.jsx/.tsx</td>
            <td>.vue</td>
            <td>.svelte</td>
            <td><strong>.pulse / .js</strong></td>
          </tr>
          <tr>
            <td>Mobile Apps</td>
            <td>React Native</td>
            <td>Capacitor</td>
            <td>Capacitor</td>
            <td><strong>Built-in</strong></td>
          </tr>
          <tr>
            <td>TypeScript</td>
            <td>Built-in</td>
            <td>Built-in</td>
            <td>Built-in</td>
            <td><strong>Built-in</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
  page.appendChild(unique);

  // Quick example
  const example = el('.section');
  example.innerHTML = `
    <h2>Quick Example</h2>
    <div class="code-example">
      <div class="code-block">
        <div class="code-header">.pulse syntax</div>
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
        <div class="code-header">JavaScript equivalent</div>
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
