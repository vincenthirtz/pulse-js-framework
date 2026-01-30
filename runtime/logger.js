/**
 * Pulse Logger - Centralized logging with namespaces and levels
 * @module pulse-js-framework/runtime/logger
 *
 * @example
 * import { logger, createLogger } from './logger.js';
 *
 * // Default logger
 * logger.info('Hello');
 * logger.warn('Warning');
 * logger.error('Error');
 *
 * // Namespaced logger
 * const log = createLogger('Router');
 * log.info('Navigating to /home'); // [Router] Navigating to /home
 */

/**
 * Log level constants
 * @readonly
 * @enum {number}
 */
export const LogLevel = {
  /** No logging */
  SILENT: 0,
  /** Only errors */
  ERROR: 1,
  /** Errors and warnings */
  WARN: 2,
  /** Errors, warnings, and info (default) */
  INFO: 3,
  /** All messages including debug */
  DEBUG: 4
};

/** @type {number} */
let globalLevel = LogLevel.INFO;

/** @type {LogFormatter|null} */
let globalFormatter = null;

/**
 * @callback LogFormatter
 * @param {'error'|'warn'|'info'|'debug'} level - The log level
 * @param {string|null} namespace - The logger namespace
 * @param {Array<*>} args - The arguments to log
 * @returns {string} The formatted log message
 */

/**
 * Set the global log level for all loggers
 * @param {number} level - A LogLevel value (SILENT=0, ERROR=1, WARN=2, INFO=3, DEBUG=4)
 * @returns {void}
 * @example
 * setLogLevel(LogLevel.DEBUG); // Enable all logging
 * setLogLevel(LogLevel.SILENT); // Disable all logging
 */
export function setLogLevel(level) {
  globalLevel = level;
}

/**
 * Get the current global log level
 * @returns {number} The current LogLevel value
 * @example
 * const level = getLogLevel();
 * if (level >= LogLevel.DEBUG) {
 *   // Debug logging is enabled
 * }
 */
export function getLogLevel() {
  return globalLevel;
}

/**
 * Set a custom formatter function for all loggers
 * @param {LogFormatter|null} formatter - Custom formatter function, or null to use default
 * @returns {void}
 * @example
 * setFormatter((level, namespace, args) => {
 *   const timestamp = new Date().toISOString();
 *   const prefix = namespace ? `[${namespace}]` : '';
 *   return `${timestamp} ${level.toUpperCase()} ${prefix} ${args.join(' ')}`;
 * });
 */
export function setFormatter(formatter) {
  globalFormatter = formatter;
}

/**
 * Format message arguments with optional namespace prefix
 * @private
 * @param {string|null} namespace - The logger namespace
 * @param {Array<*>} args - Arguments to format
 * @returns {Array<*>} Formatted arguments array
 */
function formatArgs(namespace, args) {
  if (!namespace) return args;

  // If first arg is a string, prepend namespace
  if (typeof args[0] === 'string') {
    return [`[${namespace}] ${args[0]}`, ...args.slice(1)];
  }

  // Otherwise, add namespace as first arg
  return [`[${namespace}]`, ...args];
}

/**
 * @typedef {Object} Logger
 * @property {function(...*): void} error - Log error message
 * @property {function(...*): void} warn - Log warning message
 * @property {function(...*): void} info - Log info message
 * @property {function(...*): void} debug - Log debug message
 * @property {function(string): void} group - Start a collapsed log group
 * @property {function(): void} groupEnd - End the current log group
 * @property {function(number, ...*): void} log - Log with custom level
 * @property {function(string): Logger} child - Create a child logger with sub-namespace
 */

/**
 * @typedef {Object} LoggerOptions
 * @property {number} [level] - Override global level for this logger instance
 */

/**
 * Create a logger instance with optional namespace
 * @param {string|null} [namespace=null] - Logger namespace (e.g., 'Router', 'Store')
 * @param {LoggerOptions} [options={}] - Logger configuration options
 * @returns {Logger} A logger instance with error, warn, info, debug methods
 * @example
 * const log = createLogger('MyComponent');
 * log.info('Initialized'); // [MyComponent] Initialized
 * log.error('Failed', { code: 500 }); // [MyComponent] Failed { code: 500 }
 *
 * // With custom level
 * const debugLog = createLogger('Debug', { level: LogLevel.DEBUG });
 */
