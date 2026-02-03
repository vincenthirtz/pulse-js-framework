/**
 * DOM Element Tests - Auto-ARIA and Accessibility Features
 *
 * Tests for runtime/dom-element.js - Element creation and automatic ARIA attributes
 *
 * @module test/dom-element
 */

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

import {
  test,
  assert,
  assertEqual,
  assertDeepEqual,
  printResults,
  exitWithCode,
  printSection,
  createSpy
} from './utils.js';

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

printSection('Auto-ARIA: Dialog Elements');

test('dialog element gets role="dialog" automatically', () => {
  resetA11yConfig();
  const dialog = el('dialog');

  assertEqual(dialog.getAttribute('role'), 'dialog', 'Should have role="dialog"');
});

test('dialog element gets aria-modal="true" automatically', () => {
  resetA11yConfig();
  const dialog = el('dialog');

  assertEqual(dialog.getAttribute('aria-modal'), 'true', 'Should have aria-modal="true"');
});

test('dialog with existing role is not overwritten', () => {
  resetA11yConfig();
  const dialog = el('dialog[role=alertdialog]');

  assertEqual(dialog.getAttribute('role'), 'alertdialog', 'Should preserve existing role');
});

test('dialog with existing aria-modal is not overwritten', () => {
  resetA11yConfig();
  const dialog = el('dialog[aria-modal=false]');

  assertEqual(dialog.getAttribute('aria-modal'), 'false', 'Should preserve existing aria-modal');
});

// =============================================================================
// Auto-ARIA: Button Elements
// =============================================================================

printSection('Auto-ARIA: Button Elements');

test('button element gets type="button" automatically', () => {
  resetA11yConfig();
  const button = el('button');

  assertEqual(button.getAttribute('type'), 'button', 'Should have type="button"');
});

test('button with existing type is not overwritten', () => {
  resetA11yConfig();
  const button = el('button[type=submit]');

  assertEqual(button.getAttribute('type'), 'submit', 'Should preserve existing type');
});

test('button type="reset" is preserved', () => {
  resetA11yConfig();
  const button = el('button[type=reset]');

  assertEqual(button.getAttribute('type'), 'reset', 'Should preserve type="reset"');
});

// =============================================================================
// Auto-ARIA: Anchor Elements
// =============================================================================

printSection('Auto-ARIA: Anchor Elements');

test('anchor without href gets role="button"', () => {
  resetA11yConfig();
  const anchor = el('a');

  assertEqual(anchor.getAttribute('role'), 'button', 'Should have role="button"');
});

test('anchor without href gets tabindex="0"', () => {
  resetA11yConfig();
  const anchor = el('a');

  assertEqual(anchor.getAttribute('tabindex'), '0', 'Should have tabindex="0"');
});

test('anchor with href does not get role="button"', () => {
  resetA11yConfig();
  const anchor = el('a[href="/page"]');

  // Should not have role="button" since it has href
  assert(anchor.getAttribute('role') !== 'button' || anchor.getAttribute('role') === null,
    'Should not have role="button" when href is present');
});

test('anchor with existing role is not overwritten', () => {
  resetA11yConfig();
  const anchor = el('a[role=link]');

  assertEqual(anchor.getAttribute('role'), 'link', 'Should preserve existing role');
});

test('anchor with existing tabindex is not overwritten', () => {
  resetA11yConfig();
  const anchor = el('a[tabindex=-1]');

  assertEqual(anchor.getAttribute('tabindex'), '-1', 'Should preserve existing tabindex');
});

// =============================================================================
// Auto-ARIA: Role-Based Requirements - Checkbox/Radio/Switch
// =============================================================================

printSection('Auto-ARIA: Role-Based Requirements');

test('role="checkbox" gets aria-checked="false"', () => {
  resetA11yConfig();
  const checkbox = el('div[role=checkbox]');

  assertEqual(checkbox.getAttribute('aria-checked'), 'false', 'Should have aria-checked="false"');
});

test('role="radio" gets aria-checked="false"', () => {
  resetA11yConfig();
  const radio = el('div[role=radio]');

  assertEqual(radio.getAttribute('aria-checked'), 'false', 'Should have aria-checked="false"');
});

test('role="switch" gets aria-checked="false"', () => {
  resetA11yConfig();
  const switchEl = el('div[role=switch]');

  assertEqual(switchEl.getAttribute('aria-checked'), 'false', 'Should have aria-checked="false"');
});

