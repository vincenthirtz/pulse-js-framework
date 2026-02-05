/**
 * Pulse Documentation - Internals Page
 * Documents internal algorithms and implementation details
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations, navigateLocale } from '../state.js';

export function InternalsPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="internals.title"></h1>
    <p class="page-intro" data-i18n="internals.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="internals.lisAlgorithm"></h2>
      <p data-i18n="internals.lisDesc"></p>

      <h3 data-i18n="internals.whyLis"></h3>
      <p data-i18n="internals.whyLisDesc"></p>

      <div class="code-block">
        <pre><code>Old order: [A, B, C, D, E]
New order: [B, D, A, E, C]

Question: Which elements can stay in place?
Answer: B, D, E are already in increasing order.
        Only A and C need to move.

Result: 2 DOM moves instead of 5</code></pre>
      </div>

      <h3 data-i18n="internals.lisOverview"></h3>
      <p data-i18n="internals.lisOverviewDesc"></p>

      <div class="code-block">
        <pre><code>Input positions: [2, 0, 4, 1, 3]
                  A  B  C  D  E  (items in new order)

Processing (binary search insertion):
  i=0: val=2, dp=[], insert at 0 → dp=[2]
  i=1: val=0, dp=[2], 0&lt;2, replace → dp=[0]
  i=2: val=4, dp=[0], 4>0, append → dp=[0,4]
  i=3: val=1, dp=[0,4], 0&lt;1&lt;4, replace → dp=[0,1]
  i=4: val=3, dp=[0,1], 1&lt;3, append → dp=[0,1,3]

LIS length = 3
LIS indices = [1, 3, 4] → items B, D, E stay in place
Items A, C need to move</code></pre>
      </div>

      <h3 data-i18n="internals.reconciliationPhases"></h3>
      <table class="doc-table">
        <caption data-i18n="internals.phasesCaption"></caption>
        <thead>
          <tr>
            <th scope="col" data-i18n="internals.phase"></th>
            <th scope="col" data-i18n="internals.operation"></th>
            <th scope="col" data-i18n="internals.complexity"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1. Key extraction</td>
            <td data-i18n="internals.keyExtraction"></td>
            <td>O(n)</td>
          </tr>
          <tr>
            <td>2. Diff</td>
            <td data-i18n="internals.diffPhase"></td>
            <td>O(n)</td>
          </tr>
          <tr>
            <td>3. Remove</td>
            <td data-i18n="internals.removePhase"></td>
            <td>O(removed)</td>
          </tr>
          <tr>
            <td>4. Create</td>
            <td data-i18n="internals.createPhase"></td>
            <td>O(added)</td>
          </tr>
          <tr>
            <td>5. LIS</td>
            <td data-i18n="internals.lisPhase"></td>
            <td>O(n log n)</td>
          </tr>
          <tr>
            <td>6. Reorder</td>
            <td data-i18n="internals.reorderPhase"></td>
            <td>O(n - LIS)</td>
          </tr>
        </tbody>
      </table>

      <h3 data-i18n="internals.performanceByCase"></h3>
      <table class="doc-table">
        <caption data-i18n="internals.scenarioCaption"></caption>
        <thead>
          <tr>
            <th scope="col" data-i18n="internals.scenario"></th>
            <th scope="col" data-i18n="internals.domOps"></th>
            <th scope="col" data-i18n="internals.notes"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-i18n="internals.appendItems"></td>
            <td>O(1)</td>
            <td data-i18n="internals.appendNote"></td>
          </tr>
          <tr>
            <td data-i18n="internals.prependItems"></td>
            <td>O(added)</td>
            <td data-i18n="internals.prependNote"></td>
          </tr>
          <tr>
            <td data-i18n="internals.removeItems"></td>
            <td>O(removed)</td>
            <td data-i18n="internals.removeNote"></td>
          </tr>
          <tr>
            <td data-i18n="internals.reverseList"></td>
            <td>O(n)</td>
            <td data-i18n="internals.reverseNote"></td>
          </tr>
          <tr>
            <td data-i18n="internals.randomShuffle"></td>
            <td>O(n - LIS)</td>
            <td data-i18n="internals.shuffleNote"></td>
          </tr>
          <tr>
            <td data-i18n="internals.moveSingle"></td>
            <td>O(1)</td>
            <td data-i18n="internals.moveNote"></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="doc-section">
      <h2 data-i18n="internals.selectorCache"></h2>
      <p data-i18n="internals.selectorCacheDesc"></p>

      <h3 data-i18n="internals.whyLru"></h3>
      <table class="doc-table">
        <caption data-i18n="internals.cacheComparisonCaption"></caption>
        <thead>
          <tr>
            <th scope="col" data-i18n="internals.approach"></th>
            <th scope="col" data-i18n="internals.memory"></th>
            <th scope="col" data-i18n="internals.longRunning"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-i18n="internals.noCache"></td>
            <td data-i18n="internals.minimal"></td>
            <td>O(n) parse per call</td>
          </tr>
          <tr>
            <td data-i18n="internals.unboundedMap"></td>
            <td data-i18n="internals.growsForever"></td>
            <td data-i18n="internals.memoryLeak"></td>
          </tr>
          <tr>
            <td><strong>LRU Cache</strong></td>
            <td data-i18n="internals.bounded"></td>
            <td data-i18n="internals.hotCached"></td>
          </tr>
        </tbody>
      </table>

      <h3 data-i18n="internals.cacheConfig"></h3>
      <div class="code-block">
        <pre><code>import { configureDom, getCacheMetrics } from 'pulse-js-framework/runtime';

// Default: 500 selectors (covers most apps)
configureDom({ selectorCacheCapacity: 1000 });  // Increase for large apps
configureDom({ selectorCacheCapacity: 0 });     // Disable caching

// Monitor performance
const stats = getCacheMetrics();
console.log(\`Hit rate: \${(stats.hitRate * 100).toFixed(1)}%\`);
console.log(\`Size: \${stats.size}/\${stats.capacity}\`);</code></pre>
      </div>

      <h3 data-i18n="internals.cacheSafety"></h3>
      <p data-i18n="internals.cacheSafetyDesc"></p>
      <div class="code-block">
        <pre><code>// Cache stores:
{ tag: 'div', classes: ['a', 'b'], attrs: { x: '1' } }

// Returns shallow copy:
{ tag: 'div', classes: [...], attrs: {...} }

// This prevents corruption:
const config = parseSelector('div.a.b');
config.classes.push('c');  // Doesn't corrupt cache</code></pre>
      </div>

      <h3 data-i18n="internals.lruEviction"></h3>
      <div class="code-block">
        <pre><code>Capacity: 3
Operations:
  set('a', 1)  → cache: [a]
  set('b', 2)  → cache: [a, b]
  set('c', 3)  → cache: [a, b, c]
  get('a')     → cache: [b, c, a]  (a moves to most recent)
  set('d', 4)  → cache: [c, a, d]  (b evicted = least recent)</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="internals.conditionalLifecycle"></h2>
      <p data-i18n="internals.conditionalLifecycleDesc"></p>

      <h3 data-i18n="internals.cleanupGuarantees"></h3>
      <ol>
        <li><strong data-i18n="internals.nodesRemoved"></strong> - <span data-i18n="internals.nodesRemovedDesc"></span></li>
        <li><strong data-i18n="internals.cleanupCalled"></strong> - <span data-i18n="internals.cleanupCalledDesc"></span></li>
        <li><strong data-i18n="internals.stateReset"></strong> - <span data-i18n="internals.stateResetDesc"></span></li>
      </ol>

      <h3 data-i18n="internals.lifecycleDiagram"></h3>
      <div class="code-block">
        <pre><code>when(condition, thenBranch, elseBranch)

┌─────────────────────────────────────────────────────────┐
│ Initial Render (condition = true)                       │
├─────────────────────────────────────────────────────────┤
│ 1. effect() runs                                        │
│ 2. condition() returns true                             │
│ 3. thenBranch() called → nodes created                  │
│ 4. Nodes inserted after marker                          │
│ 5. currentNodes = [nodes], currentCleanup = null        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ condition changes to false
┌─────────────────────────────────────────────────────────┐
│ Re-render (condition = false)                           │
├─────────────────────────────────────────────────────────┤
│ 1. effect() re-runs (tracked dependency changed)        │
│ 2. CLEANUP: Remove all currentNodes from DOM            │
│ 3. CLEANUP: Call currentCleanup() if exists             │
│ 4. RESET: currentNodes = [], currentCleanup = null      │
│ 5. elseBranch() called → new nodes created              │
│ 6. New nodes inserted after marker                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼ component unmounts
┌─────────────────────────────────────────────────────────┐
│ Disposal                                                │
├─────────────────────────────────────────────────────────┤
│ 1. Parent effect disposed                               │
│ 2. when's internal effect disposed                      │
│ 3. Final cleanup runs                                   │
└─────────────────────────────────────────────────────────┘</code></pre>
      </div>

      <h3 data-i18n="internals.whenVsShow"></h3>
      <table class="doc-table">
        <caption data-i18n="internals.whenVsShowCaption"></caption>
        <thead>
          <tr>
            <th scope="col" data-i18n="internals.feature"></th>
            <th scope="col">when()</th>
            <th scope="col">show()</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-i18n="internals.domPresence"></td>
            <td data-i18n="internals.addsRemoves"></td>
            <td data-i18n="internals.alwaysInDom"></td>
          </tr>
          <tr>
            <td data-i18n="internals.effects"></td>
            <td data-i18n="internals.createdDisposed"></td>
            <td data-i18n="internals.alwaysActive"></td>
          </tr>
          <tr>
            <td data-i18n="internals.memoryUsage"></td>
            <td data-i18n="internals.lowerWhenHidden"></td>
            <td data-i18n="internals.constant"></td>
          </tr>
          <tr>
            <td data-i18n="internals.transitions"></td>
            <td data-i18n="internals.harder"></td>
            <td data-i18n="internals.easier"></td>
          </tr>
          <tr>
            <td data-i18n="internals.formState"></td>
            <td data-i18n="internals.lostOnHide"></td>
            <td data-i18n="internals.preserved"></td>
          </tr>
          <tr>
            <td data-i18n="internals.useCase"></td>
            <td data-i18n="internals.complexConditional"></td>
            <td data-i18n="internals.simpleToggle"></td>
          </tr>
        </tbody>
      </table>

      <h3 data-i18n="internals.cleanupPattern"></h3>
      <div class="code-block">
        <pre><code>import { when, onCleanup } from 'pulse-js-framework/runtime';
import { trapFocus } from 'pulse-js-framework/runtime/a11y';

when(
  () => showModal.get(),
  () => {
    const modal = el('dialog.modal', content);
    const releaseFocus = trapFocus(modal);

    // Cleanup runs when condition becomes false
    onCleanup(() => releaseFocus());

    return modal;
  }
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="internals.effectScheduling"></h2>
      <p data-i18n="internals.effectSchedulingDesc"></p>

      <h3 data-i18n="internals.executionModel"></h3>
      <div class="code-block">
        <pre><code>// Normal execution:
count.set(1)  → effect runs immediately
count.set(2)  → effect runs immediately
count.set(3)  → effect runs immediately
// Total: 3 effect runs

// Batched execution:
batch(() => {
  count.set(1)  → queued
  count.set(2)  → queued (replaces previous)
  count.set(3)  → queued (replaces previous)
})
→ effect runs once with value 3
// Total: 1 effect run</code></pre>
      </div>

      <h3 data-i18n="internals.circularProtection"></h3>
      <p data-i18n="internals.circularProtectionDesc"></p>
      <div class="code-block">
        <pre><code>const count = pulse(0);

effect(() => {
  console.log(count.get());
  count.set(count.peek() + 1);  // Triggers self!
});

// Pulse limits to 100 iterations, then throws:
// Error: Circular dependency detected (max 100 iterations)</code></pre>
      </div>

      <h3 data-i18n="internals.cleanupTiming"></h3>
      <div class="code-block">
        <pre><code>1. Effect runs for first time
   - Dependencies tracked
   - Cleanup function stored (if returned)

2. Dependency changes
   - Previous cleanup runs FIRST
   - Effect body runs
   - New cleanup stored

3. Effect disposed
   - Final cleanup runs
   - Effect removed from dependency graph</code></pre>
      </div>

      <h3 data-i18n="internals.nestedEffects"></h3>
      <p data-i18n="internals.nestedEffectsDesc"></p>
      <div class="code-block">
        <pre><code>effect(() => {
  const user = currentUser.get();

  // Inner effect disposed when outer re-runs
  effect(() => {
    console.log(user.name, preferences.get());
  });
});

// When currentUser changes:
// 1. Inner effect disposed
// 2. Outer effect re-runs
// 3. New inner effect created</code></pre>
      </div>
    </section>

    <div class="next-section"></div>
  `;

  // Reactive i18n: update all translated elements when locale/translations change
  effect(() => {
    locale.get();
    translations.get();

    page.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  });

  // Add navigation button
  const nextSection = page.querySelector('.next-section');
  const nextBtn = el('button.btn.btn-primary');
  effect(() => {
    nextBtn.textContent = t('internals.nextPerformance');
  });
  nextBtn.onclick = () => navigateLocale('/performance');
  nextSection.appendChild(nextBtn);

  return page;
}
