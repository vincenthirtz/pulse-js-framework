/**
 * Server Actions - Client Runtime
 *
 * Provides client-side utilities for invoking Server Actions.
 * Server Actions are async functions marked with 'use server' that execute
 * on the server but can be called from Client Components.
 *
 * Features:
 * - Secure RPC mechanism with CSRF protection
 * - Automatic serialization/deserialization
 * - Reactive hook (useServerAction) for loading/error states
 * - Progressive enhancement for forms (bindFormAction)
 *
 * @module pulse-js-framework/runtime/server-components/actions
 */

import { pulse } from '../pulse.js';
import { PSCRateLimitError } from './security-errors.js';

// ============================================================
// Utilities
// ============================================================

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Action Registry
// ============================================================

/**
 * Action registry (populated by build-time injection or runtime registration)
 * @type {Map<string, Object>}
 */
const actionRegistry = new Map(); // actionId → { endpoint, method }

/**
 * Register a Server Action
 * @param {string} actionId - Unique action identifier
 * @param {Object} config - Action configuration
 * @param {string} [config.endpoint='/_actions'] - RPC endpoint
 * @param {string} [config.method='POST'] - HTTP method
 */
export function registerAction(actionId, config = {}) {
  const { endpoint = '/_actions', method = 'POST' } = config;

  actionRegistry.set(actionId, { endpoint, method });
}

/**
 * Get registered action configuration
 * @param {string} actionId - Action identifier
 * @returns {Object|null} Action config or null
 */
export function getActionConfig(actionId) {
  return actionRegistry.get(actionId) || null;
}

/**
 * Clear all registered actions (for testing)
 */
export function clearActionRegistry() {
  actionRegistry.clear();
}

// ============================================================
// CSRF Token Handling
// ============================================================

/**
 * Get CSRF token from meta tag or cookie
 * @returns {string} CSRF token or empty string
 */
function getCSRFToken() {
  // Try meta tag first (most common pattern)
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content') || '';

    // Try cookie fallback (double-submit pattern)
    const match = document.cookie.match(/csrf-token=([^;]+)/);
    if (match) return match[1];
  }

  return '';
}

/**
 * Update CSRF token from response header
 * Called after successful Server Action when token rotation is enabled
 * @param {Response} response - Fetch response
 */
function updateCSRFToken(response) {
  if (typeof document === 'undefined') return;

  const newToken = response.headers.get('X-New-CSRF-Token');
  if (!newToken) return;

  // Update meta tag
  const meta = document.querySelector('meta[name="csrf-token"]');
  if (meta) {
    meta.setAttribute('content', newToken);
  }

  // Cookie is automatically updated by server's Set-Cookie header
}

// ============================================================
// Action Invocation
// ============================================================

/**
 * Create action invocation function with automatic retry on rate limit
 * @param {string} actionId - Action identifier
 * @param {Object} [options] - Invoker options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts on rate limit
 * @param {boolean} [options.autoRetry=true] - Automatically retry on rate limit
 * @returns {Function} Action invoker (async function)
 *
 * @example
 * const createUser = createActionInvoker('UserForm$createUser');
 * const user = await createUser({ name: 'John', email: 'john@example.com' });
 *
 * @example
 * // With custom retry behavior
 * const createUser = createActionInvoker('UserForm$createUser', {
 *   maxRetries: 5,
 *   autoRetry: true
 * });
 */
export function createActionInvoker(actionId, options = {}) {
  const { maxRetries = 3, autoRetry = true } = options;

  return async (...args) => {
    const config = actionRegistry.get(actionId);
    if (!config) {
      throw new Error(`Server Action not found: ${actionId}`);
    }

    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        // Send RPC request to server
        const response = await fetch(config.endpoint, {
          method: config.method,
          headers: {
            'Content-Type': 'application/json',
            'X-Pulse-Action': actionId,
            'X-CSRF-Token': getCSRFToken()
          },
          body: JSON.stringify({ args }),
          credentials: 'same-origin'
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 1000;

          // Parse error details
          let errorData = {};
          try {
            errorData = await response.json();
          } catch {
            // Ignore parse errors
          }

          // Check if we should retry
          if (attempts < maxRetries && autoRetry) {
            attempts++;
            await sleep(retryAfter);
            continue; // Retry
          }

          // Max retries reached or auto-retry disabled
          throw new PSCRateLimitError('Rate limit exceeded', {
            actionId,
            reason: errorData.reason,
            retryAfter,
            resetAt: response.headers.get('X-RateLimit-Reset'),
            limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0', 10)
          });
        }

        // Handle other errors
        if (!response.ok) {
          let errorMessage = 'Server Action failed';

          try {
            const error = await response.json();
            errorMessage = error.message || error.error || errorMessage;
          } catch {
            // Couldn't parse error as JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }

          throw new Error(errorMessage);
        }

        // Update CSRF token if rotated
        updateCSRFToken(response);

        return response.json();
      } catch (error) {
        // If it's a rate limit error and we have retries left, continue
        if (PSCRateLimitError.isRateLimitError(error) && attempts < maxRetries && autoRetry) {
          attempts++;
          await sleep(error.retryAfter || 1000);
          continue;
        }

        // Otherwise, throw the error
        throw error;
      }
    }

    // Should never reach here, but just in case
    throw new PSCRateLimitError('Max retries exceeded', { actionId });
  };
}

