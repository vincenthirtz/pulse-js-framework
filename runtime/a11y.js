/**
 * Pulse A11y - Backward Compatibility Export
 *
 * This file maintains backward compatibility by re-exporting from a11y/
 * The actual implementation has been split into focused sub-modules:
 *   - a11y/announcements.js - Screen reader announcements
 *   - a11y/focus.js - Focus management and keyboard navigation
 *   - a11y/preferences.js - User preference detection
 *   - a11y/widgets.js - ARIA widgets (modal, tabs, etc.)
 *   - a11y/validation.js - A11y validation and auditing
 *   - a11y/contrast.js - Color contrast utilities  
 *   - a11y/utils.js - Utility functions
 *
 * @deprecated Import from 'pulse-js-framework/runtime/a11y/index.js' instead
 * @module pulse-js-framework/runtime/a11y
 */

export * from './a11y/index.js';
export { default } from './a11y/index.js';
