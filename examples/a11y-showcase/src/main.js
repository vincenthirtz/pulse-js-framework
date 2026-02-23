/**
 * Pulse A11y Showcase
 * Demonstrates accessibility features: ARIA widgets, focus management,
 * screen reader announcements, user preferences, and contrast checking.
 */

import { pulse, effect, computed, batch, el, mount, list, when } from '../../../runtime/index.js';
import {
  announce, announcePolite, announceAssertive,
  trapFocus, focusFirst, saveFocus, restoreFocus,
  onEscapeKey, createFocusVisibleTracker,
  installSkipLinks,
  prefersReducedMotion, prefersColorScheme, createPreferences,
  createDisclosure, createTabs, createRovingTabindex,
  createModal, createTooltip, createAccordion, createMenu,
  getContrastRatio, meetsContrastRequirement,
  validateA11y, srOnly, generateId, setAriaAttributes
} from '../../../runtime/a11y.js';

// ── State ──────────────────────────────────────────────────────
const activeSection = pulse('widgets');
const modalOpen = pulse(false);
const notifications = pulse([]);
const contrastFg = pulse('#333333');
const contrastBg = pulse('#ffffff');

// ── User Preferences (reactive) ───────────────────────────────
const prefs = createPreferences();

// ── Focus-visible tracking ────────────────────────────────────
const { isKeyboardUser } = createFocusVisibleTracker();

// ── Skip Links ────────────────────────────────────────────────
installSkipLinks([
  { target: 'main-content', text: 'Skip to main content' },
  { target: 'nav', text: 'Skip to navigation' }
]);

// ── Notification helper ───────────────────────────────────────
function notify(message, priority = 'polite') {
  const id = Date.now();
  notifications.update(n => [...n, { id, message }]);
  if (priority === 'assertive') announceAssertive(message);
  else announcePolite(message);
  setTimeout(() => {
    notifications.update(n => n.filter(x => x.id !== id));
  }, 4000);
}

// ── Contrast Checker (computed) ───────────────────────────────
const contrastRatio = computed(() => {
  return getContrastRatio(contrastFg.get(), contrastBg.get());
});
const contrastAA = computed(() => meetsContrastRequirement(contrastRatio.get(), 'AA', 'normal'));
const contrastAAA = computed(() => meetsContrastRequirement(contrastRatio.get(), 'AAA', 'normal'));

// ── Navigation ────────────────────────────────────────────────
const sections = [
  { id: 'widgets', label: 'ARIA Widgets' },
  { id: 'focus', label: 'Focus Management' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'contrast', label: 'Contrast Checker' },
  { id: 'audit', label: 'A11y Audit' }
];

function Nav() {
  const nav = el('nav#nav[aria-label=Section navigation]',
    el('h2', srOnly('Sections')),
    el('ul[role=tablist]',
      sections.map(s =>
        el('li[role=presentation]',
          el(`button[role=tab][aria-controls=panel-${s.id}]`, s.label, {
            'aria-selected': () => String(activeSection.get() === s.id),
            class: () => activeSection.get() === s.id ? 'active' : '',
            onclick: () => {
              activeSection.set(s.id);
              announcePolite(`${s.label} section`);
            }
          })
        )
      )
    )
  );
  return nav;
}

// ── Sections ──────────────────────────────────────────────────

