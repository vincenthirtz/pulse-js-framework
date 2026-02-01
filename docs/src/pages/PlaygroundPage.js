/**
 * Pulse Documentation - Playground Page
 */

import { el } from '/runtime/index.js';
import { t } from '../state.js';

const defaultCode = `// Welcome to Pulse Playground!
// Write your code here and see it run in real-time

import { pulse, effect, el, mount } from '/runtime/index.js';

// Create a reactive counter
const count = pulse(0);

// Build the UI
function App() {
  const container = el('.counter-app');

  const title = el('h2', '⚡ Pulse Counter');
  container.appendChild(title);

  const display = el('.count-display');
  effect(() => {
    display.textContent = count.get();
  });
  container.appendChild(display);

  const buttons = el('.buttons');

  const decBtn = el('button.btn', '− Decrease');
  decBtn.addEventListener('click', () => count.update(n => n - 1));
  buttons.appendChild(decBtn);

  const incBtn = el('button.btn.primary', '+ Increase');
  incBtn.addEventListener('click', () => count.update(n => n + 1));
  buttons.appendChild(incBtn);

  container.appendChild(buttons);

  return container;
}

// Mount the app
mount('#app', App());
`;

const templates = {
  counter: defaultCode,
  todo: `import { pulse, effect, el, mount } from '/runtime/index.js';

const todos = pulse([]);
const inputValue = pulse('');

function App() {
  const container = el('.todo-app');

  container.appendChild(el('h2', '✅ Todo List'));

  // Input form
  const form = el('.todo-form');
  const input = el('input[type=text][placeholder="Add a task..."]');
  effect(() => { input.value = inputValue.get(); });
  input.addEventListener('input', e => inputValue.set(e.target.value));

  const addBtn = el('button.btn.primary', 'Add');
  addBtn.addEventListener('click', () => {
    const text = inputValue.get().trim();
    if (text) {
      todos.update(t => [...t, { id: Date.now(), text, done: false }]);
      inputValue.set('');
    }
  });

  form.appendChild(input);
  form.appendChild(addBtn);
  container.appendChild(form);

  // Todo list
  const list = el('.todo-list');
  effect(() => {
    list.innerHTML = '';
    for (const todo of todos.get()) {
      const item = el('.todo-item' + (todo.done ? '.done' : ''));
      item.innerHTML = \`
        <span>\${todo.text}</span>
        <button class="toggle">\${todo.done ? '↩' : '✓'}</button>
        <button class="delete">×</button>
      \`;
      item.querySelector('.toggle').onclick = () => {
        todos.update(t => t.map(x => x.id === todo.id ? {...x, done: !x.done} : x));
      };
      item.querySelector('.delete').onclick = () => {
        todos.update(t => t.filter(x => x.id !== todo.id));
      };
      list.appendChild(item);
    }
  });
  container.appendChild(list);

  return container;
}

mount('#app', App());
`,
  timer: `import { pulse, effect, el, mount } from '/runtime/index.js';

const time = pulse(0);
const running = pulse(false);
let interval = null;

function App() {
  const container = el('.timer-app');

  container.appendChild(el('h2', '⏱️ Timer'));

  const display = el('.timer-display');
  effect(() => {
    const t = time.get();
    const mins = Math.floor(t / 60).toString().padStart(2, '0');
    const secs = (t % 60).toString().padStart(2, '0');
    display.textContent = mins + ':' + secs;
  });
  container.appendChild(display);

  const buttons = el('.buttons');

  const startStop = el('button.btn.primary');
  effect(() => {
    startStop.textContent = running.get() ? '⏸ Pause' : '▶ Start';
  });
  startStop.addEventListener('click', () => {
    if (running.get()) {
      clearInterval(interval);
      running.set(false);
    } else {
      interval = setInterval(() => time.update(t => t + 1), 1000);
      running.set(true);
    }
  });
  buttons.appendChild(startStop);

  const resetBtn = el('button.btn', '↺ Reset');
  resetBtn.addEventListener('click', () => {
    clearInterval(interval);
    running.set(false);
    time.set(0);
  });
  buttons.appendChild(resetBtn);

  container.appendChild(buttons);

  return container;
}

mount('#app', App());
`,
  form: `import { pulse, effect, el, mount } from '/runtime/index.js';

const formData = pulse({ name: '', email: '', message: '' });
const submitted = pulse(false);

function App() {
  const container = el('.form-app');

  container.appendChild(el('h2', '📝 Contact Form'));

  effect(() => {
    if (submitted.get()) {
      container.innerHTML = '';
      container.appendChild(el('h2', '📝 Contact Form'));
      const success = el('.success-message');
      const data = formData.get();
      success.innerHTML = \`
        <h3>✅ Form Submitted!</h3>
        <p><strong>Name:</strong> \${data.name}</p>
        <p><strong>Email:</strong> \${data.email}</p>
        <p><strong>Message:</strong> \${data.message}</p>
      \`;
      container.appendChild(success);

      const resetBtn = el('button.btn.primary', 'Submit Another');
      resetBtn.addEventListener('click', () => {
        formData.set({ name: '', email: '', message: '' });
        submitted.set(false);
      });
      container.appendChild(resetBtn);
      return;
    }

    // Form UI
    const form = el('.contact-form');

    const nameField = el('.field');
    nameField.appendChild(el('label', 'Name'));
    const nameInput = el('input[type=text][placeholder="Your name"]');
    nameInput.value = formData.get().name;
    nameInput.addEventListener('input', e => {
      formData.update(d => ({ ...d, name: e.target.value }));
    });
    nameField.appendChild(nameInput);
    form.appendChild(nameField);

    const emailField = el('.field');
    emailField.appendChild(el('label', 'Email'));
    const emailInput = el('input[type=email][placeholder="your@email.com"]');
    emailInput.value = formData.get().email;
    emailInput.addEventListener('input', e => {
      formData.update(d => ({ ...d, email: e.target.value }));
    });
    emailField.appendChild(emailInput);
    form.appendChild(emailField);

    const msgField = el('.field');
    msgField.appendChild(el('label', 'Message'));
    const msgInput = el('textarea[placeholder="Your message..."]');
    msgInput.value = formData.get().message;
    msgInput.addEventListener('input', e => {
      formData.update(d => ({ ...d, message: e.target.value }));
    });
    msgField.appendChild(msgInput);
    form.appendChild(msgField);

    const submitBtn = el('button.btn.primary', 'Submit');
    submitBtn.addEventListener('click', () => {
      const { name, email, message } = formData.get();
      if (name && email && message) {
        submitted.set(true);
      }
    });
    form.appendChild(submitBtn);

    // Clear previous form if exists
    const existingForm = container.querySelector('.contact-form');
    if (existingForm) existingForm.remove();
    container.appendChild(form);
  });

  return container;
}

mount('#app', App());
`,
  calculator: `import { pulse, effect, el, mount } from '/runtime/index.js';

const display = pulse('0');
const operator = pulse(null);
const firstNum = pulse(null);
const waitingForSecond = pulse(false);

function calculate(a, b, op) {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 'Error';
    default: return b;
  }
}

function App() {
  const container = el('.calc-app');
  container.appendChild(el('h2', '🔢 Calculator'));

  const screen = el('.calc-display');
  effect(() => { screen.textContent = display.get(); });
  container.appendChild(screen);

  const buttons = el('.calc-buttons');
  const layout = [
    ['C', '±', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=']
  ];

  for (const row of layout) {
    const rowEl = el('.calc-row');
    for (const btn of row) {
      const isOp = ['+', '-', '*', '/', '='].includes(btn);
      const btnEl = el('button.calc-btn' + (isOp ? '.op' : '') + (btn === '0' ? '.wide' : ''), btn);
      btnEl.addEventListener('click', () => {
        if (btn >= '0' && btn <= '9' || btn === '.') {
          if (waitingForSecond.get()) {
            display.set(btn);
            waitingForSecond.set(false);
          } else {
            display.set(display.get() === '0' ? btn : display.get() + btn);
          }
        } else if (btn === 'C') {
          display.set('0');
          operator.set(null);
          firstNum.set(null);
        } else if (btn === '±') {
          display.set(String(-parseFloat(display.get())));
        } else if (btn === '%') {
          display.set(String(parseFloat(display.get()) / 100));
        } else if (['+', '-', '*', '/'].includes(btn)) {
          firstNum.set(parseFloat(display.get()));
          operator.set(btn);
          waitingForSecond.set(true);
        } else if (btn === '=') {
          if (operator.get() && firstNum.get() !== null) {
            const result = calculate(firstNum.get(), parseFloat(display.get()), operator.get());
            display.set(String(result));
            operator.set(null);
            firstNum.set(null);
          }
        }
      });
      rowEl.appendChild(btnEl);
    }
    buttons.appendChild(rowEl);
  }
  container.appendChild(buttons);
  return container;
}

mount('#app', App());
`,
  tabs: `import { pulse, effect, el, mount } from '/runtime/index.js';

const activeTab = pulse('home');

const tabsData = [
  { id: 'home', label: '🏠 Home', content: 'Welcome to the home tab! This is where your journey begins.' },
  { id: 'profile', label: '👤 Profile', content: 'Your profile information would appear here. Edit your settings and preferences.' },
  { id: 'settings', label: '⚙️ Settings', content: 'Configure your application settings. Toggle features and customize your experience.' }
];

function App() {
  const container = el('.tabs-app');
  container.appendChild(el('h2', '📑 Tab Navigation'));

  const tabBar = el('.tab-bar');
  const content = el('.tab-content');

  for (const tab of tabsData) {
    const tabBtn = el('button.tab-btn', tab.label);
    effect(() => {
      tabBtn.className = 'tab-btn' + (activeTab.get() === tab.id ? ' active' : '');
    });
    tabBtn.addEventListener('click', () => activeTab.set(tab.id));
    tabBar.appendChild(tabBtn);
  }

  effect(() => {
    const current = tabsData.find(t => t.id === activeTab.get());
    content.innerHTML = '';
    content.appendChild(el('h3', current.label));
    content.appendChild(el('p', current.content));
  });

  container.appendChild(tabBar);
  container.appendChild(content);
  return container;
}

mount('#app', App());
`,
  theme: `import { pulse, effect, el, mount } from '/runtime/index.js';

const theme = pulse('dark');
const colors = pulse(['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']);
const accent = pulse('#6366f1');

function App() {
  const container = el('.theme-app');

  effect(() => {
    const isDark = theme.get() === 'dark';
    container.style.background = isDark ? '#1e293b' : '#f8fafc';
    container.style.color = isDark ? '#e2e8f0' : '#1e293b';
  });

  container.appendChild(el('h2', '🎨 Theme Switcher'));

  // Theme toggle
  const toggle = el('.theme-toggle');
  const toggleBtn = el('button.btn.primary');
  effect(() => {
    toggleBtn.textContent = theme.get() === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
  });
  toggleBtn.addEventListener('click', () => {
    theme.update(t => t === 'dark' ? 'light' : 'dark');
  });
  toggle.appendChild(toggleBtn);
  container.appendChild(toggle);

  // Accent color picker
  const colorPicker = el('.color-picker');
  colorPicker.appendChild(el('p', 'Accent Color:'));
  const colorRow = el('.color-row');
  for (const color of colors.get()) {
    const swatch = el('.color-swatch');
    swatch.style.background = color;
    effect(() => {
      swatch.style.transform = accent.get() === color ? 'scale(1.2)' : 'scale(1)';
      swatch.style.border = accent.get() === color ? '3px solid white' : 'none';
    });
    swatch.addEventListener('click', () => accent.set(color));
    colorRow.appendChild(swatch);
  }
  colorPicker.appendChild(colorRow);
  container.appendChild(colorPicker);

  // Preview card
  const card = el('.preview-card');
  effect(() => {
    card.style.borderColor = accent.get();
    card.innerHTML = '<h3>Preview Card</h3><p>This card uses your selected accent color.</p>';
    card.querySelector('h3').style.color = accent.get();
  });
  container.appendChild(card);

  return container;
}

mount('#app', App());
`,
  search: `import { pulse, effect, el, mount } from '/runtime/index.js';

const query = pulse('');
const items = pulse([
  { id: 1, name: 'Apple', category: 'Fruit', emoji: '🍎' },
  { id: 2, name: 'Banana', category: 'Fruit', emoji: '🍌' },
  { id: 3, name: 'Carrot', category: 'Vegetable', emoji: '🥕' },
  { id: 4, name: 'Donut', category: 'Dessert', emoji: '🍩' },
  { id: 5, name: 'Eggplant', category: 'Vegetable', emoji: '🍆' },
  { id: 6, name: 'Fish', category: 'Protein', emoji: '🐟' },
  { id: 7, name: 'Grapes', category: 'Fruit', emoji: '🍇' },
  { id: 8, name: 'Hamburger', category: 'Fast Food', emoji: '🍔' }
]);

function App() {
  const container = el('.search-app');
  container.appendChild(el('h2', '🔍 Search Filter'));

  const searchBox = el('.search-box');
  const input = el('input[type=text][placeholder="Search items..."]');
  input.addEventListener('input', e => query.set(e.target.value));
  searchBox.appendChild(input);
  container.appendChild(searchBox);

  const results = el('.search-results');
  effect(() => {
    const q = query.get().toLowerCase();
    const filtered = items.get().filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
    results.innerHTML = '';

    if (filtered.length === 0) {
      results.appendChild(el('.no-results', 'No items found'));
    } else {
      const count = el('.result-count', filtered.length + ' item' + (filtered.length !== 1 ? 's' : '') + ' found');
      results.appendChild(count);

      for (const item of filtered) {
        const card = el('.item-card');
        card.innerHTML = \`
          <span class="item-emoji">\${item.emoji}</span>
          <div class="item-info">
            <strong>\${item.name}</strong>
            <small>\${item.category}</small>
          </div>
        \`;
        results.appendChild(card);
      }
    }
  });
  container.appendChild(results);

  return container;
}

mount('#app', App());
`,
  cart: `import { pulse, effect, el, mount } from '/runtime/index.js';

const products = [
  { id: 1, name: 'T-Shirt', price: 29.99, emoji: '👕' },
  { id: 2, name: 'Jeans', price: 59.99, emoji: '👖' },
  { id: 3, name: 'Sneakers', price: 89.99, emoji: '👟' },
  { id: 4, name: 'Hat', price: 19.99, emoji: '🧢' }
];
const cart = pulse([]);

function App() {
  const container = el('.cart-app');
  container.appendChild(el('h2', '🛒 Shopping Cart'));

  // Products
  const productList = el('.product-list');
  productList.appendChild(el('h3', 'Products'));

  for (const product of products) {
    const item = el('.product-item');
    item.innerHTML = \`
      <span class="product-emoji">\${product.emoji}</span>
      <div class="product-info">
        <strong>\${product.name}</strong>
        <span>$\${product.price.toFixed(2)}</span>
      </div>
    \`;
    const addBtn = el('button.btn.primary', 'Add');
    addBtn.addEventListener('click', () => {
      const existing = cart.get().find(i => i.id === product.id);
      if (existing) {
        cart.update(c => c.map(i => i.id === product.id ? {...i, qty: i.qty + 1} : i));
      } else {
        cart.update(c => [...c, { ...product, qty: 1 }]);
      }
    });
    item.appendChild(addBtn);
    productList.appendChild(item);
  }
  container.appendChild(productList);

  // Cart
  const cartSection = el('.cart-section');
  effect(() => {
    cartSection.innerHTML = '';
    cartSection.appendChild(el('h3', 'Your Cart'));

    const items = cart.get();
    if (items.length === 0) {
      cartSection.appendChild(el('p.empty-cart', 'Your cart is empty'));
    } else {
      for (const item of items) {
        const cartItem = el('.cart-item');
        cartItem.innerHTML = \`
          <span>\${item.emoji} \${item.name} x\${item.qty}</span>
          <span>$\${(item.price * item.qty).toFixed(2)}</span>
        \`;
        const removeBtn = el('button.remove-btn', '×');
        removeBtn.addEventListener('click', () => {
          cart.update(c => c.filter(i => i.id !== item.id));
        });
        cartItem.appendChild(removeBtn);
        cartSection.appendChild(cartItem);
      }

      const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const totalEl = el('.cart-total');
      totalEl.innerHTML = \`<strong>Total: $\${total.toFixed(2)}</strong>\`;
      cartSection.appendChild(totalEl);
    }
  });
  container.appendChild(cartSection);

  return container;
}

mount('#app', App());
`,
  animation: `import { pulse, effect, el, mount } from '/runtime/index.js';

const position = pulse({ x: 50, y: 50 });
const color = pulse('#6366f1');
const size = pulse(50);
const animating = pulse(false);

function App() {
  const container = el('.anim-app');
  container.appendChild(el('h2', '✨ Animation Demo'));

  // Canvas area
  const canvas = el('.anim-canvas');
  const ball = el('.anim-ball');

  effect(() => {
    ball.style.left = position.get().x + '%';
    ball.style.top = position.get().y + '%';
    ball.style.background = color.get();
    ball.style.width = size.get() + 'px';
    ball.style.height = size.get() + 'px';
  });
  canvas.appendChild(ball);

  // Click to move
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    position.set({ x, y });
  });
  container.appendChild(canvas);

  // Controls
  const controls = el('.anim-controls');

  // Random animation button
  const animBtn = el('button.btn.primary');
  effect(() => {
    animBtn.textContent = animating.get() ? '⏹ Stop' : '▶ Animate';
  });

  let intervalId = null;
  animBtn.addEventListener('click', () => {
    if (animating.get()) {
      clearInterval(intervalId);
      animating.set(false);
    } else {
      animating.set(true);
      intervalId = setInterval(() => {
        position.set({
          x: Math.random() * 80 + 10,
          y: Math.random() * 80 + 10
        });
        color.set('#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
      }, 500);
    }
  });
  controls.appendChild(animBtn);

  // Size slider
  const sizeControl = el('.size-control');
  sizeControl.appendChild(el('label', 'Size: '));
  const slider = el('input[type=range][min=20][max=100]');
  slider.value = size.get();
  slider.addEventListener('input', (e) => size.set(parseInt(e.target.value)));
  sizeControl.appendChild(slider);
  controls.appendChild(sizeControl);

  container.appendChild(controls);
  container.appendChild(el('p.hint', 'Click anywhere on the canvas to move the ball!'));

  return container;
}

mount('#app', App());
`
};

