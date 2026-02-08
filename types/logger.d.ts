/**
 * Pulse Logger - Type Definitions
 * @module pulse-js-framework/runtime/logger
 */

/**
 * Log level constants
 */
export declare const LogLevel: {
  readonly SILENT: 0;
  readonly ERROR: 1;
  readonly WARN: 2;
  readonly INFO: 3;
  readonly DEBUG: 4;
};

export type LogLevelValue = 0 | 1 | 2 | 3 | 4;

/**
 * Custom formatter function type
 */
export type LogFormatter = (
  level: 'error' | 'warn' | 'info' | 'debug',
  namespace: string | null,
  args: unknown[]
) => string;

/**
 * Logger options
 */
export interface LoggerOptions {
  /** Override global level for this logger */
  level?: LogLevelValue;
}

/**
 * Logger instance interface
 */
export interface Logger {
  /**
   * Log error message (always shown unless SILENT)
   */
  error(...args: unknown[]): void;

  /**
   * Log warning message
   */
  warn(...args: unknown[]): void;

  /**
   * Log info message (general output)
   */
  info(...args: unknown[]): void;

  /**
   * Log debug message (verbose output)
   */
  debug(...args: unknown[]): void;

  /**
   * Create a log group (for debug mode)
   */
  group(label: string): void;

  /**
   * End a log group
   */
  groupEnd(): void;

  /**
   * Log with custom level
   */
  log(level: LogLevelValue, ...args: unknown[]): void;

  /**
   * Create a child logger with additional namespace
   */
  child(childNamespace: string): Logger;
}

/**
 * Set global log level
 */
export declare function setLogLevel(level: LogLevelValue): void;

/**
 * Get current global log level
 */
export declare function getLogLevel(): LogLevelValue;

/**
 * Set custom formatter for all loggers
 */
export declare function setFormatter(formatter: LogFormatter | null): void;

/**
 * Configure logger options (production mode, etc.)
 */
export declare function configureLogger(options?: {
  production?: boolean;
}): void;

/**
 * Check if logger is in production (noop) mode
 */
export declare function isProductionMode(): boolean;

/**
 * Create a logger instance with optional namespace
 */
export declare function createLogger(
  namespace?: string | null,
  options?: LoggerOptions
): Logger;

/**
 * Default logger instance (no namespace)
 */
export declare const logger: Logger;

/**
 * Pre-configured loggers for common subsystems
 */
export declare const loggers: {
  readonly pulse: Logger;
  readonly dom: Logger;
  readonly router: Logger;
  readonly store: Logger;
  readonly native: Logger;
  readonly hmr: Logger;
  readonly cli: Logger;
};

export default logger;
