/**
 * Server Actions Compiler Support
 *
 * Detects and transforms Server Action functions marked with 'use server'.
 * Generates client-side RPC stubs and server-side registration code.
 *
 * @module pulse-js-framework/compiler/transformer/actions
 */

// ============================================================
// Detection
// ============================================================

/**
 * Detect Server Action in function
 * @param {Object} functionNode - Function AST node
 * @returns {boolean} True if function is a Server Action
 *
 * @example
 * // Function with 'use server' directive
 * async function createUser(data) {
 *   'use server';
 *   return await db.users.create(data);
 * }
 * // isServerAction(functionNode) → true
 */
export function isServerAction(functionNode) {
  // Look for 'use server' directive at top of function
  if (!functionNode.body || !functionNode.body.length) {
    return false;
  }

  const firstStatement = functionNode.body[0];
  if (firstStatement.type === 'StringLiteral' || firstStatement.type === 'ExpressionStatement') {
    const value = firstStatement.value || firstStatement.expression?.value;
    if (typeof value === 'string') {
      const directive = value.trim().toLowerCase();
      return directive === 'use server';
    }
  }

  return false;
}

/**
 * Check if entire module has 'use server' directive
 * @param {Object} ast - Module AST
 * @returns {boolean} True if module-level 'use server'
 */
export function hasServerDirective(ast) {
  if (!ast.body || !ast.body.length) {
    return false;
  }

  const firstStatement = ast.body[0];
  if (firstStatement.type === 'StringLiteral' || firstStatement.type === 'ExpressionStatement') {
    const value = firstStatement.value || firstStatement.expression?.value;
    if (typeof value === 'string') {
      const directive = value.trim().toLowerCase();
      return directive === 'use server';
    }
  }

  return false;
}

// ============================================================
// Transformation
// ============================================================

/**
 * Transform Server Action function to RPC stub
 * @param {Object} functionNode - Function AST node
 * @param {string} componentId - Component identifier
 * @param {string} functionName - Function name
 * @returns {string} Transformed JavaScript code
 *
 * @example
 * // Input:
 * async function createUser(data) {
 *   'use server';
 *   return await db.users.create(data);
 * }
 *
 * // Output:
 * import { createActionInvoker } from 'pulse-js-framework/runtime/server-components';
 * const createUser = createActionInvoker('Component$createUser');
 */
export function transformServerAction(functionNode, componentId, functionName) {
  const actionId = `${componentId}$${functionName}`;

  // Generate client-side stub that calls server
  return `
// Server Action: ${functionName}
import { createActionInvoker } from 'pulse-js-framework/runtime/server-components';
const ${functionName} = createActionInvoker('${actionId}');
  `.trim();
}

/**
 * Transform module with 'use server' directive
 * @param {string} moduleId - Module identifier
 * @param {Array<Object>} exportedFunctions - Exported function nodes
 * @returns {string} Transformed module code
 *
 * @example
 * // Input module with 'use server':
 * 'use server';
 * export async function createUser(data) { ... }
 * export async function deleteUser(id) { ... }
 *
 * // Output (client bundle):
 * import { createActionInvoker } from 'pulse-js-framework/runtime/server-components';
 * export const createUser = createActionInvoker('Module$createUser');
 * export const deleteUser = createActionInvoker('Module$deleteUser');
 */
export function transformServerModule(moduleId, exportedFunctions) {
  const imports = `import { createActionInvoker } from 'pulse-js-framework/runtime/server-components';`;

  const stubs = exportedFunctions.map(fn => {
    const actionId = `${moduleId}$${fn.name}`;
    return `export const ${fn.name} = createActionInvoker('${actionId}');`;
  });

  return [imports, '', ...stubs].join('\n');
}

// ============================================================
// Extraction
// ============================================================

/**
 * Extract Server Actions from actions block
 * @param {Object} actionsBlock - Actions block AST node
 * @param {string} componentId - Component identifier
 * @returns {Array<{id, name, params}>} Server Actions metadata
 *
 * @example
 * // .pulse file actions block:
 * actions {
 *   async createUser(data) {
 *     'use server';
 *     return await db.users.create(data);
 *   }
 *   async deleteUser(id) {
 *     'use server';
 *     return await db.users.delete(id);
 *   }
 * }
 *
 * // extractServerActions(actionsBlock, 'UserForm') →
 * [
 *   { id: 'UserForm$createUser', name: 'createUser', params: ['data'] },
 *   { id: 'UserForm$deleteUser', name: 'deleteUser', params: ['id'] }
 * ]
 */