// Inline Pulse runtime for iframe (can't use ES modules in srcdoc)
const pulseRuntime = `
// Pulse Runtime (inline version)
const context = { currentEffect: null };
function pulse(initialValue) {
  let value = initialValue;
  const subscribers = new Set();
  return {
    get() {
      if (context.currentEffect) subscribers.add(context.currentEffect);
      return value;
    },
    set(newValue) {
      if (newValue !== value) {
        value = newValue;
        subscribers.forEach(fn => fn());
      }
    },
    update(fn) { this.set(fn(value)); },
    peek() { return value; }
  };
}
function effect(fn) {
  const run = () => { context.currentEffect = run; fn(); context.currentEffect = null; };
  run();
  return () => {};
}
function computed(fn) {
  const sig = pulse(fn());
  effect(() => sig.set(fn()));
  return { get: () => sig.get() };
}
function el(selector, content) {
  let tag = 'div';
  let id = null;
  const classes = [];
  const attrs = {};
  let i = 0;
  const len = selector.length;
  // Parse tag
  if (i < len && /[a-zA-Z]/.test(selector[i])) {
    let t = '';
    while (i < len && /[a-zA-Z0-9-]/.test(selector[i])) t += selector[i++];
    if (t) tag = t;
  }
  // Parse rest
  while (i < len) {
    const c = selector[i];
    if (c === '.') {
      i++;
      let cls = '';
      while (i < len && /[a-zA-Z0-9_-]/.test(selector[i])) cls += selector[i++];
      if (cls) classes.push(cls);
    } else if (c === '#') {
      i++;
      let idVal = '';
      while (i < len && /[a-zA-Z0-9_-]/.test(selector[i])) idVal += selector[i++];
      if (idVal) id = idVal;
    } else if (c === '[') {
      i++;
      let attrName = '';
      while (i < len && /[a-zA-Z0-9_-]/.test(selector[i])) attrName += selector[i++];
      let attrVal = '';
      if (i < len && selector[i] === '=') {
        i++;
        if (i < len && (selector[i] === '"' || selector[i] === "'")) {
          const q = selector[i++];
          while (i < len && selector[i] !== q) attrVal += selector[i++];
          i++;
        } else {
          while (i < len && selector[i] !== ']') attrVal += selector[i++];
        }
      }
      if (i < len && selector[i] === ']') i++;
      if (attrName) attrs[attrName] = attrVal;
    } else {
      i++;
    }
  }
  const elem = document.createElement(tag);
  if (id) elem.id = id;
  for (const cls of classes) elem.classList.add(cls);
  for (const k in attrs) elem.setAttribute(k, attrs[k]);
  if (content) elem.textContent = content;
  return elem;
}
function mount(selector, component) {
  const target = document.querySelector(selector);
  if (target) { target.innerHTML = ''; target.appendChild(component); }
}
`;