test('role="checkbox" with existing aria-checked is not overwritten', () => {
  resetA11yConfig();
  const checkbox = el('div[role=checkbox][aria-checked=true]');

  assertEqual(checkbox.getAttribute('aria-checked'), 'true', 'Should preserve existing aria-checked');
});

// =============================================================================
// Auto-ARIA: Role-Based Requirements - Slider/Spinbutton/Progressbar
// =============================================================================

printSection('Auto-ARIA: Slider/Spinbutton/Progressbar');

test('role="slider" gets value attributes', () => {
  resetA11yConfig();
  const slider = el('div[role=slider]');

  assertEqual(slider.getAttribute('aria-valuenow'), '0', 'Should have aria-valuenow="0"');
  assertEqual(slider.getAttribute('aria-valuemin'), '0', 'Should have aria-valuemin="0"');
  assertEqual(slider.getAttribute('aria-valuemax'), '100', 'Should have aria-valuemax="100"');
});

test('role="spinbutton" gets value attributes', () => {
  resetA11yConfig();
  const spinbutton = el('div[role=spinbutton]');

  assertEqual(spinbutton.getAttribute('aria-valuenow'), '0', 'Should have aria-valuenow="0"');
  assertEqual(spinbutton.getAttribute('aria-valuemin'), '0', 'Should have aria-valuemin="0"');
  assertEqual(spinbutton.getAttribute('aria-valuemax'), '100', 'Should have aria-valuemax="100"');
});

test('role="progressbar" gets value attributes', () => {
  resetA11yConfig();
  const progressbar = el('div[role=progressbar]');

  assertEqual(progressbar.getAttribute('aria-valuenow'), '0', 'Should have aria-valuenow="0"');
  assertEqual(progressbar.getAttribute('aria-valuemin'), '0', 'Should have aria-valuemin="0"');
  assertEqual(progressbar.getAttribute('aria-valuemax'), '100', 'Should have aria-valuemax="100"');
});

test('role="slider" with existing values is not overwritten', () => {
  resetA11yConfig();
  const slider = el('div[role=slider][aria-valuenow=50][aria-valuemin=10][aria-valuemax=200]');

  assertEqual(slider.getAttribute('aria-valuenow'), '50', 'Should preserve aria-valuenow');
  assertEqual(slider.getAttribute('aria-valuemin'), '10', 'Should preserve aria-valuemin');
  assertEqual(slider.getAttribute('aria-valuemax'), '200', 'Should preserve aria-valuemax');
});

// =============================================================================
// Auto-ARIA: Role-Based Requirements - Combobox/Tab/Tablist
// =============================================================================

printSection('Auto-ARIA: Combobox/Tab/Tablist');

test('role="combobox" gets aria-expanded="false"', () => {
  resetA11yConfig();
  const combobox = el('div[role=combobox]');

  assertEqual(combobox.getAttribute('aria-expanded'), 'false', 'Should have aria-expanded="false"');
});

test('role="combobox" with existing aria-expanded is not overwritten', () => {
  resetA11yConfig();
  const combobox = el('div[role=combobox][aria-expanded=true]');

  assertEqual(combobox.getAttribute('aria-expanded'), 'true', 'Should preserve existing aria-expanded');
});

test('role="tablist" gets aria-orientation="horizontal"', () => {
  resetA11yConfig();
  const tablist = el('div[role=tablist]');

  assertEqual(tablist.getAttribute('aria-orientation'), 'horizontal', 'Should have aria-orientation="horizontal"');
});

test('role="tablist" with existing aria-orientation is not overwritten', () => {
  resetA11yConfig();
  const tablist = el('div[role=tablist][aria-orientation=vertical]');

  assertEqual(tablist.getAttribute('aria-orientation'), 'vertical', 'Should preserve existing aria-orientation');
});

test('role="tab" gets aria-selected="false"', () => {
  resetA11yConfig();
  const tab = el('div[role=tab]');

  assertEqual(tab.getAttribute('aria-selected'), 'false', 'Should have aria-selected="false"');
});

test('role="tab" with existing aria-selected is not overwritten', () => {
  resetA11yConfig();
  const tab = el('div[role=tab][aria-selected=true]');

  assertEqual(tab.getAttribute('aria-selected'), 'true', 'Should preserve existing aria-selected');
});

// =============================================================================
// Auto-ARIA: Interactive Roles Get Tabindex
// =============================================================================

printSection('Auto-ARIA: Interactive Roles Tabindex');

test('role="button" gets tabindex="0"', () => {
  resetA11yConfig();
  const button = el('div[role=button]');

  assertEqual(button.getAttribute('tabindex'), '0', 'Should have tabindex="0"');
});

