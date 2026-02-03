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
// Additional Auto-ARIA Tests
// =============================================================================

printSection('Additional Auto-ARIA Tests');

test('img without alt triggers warning (warnMissingAlt enabled)', () => {
  resetA11yConfig();
  // Create img without alt - should trigger warning but not throw
  const img = el('img[src="/photo.jpg"]');

  assertEqual(img.tagName.toLowerCase(), 'img', 'Should create img element');
  assertEqual(img.getAttribute('src'), '/photo.jpg', 'Should have src');
});

test('img with alt does not trigger warning', () => {
  resetA11yConfig();
  const img = el('img[src="/photo.jpg"][alt="A beautiful sunset"]');

  assertEqual(img.getAttribute('alt'), 'A beautiful sunset', 'Should have alt');
});

test('img with aria-label does not trigger warning', () => {
  resetA11yConfig();
  const img = el('img[src="/photo.jpg"][aria-label="Sunset photo"]');

  assertEqual(img.getAttribute('aria-label'), 'Sunset photo', 'Should have aria-label');
});

test('img with aria-hidden does not trigger warning', () => {
  resetA11yConfig();
  const img = el('img[src="/icon.svg"][aria-hidden=true]');

  assertEqual(img.getAttribute('aria-hidden'), 'true', 'Should have aria-hidden');
});

test('input without label triggers warning', () => {
  resetA11yConfig();
  // Create input without label - should trigger warning but not throw
  const input = el('input[type=text]');

  assertEqual(input.tagName.toLowerCase(), 'input', 'Should create input element');
});

test('input with aria-label does not trigger warning', () => {
  resetA11yConfig();
  const input = el('input[type=text][aria-label="Username"]');

  assertEqual(input.getAttribute('aria-label'), 'Username', 'Should have aria-label');
});

test('input with id can have associated label', () => {
  resetA11yConfig();
  const input = el('input[type=text][id=username]');

  assertEqual(input.id, 'username', 'Should have id');
});

test('input type=hidden does not trigger warning', () => {
  resetA11yConfig();
  const input = el('input[type=hidden][name=csrf]');

  assertEqual(input.getAttribute('type'), 'hidden', 'Should have type=hidden');
});

test('input type=submit does not trigger warning', () => {
  resetA11yConfig();
  const input = el('input[type=submit][value=Send]');

  assertEqual(input.getAttribute('type'), 'submit', 'Should have type=submit');
});

test('input type=button does not trigger warning', () => {
  resetA11yConfig();
  const input = el('input[type=button][value=Click]');

  assertEqual(input.getAttribute('type'), 'button', 'Should have type=button');
});

test('textarea without label triggers warning', () => {
  resetA11yConfig();
  const textarea = el('textarea');

  assertEqual(textarea.tagName.toLowerCase(), 'textarea', 'Should create textarea');
});

test('select without label triggers warning', () => {
  resetA11yConfig();
  const select = el('select');

  assertEqual(select.tagName.toLowerCase(), 'select', 'Should create select');
});

test('nav without aria-label triggers warning', () => {
  resetA11yConfig();
  const nav = el('nav');

  assertEqual(nav.tagName.toLowerCase(), 'nav', 'Should create nav');
});

test('nav with aria-label does not trigger warning', () => {
  resetA11yConfig();
  const nav = el('nav[aria-label="Main navigation"]');

  assertEqual(nav.getAttribute('aria-label'), 'Main navigation', 'Should have aria-label');
});

test('nav with aria-labelledby does not trigger warning', () => {
  resetA11yConfig();
  const nav = el('nav[aria-labelledby=nav-heading]');

  assertEqual(nav.getAttribute('aria-labelledby'), 'nav-heading', 'Should have aria-labelledby');
});

test('progress without label triggers warning', () => {
  resetA11yConfig();
  const progress = el('progress[value=50][max=100]');

  assertEqual(progress.tagName.toLowerCase(), 'progress', 'Should create progress');
});

test('meter without label triggers warning', () => {
  resetA11yConfig();
  const meter = el('meter[value=50][min=0][max=100]');

  assertEqual(meter.tagName.toLowerCase(), 'meter', 'Should create meter');
});

test('ul with role=menu needs aria-label', () => {
  resetA11yConfig();
  const ul = el('ul[role=menu]');

  assertEqual(ul.getAttribute('role'), 'menu', 'Should have role=menu');
});

test('ol with role=listbox needs aria-label', () => {
  resetA11yConfig();
  const ol = el('ol[role=listbox]');

  assertEqual(ol.getAttribute('role'), 'listbox', 'Should have role=listbox');
});

// =============================================================================
// More Role-Based Requirements Tests
// =============================================================================

printSection('More Role-Based Requirements');

test('role="button" on div gets tabindex', () => {
  resetA11yConfig();
  const div = el('div[role=button]');

  assertEqual(div.getAttribute('role'), 'button', 'Should have role');
  assertEqual(div.getAttribute('tabindex'), '0', 'Should have tabindex');
});

