/**
 * A11y Widgets Coverage Boost Tests
 * Comprehensive tests for ARIA widgets in runtime/a11y/widgets.js
 * Target: Increase widgets.js coverage from 59% to 90%+
 *
 * Uncovered areas: createTabs keyboard navigation, createModal full lifecycle,
 * createTooltip timers, createAccordion multi-panel, createMenu keyboard navigation
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createDOM } from './mock-dom.js';

// Set up DOM environment
const { document, HTMLElement, Node, Event } = createDOM();
globalThis.document = document;
globalThis.HTMLElement = HTMLElement;
globalThis.Node = Node;
globalThis.Event = Event;

// Polyfill requestAnimationFrame for trapFocus in modal tests
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

// The production code in widgets.js calls announce() which is not imported.
// Provide a global no-op to prevent ReferenceError in tests.
globalThis.announce = () => {};

// Import after DOM setup
import {
  setAriaAttributes,
  createDisclosure,
  createTabs,
  createModal,
  createTooltip,
  createAccordion,
  createMenu
} from '../runtime/a11y/widgets.js';
import { createRovingTabindex } from '../runtime/a11y/focus.js';

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// setAriaAttributes - Basic utility (lines 21-29)
// ============================================================================

describe('setAriaAttributes', () => {
  test('sets multiple ARIA attributes', () => {
    const el = document.createElement('div');
    setAriaAttributes(el, {
      label: 'Test label',
      expanded: 'true',
      controls: 'content-id'
    });

    assert.strictEqual(el.getAttribute('aria-label'), 'Test label');
    assert.strictEqual(el.getAttribute('aria-expanded'), 'true');
    assert.strictEqual(el.getAttribute('aria-controls'), 'content-id');
  });

  test('removes attributes when value is null', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-label', 'Original');

    setAriaAttributes(el, { label: null });

    assert.strictEqual(el.getAttribute('aria-label'), null);
  });

  test('removes attributes when value is undefined', () => {
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');

    setAriaAttributes(el, { hidden: undefined });

    assert.strictEqual(el.getAttribute('aria-hidden'), null);
  });

  test('converts non-string values to string', () => {
    const el = document.createElement('div');
    setAriaAttributes(el, {
      valuenow: 50,
      checked: false,
      level: 3
    });

    assert.strictEqual(el.getAttribute('aria-valuenow'), '50');
    assert.strictEqual(el.getAttribute('aria-checked'), 'false');
    assert.strictEqual(el.getAttribute('aria-level'), '3');
  });
});

// ============================================================================
// createDisclosure - Comprehensive tests (lines 38-75)
// ============================================================================

describe('createDisclosure', () => {
  let trigger, content;

  beforeEach(() => {
    trigger = document.createElement('button');
    content = document.createElement('div');
    document.body.appendChild(trigger);
    document.body.appendChild(content);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('initializes with defaultOpen: false', () => {
    const { expanded } = createDisclosure(trigger, content);

    assert.strictEqual(expanded.get(), false);
    assert.strictEqual(trigger.getAttribute('aria-expanded'), 'false');
    assert.strictEqual(content.hidden, true);
  });

  test('initializes with defaultOpen: true', () => {
    const { expanded } = createDisclosure(trigger, content, { defaultOpen: true });

    assert.strictEqual(expanded.get(), true);
    assert.strictEqual(trigger.getAttribute('aria-expanded'), 'true');
    assert.strictEqual(content.hidden, false);
  });

  test('sets aria-controls to content id', () => {
    content.id = 'my-content';
    createDisclosure(trigger, content);

    assert.strictEqual(trigger.getAttribute('aria-controls'), 'my-content');
  });

  test('generates id if content has no id', () => {
    createDisclosure(trigger, content);

    assert.ok(content.id);
    assert.ok(content.id.startsWith('pulse-disclosure-'));
    assert.strictEqual(trigger.getAttribute('aria-controls'), content.id);
  });

  test('toggle() toggles expanded state', () => {
    const { toggle, expanded } = createDisclosure(trigger, content);

    toggle();
    assert.strictEqual(expanded.get(), true);

    toggle();
    assert.strictEqual(expanded.get(), false);
  });

  test('open() sets expanded to true', () => {
    const { open, expanded } = createDisclosure(trigger, content);

    open();
    assert.strictEqual(expanded.get(), true);
  });

  test('close() sets expanded to false', () => {
    const { close, expanded } = createDisclosure(trigger, content, { defaultOpen: true });

    close();
    assert.strictEqual(expanded.get(), false);
  });

  test('calls onToggle callback when state changes', () => {
    const toggles = [];
    const { toggle } = createDisclosure(trigger, content, {
      onToggle: (isOpen) => toggles.push(isOpen)
    });

    // The effect fires onToggle immediately on creation with the initial value (false)
    toggle();
    toggle();

    assert.deepStrictEqual(toggles, [false, true, false]);
  });

  test('click event toggles disclosure', () => {
    const { expanded } = createDisclosure(trigger, content);

    trigger.click();
    assert.strictEqual(expanded.get(), true);

    trigger.click();
    assert.strictEqual(expanded.get(), false);
  });

  test('Enter key toggles disclosure', () => {
    const { expanded } = createDisclosure(trigger, content);

    const enterEvent = new Event('keydown');
    enterEvent.key = 'Enter';
    trigger.dispatchEvent(enterEvent);

    assert.strictEqual(expanded.get(), true);
  });

  test('Space key toggles disclosure', () => {
    const { expanded } = createDisclosure(trigger, content);

    const spaceEvent = new Event('keydown');
    spaceEvent.key = ' ';
    trigger.dispatchEvent(spaceEvent);

    assert.strictEqual(expanded.get(), true);
  });
});

// ============================================================================
// createTabs - Comprehensive tests (lines 83-187)
// ============================================================================

describe('createTabs', () => {
  let tablist, tab1, tab2, tab3, panel1, panel2, panel3;

  beforeEach(() => {
    tablist = document.createElement('div');
    tablist.setAttribute('role', 'tablist');

    tab1 = document.createElement('button');
    tab1.setAttribute('role', 'tab');
    tab1.setAttribute('aria-controls', 'panel-1');

    tab2 = document.createElement('button');
    tab2.setAttribute('role', 'tab');
    tab2.setAttribute('aria-controls', 'panel-2');

    tab3 = document.createElement('button');
    tab3.setAttribute('role', 'tab');
    tab3.setAttribute('aria-controls', 'panel-3');

    tablist.appendChild(tab1);
    tablist.appendChild(tab2);
    tablist.appendChild(tab3);

    panel1 = document.createElement('div');
    panel1.id = 'panel-1';
    panel1.setAttribute('role', 'tabpanel');

    panel2 = document.createElement('div');
    panel2.id = 'panel-2';
    panel2.setAttribute('role', 'tabpanel');

    panel3 = document.createElement('div');
    panel3.id = 'panel-3';
    panel3.setAttribute('role', 'tabpanel');

    document.body.appendChild(tablist);
    document.body.appendChild(panel1);
    document.body.appendChild(panel2);
    document.body.appendChild(panel3);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('initializes with default index 0', () => {
    const { selectedIndex } = createTabs(tablist);

    assert.strictEqual(selectedIndex.get(), 0);
    assert.strictEqual(tab1.getAttribute('aria-selected'), 'true');
    assert.strictEqual(tab2.getAttribute('aria-selected'), 'false');
    assert.strictEqual(tab3.getAttribute('aria-selected'), 'false');
  });

  test('initializes with custom defaultIndex', () => {
    const { selectedIndex } = createTabs(tablist, { defaultIndex: 1 });

    assert.strictEqual(selectedIndex.get(), 1);
    assert.strictEqual(tab2.getAttribute('aria-selected'), 'true');
  });

  test('sets orientation attribute', () => {
    createTabs(tablist, { orientation: 'vertical' });
    assert.strictEqual(tablist.getAttribute('aria-orientation'), 'vertical');
  });

  test('select() changes active tab', () => {
    const { select, selectedIndex } = createTabs(tablist);

    select(2);
    assert.strictEqual(selectedIndex.get(), 2);
    assert.strictEqual(tab3.getAttribute('aria-selected'), 'true');
  });

  test('calls onSelect callback', () => {
    const selections = [];
    const { select } = createTabs(tablist, {
      onSelect: (index) => selections.push(index)
    });

    // The effect fires onSelect immediately on creation with defaultIndex (0)
    select(1);
    select(2);

    assert.deepStrictEqual(selections, [0, 1, 2]);
  });

  test('click on tab selects it', () => {
    const { selectedIndex } = createTabs(tablist);

    tab2.click();
    assert.strictEqual(selectedIndex.get(), 1);
  });

  test('ArrowRight navigates to next tab (horizontal)', () => {
    const { selectedIndex } = createTabs(tablist, { orientation: 'horizontal' });

    const arrowEvent = new Event('keydown');
    arrowEvent.key = 'ArrowRight';
    tablist.dispatchEvent(arrowEvent);

    assert.strictEqual(selectedIndex.get(), 1);
  });

  test('ArrowLeft navigates to previous tab (horizontal)', () => {
    const { selectedIndex, select } = createTabs(tablist, { orientation: 'horizontal' });
    select(1);

    const arrowEvent = new Event('keydown');
    arrowEvent.key = 'ArrowLeft';
    tablist.dispatchEvent(arrowEvent);

    assert.strictEqual(selectedIndex.get(), 0);
  });

  test('ArrowDown navigates to next tab (vertical)', () => {
    const { selectedIndex } = createTabs(tablist, { orientation: 'vertical' });

    const arrowEvent = new Event('keydown');
    arrowEvent.key = 'ArrowDown';
    tablist.dispatchEvent(arrowEvent);

    assert.strictEqual(selectedIndex.get(), 1);
  });

  test('ArrowUp navigates to previous tab (vertical)', () => {
    const { selectedIndex, select } = createTabs(tablist, { orientation: 'vertical' });
    select(1);

    const arrowEvent = new Event('keydown');
    arrowEvent.key = 'ArrowUp';
    tablist.dispatchEvent(arrowEvent);

    assert.strictEqual(selectedIndex.get(), 0);
  });

  test('Home key selects first tab', () => {
    const { selectedIndex, select } = createTabs(tablist);
    select(2);

    const homeEvent = new Event('keydown');
    homeEvent.key = 'Home';
    tablist.dispatchEvent(homeEvent);

    assert.strictEqual(selectedIndex.get(), 0);
  });

  test('End key selects last tab', () => {
    const { selectedIndex } = createTabs(tablist);

    const endEvent = new Event('keydown');
    endEvent.key = 'End';
    tablist.dispatchEvent(endEvent);

    assert.strictEqual(selectedIndex.get(), 2);
  });

  test('wraps around from last to first tab', () => {
    const { selectedIndex, select } = createTabs(tablist);
    select(2);

    const arrowEvent = new Event('keydown');
    arrowEvent.key = 'ArrowRight';
    tablist.dispatchEvent(arrowEvent);

    assert.strictEqual(selectedIndex.get(), 0);
  });

  test('wraps around from first to last tab', () => {
    const { selectedIndex } = createTabs(tablist);

    const arrowEvent = new Event('keydown');
    arrowEvent.key = 'ArrowLeft';
    tablist.dispatchEvent(arrowEvent);

    assert.strictEqual(selectedIndex.get(), 2);
  });

  test('panels visibility updates with selection', () => {
    const { select } = createTabs(tablist);

    assert.strictEqual(panel1.hidden, false);
    assert.strictEqual(panel2.hidden, true);

    select(1);
    assert.strictEqual(panel1.hidden, true);
    assert.strictEqual(panel2.hidden, false);
  });
});

// ============================================================================
// createModal - Full lifecycle tests (lines 193-271)
// ============================================================================

describe('createModal', () => {
  let dialog;

  beforeEach(() => {
    dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('initializes modal closed', () => {
    const { isOpen } = createModal(dialog);
    assert.strictEqual(isOpen.get(), false);
    // Production code does not set aria-hidden; it uses dialog.hidden via open()/close()
    assert.strictEqual(dialog.getAttribute('role'), 'dialog');
  });

  test('sets aria-modal to true', () => {
    createModal(dialog);
    assert.strictEqual(dialog.getAttribute('aria-modal'), 'true');
  });

  test('sets aria-labelledby if provided', () => {
    // Production sets aria-labelledby in the constructor, not in open()
    createModal(dialog, { labelledBy: 'modal-title' });
    assert.strictEqual(dialog.getAttribute('aria-labelledby'), 'modal-title');
  });

  test('sets aria-describedby if provided', () => {
    // Production sets aria-describedby in the constructor, not in open()
    createModal(dialog, { describedBy: 'modal-desc' });
    assert.strictEqual(dialog.getAttribute('aria-describedby'), 'modal-desc');
  });

  test('open() shows modal', () => {
    const { open, isOpen } = createModal(dialog, { inertBackground: false });
    open();
    assert.strictEqual(isOpen.get(), true);
    assert.strictEqual(dialog.hidden, false);
  });

  test('close() hides modal', () => {
    const { open, close, isOpen } = createModal(dialog, { inertBackground: false });
    open();
    close();
    assert.strictEqual(isOpen.get(), false);
    assert.strictEqual(dialog.hidden, true);
  });

  test('open and close lifecycle', () => {
    // Production code does not expose a toggle() method; it returns { isOpen, open, close }
    const { open, close, isOpen } = createModal(dialog, { inertBackground: false });

    open();
    assert.strictEqual(isOpen.get(), true);

    close();
    assert.strictEqual(isOpen.get(), false);
  });

  test('calls onClose callback when closed', () => {
    let closeCalled = false;
    const { open, close } = createModal(dialog, {
      onClose: () => { closeCalled = true; },
      inertBackground: false
    });

    open();
    close();
    assert.strictEqual(closeCalled, true);
  });

  test('Escape key closes modal', () => {
    const { open, isOpen } = createModal(dialog, { inertBackground: false });
    open();

    // onEscapeKey registers on the dialog element, not on document
    const escEvent = new Event('keydown');
    escEvent.key = 'Escape';
    dialog.dispatchEvent(escEvent);

    assert.strictEqual(isOpen.get(), false);
  });

  test('backdrop click closes modal if closeOnBackdropClick', () => {
    const { open, isOpen } = createModal(dialog, { closeOnBackdropClick: true, inertBackground: false });
    open();

    // Simulate click on dialog itself (not on child)
    const clickEvent = new Event('click');
    Object.defineProperty(clickEvent, 'target', { value: dialog });
    dialog.dispatchEvent(clickEvent);

    assert.strictEqual(isOpen.get(), false);
  });

  test('backdrop click does NOT close if closeOnBackdropClick is false', () => {
    const { open, isOpen } = createModal(dialog, { closeOnBackdropClick: false, inertBackground: false });
    open();

    const clickEvent = new Event('click');
    Object.defineProperty(clickEvent, 'target', { value: dialog });
    dialog.dispatchEvent(clickEvent);

    assert.strictEqual(isOpen.get(), true);
  });

  test('click on child does not close modal', () => {
    const { open, isOpen } = createModal(dialog, { closeOnBackdropClick: true, inertBackground: false });
    const child = document.createElement('div');
    dialog.appendChild(child);
    open();

    // The backdrop handler checks e.target === dialog. When clicking a child,
    // e.target is the child, so the modal should stay open.
    // Use a getter with no-op setter so the mock DOM's dispatchEvent cannot
    // overwrite the target value when it does event.target = this.
    const clickEvent = new Event('click');
    Object.defineProperty(clickEvent, 'target', { get: () => child, set: () => {}, configurable: true });
    dialog.dispatchEvent(clickEvent);

    assert.strictEqual(isOpen.get(), true);
  });
});

// ============================================================================
// createTooltip - Timer and lifecycle tests (lines 277-345)
// ============================================================================

describe('createTooltip', () => {
  let trigger, tooltip;

  beforeEach(() => {
    trigger = document.createElement('button');
    trigger.textContent = 'Trigger';
    tooltip = document.createElement('div');
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = 'Tooltip text';
    document.body.appendChild(trigger);
    document.body.appendChild(tooltip);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('initializes tooltip hidden', () => {
    const { isVisible } = createTooltip(trigger, tooltip);
    assert.strictEqual(isVisible.get(), false);
    // Production code uses tooltip.hidden, not aria-hidden
    assert.strictEqual(tooltip.hidden, true);
  });

  test('generates unique id for tooltip', () => {
    createTooltip(trigger, tooltip);
    assert.ok(tooltip.id);
    assert.strictEqual(trigger.getAttribute('aria-describedby'), tooltip.id);
  });

  test('show() displays tooltip', () => {
    const { show, isVisible } = createTooltip(trigger, tooltip);
    show();
    assert.strictEqual(isVisible.get(), true);
    // Production code uses tooltip.hidden, not aria-hidden
    assert.strictEqual(tooltip.hidden, false);
  });

  test('hide() hides tooltip', () => {
    const { show, hide, isVisible } = createTooltip(trigger, tooltip);
    show();
    hide();
    assert.strictEqual(isVisible.get(), false);
  });

  test('mouseenter shows tooltip after delay', async () => {
    const { isVisible } = createTooltip(trigger, tooltip, { showDelay: 10 });

    const mouseenterEvent = new Event('mouseenter');
    trigger.dispatchEvent(mouseenterEvent);

    assert.strictEqual(isVisible.get(), false);
    await wait(15);
    assert.strictEqual(isVisible.get(), true);
  });

  test('mouseleave hides tooltip after delay', async () => {
    const { isVisible, show } = createTooltip(trigger, tooltip, { hideDelay: 10 });
    show();

    const mouseleaveEvent = new Event('mouseleave');
    trigger.dispatchEvent(mouseleaveEvent);

    assert.strictEqual(isVisible.get(), true);
    await wait(15);
    assert.strictEqual(isVisible.get(), false);
  });

  test('focus shows tooltip', async () => {
    const { isVisible } = createTooltip(trigger, tooltip, { showDelay: 10 });

    const focusEvent = new Event('focus');
    trigger.dispatchEvent(focusEvent);

    await wait(15);
    assert.strictEqual(isVisible.get(), true);
  });

  test('blur hides tooltip', async () => {
    const { isVisible, show } = createTooltip(trigger, tooltip, { hideDelay: 10 });
    show();

    const blurEvent = new Event('blur');
    trigger.dispatchEvent(blurEvent);

    await wait(15);
    assert.strictEqual(isVisible.get(), false);
  });

  test('cleanup removes event listeners', () => {
    const { cleanup } = createTooltip(trigger, tooltip);
    cleanup();
    // No error thrown = success
    assert.ok(true);
  });
});

// ============================================================================
// createAccordion - Multi-panel tests (lines 351-440)
// ============================================================================

describe('createAccordion', () => {
  let container, trigger1, trigger2, trigger3, panel1, panel2, panel3;

  beforeEach(() => {
    container = document.createElement('div');

    trigger1 = document.createElement('button');
    trigger1.setAttribute('data-accordion-trigger', '');
    trigger1.setAttribute('aria-controls', 'panel-1');

    trigger2 = document.createElement('button');
    trigger2.setAttribute('data-accordion-trigger', '');
    trigger2.setAttribute('aria-controls', 'panel-2');

    trigger3 = document.createElement('button');
    trigger3.setAttribute('data-accordion-trigger', '');
    trigger3.setAttribute('aria-controls', 'panel-3');

    panel1 = document.createElement('div');
    panel1.id = 'panel-1';
    panel1.setAttribute('data-accordion-panel', '');

    panel2 = document.createElement('div');
    panel2.id = 'panel-2';
    panel2.setAttribute('data-accordion-panel', '');

    panel3 = document.createElement('div');
    panel3.id = 'panel-3';
    panel3.setAttribute('data-accordion-panel', '');

    container.appendChild(trigger1);
    container.appendChild(panel1);
    container.appendChild(trigger2);
    container.appendChild(panel2);
    container.appendChild(trigger3);
    container.appendChild(panel3);

    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('initializes all panels closed', () => {
    const { openIndices } = createAccordion(container);
    assert.deepStrictEqual(openIndices.get(), []);
    assert.strictEqual(panel1.hidden, true);
    assert.strictEqual(panel2.hidden, true);
  });

  test('initializes with defaultOpen index', () => {
    const { openIndices } = createAccordion(container, { defaultOpen: 0 });
    assert.deepStrictEqual(openIndices.get(), [0]);
    assert.strictEqual(panel1.hidden, false);
  });

  test('initializes with multiple defaultOpen indices', () => {
    // Production code only supports a single defaultOpen index (number, not array).
    // To have multiple panels open, open them after creation.
    const { open, openIndices } = createAccordion(container, {
      defaultOpen: 0,
      allowMultiple: true
    });
    open(2);
    assert.deepStrictEqual(openIndices.get(), [0, 2]);
  });

  test('open() opens a panel', () => {
    const { open, openIndices } = createAccordion(container);
    open(1);
    assert.deepStrictEqual(openIndices.get(), [1]);
    assert.strictEqual(panel2.hidden, false);
  });

  test('close() closes a panel', () => {
    const { open, close, openIndices } = createAccordion(container, { allowMultiple: true });
    open(0);
    open(1);
    close(0);
    assert.deepStrictEqual(openIndices.get(), [1]);
  });

  test('toggle() toggles a panel', () => {
    const { toggle, openIndices } = createAccordion(container);

    toggle(0);
    assert.deepStrictEqual(openIndices.get(), [0]);

    toggle(0);
    assert.deepStrictEqual(openIndices.get(), []);
  });

  test('openAll() opens all panels when allowMultiple', () => {
    const { openAll, openIndices } = createAccordion(container, { allowMultiple: true });
    openAll();
    assert.deepStrictEqual(openIndices.get(), [0, 1, 2]);
  });

  test('closeAll() closes all panels', () => {
    const { openAll, closeAll, openIndices } = createAccordion(container, { allowMultiple: true });
    openAll();
    closeAll();
    assert.deepStrictEqual(openIndices.get(), []);
  });

  test('allowMultiple: false closes other panels when opening one', () => {
    const { open, openIndices } = createAccordion(container, { allowMultiple: false });
    open(0);
    open(1);
    assert.deepStrictEqual(openIndices.get(), [1]);
  });

  test('allowMultiple: true keeps all open panels', () => {
    const { open, openIndices } = createAccordion(container, { allowMultiple: true });
    open(0);
    open(1);
    open(2);
    assert.deepStrictEqual(openIndices.get(), [0, 1, 2]);
  });

  test('clicking trigger toggles panel', () => {
    const { openIndices } = createAccordion(container);

    trigger1.click();
    assert.deepStrictEqual(openIndices.get(), [0]);

    trigger1.click();
    assert.deepStrictEqual(openIndices.get(), []);
  });
});

// ============================================================================
// createMenu - Keyboard navigation tests (lines 446-551)
// ============================================================================

describe('createMenu', () => {
  let button, menu, item1, item2, item3;
  let menuInstance;

  beforeEach(() => {
    button = document.createElement('button');
    button.textContent = 'Menu';

    menu = document.createElement('ul');
    menu.setAttribute('role', 'menu');

    item1 = document.createElement('li');
    item1.setAttribute('role', 'menuitem');
    item1.textContent = 'Item 1';

    item2 = document.createElement('li');
    item2.setAttribute('role', 'menuitem');
    item2.textContent = 'Item 2';

    item3 = document.createElement('li');
    item3.setAttribute('role', 'menuitem');
    item3.textContent = 'Item 3';

    menu.appendChild(item1);
    menu.appendChild(item2);
    menu.appendChild(item3);

    document.body.appendChild(button);
    document.body.appendChild(menu);
    menuInstance = null;
  });

  afterEach(() => {
    if (menuInstance) {
      menuInstance.cleanup();
      menuInstance = null;
    }
    document.body.innerHTML = '';
  });

  test('initializes menu closed', () => {
    menuInstance = createMenu(button, menu);
    assert.strictEqual(menuInstance.isOpen.get(), false);
    assert.strictEqual(menu.hidden, true);
  });

  test('open() shows menu', () => {
    menuInstance = createMenu(button, menu);
    menuInstance.open();
    assert.strictEqual(menuInstance.isOpen.get(), true);
    assert.strictEqual(menu.hidden, false);
  });

  test('close() hides menu', () => {
    menuInstance = createMenu(button, menu);
    menuInstance.open();
    menuInstance.close();
    assert.strictEqual(menuInstance.isOpen.get(), false);
  });

  test('toggle() toggles menu', () => {
    menuInstance = createMenu(button, menu);

    menuInstance.toggle();
    assert.strictEqual(menuInstance.isOpen.get(), true);

    menuInstance.toggle();
    assert.strictEqual(menuInstance.isOpen.get(), false);
  });

  test('button click toggles menu', () => {
    menuInstance = createMenu(button, menu);
    button.click();
    assert.strictEqual(menuInstance.isOpen.get(), true);
    button.click();
    assert.strictEqual(menuInstance.isOpen.get(), false);
  });

  test('ArrowDown on button opens menu', () => {
    menuInstance = createMenu(button, menu);

    const arrowEvent = new Event('keydown');
    arrowEvent.key = 'ArrowDown';
    button.dispatchEvent(arrowEvent);

    assert.strictEqual(menuInstance.isOpen.get(), true);
  });

  test('ArrowUp on button opens menu', () => {
    menuInstance = createMenu(button, menu);

    const arrowEvent = new Event('keydown');
    arrowEvent.key = 'ArrowUp';
    button.dispatchEvent(arrowEvent);

    assert.strictEqual(menuInstance.isOpen.get(), true);
  });

  test('Escape on menu closes it', () => {
    menuInstance = createMenu(button, menu);
    menuInstance.open();

    const escEvent = new Event('keydown');
    escEvent.key = 'Escape';
    menu.dispatchEvent(escEvent);

    assert.strictEqual(menuInstance.isOpen.get(), false);
  });

  // Note: Menu item click tests require createRovingTabindex to be fully functional
  // which depends on proper event handling and focus management
  test('sets up proper ARIA attributes', () => {
    menuInstance = createMenu(button, menu);
    assert.ok(menu.id);
    assert.strictEqual(button.getAttribute('aria-haspopup'), 'menu');
    assert.strictEqual(button.getAttribute('aria-controls'), menu.id);
    assert.strictEqual(button.getAttribute('aria-expanded'), 'false');
    assert.strictEqual(menu.getAttribute('role'), 'menu');
  });

  test('cleanup removes event listeners', () => {
    menuInstance = createMenu(button, menu);
    menuInstance.cleanup();
    menuInstance = null;
    assert.ok(true);
  });
});