function WidgetsSection() {
  const accordionData = [
    { title: 'What is ARIA?', content: 'Accessible Rich Internet Applications (ARIA) is a set of roles and attributes that define ways to make web content more accessible.' },
    { title: 'Why use semantic HTML?', content: 'Semantic HTML provides meaning to the content, helping assistive technologies understand the page structure.' },
    { title: 'How does focus management work?', content: 'Focus management ensures keyboard users can navigate through interactive elements in a logical order.' }
  ];

  const menuItems = ['Copy', 'Paste', 'Delete', 'Select All'];

  return el('section#panel-widgets[role=tabpanel][aria-labelledby=tab-widgets]',
    el('h2', 'ARIA Widgets'),
    el('p', 'Interactive widgets built with proper ARIA patterns.'),

    // Disclosure
    el('h3', 'Disclosure (Show/Hide)'),
    el('div.widget-demo', (() => {
      const trigger = el('button.disclosure-trigger', 'Toggle Details');
      const content = el('div.disclosure-content',
        el('p', 'This content can be expanded and collapsed. The disclosure pattern manages aria-expanded and aria-controls automatically.')
      );
      createDisclosure(trigger, content, { defaultOpen: false });
      return el('div', trigger, content);
    })()),

    // Accordion
    el('h3', 'Accordion'),
    el('div.widget-demo', (() => {
      const container = el('div.accordion');
      accordionData.forEach((item, i) => {
        const trigger = el('button.accordion-trigger[data-accordion-trigger]', item.title);
        const panel = el('div.accordion-panel[data-accordion-panel]', el('p', item.content));
        container.appendChild(trigger);
        container.appendChild(panel);
      });
      createAccordion(container, {
        triggerSelector: '[data-accordion-trigger]',
        panelSelector: '[data-accordion-panel]',
        allowMultiple: false,
        defaultOpen: 0
      });
      return container;
    })()),

    // Tabs widget
    el('h3', 'Tabs'),
    el('div.widget-demo', (() => {
      const tablist = el('div.tabs[role=tablist]',
        el('button[role=tab]', 'Overview'),
        el('button[role=tab]', 'Details'),
        el('button[role=tab]', 'Settings')
      );
      const panels = [
        el('div.tab-panel[role=tabpanel]', el('p', 'This is the overview panel with general information.')),
        el('div.tab-panel[role=tabpanel]', el('p', 'Here are the detailed specifications and data.')),
        el('div.tab-panel[role=tabpanel]', el('p', 'Configuration options and preferences live here.'))
      ];
      createTabs(tablist, { defaultIndex: 0 });
      return el('div', tablist, ...panels);
    })()),

    // Tooltip
    el('h3', 'Tooltip'),
    el('div.widget-demo', (() => {
      const trigger = el('button.tooltip-trigger', 'Hover or focus me');
      const tooltip = el('div.tooltip[role=tooltip]', 'This is a helpful tooltip message');
      createTooltip(trigger, tooltip, { showDelay: 300, hideDelay: 100 });
      return el('div.tooltip-wrapper', trigger, tooltip);
    })()),

    // Menu
    el('h3', 'Dropdown Menu'),
    el('div.widget-demo', (() => {
      const button = el('button.menu-trigger[aria-haspopup=true]', 'Actions');
      const menuList = el('ul.menu[role=menu]',
        menuItems.map(item =>
          el('li[role=menuitem]', item, {
            tabindex: '-1',
            onclick: () => notify(`${item} action triggered`)
          })
        )
      );
      createMenu(button, menuList, {
        itemSelector: '[role="menuitem"]',
        closeOnSelect: true
      });
      return el('div.menu-wrapper', button, menuList);
    })())
  );
}

function FocusSection() {
  return el('section#panel-focus[role=tabpanel][aria-labelledby=tab-focus]',
    el('h2', 'Focus Management'),
    el('p', 'Manage keyboard focus for modals, dialogs, and navigation.'),

    // Focus trap demo
    el('h3', 'Focus Trap (Modal)'),
    el('p', 'Click the button to open a modal with trapped focus. Tab stays within the dialog.'),
    el('button', 'Open Modal', {
      onclick: () => modalOpen.set(true)
    }),

    // Focus visible indicator
    el('h3', 'Focus-Visible Detection'),
    el('p', () =>
      isKeyboardUser.get()
        ? 'Keyboard navigation detected - focus outlines are visible.'
        : 'Mouse navigation detected - focus outlines are minimal.'
    ),
    el('div.focus-demo',
      el('button', 'Button 1'),
      el('button', 'Button 2'),
      el('button', 'Button 3'),
      el('p.hint', 'Try pressing Tab to navigate, then click with mouse.')
    ),

    // Roving tabindex
    el('h3', 'Roving Tabindex'),
    el('p', 'Use arrow keys to navigate between items:'),
    (() => {
      const toolbar = el('div.toolbar[role=toolbar][aria-label=Formatting tools]',
        el('button[role=button]', 'Bold', { tabindex: '0' }),
        el('button[role=button]', 'Italic', { tabindex: '-1' }),
        el('button[role=button]', 'Underline', { tabindex: '-1' }),
        el('button[role=button]', 'Link', { tabindex: '-1' })
      );
      createRovingTabindex(toolbar, {
        selector: '[role="button"]',
        orientation: 'horizontal',
        loop: true
      });
      return toolbar;
    })()
  );
}

