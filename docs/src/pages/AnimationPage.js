/**
 * Pulse Documentation - Animation Module Page
 */

import { el, effect } from '/runtime/index.js';
import { t, locale, translations } from '../state.js';

export function AnimationPage() {
  const page = el('.page.docs-page');

  page.innerHTML = `
    <h1 data-i18n="animation.title"></h1>
    <p class="page-intro" data-i18n="animation.intro"></p>

    <section class="doc-section">
      <h2 data-i18n="animation.quickStart"></h2>
      <p data-i18n="animation.quickStartDesc"></p>
      <div class="code-block">
        <pre><code>import {
  animate, stagger, useTransition, useSpring,
  configureAnimations
} from 'pulse-js-framework/runtime/animation';

// Animate a single element
const box = document.querySelector('.box');
const ctrl = animate(box, [
  { opacity: 0, transform: 'translateY(20px)' },
  { opacity: 1, transform: 'translateY(0)' }
], { duration: 400 });

// Wait for completion
await ctrl.finished;

// Reactive progress tracking
effect(() =&gt; {
  console.log('Progress:', ctrl.progress.get());
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.configuration"></h2>
      <p data-i18n="animation.configurationDesc"></p>
      <div class="code-block">
        <pre><code>import { configureAnimations } from 'pulse-js-framework/runtime/animation';

configureAnimations({
  // Respect prefers-reduced-motion media query (default: true)
  // When true, animations are skipped for users who prefer reduced motion
  respectReducedMotion: true,

  // Default duration in milliseconds (default: 300)
  defaultDuration: 300,

  // Default easing function (default: 'ease-out')
  // Accepts any valid CSS easing: 'linear', 'ease-in', 'ease-in-out',
  // 'cubic-bezier(0.4, 0, 0.2, 1)', etc.
  defaultEasing: 'ease-out',

  // Kill switch to disable all animations globally (default: false)
  // Useful for testing or performance-critical scenarios
  disabled: false
});</code></pre>
      </div>

      <h3 data-i18n="animation.configOptions"></h3>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="animation.option"></th>
              <th data-i18n="animation.type"></th>
              <th data-i18n="animation.default"></th>
              <th data-i18n="animation.description"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>respectReducedMotion</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td data-i18n="animation.respectReducedMotionDesc"></td>
            </tr>
            <tr>
              <td><code>defaultDuration</code></td>
              <td><code>number</code></td>
              <td><code>300</code></td>
              <td data-i18n="animation.defaultDurationDesc"></td>
            </tr>
            <tr>
              <td><code>defaultEasing</code></td>
              <td><code>string</code></td>
              <td><code>'ease-out'</code></td>
              <td data-i18n="animation.defaultEasingDesc"></td>
            </tr>
            <tr>
              <td><code>disabled</code></td>
              <td><code>boolean</code></td>
              <td><code>false</code></td>
              <td data-i18n="animation.disabledDesc"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.animateApi"></h2>
      <p data-i18n="animation.animateApiDesc"></p>
      <div class="code-block">
        <pre><code>import { animate } from 'pulse-js-framework/runtime/animation';

const ctrl = animate(element, keyframes, options);

// --- Parameters ---
// element:   HTMLElement to animate
// keyframes: Array of keyframe objects (Web Animations API format)
// options:   Animation options object

// --- Options ---
// duration:   number   - Duration in ms (falls back to configureAnimations default)
// easing:     string   - CSS easing function (falls back to default)
// fill:       string   - Fill mode: 'none' | 'forwards' | 'backwards' | 'both' (default: 'none')
// delay:      number   - Delay before start in ms (default: 0)
// iterations: number   - Number of iterations, use Infinity for loop (default: 1)
// direction:  string   - 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'

// --- Returns: AnimationControl ---
// ctrl.isPlaying  - Pulse&lt;boolean&gt; reactive playing state
// ctrl.progress   - Pulse&lt;number&gt;  reactive progress (0 to 1)
// ctrl.finished   - Promise        resolves when animation completes
// ctrl.play()     - Resume a paused animation
// ctrl.pause()    - Pause the animation
// ctrl.reverse()  - Reverse playback direction
// ctrl.cancel()   - Cancel and reset to initial state
// ctrl.finish()   - Jump to end state immediately
// ctrl.dispose()  - Clean up all resources</code></pre>
      </div>

      <h3 data-i18n="animation.basicExample"></h3>
      <div class="code-block">
        <pre><code>import { animate } from 'pulse-js-framework/runtime/animation';
import { el, effect } from 'pulse-js-framework/runtime';

const box = el('.box', 'Hello');

// Fade in with slide up
const ctrl = animate(box, [
  { opacity: 0, transform: 'translateY(20px)' },
  { opacity: 1, transform: 'translateY(0)' }
], {
  duration: 500,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  fill: 'forwards'
});

// React to animation state
effect(() =&gt; {
  if (ctrl.isPlaying.get()) {
    console.log(\`Animating: \${(ctrl.progress.get() * 100).toFixed(0)}%\`);
  }
});</code></pre>
      </div>

      <h3 data-i18n="animation.playbackControl"></h3>
      <div class="code-block">
        <pre><code>const ctrl = animate(element, [
  { transform: 'rotate(0deg)' },
  { transform: 'rotate(360deg)' }
], { duration: 2000, iterations: Infinity });

// Pause after 1 second
setTimeout(() =&gt; ctrl.pause(), 1000);

// Resume
document.querySelector('#play').onclick = () =&gt; ctrl.play();

// Reverse direction
document.querySelector('#reverse').onclick = () =&gt; ctrl.reverse();

// Cancel and reset
document.querySelector('#reset').onclick = () =&gt; ctrl.cancel();

// Clean up when done
document.querySelector('#stop').onclick = () =&gt; ctrl.dispose();</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.presetAnimations"></h2>
      <p data-i18n="animation.presetAnimationsDesc"></p>
      <div class="code-block">
        <pre><code>import { animate } from 'pulse-js-framework/runtime/animation';

// Fade In
animate(element, [
  { opacity: 0 },
  { opacity: 1 }
], { duration: 300 });

// Fade Out
animate(element, [
  { opacity: 1 },
  { opacity: 0 }
], { duration: 300, fill: 'forwards' });

// Slide In from bottom
animate(element, [
  { transform: 'translateY(30px)', opacity: 0 },
  { transform: 'translateY(0)', opacity: 1 }
], { duration: 400, easing: 'ease-out' });

// Slide Out to top
animate(element, [
  { transform: 'translateY(0)', opacity: 1 },
  { transform: 'translateY(-30px)', opacity: 0 }
], { duration: 400, easing: 'ease-in', fill: 'forwards' });

// Scale In (zoom entrance)
animate(element, [
  { transform: 'scale(0.8)', opacity: 0 },
  { transform: 'scale(1)', opacity: 1 }
], { duration: 300, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });

// Scale Out (zoom exit)
animate(element, [
  { transform: 'scale(1)', opacity: 1 },
  { transform: 'scale(0.8)', opacity: 0 }
], { duration: 200, easing: 'ease-in', fill: 'forwards' });</code></pre>
      </div>

      <h3 data-i18n="animation.reusablePresets"></h3>
      <p data-i18n="animation.reusablePresetsDesc"></p>
      <div class="code-block">
        <pre><code>// Define reusable keyframe presets
const PRESETS = {
  fadeIn:    [{ opacity: 0 }, { opacity: 1 }],
  fadeOut:   [{ opacity: 1 }, { opacity: 0 }],
  slideUp:   [{ transform: 'translateY(30px)', opacity: 0 },
              { transform: 'translateY(0)', opacity: 1 }],
  slideDown: [{ transform: 'translateY(-30px)', opacity: 0 },
              { transform: 'translateY(0)', opacity: 1 }],
  slideLeft: [{ transform: 'translateX(30px)', opacity: 0 },
              { transform: 'translateX(0)', opacity: 1 }],
  scaleIn:   [{ transform: 'scale(0.8)', opacity: 0 },
              { transform: 'scale(1)', opacity: 1 }],
  shake:     [{ transform: 'translateX(0)' },
              { transform: 'translateX(-10px)' },
              { transform: 'translateX(10px)' },
              { transform: 'translateX(-5px)' },
              { transform: 'translateX(0)' }],
};

// Use them easily
animate(card, PRESETS.slideUp, { duration: 400 });
animate(error, PRESETS.shake, { duration: 500 });</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.customKeyframes"></h2>
      <p data-i18n="animation.customKeyframesDesc"></p>
      <div class="code-block">
        <pre><code>// Multi-step keyframes with offset control
animate(element, [
  { transform: 'scale(1)', offset: 0 },
  { transform: 'scale(1.2)', offset: 0.3 },
  { transform: 'scale(0.95)', offset: 0.6 },
  { transform: 'scale(1)', offset: 1 }
], { duration: 600 });

// Property-indexed keyframes (alternative format)
animate(element, {
  opacity: [0, 0.5, 1],
  transform: ['translateX(-100px)', 'translateX(20px)', 'translateX(0)'],
  easing: ['ease-in', 'ease-out']
}, { duration: 500 });

// Bounce effect
animate(element, [
  { transform: 'translateY(0)' },
  { transform: 'translateY(-40px)' },
  { transform: 'translateY(0)' },
  { transform: 'translateY(-20px)' },
  { transform: 'translateY(0)' },
  { transform: 'translateY(-10px)' },
  { transform: 'translateY(0)' }
], { duration: 800, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' });</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.listAnimations"></h2>
      <p data-i18n="animation.listAnimationsDesc"></p>
      <div class="code-block">
        <pre><code>import { stagger } from 'pulse-js-framework/runtime/animation';
import { el } from 'pulse-js-framework/runtime';

// stagger(elements, keyframes, options)
// Animates multiple elements with a progressive delay between each.

// Options extend animate() options, plus:
//   staggerDelay: number - Delay between each element in ms (default: 50)

const items = document.querySelectorAll('.list-item');

// Fade in items one by one with 80ms stagger
const controls = stagger(Array.from(items), [
  { opacity: 0, transform: 'translateY(20px)' },
  { opacity: 1, transform: 'translateY(0)' }
], {
  duration: 400,
  easing: 'ease-out',
  staggerDelay: 80      // 80ms between each element
});

// Each item starts 80ms after the previous:
// Item 0: delay 0ms
// Item 1: delay 80ms
// Item 2: delay 160ms
// Item 3: delay 240ms
// ...

// Wait for all animations to complete
await Promise.all(controls.map(c =&gt; c.finished));</code></pre>
      </div>

      <h3 data-i18n="animation.staggerWithPulse"></h3>
      <div class="code-block">
        <pre><code>import { stagger } from 'pulse-js-framework/runtime/animation';
import { el, list, pulse } from 'pulse-js-framework/runtime';

const todos = pulse([
  { id: 1, text: 'Learn Pulse' },
  { id: 2, text: 'Build something' },
  { id: 3, text: 'Ship it' }
]);

// Render list and animate on mount
function TodoList() {
  const container = el('ul.todo-list');

  list(
    () =&gt; todos.get(),
    (todo) =&gt; el('li.todo-item', todo.text),
    (todo) =&gt; todo.id
  );

  // After items are rendered, stagger-animate them
  requestAnimationFrame(() =&gt; {
    const items = container.querySelectorAll('.todo-item');
    stagger(Array.from(items), [
      { opacity: 0, transform: 'translateX(-20px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 300, staggerDelay: 60 });
  });

  return container;
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.transitions"></h2>
      <p data-i18n="animation.transitionsDesc"></p>
      <div class="code-block">
        <pre><code>import { useTransition } from 'pulse-js-framework/runtime/animation';
import { el, pulse } from 'pulse-js-framework/runtime';

// useTransition(condition, options)
// Reactive enter/leave transition triggered by a condition.

// Options:
//   enter:    Keyframes for entering (default: { opacity: [0, 1] })
//   leave:    Keyframes for leaving  (default: { opacity: [1, 0] })
//   duration: Animation duration in ms
//   easing:   CSS easing function
//   onEnter:  Function that returns DOM nodes to show on enter
//   onLeave:  (optional) Function for leave content

// Returns:
//   container:  DocumentFragment to insert into DOM
//   isEntering: Pulse&lt;boolean&gt; - true during enter animation
//   isLeaving:  Pulse&lt;boolean&gt; - true during leave animation

const isVisible = pulse(false);

const { container, isEntering, isLeaving } = useTransition(
  () =&gt; isVisible.get(),
  {
    enter: [
      { opacity: 0, transform: 'translateY(-10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    leave: [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(10px)' }
    ],
    duration: 300,
    easing: 'ease-out',
    onEnter: () =&gt; el('.dropdown-menu', [
      el('a', 'Profile'),
      el('a', 'Settings'),
      el('a', 'Logout')
    ])
  }
);

// Toggle visibility
button.onclick = () =&gt; isVisible.update(v =&gt; !v);

// React to transition state
effect(() =&gt; {
  if (isEntering.get()) console.log('Entering...');
  if (isLeaving.get()) console.log('Leaving...');
});</code></pre>
      </div>

      <h3 data-i18n="animation.modalTransition"></h3>
      <div class="code-block">
        <pre><code>const showModal = pulse(false);

const { container } = useTransition(
  () =&gt; showModal.get(),
  {
    enter: [
      { opacity: 0, transform: 'scale(0.9)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    leave: [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.9)' }
    ],
    duration: 250,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    onEnter: () =&gt; el('.modal-overlay', [
      el('.modal-content',
        el('h2', 'Confirm Action'),
        el('p', 'Are you sure you want to continue?'),
        el('.modal-actions', [
          el('button.btn-secondary', 'Cancel', {
            onclick: () =&gt; showModal.set(false)
          }),
          el('button.btn-primary', 'Confirm', {
            onclick: () =&gt; {
              handleConfirm();
              showModal.set(false);
            }
          })
        ])
      )
    ])
  }
);</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.useSpringHook"></h2>
      <p data-i18n="animation.useSpringHookDesc"></p>
      <div class="code-block">
        <pre><code>import { useSpring } from 'pulse-js-framework/runtime/animation';
import { el, effect, pulse } from 'pulse-js-framework/runtime';

// useSpring(target, options)
// Physics-based spring animation using damped harmonic oscillator.

// Parameters:
//   target: number | Function - Target value (or reactive function)
//
// Options:
//   stiffness: number  - Spring stiffness (default: 170)
//   damping:   number  - Damping coefficient (default: 26)
//   mass:      number  - Mass of the object (default: 1)
//   precision: number  - Settle precision threshold (default: 0.01)
//
// Returns:
//   value:       Pulse&lt;number&gt;  - Current animated value
//   isAnimating: Pulse&lt;boolean&gt; - Whether spring is still moving
//   set(n):      Function       - Set a new target value
//   dispose():   Function       - Clean up animation resources

// Basic spring
const spring = useSpring(0, {
  stiffness: 170,
  damping: 26,
  mass: 1
});

// Animate to new value
spring.set(100);

// Read the animated value reactively
effect(() =&gt; {
  element.style.transform = \`translateX(\${spring.value.get()}px)\`;
});</code></pre>
      </div>

      <h3 data-i18n="animation.reactiveSpring"></h3>
      <div class="code-block">
        <pre><code>// Spring that follows a reactive target automatically
const mouseX = pulse(0);
const mouseY = pulse(0);

const springX = useSpring(() =&gt; mouseX.get(), { stiffness: 120, damping: 20 });
const springY = useSpring(() =&gt; mouseY.get(), { stiffness: 120, damping: 20 });

document.addEventListener('mousemove', (e) =&gt; {
  mouseX.set(e.clientX);
  mouseY.set(e.clientY);
});

// Cursor follower with spring physics
effect(() =&gt; {
  follower.style.transform =
    \`translate(\${springX.value.get()}px, \${springY.value.get()}px)\`;
});</code></pre>
      </div>

      <h3 data-i18n="animation.springPresets"></h3>
      <div class="code-block">
        <pre><code>// Common spring configurations
const SPRINGS = {
  // Gentle, slow settle (e.g., page transitions)
  gentle:  { stiffness: 100, damping: 20, mass: 1 },

  // Default, balanced feel
  default: { stiffness: 170, damping: 26, mass: 1 },

  // Snappy, responsive (e.g., toggles, buttons)
  snappy:  { stiffness: 300, damping: 30, mass: 1 },

  // Bouncy, playful (e.g., notifications, badges)
  bouncy:  { stiffness: 400, damping: 15, mass: 1 },

  // Heavy, slow (e.g., dragging large elements)
  heavy:   { stiffness: 120, damping: 30, mass: 3 },
};

const scale = useSpring(1, SPRINGS.bouncy);
button.onmouseenter = () =&gt; scale.set(1.1);
button.onmouseleave = () =&gt; scale.set(1);

effect(() =&gt; {
  button.style.transform = \`scale(\${scale.value.get()})\`;
});</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.reducedMotion"></h2>
      <p data-i18n="animation.reducedMotionDesc"></p>
      <div class="code-block">
        <pre><code>import { configureAnimations } from 'pulse-js-framework/runtime/animation';
import { prefersReducedMotion } from 'pulse-js-framework/runtime/a11y';

// By default, Pulse respects the user's OS preference.
// When prefers-reduced-motion is enabled:
//   - animate() returns a no-op control (duration effectively 0)
//   - stagger() returns no-op controls for each element
//   - useTransition() shows/hides content instantly (no animation)
//   - useSpring() snaps to target value immediately

// Check the preference manually
if (prefersReducedMotion()) {
  console.log('User prefers reduced motion');
}

// Override: force animations even when user prefers reduced motion
// (NOT recommended - only for critical UI feedback)
configureAnimations({ respectReducedMotion: false });

// Disable all animations globally (e.g., for testing)
configureAnimations({ disabled: true });

// Re-enable
configureAnimations({ disabled: false });</code></pre>
      </div>
      <div class="info-box">
        <p data-i18n="animation.reducedMotionInfo"></p>
        <ul>
          <li data-i18n="animation.reducedMotionTip1"></li>
          <li data-i18n="animation.reducedMotionTip2"></li>
          <li data-i18n="animation.reducedMotionTip3"></li>
        </ul>
      </div>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.apiReference"></h2>

      <h3>configureAnimations(options)</h3>
      <p data-i18n="animation.configureDesc"></p>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="animation.param"></th>
              <th data-i18n="animation.type"></th>
              <th data-i18n="animation.description"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>options.respectReducedMotion</code></td>
              <td><code>boolean</code></td>
              <td data-i18n="animation.apiRespectDesc"></td>
            </tr>
            <tr>
              <td><code>options.defaultDuration</code></td>
              <td><code>number</code></td>
              <td data-i18n="animation.apiDurationDesc"></td>
            </tr>
            <tr>
              <td><code>options.defaultEasing</code></td>
              <td><code>string</code></td>
              <td data-i18n="animation.apiEasingDesc"></td>
            </tr>
            <tr>
              <td><code>options.disabled</code></td>
              <td><code>boolean</code></td>
              <td data-i18n="animation.apiDisabledDesc"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>animate(element, keyframes, options)</h3>
      <p data-i18n="animation.animateDesc"></p>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="animation.param"></th>
              <th data-i18n="animation.type"></th>
              <th data-i18n="animation.description"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>element</code></td>
              <td><code>HTMLElement</code></td>
              <td data-i18n="animation.apiElementDesc"></td>
            </tr>
            <tr>
              <td><code>keyframes</code></td>
              <td><code>Array | Object</code></td>
              <td data-i18n="animation.apiKeyframesDesc"></td>
            </tr>
            <tr>
              <td><code>options.duration</code></td>
              <td><code>number</code></td>
              <td data-i18n="animation.apiOptDurationDesc"></td>
            </tr>
            <tr>
              <td><code>options.easing</code></td>
              <td><code>string</code></td>
              <td data-i18n="animation.apiOptEasingDesc"></td>
            </tr>
            <tr>
              <td><code>options.fill</code></td>
              <td><code>string</code></td>
              <td data-i18n="animation.apiOptFillDesc"></td>
            </tr>
            <tr>
              <td><code>options.delay</code></td>
              <td><code>number</code></td>
              <td data-i18n="animation.apiOptDelayDesc"></td>
            </tr>
            <tr>
              <td><code>options.iterations</code></td>
              <td><code>number</code></td>
              <td data-i18n="animation.apiOptIterationsDesc"></td>
            </tr>
            <tr>
              <td><code>options.direction</code></td>
              <td><code>string</code></td>
              <td data-i18n="animation.apiOptDirectionDesc"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>stagger(elements, keyframes, options)</h3>
      <p data-i18n="animation.staggerDesc"></p>
      <div class="table-responsive">
        <table class="api-table">
          <thead>
            <tr>
              <th data-i18n="animation.param"></th>
              <th data-i18n="animation.type"></th>
              <th data-i18n="animation.description"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>elements</code></td>
              <td><code>Array&lt;HTMLElement&gt;</code></td>
              <td data-i18n="animation.apiStaggerElementsDesc"></td>
            </tr>
            <tr>
              <td><code>keyframes</code></td>
              <td><code>Array | Object</code></td>
              <td data-i18n="animation.apiStaggerKeyframesDesc"></td>
            </tr>
            <tr>
              <td><code>options.staggerDelay</code></td>
              <td><code>number</code></td>
              <td data-i18n="animation.apiStaggerDelayDesc"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>useTransition(condition, options)</h3>
      <p data-i18n="animation.useTransitionDesc"></p>

      <h3>useSpring(target, options)</h3>
      <p data-i18n="animation.useSpringDesc"></p>
    </section>

    <section class="doc-section">
      <h2 data-i18n="animation.fullExample"></h2>
      <p data-i18n="animation.fullExampleDesc"></p>
      <div class="code-block">
        <pre><code>import { el, mount, pulse, effect, list } from 'pulse-js-framework/runtime';
import {
  animate, stagger, useTransition, useSpring, configureAnimations
} from 'pulse-js-framework/runtime/animation';

// Respect user preferences
configureAnimations({
  respectReducedMotion: true,
  defaultDuration: 300,
  defaultEasing: 'ease-out'
});

// --- State ---
const notifications = pulse([]);
const showPanel = pulse(false);

// --- Add Notification with Animation ---
function addNotification(message) {
  const id = Date.now();
  notifications.update(n =&gt; [...n, { id, message }]);

  // Animate the new notification after render
  requestAnimationFrame(() =&gt; {
    const el = document.querySelector(\`[data-id="\${id}"]\`);
    if (el) {
      animate(el, [
        { opacity: 0, transform: 'translateX(100%)' },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 400, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
    }
  });

  // Auto-dismiss after 3 seconds
  setTimeout(() =&gt; removeNotification(id), 3000);
}

function removeNotification(id) {
  const el = document.querySelector(\`[data-id="\${id}"]\`);
  if (el) {
    const ctrl = animate(el, [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(100%)' }
    ], { duration: 300, fill: 'forwards' });

    ctrl.finished.then(() =&gt; {
      notifications.update(n =&gt; n.filter(x =&gt; x.id !== id));
    });
  } else {
    notifications.update(n =&gt; n.filter(x =&gt; x.id !== id));
  }
}

// --- Sliding Panel with useTransition ---
const { container: panelContainer } = useTransition(
  () =&gt; showPanel.get(),
  {
    enter: [
      { transform: 'translateX(100%)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 }
    ],
    leave: [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(100%)', opacity: 0 }
    ],
    duration: 350,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    onEnter: () =&gt; el('.side-panel',
      el('h3', 'Settings'),
      el('p', 'Panel content here'),
      el('button', 'Close', {
        onclick: () =&gt; showPanel.set(false)
      })
    )
  }
);

// --- Spring-Animated Counter ---
const count = pulse(0);
const springCount = useSpring(() =&gt; count.get(), {
  stiffness: 200,
  damping: 22
});

// --- App ---
const App = () =&gt; el('.app', [
  el('h1', 'Animation Demo'),

  // Spring counter
  el('.counter-section', [
    el('h2', () =&gt; \`Count: \${Math.round(springCount.value.get())}\`),
    el('button', '+10', { onclick: () =&gt; count.update(n =&gt; n + 10) }),
    el('button', 'Reset', { onclick: () =&gt; count.set(0) })
  ]),

  // Notification trigger
  el('button', 'Add Notification', {
    onclick: () =&gt; addNotification('Something happened!')
  }),

  // Panel toggle
  el('button', 'Toggle Panel', {
    onclick: () =&gt; showPanel.update(v =&gt; !v)
  }),

  // Notifications container
  el('.notifications',
    list(
      () =&gt; notifications.get(),
      (n) =&gt; el('.notification', { 'data-id': n.id }, n.message),
      (n) =&gt; n.id
    )
  )
]);

mount('#app', App());</code></pre>
      </div>
    </section>
  `;

  // Apply i18n translations
  effect(() => {
    locale.get();
    translations.get();
    page.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    page.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  });

  return page;
}
