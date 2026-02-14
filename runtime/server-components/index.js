/**
 * Pulse Server Components (PSC)
 *
 * Main entry point for Server Components functionality.
 * Re-exports all public APIs from submodules.
 *
 * @module pulse-js-framework/runtime/server-components
 *
 * @example
 * // Server-side
 * import { serializeToPSC, renderServerComponent } from 'pulse-js-framework/runtime/server-components';
 *
 * const node = await renderServerComponent(MyComponent, props);
 * const payload = serializeToPSC(node, { clientManifest });
 *
 * @example
 * // Client-side
 * import { reconstructPSCTree, loadClientComponent } from 'pulse-js-framework/runtime/server-components';
 *
 * const payload = await fetch('/api/component').then(r => r.json());
 * const domTree = await reconstructPSCTree(payload);
 */

// ============================================================================
// Type Definitions & Constants
// ============================================================================

export {
  // Type guards
  isPSCElement,
  isPSCText,
  isPSCClientBoundary,
  isPSCFragment,
  isPSCComment,
  // Validation
  validatePSCPayload,
  validatePSCNode,
  // Constants
  PSCNodeType,
  PSC_VERSION
} from './types.js';

// ============================================================================
// Serialization (Server-Side)
// ============================================================================

export {
  // Core serialization
  serializeNode,
  serializeToPSC,
  // Client boundary detection
  isClientBoundary,
  markClientBoundary,
  // Constants
  CLIENT_BOUNDARY_ATTR,
  CLIENT_PROPS_ATTR
} from './serializer.js';

// ============================================================================
// Reconstruction (Client-Side)
// ============================================================================

export {
  // Core reconstruction
  reconstructNode,
  reconstructPSCTree,
  // Client component loading
  loadClientComponent,
  preloadClientComponent,
  // Hydration
  hydrateClientComponents,
  // Cache management
  clearComponentCache,
  getComponentCacheStats
} from './client.js';

// ============================================================================
// Server Rendering Helpers
// ============================================================================

export {
  // Component rendering
  renderServerComponent,
  executeAsyncComponent,
  // Boundary detection
  markClientBoundaries,
  // SSR integration
  renderServerComponentToHTML,
  // Component registry
  componentRegistry,
  createComponentRegistry
} from './server.js';

// ============================================================================
// Server Actions (RPC Mechanism)
// ============================================================================

export {
  // Client-side actions
  registerAction,
  createActionInvoker,
  useServerAction,
  bindFormAction,
  getActionConfig,
  clearActionRegistry
} from './actions.js';

export {
  // Server-side actions
  registerServerAction,
  executeServerAction,
  getServerActions,
  clearServerActions,
  // Middleware
  createServerActionMiddleware,
  createFastifyActionPlugin,
  createHonoActionMiddleware,
  // CSRF helpers
  generateCSRFTokenForResponse,
  getGlobalCSRFStore,
  setCSRFStore
} from './actions-server.js';

// ============================================================================
// Security (Prop Validation & Error Sanitization)
// ============================================================================

export {
  // Secret detection
  detectSecrets,
  // XSS sanitization
  sanitizePropsForXSS,
  // Size validation
  validatePropSizeLimits,
  PROP_SIZE_LIMITS,
  // Main validator
  validatePropSecurity
} from './security.js';

export {
  // Serialization validation (NEW)
  detectNonSerializable,
  detectEnvironmentVariables,
  validatePropSerialization
} from './security-validation.js';

export {
  // Security error classes
  PSCSecurityError,
  PSCSerializationError,
  PSCEnvVarError,
  PSCCSRFError,
  PSCRateLimitError
} from './security-errors.js';

export {
  // Error sanitization
  sanitizeError,
  sanitizeErrors,
  sanitizeStackTrace,
  truncateStackTrace,
  sanitizeErrorMessage,
  sanitizeValidationErrors,
  createProductionSafeError,
  // Mode detection
  isProductionMode,
  isDevelopmentMode
} from './error-sanitizer.js';

// ============================================================================
// CSRF Protection
// ============================================================================

export {
  // CSRF token management
  CSRFTokenStore,
  generateCSRFToken,
  validateCSRFToken,
  createCSRFMiddleware
} from './security-csrf.js';

