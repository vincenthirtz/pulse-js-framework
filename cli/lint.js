/**
 * Pulse CLI - Lint Command
 * Validates .pulse files for errors and style issues
 */

import { readFileSync, writeFileSync } from 'fs';
import { findPulseFiles, parseArgs, relativePath } from './utils/file-utils.js';

/**
 * Lint rules configuration
 */
export const LintRules = {
  // Semantic rules (errors)
  'undefined-reference': { severity: 'error', fixable: false },
  'duplicate-declaration': { severity: 'error', fixable: false },

  // Usage rules (warnings)
  'unused-import': { severity: 'warning', fixable: true },
  'unused-state': { severity: 'warning', fixable: false },
  'unused-action': { severity: 'warning', fixable: false },

  // Style rules (info)
  'naming-page': { severity: 'info', fixable: false },
  'naming-state': { severity: 'info', fixable: false },
  'empty-block': { severity: 'info', fixable: false },
  'import-order': { severity: 'info', fixable: true }
};

/**
 * Symbol table for tracking declarations and references
 */
class SymbolTable {
  constructor() {
    this.imports = new Map();  // name -> { source, line, column, used }
    this.state = new Map();    // name -> { line, column, used }
    this.actions = new Map();  // name -> { line, column, used }
  }

  declareImport(name, source, line, column) {
    if (this.imports.has(name)) {
      return { error: 'duplicate', existing: this.imports.get(name) };
    }
    this.imports.set(name, { source, line, column, used: false });
    return { success: true };
  }

  declareState(name, line, column) {
    if (this.state.has(name)) {
      return { error: 'duplicate', existing: this.state.get(name) };
    }
    this.state.set(name, { line, column, used: false });
    return { success: true };
  }

  declareAction(name, line, column) {
    if (this.actions.has(name)) {
      return { error: 'duplicate', existing: this.actions.get(name) };
    }
    this.actions.set(name, { line, column, used: false });
    return { success: true };
  }

  reference(name) {
    // Check state first
    if (this.state.has(name)) {
      this.state.get(name).used = true;
      return { found: true, kind: 'state' };
    }
    // Check actions
    if (this.actions.has(name)) {
      this.actions.get(name).used = true;
      return { found: true, kind: 'action' };
    }
    // Check imports
    if (this.imports.has(name)) {
      this.imports.get(name).used = true;
      return { found: true, kind: 'import' };
    }
    return { found: false };
  }

  getUnused() {
    const unused = [];
    for (const [name, info] of this.imports) {
      if (!info.used) {
        unused.push({ kind: 'import', name, ...info });
      }
    }
    for (const [name, info] of this.state) {
      if (!info.used) {
        unused.push({ kind: 'state', name, ...info });
      }
    }
    for (const [name, info] of this.actions) {
      if (!info.used) {
        unused.push({ kind: 'action', name, ...info });
      }
    }
    return unused;
  }
}

/**
 * Semantic analyzer for .pulse files
 */
export class SemanticAnalyzer {
  constructor(ast, source) {
    this.ast = ast;
    this.source = source;
    this.symbols = new SymbolTable();
    this.diagnostics = [];
  }

  /**
   * Run all analysis passes
   */
  analyze() {
    // Phase 1: Collect declarations
    this.collectDeclarations();

    // Phase 2: Check references in view/actions
    this.checkReferences();

    // Phase 3: Check unused symbols
    this.checkUnused();

    // Phase 4: Style checks
    this.checkStyle();

    return this.diagnostics;
  }

  /**
   * Collect all declarations from AST
   */
  collectDeclarations() {
    // Process imports
    for (const imp of this.ast.imports || []) {
      for (const spec of imp.specifiers || []) {
        const result = this.symbols.declareImport(
          spec.local,
          imp.source,
          imp.line || 1,
          imp.column || 1
        );
        if (result.error === 'duplicate') {
          this.addDiagnostic('error', 'duplicate-declaration',
            `'${spec.local}' is already declared`,
            imp.line || 1, imp.column || 1);
        }
      }
    }

    // Process state block
    if (this.ast.state && this.ast.state.properties) {
      for (const prop of this.ast.state.properties) {
        const result = this.symbols.declareState(
          prop.name,
          prop.line || 1,
          prop.column || 1
        );
        if (result.error === 'duplicate') {
          this.addDiagnostic('error', 'duplicate-declaration',
            `State variable '${prop.name}' is already declared`,
            prop.line || 1, prop.column || 1);
        }
      }
    }

    // Process actions block
    if (this.ast.actions && this.ast.actions.functions) {
      for (const fn of this.ast.actions.functions) {
        const result = this.symbols.declareAction(
          fn.name,
          fn.line || 1,
          fn.column || 1
        );
        if (result.error === 'duplicate') {
          this.addDiagnostic('error', 'duplicate-declaration',
            `Action '${fn.name}' is already declared`,
            fn.line || 1, fn.column || 1);
        }
      }
    }
  }

