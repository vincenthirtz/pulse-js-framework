import { pulse, computed, effect, batch, el, text, on, bind, list, when, mount, model } from 'pulse-js-framework/runtime';

// State
const count = pulse(0);
const theme = pulse('purple');

// View
function render({ props = {}, slots = {} } = {}) {
  return (
    el('.p2scss0.sass-app',
      el('h1.p2scss0',
        "SASS/SCSS CSS Example"),
      el('.p2scss0.theme-switcher',
        el('span.p2scss0', "Theme:"),
on(     el('button.p2scss0.theme-btn.purple',
          "Purple"), 'click', () => { theme.set('purple'); }),
on(     el('button.p2scss0.theme-btn.blue',
          "Blue"), 'click', () => { theme.set('blue'); }),
on(     el('button.p2scss0.theme-btn.green',
          "Green"), 'click', () => { theme.set('green'); })),
      el('.p2scss0.counter-display',
        text(() => `Count: ${count.get()}`)),
      el('.p2scss0.button-group',
on(     el('button.p2scss0.btn.decrement',
          "-"), 'click', () => { count.update(n => n - 1); }),
on(     el('button.p2scss0.btn.reset',
          "Reset"), 'click', () => { count.set(0); }),
on(     el('button.p2scss0.btn.increment',
          "+"), 'click', () => { count.update(n => n + 1); })),
      el('.p2scss0.features',
        el('h2.p2scss0', "SASS Features Used"),
        el('ul.p2scss0',
          el('li.p2scss0', "$variables for colors and spacing"),
          el('li.p2scss0', "@mixin / @include for reusable styles"),
          el('li.p2scss0', "Nesting with & parent reference"),
          el('li.p2scss0', "@extend for style inheritance"),
          el('li.p2scss0', "Color functions (lighten, darken, mix)"),
          el('li.p2scss0', "@each loop for theme generation"))),
      el('.p2scss0.info',
        el('p.p2scss0',
          "This example uses SASS/SCSS CSS preprocessor for styling."),
        el('p.p2scss0',
          "Install with: npm install -D sass")))
  );
}

// Styles (compiled from SCSS)
const SCOPE_ID = 'p2scss0';
const styles = `
.p2scss0.sass-app {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px;
  font-family: system-ui, -apple-system, sans-serif;
}
.p2scss0.sass-app h1.p2scss0 {
  color: #7c3aed;
  text-align: center;
  margin-bottom: 20px;
  font-size: 32px;
}
.p2scss0.sass-app .p2scss0.theme-switcher {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 40px;
}
.p2scss0.sass-app .p2scss0.theme-switcher span.p2scss0 {
  font-weight: 600;
  color: #6b7280;
}
.p2scss0.sass-app .p2scss0.theme-switcher .theme-btn {
  padding: 6px 16px;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}
.p2scss0.sass-app .p2scss0.theme-switcher .theme-btn.purple {
  background: #ede9fe;
  color: #7c3aed;
}
.p2scss0.sass-app .p2scss0.theme-switcher .theme-btn.purple:hover {
  background: #ddd6fe;
  border-color: #7c3aed;
}
.p2scss0.sass-app .p2scss0.theme-switcher .theme-btn.blue {
  background: #dbeafe;
  color: #3b82f6;
}
.p2scss0.sass-app .p2scss0.theme-switcher .theme-btn.blue:hover {
  background: #bfdbfe;
  border-color: #3b82f6;
}
.p2scss0.sass-app .p2scss0.theme-switcher .theme-btn.green {
  background: #d1fae5;
  color: #10b981;
}
.p2scss0.sass-app .p2scss0.theme-switcher .theme-btn.green:hover {
  background: #a7f3d0;
  border-color: #10b981;
}
.p2scss0.sass-app .p2scss0.counter-display {
  font-size: 48px;
  font-weight: bold;
  text-align: center;
  margin: 40px 0;
  padding: 30px;
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}
.p2scss0.sass-app .p2scss0.button-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
}
.p2scss0.sass-app .p2scss0.button-group .btn {
  padding: 12px 20px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}
.p2scss0.sass-app .p2scss0.button-group .btn:hover {
  opacity: 0.85;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.p2scss0.sass-app .p2scss0.button-group .btn:active {
  transform: translateY(0);
}
.p2scss0.sass-app .p2scss0.button-group .btn.increment {
  background: #10b981;
  color: white;
}
.p2scss0.sass-app .p2scss0.button-group .btn.decrement {
  background: #ef4444;
  color: white;
}
.p2scss0.sass-app .p2scss0.button-group .btn.reset {
  background: #6b7280;
  color: white;
}
.p2scss0.sass-app .p2scss0.features {
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background: #faf5ff;
  margin-bottom: 40px;
}
.p2scss0.sass-app .p2scss0.features h2.p2scss0 {
  color: #7c3aed;
  font-size: 18px;
  margin-bottom: 10px;
}
.p2scss0.sass-app .p2scss0.features ul.p2scss0 {
  list-style: none;
  padding: 0;
}
.p2scss0.sass-app .p2scss0.features li.p2scss0 {
  padding: 6px 0;
  color: #4b5563;
  line-height: 1.5;
  font-size: 14px;
}
.p2scss0.sass-app .p2scss0.features li.p2scss0::before {
  content: "\\2713  ";
  color: #10b981;
  font-weight: bold;
}
.p2scss0.sass-app .p2scss0.info {
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background: #f9fafb;
  border-left: 4px solid #7c3aed;
}
.p2scss0.sass-app .p2scss0.info p.p2scss0 {
  margin: 8px 0;
  color: #4b5563;
  line-height: 1.6;
}
.p2scss0.sass-app .p2scss0.info p.p2scss0:first-child {
  font-weight: 600;
}
`;

// Inject styles
const styleEl = document.createElement("style");
styleEl.setAttribute('data-p-scope', SCOPE_ID);
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Export
export const SassDemo = {
  render,
  mount: (target) => {
    const container = typeof target === "string" ? document.querySelector(target) : target;
    let currentEl = null;
    effect(() => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
      const focusInfo = isInput ? {
        tag: activeEl.tagName.toLowerCase(),
        type: activeEl.type || "",
        placeholder: activeEl.placeholder || "",
        ariaLabel: activeEl.getAttribute("aria-label") || "",
        start: activeEl.selectionStart,
        end: activeEl.selectionEnd
      } : null;
      const newEl = render();
      if (currentEl) {
        container.replaceChild(newEl, currentEl);
      } else {
        container.appendChild(newEl);
      }
      currentEl = newEl;
      if (focusInfo) {
        let selector = focusInfo.tag;
        if (focusInfo.ariaLabel) selector += `[aria-label="${focusInfo.ariaLabel}"]`;
        else if (focusInfo.placeholder) selector += `[placeholder="${focusInfo.placeholder}"]`;
        const newActive = newEl.querySelector(selector);
        if (newActive) {
          newActive.focus();
          if (typeof focusInfo.start === "number") {
            try { newActive.setSelectionRange(focusInfo.start, focusInfo.end); } catch(e) {}
          }
        }
      }
    });
    return { unmount: () => currentEl?.remove() };
  }
};

export default SassDemo;