// ============================================================
// Reactive Hook
// ============================================================

/**
 * useServerAction hook for reactive Server Actions
 *
 * @param {Function|string} action - Action function or action ID
 * @returns {Object} Action state and controls
 * @returns {Function} returns.invoke - Invoke the action
 * @returns {Pulse<any>} returns.data - Result data (Pulse)
 * @returns {Pulse<boolean>} returns.loading - Loading state (Pulse)
 * @returns {Pulse<Error|null>} returns.error - Error state (Pulse)
 * @returns {Function} returns.reset - Reset to initial state
 *
 * @example
 * const { invoke, data, loading, error } = useServerAction('createUser');
 *
 * // In effect or event handler
 * effect(() => {
 *   if (loading.get()) console.log('Submitting...');
 *   if (error.get()) console.log('Error:', error.get().message);
 *   if (data.get()) console.log('Success:', data.get());
 * });
 *
 * await invoke({ name: 'John', email: 'john@example.com' });
 */
export function useServerAction(action) {
  const data = pulse(null);
  const loading = pulse(false);
  const error = pulse(null);

  const actionFn = typeof action === 'string'
    ? createActionInvoker(action)
    : action;

  async function invoke(...args) {
    loading.set(true);
    error.set(null);

    try {
      const result = await actionFn(...args);
      data.set(result);
      return result;
    } catch (err) {
      error.set(err);
      throw err;
    } finally {
      loading.set(false);
    }
  }

  function reset() {
    data.set(null);
    loading.set(false);
    error.set(null);
  }

  return { invoke, data, loading, error, reset };
}

// ============================================================
// Form Binding (Progressive Enhancement)
// ============================================================

/**
 * Bind form to Server Action (progressive enhancement)
 *
 * Intercepts form submission and submits via Server Action instead.
 * Provides automatic loading state and form reset on success.
 *
 * @param {HTMLFormElement} form - Form element
 * @param {Function|string} action - Server Action function or ID
 * @param {Object} [options] - Binding options
 * @param {boolean} [options.resetOnSuccess=true] - Reset form on successful submission
 * @param {Function} [options.onSuccess] - Success callback
 * @param {Function} [options.onError] - Error callback
 * @returns {Function} Cleanup function
 *
 * @example
 * const form = document.querySelector('#user-form');
 * const cleanup = bindFormAction(form, 'createUser', {
 *   onSuccess: (result) => console.log('User created:', result),
 *   onError: (error) => console.error('Failed:', error)
 * });
 */
export function bindFormAction(form, action, options = {}) {
  const {
    resetOnSuccess = true,
    onSuccess = null,
    onError = null
  } = options;

  const { invoke, loading } = useServerAction(action);

  async function handleSubmit(e) {
    e.preventDefault();

    // Disable form during submission
    const submitter = form.querySelector('[type=submit]');
    const originalSubmitterText = submitter?.textContent;

    if (submitter) {
      submitter.disabled = true;
      if (submitter.textContent) {
        submitter.textContent = 'Submitting...';
      }
    }

    // Extract form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const result = await invoke(data);

      if (resetOnSuccess) {
        form.reset();
      }

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      if (onError) {
        onError(error);
      } else {
        // Default error display
        console.error('Form submission failed:', error);
        alert(`Error: ${error.message}`);
      }
    } finally {
      if (submitter) {
        submitter.disabled = false;
        if (originalSubmitterText) {
          submitter.textContent = originalSubmitterText;
        }
      }
    }
  }

  form.addEventListener('submit', handleSubmit);

  // Return cleanup function
  return () => {
    form.removeEventListener('submit', handleSubmit);
  };
}

// ============================================================
// Exports
// ============================================================

export default {
  registerAction,
  getActionConfig,
  clearActionRegistry,
  createActionInvoker,
  useServerAction,
  bindFormAction
};