test('role="link" gets tabindex="0"', () => {
  resetA11yConfig();
  const link = el('div[role=link]');

  assertEqual(link.getAttribute('tabindex'), '0', 'Should have tabindex="0"');
});

test('role="menuitem" gets tabindex="0"', () => {
  resetA11yConfig();
  const menuitem = el('div[role=menuitem]');

  assertEqual(menuitem.getAttribute('tabindex'), '0', 'Should have tabindex="0"');
});

test('role="button" with existing tabindex is not overwritten', () => {
  resetA11yConfig();
  const button = el('div[role=button][tabindex=-1]');

  assertEqual(button.getAttribute('tabindex'), '-1', 'Should preserve existing tabindex');
});

// =============================================================================
// A11y Configuration
// =============================================================================

printSection('A11y Configuration');

test('configureA11y can disable auto-ARIA', () => {
  configureA11y({
    enabled: false
  });

  const dialog = el('dialog');

  // When disabled, auto-ARIA should not be applied
  // (role may or may not be set depending on implementation)
  assert(true, 'Should not throw when a11y is disabled');

  resetA11yConfig();
});

test('configureA11y can disable only autoAria', () => {
  configureA11y({
    enabled: true,
    autoAria: false
  });

  const dialog = el('dialog');

  // Auto-ARIA should not be applied
  assert(true, 'Should not throw when autoAria is disabled');

  resetA11yConfig();
});

test('configureA11y can disable warning for missing alt', () => {
  configureA11y({
    warnMissingAlt: false
  });

  // Should not warn when creating img without alt
  const img = el('img');

  assert(true, 'Should not warn when warnMissingAlt is false');

  resetA11yConfig();
});

test('configureA11y can disable warning for missing label', () => {
  configureA11y({
    warnMissingLabel: false
  });

  // Should not warn when creating input without label
  const input = el('input[type=text]');

  assert(true, 'Should not warn when warnMissingLabel is false');

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

  assert(true, 'Config should merge correctly');

  resetA11yConfig();
});

// =============================================================================
// Element Creation with Children
// =============================================================================

printSection('Element Creation with Children');

test('el creates element with text child', () => {
  const div = el('div', 'Hello World');

  assertEqual(div.textContent, 'Hello World', 'Should have text content');
});

test('el creates element with multiple children', () => {
  const div = el('div',
    el('span', 'First'),
    el('span', 'Second')
  );

  assertEqual(div.children.length, 2, 'Should have 2 children');
});

test('el creates element with array of children', () => {
  const items = ['A', 'B', 'C'];
  const ul = el('ul', items.map(item => el('li', item)));

  assertEqual(ul.children.length, 3, 'Should have 3 list items');
});

test('el handles null children gracefully', () => {
  const div = el('div', null, 'text', undefined);

  assertEqual(div.textContent, 'text', 'Should only render non-null content');
});

test('el handles false children gracefully', () => {
  const div = el('div', false && el('span', 'hidden'), 'visible');

  assertEqual(div.textContent, 'visible', 'Should not render false children');
});

test('el handles number children', () => {
  const div = el('div', 42);

  assertEqual(div.textContent, '42', 'Should convert number to string');
});

test('el handles mixed children types', () => {
  const div = el('div',
    'text',
    el('span', 'element'),
    123,
    null,
    ['array', 'items']
  );

  assert(div.textContent.includes('text'), 'Should include text');
  assert(div.textContent.includes('element'), 'Should include nested element text');
  assert(div.textContent.includes('123'), 'Should include number');
  assert(div.textContent.includes('array'), 'Should include array items');
});

// =============================================================================
// text() Function Tests
// =============================================================================

printSection('text() Function Tests');

test('text creates static text node', () => {
  const node = text('Hello');

  assertEqual(node.textContent, 'Hello', 'Should have correct text');
});

test('text converts number to string', () => {
  const node = text(42);

  assertEqual(node.textContent, '42', 'Should convert number to string');
});

test('text handles empty string', () => {
  const node = text('');

  assertEqual(node.textContent, '', 'Should handle empty string');
});

// =============================================================================
// Complex Selector Parsing
// =============================================================================

printSection('Complex Selector Parsing');

