/**
 * Pulse Logger - Centralized logging with namespaces and levels
 * @module pulse-js-framework/runtime/logger
 *
 * Automatically uses noop logging in production for zero overhead.
 * Production mode is detected via:
 * - process.env.NODE_ENV === 'production'
 * - __PULSE_PROD__ global (for bundlers)
 * - Manual configuration via configureLogger({ production: true })
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
 *
 * // Force production mode (noop logging)
 * configureLogger({ production: true });
 */

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detect if we're in production mode
 * @private
 */
function detectProduction() {
  // Check for bundler-injected global
  if (typeof __PULSE_PROD__ !== 'undefined') {
    return __PULSE_PROD__;
  }
  // Check Node.js environment
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production';
  }
  // Default to development
  return false;
}

/** @type {boolean} */
let isProduction = detectProduction();

/**
 * Configure logger behavior
 * @param {Object} options - Configuration options
 * @param {boolean} [options.production] - Force production mode (noop logging)
 * @returns {void}
 * @example
 * // Disable all logging
 * configureLogger({ production: true });
 *
 * // Re-enable logging
 * configureLogger({ production: false });
 */
export function configureLogger(options = {}) {
  if (options.production !== undefined) {
    isProduction = options.production;
  }
}

/**
 * Check if logger is in production mode
 * @returns {boolean} True if production mode is active
 */
export function isProductionMode() {
  return isProduction;
}

// ============================================================================
// Log Levels
// ============================================================================

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
 * Namespace formatting helpers
 * @private
 */
const NAMESPACE_SEPARATOR = ':';
const formatNamespace = (ns) => `[${ns}]`;

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
  return isProduction ? LogLevel.SILENT : globalLevel;
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

// ============================================================================
// Production Noop Logger
// ============================================================================

/**
 * Noop function for production builds
 * @private
 */
const noop = () => {};

/**
 * Noop logger for production builds - zero overhead
 * @private
 * @type {Logger}
 */
const noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop,
  group: noop,
  groupEnd: noop,
  log: noop,
  child: () => noopLogger
};

// ============================================================================
// Development Logger Implementation
// ============================================================================

/**
 * Format message arguments with optional namespace prefix
 * @private
 * @param {string|null} namespace - The logger namespace
 * @param {Array<*>} args - Arguments to format
 * @returns {Array<*>} Formatted arguments array
 */
function formatArgs(namespace, args) {
  if (!namespace) return args;

  const prefix = formatNamespace(namespace);
  // If first arg is a string, prepend namespace
  if (typeof args[0] === 'string') {
    return [`${prefix} ${args[0]}`, ...args.slice(1)];
  }

  // Otherwise, add namespace as first arg
  return [prefix, ...args];
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
 * Create a development logger instance
 * @private
 * @param {string|null} namespace
 * @param {LoggerOptions} options
 * @returns {Logger}
 */
function createDevLogger(namespace, options) {
  const localLevel = options.level;

  function shouldLog(level) {
    const effectiveLevel = localLevel !== undefined ? localLevel : globalLevel;
    return level <= effectiveLevel;
  }

  return {
    error(...args) {
      if (shouldLog(LogLevel.ERROR)) {
        if (globalFormatter) {
          console.error(globalFormatter('error', namespace, args));
        } else {
          console.error(...formatArgs(namespace, args));
        }
      }
    },

    warn(...args) {
      if (shouldLog(LogLevel.WARN)) {
        if (globalFormatter) {
          console.warn(globalFormatter('warn', namespace, args));
        } else {
          console.warn(...formatArgs(namespace, args));
        }
      }
    },

    info(...args) {
      if (shouldLog(LogLevel.INFO)) {
        if (globalFormatter) {
          console.log(globalFormatter('info', namespace, args));
        } else {
          console.log(...formatArgs(namespace, args));
        }
      }
    },

    debug(...args) {
      if (shouldLog(LogLevel.DEBUG)) {
        if (globalFormatter) {
          console.log(globalFormatter('debug', namespace, args));
        } else {
          console.log(...formatArgs(namespace, args));
        }
      }
    },

    group(label) {
      if (shouldLog(LogLevel.DEBUG)) {
        console.group(namespace ? `${formatNamespace(namespace)} ${label}` : label);
      }
    },

    groupEnd() {
      if (shouldLog(LogLevel.DEBUG)) {
        console.groupEnd();
      }
    },

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

    child(childNamespace) {
      const combined = namespace
        ? `${namespace}${NAMESPACE_SEPARATOR}${childNamespace}`
        : childNamespace;
      return createLogger(combined, options);
    }
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Create a logger instance with optional namespace
 *
 * In production mode, returns a noop logger with zero overhead.
 * In development mode, returns a full-featured logger.
 *
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
  // Return noop logger in production for zero overhead
  if (isProduction) {
    return noopLogger;
  }
  return createDevLogger(namespace, options);
}

/**
 * Default logger instance without namespace
 *
 * Note: This is evaluated at module load time. If you configure
 * production mode after import, use createLogger() instead.
 *
 * @type {Logger}
 * @example
 * import { logger } from './logger.js';
 * logger.info('Application started');
 */
export const logger = createLogger();

/**
 * Pre-configured loggers for common Pulse subsystems
 *
 * These are lazily evaluated on first access to respect
 * production mode configuration.
 *
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
  get pulse() { return isProduction ? noopLogger : createDevLogger('Pulse', {}); },
  get dom() { return isProduction ? noopLogger : createDevLogger('DOM', {}); },
  get router() { return isProduction ? noopLogger : createDevLogger('Router', {}); },
  get store() { return isProduction ? noopLogger : createDevLogger('Store', {}); },
  get native() { return isProduction ? noopLogger : createDevLogger('Native', {}); },
  get hmr() { return isProduction ? noopLogger : createDevLogger('HMR', {}); },
  get cli() { return isProduction ? noopLogger : createDevLogger('CLI', {}); },
  get websocket() { return isProduction ? noopLogger : createDevLogger('WebSocket', {}); },
  get sse() { return isProduction ? noopLogger : createDevLogger('SSE', {}); },
  get i18n() { return isProduction ? noopLogger : createDevLogger('I18n', {}); },
  get animation() { return isProduction ? noopLogger : createDevLogger('Animation', {}); },
  get sw() { return isProduction ? noopLogger : createDevLogger('SW', {}); }
};

export default logger;
