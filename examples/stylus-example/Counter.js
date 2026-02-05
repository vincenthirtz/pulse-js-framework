import { pulse, computed, effect, batch, el, text, on, bind, list, when, mount, model } from 'pulse-js-framework/runtime';

// State
const count = pulse(0);

// View
function render({ props = {}, slots = {} } = {}) {
  return (
    el('.p1ijmh0.counter-app',
      el('h1.p1ijmh0',
        "Stylus CSS Example"),
      el('.p1ijmh0.counter-display',
        text(() => `Count: ${count.get()}`)),
      el('.p1ijmh0.button-group',
on(        el('button.p1ijmh0.btn.decrement',
          "-"), 'click', (event) => { count.update(_count => _count - 1); }),
on(        el('button.p1ijmh0.btn.reset',
          "Reset"), 'click', (event) => { count.set(0); }),
on(        el('button.p1ijmh0.btn.increment',
          "+"), 'click', (event) => { count.update(_count => _count + 1); })),
      el('.p1ijmh0.info',
        el('p.p1ijmh0',
          "This example uses Stylus CSS preprocessor for styling."),
        el('p.p1ijmh0',
          "Install with: npm install -D stylus")))
  );
}

// Styles
const SCOPE_ID = 'p1ijmh0';
const styles = `
`;

// Inject styles
const styleEl = document.createElement("style");
styleEl.setAttribute('data-p-scope', SCOPE_ID);
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Export
export const Counter = {
  render,
  mount: (target) => {
    const container = typeof target === "string" ? document.querySelector(target) : target;
    let currentEl = null;
    effect(() => {
      // Save focus state before re-render
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
      // Restore focus after re-render
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

export default Counter;