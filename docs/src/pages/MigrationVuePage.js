/**
 * Pulse Documentation - Migration from Vue Page
 */

import { el } from '/runtime/index.js';
import { t } from '../state.js';

export function MigrationVuePage() {
  const page = el('.page.docs-page.migration-page');

  page.innerHTML = `
    <h1>${t('migrationVue.title')}</h1>
    <p class="intro">${t('migrationVue.intro')}</p>

    <!-- Quick Comparison -->
    <section class="doc-section">
      <h2>${t('migrationVue.quickComparison')}</h2>
      <p>${t('migrationVue.quickComparisonDesc')}</p>

      <div class="comparison-grid">
        <div class="comparison-box vue-box">
          <div class="comparison-header">
            <span class="framework-icon">💚</span>
            <h3>Vue</h3>
          </div>
          <ul>
            <li>Component-based with SFCs</li>
            <li>Template syntax with directives</li>
            <li>Composition API or Options API</li>
            <li>~33kb gzipped</li>
            <li>Build step recommended</li>
          </ul>
        </div>
        <div class="comparison-box pulse-box">
          <div class="comparison-header">
            <span class="framework-icon">⚡</span>
            <h3>Pulse</h3>
          </div>
          <ul>
            <li>Functions with CSS selectors</li>
            <li>JavaScript with helpers</li>
            <li>Pulses & effects only</li>
            <li>~4kb gzipped</li>
            <li>No build required</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Reactivity -->
    <section class="doc-section">
      <h2>${t('migrationVue.reactivity')}</h2>
      <p>${t('migrationVue.reactivityDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - Composition API</div>
          <pre><code>import { ref, reactive, computed } from 'vue';

// Primitive ref
const count = ref(0);
console.log(count.value);  // Read
count.value = 5;           // Write

// Object reactive
const state = reactive({
  name: 'John',
  age: 25
});
state.name = 'Jane';       // Direct mutation

// Computed
const doubled = computed(() => count.value * 2);</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Signals</div>
          <pre><code>import { pulse, computed } from 'pulse-js-framework';

// Pulse (works for any value)
const count = pulse(0);
console.log(count.get());  // Read
count.set(5);              // Write

// Object pulse
const state = pulse({
  name: 'John',
  age: 25
});
state.update(s => ({ ...s, name: 'Jane' }));

// Computed
const doubled = computed(() => count.get() * 2);</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationVue.tip')}:</strong> ${t('migrationVue.reactivityTip')}
      </div>
    </section>

    <!-- Component Structure -->
    <section class="doc-section">
      <h2>${t('migrationVue.componentStructure')}</h2>
      <p>${t('migrationVue.componentStructureDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - SFC</div>
          <pre><code>&lt;script setup&gt;
import { ref } from 'vue';

const count = ref(0);

function increment() {
  count.value++;
}
&lt;/script&gt;

&lt;template&gt;
  &lt;div class="counter"&gt;
    &lt;h1&gt;Count: {{ count }}&lt;/h1&gt;
    &lt;button @click="increment"&gt;
      Increment
    &lt;/button&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;style scoped&gt;
.counter { padding: 20px; }
&lt;/style&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Function</div>
          <pre><code>import { pulse, effect, el } from 'pulse-js-framework';

function Counter() {
  const count = pulse(0);
  const div = el('.counter');

  const h1 = el('h1');
  effect(() => {
    h1.textContent = \`Count: \${count.get()}\`;
  });

  const btn = el('button', 'Increment');
  btn.onclick = () => count.update(c => c + 1);

  div.append(h1, btn);
  return div;
}</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationVue.tip')}:</strong> ${t('migrationVue.componentTip')}
      </div>
    </section>

    <!-- Watchers vs Effects -->
    <section class="doc-section">
      <h2>${t('migrationVue.watchers')}</h2>
      <p>${t('migrationVue.watchersDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - watch/watchEffect</div>
          <pre><code>import { ref, watch, watchEffect } from 'vue';

const count = ref(0);
const name = ref('John');

// Watch specific ref
watch(count, (newValue, oldValue) => {
  console.log(\`Count: \${oldValue} -> \${newValue}\`);
});

// Watch multiple
watch([count, name], ([c, n], [oldC, oldN]) => {
  console.log(\`Count: \${c}, Name: \${n}\`);
});

// Auto-track (like effect)
watchEffect(() => {
  console.log(\`Count is: \${count.value}\`);
});

// Cleanup
watchEffect((onCleanup) => {
  const id = setInterval(() => count.value++, 1000);
  onCleanup(() => clearInterval(id));
});</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - effect</div>
          <pre><code>import { pulse, effect } from 'pulse-js-framework';

const count = pulse(0);
const name = pulse('John');

// Auto-track any pulse read inside
effect(() => {
  console.log(\`Count is: \${count.get()}\`);
});

// Multiple dependencies - automatic!
effect(() => {
  console.log(\`Count: \${count.get()}, Name: \${name.get()}\`);
});

// Cleanup - return a function
effect(() => {
  const id = setInterval(() => count.update(c => c + 1), 1000);
  return () => clearInterval(id);
});

// No watch() needed - effect() handles all cases!</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationVue.tip')}:</strong> ${t('migrationVue.watchersTip')}
      </div>
    </section>

    <!-- Template Directives -->
    <section class="doc-section">
      <h2>${t('migrationVue.directives')}</h2>
      <p>${t('migrationVue.directivesDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - v-if / v-for</div>
          <pre><code>&lt;template&gt;
  &lt;!-- Conditional rendering --&gt;
  &lt;div v-if="loading"&gt;Loading...&lt;/div&gt;
  &lt;div v-else-if="error"&gt;Error: {{ error }}&lt;/div&gt;
  &lt;div v-else&gt;{{ data }}&lt;/div&gt;

  &lt;!-- v-show (CSS toggle) --&gt;
  &lt;div v-show="visible"&gt;I'm visible&lt;/div&gt;

  &lt;!-- List rendering --&gt;
  &lt;ul&gt;
    &lt;li v-for="item in items" :key="item.id"&gt;
      {{ item.name }}
    &lt;/li&gt;
  &lt;/ul&gt;

  &lt;!-- Two-way binding --&gt;
  &lt;input v-model="username"&gt;
&lt;/template&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - when / list</div>
          <pre><code>import { when, list, el, model, pulse } from 'pulse-js-framework';

// Conditional rendering
when(
  () => loading.get(),
  () => el('div', 'Loading...'),
  () => when(
    () => error.get(),
    () => el('div', \`Error: \${error.get()}\`),
    () => el('div', data.get())
  )
);

// Show/hide (CSS toggle)
effect(() => {
  el.style.display = visible.get() ? '' : 'none';
});

// List rendering
const ul = el('ul');
list(
  () => items.get(),
  item => el('li', item.name),
  item => item.id  // key function
);

// Two-way binding
const input = el('input');
model(input, username);</code></pre>
        </div>
      </div>
    </section>

    <!-- Props & Events -->
    <section class="doc-section">
      <h2>${t('migrationVue.propsEvents')}</h2>
      <p>${t('migrationVue.propsEventsDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - Props & Emit</div>
          <pre><code>&lt;!-- Parent.vue --&gt;
&lt;template&gt;
  &lt;Child
    :message="msg"
    :count="count"
    @update="handleUpdate"
    @close="handleClose"
  /&gt;
&lt;/template&gt;

&lt;!-- Child.vue --&gt;
&lt;script setup&gt;
const props = defineProps({
  message: String,
  count: { type: Number, default: 0 }
});

const emit = defineEmits(['update', 'close']);

function onClick() {
  emit('update', props.count + 1);
}
&lt;/script&gt;

&lt;template&gt;
  &lt;div&gt;
    &lt;p&gt;{{ message }}&lt;/p&gt;
    &lt;button @click="onClick"&gt;Update&lt;/button&gt;
    &lt;button @click="emit('close')"&gt;Close&lt;/button&gt;
  &lt;/div&gt;
&lt;/template&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Function Args</div>
          <pre><code>// Parent.js
import { Child } from './Child.js';

function Parent() {
  const msg = pulse('Hello');
  const count = pulse(0);

  const child = Child({
    message: msg,
    count: count,
    onUpdate: (newCount) => count.set(newCount),
    onClose: () => console.log('Closed')
  });

  return el('div', child);
}

// Child.js
export function Child({ message, count, onUpdate, onClose }) {
  const div = el('div');

  const p = el('p');
  effect(() => p.textContent = message.get());

  const updateBtn = el('button', 'Update');
  updateBtn.onclick = () => onUpdate(count.get() + 1);

  const closeBtn = el('button', 'Close');
  closeBtn.onclick = onClose;

  div.append(p, updateBtn, closeBtn);
  return div;
}</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationVue.tip')}:</strong> ${t('migrationVue.propsEventsTip')}
      </div>
    </section>

    <!-- Provide/Inject vs Stores -->
    <section class="doc-section">
      <h2>${t('migrationVue.provideInject')}</h2>
      <p>${t('migrationVue.provideInjectDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - Provide/Inject</div>
          <pre><code>// Parent.vue
&lt;script setup&gt;
import { provide, ref } from 'vue';

const theme = ref('dark');
provide('theme', theme);
&lt;/script&gt;

// DeepChild.vue
&lt;script setup&gt;
import { inject } from 'vue';

const theme = inject('theme');
// Or with Pinia store
import { useUserStore } from './stores/user';
const userStore = useUserStore();
&lt;/script&gt;

// stores/user.js (Pinia)
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    loggedIn: false
  }),
  actions: {
    login(name) {
      this.name = name;
      this.loggedIn = true;
    }
  }
});</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - createStore</div>
          <pre><code>// stores/theme.js
import { pulse } from 'pulse-js-framework';

export const theme = pulse('dark');

// Any component
import { theme } from './stores/theme.js';
effect(() => console.log(theme.get()));

// stores/user.js
import { createStore, createActions } from 'pulse-js-framework';

export const userStore = createStore({
  name: '',
  loggedIn: false
}, { persist: true });

export const userActions = createActions(userStore, {
  login: (store, name) => {
    store.name.set(name);
    store.loggedIn.set(true);
  }
});

// Any component - just import!
import { userStore, userActions } from './stores/user.js';

userActions.login('John');
console.log(userStore.name.get());</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationVue.tip')}:</strong> ${t('migrationVue.provideInjectTip')}
      </div>
    </section>

    <!-- Lifecycle Hooks -->
    <section class="doc-section">
      <h2>${t('migrationVue.lifecycle')}</h2>
      <p>${t('migrationVue.lifecycleDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - Lifecycle Hooks</div>
          <pre><code>import {
  onMounted,
  onUpdated,
  onUnmounted,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount
} from 'vue';

onBeforeMount(() => {
  console.log('Before mount');
});

onMounted(() => {
  console.log('Mounted');
  // DOM is available
  fetchData();
});

onUpdated(() => {
  console.log('Updated');
});

onBeforeUnmount(() => {
  console.log('Before unmount');
});

onUnmounted(() => {
  console.log('Unmounted');
  // Cleanup subscriptions
});</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - effect cleanup</div>
          <pre><code>import { effect } from 'pulse-js-framework';

function MyComponent() {
  // "Mounted" - runs immediately
  console.log('Component created');
  fetchData();

  // Effects run immediately and track dependencies
  effect(() => {
    console.log('Data changed:', data.get());

    // "Unmounted" - cleanup function
    return () => {
      console.log('Cleanup / unmount');
    };
  });

  // For subscriptions
  effect(() => {
    const ws = new WebSocket(url.get());
    ws.onmessage = handleMessage;

    // Cleanup on value change or unmount
    return () => ws.close();
  });

  return el('div');
}</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationVue.tip')}:</strong> ${t('migrationVue.lifecycleTip')}
      </div>
    </section>

    <!-- Slots -->
    <section class="doc-section">
      <h2>${t('migrationVue.slots')}</h2>
      <p>${t('migrationVue.slotsDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - Slots</div>
          <pre><code>&lt;!-- Card.vue --&gt;
&lt;template&gt;
  &lt;div class="card"&gt;
    &lt;header&gt;
      &lt;slot name="header"&gt;Default Header&lt;/slot&gt;
    &lt;/header&gt;
    &lt;main&gt;
      &lt;slot&gt;Default content&lt;/slot&gt;
    &lt;/main&gt;
    &lt;footer&gt;
      &lt;slot name="footer"&gt;&lt;/slot&gt;
    &lt;/footer&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;!-- Usage --&gt;
&lt;Card&gt;
  &lt;template #header&gt;
    &lt;h2&gt;My Title&lt;/h2&gt;
  &lt;/template&gt;

  &lt;p&gt;Card content here&lt;/p&gt;

  &lt;template #footer&gt;
    &lt;button&gt;Save&lt;/button&gt;
  &lt;/template&gt;
&lt;/Card&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Children/Render Props</div>
          <pre><code>// Card.js
function Card({ header, children, footer }) {
  const card = el('.card');

  const headerEl = el('header');
  headerEl.append(header || 'Default Header');
  card.append(headerEl);

  const main = el('main');
  main.append(children || 'Default content');
  card.append(main);

  if (footer) {
    const footerEl = el('footer');
    footerEl.append(footer);
    card.append(footerEl);
  }

  return card;
}

// Usage
Card({
  header: el('h2', 'My Title'),
  children: el('p', 'Card content here'),
  footer: el('button', 'Save')
});

// Or with render functions
Card({
  header: () => el('h2', title.get()),
  children: () => list(() => items.get(), renderItem)
});</code></pre>
        </div>
      </div>
    </section>

    <!-- Routing -->
    <section class="doc-section">
      <h2>${t('migrationVue.routing')}</h2>
      <p>${t('migrationVue.routingDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue Router</div>
          <pre><code>// router.js
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/users/:id', component: User },
    {
      path: '/admin',
      component: () => import('./Admin.vue'),
      meta: { requiresAuth: true },
      beforeEnter: (to, from) => {
        if (!isAuth()) return '/login';
      }
    }
  ]
});

router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuth()) {
    return '/login';
  }
});

// In component
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

console.log(route.params.id);
router.push('/users/123');</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse Router</div>
          <pre><code>import { createRouter, lazy } from 'pulse-js-framework';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/users/:id': UserPage,
    '/admin': {
      handler: lazy(() => import('./Admin.js')),
      meta: { requiresAuth: true },
      beforeEnter: (to, from) => {
        if (!isAuth()) return '/login';
      }
    }
  },
  mode: 'history'
});

router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuth()) {
    return '/login';
  }
});

// Anywhere in code
router.navigate('/users/123');
router.params.get();  // { id: '123' }
router.meta.get();    // { requiresAuth: true }

// Router outlet
router.outlet('#app');</code></pre>
        </div>
      </div>
    </section>

    <!-- Forms -->
    <section class="doc-section">
      <h2>${t('migrationVue.forms')}</h2>
      <p>${t('migrationVue.formsDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">💚 Vue - Forms</div>
          <pre><code>&lt;script setup&gt;
import { ref, computed } from 'vue';

const email = ref('');
const password = ref('');

const emailError = computed(() => {
  if (!email.value) return 'Required';
  if (!email.value.includes('@')) return 'Invalid email';
  return '';
});

const isValid = computed(() =>
  !emailError.value && password.value.length >= 8
);

function handleSubmit() {
  if (isValid.value) {
    console.log({ email: email.value, password: password.value });
  }
}
&lt;/script&gt;

&lt;template&gt;
  &lt;form @submit.prevent="handleSubmit"&gt;
    &lt;input v-model="email" type="email"&gt;
    &lt;span v-if="emailError"&gt;{{ emailError }}&lt;/span&gt;

    &lt;input v-model="password" type="password"&gt;

    &lt;button :disabled="!isValid"&gt;Submit&lt;/button&gt;
  &lt;/form&gt;
&lt;/template&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - useForm</div>
          <pre><code>import { useForm, validators, el, model } from 'pulse-js-framework';

function LoginForm() {
  const { fields, handleSubmit, isValid } = useForm(
    { email: '', password: '' },
    {
      email: [validators.required(), validators.email()],
      password: [validators.required(), validators.minLength(8)]
    },
    { onSubmit: (values) => console.log(values) }
  );

  const form = el('form');

  const emailInput = el('input[type=email]');
  model(emailInput, fields.email.value);
  form.appendChild(emailInput);

  when(
    () => fields.email.error.get(),
    () => el('span.error', fields.email.error.get())
  );

  const pwInput = el('input[type=password]');
  model(pwInput, fields.password.value);
  form.appendChild(pwInput);

  const btn = el('button[type=submit]', 'Submit');
  effect(() => btn.disabled = !isValid.get());
  form.appendChild(btn);

  form.onsubmit = handleSubmit;
  return form;
}</code></pre>
        </div>
      </div>
    </section>

    <!-- Cheat Sheet -->
    <section class="doc-section">
      <h2>${t('migrationVue.cheatSheet')}</h2>
      <p>${t('migrationVue.cheatSheetDesc')}</p>

      <div class="cheat-sheet">
        <table>
          <thead>
            <tr>
              <th>Vue</th>
              <th>Pulse</th>
              <th>${t('migrationVue.notes')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>ref(0)</code></td>
              <td><code>pulse(0)</code></td>
              <td>${t('migrationVue.cheatRef')}</td>
            </tr>
            <tr>
              <td><code>ref.value</code></td>
              <td><code>pulse.get()</code></td>
              <td>${t('migrationVue.cheatRead')}</td>
            </tr>
            <tr>
              <td><code>ref.value = x</code></td>
              <td><code>pulse.set(x)</code></td>
              <td>${t('migrationVue.cheatWrite')}</td>
            </tr>
            <tr>
              <td><code>reactive({ ... })</code></td>
              <td><code>pulse({ ... })</code></td>
              <td>${t('migrationVue.cheatReactive')}</td>
            </tr>
            <tr>
              <td><code>computed(() => ...)</code></td>
              <td><code>computed(() => ...)</code></td>
              <td>${t('migrationVue.cheatComputed')}</td>
            </tr>
            <tr>
              <td><code>watch() / watchEffect()</code></td>
              <td><code>effect(() => ...)</code></td>
              <td>${t('migrationVue.cheatWatch')}</td>
            </tr>
            <tr>
              <td><code>v-if="cond"</code></td>
              <td><code>when(() => cond, ...)</code></td>
              <td>${t('migrationVue.cheatIf')}</td>
            </tr>
            <tr>
              <td><code>v-for="x in items"</code></td>
              <td><code>list(() => items, ...)</code></td>
              <td>${t('migrationVue.cheatFor')}</td>
            </tr>
            <tr>
              <td><code>v-model="value"</code></td>
              <td><code>model(input, value)</code></td>
              <td>${t('migrationVue.cheatModel')}</td>
            </tr>
            <tr>
              <td><code>@click="handler"</code></td>
              <td><code>on(el, 'click', handler)</code></td>
              <td>${t('migrationVue.cheatEvent')}</td>
            </tr>
            <tr>
              <td><code>:class="{ active: x }"</code></td>
              <td><code>bind(el, 'class', () => ...)</code></td>
              <td>${t('migrationVue.cheatBind')}</td>
            </tr>
            <tr>
              <td><code>provide() / inject()</code></td>
              <td><code>export const store</code></td>
              <td>${t('migrationVue.cheatProvide')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Step by Step Migration -->
    <section class="doc-section">
      <h2>${t('migrationVue.stepByStep')}</h2>
      <p>${t('migrationVue.stepByStepDesc')}</p>

      <div class="migration-steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>${t('migrationVue.step1Title')}</h3>
            <p>${t('migrationVue.step1Desc')}</p>
            <div class="code-block">
              <pre><code>npm install pulse-js-framework</code></pre>
            </div>
          </div>
        </div>

        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>${t('migrationVue.step2Title')}</h3>
            <p>${t('migrationVue.step2Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>${t('migrationVue.step3Title')}</h3>
            <p>${t('migrationVue.step3Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3>${t('migrationVue.step4Title')}</h3>
            <p>${t('migrationVue.step4Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">5</div>
          <div class="step-content">
            <h3>${t('migrationVue.step5Title')}</h3>
            <p>${t('migrationVue.step5Desc')}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Common Gotchas -->
    <section class="doc-section">
      <h2>${t('migrationVue.gotchas')}</h2>

      <div class="gotcha-list">
        <div class="gotcha">
          <h3>${t('migrationVue.gotcha1Title')}</h3>
          <p>${t('migrationVue.gotcha1Desc')}</p>
          <div class="code-block">
            <pre><code>// Vue: ref.value
count.value++;

// Pulse: pulse.get() / pulse.set()
count.set(count.get() + 1);
// Or better: pulse.update()
count.update(c => c + 1);</code></pre>
          </div>
        </div>

        <div class="gotcha">
          <h3>${t('migrationVue.gotcha2Title')}</h3>
          <p>${t('migrationVue.gotcha2Desc')}</p>
          <div class="code-block">
            <pre><code>// Vue: direct mutation on reactive
state.items.push(newItem);

// Pulse: create new reference
items.update(arr => [...arr, newItem]);</code></pre>
          </div>
        </div>

        <div class="gotcha">
          <h3>${t('migrationVue.gotcha3Title')}</h3>
          <p>${t('migrationVue.gotcha3Desc')}</p>
          <div class="code-block">
            <pre><code>// Vue: no dependency array, but no cleanup either
watchEffect(() => { ... });

// Pulse: also no dependency array!
effect(() => {
  // Dependencies auto-tracked
  console.log(count.get());
  // Return cleanup function
  return () => cleanup();
});</code></pre>
          </div>
        </div>

        <div class="gotcha">
          <h3>${t('migrationVue.gotcha4Title')}</h3>
          <p>${t('migrationVue.gotcha4Desc')}</p>
          <div class="code-block">
            <pre><code>// Vue: SFC with &lt;template&gt;
&lt;template&gt;
  &lt;div class="container"&gt;...&lt;/div&gt;
&lt;/template&gt;

// Pulse: CSS selector syntax
const div = el('div.container');
// Creates: &lt;div class="container"&gt;</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Need Help -->
    <section class="doc-section help-section">
      <h2>${t('migrationVue.needHelp')}</h2>
      <p>${t('migrationVue.needHelpDesc')}</p>
      <div class="help-links">
        <a href="https://github.com/vincenthirtz/pulse-js-framework/discussions" target="_blank" class="help-link">
          <span class="help-icon">💬</span>
          <span>${t('migrationVue.discussions')}</span>
        </a>
        <a href="https://github.com/vincenthirtz/pulse-js-framework/issues" target="_blank" class="help-link">
          <span class="help-icon">🐛</span>
          <span>${t('migrationVue.issues')}</span>
        </a>
      </div>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/getting-started')">
        ${t('migrationVue.getStarted')}
      </button>
      <button class="btn btn-secondary" onclick="window.docs.navigate('/examples')">
        ${t('migrationVue.viewExamples')}
      </button>
    </div>
  `;

  return page;
}
