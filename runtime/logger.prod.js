/**
 * Pulse Logger - Production Build
 *
 * This module re-exports the main logger with production mode forced.
 * Use this for bundler aliasing or manual import in production builds.
 *
 * @module pulse-js-framework/runtime/logger/prod
 *
 * @example
 * // Vite/Webpack aliasing in config:
 * resolve: {
 *   alias: {
 *     './logger.js': './logger.prod.js'
 *   }
 * }
 *
 * // Or import directly:
 * import { logger } from 'pulse-js-framework/runtime/logger/prod';
 */

// Import and immediately configure production mode
import {
  configureLogger,
  LogLevel,
  setLogLevel,
  getLogLevel,
  setFormatter,
  createLogger,
  logger,
  loggers,
  isProductionMode
} from './logger.js';

// Force production mode
configureLogger({ production: true });

// Re-export everything
export {
  LogLevel,
  setLogLevel,
  getLogLevel,
  setFormatter,
  createLogger,
  logger,
  loggers,
  configureLogger,
  isProductionMode
};

export default logger;
