/**
 * Pulse A11y - Screen Reader Announcements
 *
 * Live region announcements for screen readers
 *
 * @module pulse-js-framework/runtime/a11y/announcements
 */

import { pulse, effect } from '../pulse.js';

// =============================================================================
// LIVE REGIONS - Screen Reader Announcements
// =============================================================================

let liveRegionPolite = null;
let liveRegionAssertive = null;

/**
 * Initialize live regions for screen reader announcements
 * Called automatically on first announce
 */
function ensureLiveRegions() {
  if (typeof document === 'undefined') return;

  if (!liveRegionPolite) {
    liveRegionPolite = document.createElement('div');
    liveRegionPolite.setAttribute('role', 'status');
    liveRegionPolite.setAttribute('aria-live', 'polite');
    liveRegionPolite.setAttribute('aria-atomic', 'true');
    Object.assign(liveRegionPolite.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    });
    liveRegionPolite.id = 'pulse-a11y-polite';
    document.body.appendChild(liveRegionPolite);
  }

  if (!liveRegionAssertive) {
    liveRegionAssertive = document.createElement('div');
    liveRegionAssertive.setAttribute('role', 'alert');
    liveRegionAssertive.setAttribute('aria-live', 'assertive');
    liveRegionAssertive.setAttribute('aria-atomic', 'true');
    Object.assign(liveRegionAssertive.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    });
    liveRegionAssertive.id = 'pulse-a11y-assertive';
    document.body.appendChild(liveRegionAssertive);
  }
}

/**
 * Announce a message to screen readers
 * @param {string} message - Message to announce
 * @param {object} options - Options
 * @param {'polite'|'assertive'} options.priority - Announcement priority (default: 'polite')
 * @param {number} options.clearAfter - Clear message after ms (default: 1000)
 */
export function announce(message, options = {}) {
  const { priority = 'polite', clearAfter = 1000 } = options;

  ensureLiveRegions();

  const region = priority === 'assertive' ? liveRegionAssertive : liveRegionPolite;
  if (!region) return;

  // Clear and set new message (needed for repeated announcements)
  region.textContent = '';

  // Use requestAnimationFrame to ensure the clear is processed
  requestAnimationFrame(() => {
    region.textContent = message;

    if (clearAfter > 0) {
      setTimeout(() => {
        region.textContent = '';
      }, clearAfter);
    }
  });
}

/**
 * Announce politely (waits for user to finish current task)
 * @param {string} message - Message to announce
 */
export function announcePolite(message) {
  announce(message, { priority: 'polite' });
}

/**
 * Announce assertively (interrupts current announcement)
 * Use sparingly - only for critical updates
 * @param {string} message - Message to announce
 */
export function announceAssertive(message) {
  announce(message, { priority: 'assertive' });
}

/**
 * Create a reactive live region that announces when value changes
 * @param {Function} getter - Function that returns the message
 * @param {object} options - Announce options
 * @returns {Function} Cleanup function
 */
export function createLiveAnnouncer(getter, options = {}) {
  let lastValue = null;

  return effect(() => {
    const value = getter();
    if (value !== lastValue && value) {
      announce(value, options);
      lastValue = value;
    }
  });
}
// =============================================================================
// ANNOUNCEMENT QUEUE
// =============================================================================

/**
 * Create an announcement queue that handles multiple messages in sequence
 * @param {object} options - Options
 * @param {number} options.minDelay - Minimum delay between announcements (ms, default: 500)
 * @returns {object} Queue control object
 */
export function createAnnouncementQueue(options = {}) {
  const { minDelay = 500 } = options;

  const queue = [];
  let isProcessing = false;
  let currentTimerId = null;
  let aborted = false;
  const queueLength = pulse(0);

  const processQueue = async () => {
    if (isProcessing || queue.length === 0 || aborted) return;

    isProcessing = true;

    while (queue.length > 0 && !aborted) {
      const { message, priority, clearAfter } = queue.shift();
      queueLength.set(queue.length);

      announce(message, { priority, clearAfter });

      // Wait for announcement to be read
      await new Promise(resolve => {
        currentTimerId = setTimeout(resolve,
          Math.max(minDelay, clearAfter || 1000));
      });
      currentTimerId = null;
    }

    isProcessing = false;
  };

  const dispose = () => {
    aborted = true;
    if (currentTimerId !== null) {
      clearTimeout(currentTimerId);
      currentTimerId = null;
    }
    queue.length = 0;
    queueLength.set(0);
    isProcessing = false;
  };

  return {
    queueLength,
    /**
     * Add a message to the queue
     * @param {string} message - Message to announce
     * @param {object} options - Announcement options (priority, clearAfter)
     */
    add: (message, opts = {}) => {
      if (aborted) return;
      queue.push({ message, ...opts });
      queueLength.set(queue.length);
      processQueue();
    },
    /**
     * Clear the queue
     */
    clear: () => {
      queue.length = 0;
      queueLength.set(0);
    },
    /**
     * Check if queue is being processed
     * @returns {boolean}
     */
    isProcessing: () => isProcessing,
    /**
     * Dispose the queue, cancelling any pending timers
     */
    dispose
  };
}

