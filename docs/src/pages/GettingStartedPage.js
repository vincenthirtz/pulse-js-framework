/**
 * Pulse Documentation - Getting Started Page
 */

import { el } from '/runtime/index.js';
import { t } from '../state.js';

export function GettingStartedPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>${t('gettingStarted.title')}</h1>

    <section class="doc-section">
      <h2>${t('gettingStarted.installation')}</h2>
      <p>${t('gettingStarted.installationDesc')}</p>
      <div class="code-block">
        <pre><code>npx pulse-js-framework create my-app
cd my-app
npm install
npm run dev</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('gettingStarted.manualSetup')}</h2>
      <p>${t('gettingStarted.manualSetupDesc')}</p>
      <div class="code-block">
        <pre><code>npm install pulse-js-framework</code></pre>
      </div>
      <p>${t('gettingStarted.thenImport')}</p>
      <div class="code-block">
        <pre><code>import { pulse, effect, el, mount } from 'pulse-js-framework';</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('gettingStarted.firstComponent')}</h2>
      <p>${t('gettingStarted.firstComponentDesc')}</p>
      <div class="code-block">
        <pre><code>import { pulse, effect, el, mount } from 'pulse-js-framework';

// Create reactive state
const count = pulse(0);

// Build UI
function App() {
  const container = el('.app');

  // Reactive text
  const display = el('h1');
  effect(() => {
    display.textContent = \`Count: \${count.get()}\`;
  });

  // Buttons
  const increment = el('button', '+');
  increment.onclick = () => count.update(n => n + 1);

  const decrement = el('button', '-');
  decrement.onclick = () => count.update(n => n - 1);

  container.append(display, increment, decrement);
  return container;
}

// Mount to DOM
mount('#app', App());</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('gettingStarted.usingPulseFiles')}</h2>
      <p>${t('gettingStarted.usingPulseFilesDesc')}</p>
      <div class="code-block">
        <div class="code-header">vite.config.js</div>
        <pre><code>import { defineConfig } from 'vite';
import pulse from 'pulse-js-framework/vite';

export default defineConfig({
  plugins: [pulse()]
});</code></pre>
      </div>
      <div class="code-block">
        <div class="code-header">App.pulse</div>
        <pre><code>@page App

state {
  count: 0
}

view {
  .app {
    h1 "Count: {count}"
    button @click(count++) "+"
    button @click(count--) "-"
  }
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('gettingStarted.projectStructure')}</h2>
      <div class="code-block">
        <pre><code>my-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js
    ├── App.pulse
    └── components/
        └── Header.pulse</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('gettingStarted.cliCommands')}</h2>
      <p>${t('gettingStarted.cliCommandsDesc')}</p>

      <h3>${t('gettingStarted.development')}</h3>
      <div class="code-block">
        <pre><code>pulse create &lt;name&gt;   # Create new project
pulse dev [port]      # Start dev server (default: 3000)
pulse build           # Build for production
pulse preview [port]  # Preview production build</code></pre>
      </div>

      <h3>${t('gettingStarted.codeQuality')}</h3>
      <div class="code-block">
        <pre><code>pulse lint [files]    # Validate .pulse files
pulse lint --fix      # Auto-fix issues
pulse format [files]  # Format code consistently
pulse format --check  # Check without writing (CI)
pulse analyze         # Analyze bundle size
pulse analyze --json  # JSON output</code></pre>
      </div>

      <p>${t('gettingStarted.lintChecks')}</p>
      <p>${t('gettingStarted.formatRules')}</p>
      <p>${t('gettingStarted.analyzeOutput')}</p>
    </section>

    <section class="doc-section faq-section">
      <h2>${t('gettingStarted.faq')}</h2>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqBuildStep.q')}</h3>
        <p>${t('gettingStarted.faqBuildStep.a')}</p>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqComparison.q')}</h3>
        <p>${t('gettingStarted.faqComparison.a')}</p>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqTypeScript.q')}</h3>
        <p>${t('gettingStarted.faqTypeScript.a')}</p>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqForms.q')}</h3>
        <p>${t('gettingStarted.faqForms.a')}</p>
        <div class="code-block">
          <pre><code>const name = pulse('');
const input = el('input[type=text]');
model(input, name);  // Two-way binding</code></pre>
        </div>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqExisting.q')}</h3>
        <p>${t('gettingStarted.faqExisting.a')}</p>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqFetch.q')}</h3>
        <p>${t('gettingStarted.faqFetch.a')}</p>
        <div class="code-block">
          <pre><code>const users = pulse([]);
const loading = pulse(true);

effect(() => {
  fetch('/api/users')
    .then(r => r.json())
    .then(data => {
      users.set(data);
      loading.set(false);
    });
});</code></pre>
        </div>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqSSR.q')}</h3>
        <p>${t('gettingStarted.faqSSR.a')}</p>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqDebug.q')}</h3>
        <p>${t('gettingStarted.faqDebug.a')}</p>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqMobile.q')}</h3>
        <p>${t('gettingStarted.faqMobile.a')}</p>
      </div>

      <div class="faq-item">
        <h3>${t('gettingStarted.faqHelp.q')}</h3>
        <p>${t('gettingStarted.faqHelp.a')}</p>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/core-concepts')">
        ${t('gettingStarted.nextCoreConcepts')}
      </button>
    </div>
  `;

  return page;
}