// ============================================================================
// Rate Limiting
// ============================================================================

export {
  // Rate limiter
  RateLimiter,
  RateLimitStore,
  MemoryRateLimitStore,
  RedisRateLimitStore,
  createRateLimitMiddleware
} from './security-ratelimit.js';

// ============================================================================
// Default Export (import everything first for bundle)
// ============================================================================

import * as types from './types.js';
import * as serializer from './serializer.js';
import * as client from './client.js';
import * as server from './server.js';
import * as actions from './actions.js';
import * as actionsServer from './actions-server.js';
import * as security from './security.js';
import * as securityValidation from './security-validation.js';
import * as securityErrors from './security-errors.js';
import * as errorSanitizer from './error-sanitizer.js';
import * as csrf from './security-csrf.js';
import * as ratelimit from './security-ratelimit.js';

export default {
  // Types
  PSCNodeType: types.PSCNodeType,
  PSC_VERSION: types.PSC_VERSION,
  // Serialization
  serializeNode: serializer.serializeNode,
  serializeToPSC: serializer.serializeToPSC,
  isClientBoundary: serializer.isClientBoundary,
  markClientBoundary: serializer.markClientBoundary,
  // Reconstruction
  reconstructNode: client.reconstructNode,
  reconstructPSCTree: client.reconstructPSCTree,
  loadClientComponent: client.loadClientComponent,
  preloadClientComponent: client.preloadClientComponent,
  hydrateClientComponents: client.hydrateClientComponents,
  // Server
  renderServerComponent: server.renderServerComponent,
  executeAsyncComponent: server.executeAsyncComponent,
  markClientBoundaries: server.markClientBoundaries,
  renderServerComponentToHTML: server.renderServerComponentToHTML,
  componentRegistry: server.componentRegistry,
  createComponentRegistry: server.createComponentRegistry,
  // Actions (client)
  registerAction: actions.registerAction,
  createActionInvoker: actions.createActionInvoker,
  useServerAction: actions.useServerAction,
  bindFormAction: actions.bindFormAction,
  // Actions (server)
  registerServerAction: actionsServer.registerServerAction,
  executeServerAction: actionsServer.executeServerAction,
  createServerActionMiddleware: actionsServer.createServerActionMiddleware,
  generateCSRFTokenForResponse: actionsServer.generateCSRFTokenForResponse,
  getGlobalCSRFStore: actionsServer.getGlobalCSRFStore,
  setCSRFStore: actionsServer.setCSRFStore,
  // Security
  validatePropSecurity: security.validatePropSecurity,
  detectSecrets: security.detectSecrets,
  sanitizePropsForXSS: security.sanitizePropsForXSS,
  // Serialization validation
  detectNonSerializable: securityValidation.detectNonSerializable,
  detectEnvironmentVariables: securityValidation.detectEnvironmentVariables,
  validatePropSerialization: securityValidation.validatePropSerialization,
  // Security errors
  PSCSecurityError: securityErrors.PSCSecurityError,
  PSCSerializationError: securityErrors.PSCSerializationError,
  PSCEnvVarError: securityErrors.PSCEnvVarError,
  PSCCSRFError: securityErrors.PSCCSRFError,
  PSCRateLimitError: securityErrors.PSCRateLimitError,
  // CSRF protection
  CSRFTokenStore: csrf.CSRFTokenStore,
  generateCSRFToken: csrf.generateCSRFToken,
  validateCSRFToken: csrf.validateCSRFToken,
  createCSRFMiddleware: csrf.createCSRFMiddleware,
  // Rate limiting
  RateLimiter: ratelimit.RateLimiter,
  RateLimitStore: ratelimit.RateLimitStore,
  MemoryRateLimitStore: ratelimit.MemoryRateLimitStore,
  RedisRateLimitStore: ratelimit.RedisRateLimitStore,
  createRateLimitMiddleware: ratelimit.createRateLimitMiddleware,
  // Error sanitization
  sanitizeError: errorSanitizer.sanitizeError,
  sanitizeStackTrace: errorSanitizer.sanitizeStackTrace,
  sanitizeErrorMessage: errorSanitizer.sanitizeErrorMessage
};
