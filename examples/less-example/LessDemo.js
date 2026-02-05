import { pulse, computed, effect, batch, el, text, on, bind, list, when, mount, model } from 'pulse-js-framework/runtime';

// State
const theme = pulse("light");
const fontSize = pulse(16);
const count = pulse(0);

// View
function render({ props = {}, slots = {} } = {}) {
  return (
    el('.pjiz0dm.demo-container',
      el('h1.pjiz0dm',
        "LESS CSS with Pulse Framework"),
      el('p.pjiz0dm',
        "This demo showcases LESS CSS features"),
      el('.pjiz0dm.stats',
        el('.pjiz0dm.stat-box',
          el('span.pjiz0dm.label',
            "Font Size:"),
          el('span.pjiz0dm.value',
            text(() => `${fontSize.get()}px`))),
        el('.pjiz0dm.stat-box',
          el('span.pjiz0dm.label',
            "Theme:"),
          el('span.pjiz0dm.value',
            text(() => `${theme.get()}`))),
        el('.pjiz0dm.stat-box',
          el('span.pjiz0dm.label',
            "Counter:"),
          el('span.pjiz0dm.value',
            text(() => `${count.get()}`)))),
      el('.pjiz0dm.color-boxes',
        el('.pjiz0dm.box.primary',
          "Primary"),
        el('.pjiz0dm.box.secondary',
          "Secondary"),
        el('.pjiz0dm.box.accent',
          "Accent")),
      el('.pjiz0dm.controls',
on(        el('button.pjiz0dm.btn.large',
          "A+"), 'click', (event) => { fontSize.update(_fontSize => _fontSize + 2); }),
on(        el('button.pjiz0dm.btn.small',
          "A-"), 'click', (event) => { fontSize.update(_fontSize => _fontSize - 2); }),
on(        el('button.pjiz0dm.btn',
          "Toggle Theme"), 'click', (event) => { theme.set(((theme.get() === "light") ? "dark" : "light")); }),
on(        el('button.pjiz0dm.btn.accent',
          text(() => `Count: ${count.get()}`)), 'click', (event) => { count.set(count.get() + 1); })))
  );
}

// Styles
const SCOPE_ID = 'pjiz0dm';
const styles = `
`;

// Inject styles
const styleEl = document.createElement("style");
styleEl.setAttribute('data-p-scope', SCOPE_ID);
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Export
export const LessDemo = {
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

export default LessDemo;