function AnnouncementsSection() {
  const messageInput = pulse('');

  return el('section#panel-announcements[role=tabpanel][aria-labelledby=tab-announcements]',
    el('h2', 'Screen Reader Announcements'),
    el('p', 'Send live region announcements to screen readers.'),

    el('div.announce-form',
      el('label[for=announce-input]', 'Message to announce:'),
      el('input#announce-input[type=text][placeholder=Type a message...]', {
        value: () => messageInput.get(),
        oninput: (e) => messageInput.set(e.target.value)
      }),
      el('div.announce-buttons',
        el('button', 'Announce (Polite)', {
          onclick: () => {
            const msg = messageInput.get().trim();
            if (msg) { notify(msg, 'polite'); messageInput.set(''); }
          }
        }),
        el('button.assertive', 'Announce (Assertive)', {
          onclick: () => {
            const msg = messageInput.get().trim();
            if (msg) { notify(msg, 'assertive'); messageInput.set(''); }
          }
        })
      )
    ),

    el('h3', 'Notification Log'),
    el('div.notifications[aria-live=polite]',
      list(
        () => notifications.get(),
        (n) => el('div.notification', n.message),
        (n) => n.id
      )
    ),

    el('h3', 'Screen Reader Only Content'),
    el('div.sr-demo',
      el('a[href=#]',
        el('span.icon', '🏠'),
        srOnly('Go to home page')
      ),
      el('p', 'The link above has hidden text visible only to screen readers.')
    )
  );
}

function PreferencesSection() {
  return el('section#panel-preferences[role=tabpanel][aria-labelledby=tab-preferences]',
    el('h2', 'User Preferences'),
    el('p', 'Detect and respond to user accessibility preferences.'),

    el('div.prefs-grid',
      el('div.pref-card',
        el('h3', 'Reduced Motion'),
        el('p.pref-value', () =>
          prefs.reducedMotion.get() ? 'Prefers reduced motion' : 'No preference'
        ),
        el('p.hint', 'System: Settings > Accessibility > Reduce Motion')
      ),
      el('div.pref-card',
        el('h3', 'Color Scheme'),
        el('p.pref-value', () => `Prefers: ${prefs.colorScheme.get()}`),
        el('p.hint', 'System: Settings > Appearance')
      ),
      el('div.pref-card',
        el('h3', 'High Contrast'),
        el('p.pref-value', () =>
          prefs.highContrast.get() ? 'High contrast active' : 'Standard contrast'
        ),
        el('p.hint', 'System: Settings > Accessibility > High Contrast')
      ),
      el('div.pref-card',
        el('h3', 'Forced Colors'),
        el('p.pref-value', () => `Mode: ${prefs.forcedColors.get()}`),
        el('p.hint', 'Windows: Settings > High Contrast Mode')
      )
    )
  );
}

function ContrastSection() {
  return el('section#panel-contrast[role=tabpanel][aria-labelledby=tab-contrast]',
    el('h2', 'Color Contrast Checker'),
    el('p', 'Check if text and background colors meet WCAG contrast requirements.'),

    el('div.contrast-form',
      el('div.color-input',
        el('label[for=fg-color]', 'Text Color'),
        el('input#fg-color[type=color]', {
          value: () => contrastFg.get(),
          oninput: (e) => contrastFg.set(e.target.value)
        }),
        el('input[type=text]', {
          value: () => contrastFg.get(),
          oninput: (e) => contrastFg.set(e.target.value),
          'aria-label': 'Text color hex value'
        })
      ),
      el('div.color-input',
        el('label[for=bg-color]', 'Background Color'),
        el('input#bg-color[type=color]', {
          value: () => contrastBg.get(),
          oninput: (e) => contrastBg.set(e.target.value)
        }),
        el('input[type=text]', {
          value: () => contrastBg.get(),
          oninput: (e) => contrastBg.set(e.target.value),
          'aria-label': 'Background color hex value'
        })
      )
    ),

    el('div.contrast-preview', {
      style: () => `color: ${contrastFg.get()}; background: ${contrastBg.get()}`
    },
      el('p.preview-text', 'The quick brown fox jumps over the lazy dog.'),
      el('p.preview-small', 'Small text sample for checking.')
    ),

    el('div.contrast-results',
      el('div.ratio',
        el('span.label', 'Contrast Ratio:'),
        el('span.value', () => `${contrastRatio.get().toFixed(2)}:1`)
      ),
      el('div.level',
        el('span.label', 'WCAG AA (4.5:1):'),
        el('span', {
          class: () => contrastAA.get() ? 'pass' : 'fail'
        }, () => contrastAA.get() ? 'PASS' : 'FAIL')
      ),
      el('div.level',
        el('span.label', 'WCAG AAA (7:1):'),
        el('span', {
          class: () => contrastAAA.get() ? 'pass' : 'fail'
        }, () => contrastAAA.get() ? 'PASS' : 'FAIL')
      )
    )
  );
}

