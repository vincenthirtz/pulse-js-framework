/**
 * Pulse Transformer - Code generator
 *
 * Transforms AST into JavaScript code
 *
 * Features:
 * - Import statement support
 * - Slot-based component composition
 * - CSS scoping with unique class prefixes
 * - Source map generation
 *
 * @module pulse-js-framework/compiler/transformer
 */

import { SourceMapGenerator } from '../sourcemap.js';
import { generateScopeId } from './constants.js';
import { extractImportedComponents, generateImports } from './imports.js';
import {
  extractPropVars,
  extractStateVars,
  extractActionNames,
  transformState,
  transformActions,
  transformValue
} from './state.js';
import { transformRouter } from './router.js';
import { transformStore } from './store.js';
import { transformExpression, transformExpressionString, transformFunctionBody } from './expressions.js';
import { transformView, transformViewNode, VIEW_NODE_HANDLERS, addScopeToSelector } from './view.js';
import { transformStyle, flattenStyleRule, scopeStyleSelector } from './style.js';
import { generateExport } from './export.js';

/**
 * Transformer class
 */
export class Transformer {
  constructor(ast, options = {}) {
    this.ast = ast;
    // Default to source maps enabled in development mode
    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
    this.options = {
      runtime: 'pulse-js-framework/runtime',
      minify: false,
      scopeStyles: true,
      sourceMap: isDev,        // Enable source map generation (default: true in dev)
      sourceFileName: null,    // Original .pulse file name
      sourceContent: null,     // Original source content (for inline source maps)
      ...options
    };
    this.stateVars = new Set();
    this.propVars = new Set();
    this.propDefaults = new Map();
    this.actionNames = new Set();
    this.importedComponents = new Map();
    this.scopeId = this.options.scopeStyles ? generateScopeId() : null;

    // Track a11y feature usage for conditional imports
    this.usesA11y = {
      srOnly: false,
      trapFocus: false,
      announce: false
    };

    // Source map tracking
    this.sourceMap = null;
    this._currentLine = 0;
    this._currentColumn = 0;

    // Initialize source map generator if enabled
    if (this.options.sourceMap) {
      this.sourceMap = new SourceMapGenerator({
        file: this.options.sourceFileName?.replace('.pulse', '.js') || 'output.js'
      });
      if (this.options.sourceFileName) {
        this.sourceMap.addSource(
          this.options.sourceFileName,
          this.options.sourceContent
        );
      }
    }
  }

  /**
   * Add a mapping to the source map
   * @param {Object} original - Original position {line, column} (1-based)
   * @param {string} name - Optional identifier name
   */
  _addMapping(original, name = null) {
    if (!this.sourceMap || !original) return;

    this.sourceMap.addMapping({
      generated: {
        line: this._currentLine,
        column: this._currentColumn
      },
      original: {
        line: original.line - 1, // Convert to 0-based
        column: original.column - 1
      },
      source: this.options.sourceFileName,
      name
    });
  }

  /**
   * Track output position when writing code
   * @param {string} code - Generated code
   * @returns {string} The same code (for chaining)
   */
  _trackCode(code) {
    for (const char of code) {
      if (char === '\n') {
        this._currentLine++;
        this._currentColumn = 0;
      } else {
        this._currentColumn++;
      }
    }
    return code;
  }

  /**
   * Write code with optional source mapping
   * @param {string} code - Code to write
   * @param {Object} original - Original position {line, column}
   * @param {string} name - Optional identifier name
   * @returns {string} The code
   */
  _emit(code, original = null, name = null) {
    if (original) {
      this._addMapping(original, name);
    }
    return this._trackCode(code);
  }

  /**
   * Pre-scan AST for a11y directive usage
   */
  _scanA11yUsage(node) {
    if (!node) return;

    // Check directives for a11y usage
    if (node.directives) {
      for (const directive of node.directives) {
        if (directive.type === 'A11yDirective') {
          if (directive.attrs && directive.attrs.srOnly) {
            this.usesA11y.srOnly = true;
          }
        } else if (directive.type === 'FocusTrapDirective') {
          this.usesA11y.trapFocus = true;
        }
      }
    }

    // Recursively scan children
    if (node.children) {
      for (const child of node.children) {
        this._scanA11yUsage(child);
      }
    }

    // Scan view block children
    if (node.type === 'ViewBlock' && node.children) {
      for (const child of node.children) {
        this._scanA11yUsage(child);
      }
    }
  }