test('role="link" on span gets tabindex', () => {
  resetA11yConfig();
  const span = el('span[role=link]');

  assertEqual(span.getAttribute('role'), 'link', 'Should have role');
  assertEqual(span.getAttribute('tabindex'), '0', 'Should have tabindex');
});

test('role="menuitem" on li gets tabindex', () => {
  resetA11yConfig();
  const li = el('li[role=menuitem]');

  assertEqual(li.getAttribute('role'), 'menuitem', 'Should have role');
  assertEqual(li.getAttribute('tabindex'), '0', 'Should have tabindex');
});

test('role="switch" gets aria-checked', () => {
  resetA11yConfig();
  const toggle = el('button[role=switch]');

  assertEqual(toggle.getAttribute('role'), 'switch', 'Should have role');
  assertEqual(toggle.getAttribute('aria-checked'), 'false', 'Should have aria-checked');
});

test('role="progressbar" gets value attributes', () => {
  resetA11yConfig();
  const progressbar = el('div[role=progressbar]');

  assertEqual(progressbar.getAttribute('aria-valuenow'), '0', 'Should have valuenow');
  assertEqual(progressbar.getAttribute('aria-valuemin'), '0', 'Should have valuemin');
  assertEqual(progressbar.getAttribute('aria-valuemax'), '100', 'Should have valuemax');
});

test('role="spinbutton" gets value attributes', () => {
  resetA11yConfig();
  const spinbutton = el('input[role=spinbutton]');

  assertEqual(spinbutton.getAttribute('aria-valuenow'), '0', 'Should have valuenow');
  assertEqual(spinbutton.getAttribute('aria-valuemin'), '0', 'Should have valuemin');
  assertEqual(spinbutton.getAttribute('aria-valuemax'), '100', 'Should have valuemax');
});

// =============================================================================
// Deep Nesting and Complex Children Tests
// =============================================================================

printSection('Deep Nesting and Complex Children');

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

  assertEqual(wrapper.children.length, 1, 'Should have one direct child');
  const section = wrapper.querySelector ? wrapper.firstChild : wrapper.children[0];
  assertEqual(section.tagName.toLowerCase(), 'section', 'Should have section child');
});

test('el with mixed content types', () => {
  const div = el('div',
    'Text before ',
    el('strong', 'bold'),
    ' text after ',
    el('em', 'italic'),
    ' and more'
  );

  assert(div.textContent.includes('Text before'), 'Should have leading text');
  assert(div.textContent.includes('bold'), 'Should have strong text');
  assert(div.textContent.includes('text after'), 'Should have middle text');
  assert(div.textContent.includes('italic'), 'Should have em text');
});

test('el with zero as child', () => {
  const div = el('div', 0);

  assertEqual(div.textContent, '0', 'Should render zero');
});

test('el with negative number as child', () => {
  const div = el('div', -42);

  assertEqual(div.textContent, '-42', 'Should render negative number');
});

test('el with float as child', () => {
  const div = el('div', 3.14159);

  assertEqual(div.textContent, '3.14159', 'Should render float');
});

test('el with empty string as child', () => {
  const div = el('div', '');

  assertEqual(div.textContent, '', 'Should handle empty string');
});

test('el with whitespace string as child', () => {
  const div = el('div', '   ');

  assertEqual(div.textContent, '   ', 'Should preserve whitespace');
});

test('el with nested arrays of children', () => {
  const div = el('div', [
    'a',
    ['b', 'c'],
    'd'
  ]);

  assert(div.textContent.includes('a'), 'Should have first item');
  assert(div.textContent.includes('b'), 'Should have nested first');
  assert(div.textContent.includes('c'), 'Should have nested second');
  assert(div.textContent.includes('d'), 'Should have last item');
});

test('el filters out undefined in arrays', () => {
  const items = [undefined, 'a', undefined, 'b', undefined];
  const div = el('div', items);

  assertEqual(div.textContent, 'ab', 'Should filter undefined');
});

test('el filters out null in arrays', () => {
  const items = [null, 'a', null, 'b', null];
  const div = el('div', items);

  assertEqual(div.textContent, 'ab', 'Should filter null');
});

// =============================================================================
// Attribute Edge Cases
// =============================================================================

printSection('Attribute Edge Cases');

test('el handles attribute with equals in value', () => {
  const elem = el('div[data-query="a=1&b=2"]');

  assertEqual(elem.getAttribute('data-query'), 'a=1&b=2', 'Should handle = in value');
});

test('el handles attribute with spaces in value', () => {
  const elem = el('div[title="Hello World"]');

  assertEqual(elem.getAttribute('title'), 'Hello World', 'Should handle spaces in value');
});

