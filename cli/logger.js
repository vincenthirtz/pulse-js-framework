/**
 * Pulse CLI Logger
 * Lightweight logger for CLI tools with support for verbose mode
 * @module pulse-cli/logger
 */

/** @type {boolean} */
let verboseMode = false;

/**
 * Enable or disable verbose mode for debug output
 * @param {boolean} enabled - Whether to enable verbose mode
 * @returns {void}
 * @example
 * setVerbose(true);
 * log.debug('This will now be shown');
 */
export function setVerbose(enabled) {
  verboseMode = enabled;
}

/**
 * Check if verbose mode is currently enabled
 * @returns {boolean} True if verbose mode is enabled
 * @example
 * if (isVerbose()) {
 *   // Perform additional logging
 * }
 */
export function isVerbose() {
  return verboseMode;
}

/**
 * CLI Logger object with console-like API
 * @namespace log
 */
export const log = {
  /**
   * Log an info message (always shown)
   * @param {...*} args - Values to log
   * @returns {void}
   * @example
   * log.info('Starting server on port', 3000);
   */
  info(...args) {
    console.log(...args);
  },

  /**
   * Log a success message (always shown)
   * @param {...*} args - Values to log
   * @returns {void}
   * @example
   * log.success('Build completed successfully!');
   */
  success(...args) {
    console.log(...args);
  },

  /**
   * Log a warning message
   * @param {...*} args - Values to log
   * @returns {void}
   * @example
   * log.warn('Deprecated feature used');
   */
  warn(...args) {
    console.warn(...args);
  },

  /**
   * Log an error message
   * @param {...*} args - Values to log
   * @returns {void}
   * @example
   * log.error('Failed to compile:', error.message);
   */
  error(...args) {
    console.error(...args);
  },

  /**
   * Log a debug message (only shown in verbose mode)
   * @param {...*} args - Values to log
   * @returns {void}
   * @example
   * log.debug('Processing file:', filename);
   */
  debug(...args) {
    if (verboseMode) {
      console.log('[debug]', ...args);
    }
  },

  /**
   * Log a verbose message (only shown in verbose mode)
   * @param {...*} args - Values to log
   * @returns {void}
   * @example
   * log.verbose('Additional details:', data);
   */
  verbose(...args) {
    if (verboseMode) {
      console.log(...args);
    }
  },

  /**
   * Print a blank line for spacing
   * @returns {void}
   * @example
   * log.info('Section 1');
   * log.newline();
   * log.info('Section 2');
   */
  newline() {
    console.log();
  }
};

export default log;
