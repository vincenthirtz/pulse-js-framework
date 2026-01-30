/**
 * Pulse Documentation - Playground Page
 */

import { el } from '/runtime/index.js';

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
    <h1>🎮 Playground</h1>
    <p class="intro">Write Pulse code and see the results instantly</p>

    <div class="playground-container">
      <div class="playground-editor">
        <div class="editor-header">
          <span class="editor-title">📝 Code Editor</span>
          <div class="editor-actions">
            <button class="run-btn" id="runBtn">▶ Run</button>
            <button class="reset-btn" id="resetBtn">↺ Reset</button>
          </div>
        </div>
        <textarea id="codeEditor" spellcheck="false">${defaultCode}</textarea>
      </div>

      <div class="playground-preview">
        <div class="preview-header">
          <span class="preview-title">👁️ Preview</span>
          <span class="preview-status" id="previewStatus">Ready</span>
        </div>
        <iframe id="previewFrame" sandbox="allow-scripts"></iframe>
      </div>
    </div>

    <div class="playground-templates">
      <h3>📋 Quick Templates</h3>
      <div class="template-buttons">
        <button class="template-btn" data-template="counter">Counter</button>
        <button class="template-btn" data-template="todo">Todo List</button>
        <button class="template-btn" data-template="timer">Timer</button>
        <button class="template-btn" data-template="form">Form</button>
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
      '</style></head><body><div id="app"></div>' +
      '<script>' + pulseRuntime +
      'try {' + processedCode + ' parent.postMessage({ type: "success" }, "*"); } catch (e) { parent.postMessage({ type: "error", message: e.message }, "*"); }' +
      '</' + 'script></body></html>';

    iframe.srcdoc = html;
    status.textContent = 'Running...';
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
        status.textContent = '✓ Success';
        status.className = 'preview-status success';
      } else if (e.data.type === 'error') {
        status.textContent = '✗ Error: ' + e.data.message;
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
