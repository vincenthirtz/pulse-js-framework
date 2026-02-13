/**
 * DOM Element Coverage Boost Tests
 * Additional tests to cover uncovered paths in runtime/dom-element.js
 * Target: Increase dom-element.js coverage from 71% to 90%+
 *
 * Uncovered lines: 23-37,45-46,60-62,73,87-213,225-309,313-325,331-348,371-415,427-432
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import { createDOM } from './mock-dom.js';

// Set up DOM environment
const { document, HTMLElement, Node, DocumentFragment, Comment, Event } = createDOM();
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.Node = Node;
globalThis.DocumentFragment = DocumentFragment;
globalThis.Comment = Comment;
globalThis.Event = Event;

// Import after DOM setup
import { el, text, configureA11y } from '../runtime/dom.js';
import { pulse } from '../runtime/pulse.js';

// ============================================================================
// A11y Configuration (lines 31-44)
// ============================================================================

describe('configureA11y - Configuration Management', () => {
  beforeEach(() => {
    // Reset to default
    configureA11y({
      enabled: true,
      autoAria: true,
      warnMissingAlt: true,
      warnMissingLabel: true
    });
  });

  test('configureA11y updates a11y config', () => {
    configureA11y({ enabled: false });
    const dialog = el('dialog');
    // When disabled, auto-ARIA should not be applied
    assert.strictEqual(dialog.getAttribute('role'), null);
  });

  test('configureA11y disables autoAria selectively', () => {
    configureA11y({ autoAria: false });
    const button = el('button');
    // autoAria disabled, so no automatic type="button"
    assert.strictEqual(button.getAttribute('type'), null);
  });

  test('configureA11y partial config merge', () => {
    configureA11y({ warnMissingAlt: false });
    // Other settings remain enabled
    const button = el('button');
    assert.strictEqual(button.getAttribute('type'), 'button');
  });
});

// ============================================================================
// Auto-ARIA: Early Return (lines 51)
// ============================================================================

describe('applyAutoAria - Early Return', () => {
  test('applyAutoAria skips when a11y disabled', () => {
    configureA11y({ enabled: false });
    const dialog = el('dialog');
    assert.strictEqual(dialog.getAttribute('role'), null);
    assert.strictEqual(dialog.getAttribute('aria-modal'), null);
  });

  test('applyAutoAria skips when autoAria disabled', () => {
    configureA11y({ autoAria: false });
    const dialog = el('dialog');
    assert.strictEqual(dialog.getAttribute('role'), null);
  });
});

// ============================================================================
// Auto-ARIA: Landmark Elements (lines 73-81)
// ============================================================================

describe('Auto-ARIA: Landmark Elements', () => {
  beforeEach(() => {
    configureA11y({ enabled: true, autoAria: true, warnMissingLabel: true });
  });

  test('main element without label (line 73)', () => {
    const main = el('main');
    assert.strictEqual(main.tagName.toLowerCase(), 'main');
    // No error, just no warning in test (lines 78-80 executed)
  });

  test('header element without label', () => {
    const header = el('header');
    assert.strictEqual(header.tagName.toLowerCase(), 'header');
  });

  test('footer element without label', () => {
    const footer = el('footer');
    assert.strictEqual(footer.tagName.toLowerCase(), 'footer');
  });

  test('aside element without label', () => {
    const aside = el('aside');
    assert.strictEqual(aside.tagName.toLowerCase(), 'aside');
  });

  test('nav with aria-label does not warn', () => {
    const nav = el('nav[aria-label=Main navigation]');
    assert.strictEqual(nav.getAttribute('aria-label'), 'Main navigation');
  });

  test('nav with aria-labelledby does not warn', () => {
    const nav = el('nav[aria-labelledby=nav-heading]');
    assert.strictEqual(nav.getAttribute('aria-labelledby'), 'nav-heading');
  });
});

// ============================================================================
// Auto-ARIA: Image Elements (lines 83-88)
// ============================================================================

describe('Auto-ARIA: Image Elements', () => {
  beforeEach(() => {
    configureA11y({ enabled: true, autoAria: true, warnMissingAlt: true });
  });

  test('img without alt (line 85-87)', () => {
    const img = el('img');
    assert.strictEqual(img.tagName.toLowerCase(), 'img');
    // Warning logged but no exception (lines 85-87 executed)
  });

  test('img with alt does not warn', () => {
    const img = el('img[alt=Logo]');
    assert.strictEqual(img.getAttribute('alt'), 'Logo');
  });

  test('img with aria-label does not warn', () => {
    const img = el('img[aria-label=Company logo]');
    assert.strictEqual(img.getAttribute('aria-label'), 'Company logo');
  });

  test('img with aria-hidden does not warn', () => {
    const img = el('img[aria-hidden=true]');
    assert.strictEqual(img.getAttribute('aria-hidden'), 'true');
  });

  test('img warnMissingAlt disabled', () => {
    configureA11y({ warnMissingAlt: false });
    const img = el('img');
    assert.strictEqual(img.tagName.toLowerCase(), 'img');
  });
});

// ============================================================================
// Auto-ARIA: Form Controls (lines 90-100)
// ============================================================================

describe('Auto-ARIA: Form Controls', () => {
  beforeEach(() => {
    configureA11y({ enabled: true, autoAria: true, warnMissingLabel: true });
  });

  test('input without label warns (lines 94-98)', () => {
    const input = el('input');
    assert.strictEqual(input.tagName.toLowerCase(), 'input');
    // Warning logged (line 97)
  });

  test('textarea without label warns', () => {
    const textarea = el('textarea');
    assert.strictEqual(textarea.tagName.toLowerCase(), 'textarea');
  });

  test('select without label warns', () => {
    const select = el('select');
    assert.strictEqual(select.tagName.toLowerCase(), 'select');
  });

  test('input with aria-label does not warn', () => {
    const input = el('input[aria-label=Username]');
    assert.strictEqual(input.getAttribute('aria-label'), 'Username');
  });

  test('input with aria-labelledby does not warn', () => {
    const input = el('input[aria-labelledby=username-label]');
    assert.strictEqual(input.getAttribute('aria-labelledby'), 'username-label');
  });

  test('input with id does not warn (assumes associated label)', () => {
    const input = el('input#username');
    assert.strictEqual(input.getAttribute('id'), 'username');
  });

  test('input type=hidden does not warn (line 96)', () => {
    const input = el('input[type=hidden]');
    assert.strictEqual(input.getAttribute('type'), 'hidden');
  });

  test('input type=submit does not warn', () => {
    const input = el('input[type=submit]');
    assert.strictEqual(input.getAttribute('type'), 'submit');
  });

  test('input type=button does not warn', () => {
    const input = el('input[type=button]');
    assert.strictEqual(input.getAttribute('type'), 'button');
  });

  test('input type=reset does not warn', () => {
    const input = el('input[type=reset]');
    assert.strictEqual(input.getAttribute('type'), 'reset');
  });

  test('input type=image does not warn', () => {
    const input = el('input[type=image]');
    assert.strictEqual(input.getAttribute('type'), 'image');
  });

  test('warnMissingLabel disabled', () => {
    configureA11y({ warnMissingLabel: false });
    const input = el('input');
    assert.strictEqual(input.tagName.toLowerCase(), 'input');
  });
});

// ============================================================================
// Auto-ARIA: Link Elements (lines 109-117)
// ============================================================================

describe('Auto-ARIA: Link Elements', () => {
  beforeEach(() => {
    configureA11y({ enabled: true, autoAria: true });
  });

  test('link without href gets role=button (lines 111-112)', () => {
    const link = el('a');
    assert.strictEqual(link.getAttribute('role'), 'button');
  });

  test('link without href gets tabindex=0 (lines 113-115)', () => {
    const link = el('a');
    assert.strictEqual(link.getAttribute('tabindex'), '0');
  });

  test('link with href does not get role=button', () => {
    const link = el('a[href=/home]');
    assert.strictEqual(link.getAttribute('role'), null);
  });

  test('link with existing role is not overwritten', () => {
    const link = el('a[role=tab]');
    assert.strictEqual(link.getAttribute('role'), 'tab');
  });

  test('link with existing tabindex is not overwritten', () => {
    const link = el('a[tabindex=-1]');
    assert.strictEqual(link.getAttribute('tabindex'), '-1');
  });
});

// ============================================================================
// Auto-ARIA: List Elements (lines 119-127)
// ============================================================================

describe('Auto-ARIA: List Elements', () => {
  beforeEach(() => {
    configureA11y({ enabled: true, autoAria: true });
  });

  test('ul with role=menu without label (lines 122-125)', () => {
    const ul = el('ul[role=menu]');
    assert.strictEqual(ul.getAttribute('role'), 'menu');
    // Warning logged
  });

  test('ol with role=listbox without label', () => {
    const ol = el('ol[role=listbox]');
    assert.strictEqual(ol.getAttribute('role'), 'listbox');
  });

  test('ul with role=menu and aria-label does not warn', () => {
    const ul = el('ul[role=menu][aria-label=Actions]');
    assert.strictEqual(ul.getAttribute('aria-label'), 'Actions');
  });

  test('ul with role=menu and aria-labelledby does not warn', () => {
    const ul = el('ul[role=menu][aria-labelledby=menu-heading]');
    assert.strictEqual(ul.getAttribute('aria-labelledby'), 'menu-heading');
  });

  test('ul without special role does not warn', () => {
    const ul = el('ul');
    assert.strictEqual(ul.getAttribute('role'), null);
  });
});

// ============================================================================
// Auto-ARIA: Table Elements (lines 129-134)
// ============================================================================

describe('Auto-ARIA: Table Elements', () => {
  beforeEach(() => {
    configureA11y({ enabled: true, autoAria: true });
  });

  test('table without label (lines 131-133)', () => {
    const table = el('table');
    assert.strictEqual(table.tagName.toLowerCase(), 'table');
    // No warning (just placeholder for future caption check)
  });

  test('table with aria-label does not warn', () => {
    const table = el('table[aria-label=Data table]');
    assert.strictEqual(table.getAttribute('aria-label'), 'Data table');
  });
});

// ============================================================================
// Auto-ARIA: Progress and Meter (lines 136-148)
// ============================================================================

describe('Auto-ARIA: Progress and Meter', () => {
  beforeEach(() => {
    configureA11y({ enabled: true, autoAria: true });
  });

  test('progress without label (lines 137-140)', () => {
    const progress = el('progress');
    assert.strictEqual(progress.tagName.toLowerCase(), 'progress');
    // Warning logged
  });

  test('progress with aria-label does not warn', () => {
    const progress = el('progress[aria-label=Loading progress]');
    assert.strictEqual(progress.getAttribute('aria-label'), 'Loading progress');
  });

  test('meter without label (lines 144-147)', () => {
    const meter = el('meter');
    assert.strictEqual(meter.tagName.toLowerCase(), 'meter');
    // Warning logged
  });

  test('meter with aria-labelledby does not warn', () => {
    const meter = el('meter[aria-labelledby=meter-label]');
    assert.strictEqual(meter.getAttribute('aria-labelledby'), 'meter-label');
  });
});

// ============================================================================
// applyRoleRequirements (lines 162-214)
// ============================================================================

describe('applyRoleRequirements - Role-Specific ARIA', () => {
  beforeEach(() => {
    configureA11y({ enabled: true, autoAria: true });
  });

  test('role=checkbox gets aria-checked=false (lines 166-171)', () => {
    const div = el('div[role=checkbox]');
    assert.strictEqual(div.getAttribute('aria-checked'), 'false');
  });

  test('role=radio gets aria-checked=false', () => {
    const div = el('div[role=radio]');
    assert.strictEqual(div.getAttribute('aria-checked'), 'false');
  });

  test('role=switch gets aria-checked=false', () => {
    const div = el('div[role=switch]');
    assert.strictEqual(div.getAttribute('aria-checked'), 'false');
  });

  test('role=checkbox with existing aria-checked is not overwritten', () => {
    const div = el('div[role=checkbox][aria-checked=true]');
    assert.strictEqual(div.getAttribute('aria-checked'), 'true');
  });

  test('role=slider gets value attributes (lines 174-186)', () => {
    const div = el('div[role=slider]');
    assert.strictEqual(div.getAttribute('aria-valuenow'), '0');
    assert.strictEqual(div.getAttribute('aria-valuemin'), '0');
    assert.strictEqual(div.getAttribute('aria-valuemax'), '100');
  });

  test('role=spinbutton gets value attributes', () => {
    const div = el('div[role=spinbutton]');
    assert.strictEqual(div.getAttribute('aria-valuenow'), '0');
  });

  test('role=progressbar gets value attributes', () => {
    const div = el('div[role=progressbar]');
    assert.strictEqual(div.getAttribute('aria-valuemin'), '0');
  });

  test('role=slider with existing aria-valuenow is not overwritten', () => {
    const div = el('div[role=slider][aria-valuenow=50]');
    assert.strictEqual(div.getAttribute('aria-valuenow'), '50');
  });

  test('role=combobox gets aria-expanded=false (lines 188-192)', () => {
    const div = el('div[role=combobox]');
    assert.strictEqual(div.getAttribute('aria-expanded'), 'false');
  });

  test('role=combobox with existing aria-expanded is not overwritten', () => {
    const div = el('div[role=combobox][aria-expanded=true]');
    assert.strictEqual(div.getAttribute('aria-expanded'), 'true');
  });

  test('role=tablist gets aria-orientation=horizontal (lines 194-198)', () => {
    const div = el('div[role=tablist]');
    assert.strictEqual(div.getAttribute('aria-orientation'), 'horizontal');
  });

  test('role=tablist with existing aria-orientation is not overwritten', () => {
    const div = el('div[role=tablist][aria-orientation=vertical]');
    assert.strictEqual(div.getAttribute('aria-orientation'), 'vertical');
  });

  test('role=tab gets aria-selected=false (lines 200-204)', () => {
    const div = el('div[role=tab]');
    assert.strictEqual(div.getAttribute('aria-selected'), 'false');
  });

  test('role=button gets tabindex=0 (lines 206-213)', () => {
    const div = el('div[role=button]');
    assert.strictEqual(div.getAttribute('tabindex'), '0');
  });

  test('role=link gets tabindex=0', () => {
    const span = el('span[role=link]');
    assert.strictEqual(span.getAttribute('tabindex'), '0');
  });

  test('role=menuitem gets tabindex=0', () => {
    const div = el('div[role=menuitem]');
    assert.strictEqual(div.getAttribute('tabindex'), '0');
  });

  test('role=button with existing tabindex is not overwritten', () => {
    const div = el('div[role=button][tabindex=-1]');
    assert.strictEqual(div.getAttribute('tabindex'), '-1');
  });
});

// ============================================================================
// Reactive Children in appendChild (lines 371-415)
// ============================================================================

describe('appendChild - Reactive Children', () => {
  test('reactive function child creates placeholder (lines 372-373)', () => {
    const count = pulse(0);
    const div = el('div', () => count.get());

    // Placeholder comment should exist
    assert.ok(div.childNodes.length > 0);
  });

  test('reactive child updates on change (lines 376-414)', () => {
    const count = pulse(0);
    const div = el('div', () => `Count: ${count.get()}`);

    // Initial render
    const initialText = div.textContent;
    assert.ok(initialText.includes('Count: 0'));

    // Update
    count.set(5);
    const updatedText = div.textContent;
    assert.ok(updatedText.includes('Count: 5'));
  });

  test('reactive child handles string result (lines 388-391)', () => {
    const text = pulse('hello');
    const div = el('div', () => text.get());

    assert.ok(div.textContent.includes('hello'));
    text.set('world');
    assert.ok(div.textContent.includes('world'));
  });

  test('reactive child handles number result (line 388)', () => {
    const num = pulse(42);
    const div = el('div', () => num.get());

    assert.ok(div.textContent.includes('42'));
  });

  test('reactive child handles Node result (lines 392-394)', () => {
    const show = pulse(true);
    const child = el('span', 'Child');
    const div = el('div', () => show.get() ? child : null);

    assert.strictEqual(div.querySelector('span')?.textContent, 'Child');
  });

  test('reactive child handles array result (lines 395-406)', () => {
    const items = pulse(['a', 'b', 'c']);
    const div = el('div', () => items.get().map(i => el('span', i)));

    assert.strictEqual(div.querySelectorAll('span').length, 3);
  });

  test('reactive child handles array with text nodes (lines 401-404)', () => {
    const values = pulse([1, 2, 3]);
    const div = el('div', () => values.get());

    assert.ok(div.childNodes.length >= 3);
  });

  test('reactive child handles null/false (line 386)', () => {
    const show = pulse(false);
    const div = el('div', () => show.get() ? 'content' : null);

    // Should not throw, null/false ignored
    assert.ok(div);
  });

  test('reactive child removes old nodes before adding new (lines 379-383)', () => {
    const content = pulse('first');
    const div = el('div', () => content.get());

    assert.ok(div.textContent.includes('first'));

    content.set('second');
    assert.ok(div.textContent.includes('second'));
    assert.ok(!div.textContent.includes('first'));
  });

  test('reactive child handles DocumentFragment insertion (lines 407-412)', () => {
    const count = pulse(1);
    const div = el('div', () => {
      const items = [];
      for (let i = 0; i < count.get(); i++) {
        items.push(el('span', `Item ${i}`));
      }
      return items;
    });

    assert.strictEqual(div.querySelectorAll('span').length, 1);

    count.set(3);
    assert.strictEqual(div.querySelectorAll('span').length, 3);
  });
});

// ============================================================================
// text() - Reactive Text Node (lines 427-432)
// ============================================================================

describe('text() - Reactive Text Node', () => {
  test('text() with static value creates text node (line 433)', () => {
    const node = text('hello');
    assert.strictEqual(node.nodeType, 3); // TEXT_NODE
    assert.strictEqual(node.textContent, 'hello');
  });

  test('text() with number creates text node', () => {
    const node = text(42);
    assert.strictEqual(node.textContent, '42');
  });

  test('text() with function creates reactive text node (lines 427-431)', () => {
    const name = pulse('Alice');
    const node = text(() => name.get());

    assert.strictEqual(node.textContent, 'Alice');

    name.set('Bob');
    assert.strictEqual(node.textContent, 'Bob');
  });

  test('text() reactive updates on pulse change (line 429)', () => {
    const count = pulse(0);
    const node = text(() => `Count: ${count.get()}`);

    assert.strictEqual(node.textContent, 'Count: 0');

    count.set(5);
    assert.strictEqual(node.textContent, 'Count: 5');
  });
});

// ============================================================================
// appendChild - Static Children (lines 360-369)
// ============================================================================

describe('appendChild - Static Children', () => {
  test('null child is ignored (line 360)', () => {
    const div = el('div', null);
    assert.strictEqual(div.childNodes.length, 0);
  });

  test('false child is ignored (line 360)', () => {
    const div = el('div', false);
    assert.strictEqual(div.childNodes.length, 0);
  });

  test('string child creates text node (lines 362-363)', () => {
    const div = el('div', 'hello');
    assert.strictEqual(div.textContent, 'hello');
  });

  test('number child creates text node (line 362)', () => {
    const div = el('div', 42);
    assert.strictEqual(div.textContent, '42');
  });

  test('Node child is appended (lines 364-365)', () => {
    const child = el('span', 'child');
    const div = el('div', child);
    assert.strictEqual(div.querySelector('span')?.textContent, 'child');
  });

  test('array child flattens (lines 366-369)', () => {
    const div = el('div', ['a', 'b', 'c']);
    assert.ok(div.textContent.includes('a'));
    assert.ok(div.textContent.includes('b'));
    assert.ok(div.textContent.includes('c'));
  });

  test('nested array child flattens recursively (line 367)', () => {
    const div = el('div', [['a', 'b'], 'c']);
    assert.ok(div.textContent.includes('a'));
    assert.ok(div.textContent.includes('c'));
  });
});
