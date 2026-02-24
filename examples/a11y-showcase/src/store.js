/**
 * A11y Showcase - Shared State
 */

import { pulse, computed } from '../../../runtime/index.js';
import {
  announcePolite, announceAssertive,
  createPreferences, createFocusVisibleTracker, installSkipLinks,
  getContrastRatio, meetsContrastRequirement
} from '../../../runtime/a11y.js';

export const activeSection = pulse('widgets');
export const modalOpen = pulse(false);
export const notifications = pulse([]);
export const contrastFg = pulse('#333333');
export const contrastBg = pulse('#ffffff');

export const prefs = createPreferences();
export const { isKeyboardUser } = createFocusVisibleTracker();

installSkipLinks([
  { target: 'main-content', text: 'Skip to main content' },
  { target: 'nav', text: 'Skip to navigation' }
]);

export const contrastRatio = computed(() => getContrastRatio(contrastFg.get(), contrastBg.get()));
export const contrastAA = computed(() => meetsContrastRequirement(contrastRatio.get(), 'AA', 'normal'));
export const contrastAAA = computed(() => meetsContrastRequirement(contrastRatio.get(), 'AAA', 'normal'));

export function notify(message, priority = 'polite') {
  const id = Date.now();
  notifications.update(n => [...n, { id, message }]);
  if (priority === 'assertive') announceAssertive(message);
  else announcePolite(message);
  setTimeout(() => {
    notifications.update(n => n.filter(x => x.id !== id));
  }, 4000);
}