export function extractServerActions(actionsBlock, componentId) {
  const serverActions = [];

  if (!actionsBlock || !actionsBlock.functions) {
    return serverActions;
  }

  for (const action of actionsBlock.functions) {
    if (isServerAction(action)) {
      serverActions.push({
        id: `${componentId}$${action.name}`,
        name: action.name,
        params: action.params || []
      });
    }
  }

  return serverActions;
}

/**
 * Extract all exported functions from module
 * @param {Object} ast - Module AST
 * @returns {Array<{name, params, async}>} Exported functions
 */
export function extractExportedFunctions(ast) {
  const functions = [];

  if (!ast.body) {
    return functions;
  }

  for (const node of ast.body) {
    // export function name() { }
    if (node.type === 'ExportDeclaration' && node.declaration?.type === 'FunctionDeclaration') {
      const fn = node.declaration;
      functions.push({
        name: fn.name,
        params: fn.params || [],
        async: fn.async || false
      });
    }

    // export { fn1, fn2 }
    if (node.type === 'ExportNamedDeclaration' && node.specifiers) {
      for (const specifier of node.specifiers) {
        // Need to find the actual function declaration
        const fnDecl = ast.body.find(n =>
          n.type === 'FunctionDeclaration' && n.name === specifier.local
        );
        if (fnDecl) {
          functions.push({
            name: fnDecl.name,
            params: fnDecl.params || [],
            async: fnDecl.async || false
          });
        }
      }
    }
  }

  return functions;
}

// ============================================================
// Server-Side Registration
// ============================================================

/**
 * Generate server-side registration code
 * @param {Array<{id, name}>} serverActions - Server Actions metadata
 * @param {string} moduleId - Module identifier
 * @returns {string} Registration code
 *
 * @example
 * // generateServerRegistration([{ id: 'UserForm$createUser', name: 'createUser' }], 'UserForm')
 * // →
 * import { registerServerAction } from 'pulse-js-framework/runtime/server-components';
 * import { createUser } from './UserForm.server.js';
 * registerServerAction('UserForm$createUser', createUser);
 */
export function generateServerRegistration(serverActions, moduleId) {
  if (!serverActions || serverActions.length === 0) {
    return '';
  }

  const imports = `import { registerServerAction } from 'pulse-js-framework/runtime/server-components';`;
  const moduleImport = `import { ${serverActions.map(a => a.name).join(', ')} } from './${moduleId}.server.js';`;

  const registrations = serverActions.map(action =>
    `registerServerAction('${action.id}', ${action.name});`
  );

  return [imports, moduleImport, '', ...registrations].join('\n');
}

// ============================================================
// Validation
// ============================================================

/**
 * Validate Server Action function
 * @param {Object} functionNode - Function AST node
 * @returns {{valid: boolean, errors: Array<string>}} Validation result
 *
 * @example
 * validateServerAction(functionNode)
 * // → { valid: false, errors: ['Server Action must be async'] }
 */
export function validateServerAction(functionNode) {
  const errors = [];

  // Must be async
  if (!functionNode.async) {
    errors.push('Server Action must be async');
  }

  // Parameters must be serializable (no functions, classes)
  if (functionNode.params) {
    for (const param of functionNode.params) {
      // Check for destructuring with functions (hard to validate at compile time)
      // This is a basic check; runtime will validate actual arguments
      if (param.type === 'FunctionExpression' || param.type === 'ArrowFunctionExpression') {
        errors.push(`Server Action parameter '${param.name || 'anonymous'}' cannot be a function`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate all Server Actions in module
 * @param {Array<Object>} actions - Server Action nodes
 * @returns {{valid: boolean, errors: Array<{action: string, errors: Array<string>}>}} Validation result
 */
export function validateServerActions(actions) {
  const allErrors = [];

  for (const action of actions) {
    const result = validateServerAction(action);
    if (!result.valid) {
      allErrors.push({
        action: action.name,
        errors: result.errors
      });
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors
  };
}

// ============================================================
// Exports
// ============================================================

export default {
  isServerAction,
  hasServerDirective,
  transformServerAction,
  transformServerModule,
  extractServerActions,
  extractExportedFunctions,
  generateServerRegistration,
  validateServerAction,
  validateServerActions
};