  /**
   * Check all references in view and actions
   */
  checkReferences() {
    // Check view block
    if (this.ast.view) {
      this.checkViewReferences(this.ast.view);
    }

    // Check action bodies (simplified - just look for identifiers)
    if (this.ast.actions && this.ast.actions.functions) {
      for (const fn of this.ast.actions.functions) {
        if (fn.bodyTokens) {
          this.checkTokensForReferences(fn.bodyTokens);
        }
      }
    }
  }

  /**
   * Recursively check references in view block
   */
  checkViewReferences(node) {
    if (!node) return;

    // Check children array
    const children = node.children || [];
    for (const child of children) {
      this.checkViewNode(child);
    }
  }

  /**
   * Check a single view node
   */
  checkViewNode(node) {
    if (!node) return;

    switch (node.type) {
      case 'Element':
        // Check if it's a component reference (starts with uppercase)
        // Extract tag name from selector (e.g., "Button.class#id" -> "Button")
        const selector = node.selector || node.tag || '';
        const tagMatch = selector.match(/^([A-Za-z][A-Za-z0-9]*)/);
        const tagName = tagMatch ? tagMatch[1] : '';

        if (tagName && /^[A-Z]/.test(tagName)) {
          const ref = this.symbols.reference(tagName);
          if (!ref.found) {
            this.addDiagnostic('error', 'undefined-reference',
              `Component '${tagName}' is not defined. Did you forget to import it?`,
              node.line || 1, node.column || 1);
          }
        }

        // Check directives
        for (const directive of node.directives || []) {
          this.checkExpression(directive.handler || directive.expression, directive.line, directive.column);
        }

        // Check text content for interpolations
        for (const text of node.textContent || []) {
          if (typeof text === 'object' && text.type === 'Interpolation') {
            this.checkExpression(text.expression, text.line, text.column);
          }
        }

        // Recurse into children
        this.checkViewReferences(node);
        break;

      case 'TextNode':
        // Check for interpolations in text
        if (node.interpolations) {
          for (const interp of node.interpolations) {
            this.checkExpression(interp.expression, interp.line, interp.column);
          }
        }
        break;

      case 'IfDirective':
        this.checkExpression(node.condition, node.line, node.column);
        this.checkViewReferences(node.consequent);
        if (node.alternate) {
          this.checkViewReferences(node.alternate);
        }
        break;

      case 'EachDirective':
        // The iterator variable is local scope, but the array should be checked
        this.checkExpression(node.iterable, node.line, node.column);
        // Note: node.item is the loop variable, it's a new declaration
        this.checkViewReferences(node.body);
        break;

      case 'SlotElement':
        // Slots are fine, check fallback content if any
        if (node.fallback) {
          for (const child of node.fallback) {
            this.checkViewNode(child);
          }
        }
        break;

      default:
        // Generic handling for other node types
        if (node.children) {
          this.checkViewReferences(node);
        }
    }
  }

  /**
   * Check an expression for undefined references
   */
  checkExpression(expr, line, column) {
    if (!expr) return;

    if (typeof expr === 'string') {
      // Expression as string - extract identifiers
      const identifiers = this.extractIdentifiers(expr);
      for (const id of identifiers) {
        // Skip built-in globals and common patterns
        if (this.isBuiltIn(id)) continue;

        const ref = this.symbols.reference(id);
        if (!ref.found) {
          this.addDiagnostic('error', 'undefined-reference',
            `'${id}' is not defined`,
            line || 1, column || 1);
        }
      }
    } else if (typeof expr === 'object') {
      // Expression as AST node
      this.checkExpressionNode(expr);
    }
  }

