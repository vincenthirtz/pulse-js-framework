/**
 * Pulse A11y - Main Entry Point
 *
 * Barrel export for all accessibility modules
 *
 * @module pulse-js-framework/runtime/a11y
 */

// Export all from sub-modules
export * from './announcements.js';
export * from './focus.js';
export * from './preferences.js';
export * from './widgets.js';
export * from './validation.js';
export * from './contrast.js';
export * from './utils.js';

// Default export for backward compatibility
import * as announcements from './announcements.js';
import * as focus from './focus.js';
import * as preferences from './preferences.js';
import * as widgets from './widgets.js';
import * as validation from './validation.js';
import * as contrast from './contrast.js';
import * as utils from './utils.js';

export default {
  ...announcements,
  ...focus,
  ...preferences,
  ...widgets,
  ...validation,
  ...contrast,
  ...utils
};