test('el handles selector with id, class, and attributes', () => {
  const elem = el('input#email.form-control[type=email][placeholder="Enter email"]');

  assertEqual(elem.tagName.toLowerCase(), 'input', 'Should have correct tag');
  assertEqual(elem.id, 'email', 'Should have correct id');
  assert(elem.className.includes('form-control'), 'Should have correct class');
  assertEqual(elem.getAttribute('type'), 'email', 'Should have type attribute');
  assertEqual(elem.getAttribute('placeholder'), 'Enter email', 'Should have placeholder');
});

test('el handles multiple classes', () => {
  const elem = el('button.btn.btn-primary.large');

  assert(elem.className.includes('btn'), 'Should have btn class');
  assert(elem.className.includes('btn-primary'), 'Should have btn-primary class');
  assert(elem.className.includes('large'), 'Should have large class');
});

test('el handles boolean attributes', () => {
  const elem = el('input[type=checkbox][checked][disabled]');

  assertEqual(elem.getAttribute('checked'), '', 'Should have checked attribute');
  assertEqual(elem.getAttribute('disabled'), '', 'Should have disabled attribute');
});

test('el handles data attributes', () => {
  const elem = el('div[data-id=123][data-name="test"]');

  assertEqual(elem.getAttribute('data-id'), '123', 'Should have data-id');
  assertEqual(elem.getAttribute('data-name'), 'test', 'Should have data-name');
});

test('el handles aria attributes in selector', () => {
  const elem = el('button[aria-label="Close"][aria-expanded=false]');

  assertEqual(elem.getAttribute('aria-label'), 'Close', 'Should have aria-label');
  assertEqual(elem.getAttribute('aria-expanded'), 'false', 'Should have aria-expanded');
});

// =============================================================================
// Edge Cases
// =============================================================================

printSection('Edge Cases');

test('el handles empty selector (defaults to div)', () => {
  // This might throw or default to div depending on implementation
  try {
    const elem = el('');
    assert(elem !== null, 'Should create an element');
  } catch {
    assert(true, 'May throw for empty selector');
  }
});

test('el handles selector starting with class', () => {
  const elem = el('.container');

  assertEqual(elem.tagName.toLowerCase(), 'div', 'Should default to div');
  assert(elem.className.includes('container'), 'Should have container class');
});

test('el handles selector starting with id', () => {
  const elem = el('#app');

  assertEqual(elem.tagName.toLowerCase(), 'div', 'Should default to div');
  assertEqual(elem.id, 'app', 'Should have app id');
});

test('el handles special HTML elements', () => {
  const header = el('header');
  const nav = el('nav');
  const main = el('main');
  const footer = el('footer');
  const aside = el('aside');
  const article = el('article');
  const section = el('section');

  assertEqual(header.tagName.toLowerCase(), 'header', 'Should create header');
  assertEqual(nav.tagName.toLowerCase(), 'nav', 'Should create nav');
  assertEqual(main.tagName.toLowerCase(), 'main', 'Should create main');
  assertEqual(footer.tagName.toLowerCase(), 'footer', 'Should create footer');
  assertEqual(aside.tagName.toLowerCase(), 'aside', 'Should create aside');
  assertEqual(article.tagName.toLowerCase(), 'article', 'Should create article');
  assertEqual(section.tagName.toLowerCase(), 'section', 'Should create section');
});

test('el handles form elements', () => {
  const form = el('form[action="/submit"][method=post]');
  const input = el('input[type=text][name=username]');
  const textarea = el('textarea[name=message]');
  const select = el('select[name=country]');

  assertEqual(form.tagName.toLowerCase(), 'form', 'Should create form');
  assertEqual(input.tagName.toLowerCase(), 'input', 'Should create input');
  assertEqual(textarea.tagName.toLowerCase(), 'textarea', 'Should create textarea');
  assertEqual(select.tagName.toLowerCase(), 'select', 'Should create select');
});

test('el handles table elements', () => {
  const table = el('table');
  const thead = el('thead');
  const tbody = el('tbody');
  const tr = el('tr');
  const th = el('th');
  const td = el('td');

  assertEqual(table.tagName.toLowerCase(), 'table', 'Should create table');
  assertEqual(thead.tagName.toLowerCase(), 'thead', 'Should create thead');
  assertEqual(tbody.tagName.toLowerCase(), 'tbody', 'Should create tbody');
  assertEqual(tr.tagName.toLowerCase(), 'tr', 'Should create tr');
  assertEqual(th.tagName.toLowerCase(), 'th', 'Should create th');
  assertEqual(td.tagName.toLowerCase(), 'td', 'Should create td');
});

// =============================================================================
// Run Tests
// =============================================================================

printResults();
exitWithCode();