  /**
   * Transform AST to JavaScript code
   */
  transform() {
    const parts = [];

    // Extract imported components first
    if (this.ast.imports) {
      extractImportedComponents(this, this.ast.imports);
    }

    // Extract prop variables (before imports so useProp can be conditionally imported)
    if (this.ast.props) {
      extractPropVars(this, this.ast.props);
    }

    // Extract state variables
    if (this.ast.state) {
      extractStateVars(this, this.ast.state);
    }

    // Extract action names
    if (this.ast.actions) {
      extractActionNames(this, this.ast.actions);
    }

    // Pre-scan for a11y usage to determine imports
    if (this.ast.view) {
      this._scanA11yUsage(this.ast.view);
    }

    // Imports (runtime + user imports) - after extraction so we know what to import
    parts.push(generateImports(this));

    // Store (must come before router so $store is available to guards)
    if (this.ast.store) {
      parts.push(transformStore(this, this.ast.store, transformValue));
    }

    // Router (after store so guards can access $store)
    if (this.ast.router) {
      parts.push(transformRouter(this, this.ast.router));
    }

    // State
    if (this.ast.state) {
      parts.push(transformState(this, this.ast.state));
    }

    // Actions
    if (this.ast.actions) {
      parts.push(transformActions(this, this.ast.actions, transformFunctionBody));
    }

    // View
    if (this.ast.view) {
      parts.push(transformView(this, this.ast.view));
    }

    // Style
    if (this.ast.style) {
      parts.push(transformStyle(this, this.ast.style));
    }

    // Component export
    parts.push(generateExport(this));

    const code = parts.filter(Boolean).join('\n\n');

    // Track the generated code for source map positions
    if (this.sourceMap) {
      this._trackCode(code);
    }

    return code;
  }

  /**
   * Transform AST and return result with optional source map
   * @returns {Object} Result with code and optional sourceMap
   */
  transformWithSourceMap() {
    const code = this.transform();

    if (!this.sourceMap) {
      return { code, sourceMap: null };
    }

    return {
      code,
      sourceMap: this.sourceMap.toJSON(),
      sourceMapComment: this.sourceMap.toComment()
    };
  }

  // =============================================================================
  // Instance methods that delegate to module functions
  // These are kept for backward compatibility
  // =============================================================================

  extractImportedComponents(imports) {
    return extractImportedComponents(this, imports);
  }

  generateImports() {
    return generateImports(this);
  }

  extractPropVars(propsBlock) {
    return extractPropVars(this, propsBlock);
  }

  extractStateVars(stateBlock) {
    return extractStateVars(this, stateBlock);
  }

  extractActionNames(actionsBlock) {
    return extractActionNames(this, actionsBlock);
  }

  transformState(stateBlock) {
    return transformState(this, stateBlock);
  }

  transformRouter(routerBlock) {
    return transformRouter(this, routerBlock);
  }

  transformStore(storeBlock) {
    return transformStore(this, storeBlock, transformValue);
  }

  transformValue(node) {
    return transformValue(this, node);
  }

  transformActions(actionsBlock) {
    return transformActions(this, actionsBlock, transformFunctionBody);
  }

  transformFunctionBody(tokens) {
    return transformFunctionBody(this, tokens);
  }

  transformView(viewBlock) {
    return transformView(this, viewBlock);
  }

  transformViewNode(node, indent = 0) {
    return transformViewNode(this, node, indent);
  }

  transformExpression(node) {
    return transformExpression(this, node);
  }

  transformExpressionString(exprStr) {
    return transformExpressionString(this, exprStr);
  }

  transformStyle(styleBlock) {
    return transformStyle(this, styleBlock);
  }

  flattenStyleRule(rule, parentSelector, output) {
    return flattenStyleRule(this, rule, parentSelector, output);
  }

  scopeStyleSelector(selector) {
    return scopeStyleSelector(this, selector);
  }

  addScopeToSelector(selector) {
    return addScopeToSelector(this, selector);
  }

  generateExport() {
    return generateExport(this);
  }
}

// Static property for VIEW_NODE_HANDLERS (backward compatibility)
Transformer.VIEW_NODE_HANDLERS = VIEW_NODE_HANDLERS;

/**
 * Transform AST to JavaScript code
 */
export function transform(ast, options = {}) {
  const transformer = new Transformer(ast, options);
  return transformer.transform();
}

export default {
  Transformer,
  transform
};