export function PlaygroundPage() {
  const page = el('.page.playground-page');

  page.innerHTML = `
    <h1>${t('playground.title')}</h1>
    <p class="intro">${t('playground.intro')}</p>

    <div class="playground-container">
      <div class="playground-editor">
        <div class="editor-header">
          <span class="editor-title">${t('playground.codeEditor')}</span>
          <div class="editor-actions">
            <button class="run-btn" id="runBtn">${t('playground.run')}</button>
            <button class="reset-btn" id="resetBtn">${t('playground.reset')}</button>
          </div>
        </div>
        <textarea id="codeEditor" spellcheck="false">${defaultCode}</textarea>
      </div>

      <div class="playground-preview">
        <div class="preview-header">
          <span class="preview-title">${t('playground.preview')}</span>
          <span class="preview-status" id="previewStatus">${t('playground.ready')}</span>
        </div>
        <iframe id="previewFrame" sandbox="allow-scripts"></iframe>
      </div>
    </div>

    <div class="playground-templates">
      <h3>${t('playground.templates')}</h3>
      <div class="template-buttons">
        <button class="template-btn" data-template="counter">${t('playground.templateCounter')}</button>
        <button class="template-btn" data-template="todo">${t('playground.templateTodo')}</button>
        <button class="template-btn" data-template="timer">${t('playground.templateTimer')}</button>
        <button class="template-btn" data-template="form">${t('playground.templateForm')}</button>
        <button class="template-btn" data-template="calculator">${t('playground.templateCalculator')}</button>
        <button class="template-btn" data-template="tabs">${t('playground.templateTabs')}</button>
        <button class="template-btn" data-template="theme">${t('playground.templateTheme')}</button>
        <button class="template-btn" data-template="search">${t('playground.templateSearch')}</button>
        <button class="template-btn" data-template="cart">${t('playground.templateCart')}</button>
        <button class="template-btn" data-template="animation">${t('playground.templateAnimation')}</button>
      </div>
    </div>
  `;

  // Run code in iframe
  function runCode(code) {
    const iframe = page.querySelector('#previewFrame');
    const status = page.querySelector('#previewStatus');

    // Strip import statements (runtime is inlined)
    const processedCode = code.replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?\n?/g, '');

    const html = '<!DOCTYPE html><html><head><style>' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }' +
      'body { font-family: system-ui, -apple-system, sans-serif; background: #1e293b; color: #e2e8f0; padding: 20px; min-height: 100vh; }' +
      'h2 { margin-bottom: 16px; }' +
      '.btn { padding: 10px 20px; border: none; border-radius: 8px; background: #334155; color: #e2e8f0; cursor: pointer; font-size: 14px; transition: background 0.2s; }' +
      '.btn:hover { background: #475569; }' +
      '.btn.primary { background: #6366f1; }' +
      '.btn.primary:hover { background: #4f46e5; }' +
      '.buttons { display: flex; gap: 10px; margin-top: 16px; }' +
      '.count-display { font-size: 4em; font-weight: bold; text-align: center; padding: 20px; background: #334155; border-radius: 12px; margin: 16px 0; }' +
      '.counter-app, .todo-app, .timer-app, .form-app { max-width: 400px; margin: 0 auto; }' +
      '.todo-form { display: flex; gap: 10px; margin-bottom: 16px; }' +
      '.todo-form input { flex: 1; padding: 10px; border-radius: 8px; border: none; background: #334155; color: #e2e8f0; }' +
      '.todo-list { display: flex; flex-direction: column; gap: 8px; }' +
      '.todo-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #334155; border-radius: 8px; }' +
      '.todo-item span { flex: 1; }' +
      '.todo-item.done span { text-decoration: line-through; opacity: 0.5; }' +
      '.todo-item button { padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer; }' +
      '.todo-item .toggle { background: #10b981; color: white; }' +
      '.todo-item .delete { background: #ef4444; color: white; }' +
      '.timer-display { font-size: 5em; font-weight: bold; text-align: center; padding: 30px; background: #334155; border-radius: 12px; margin: 16px 0; font-family: monospace; }' +
      '.field { margin-bottom: 16px; }' +
      '.field label { display: block; margin-bottom: 6px; font-size: 14px; color: #94a3b8; }' +
      '.field input, .field textarea { width: 100%; padding: 12px; border-radius: 8px; border: none; background: #334155; color: #e2e8f0; font-size: 14px; }' +
      '.field textarea { min-height: 100px; resize: vertical; }' +
      '.success-message { background: #334155; padding: 20px; border-radius: 12px; margin-bottom: 16px; }' +
      '.success-message h3 { color: #10b981; margin-bottom: 12px; }' +
      '.success-message p { margin: 8px 0; }' +
      // Calculator styles
      '.calc-app { max-width: 300px; margin: 0 auto; }' +
      '.calc-display { font-size: 2.5em; text-align: right; padding: 20px; background: #334155; border-radius: 12px; margin-bottom: 12px; font-family: monospace; overflow: hidden; }' +
      '.calc-buttons { display: flex; flex-direction: column; gap: 8px; }' +
      '.calc-row { display: flex; gap: 8px; }' +
      '.calc-btn { flex: 1; padding: 16px; font-size: 1.2em; border: none; border-radius: 8px; background: #334155; color: #e2e8f0; cursor: pointer; transition: background 0.2s; }' +
      '.calc-btn:hover { background: #475569; }' +
      '.calc-btn.op { background: #6366f1; }' +
      '.calc-btn.op:hover { background: #4f46e5; }' +
      '.calc-btn.wide { flex: 2; }' +
      // Tabs styles
      '.tabs-app { max-width: 450px; margin: 0 auto; }' +
      '.tab-bar { display: flex; gap: 4px; margin-bottom: 16px; background: #334155; padding: 4px; border-radius: 10px; }' +
      '.tab-btn { flex: 1; padding: 12px; border: none; background: transparent; color: #94a3b8; cursor: pointer; border-radius: 8px; transition: all 0.2s; }' +
      '.tab-btn:hover { color: #e2e8f0; }' +
      '.tab-btn.active { background: #6366f1; color: white; }' +
      '.tab-content { background: #334155; padding: 24px; border-radius: 12px; }' +
      '.tab-content h3 { margin-bottom: 12px; }' +
      '.tab-content p { color: #94a3b8; }' +
      // Theme styles
      '.theme-app { max-width: 400px; margin: 0 auto; padding: 24px; border-radius: 12px; transition: all 0.3s; }' +
      '.theme-toggle { margin: 20px 0; }' +
      '.color-picker { margin: 20px 0; }' +
      '.color-picker p { margin-bottom: 12px; color: #94a3b8; }' +
      '.color-row { display: flex; gap: 12px; }' +
      '.color-swatch { width: 40px; height: 40px; border-radius: 50%; cursor: pointer; transition: transform 0.2s; }' +
      '.preview-card { margin-top: 24px; padding: 20px; background: #334155; border-radius: 12px; border: 3px solid transparent; transition: border-color 0.3s; }' +
      '.preview-card h3 { margin-bottom: 8px; transition: color 0.3s; }' +
      '.preview-card p { color: #94a3b8; margin: 0; }' +
      // Search styles
      '.search-app { max-width: 400px; margin: 0 auto; }' +
      '.search-box { margin-bottom: 16px; }' +
      '.search-box input { width: 100%; padding: 14px 16px; border-radius: 10px; border: 2px solid #334155; background: #334155; color: #e2e8f0; font-size: 16px; outline: none; transition: border-color 0.2s; }' +
      '.search-box input:focus { border-color: #6366f1; }' +
      '.search-results { display: flex; flex-direction: column; gap: 8px; }' +
      '.result-count { font-size: 14px; color: #94a3b8; margin-bottom: 8px; }' +
      '.item-card { display: flex; align-items: center; gap: 12px; padding: 14px; background: #334155; border-radius: 10px; }' +
      '.item-emoji { font-size: 1.5em; }' +
      '.item-info { display: flex; flex-direction: column; }' +
      '.item-info strong { margin-bottom: 2px; }' +
      '.item-info small { color: #94a3b8; }' +
      '.no-results { text-align: center; padding: 40px; color: #94a3b8; }' +
      // Cart styles
      '.cart-app { max-width: 400px; margin: 0 auto; }' +
      '.product-list, .cart-section { margin-bottom: 24px; }' +
      '.product-list h3, .cart-section h3 { margin-bottom: 12px; font-size: 1.1em; color: #94a3b8; }' +
      '.product-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #334155; border-radius: 10px; margin-bottom: 8px; }' +
      '.product-emoji { font-size: 1.5em; }' +
      '.product-info { flex: 1; display: flex; flex-direction: column; }' +
      '.product-info span { color: #10b981; font-weight: 500; }' +
      '.cart-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #334155; border-radius: 8px; margin-bottom: 8px; }' +
      '.remove-btn { background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; }' +
      '.cart-total { padding: 16px; background: #6366f1; border-radius: 10px; text-align: center; margin-top: 12px; }' +
      '.empty-cart { text-align: center; padding: 24px; color: #94a3b8; }' +
      // Animation styles
      '.anim-app { max-width: 400px; margin: 0 auto; }' +
      '.anim-canvas { position: relative; height: 250px; background: #334155; border-radius: 12px; margin: 16px 0; overflow: hidden; cursor: crosshair; }' +
      '.anim-ball { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); transition: all 0.3s ease-out; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }' +
      '.anim-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }' +
      '.size-control { display: flex; align-items: center; gap: 8px; flex: 1; }' +
      '.size-control input[type=range] { flex: 1; }' +
      '.hint { margin-top: 16px; text-align: center; font-size: 14px; color: #94a3b8; }' +
      '</style></head><body><div id="app"></div>' +
      '<script>' + pulseRuntime +
      'try {' + processedCode + ' parent.postMessage({ type: "success" }, "*"); } catch (e) { parent.postMessage({ type: "error", message: e.message }, "*"); }' +
      '</' + 'script></body></html>';

    iframe.srcdoc = html;
    status.textContent = t('playground.running');
    status.className = 'preview-status running';
  }

  // Setup after mount
  setTimeout(() => {
    const editor = page.querySelector('#codeEditor');
    const runBtn = page.querySelector('#runBtn');
    const resetBtn = page.querySelector('#resetBtn');
    const templateBtns = page.querySelectorAll('.template-btn');
    const status = page.querySelector('#previewStatus');

    // Listen for messages from iframe
    window.addEventListener('message', (e) => {
      if (e.data.type === 'success') {
        status.textContent = t('playground.success');
        status.className = 'preview-status success';
      } else if (e.data.type === 'error') {
        status.textContent = t('playground.errorPrefix') + ' ' + e.data.message;
        status.className = 'preview-status error';
      }
    });

    // Run button
    runBtn.addEventListener('click', () => runCode(editor.value));

    // Reset button
    resetBtn.addEventListener('click', () => {
      editor.value = defaultCode;
      runCode(defaultCode);
    });

    // Template buttons
    templateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const template = btn.dataset.template;
        if (templates[template]) {
          editor.value = templates[template];
          runCode(templates[template]);
        }
      });
    });

    // Auto-run on load
    runCode(editor.value);

    // Tab key support in editor
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
      }
    });
  }, 100);

  return page;
}
