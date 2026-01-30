/**
 * Pulse Documentation - Changelog Page
 */

import { el } from '/runtime/index.js';

export function ChangelogPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1>📋 Changelog</h1>
    <p class="intro">Recent updates and improvements to Pulse Framework</p>

    <section class="doc-section changelog-section">
      <h2>v1.2.0 - Mobile Apps</h2>
      <p class="release-date">January 2026</p>

      <h3>📱 Pulse Mobile</h3>
      <div class="changelog-group">
        <p>Build native Android and iOS apps from your Pulse project with zero external dependencies!</p>

        <div class="changelog-item">
          <h4>CLI Commands</h4>
          <ul class="feature-list">
            <li><code>pulse mobile init</code> - Initialize mobile platforms</li>
            <li><code>pulse mobile build android|ios</code> - Build native app</li>
            <li><code>pulse mobile run android|ios</code> - Run on device/emulator</li>
          </ul>
        </div>

        <div class="changelog-item">
          <h4>Native APIs</h4>
          <ul class="feature-list">
            <li><code>createNativeStorage()</code> - Persistent storage with Pulse reactivity</li>
            <li><code>createDeviceInfo()</code> - Device and network info</li>
            <li><code>NativeUI.toast()</code> - Native toast notifications</li>
            <li><code>NativeUI.vibrate()</code> - Haptic feedback</li>
            <li><code>NativeClipboard</code> - Read/write clipboard</li>
            <li>App lifecycle hooks: <code>onAppPause</code>, <code>onAppResume</code>, <code>onBackButton</code></li>
          </ul>
        </div>
      </div>

      <h3>📊 Admin Dashboard Example</h3>
      <div class="changelog-group">
        <p>New comprehensive example demonstrating all Pulse features:</p>
        <ul class="feature-list">
          <li>Authentication with route guards</li>
          <li>Responsive layout (mobile, tablet, desktop)</li>
          <li>Charts, data tables, modals</li>
          <li>CRUD operations with store</li>
          <li>Theme switching (dark/light)</li>
          <li>Undo/redo with historyPlugin</li>
        </ul>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.1.0 - Core Improvements</h2>
      <p class="release-date">January 2026</p>

      <h3>🎯 Reactivity Enhancements</h3>
      <div class="changelog-group">
        <div class="changelog-item">
          <h4><code>onCleanup(fn)</code></h4>
          <p>Register cleanup functions within effects that run when the effect re-executes or is disposed. Perfect for clearing timers, removing event listeners, or canceling subscriptions.</p>
          <div class="code-block">
            <pre><code>effect(() => {
  const interval = setInterval(tick, 1000);
  onCleanup(() => clearInterval(interval));
});</code></pre>
          </div>
        </div>

        <div class="changelog-item">
          <h4><code>memo(fn, options?)</code></h4>
          <p>Memoize function results based on arguments. Only recomputes when arguments change.</p>
        </div>

        <div class="changelog-item">
          <h4><code>memoComputed(fn, options?)</code></h4>
          <p>Combines memoization with computed values for expensive derivations.</p>
        </div>

        <div class="changelog-item">
          <h4>Fixed <code>computed()</code> propagation</h4>
          <p>Computed values now properly propagate changes to downstream subscribers using the new <code>_setFromComputed()</code> method.</p>
        </div>

        <div class="changelog-item">
          <h4>Lazy computed option</h4>
          <p>Use <code>computed(fn, { lazy: true })</code> to defer evaluation until the value is actually read.</p>
        </div>
      </div>

      <h3>📦 Array Helpers in createState</h3>
      <div class="changelog-group">
        <p>Arrays in <code>createState()</code> now get reactive helper methods:</p>
        <ul class="feature-list">
          <li><code>$push(...items)</code> - Add items to end</li>
          <li><code>$pop()</code> - Remove and return last item</li>
          <li><code>$shift()</code> - Remove and return first item</li>
          <li><code>$unshift(...items)</code> - Add items to beginning</li>
          <li><code>$splice(start, count, ...items)</code> - Splice array</li>
          <li><code>$filter(fn)</code> - Filter in place</li>
          <li><code>$map(fn)</code> - Map in place</li>
          <li><code>$sort(fn)</code> - Sort in place</li>
        </ul>
        <div class="code-block">
          <pre><code>const state = createState({ items: [1, 2, 3] });
state.items$push(4);      // [1, 2, 3, 4]
state.items$filter(x => x > 2);  // [3, 4]</code></pre>
        </div>
      </div>

      <h3>🖥️ DOM Improvements</h3>
      <div class="changelog-group">
        <div class="changelog-item">
          <h4><code>show(condition, element)</code></h4>
          <p>Toggle element visibility without removing from DOM. Unlike <code>when()</code>, this preserves element state and is more performant for frequent toggles.</p>
        </div>

        <div class="changelog-item">
          <h4><code>portal(children, target)</code></h4>
          <p>Render children into a different DOM location. Useful for modals, tooltips, and dropdowns that need to escape their parent's overflow or stacking context.</p>
        </div>

        <div class="changelog-item">
          <h4><code>errorBoundary(children, fallback)</code></h4>
          <p>Catch errors in child components and display a fallback UI. Includes a <code>resetError()</code> method to retry rendering.</p>
        </div>

        <div class="changelog-item">
          <h4><code>onMount(fn)</code> / <code>onUnmount(fn)</code></h4>
          <p>Lifecycle hooks for component setup and cleanup when using the <code>component()</code> factory.</p>
        </div>

        <div class="changelog-item">
          <h4><code>transition(element, options)</code></h4>
          <p>Apply enter/exit CSS animations to elements with configurable duration and class names.</p>
        </div>

        <div class="changelog-item">
          <h4><code>whenTransition(condition, then, else, options)</code></h4>
          <p>Conditional rendering with automatic enter/exit animations.</p>
        </div>

        <div class="changelog-item">
          <h4>Optimized <code>list()</code> diffing</h4>
          <p>List rendering now uses efficient keyed diffing - only moves nodes that actually changed position instead of rebuilding the entire list.</p>
        </div>
      </div>
    </section>

    <section class="doc-section changelog-section">
      <h2>v1.0.0 - Initial Release</h2>
      <p class="release-date">January 2026</p>

      <div class="changelog-group">
        <ul class="feature-list">
          <li>Core reactivity system with <code>pulse()</code>, <code>effect()</code>, <code>computed()</code>, <code>batch()</code></li>
          <li>CSS selector-based DOM creation with <code>el()</code></li>
          <li>Reactive bindings: <code>text()</code>, <code>bind()</code>, <code>cls()</code>, <code>style()</code>, <code>model()</code></li>
          <li>Conditional rendering with <code>when()</code> and <code>match()</code></li>
          <li>List rendering with <code>list()</code></li>
          <li>SPA Router with params, query strings, guards, and navigation</li>
          <li>Global state management with Store, actions, getters, and plugins</li>
          <li><code>.pulse</code> DSL compiler</li>
          <li>CLI tools: create, dev, build, preview, compile</li>
          <li>Example apps: Todo, Chat, E-commerce, Weather, Router Demo, Store Demo, Admin Dashboard</li>
        </ul>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/')">
        ← Back to Home
      </button>
    </div>
  `;

  return page;
}
