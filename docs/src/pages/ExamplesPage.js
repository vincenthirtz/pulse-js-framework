/**
 * Pulse Documentation - Examples Page
 */

import { el } from '/runtime/index.js';
import { t } from '../state.js';

export function ExamplesPage() {
  const page = el('.page.examples-page');

  page.innerHTML = `
    <h1>${t('examples.title')}</h1>
    <p class="intro">${t('examples.intro')}</p>

    <div class="examples-grid">
      <div class="example-card featured">
        <div class="example-icon">🔥</div>
        <h3>${t('examples.hmrDemo.title')}</h3>
        <p>${t('examples.hmrDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.hmrDemo.features.0')}</li>
          <li>✓ ${t('examples.hmrDemo.features.1')}</li>
          <li>✓ ${t('examples.hmrDemo.features.2')}</li>
          <li>✓ ${t('examples.hmrDemo.features.3')}</li>
          <li>✓ ${t('examples.hmrDemo.features.4')}</li>
        </ul>
        <a href="/examples/hmr/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">📰</div>
        <h3>${t('examples.blog.title')}</h3>
        <p>${t('examples.blog.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.blog.features.0')}</li>
          <li>✓ ${t('examples.blog.features.1')}</li>
          <li>✓ ${t('examples.blog.features.2')}</li>
          <li>✓ ${t('examples.blog.features.3')}</li>
          <li>✓ ${t('examples.blog.features.4')}</li>
        </ul>
        <a href="/examples/blog/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">📝</div>
        <h3>${t('examples.todoApp.title')}</h3>
        <p>${t('examples.todoApp.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.todoApp.features.0')}</li>
          <li>✓ ${t('examples.todoApp.features.1')}</li>
          <li>✓ ${t('examples.todoApp.features.2')}</li>
          <li>✓ ${t('examples.todoApp.features.3')}</li>
          <li>✓ ${t('examples.todoApp.features.4')}</li>
        </ul>
        <a href="/examples/todo/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">🌤️</div>
        <h3>${t('examples.weatherApp.title')}</h3>
        <p>${t('examples.weatherApp.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.weatherApp.features.0')}</li>
          <li>✓ ${t('examples.weatherApp.features.1')}</li>
          <li>✓ ${t('examples.weatherApp.features.2')}</li>
          <li>✓ ${t('examples.weatherApp.features.3')}</li>
          <li>✓ ${t('examples.weatherApp.features.4')}</li>
        </ul>
        <a href="/examples/meteo/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">🛒</div>
        <h3>${t('examples.ecommerce.title')}</h3>
        <p>${t('examples.ecommerce.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.ecommerce.features.0')}</li>
          <li>✓ ${t('examples.ecommerce.features.1')}</li>
          <li>✓ ${t('examples.ecommerce.features.2')}</li>
          <li>✓ ${t('examples.ecommerce.features.3')}</li>
          <li>✓ ${t('examples.ecommerce.features.4')}</li>
        </ul>
        <a href="/examples/ecommerce/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">💬</div>
        <h3>${t('examples.chatApp.title')}</h3>
        <p>${t('examples.chatApp.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.chatApp.features.0')}</li>
          <li>✓ ${t('examples.chatApp.features.1')}</li>
          <li>✓ ${t('examples.chatApp.features.2')}</li>
          <li>✓ ${t('examples.chatApp.features.3')}</li>
          <li>✓ ${t('examples.chatApp.features.4')}</li>
        </ul>
        <a href="/examples/chat/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">🧭</div>
        <h3>${t('examples.routerDemo.title')}</h3>
        <p>${t('examples.routerDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.routerDemo.features.0')}</li>
          <li>✓ ${t('examples.routerDemo.features.1')}</li>
          <li>✓ ${t('examples.routerDemo.features.2')}</li>
          <li>✓ ${t('examples.routerDemo.features.3')}</li>
          <li>✓ ${t('examples.routerDemo.features.4')}</li>
        </ul>
        <a href="/examples/router/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">📝</div>
        <h3>${t('examples.storeDemo.title')}</h3>
        <p>${t('examples.storeDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.storeDemo.features.0')}</li>
          <li>✓ ${t('examples.storeDemo.features.1')}</li>
          <li>✓ ${t('examples.storeDemo.features.2')}</li>
          <li>✓ ${t('examples.storeDemo.features.3')}</li>
          <li>✓ ${t('examples.storeDemo.features.4')}</li>
        </ul>
        <a href="/examples/store/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">📊</div>
        <h3>${t('examples.dashboard.title')}</h3>
        <p>${t('examples.dashboard.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.dashboard.features.0')}</li>
          <li>✓ ${t('examples.dashboard.features.1')}</li>
          <li>✓ ${t('examples.dashboard.features.2')}</li>
          <li>✓ ${t('examples.dashboard.features.3')}</li>
          <li>✓ ${t('examples.dashboard.features.4')}</li>
        </ul>
        <a href="/examples/dashboard/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">⚽</div>
        <h3>${t('examples.sportsNews.title')}</h3>
        <p>${t('examples.sportsNews.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.sportsNews.features.0')}</li>
          <li>✓ ${t('examples.sportsNews.features.1')}</li>
          <li>✓ ${t('examples.sportsNews.features.2')}</li>
          <li>✓ ${t('examples.sportsNews.features.3')}</li>
          <li>✓ ${t('examples.sportsNews.features.4')}</li>
        </ul>
        <a href="/examples/sports/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">🎨</div>
        <h3>${t('examples.lessDemo.title')}</h3>
        <p>${t('examples.lessDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.lessDemo.features.0')}</li>
          <li>✓ ${t('examples.lessDemo.features.1')}</li>
          <li>✓ ${t('examples.lessDemo.features.2')}</li>
          <li>✓ ${t('examples.lessDemo.features.3')}</li>
          <li>✓ ${t('examples.lessDemo.features.4')}</li>
        </ul>
        <a href="/examples/less-example/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">💅</div>
        <h3>${t('examples.stylusDemo.title')}</h3>
        <p>${t('examples.stylusDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.stylusDemo.features.0')}</li>
          <li>✓ ${t('examples.stylusDemo.features.1')}</li>
          <li>✓ ${t('examples.stylusDemo.features.2')}</li>
          <li>✓ ${t('examples.stylusDemo.features.3')}</li>
          <li>✓ ${t('examples.stylusDemo.features.4')}</li>
        </ul>
        <a href="/examples/stylus-example/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">📦</div>
        <h3>${t('examples.webpackDemo.title')}</h3>
        <p>${t('examples.webpackDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.webpackDemo.features.0')}</li>
          <li>✓ ${t('examples.webpackDemo.features.1')}</li>
          <li>✓ ${t('examples.webpackDemo.features.2')}</li>
          <li>✓ ${t('examples.webpackDemo.features.3')}</li>
          <li>✓ ${t('examples.webpackDemo.features.4')}</li>
        </ul>
        <a href="/examples/webpack-example/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">🎲</div>
        <h3>${t('examples.rollupDemo.title')}</h3>
        <p>${t('examples.rollupDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.rollupDemo.features.0')}</li>
          <li>✓ ${t('examples.rollupDemo.features.1')}</li>
          <li>✓ ${t('examples.rollupDemo.features.2')}</li>
          <li>✓ ${t('examples.rollupDemo.features.3')}</li>
          <li>✓ ${t('examples.rollupDemo.features.4')}</li>
        </ul>
        <a href="/examples/rollup-example/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">⚡</div>
        <h3>${t('examples.esbuildDemo.title')}</h3>
        <p>${t('examples.esbuildDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.esbuildDemo.features.0')}</li>
          <li>✓ ${t('examples.esbuildDemo.features.1')}</li>
          <li>✓ ${t('examples.esbuildDemo.features.2')}</li>
          <li>✓ ${t('examples.esbuildDemo.features.3')}</li>
          <li>✓ ${t('examples.esbuildDemo.features.4')}</li>
        </ul>
        <a href="/examples/esbuild-example/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>

      <div class="example-card">
        <div class="example-icon">📦</div>
        <h3>${t('examples.parcelDemo.title')}</h3>
        <p>${t('examples.parcelDemo.desc')}</p>
        <ul class="example-features">
          <li>✓ ${t('examples.parcelDemo.features.0')}</li>
          <li>✓ ${t('examples.parcelDemo.features.1')}</li>
          <li>✓ ${t('examples.parcelDemo.features.2')}</li>
          <li>✓ ${t('examples.parcelDemo.features.3')}</li>
          <li>✓ ${t('examples.parcelDemo.features.4')}</li>
        </ul>
        <a href="/examples/parcel-example/" class="btn btn-primary">
          ${t('examples.viewDemo')}
        </a>
      </div>
    </div>

    <section class="doc-section">
      <h2>${t('examples.runLocally')}</h2>
      <p>${t('examples.runLocallyDesc')}</p>
      <div class="code-block">
        <pre><code># HMR Demo (port 3000) - Try editing code!
cd pulse/examples/hmr
npm run dev

# Blog (port 3001)
cd pulse/examples/blog
npm run dev -- 3001

# Todo App (port 3002)
cd pulse/examples/todo
npm run dev -- 3002

# Weather App (port 3003)
cd pulse/examples/meteo
npm run dev -- 3003

# E-commerce (port 3004)
cd pulse/examples/ecommerce
npm run dev -- 3004

# Chat App (port 3005)
cd pulse/examples/chat
npm run dev -- 3005

# Router Demo (port 3006)
cd pulse/examples/router
npm run dev -- 3006

# Store Demo (port 3007)
cd pulse/examples/store
npm run dev -- 3007

# Admin Dashboard (port 3008)
cd pulse/examples/dashboard
npm run dev -- 3008

# Sports News (port 3009)
cd pulse/examples/sports
npm run dev -- 3009

# Documentation (port 3000)
cd pulse/docs
npm run dev</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('examples.createYourOwn')}</h2>
      <p>${t('examples.createYourOwnDesc')}</p>
      <div class="code-block">
        <pre><code>npx pulse-js-framework create my-awesome-app
cd my-awesome-app
npm install
npm run dev</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>${t('examples.mobileExamples')}</h2>
      <p>${t('examples.mobileExamplesDesc')}</p>
      <ul>
        <li><strong>iOS WebView</strong> - Native iOS app with WKWebView and Swift bridge (<code>examples/ios-webview</code>)</li>
        <li><strong>iOS Pulse</strong> - Full iOS app with native bridge API (<code>examples/ios-pulse</code>)</li>
        <li><strong>Android WebView</strong> - Native Android app wrapping a Pulse web app (<code>examples/android-webview</code>)</li>
        <li><strong>Android Pulse</strong> - Full Android app with native bridge API (<code>examples/android-pulse</code>)</li>
      </ul>
      <p class="text-muted" style="font-size: 0.9em; opacity: 0.7;">Open iOS projects in Xcode, Android projects in Android Studio.</p>
    </section>
  `;

  return page;
}
