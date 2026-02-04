/**
 * Pulse Documentation - Migration from React Page
 */

import { el } from '/runtime/index.js';
import { t, navigateLocale } from '../state.js';

export function MigrationReactPage() {
  const page = el('.page.docs-page.migration-page');

  page.innerHTML = `
    <h1>${t('migrationReact.title')}</h1>
    <p class="intro">${t('migrationReact.intro')}</p>

    <!-- Quick Comparison -->
    <section class="doc-section">
      <h2>${t('migrationReact.quickComparison')}</h2>
      <p>${t('migrationReact.quickComparisonDesc')}</p>

      <div class="comparison-grid">
        <div class="comparison-box react-box">
          <div class="comparison-header">
            <span class="framework-icon">⚛️</span>
            <h3>React</h3>
          </div>
          <ul>
            <li>Virtual DOM diffing</li>
            <li>JSX syntax</li>
            <li>useState, useEffect hooks</li>
            <li>~45kb gzipped</li>
            <li>Build step required</li>
          </ul>
        </div>
        <div class="comparison-box pulse-box">
          <div class="comparison-header">
            <span class="framework-icon">⚡</span>
            <h3>Pulse</h3>
          </div>
          <ul>
            <li>Direct DOM updates</li>
            <li>CSS selector syntax</li>
            <li>pulse(), effect()</li>
            <li>~4kb gzipped</li>
            <li>No build required</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- State Management -->
    <section class="doc-section">
      <h2>${t('migrationReact.stateManagement')}</h2>
      <p>${t('migrationReact.stateManagementDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React - useState</div>
          <pre><code>import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    &lt;div&gt;
      &lt;h1&gt;Count: {count}&lt;/h1&gt;
      &lt;button onClick={() => setCount(c => c + 1)}&gt;
        Increment
      &lt;/button&gt;
    &lt;/div&gt;
  );
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - pulse()</div>
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
        <strong>💡 ${t('migrationReact.tip')}:</strong> ${t('migrationReact.stateTip')}
      </div>
    </section>

    <!-- Effects / Side Effects -->
    <section class="doc-section">
      <h2>${t('migrationReact.effects')}</h2>
      <p>${t('migrationReact.effectsDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React - useEffect</div>
          <pre><code>import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(\`/api/users/\${userId}\`)
      .then(r => r.json())
      .then(data => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);  // Dependency array

  if (loading) return &lt;div&gt;Loading...&lt;/div&gt;;
  return &lt;div&gt;{user.name}&lt;/div&gt;;
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - effect()</div>
          <pre><code>import { pulse, effect, el } from 'pulse-js-framework';

function UserProfile(userId) {
  const user = pulse(null);
  const loading = pulse(true);
  const div = el('.user-profile');

  // Auto-tracks userId changes
  effect(() => {
    loading.set(true);
    fetch(\`/api/users/\${userId.get()}\`)
      .then(r => r.json())
      .then(data => {
        user.set(data);
        loading.set(false);
      });
  });

  effect(() => {
    div.innerHTML = loading.get()
      ? 'Loading...'
      : user.get()?.name;
  });

  return div;
}</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationReact.tip')}:</strong> ${t('migrationReact.effectTip')}
      </div>
    </section>

    <!-- Computed Values -->
    <section class="doc-section">
      <h2>${t('migrationReact.computed')}</h2>
      <p>${t('migrationReact.computedDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React - useMemo</div>
          <pre><code>import { useState, useMemo } from 'react';

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');

  const filteredTodos = useMemo(() => {
    return todos.filter(todo => {
      if (filter === 'active') return !todo.done;
      if (filter === 'done') return todo.done;
      return true;
    });
  }, [todos, filter]);

  return (
    &lt;ul&gt;
      {filteredTodos.map(todo => (
        &lt;li key={todo.id}&gt;{todo.text}&lt;/li&gt;
      ))}
    &lt;/ul&gt;
  );
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - computed()</div>
          <pre><code>import { pulse, computed, el, list } from 'pulse-js-framework';

function TodoList() {
  const todos = pulse([]);
  const filter = pulse('all');

  const filteredTodos = computed(() => {
    return todos.get().filter(todo => {
      const f = filter.get();
      if (f === 'active') return !todo.done;
      if (f === 'done') return todo.done;
      return true;
    });
  });

  const ul = el('ul');
  list(
    filteredTodos,
    todo => el('li', todo.text),
    todo => todo.id
  ).forEach(li => ul.appendChild(li));

  return ul;
}</code></pre>
        </div>
      </div>
    </section>

    <!-- Components -->
    <section class="doc-section">
      <h2>${t('migrationReact.components')}</h2>
      <p>${t('migrationReact.componentsDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React - JSX Component</div>
          <pre><code>function Button({ onClick, variant, children }) {
  return (
    &lt;button
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
    &gt;
      {children}
    &lt;/button&gt;
  );
}

// Usage
&lt;Button variant="primary" onClick={handleClick}&gt;
  Click me
&lt;/Button&gt;</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - Function Component</div>
          <pre><code>function Button({ onClick, variant, text }) {
  const btn = el(\`button.btn.btn-\${variant}\`, text);
  btn.onclick = onClick;
  return btn;
}

// Usage
const myBtn = Button({
  variant: 'primary',
  onClick: handleClick,
  text: 'Click me'
});</code></pre>
        </div>
      </div>
    </section>

    <!-- Conditional Rendering -->
    <section class="doc-section">
      <h2>${t('migrationReact.conditionalRendering')}</h2>
      <p>${t('migrationReact.conditionalRenderingDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React - Ternary / &&</div>
          <pre><code>function Modal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    &lt;div className="modal"&gt;
      &lt;div className="modal-content"&gt;
        &lt;h2&gt;Modal Title&lt;/h2&gt;
        {user && &lt;p&gt;Welcome, {user.name}&lt;/p&gt;}
        &lt;button onClick={onClose}&gt;Close&lt;/button&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - when()</div>
          <pre><code>import { when, el, pulse } from 'pulse-js-framework';

function Modal(isOpen, onClose, user) {
  return when(
    isOpen,
    () => {
      const modal = el('.modal');
      const content = el('.modal-content');

      content.appendChild(el('h2', 'Modal Title'));

      when(user, () => el('p', \`Welcome, \${user.get().name}\`))
        .forEach(p => content.appendChild(p));

      const closeBtn = el('button', 'Close');
      closeBtn.onclick = onClose;
      content.appendChild(closeBtn);

      modal.appendChild(content);
      return modal;
    }
  );
}</code></pre>
        </div>
      </div>
    </section>

    <!-- Lists -->
    <section class="doc-section">
      <h2>${t('migrationReact.lists')}</h2>
      <p>${t('migrationReact.listsDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React - map()</div>
          <pre><code>function UserList({ users }) {
  return (
    &lt;ul&gt;
      {users.map(user => (
        &lt;li key={user.id}&gt;
          &lt;img src={user.avatar} alt={user.name} /&gt;
          &lt;span&gt;{user.name}&lt;/span&gt;
        &lt;/li&gt;
      ))}
    &lt;/ul&gt;
  );
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - list()</div>
          <pre><code>import { list, el, pulse } from 'pulse-js-framework';

function UserList(users) {
  const ul = el('ul');

  list(
    users,
    user => {
      const li = el('li');
      li.appendChild(el(\`img[src=\${user.avatar}][alt=\${user.name}]\`));
      li.appendChild(el('span', user.name));
      return li;
    },
    user => user.id  // Key function
  );

  return ul;
}</code></pre>
        </div>
      </div>
    </section>

    <!-- Forms -->
    <section class="doc-section">
      <h2>${t('migrationReact.forms')}</h2>
      <p>${t('migrationReact.formsDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React - Controlled Inputs</div>
          <pre><code>function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validation & submit...
  };

  return (
    &lt;form onSubmit={handleSubmit}&gt;
      &lt;input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      /&gt;
      {errors.email && &lt;span&gt;{errors.email}&lt;/span&gt;}

      &lt;input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      /&gt;

      &lt;button type="submit"&gt;Login&lt;/button&gt;
    &lt;/form&gt;
  );
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - useForm()</div>
          <pre><code>import { useForm, validators, el } from 'pulse-js-framework';

function LoginForm() {
  const { fields, handleSubmit, isValid } = useForm(
    { email: '', password: '' },
    {
      email: [validators.required(), validators.email()],
      password: [validators.required(), validators.minLength(8)]
    },
    { onSubmit: (values) => login(values) }
  );

  const form = el('form');

  const emailInput = el('input[type=email]');
  model(emailInput, fields.email.value);
  form.appendChild(emailInput);

  const pwInput = el('input[type=password]');
  model(pwInput, fields.password.value);
  form.appendChild(pwInput);

  const btn = el('button[type=submit]', 'Login');
  form.appendChild(btn);
  form.onsubmit = handleSubmit;

  return form;
}</code></pre>
        </div>
      </div>
    </section>

    <!-- Context / Global State -->
    <section class="doc-section">
      <h2>${t('migrationReact.globalState')}</h2>
      <p>${t('migrationReact.globalStateDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React - Context + useContext</div>
          <pre><code>// ThemeContext.js
const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  return (
    &lt;ThemeContext.Provider value={{ theme, setTheme }}&gt;
      {children}
    &lt;/ThemeContext.Provider&gt;
  );
}

// Component.js
function Header() {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    &lt;button onClick={() => setTheme(
      theme === 'light' ? 'dark' : 'light'
    )}&gt;
      Toggle Theme
    &lt;/button&gt;
  );
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse - createStore()</div>
          <pre><code>// store.js
import { createStore, createActions } from 'pulse-js-framework';

export const store = createStore({
  theme: 'light'
}, { persist: true });

export const actions = createActions(store, {
  toggleTheme: (store) => {
    store.theme.update(t =>
      t === 'light' ? 'dark' : 'light'
    );
  }
});

// Header.js
import { store, actions } from './store.js';

function Header() {
  const btn = el('button', 'Toggle Theme');
  btn.onclick = actions.toggleTheme;
  return btn;
}</code></pre>
        </div>
      </div>

      <div class="migration-tip">
        <strong>💡 ${t('migrationReact.tip')}:</strong> ${t('migrationReact.storeTip')}
      </div>
    </section>

    <!-- Routing -->
    <section class="doc-section">
      <h2>${t('migrationReact.routing')}</h2>
      <p>${t('migrationReact.routingDesc')}</p>

      <div class="code-comparison">
        <div class="code-block">
          <div class="code-header">⚛️ React Router</div>
          <pre><code>import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function App() {
  return (
    &lt;BrowserRouter&gt;
      &lt;nav&gt;
        &lt;Link to="/"&gt;Home&lt;/Link&gt;
        &lt;Link to="/users"&gt;Users&lt;/Link&gt;
      &lt;/nav&gt;
      &lt;Routes&gt;
        &lt;Route path="/" element={&lt;Home /&gt;} /&gt;
        &lt;Route path="/users" element={&lt;Users /&gt;} /&gt;
        &lt;Route path="/users/:id" element={&lt;UserDetail /&gt;} /&gt;
      &lt;/Routes&gt;
    &lt;/BrowserRouter&gt;
  );
}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header">⚡ Pulse Router</div>
          <pre><code>import { createRouter, lazy } from 'pulse-js-framework';

const router = createRouter({
  routes: {
    '/': HomePage,
    '/users': UsersPage,
    '/users/:id': UserDetailPage,
    '/dashboard': lazy(() => import('./Dashboard.js'))
  },
  mode: 'history'
});

// Navigation
router.navigate('/users/123');

// Access params
router.params.get(); // { id: '123' }

// Mount
router.outlet('#app');</code></pre>
        </div>
      </div>
    </section>

    <!-- Cheat Sheet -->
    <section class="doc-section">
      <h2>${t('migrationReact.cheatSheet')}</h2>
      <p>${t('migrationReact.cheatSheetDesc')}</p>

      <div class="cheat-sheet">
        <table>
          <thead>
            <tr>
              <th>React</th>
              <th>Pulse</th>
              <th>${t('migrationReact.notes')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>useState(0)</code></td>
              <td><code>pulse(0)</code></td>
              <td>${t('migrationReact.cheatState')}</td>
            </tr>
            <tr>
              <td><code>setCount(5)</code></td>
              <td><code>count.set(5)</code></td>
              <td>${t('migrationReact.cheatSet')}</td>
            </tr>
            <tr>
              <td><code>setCount(c => c + 1)</code></td>
              <td><code>count.update(c => c + 1)</code></td>
              <td>${t('migrationReact.cheatUpdate')}</td>
            </tr>
            <tr>
              <td><code>useEffect(() => {}, [deps])</code></td>
              <td><code>effect(() => {})</code></td>
              <td>${t('migrationReact.cheatEffect')}</td>
            </tr>
            <tr>
              <td><code>useMemo(() => {}, [deps])</code></td>
              <td><code>computed(() => {})</code></td>
              <td>${t('migrationReact.cheatComputed')}</td>
            </tr>
            <tr>
              <td><code>&lt;div className="foo"&gt;</code></td>
              <td><code>el('div.foo')</code></td>
              <td>${t('migrationReact.cheatElement')}</td>
            </tr>
            <tr>
              <td><code>items.map(i => ...)</code></td>
              <td><code>list(items, i => ...)</code></td>
              <td>${t('migrationReact.cheatList')}</td>
            </tr>
            <tr>
              <td><code>{condition && &lt;X /&gt;}</code></td>
              <td><code>when(condition, () => X())</code></td>
              <td>${t('migrationReact.cheatWhen')}</td>
            </tr>
            <tr>
              <td><code>useContext(Ctx)</code></td>
              <td><code>store.value.get()</code></td>
              <td>${t('migrationReact.cheatContext')}</td>
            </tr>
            <tr>
              <td><code>useRef(null)</code></td>
              <td><code>el('...')</code></td>
              <td>${t('migrationReact.cheatRef')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Step by Step Migration -->
    <section class="doc-section">
      <h2>${t('migrationReact.stepByStep')}</h2>
      <p>${t('migrationReact.stepByStepDesc')}</p>

      <div class="migration-steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>${t('migrationReact.step1Title')}</h3>
            <p>${t('migrationReact.step1Desc')}</p>
            <div class="code-block">
              <pre><code>npm install pulse-js-framework</code></pre>
            </div>
          </div>
        </div>

        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>${t('migrationReact.step2Title')}</h3>
            <p>${t('migrationReact.step2Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>${t('migrationReact.step3Title')}</h3>
            <p>${t('migrationReact.step3Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">4</div>
          <div class="step-content">
            <h3>${t('migrationReact.step4Title')}</h3>
            <p>${t('migrationReact.step4Desc')}</p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">5</div>
          <div class="step-content">
            <h3>${t('migrationReact.step5Title')}</h3>
            <p>${t('migrationReact.step5Desc')}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Common Gotchas -->
    <section class="doc-section">
      <h2>${t('migrationReact.gotchas')}</h2>

      <div class="gotcha-list">
        <div class="gotcha">
          <h3>❌ ${t('migrationReact.gotcha1Title')}</h3>
          <p>${t('migrationReact.gotcha1Desc')}</p>
          <div class="code-block">
            <pre><code>// ❌ Wrong - triggers re-render
count.set(count.get() + 1);

// ✅ Correct - functional update
count.update(c => c + 1);</code></pre>
          </div>
        </div>

        <div class="gotcha">
          <h3>❌ ${t('migrationReact.gotcha2Title')}</h3>
          <p>${t('migrationReact.gotcha2Desc')}</p>
          <div class="code-block">
            <pre><code>// ❌ Wrong - no tracking
const value = myPulse.peek();

// ✅ Correct - tracks dependency
const value = myPulse.get();</code></pre>
          </div>
        </div>

        <div class="gotcha">
          <h3>❌ ${t('migrationReact.gotcha3Title')}</h3>
          <p>${t('migrationReact.gotcha3Desc')}</p>
          <div class="code-block">
            <pre><code>// ❌ Wrong - direct mutation
items.get().push(newItem);

// ✅ Correct - create new array
items.update(arr => [...arr, newItem]);</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Need Help -->
    <section class="doc-section help-section">
      <h2>${t('migrationReact.needHelp')}</h2>
      <p>${t('migrationReact.needHelpDesc')}</p>
      <div class="help-links">
        <a href="https://github.com/vincenthirtz/pulse-js-framework/discussions" target="_blank" class="help-link">
          <span class="help-icon">💬</span>
          <span>${t('migrationReact.discussions')}</span>
        </a>
        <a href="https://github.com/vincenthirtz/pulse-js-framework/issues" target="_blank" class="help-link">
          <span class="help-icon">🐛</span>
          <span>${t('migrationReact.issues')}</span>
        </a>
      </div>
    </section>

    <div class="next-section"></div>
  `;

  // Attach click handlers programmatically for navigation buttons
  const nextSection = page.querySelector('.next-section');
  const getStartedBtn = el('button.btn.btn-primary', t('migrationReact.getStarted'));
  getStartedBtn.onclick = () => navigateLocale('/getting-started');
  const viewExamplesBtn = el('button.btn.btn-secondary', t('migrationReact.viewExamples'));
  viewExamplesBtn.onclick = () => navigateLocale('/examples');
  nextSection.append(getStartedBtn, viewExamplesBtn);

  return page;
}
