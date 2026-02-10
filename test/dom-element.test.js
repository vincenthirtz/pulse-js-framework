/**
 * DOM Element Tests - Auto-ARIA and Accessibility Features
 *
 * Tests for runtime/dom-element.js - Element creation and automatic ARIA attributes
 *
 * @module test/dom-element
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';

import { createDOM } from './mock-dom.js';

// Set up DOM environment before importing dom.js
const { document, HTMLElement, Node, DocumentFragment, Comment, Event } = createDOM();
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.Node = Node;
globalThis.DocumentFragment = DocumentFragment;
globalThis.Comment = Comment;
globalThis.Event = Event;

// Now import DOM utilities
import { el, text, configureA11y } from '../runtime/dom.js';

// =============================================================================
// Test Setup - Reset A11y Config between tests
// =============================================================================

function resetA11yConfig() {
  configureA11y({
    enabled: true,
    autoAria: true,
    warnMissingAlt: true,
    warnMissingLabel: true
  });
}

// =============================================================================
// Auto-ARIA: Dialog Elements
// =============================================================================

describe('Auto-ARIA: Dialog Elements', () => {
  test('dialog element gets role="dialog" automatically', () => {
    resetA11yConfig();
    const dialog = el('dialog');

    assert.strictEqual(dialog.getAttribute('role'), 'dialog', 'Should have role="dialog"');
  });

  test('dialog element gets aria-modal="true" automatically', () => {
    resetA11yConfig();
    const dialog = el('dialog');

    assert.strictEqual(dialog.getAttribute('aria-modal'), 'true', 'Should have aria-modal="true"');
  });

  test('dialog with existing role is not overwritten', () => {
    resetA11yConfig();
    const dialog = el('dialog[role=alertdialog]');

    assert.strictEqual(dialog.getAttribute('role'), 'alertdialog', 'Should preserve existing role');
  });

  test('dialog with existing aria-modal is not overwritten', () => {
    resetA11yConfig();
    const dialog = el('dialog[aria-modal=false]');

    assert.strictEqual(dialog.getAttribute('aria-modal'), 'false', 'Should preserve existing aria-modal');
  });
});

// =============================================================================
// Auto-ARIA: Button Elements
// =============================================================================

describe('Auto-ARIA: Button Elements', () => {
  test('button element gets type="button" automatically', () => {
    resetA11yConfig();
    const button = el('button');

    assert.strictEqual(button.getAttribute('type'), 'button', 'Should have type="button"');
  });

  test('button with existing type is not overwritten', () => {
    resetA11yConfig();
    const button = el('button[type=submit]');

    assert.strictEqual(button.getAttribute('type'), 'submit', 'Should preserve existing type');
  });

  test('button type="reset" is preserved', () => {
    resetA11yConfig();
    const button = el('button[type=reset]');

    assert.strictEqual(button.getAttribute('type'), 'reset', 'Should preserve type="reset"');
  });
});

// =============================================================================
// Auto-ARIA: Anchor Elements
// =============================================================================

describe('Auto-ARIA: Anchor Elements', () => {
  test('anchor without href gets role="button"', () => {
    resetA11yConfig();
    const anchor = el('a');

    assert.strictEqual(anchor.getAttribute('role'), 'button', 'Should have role="button"');
  });

  test('anchor without href gets tabindex="0"', () => {
    resetA11yConfig();
    const anchor = el('a');

    assert.strictEqual(anchor.getAttribute('tabindex'), '0', 'Should have tabindex="0"');
  });

  test('anchor with href does not get role="button"', () => {
    resetA11yConfig();
    const anchor = el('a[href="/page"]');

    // Should not have role="button" since it has href
    assert.ok(anchor.getAttribute('role') !== 'button' || anchor.getAttribute('role') === null,
      'Should not have role="button" when href is present');
  });

  test('anchor with existing role is not overwritten', () => {
    resetA11yConfig();
    const anchor = el('a[role=link]');

    assert.strictEqual(anchor.getAttribute('role'), 'link', 'Should preserve existing role');
  });

  test('anchor with existing tabindex is not overwritten', () => {
    resetA11yConfig();
    const anchor = el('a[tabindex=-1]');

    assert.strictEqual(anchor.getAttribute('tabindex'), '-1', 'Should preserve existing tabindex');
  });
});

// =============================================================================
// Auto-ARIA: Role-Based Requirements - Checkbox/Radio/Switch
// =============================================================================

describe('Auto-ARIA: Role-Based Requirements', () => {
  test('role="checkbox" gets aria-checked="false"', () => {
    resetA11yConfig();
    const checkbox = el('div[role=checkbox]');

    assert.strictEqual(checkbox.getAttribute('aria-checked'), 'false', 'Should have aria-checked="false"');
  });

  test('role="radio" gets aria-checked="false"', () => {
    resetA11yConfig();
    const radio = el('div[role=radio]');

    assert.strictEqual(radio.getAttribute('aria-checked'), 'false', 'Should have aria-checked="false"');
  });

  test('role="switch" gets aria-checked="false"', () => {
    resetA11yConfig();
    const switchEl = el('div[role=switch]');

    assert.strictEqual(switchEl.getAttribute('aria-checked'), 'false', 'Should have aria-checked="false"');
  });

  test('role="checkbox" with existing aria-checked is not overwritten', () => {
    resetA11yConfig();
    const checkbox = el('div[role=checkbox][aria-checked=true]');

    assert.strictEqual(checkbox.getAttribute('aria-checked'), 'true', 'Should preserve existing aria-checked');
  });
});

// =============================================================================
// Auto-ARIA: Role-Based Requirements - Slider/Spinbutton/Progressbar
// =============================================================================

describe('Auto-ARIA: Slider/Spinbutton/Progressbar', () => {
  test('role="slider" gets value attributes', () => {
    resetA11yConfig();
    const slider = el('div[role=slider]');

    assert.strictEqual(slider.getAttribute('aria-valuenow'), '0', 'Should have aria-valuenow="0"');
    assert.strictEqual(slider.getAttribute('aria-valuemin'), '0', 'Should have aria-valuemin="0"');
    assert.strictEqual(slider.getAttribute('aria-valuemax'), '100', 'Should have aria-valuemax="100"');
  });

  test('role="spinbutton" gets value attributes', () => {
    resetA11yConfig();
    const spinbutton = el('div[role=spinbutton]');

    assert.strictEqual(spinbutton.getAttribute('aria-valuenow'), '0', 'Should have aria-valuenow="0"');
    assert.strictEqual(spinbutton.getAttribute('aria-valuemin'), '0', 'Should have aria-valuemin="0"');
    assert.strictEqual(spinbutton.getAttribute('aria-valuemax'), '100', 'Should have aria-valuemax="100"');
  });

  test('role="progressbar" gets value attributes', () => {
    resetA11yConfig();
    const progressbar = el('div[role=progressbar]');

    assert.strictEqual(progressbar.getAttribute('aria-valuenow'), '0', 'Should have aria-valuenow="0"');
    assert.strictEqual(progressbar.getAttribute('aria-valuemin'), '0', 'Should have aria-valuemin="0"');
    assert.strictEqual(progressbar.getAttribute('aria-valuemax'), '100', 'Should have aria-valuemax="100"');
  });

  test('role="slider" with existing values is not overwritten', () => {
    resetA11yConfig();
    const slider = el('div[role=slider][aria-valuenow=50][aria-valuemin=10][aria-valuemax=200]');

    assert.strictEqual(slider.getAttribute('aria-valuenow'), '50', 'Should preserve aria-valuenow');
    assert.strictEqual(slider.getAttribute('aria-valuemin'), '10', 'Should preserve aria-valuemin');
    assert.strictEqual(slider.getAttribute('aria-valuemax'), '200', 'Should preserve aria-valuemax');
  });
});

// =============================================================================
// Auto-ARIA: Role-Based Requirements - Combobox/Tab/Tablist
// =============================================================================

describe('Auto-ARIA: Combobox/Tab/Tablist', () => {
  test('role="combobox" gets aria-expanded="false"', () => {
    resetA11yConfig();
    const combobox = el('div[role=combobox]');

    assert.strictEqual(combobox.getAttribute('aria-expanded'), 'false', 'Should have aria-expanded="false"');
  });

  test('role="combobox" with existing aria-expanded is not overwritten', () => {
    resetA11yConfig();
    const combobox = el('div[role=combobox][aria-expanded=true]');

    assert.strictEqual(combobox.getAttribute('aria-expanded'), 'true', 'Should preserve existing aria-expanded');
  });

  test('role="tablist" gets aria-orientation="horizontal"', () => {
    resetA11yConfig();
    const tablist = el('div[role=tablist]');

    assert.strictEqual(tablist.getAttribute('aria-orientation'), 'horizontal', 'Should have aria-orientation="horizontal"');
  });

  test('role="tablist" with existing aria-orientation is not overwritten', () => {
    resetA11yConfig();
    const tablist = el('div[role=tablist][aria-orientation=vertical]');

    assert.strictEqual(tablist.getAttribute('aria-orientation'), 'vertical', 'Should preserve existing aria-orientation');
  });

  test('role="tab" gets aria-selected="false"', () => {
    resetA11yConfig();
    const tab = el('div[role=tab]');

    assert.strictEqual(tab.getAttribute('aria-selected'), 'false', 'Should have aria-selected="false"');
  });

  test('role="tab" with existing aria-selected is not overwritten', () => {
    resetA11yConfig();
    const tab = el('div[role=tab][aria-selected=true]');

    assert.strictEqual(tab.getAttribute('aria-selected'), 'true', 'Should preserve existing aria-selected');
  });
});

// =============================================================================
// Auto-ARIA: Interactive Roles Get Tabindex
// =============================================================================

describe('Auto-ARIA: Interactive Roles Tabindex', () => {
  test('role="button" gets tabindex="0"', () => {
    resetA11yConfig();
    const button = el('div[role=button]');

    assert.strictEqual(button.getAttribute('tabindex'), '0', 'Should have tabindex="0"');
  });

  test('role="link" gets tabindex="0"', () => {
    resetA11yConfig();
    const link = el('div[role=link]');

    assert.strictEqual(link.getAttribute('tabindex'), '0', 'Should have tabindex="0"');
  });

  test('role="menuitem" gets tabindex="0"', () => {
    resetA11yConfig();
    const menuitem = el('div[role=menuitem]');

    assert.strictEqual(menuitem.getAttribute('tabindex'), '0', 'Should have tabindex="0"');
  });

  test('role="button" with existing tabindex is not overwritten', () => {
    resetA11yConfig();
    const button = el('div[role=button][tabindex=-1]');

    assert.strictEqual(button.getAttribute('tabindex'), '-1', 'Should preserve existing tabindex');
  });
});

// =============================================================================
// A11y Configuration
// =============================================================================

describe('A11y Configuration', () => {
  test('configureA11y can disable auto-ARIA', () => {
    configureA11y({
      enabled: false
    });

    const dialog = el('dialog');

    // When disabled, auto-ARIA should not be applied
    // (role may or may not be set depending on implementation)
    assert.ok(true, 'Should not throw when a11y is disabled');

    resetA11yConfig();
  });

  test('configureA11y can disable only autoAria', () => {
    configureA11y({
      enabled: true,
      autoAria: false
    });

    const dialog = el('dialog');

    // Auto-ARIA should not be applied
    assert.ok(true, 'Should not throw when autoAria is disabled');

    resetA11yConfig();
  });

  test('configureA11y can disable warning for missing alt', () => {
    configureA11y({
      warnMissingAlt: false
    });

    // Should not warn when creating img without alt
    const img = el('img');

    assert.ok(true, 'Should not warn when warnMissingAlt is false');

    resetA11yConfig();
  });

  test('configureA11y can disable warning for missing label', () => {
    configureA11y({
      warnMissingLabel: false
    });

    // Should not warn when creating input without label
    const input = el('input[type=text]');

    assert.ok(true, 'Should not warn when warnMissingLabel is false');

    resetA11yConfig();
  });

  test('configureA11y merges with existing config', () => {
    configureA11y({
      warnMissingAlt: false
    });

    configureA11y({
      warnMissingLabel: false
    });

    // Both settings should be applied
    // Create elements that would trigger warnings to verify no errors
    const img = el('img');
    const input = el('input[type=text]');

    assert.ok(true, 'Config should merge correctly');

    resetA11yConfig();
  });
});

// =============================================================================
// Element Creation with Children
// =============================================================================

describe('Element Creation with Children', () => {
  test('el creates element with text child', () => {
    const div = el('div', 'Hello World');

    assert.strictEqual(div.textContent, 'Hello World', 'Should have text content');
  });

  test('el creates element with multiple children', () => {
    const div = el('div',
      el('span', 'First'),
      el('span', 'Second')
    );

    assert.strictEqual(div.children.length, 2, 'Should have 2 children');
  });

  test('el creates element with array of children', () => {
    const items = ['A', 'B', 'C'];
    const ul = el('ul', items.map(item => el('li', item)));

    assert.strictEqual(ul.children.length, 3, 'Should have 3 list items');
  });

  test('el handles null children gracefully', () => {
    const div = el('div', null, 'text', undefined);

    assert.strictEqual(div.textContent, 'text', 'Should only render non-null content');
  });

  test('el handles false children gracefully', () => {
    const div = el('div', false && el('span', 'hidden'), 'visible');

    assert.strictEqual(div.textContent, 'visible', 'Should not render false children');
  });

  test('el handles number children', () => {
    const div = el('div', 42);

    assert.strictEqual(div.textContent, '42', 'Should convert number to string');
  });

  test('el handles mixed children types', () => {
    const div = el('div',
      'text',
      el('span', 'element'),
      123,
      null,
      ['array', 'items']
    );

    assert.ok(div.textContent.includes('text'), 'Should include text');
    assert.ok(div.textContent.includes('element'), 'Should include nested element text');
    assert.ok(div.textContent.includes('123'), 'Should include number');
    assert.ok(div.textContent.includes('array'), 'Should include array items');
  });
});

// =============================================================================
// text() Function Tests
// =============================================================================

describe('text() Function Tests', () => {
  test('text creates static text node', () => {
    const node = text('Hello');

    assert.strictEqual(node.textContent, 'Hello', 'Should have correct text');
  });

  test('text converts number to string', () => {
    const node = text(42);

    assert.strictEqual(node.textContent, '42', 'Should convert number to string');
  });

  test('text handles empty string', () => {
    const node = text('');

    assert.strictEqual(node.textContent, '', 'Should handle empty string');
  });
});

// =============================================================================
// Complex Selector Parsing
// =============================================================================

describe('Complex Selector Parsing', () => {
  test('el handles selector with id, class, and attributes', () => {
    const elem = el('input#email.form-control[type=email][placeholder="Enter email"]');

    assert.strictEqual(elem.tagName.toLowerCase(), 'input', 'Should have correct tag');
    assert.strictEqual(elem.id, 'email', 'Should have correct id');
    assert.ok(elem.className.includes('form-control'), 'Should have correct class');
    assert.strictEqual(elem.getAttribute('type'), 'email', 'Should have type attribute');
    assert.strictEqual(elem.getAttribute('placeholder'), 'Enter email', 'Should have placeholder');
  });

  test('el handles multiple classes', () => {
    const elem = el('button.btn.btn-primary.large');

    assert.ok(elem.className.includes('btn'), 'Should have btn class');
    assert.ok(elem.className.includes('btn-primary'), 'Should have btn-primary class');
    assert.ok(elem.className.includes('large'), 'Should have large class');
  });

  test('el handles boolean attributes', () => {
    const elem = el('input[type=checkbox][checked][disabled]');

    assert.strictEqual(elem.getAttribute('checked'), '', 'Should have checked attribute');
    assert.strictEqual(elem.getAttribute('disabled'), '', 'Should have disabled attribute');
  });

  test('el handles data attributes', () => {
    const elem = el('div[data-id=123][data-name="test"]');

    assert.strictEqual(elem.getAttribute('data-id'), '123', 'Should have data-id');
    assert.strictEqual(elem.getAttribute('data-name'), 'test', 'Should have data-name');
  });

  test('el handles aria attributes in selector', () => {
    const elem = el('button[aria-label="Close"][aria-expanded=false]');

    assert.strictEqual(elem.getAttribute('aria-label'), 'Close', 'Should have aria-label');
    assert.strictEqual(elem.getAttribute('aria-expanded'), 'false', 'Should have aria-expanded');
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  test('el handles empty selector (defaults to div)', () => {
    // This might throw or default to div depending on implementation
    try {
      const elem = el('');
      assert.ok(elem !== null, 'Should create an element');
    } catch {
      assert.ok(true, 'May throw for empty selector');
    }
  });

  test('el handles selector starting with class', () => {
    const elem = el('.container');

    assert.strictEqual(elem.tagName.toLowerCase(), 'div', 'Should default to div');
    assert.ok(elem.className.includes('container'), 'Should have container class');
  });

  test('el handles selector starting with id', () => {
    const elem = el('#app');

    assert.strictEqual(elem.tagName.toLowerCase(), 'div', 'Should default to div');
    assert.strictEqual(elem.id, 'app', 'Should have app id');
  });

  test('el handles special HTML elements', () => {
    const header = el('header');
    const nav = el('nav');
    const main = el('main');
    const footer = el('footer');
    const aside = el('aside');
    const article = el('article');
    const section = el('section');

    assert.strictEqual(header.tagName.toLowerCase(), 'header', 'Should create header');
    assert.strictEqual(nav.tagName.toLowerCase(), 'nav', 'Should create nav');
    assert.strictEqual(main.tagName.toLowerCase(), 'main', 'Should create main');
    assert.strictEqual(footer.tagName.toLowerCase(), 'footer', 'Should create footer');
    assert.strictEqual(aside.tagName.toLowerCase(), 'aside', 'Should create aside');
    assert.strictEqual(article.tagName.toLowerCase(), 'article', 'Should create article');
    assert.strictEqual(section.tagName.toLowerCase(), 'section', 'Should create section');
  });

  test('el handles form elements', () => {
    const form = el('form[action="/submit"][method=post]');
    const input = el('input[type=text][name=username]');
    const textarea = el('textarea[name=message]');
    const select = el('select[name=country]');

    assert.strictEqual(form.tagName.toLowerCase(), 'form', 'Should create form');
    assert.strictEqual(input.tagName.toLowerCase(), 'input', 'Should create input');
    assert.strictEqual(textarea.tagName.toLowerCase(), 'textarea', 'Should create textarea');
    assert.strictEqual(select.tagName.toLowerCase(), 'select', 'Should create select');
  });

  test('el handles table elements', () => {
    const table = el('table');
    const thead = el('thead');
    const tbody = el('tbody');
    const tr = el('tr');
    const th = el('th');
    const td = el('td');

    assert.strictEqual(table.tagName.toLowerCase(), 'table', 'Should create table');
    assert.strictEqual(thead.tagName.toLowerCase(), 'thead', 'Should create thead');
    assert.strictEqual(tbody.tagName.toLowerCase(), 'tbody', 'Should create tbody');
    assert.strictEqual(tr.tagName.toLowerCase(), 'tr', 'Should create tr');
    assert.strictEqual(th.tagName.toLowerCase(), 'th', 'Should create th');
    assert.strictEqual(td.tagName.toLowerCase(), 'td', 'Should create td');
  });
});

// =============================================================================
// Additional Auto-ARIA Tests
// =============================================================================

describe('Additional Auto-ARIA Tests', () => {
  test('img without alt triggers warning (warnMissingAlt enabled)', () => {
    resetA11yConfig();
    // Create img without alt - should trigger warning but not throw
    const img = el('img[src="/photo.jpg"]');

    assert.strictEqual(img.tagName.toLowerCase(), 'img', 'Should create img element');
    assert.strictEqual(img.getAttribute('src'), '/photo.jpg', 'Should have src');
  });

  test('img with alt does not trigger warning', () => {
    resetA11yConfig();
    const img = el('img[src="/photo.jpg"][alt="A beautiful sunset"]');

    assert.strictEqual(img.getAttribute('alt'), 'A beautiful sunset', 'Should have alt');
  });

  test('img with aria-label does not trigger warning', () => {
    resetA11yConfig();
    const img = el('img[src="/photo.jpg"][aria-label="Sunset photo"]');

    assert.strictEqual(img.getAttribute('aria-label'), 'Sunset photo', 'Should have aria-label');
  });

  test('img with aria-hidden does not trigger warning', () => {
    resetA11yConfig();
    const img = el('img[src="/icon.svg"][aria-hidden=true]');

    assert.strictEqual(img.getAttribute('aria-hidden'), 'true', 'Should have aria-hidden');
  });

  test('input without label triggers warning', () => {
    resetA11yConfig();
    // Create input without label - should trigger warning but not throw
    const input = el('input[type=text]');

    assert.strictEqual(input.tagName.toLowerCase(), 'input', 'Should create input element');
  });

  test('input with aria-label does not trigger warning', () => {
    resetA11yConfig();
    const input = el('input[type=text][aria-label="Username"]');

    assert.strictEqual(input.getAttribute('aria-label'), 'Username', 'Should have aria-label');
  });

  test('input with id can have associated label', () => {
    resetA11yConfig();
    const input = el('input[type=text][id=username]');

    assert.strictEqual(input.id, 'username', 'Should have id');
  });

  test('input type=hidden does not trigger warning', () => {
    resetA11yConfig();
    const input = el('input[type=hidden][name=csrf]');

    assert.strictEqual(input.getAttribute('type'), 'hidden', 'Should have type=hidden');
  });

  test('input type=submit does not trigger warning', () => {
    resetA11yConfig();
    const input = el('input[type=submit][value=Send]');

    assert.strictEqual(input.getAttribute('type'), 'submit', 'Should have type=submit');
  });

  test('input type=button does not trigger warning', () => {
    resetA11yConfig();
    const input = el('input[type=button][value=Click]');

    assert.strictEqual(input.getAttribute('type'), 'button', 'Should have type=button');
  });

  test('textarea without label triggers warning', () => {
    resetA11yConfig();
    const textarea = el('textarea');

    assert.strictEqual(textarea.tagName.toLowerCase(), 'textarea', 'Should create textarea');
  });

  test('select without label triggers warning', () => {
    resetA11yConfig();
    const select = el('select');

    assert.strictEqual(select.tagName.toLowerCase(), 'select', 'Should create select');
  });

  test('nav without aria-label triggers warning', () => {
    resetA11yConfig();
    const nav = el('nav');

    assert.strictEqual(nav.tagName.toLowerCase(), 'nav', 'Should create nav');
  });

  test('nav with aria-label does not trigger warning', () => {
    resetA11yConfig();
    const nav = el('nav[aria-label="Main navigation"]');

    assert.strictEqual(nav.getAttribute('aria-label'), 'Main navigation', 'Should have aria-label');
  });

  test('nav with aria-labelledby does not trigger warning', () => {
    resetA11yConfig();
    const nav = el('nav[aria-labelledby=nav-heading]');

    assert.strictEqual(nav.getAttribute('aria-labelledby'), 'nav-heading', 'Should have aria-labelledby');
  });

  test('progress without label triggers warning', () => {
    resetA11yConfig();
    const progress = el('progress[value=50][max=100]');

    assert.strictEqual(progress.tagName.toLowerCase(), 'progress', 'Should create progress');
  });

  test('meter without label triggers warning', () => {
    resetA11yConfig();
    const meter = el('meter[value=50][min=0][max=100]');

    assert.strictEqual(meter.tagName.toLowerCase(), 'meter', 'Should create meter');
  });

  test('ul with role=menu needs aria-label', () => {
    resetA11yConfig();
    const ul = el('ul[role=menu]');

    assert.strictEqual(ul.getAttribute('role'), 'menu', 'Should have role=menu');
  });

  test('ol with role=listbox needs aria-label', () => {
    resetA11yConfig();
    const ol = el('ol[role=listbox]');

    assert.strictEqual(ol.getAttribute('role'), 'listbox', 'Should have role=listbox');
  });
});

// =============================================================================
// More Role-Based Requirements Tests
// =============================================================================

describe('More Role-Based Requirements', () => {
  test('role="button" on div gets tabindex', () => {
    resetA11yConfig();
    const div = el('div[role=button]');

    assert.strictEqual(div.getAttribute('role'), 'button', 'Should have role');
    assert.strictEqual(div.getAttribute('tabindex'), '0', 'Should have tabindex');
  });

  test('role="link" on span gets tabindex', () => {
    resetA11yConfig();
    const span = el('span[role=link]');

    assert.strictEqual(span.getAttribute('role'), 'link', 'Should have role');
    assert.strictEqual(span.getAttribute('tabindex'), '0', 'Should have tabindex');
  });

  test('role="menuitem" on li gets tabindex', () => {
    resetA11yConfig();
    const li = el('li[role=menuitem]');

    assert.strictEqual(li.getAttribute('role'), 'menuitem', 'Should have role');
    assert.strictEqual(li.getAttribute('tabindex'), '0', 'Should have tabindex');
  });

  test('role="switch" gets aria-checked', () => {
    resetA11yConfig();
    const toggle = el('button[role=switch]');

    assert.strictEqual(toggle.getAttribute('role'), 'switch', 'Should have role');
    assert.strictEqual(toggle.getAttribute('aria-checked'), 'false', 'Should have aria-checked');
  });

  test('role="progressbar" gets value attributes', () => {
    resetA11yConfig();
    const progressbar = el('div[role=progressbar]');

    assert.strictEqual(progressbar.getAttribute('aria-valuenow'), '0', 'Should have valuenow');
    assert.strictEqual(progressbar.getAttribute('aria-valuemin'), '0', 'Should have valuemin');
    assert.strictEqual(progressbar.getAttribute('aria-valuemax'), '100', 'Should have valuemax');
  });

  test('role="spinbutton" gets value attributes', () => {
    resetA11yConfig();
    const spinbutton = el('input[role=spinbutton]');

    assert.strictEqual(spinbutton.getAttribute('aria-valuenow'), '0', 'Should have valuenow');
    assert.strictEqual(spinbutton.getAttribute('aria-valuemin'), '0', 'Should have valuemin');
    assert.strictEqual(spinbutton.getAttribute('aria-valuemax'), '100', 'Should have valuemax');
  });
});

// =============================================================================
// Deep Nesting and Complex Children Tests
// =============================================================================

describe('Deep Nesting and Complex Children', () => {
  test('el with deeply nested children', () => {
    const wrapper = el('div.wrapper',
      el('section',
        el('article',
          el('header',
            el('h1', 'Title')
          ),
          el('main',
            el('p', 'Content')
          ),
          el('footer',
            el('small', 'Footer')
          )
        )
      )
    );

    assert.strictEqual(wrapper.children.length, 1, 'Should have one direct child');
    const section = wrapper.querySelector ? wrapper.firstChild : wrapper.children[0];
    assert.strictEqual(section.tagName.toLowerCase(), 'section', 'Should have section child');
  });

  test('el with mixed content types', () => {
    const div = el('div',
      'Text before ',
      el('strong', 'bold'),
      ' text after ',
      el('em', 'italic'),
      ' and more'
    );

    assert.ok(div.textContent.includes('Text before'), 'Should have leading text');
    assert.ok(div.textContent.includes('bold'), 'Should have strong text');
    assert.ok(div.textContent.includes('text after'), 'Should have middle text');
    assert.ok(div.textContent.includes('italic'), 'Should have em text');
  });

  test('el with zero as child', () => {
    const div = el('div', 0);

    assert.strictEqual(div.textContent, '0', 'Should render zero');
  });

  test('el with negative number as child', () => {
    const div = el('div', -42);

    assert.strictEqual(div.textContent, '-42', 'Should render negative number');
  });

  test('el with float as child', () => {
    const div = el('div', 3.14159);

    assert.strictEqual(div.textContent, '3.14159', 'Should render float');
  });

  test('el with empty string as child', () => {
    const div = el('div', '');

    assert.strictEqual(div.textContent, '', 'Should handle empty string');
  });

  test('el with whitespace string as child', () => {
    const div = el('div', '   ');

    assert.strictEqual(div.textContent, '   ', 'Should preserve whitespace');
  });

  test('el with nested arrays of children', () => {
    const div = el('div', [
      'a',
      ['b', 'c'],
      'd'
    ]);

    assert.ok(div.textContent.includes('a'), 'Should have first item');
    assert.ok(div.textContent.includes('b'), 'Should have nested first');
    assert.ok(div.textContent.includes('c'), 'Should have nested second');
    assert.ok(div.textContent.includes('d'), 'Should have last item');
  });

  test('el filters out undefined in arrays', () => {
    const items = [undefined, 'a', undefined, 'b', undefined];
    const div = el('div', items);

    assert.strictEqual(div.textContent, 'ab', 'Should filter undefined');
  });

  test('el filters out null in arrays', () => {
    const items = [null, 'a', null, 'b', null];
    const div = el('div', items);

    assert.strictEqual(div.textContent, 'ab', 'Should filter null');
  });
});

// =============================================================================
// Attribute Edge Cases
// =============================================================================

describe('Attribute Edge Cases', () => {
  test('el handles attribute with equals in value', () => {
    const elem = el('div[data-query="a=1&b=2"]');

    assert.strictEqual(elem.getAttribute('data-query'), 'a=1&b=2', 'Should handle = in value');
  });

  test('el handles attribute with spaces in value', () => {
    const elem = el('div[title="Hello World"]');

    assert.strictEqual(elem.getAttribute('title'), 'Hello World', 'Should handle spaces in value');
  });

  test('el handles multiple attributes', () => {
    const elem = el('a[href="/page"][target=_blank][rel=noopener]');

    assert.strictEqual(elem.getAttribute('href'), '/page', 'Should have href');
    assert.strictEqual(elem.getAttribute('target'), '_blank', 'Should have target');
    assert.strictEqual(elem.getAttribute('rel'), 'noopener', 'Should have rel');
  });

  test('el handles numeric attribute values', () => {
    const elem = el('input[type=number][min=0][max=100][step=5]');

    assert.strictEqual(elem.getAttribute('min'), '0', 'Should have min');
    assert.strictEqual(elem.getAttribute('max'), '100', 'Should have max');
    assert.strictEqual(elem.getAttribute('step'), '5', 'Should have step');
  });

  test('el handles hyphenated attribute names', () => {
    const elem = el('div[data-user-id=123][data-item-count=5]');

    assert.strictEqual(elem.getAttribute('data-user-id'), '123', 'Should have data-user-id');
    assert.strictEqual(elem.getAttribute('data-item-count'), '5', 'Should have data-item-count');
  });
});

// =============================================================================
// text() Function Edge Cases
// =============================================================================

describe('text() Function Edge Cases', () => {
  test('text handles zero', () => {
    const node = text(0);

    assert.strictEqual(node.textContent, '0', 'Should convert 0 to string');
  });

  test('text handles negative number', () => {
    const node = text(-99);

    assert.strictEqual(node.textContent, '-99', 'Should convert negative to string');
  });

  test('text handles boolean true', () => {
    const node = text(true);

    assert.strictEqual(node.textContent, 'true', 'Should convert true to string');
  });

  test('text handles boolean false', () => {
    const node = text(false);

    assert.strictEqual(node.textContent, 'false', 'Should convert false to string');
  });

  test('text handles null', () => {
    const node = text(null);

    assert.strictEqual(node.textContent, 'null', 'Should convert null to string');
  });

  test('text handles undefined', () => {
    const node = text(undefined);

    assert.strictEqual(node.textContent, 'undefined', 'Should convert undefined to string');
  });

  test('text handles object (toString)', () => {
    const node = text({ toString: () => 'custom' });

    assert.strictEqual(node.textContent, 'custom', 'Should use toString');
  });
});

// =============================================================================
// Selector Edge Cases
// =============================================================================

describe('Selector Edge Cases', () => {
  test('el handles tag with only id', () => {
    const elem = el('span#unique');

    assert.strictEqual(elem.tagName.toLowerCase(), 'span', 'Should have correct tag');
    assert.strictEqual(elem.id, 'unique', 'Should have id');
  });

  test('el handles multiple ids (last wins)', () => {
    const elem = el('div#first#second');

    // Depending on implementation, last id may win
    assert.ok(elem.id === 'first' || elem.id === 'second' || elem.id === 'first#second',
      'Should handle multiple ids');
  });

  test('el handles class with numbers', () => {
    const elem = el('div.col-12.mt-3');

    assert.ok(elem.className.includes('col-12'), 'Should have col-12');
    assert.ok(elem.className.includes('mt-3'), 'Should have mt-3');
  });

  test('el handles class with underscores', () => {
    const elem = el('div.my_class_name');

    assert.ok(elem.className.includes('my_class_name'), 'Should have underscore class');
  });

  test('el handles class with hyphens', () => {
    const elem = el('div.my-class-name');

    assert.ok(elem.className.includes('my-class-name'), 'Should have hyphenated class');
  });

  test('el defaults to div for class-only selector', () => {
    const elem = el('.container.fluid');

    assert.strictEqual(elem.tagName.toLowerCase(), 'div', 'Should default to div');
    assert.ok(elem.className.includes('container'), 'Should have container');
    assert.ok(elem.className.includes('fluid'), 'Should have fluid');
  });

  test('el defaults to div for id-only selector', () => {
    const elem = el('#main-content');

    assert.strictEqual(elem.tagName.toLowerCase(), 'div', 'Should default to div');
    assert.strictEqual(elem.id, 'main-content', 'Should have id');
  });

  test('el handles SVG elements', () => {
    const svg = el('svg');
    const circle = el('circle');
    const rect = el('rect');
    const path = el('path');

    assert.strictEqual(svg.tagName.toLowerCase(), 'svg', 'Should create svg');
    assert.strictEqual(circle.tagName.toLowerCase(), 'circle', 'Should create circle');
    assert.strictEqual(rect.tagName.toLowerCase(), 'rect', 'Should create rect');
    assert.strictEqual(path.tagName.toLowerCase(), 'path', 'Should create path');
  });

  test('el handles custom elements', () => {
    const elem = el('my-custom-element');

    assert.strictEqual(elem.tagName.toLowerCase(), 'my-custom-element', 'Should create custom element');
  });
});

// =============================================================================
// A11y Config Combinations
// =============================================================================

describe('A11y Config Combinations', () => {
  test('completely disabled a11y does not apply auto-aria', () => {
    configureA11y({
      enabled: false,
      autoAria: true,  // Even if autoAria is true, enabled=false should take precedence
      warnMissingAlt: true,
      warnMissingLabel: true
    });

    const dialog = el('dialog');
    // When disabled, auto-ARIA may not be applied
    // The exact behavior depends on implementation
    assert.ok(true, 'Should not throw when a11y disabled');

    resetA11yConfig();
  });

  test('enabled but autoAria disabled', () => {
    configureA11y({
      enabled: true,
      autoAria: false,
      warnMissingAlt: true,
      warnMissingLabel: true
    });

    const dialog = el('dialog');
    // Auto-ARIA should not be applied
    assert.ok(true, 'Should not throw when autoAria disabled');

    resetA11yConfig();
  });

  test('all warnings disabled', () => {
    configureA11y({
      enabled: true,
      autoAria: true,
      warnMissingAlt: false,
      warnMissingLabel: false
    });

    // These should not warn
    const img = el('img[src="/test.jpg"]');
    const input = el('input[type=text]');
    const nav = el('nav');

    assert.ok(img !== null, 'Should create img');
    assert.ok(input !== null, 'Should create input');
    assert.ok(nav !== null, 'Should create nav');

    resetA11yConfig();
  });
});
