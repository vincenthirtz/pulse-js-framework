/**
 * Pulse CLI Logger
 * Adapter for CLI tools using the unified runtime logger
 * @module pulse-cli/logger
 */

import { createLogger, setLogLevel, LogLevel } from '../runtime/logger.js';

// Create CLI-namespaced logger
const cliLogger = createLogger('CLI');

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
  // Update global log level to include debug when verbose
  if (enabled) {
    setLogLevel(LogLevel.DEBUG);
  } else {
    setLogLevel(LogLevel.INFO);
  }
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
 * Uses the runtime logger under the hood for consistency
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
    // Use console directly for CLI output (no namespace prefix for info)
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
    cliLogger.warn(...args);
  },

  /**
   * Log an error message
   * @param {...*} args - Values to log
   * @returns {void}
   * @example
   * log.error('Failed to compile:', error.message);
   */
  error(...args) {
    cliLogger.error(...args);
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
      cliLogger.debug(...args);
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
  },

  /**
   * Create a child logger with a sub-namespace
   * @param {string} namespace - Child namespace
   * @returns {import('../runtime/logger.js').Logger} Child logger instance
   * @example
   * const buildLog = log.child('Build');
   * buildLog.info('Starting...'); // [CLI:Build] Starting...
   */
  child(namespace) {
    return cliLogger.child(namespace);
  }
};

// Re-export LogLevel for convenience
export { LogLevel };

export default log;