  /**
   * Check an expression AST node
   */
  checkExpressionNode(node) {
    if (!node) return;

    switch (node.type) {
      case 'Identifier':
        if (!this.isBuiltIn(node.name)) {
          const ref = this.symbols.reference(node.name);
          if (!ref.found) {
            this.addDiagnostic('error', 'undefined-reference',
              `'${node.name}' is not defined`,
              node.line || 1, node.column || 1);
          }
        }
        break;

      case 'MemberExpression':
        // Only check the base object
        this.checkExpressionNode(node.object);
        break;

      case 'CallExpression':
        this.checkExpressionNode(node.callee);
        for (const arg of node.arguments || []) {
          this.checkExpressionNode(arg);
        }
        break;

      case 'BinaryExpression':
      case 'LogicalExpression':
        this.checkExpressionNode(node.left);
        this.checkExpressionNode(node.right);
        break;

      case 'UnaryExpression':
      case 'UpdateExpression':
        this.checkExpressionNode(node.argument);
        break;

      case 'ConditionalExpression':
        this.checkExpressionNode(node.test);
        this.checkExpressionNode(node.consequent);
        this.checkExpressionNode(node.alternate);
        break;

      case 'ArrayExpression':
        for (const el of node.elements || []) {
          this.checkExpressionNode(el);
        }
        break;

      case 'ObjectExpression':
        for (const prop of node.properties || []) {
          this.checkExpressionNode(prop.value);
        }
        break;
    }
  }