function AuditSection() {
  const auditResults = pulse(null);
  const auditing = pulse(false);

  function runAudit() {
    auditing.set(true);
    // Run on next frame to let UI update
    requestAnimationFrame(() => {
      const issues = validateA11y(document.body);
      auditResults.set(issues);
      auditing.set(false);
      const count = issues.length;
      announce(`Audit complete. Found ${count} issue${count !== 1 ? 's' : ''}.`);
    });
  }

  return el('section#panel-audit[role=tabpanel][aria-labelledby=tab-audit]',
    el('h2', 'Accessibility Audit'),
    el('p', 'Run a live audit on the current page to detect accessibility issues.'),

    el('button', () => auditing.get() ? 'Auditing...' : 'Run A11y Audit', {
      onclick: runAudit,
      disabled: () => auditing.get()
    }),

    when(
      () => auditResults.get() !== null,
      () => {
        const issues = auditResults.get();
        if (issues.length === 0) {
          return el('div.audit-pass', el('p', 'No accessibility issues found!'));
        }
        return el('div.audit-results',
          el('p', () => `Found ${issues.length} issue(s):`),
          el('ul.issue-list',
            issues.map((issue, i) =>
              el('li.issue', {
                class: issue.type === 'error' ? 'issue-error' : 'issue-warning'
              },
                el('strong', issue.type === 'error' ? 'Error: ' : 'Warning: '),
                el('span', issue.message),
                issue.element ? el('code', ` (${issue.element.tagName?.toLowerCase() || 'element'})`) : null
              )
            )
          )
        );
      }
    )
  );
}

// ── Modal Dialog ──────────────────────────────────────────────
function ModalDialog() {
  return when(
    () => modalOpen.get(),
    () => {
      const dialog = el('div.modal-overlay', {
        onclick: (e) => {
          if (e.target.classList.contains('modal-overlay')) modalOpen.set(false);
        }
      },
        el('div.modal[role=dialog][aria-labelledby=modal-title][aria-modal=true]',
          el('h2#modal-title', 'Modal Dialog'),
          el('p', 'Focus is trapped inside this dialog. Try pressing Tab.'),
          el('label[for=modal-input]', 'Sample Input:'),
          el('input#modal-input[type=text][placeholder=Type here...]'),
          el('div.modal-actions',
            el('button', 'Confirm', {
              onclick: () => {
                modalOpen.set(false);
                notify('Modal confirmed');
              }
            }),
            el('button.secondary', 'Cancel', {
              onclick: () => modalOpen.set(false)
            })
          )
        )
      );

      // Trap focus and handle Escape
      const modalEl = dialog.querySelector('[role=dialog]');
      requestAnimationFrame(() => {
        if (modalEl) {
          trapFocus(modalEl, { autoFocus: true, returnFocus: true });
          onEscapeKey(modalEl, () => modalOpen.set(false));
        }
      });

      return dialog;
    }
  );
}

// ── App ───────────────────────────────────────────────────────
function App() {
  return el('div.app', {
    class: () => isKeyboardUser.get() ? 'keyboard-user' : ''
  },
    el('header',
      el('h1', 'Accessibility Showcase'),
      el('p.subtitle', 'Pulse framework built-in a11y features')
    ),
    Nav(),
    el('main#main-content',
      when(() => activeSection.get() === 'widgets', WidgetsSection),
      when(() => activeSection.get() === 'focus', FocusSection),
      when(() => activeSection.get() === 'announcements', AnnouncementsSection),
      when(() => activeSection.get() === 'preferences', PreferencesSection),
      when(() => activeSection.get() === 'contrast', ContrastSection),
      when(() => activeSection.get() === 'audit', AuditSection)
    ),
    ModalDialog()
  );
}

mount('#app', App());
console.log('Pulse A11y Showcase loaded');