export function createLogger(namespace = null, options = {}) {
  const localLevel = options.level;

  /**
   * Check if a message at the given level should be logged
   * @param {number} level - The log level to check
   * @returns {boolean} True if the message should be logged
   */
  function shouldLog(level) {
    const effectiveLevel = localLevel !== undefined ? localLevel : globalLevel;
    return level <= effectiveLevel;
  }

  return {
    /**
     * Log an error message (shown unless level is SILENT)
     * @param {...*} args - Values to log
     * @returns {void}
     */
    error(...args) {
      if (shouldLog(LogLevel.ERROR)) {
        if (globalFormatter) {
          console.error(globalFormatter('error', namespace, args));
        } else {
          console.error(...formatArgs(namespace, args));
        }
      }
    },

    /**
     * Log a warning message (shown at WARN level and above)
     * @param {...*} args - Values to log
     * @returns {void}
     */
    warn(...args) {
      if (shouldLog(LogLevel.WARN)) {
        if (globalFormatter) {
          console.warn(globalFormatter('warn', namespace, args));
        } else {
          console.warn(...formatArgs(namespace, args));
        }
      }
    },

    /**
     * Log an info message (shown at INFO level and above)
     * @param {...*} args - Values to log
     * @returns {void}
     */
    info(...args) {
      if (shouldLog(LogLevel.INFO)) {
        if (globalFormatter) {
          console.log(globalFormatter('info', namespace, args));
        } else {
          console.log(...formatArgs(namespace, args));
        }
      }
    },

    /**
     * Log a debug message (only shown at DEBUG level)
     * @param {...*} args - Values to log
     * @returns {void}
     */
    debug(...args) {
      if (shouldLog(LogLevel.DEBUG)) {
        if (globalFormatter) {
          console.log(globalFormatter('debug', namespace, args));
        } else {
          console.log(...formatArgs(namespace, args));
        }
      }
    },

    /**
     * Start a collapsed log group (only shown at DEBUG level)
     * @param {string} label - The group label
     * @returns {void}
     */
    group(label) {
      if (shouldLog(LogLevel.DEBUG)) {
        console.group(namespace ? `[${namespace}] ${label}` : label);
      }
    },

    /**
     * End the current log group
     * @returns {void}
     */
    groupEnd() {
      if (shouldLog(LogLevel.DEBUG)) {
        console.groupEnd();
      }
    },

    /**
     * Log a message at a custom level
     * @param {number} level - The LogLevel to use
     * @param {...*} args - Values to log
     * @returns {void}
     */
    log(level, ...args) {
      if (shouldLog(level)) {
        const formatted = formatArgs(namespace, args);
        switch (level) {
          case LogLevel.ERROR:
            console.error(...formatted);
            break;
          case LogLevel.WARN:
            console.warn(...formatted);
            break;
          default:
            console.log(...formatted);
        }
      }
    },

    /**
     * Create a child logger with an additional namespace segment
     * @param {string} childNamespace - The child namespace to append
     * @returns {Logger} A new logger with combined namespace
     * @example
     * const log = createLogger('App');
     * const routerLog = log.child('Router');
     * routerLog.info('Navigate'); // [App:Router] Navigate
     */
    child(childNamespace) {
      const combined = namespace
        ? `${namespace}:${childNamespace}`
        : childNamespace;
      return createLogger(combined, options);
    }
  };
}

/**
 * Default logger instance without namespace
 * @type {Logger}
 * @example
 * import { logger } from './logger.js';
 * logger.info('Application started');
 */
export const logger = createLogger();

/**
 * Pre-configured loggers for common Pulse subsystems
 * @type {Object.<string, Logger>}
 * @property {Logger} pulse - Logger for core reactivity system
 * @property {Logger} dom - Logger for DOM operations
 * @property {Logger} router - Logger for routing
 * @property {Logger} store - Logger for state management
 * @property {Logger} native - Logger for native/mobile features
 * @property {Logger} hmr - Logger for hot module replacement
 * @property {Logger} cli - Logger for CLI tools
 */
export const loggers = {
  pulse: createLogger('Pulse'),
  dom: createLogger('DOM'),
  router: createLogger('Router'),
  store: createLogger('Store'),
  native: createLogger('Native'),
  hmr: createLogger('HMR'),
  cli: createLogger('CLI')
};

export default logger;