  /**
   * Extract identifiers from expression string
   */
  extractIdentifiers(expr) {
    // Match identifiers (not preceded by . and not part of keywords)
    const identifiers = new Set();
    const regex = /(?<![.\w])([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    let match;

    while ((match = regex.exec(expr)) !== null) {
      const id = match[1];
      // Skip keywords and common globals
      if (!this.isKeyword(id)) {
        identifiers.add(id);
      }
    }

    return identifiers;
  }

  /**
   * Check if identifier is a JavaScript keyword
   */
  isKeyword(id) {
    const keywords = new Set([
      'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
      'continue', 'return', 'throw', 'try', 'catch', 'finally',
      'function', 'class', 'const', 'let', 'var', 'new', 'this',
      'typeof', 'instanceof', 'in', 'of', 'delete', 'void'
    ]);
    return keywords.has(id);
  }

  /**
   * Check if identifier is a built-in global
   */
  isBuiltIn(id) {
    const builtIns = new Set([
      'console', 'window', 'document', 'navigator', 'location',
      'localStorage', 'sessionStorage', 'fetch', 'setTimeout', 'setInterval',
      'clearTimeout', 'clearInterval', 'Promise', 'Array', 'Object',
      'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON', 'Map', 'Set',
      'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI',
      'encodeURIComponent', 'decodeURIComponent', 'alert', 'confirm', 'prompt',
      'event', 'e', 'item', 'index', 'key', 'value' // Common loop/event variables
    ]);
    return builtIns.has(id) || this.isKeyword(id);
  }

  /**
   * Check tokens for references (simplified)
   */
  checkTokensForReferences(tokens) {
    for (const token of tokens) {
      if (token.type === 'IDENTIFIER') {
        // Reference the identifier to mark it as used
        this.symbols.reference(token.value);
      }
    }
  }

  /**
   * Check for unused symbols
   */
  checkUnused() {
    for (const unused of this.symbols.getUnused()) {
      const code = `unused-${unused.kind}`;
      const message = unused.kind === 'import'
        ? `'${unused.name}' is imported but never used`
        : unused.kind === 'state'
        ? `State variable '${unused.name}' is declared but never used`
        : `Action '${unused.name}' is declared but never called`;

      this.addDiagnostic('warning', code, message, unused.line, unused.column);
    }
  }

  /**
   * Check style conventions
   */
  checkStyle() {
    // Check page name is PascalCase
    if (this.ast.page && this.ast.page.name) {
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(this.ast.page.name)) {
        this.addDiagnostic('info', 'naming-page',
          `Page name '${this.ast.page.name}' should be PascalCase (e.g., 'MyComponent')`,
          this.ast.page.line || 1, this.ast.page.column || 1);
      }
    }

    // Check state properties are camelCase
    if (this.ast.state && this.ast.state.properties) {
      for (const prop of this.ast.state.properties) {
        if (!/^[a-z][a-zA-Z0-9]*$/.test(prop.name) && !/^[a-z]$/.test(prop.name)) {
          // Allow single lowercase letter
          if (prop.name.length > 1 && /^[A-Z]/.test(prop.name)) {
            this.addDiagnostic('info', 'naming-state',
              `State variable '${prop.name}' should be camelCase (e.g., 'myVariable')`,
              prop.line || 1, prop.column || 1);
          }
        }
      }
    }

    // Check for empty blocks
    if (this.ast.state && (!this.ast.state.properties || this.ast.state.properties.length === 0)) {
      this.addDiagnostic('info', 'empty-block',
        'Empty state block - consider removing if not needed',
        this.ast.state.line || 1, this.ast.state.column || 1);
    }

    if (this.ast.view && (!this.ast.view.children || this.ast.view.children.length === 0)) {
      this.addDiagnostic('info', 'empty-block',
        'Empty view block - component will render nothing',
        this.ast.view.line || 1, this.ast.view.column || 1);
    }

    if (this.ast.actions && (!this.ast.actions.functions || this.ast.actions.functions.length === 0)) {
      this.addDiagnostic('info', 'empty-block',
        'Empty actions block - consider removing if not needed',
        this.ast.actions.line || 1, this.ast.actions.column || 1);
    }

    // Check import order
    if (this.ast.imports && this.ast.imports.length > 1) {
      const sources = this.ast.imports.map(i => i.source);
      const sorted = [...sources].sort();
      if (JSON.stringify(sources) !== JSON.stringify(sorted)) {
        this.addDiagnostic('info', 'import-order',
          'Imports should be sorted alphabetically',
          this.ast.imports[0].line || 1, this.ast.imports[0].column || 1);
      }
    }
  }

  /**
   * Add a diagnostic message
   */
  addDiagnostic(severity, code, message, line, column) {
    this.diagnostics.push({
      severity,
      code,
      message,
      line: line || 1,
      column: column || 1
    });
  }
}

/**
 * Format a diagnostic for console output
 */
export function formatDiagnostic(diag, file = null) {
  const prefix = file ? `${file}:` : '';
  const location = `${prefix}${diag.line}:${diag.column}`;
  const severity = diag.severity.toUpperCase().padEnd(7);
  return `  ${location.padEnd(20)} ${severity} ${diag.message} (${diag.code})`;
}

/**
 * Lint a single file
 */
export async function lintFile(filePath, options = {}) {
  const { parse } = await import('../compiler/index.js');

  const source = readFileSync(filePath, 'utf-8');

  // Parse the file
  let ast;
  const errors = [];

  try {
    ast = parse(source);
  } catch (e) {
    // Syntax error
    return {
      file: filePath,
      diagnostics: [{
        severity: 'error',
        code: 'syntax-error',
        message: e.message,
        line: e.line || 1,
        column: e.column || 1
      }]
    };
  }

  // Run semantic analysis
  const analyzer = new SemanticAnalyzer(ast, source);
  const diagnostics = analyzer.analyze();

  return {
    file: filePath,
    diagnostics,
    ast // Return AST for potential --fix operations
  };
}

/**
 * Main lint command handler
 */
export async function runLint(args) {
  const { options, patterns } = parseArgs(args);
  const fix = options.fix || false;

  // Find files to lint
  const files = findPulseFiles(patterns);

  if (files.length === 0) {
    console.log('No .pulse files found to lint.');
    return;
  }

  console.log(`Linting ${files.length} file(s)...\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfo = 0;

  for (const file of files) {
    const result = await lintFile(file, { fix });
    const relPath = relativePath(file);

    if (result.diagnostics.length > 0) {
      console.log(`\n${relPath}`);

      for (const diag of result.diagnostics) {
        console.log(formatDiagnostic(diag));

        switch (diag.severity) {
          case 'error': totalErrors++; break;
          case 'warning': totalWarnings++; break;
          case 'info': totalInfo++; break;
        }
      }
    }
  }

  // Summary
  console.log('\n' + '─'.repeat(60));
  const parts = [];
  if (totalErrors > 0) parts.push(`${totalErrors} error(s)`);
  if (totalWarnings > 0) parts.push(`${totalWarnings} warning(s)`);
  if (totalInfo > 0) parts.push(`${totalInfo} info`);

  if (parts.length === 0) {
    console.log(`✓ ${files.length} file(s) passed`);
  } else {
    console.log(`✗ ${parts.join(', ')} in ${files.length} file(s)`);
  }

  // Exit with error code if errors found
  if (totalErrors > 0) {
    process.exit(1);
  }
}