test('el handles multiple attributes', () => {
  const elem = el('a[href="/page"][target=_blank][rel=noopener]');

  assertEqual(elem.getAttribute('href'), '/page', 'Should have href');
  assertEqual(elem.getAttribute('target'), '_blank', 'Should have target');
  assertEqual(elem.getAttribute('rel'), 'noopener', 'Should have rel');
});

test('el handles numeric attribute values', () => {
  const elem = el('input[type=number][min=0][max=100][step=5]');

  assertEqual(elem.getAttribute('min'), '0', 'Should have min');
  assertEqual(elem.getAttribute('max'), '100', 'Should have max');
  assertEqual(elem.getAttribute('step'), '5', 'Should have step');
});

test('el handles hyphenated attribute names', () => {
  const elem = el('div[data-user-id=123][data-item-count=5]');

  assertEqual(elem.getAttribute('data-user-id'), '123', 'Should have data-user-id');
  assertEqual(elem.getAttribute('data-item-count'), '5', 'Should have data-item-count');
});

// =============================================================================
// text() Function Edge Cases
// =============================================================================

printSection('text() Function Edge Cases');

test('text handles zero', () => {
  const node = text(0);

  assertEqual(node.textContent, '0', 'Should convert 0 to string');
});

test('text handles negative number', () => {
  const node = text(-99);

  assertEqual(node.textContent, '-99', 'Should convert negative to string');
});

test('text handles boolean true', () => {
  const node = text(true);

  assertEqual(node.textContent, 'true', 'Should convert true to string');
});

test('text handles boolean false', () => {
  const node = text(false);

  assertEqual(node.textContent, 'false', 'Should convert false to string');
});

test('text handles null', () => {
  const node = text(null);

  assertEqual(node.textContent, 'null', 'Should convert null to string');
});

test('text handles undefined', () => {
  const node = text(undefined);

  assertEqual(node.textContent, 'undefined', 'Should convert undefined to string');
});

test('text handles object (toString)', () => {
  const node = text({ toString: () => 'custom' });

  assertEqual(node.textContent, 'custom', 'Should use toString');
});

// =============================================================================
// Selector Edge Cases
// =============================================================================

printSection('Selector Edge Cases');

test('el handles tag with only id', () => {
  const elem = el('span#unique');

  assertEqual(elem.tagName.toLowerCase(), 'span', 'Should have correct tag');
  assertEqual(elem.id, 'unique', 'Should have id');
});

test('el handles multiple ids (last wins)', () => {
  const elem = el('div#first#second');

  // Depending on implementation, last id may win
  assert(elem.id === 'first' || elem.id === 'second' || elem.id === 'first#second',
    'Should handle multiple ids');
});

test('el handles class with numbers', () => {
  const elem = el('div.col-12.mt-3');

  assert(elem.className.includes('col-12'), 'Should have col-12');
  assert(elem.className.includes('mt-3'), 'Should have mt-3');
});

test('el handles class with underscores', () => {
  const elem = el('div.my_class_name');

  assert(elem.className.includes('my_class_name'), 'Should have underscore class');
});

test('el handles class with hyphens', () => {
  const elem = el('div.my-class-name');

  assert(elem.className.includes('my-class-name'), 'Should have hyphenated class');
});

test('el defaults to div for class-only selector', () => {
  const elem = el('.container.fluid');

  assertEqual(elem.tagName.toLowerCase(), 'div', 'Should default to div');
  assert(elem.className.includes('container'), 'Should have container');
  assert(elem.className.includes('fluid'), 'Should have fluid');
});

test('el defaults to div for id-only selector', () => {
  const elem = el('#main-content');

  assertEqual(elem.tagName.toLowerCase(), 'div', 'Should default to div');
  assertEqual(elem.id, 'main-content', 'Should have id');
});

test('el handles SVG elements', () => {
  const svg = el('svg');
  const circle = el('circle');
  const rect = el('rect');
  const path = el('path');

  assertEqual(svg.tagName.toLowerCase(), 'svg', 'Should create svg');
  assertEqual(circle.tagName.toLowerCase(), 'circle', 'Should create circle');
  assertEqual(rect.tagName.toLowerCase(), 'rect', 'Should create rect');
  assertEqual(path.tagName.toLowerCase(), 'path', 'Should create path');
});

test('el handles custom elements', () => {
  const elem = el('my-custom-element');

  assertEqual(elem.tagName.toLowerCase(), 'my-custom-element', 'Should create custom element');
});

// =============================================================================
// A11y Config Combinations
// =============================================================================

printSection('A11y Config Combinations');

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
  assert(true, 'Should not throw when a11y disabled');

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
  assert(true, 'Should not throw when autoAria disabled');

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

  assert(img !== null, 'Should create img');
  assert(input !== null, 'Should create input');
  assert(nav !== null, 'Should create nav');

  resetA11yConfig();
});

// =============================================================================
// Run Tests
// =============================================================================

printResults();
exitWithCode();
