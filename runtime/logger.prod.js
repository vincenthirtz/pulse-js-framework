/**
 * Pulse Logger - Production Build (minimal/noop)
 * Replace logger.js with this in production builds for smaller bundle.
 * @module pulse-js-framework/runtime/logger.prod
 */

export const LogLevel = { SILENT: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 };

const noop = () => {};
const noopLogger = {
  error: noop, warn: noop, info: noop, debug: noop,
  group: noop, groupEnd: noop, log: noop,
  child: () => noopLogger
};

export const setLogLevel = noop;
export const getLogLevel = () => LogLevel.SILENT;
export const setFormatter = noop;
export const createLogger = () => noopLogger;
export const logger = noopLogger;
export const loggers = {
  pulse: noopLogger, dom: noopLogger, router: noopLogger,
  store: noopLogger, native: noopLogger, hmr: noopLogger, cli: noopLogger
};
export default logger;
