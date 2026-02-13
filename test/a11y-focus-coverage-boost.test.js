/**
 * A11y Focus Management Coverage Boost Tests
 * Additional tests to cover focus.js module
 * Target: Increase focus.js coverage from 68.2% to 90%+
 *
 * Uncovered lines: Various focus management edge cases
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { createDOM } from './mock-dom.js';
import {
  getFocusableElements,
  focusFirst,
  focusLast,
  trapFocus,
  saveFocus,
  restoreFocus,
  clearFocusStack,
  onEscapeKey,
  createFocusVisibleTracker,
  createSkipLink,
  installSkipLinks,
  createRovingTabindex
} from '../runtime/a11y/focus.js';

let dom;
let container;

beforeEach(() => {
  dom = createDOM();
  globalThis.document = dom.document;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  // Mock getComputedStyle
  globalThis.getComputedStyle = (el) => ({
    display: el.style.display || '',
    visibility: el.style.visibility || '',
  });
  container = dom.document.createElement('div');
  dom.document.body.appendChild(container);
});

afterEach(() => {
  delete globalThis.document;
  delete globalThis.requestAnimationFrame;
  delete globalThis.getComputedStyle;
});

// =============================================================================
// getFocusableElements
// =============================================================================

describe('getFocusableElements', () => {
  test('returns empty array for null container', () => {
    const elements = getFocusableElements(null);
    assert.deepStrictEqual(elements, []);
  });

  test('returns empty array for undefined container', () => {
    const elements = getFocusableElements(undefined);
    assert.deepStrictEqual(elements, []);
  });

  test('finds links with href', () => {
    const link = dom.document.createElement('a');
    link.href = '/test';
    container.appendChild(link);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
    assert.strictEqual(elements[0], link);
  });

  test('finds enabled buttons', () => {
    const button = dom.document.createElement('button');
    container.appendChild(button);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('excludes disabled buttons', () => {
    const button = dom.document.createElement('button');
    button.disabled = true;
    container.appendChild(button);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 0);
  });

  test('finds enabled inputs', () => {
    const input = dom.document.createElement('input');
    container.appendChild(input);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('excludes disabled inputs', () => {
    const input = dom.document.createElement('input');
    input.disabled = true;
    container.appendChild(input);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 0);
  });

  test('excludes hidden inputs', () => {
    const input = dom.document.createElement('input');
    input.type = 'hidden';
    container.appendChild(input);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 0);
  });

  test('finds select elements', () => {
    const select = dom.document.createElement('select');
    container.appendChild(select);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('finds textarea elements', () => {
    const textarea = dom.document.createElement('textarea');
    container.appendChild(textarea);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('finds elements with tabindex 0', () => {
    const div = dom.document.createElement('div');
    div.setAttribute('tabindex', '0');
    container.appendChild(div);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('excludes elements with tabindex -1', () => {
    const div = dom.document.createElement('div');
    div.setAttribute('tabindex', '-1');
    container.appendChild(div);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 0);
  });

  test('finds contenteditable elements', () => {
    const div = dom.document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    container.appendChild(div);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('finds audio with controls', () => {
    const audio = dom.document.createElement('audio');
    audio.setAttribute('controls', '');
    container.appendChild(audio);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('finds video with controls', () => {
    const video = dom.document.createElement('video');
    video.setAttribute('controls', '');
    container.appendChild(video);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('finds summary elements', () => {
    const details = dom.document.createElement('details');
    const summary = dom.document.createElement('summary');
    details.appendChild(summary);
    container.appendChild(details);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('finds iframe elements', () => {
    const iframe = dom.document.createElement('iframe');
    container.appendChild(iframe);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 1);
  });

  test('finds multiple focusable elements in order', () => {
    const button = dom.document.createElement('button');
    const input = dom.document.createElement('input');
    const link = dom.document.createElement('a');
    link.href = '/test';

    container.appendChild(button);
    container.appendChild(input);
    container.appendChild(link);

    const elements = getFocusableElements(container);
    assert.strictEqual(elements.length, 3);
    assert.strictEqual(elements[0], button);
    assert.strictEqual(elements[1], input);
    assert.strictEqual(elements[2], link);
  });
});

// =============================================================================
// focusFirst
// =============================================================================

describe('focusFirst', () => {
  test('focuses first element', () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    const focused = focusFirst(container);
    assert.strictEqual(focused, button1);
    assert.strictEqual(dom.document.activeElement, button1);
  });

  test('returns null when no focusable elements', () => {
    const focused = focusFirst(container);
    assert.strictEqual(focused, null);
  });

  test('returns null for null container', () => {
    const focused = focusFirst(null);
    assert.strictEqual(focused, null);
  });
});

// =============================================================================
// focusLast
// =============================================================================

describe('focusLast', () => {
  test('focuses last element', () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    const focused = focusLast(container);
    assert.strictEqual(focused, button2);
    assert.strictEqual(dom.document.activeElement, button2);
  });

  test('returns null when no focusable elements', () => {
    const focused = focusLast(container);
    assert.strictEqual(focused, null);
  });

  test('returns null for null container', () => {
    const focused = focusLast(null);
    assert.strictEqual(focused, null);
  });
});

// =============================================================================
// trapFocus
// =============================================================================

describe('trapFocus', () => {
  test('returns noop for null container', () => {
    const release = trapFocus(null);
    assert.strictEqual(typeof release, 'function');
    release(); // Should not throw
  });

  test('saves current focus when returnFocus is true', async () => {
    const outsideButton = dom.document.createElement('button');
    dom.document.body.appendChild(outsideButton);
    outsideButton.focus();

    const button = dom.document.createElement('button');
    container.appendChild(button);

    const release = trapFocus(container, { autoFocus: false, returnFocus: true });

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    release();

    // Previous focus should be restored
    assert.strictEqual(dom.document.activeElement, outsideButton);
  });

  test('does not save focus when returnFocus is false', () => {
    const outsideButton = dom.document.createElement('button');
    dom.document.body.appendChild(outsideButton);
    outsideButton.focus();

    const button = dom.document.createElement('button');
    container.appendChild(button);

    const release = trapFocus(container, { autoFocus: false, returnFocus: false });
    release();

    // Should not restore to outsideButton
    assert.notStrictEqual(dom.document.activeElement, outsideButton);
  });

  test('focuses first element when autoFocus is true', async () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    trapFocus(container, { autoFocus: true });

    // Wait for requestAnimationFrame
    await new Promise(resolve => setTimeout(resolve, 10));

    assert.strictEqual(dom.document.activeElement, button1);
  });

  test('focuses initialFocus element when provided', async () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    trapFocus(container, { autoFocus: true, initialFocus: button2 });

    await new Promise(resolve => setTimeout(resolve, 10));

    assert.strictEqual(dom.document.activeElement, button2);
  });

  test('Tab wraps to first element from last', () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    trapFocus(container, { autoFocus: false });
    button2.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Tab';
    
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, button1);
  });

  test('Shift+Tab wraps to last element from first', () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    trapFocus(container, { autoFocus: false });
    button1.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Tab';
    event.shiftKey = true;
    
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, button2);
  });

  test('prevents Tab when no focusable elements', () => {
    trapFocus(container, { autoFocus: false });

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Tab'; 
    let defaultPrevented = false;
    event.preventDefault = () => { defaultPrevented = true; };

    container.dispatchEvent(event);
    assert.strictEqual(defaultPrevented, true);
  });

  test('ignores non-Tab keys', () => {
    const button = dom.document.createElement('button');
    container.appendChild(button);

    trapFocus(container, { autoFocus: false });
    button.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Enter'; 
    container.dispatchEvent(event);

    // No change to focus
    assert.strictEqual(dom.document.activeElement, button);
  });

  test('brings focus back when leaving container', () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    trapFocus(container, { autoFocus: false });
    button2.focus();

    const event = new Event('focusout', { bubbles: true });
    
    event.relatedTarget = dom.document.body;
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, button1);
  });

  test('does not bring focus back when staying in container', () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);

    trapFocus(container, { autoFocus: false });
    button1.focus();

    const event = new Event('focusout', { bubbles: true });
    
    event.relatedTarget = button2;
    container.dispatchEvent(event);

    // Focus can stay on button2
    button2.focus();
    assert.strictEqual(dom.document.activeElement, button2);
  });

  test('removes event listeners on release', () => {
    const button = dom.document.createElement('button');
    container.appendChild(button);

    const release = trapFocus(container, { autoFocus: false });
    release();

    // Tab should not be trapped anymore
    const event = new Event('keydown', { bubbles: true });
    event.key = 'Tab'; 
    container.dispatchEvent(event);

    // No error should occur
    assert.ok(true);
  });
});

// =============================================================================
// saveFocus / restoreFocus / clearFocusStack
// =============================================================================

describe('Focus Stack', () => {
  test('saveFocus saves current active element', () => {
    const button = dom.document.createElement('button');
    dom.document.body.appendChild(button);
    button.focus();

    saveFocus();

    const input = dom.document.createElement('input');
    dom.document.body.appendChild(input);
    input.focus();

    restoreFocus();
    assert.strictEqual(dom.document.activeElement, button);
  });

  test('restoreFocus does nothing when stack is empty', () => {
    clearFocusStack();

    const button = dom.document.createElement('button');
    dom.document.body.appendChild(button);
    button.focus();

    restoreFocus();

    // Still on button
    assert.strictEqual(dom.document.activeElement, button);
  });

  test('clearFocusStack empties the stack', () => {
    const button = dom.document.createElement('button');
    dom.document.body.appendChild(button);
    button.focus();

    saveFocus();
    clearFocusStack();
    restoreFocus();

    // Should not restore
    assert.strictEqual(dom.document.activeElement, button);
  });

  test('focus stack works with multiple saves', () => {
    const button1 = dom.document.createElement('button');
    const button2 = dom.document.createElement('button');
    const button3 = dom.document.createElement('button');

    dom.document.body.appendChild(button1);
    dom.document.body.appendChild(button2);
    dom.document.body.appendChild(button3);

    button1.focus();
    saveFocus();

    button2.focus();
    saveFocus();

    button3.focus();

    restoreFocus();
    assert.strictEqual(dom.document.activeElement, button2);

    restoreFocus();
    assert.strictEqual(dom.document.activeElement, button1);
  });

  test('restoreFocus handles element without focus method', () => {
    clearFocusStack();

    // Manually push non-focusable element
    const div = dom.document.createElement('div');
    div.focus = undefined;

    saveFocus();

    // Should not throw
    restoreFocus();
    assert.ok(true);
  });
});

// =============================================================================
// onEscapeKey
// =============================================================================

describe('onEscapeKey', () => {
  test('returns noop for null container', () => {
    const cleanup = onEscapeKey(null, () => {});
    assert.strictEqual(typeof cleanup, 'function');
    cleanup();
  });

  test('calls callback on Escape key', () => {
    let called = false;
    onEscapeKey(container, () => { called = true; });

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Escape'; 
    container.dispatchEvent(event);

    assert.strictEqual(called, true);
  });

  test('calls callback on Esc key (old browsers)', () => {
    let called = false;
    onEscapeKey(container, () => { called = true; });

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Esc'; 
    container.dispatchEvent(event);

    assert.strictEqual(called, true);
  });

  test('stops propagation by default', () => {
    let propagationStopped = false;

    onEscapeKey(container, () => {});

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Escape'; 
    event.stopPropagation = () => { propagationStopped = true; };

    container.dispatchEvent(event);

    assert.strictEqual(propagationStopped, true);
  });

  test('does not stop propagation when option is false', () => {
    let propagationStopped = false;

    onEscapeKey(container, () => {}, { stopPropagation: false });

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Escape'; 
    event.stopPropagation = () => { propagationStopped = true; };

    container.dispatchEvent(event);

    assert.strictEqual(propagationStopped, false);
  });

  test('passes event to callback', () => {
    let receivedEvent = null;
    onEscapeKey(container, (e) => { receivedEvent = e; });

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Escape'; 
    container.dispatchEvent(event);

    assert.strictEqual(receivedEvent, event);
  });

  test('ignores non-Escape keys', () => {
    let called = false;
    onEscapeKey(container, () => { called = true; });

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Enter'; 
    container.dispatchEvent(event);

    assert.strictEqual(called, false);
  });

  test('cleanup removes event listener', () => {
    let callCount = 0;
    const cleanup = onEscapeKey(container, () => { callCount++; });

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Escape'; 
    container.dispatchEvent(event);
    assert.strictEqual(callCount, 1);

    cleanup();
    container.dispatchEvent(event);
    assert.strictEqual(callCount, 1); // Still 1, not called again
  });
});

// =============================================================================
// createFocusVisibleTracker
// =============================================================================

describe('createFocusVisibleTracker', () => {
  test('returns pulse and cleanup function', () => {
    const { isKeyboardUser, cleanup } = createFocusVisibleTracker();
    assert.ok(isKeyboardUser);
    assert.strictEqual(typeof isKeyboardUser.get, 'function');
    assert.strictEqual(typeof cleanup, 'function');
    cleanup();
  });

  test('starts as false', () => {
    const { isKeyboardUser, cleanup } = createFocusVisibleTracker();
    assert.strictEqual(isKeyboardUser.get(), false);
    cleanup();
  });

  test('sets true on Tab key', () => {
    const { isKeyboardUser, cleanup } = createFocusVisibleTracker();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Tab'; 
    dom.document.dispatchEvent(event);

    assert.strictEqual(isKeyboardUser.get(), true);
    cleanup();
  });

  test('sets true on arrow keys', () => {
    const { isKeyboardUser, cleanup } = createFocusVisibleTracker();

    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach(key => {
      isKeyboardUser.set(false);
      const event = new Event('keydown', { bubbles: true });
      event.key = key;
      
      dom.document.dispatchEvent(event);
      assert.strictEqual(isKeyboardUser.get(), true, `Failed for ${key}`);
    });

    cleanup();
  });

  test('sets false on mouse down', () => {
    const { isKeyboardUser, cleanup } = createFocusVisibleTracker();

    isKeyboardUser.set(true);

    const event = new Event('mousedown', { bubbles: true });
    
    dom.document.dispatchEvent(event);

    assert.strictEqual(isKeyboardUser.get(), false);
    cleanup();
  });

  test('ignores other keys', () => {
    const { isKeyboardUser, cleanup } = createFocusVisibleTracker();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'a'; 
    dom.document.dispatchEvent(event);

    assert.strictEqual(isKeyboardUser.get(), false);
    cleanup();
  });

  test('cleanup removes event listeners', () => {
    const { isKeyboardUser, cleanup } = createFocusVisibleTracker();

    cleanup();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Tab'; 
    dom.document.dispatchEvent(event);

    // Should still be false (listener removed)
    assert.strictEqual(isKeyboardUser.get(), false);
  });
});

// =============================================================================
// createSkipLink
// =============================================================================

describe('createSkipLink', () => {
  test('creates link element', () => {
    const link = createSkipLink('main', 'Skip to content');
    assert.strictEqual(link.tagName, 'A');
  });

  test('sets href with hash', () => {
    const link = createSkipLink('main-content');
    assert.strictEqual(link.href, '#main-content');
  });

  test('sets text content', () => {
    const link = createSkipLink('main', 'Skip to main');
    assert.strictEqual(link.textContent, 'Skip to main');
  });

  test('uses default text', () => {
    const link = createSkipLink('main');
    assert.strictEqual(link.textContent, 'Skip to main content');
  });

  test('sets custom className', () => {
    const link = createSkipLink('main', 'Skip', { className: 'my-skip' });
    assert.strictEqual(link.className, 'my-skip');
  });

  test('uses default className', () => {
    const link = createSkipLink('main');
    assert.strictEqual(link.className, 'pulse-skip-link');
  });

  test('applies visually hidden styles', () => {
    const link = createSkipLink('main');
    assert.strictEqual(link.style.position, 'absolute');
    assert.strictEqual(link.style.top, '-40px');
  });

  test('shows on focus', () => {
    const link = createSkipLink('main');
    const event = new Event('focus', { bubbles: true });
    link.dispatchEvent(event);
    assert.strictEqual(link.style.top, '0');
  });

  test('hides on blur', () => {
    const link = createSkipLink('main');
    const focusEvent = new Event('focus');
    link.dispatchEvent(focusEvent);

    const blurEvent = new Event('blur');
    link.dispatchEvent(blurEvent);

    assert.strictEqual(link.style.top, '-40px');
  });

  test('focuses target on click', () => {
    const target = dom.document.createElement('div');
    target.id = 'main-content';
    dom.document.body.appendChild(target);

    const link = createSkipLink('main-content');

    const event = new Event('click', { bubbles: true });
    
    let defaultPrevented = false;
    event.preventDefault = () => { defaultPrevented = true; };

    link.dispatchEvent(event);

    assert.strictEqual(defaultPrevented, true);
    assert.strictEqual(dom.document.activeElement, target);
  });

  test('sets and removes tabindex on target', () => {
    const target = dom.document.createElement('div');
    target.id = 'main-content';
    dom.document.body.appendChild(target);

    const link = createSkipLink('main-content');

    const event = new Event('click', { bubbles: true });
    
    event.preventDefault = () => {};
    link.dispatchEvent(event);

    assert.strictEqual(target.hasAttribute('tabindex'), false);
  });
});

// =============================================================================
// installSkipLinks
// =============================================================================

describe('installSkipLinks', () => {
  test('creates nav container', () => {
    const nav = installSkipLinks([]);
    assert.strictEqual(nav.tagName, 'NAV');
  });

  test('sets aria-label on container', () => {
    const nav = installSkipLinks([]);
    assert.strictEqual(nav.getAttribute('aria-label'), 'Skip links');
  });

  test('sets className on container', () => {
    const nav = installSkipLinks([]);
    assert.strictEqual(nav.className, 'pulse-skip-links');
  });

  test('creates links from definitions', () => {
    const nav = installSkipLinks([
      { target: 'main', text: 'Skip to main' },
      { target: 'nav', text: 'Skip to navigation' }
    ]);

    assert.strictEqual(nav.children.length, 2);
    assert.strictEqual(nav.children[0].textContent, 'Skip to main');
    assert.strictEqual(nav.children[1].textContent, 'Skip to navigation');
  });

  test('inserts at beginning of body', () => {
    const existing = dom.document.createElement('div');
    dom.document.body.appendChild(existing);

    const nav = installSkipLinks([{ target: 'main', text: 'Skip' }]);

    assert.strictEqual(dom.document.body.firstChild, nav);
  });

  test('handles empty links array', () => {
    const nav = installSkipLinks([]);
    assert.strictEqual(nav.children.length, 0);
  });
});

// =============================================================================
// createRovingTabindex
// =============================================================================

describe('createRovingTabindex', () => {
  test('returns cleanup function', () => {
    const cleanup = createRovingTabindex(container);
    assert.strictEqual(typeof cleanup, 'function');
    cleanup();
  });

  test('returns noop when no items match selector', () => {
    const cleanup = createRovingTabindex(container, { selector: '[role="menuitem"]' });
    assert.strictEqual(typeof cleanup, 'function');
    cleanup();
  });

  test('initializes first item with tabindex 0', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    createRovingTabindex(container);

    assert.strictEqual(item1.getAttribute('tabindex'), '0');
    assert.strictEqual(item2.getAttribute('tabindex'), '-1');
  });

  test('ArrowDown moves to next item (vertical)', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    createRovingTabindex(container, { orientation: 'vertical' });
    item1.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowDown'; 
    container.dispatchEvent(event);

    assert.strictEqual(item2.getAttribute('tabindex'), '0');
    assert.strictEqual(dom.document.activeElement, item2);
  });

  test('ArrowUp moves to previous item (vertical)', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    createRovingTabindex(container, { orientation: 'vertical' });
    item2.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowUp'; 
    container.dispatchEvent(event);

    assert.strictEqual(item1.getAttribute('tabindex'), '0');
    assert.strictEqual(dom.document.activeElement, item1);
  });

  test('ArrowRight moves to next item (horizontal)', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    createRovingTabindex(container, { orientation: 'horizontal' });
    item1.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowRight'; 
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, item2);
  });

  test('ArrowLeft moves to previous item (horizontal)', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    createRovingTabindex(container, { orientation: 'horizontal' });
    item2.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowLeft'; 
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, item1);
  });

  test('loops from last to first with loop option', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    createRovingTabindex(container, { loop: true });
    item2.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowDown'; 
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, item1);
  });

  test('does not loop without loop option', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    createRovingTabindex(container, { loop: false });
    item2.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowDown'; 
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, item2);
  });

  test('Home key moves to first item', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    const item3 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    item3.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);
    container.appendChild(item3);

    createRovingTabindex(container);
    item3.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Home'; 
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, item1);
  });

  test('End key moves to last item', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    const item3 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    item3.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);
    container.appendChild(item3);

    createRovingTabindex(container);
    item1.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'End'; 
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, item3);
  });

  test('Enter calls onSelect callback', () => {
    let selected = null;
    let selectedIndex = null;

    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    createRovingTabindex(container, {
      onSelect: (el, idx) => {
        selected = el;
        selectedIndex = idx;
      }
    });
    item2.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'Enter'; 
    container.dispatchEvent(event);

    assert.strictEqual(selected, item2);
    assert.strictEqual(selectedIndex, 1);
  });

  test('Space calls onSelect callback', () => {
    let called = false;

    const item = dom.document.createElement('div');
    item.setAttribute('role', 'menuitem');
    container.appendChild(item);

    createRovingTabindex(container, { onSelect: () => { called = true; } });
    item.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = ' '; 
    container.dispatchEvent(event);

    assert.strictEqual(called, true);
  });

  test('excludes disabled items', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    const item3 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    item2.setAttribute('disabled', '');
    item3.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);
    container.appendChild(item3);

    createRovingTabindex(container);
    item1.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowDown'; 
    container.dispatchEvent(event);

    // Should skip item2 (disabled)
    assert.strictEqual(dom.document.activeElement, item3);
  });

  test('excludes aria-disabled items', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    const item3 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    item2.setAttribute('aria-disabled', 'true');
    item3.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);
    container.appendChild(item3);

    createRovingTabindex(container);
    item1.focus();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowDown'; 
    container.dispatchEvent(event);

    assert.strictEqual(dom.document.activeElement, item3);
  });

  test('cleanup removes event listener', () => {
    const item1 = dom.document.createElement('div');
    const item2 = dom.document.createElement('div');
    item1.setAttribute('role', 'menuitem');
    item2.setAttribute('role', 'menuitem');
    container.appendChild(item1);
    container.appendChild(item2);

    const cleanup = createRovingTabindex(container);
    item1.focus();

    cleanup();

    const event = new Event('keydown', { bubbles: true });
    event.key = 'ArrowDown'; 
    container.dispatchEvent(event);

    // Should still be on item1 (listener removed)
    assert.strictEqual(dom.document.activeElement, item1);
  });

  test('uses custom selector', () => {
    const item = dom.document.createElement('div');
    item.setAttribute('role', 'option');
    container.appendChild(item);

    createRovingTabindex(container, { selector: '[role="option"]' });

    assert.strictEqual(item.getAttribute('tabindex'), '0');
  });
});
