/**
 * Pulse CLI - Lint Command
 * Validates .pulse files for errors and style issues
 */

import { readFileSync, writeFileSync, watch } from 'fs';
import { dirname } from 'path';
import { findPulseFiles, parseArgs, relativePath } from './utils/file-utils.js';
import { log } from './logger.js';
import { createTimer, formatDuration } from './utils/cli-ui.js';

/**
 * Lint rules configuration
 */
export const LintRules = {
  // Semantic rules (errors)
  'undefined-reference': { severity: 'error', fixable: false },
  'duplicate-declaration': { severity: 'error', fixable: false },

  // Security rules (warnings)
  'xss-vulnerability': { severity: 'warning', fixable: false },

  // Accessibility rules (warnings)
  'a11y-img-alt': { severity: 'warning', fixable: true },  // Can add alt=""
  'a11y-button-text': { severity: 'warning', fixable: false },
  'a11y-link-text': { severity: 'warning', fixable: false },
  'a11y-input-label': { severity: 'warning', fixable: false },
  'a11y-click-key': { severity: 'warning', fixable: false },
  'a11y-no-autofocus': { severity: 'warning', fixable: true },  // Can remove autofocus
  'a11y-no-positive-tabindex': { severity: 'warning', fixable: true },  // Can change to 0
  'a11y-heading-order': { severity: 'warning', fixable: false },
  'a11y-aria-props': { severity: 'warning', fixable: false },
  'a11y-role-props': { severity: 'warning', fixable: false },

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

    // Phase 5: Security checks (XSS detection)
    this.checkSecurity();

    // Phase 6: Accessibility checks
    this.checkAccessibility();

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
   * Check for security vulnerabilities (XSS patterns)
   */
  checkSecurity() {
    // Check actions for dangerous DOM manipulation
    if (this.ast.actions && this.ast.actions.functions) {
      for (const fn of this.ast.actions.functions) {
        if (fn.body) {
          this.checkForXSS(fn.body, fn.name, fn.line, fn.column);
        }
      }
    }

    // Check view for dangerous patterns in directives
    if (this.ast.view) {
      this.checkViewForXSS(this.ast.view);
    }
  }

  /**
   * Check code string for XSS vulnerabilities
   */
  checkForXSS(code, context, line, column) {
    if (typeof code !== 'string') return;

    // Dangerous DOM manipulation patterns
    const xssPatterns = [
      {
        pattern: /\.innerHTML\s*=\s*(?!['"]\s*['"])/,
        message: 'Assigning dynamic content to innerHTML can lead to XSS. Use textContent or sanitize input.'
      },
      {
        pattern: /\.outerHTML\s*=\s*(?!['"]\s*['"])/,
        message: 'Assigning dynamic content to outerHTML can lead to XSS. Consider safer alternatives.'
      },
      {
        pattern: /document\.write\s*\(/,
        message: 'document.write() can execute scripts and lead to XSS. Use DOM methods instead.'
      },
      {
        pattern: /\.insertAdjacentHTML\s*\(/,
        message: 'insertAdjacentHTML with unsanitized input can lead to XSS. Sanitize HTML or use DOM methods.'
      },
      {
        pattern: /eval\s*\(/,
        message: 'eval() executes arbitrary code and is a security risk. Avoid using eval().'
      },
      {
        pattern: /new\s+Function\s*\(/,
        message: 'new Function() can execute arbitrary code like eval(). Avoid dynamic function creation.'
      },
      {
        pattern: /setTimeout\s*\(\s*['"`]/,
        message: 'setTimeout with string argument executes code like eval(). Use a function instead.'
      },
      {
        pattern: /setInterval\s*\(\s*['"`]/,
        message: 'setInterval with string argument executes code like eval(). Use a function instead.'
      }
    ];

    for (const { pattern, message } of xssPatterns) {
      if (pattern.test(code)) {
        this.addDiagnostic('warning', 'xss-vulnerability',
          `Potential XSS in action '${context}': ${message}`,
          line || 1, column || 1);
      }
    }
  }

  /**
   * Check view nodes for XSS vulnerabilities
   */
  checkViewForXSS(node) {
    if (!node) return;

    const children = node.children || [];
    for (const child of children) {
      if (!child) continue;

      // Check for @html directive (if exists in DSL)
      if (child.directives) {
        for (const directive of child.directives) {
          if (directive.name === 'html') {
            this.addDiagnostic('warning', 'xss-vulnerability',
              '@html directive renders raw HTML and can lead to XSS if used with user input. Ensure content is sanitized.',
              directive.line || child.line || 1, directive.column || child.column || 1);
          }
        }
      }

      // Check directive expressions for dangerous patterns
      if (child.directives) {
        for (const directive of child.directives) {
          const expr = directive.handler || directive.expression || '';
          if (typeof expr === 'string') {
            // Check for innerHTML in expressions
            if (/innerHTML|outerHTML/.test(expr)) {
              this.addDiagnostic('warning', 'xss-vulnerability',
                `Using innerHTML/outerHTML in directive expression can lead to XSS. Use safer alternatives.`,
                directive.line || child.line || 1, directive.column || child.column || 1);
            }
          }
        }
      }

      // Recurse into children
      this.checkViewForXSS(child);
    }
  }

  /**
   * Check for accessibility issues
   */
  checkAccessibility() {
    if (!this.ast.view) return;

    this.lastHeadingLevel = 0;
    this.checkViewAccessibility(this.ast.view);
  }

  /**
   * Recursively check view nodes for accessibility
   */
  checkViewAccessibility(node) {
    if (!node) return;

    const children = node.children || [];
    for (const child of children) {
      if (!child) continue;
      this.checkNodeAccessibility(child);
      this.checkViewAccessibility(child);
    }
  }

  /**
   * Check a single node for accessibility issues
   */
  checkNodeAccessibility(node) {
    if (!node || node.type !== 'Element') return;

    const selector = node.selector || node.tag || '';
    const tagMatch = selector.match(/^([a-z][a-z0-9]*)/i);
    const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';

    // Skip custom components (PascalCase)
    if (/^[A-Z]/.test(tagMatch?.[1] || '')) return;

    const line = node.line || 1;
    const column = node.column || 1;

    // Extract attributes from selector and directives
    const attrs = this.extractAttributes(node);

    // Rule: img-alt - Images must have alt attribute
    if (tagName === 'img') {
      if (!attrs.has('alt') && !attrs.has('aria-label') && !attrs.has('aria-labelledby')) {
        const selector = node.selector || 'img';
        this.addDiagnostic('warning', 'a11y-img-alt',
          'Image missing alt attribute. Add alt="" for decorative images or descriptive text for informative images.',
          line, column, {
            type: 'replace',
            oldText: selector,
            newText: selector + '[alt=""]',
            description: 'Add empty alt attribute for decorative image'
          });
      }
    }

    // Rule: button-text - Buttons must have accessible name
    if (tagName === 'button') {
      const hasText = this.hasTextContent(node);
      const hasAriaLabel = attrs.has('aria-label') || attrs.has('aria-labelledby') || attrs.has('title');
      if (!hasText && !hasAriaLabel) {
        this.addDiagnostic('warning', 'a11y-button-text',
          'Button has no accessible name. Add text content, aria-label, or aria-labelledby.',
          line, column);
      }
    }

    // Rule: link-text - Links must have accessible name
    if (tagName === 'a') {
      const hasText = this.hasTextContent(node);
      const hasAriaLabel = attrs.has('aria-label') || attrs.has('aria-labelledby');
      const hasImgAlt = this.hasChildWithAlt(node);
      if (!hasText && !hasAriaLabel && !hasImgAlt) {
        this.addDiagnostic('warning', 'a11y-link-text',
          'Link has no accessible name. Add text content, aria-label, or an image with alt.',
          line, column);
      }
    }

    // Rule: input-label - Form inputs must have labels
    if (['input', 'select', 'textarea'].includes(tagName)) {
      const inputType = attrs.get('type') || 'text';
      if (!['hidden', 'submit', 'button', 'reset', 'image'].includes(inputType)) {
        const hasLabel = attrs.has('aria-label') || attrs.has('aria-labelledby') || attrs.has('id');
        const hasPlaceholder = attrs.has('placeholder');
        if (!hasLabel) {
          const msg = hasPlaceholder
            ? 'Input uses placeholder but missing label. Placeholder is not a substitute for label.'
            : 'Form input missing label. Add aria-label, aria-labelledby, or associate with <label>.';
          this.addDiagnostic('warning', 'a11y-input-label', msg, line, column);
        }
      }
    }

    // Rule: click-key - Click handlers on non-interactive elements need keyboard support
    if (['div', 'span', 'section', 'article', 'aside', 'main', 'nav', 'header', 'footer', 'p', 'li'].includes(tagName)) {
      const hasClick = this.hasDirective(node, 'click');
      const hasKeyHandler = this.hasDirective(node, 'keydown') || this.hasDirective(node, 'keyup') || this.hasDirective(node, 'keypress');
      const hasRole = attrs.has('role');
      const hasTabindex = attrs.has('tabindex');

      if (hasClick && !hasKeyHandler && !hasRole) {
        this.addDiagnostic('warning', 'a11y-click-key',
          `Click handler on <${tagName}> requires keyboard support. Add role="button", tabindex="0", and onKeyDown handler, or use <button>.`,
          line, column);
      }
    }

    // Rule: no-autofocus - Avoid autofocus as it can disorient screen readers
    if (attrs.has('autofocus')) {
      const selector = node.selector || '';
      // Create fix to remove [autofocus] from selector
      const fixedSelector = selector.replace(/\[autofocus\]/gi, '');
      this.addDiagnostic('warning', 'a11y-no-autofocus',
        'Avoid autofocus - it can disorient screen reader users and cause accessibility issues.',
        line, column, {
          type: 'replace',
          oldText: selector,
          newText: fixedSelector,
          description: 'Remove autofocus attribute'
        });
    }

    // Rule: no-positive-tabindex - Avoid positive tabindex
    const tabindex = attrs.get('tabindex');
    if (tabindex && parseInt(tabindex, 10) > 0) {
      const selector = node.selector || '';
      // Create fix to change tabindex to 0
      const fixedSelector = selector.replace(/\[tabindex=["']?\d+["']?\]/gi, '[tabindex="0"]');
      this.addDiagnostic('warning', 'a11y-no-positive-tabindex',
        'Avoid positive tabindex values. Use tabindex="0" or "-1" and rely on DOM order.',
        line, column, {
          type: 'replace',
          oldText: selector,
          newText: fixedSelector,
          description: 'Change tabindex to 0'
        });
    }

    // Rule: heading-order - Headings should follow hierarchy
    const headingMatch = tagName.match(/^h([1-6])$/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10);
      if (this.lastHeadingLevel > 0 && level > this.lastHeadingLevel + 1) {
        this.addDiagnostic('warning', 'a11y-heading-order',
          `Heading level skipped: <h${this.lastHeadingLevel}> to <h${level}>. Use sequential heading levels.`,
          line, column);
      }
      this.lastHeadingLevel = level;
    }

    // Rule: aria-props - Check ARIA attribute validity
    this.checkAriaProps(node, attrs, line, column);

    // Rule: role-props - Check role requirements
    this.checkRoleProps(node, attrs, tagName, line, column);
  }

  /**
   * Extract attributes from node selector and directives
   */
  extractAttributes(node) {
    const attrs = new Map();
    const selector = node.selector || '';

    // Parse attributes from selector [attr=value] or [attr]
    const attrRegex = /\[([a-z][a-z0-9-]*)(?:=["']?([^"'\]]+)["']?)?\]/gi;
    let match;
    while ((match = attrRegex.exec(selector)) !== null) {
      attrs.set(match[1].toLowerCase(), match[2] || true);
    }

    // Check directives for attributes
    for (const directive of node.directives || []) {
      if (directive.name === 'attr' || directive.name === 'bind') {
        const attrName = directive.arg || directive.attribute;
        if (attrName) {
          attrs.set(attrName.toLowerCase(), directive.value || true);
        }
      }
    }

    // Check props for component-like attribute passing
    if (node.props) {
      for (const prop of Object.keys(node.props)) {
        attrs.set(prop.toLowerCase(), node.props[prop]);
      }
    }

    return attrs;
  }

  /**
   * Check if node has text content
   */
  hasTextContent(node) {
    if (node.textContent && node.textContent.length > 0) {
      return node.textContent.some(t => {
        // Direct string
        if (typeof t === 'string' && t.trim().length > 0) return true;
        // Interpolation
        if (typeof t === 'object' && t.type === 'Interpolation') return true;
        // TextNode with parts
        if (typeof t === 'object' && t.type === 'TextNode' && t.parts) {
          return t.parts.some(part =>
            (typeof part === 'string' && part.trim().length > 0) ||
            (typeof part === 'object')
          );
        }
        return false;
      });
    }
    // Check children for text nodes
    if (node.children) {
      return node.children.some(child =>
        child && (child.type === 'TextNode' || this.hasTextContent(child))
      );
    }
    return false;
  }

  /**
   * Check if node has child with alt attribute
   */
  hasChildWithAlt(node) {
    if (!node.children) return false;
    return node.children.some(child => {
      if (!child) return false;
      const selector = child.selector || child.tag || '';
      if (/^img/i.test(selector) && /\[alt/.test(selector)) {
        return true;
      }
      return this.hasChildWithAlt(child);
    });
  }

  /**
   * Check if node has a specific directive
   */
  hasDirective(node, name) {
    if (!node.directives) return false;
    return node.directives.some(d =>
      d.name === name ||
      d.event === name ||
      (d.type === 'EventDirective' && d.event === name)
    );
  }

  /**
   * Check ARIA attribute validity
   */
  checkAriaProps(node, attrs, line, column) {
    const validAriaAttrs = new Set([
      'aria-activedescendant', 'aria-atomic', 'aria-autocomplete', 'aria-braillelabel',
      'aria-brailleroledescription', 'aria-busy', 'aria-checked', 'aria-colcount',
      'aria-colindex', 'aria-colindextext', 'aria-colspan', 'aria-controls',
      'aria-current', 'aria-describedby', 'aria-description', 'aria-details',
      'aria-disabled', 'aria-dropeffect', 'aria-errormessage', 'aria-expanded',
      'aria-flowto', 'aria-grabbed', 'aria-haspopup', 'aria-hidden', 'aria-invalid',
      'aria-keyshortcuts', 'aria-label', 'aria-labelledby', 'aria-level', 'aria-live',
      'aria-modal', 'aria-multiline', 'aria-multiselectable', 'aria-orientation',
      'aria-owns', 'aria-placeholder', 'aria-posinset', 'aria-pressed', 'aria-readonly',
      'aria-relevant', 'aria-required', 'aria-roledescription', 'aria-rowcount',
      'aria-rowindex', 'aria-rowindextext', 'aria-rowspan', 'aria-selected',
      'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
      'aria-valuetext'
    ]);

    for (const [attr] of attrs) {
      if (attr.startsWith('aria-') && !validAriaAttrs.has(attr)) {
        this.addDiagnostic('warning', 'a11y-aria-props',
          `Invalid ARIA attribute: ${attr}`,
          line, column);
      }
    }
  }

  /**
   * Check role-specific required attributes
   */
  checkRoleProps(node, attrs, tagName, line, column) {
    const role = attrs.get('role');
    if (!role) return;

    const roleRequirements = {
      'checkbox': ['aria-checked'],
      'combobox': ['aria-expanded'],
      'heading': ['aria-level'],
      'meter': ['aria-valuenow'],
      'option': [],
      'progressbar': [],
      'radio': ['aria-checked'],
      'scrollbar': ['aria-controls', 'aria-valuenow'],
      'separator': [],
      'slider': ['aria-valuenow'],
      'spinbutton': [],
      'switch': ['aria-checked'],
      'tab': [],
      'tabpanel': [],
      'treeitem': []
    };

    const required = roleRequirements[role];
    if (required && required.length > 0) {
      for (const reqAttr of required) {
        if (!attrs.has(reqAttr)) {
          this.addDiagnostic('warning', 'a11y-role-props',
            `Role "${role}" requires ${reqAttr} attribute`,
            line, column);
        }
      }
    }

    // Check for redundant roles on semantic elements
    const implicitRoles = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'img': 'img',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo',
      'aside': 'complementary',
      'form': 'form',
      'table': 'table',
      'ul': 'list',
      'ol': 'list',
      'li': 'listitem'
    };

    if (implicitRoles[tagName] === role) {
      this.addDiagnostic('warning', 'a11y-role-props',
        `Redundant role="${role}" on <${tagName}> - element has implicit role`,
        line, column);
    }
  }

  /**
   * Add a diagnostic message
   * @param {string} severity - 'error' | 'warning' | 'info'
   * @param {string} code - Rule code
   * @param {string} message - Diagnostic message
   * @param {number} line - Line number
   * @param {number} column - Column number
   * @param {Object} [fix] - Optional fix information
   * @param {string} [fix.type] - Fix type: 'replace' | 'insert' | 'delete'
   * @param {string} [fix.oldText] - Text to replace (for 'replace')
   * @param {string} [fix.newText] - Replacement text
   * @param {number} [fix.start] - Start position in source
   * @param {number} [fix.end] - End position in source
   */
  addDiagnostic(severity, code, message, line, column, fix = null) {
    const diag = {
      severity,
      code,
      message,
      line: line || 1,
      column: column || 1
    };

    if (fix && LintRules[code]?.fixable) {
      diag.fix = fix;
    }

    this.diagnostics.push(diag);
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
 * Apply fixes to a source file
 * @param {string} source - Original source code
 * @param {Array} diagnostics - Diagnostics with fixes
 * @returns {{fixed: string, count: number}} Fixed source and fix count
 */
export function applyFixes(source, diagnostics) {
  // Get fixable diagnostics, sorted by line in reverse order to avoid offset issues
  const fixable = diagnostics
    .filter(d => d.fix && d.fix.oldText && d.fix.newText)
    .sort((a, b) => b.line - a.line);

  if (fixable.length === 0) {
    return { fixed: source, count: 0 };
  }

  let fixed = source;
  let count = 0;

  for (const diag of fixable) {
    const { fix } = diag;

    // Find and replace the old text with new text
    // We do line-by-line replacement to be more precise
    const lines = fixed.split('\n');
    const lineIndex = diag.line - 1;

    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      if (line.includes(fix.oldText)) {
        lines[lineIndex] = line.replace(fix.oldText, fix.newText);
        count++;
      }
    }

    fixed = lines.join('\n');
  }

  return { fixed, count };
}

/**
 * Lint files and return summary
 * @param {string[]} files - Files to lint
 * @param {Object} options - Lint options
 * @param {boolean} options.fix - Auto-fix issues
 * @param {boolean} options.dryRun - Show fixes without applying
 * @param {boolean} options.quiet - Suppress output
 * @returns {Object} Summary with totals
 */
async function lintFiles(files, options = {}) {
  const { fix = false, dryRun = false, quiet = false } = options;
  const timer = createTimer();

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfo = 0;
  let totalFixed = 0;

  for (const file of files) {
    const result = await lintFile(file, { fix });
    const relPath = relativePath(file);

    // Apply fixes if requested
    if (fix && result.diagnostics.some(d => d.fix)) {
      const source = readFileSync(file, 'utf-8');
      const { fixed, count } = applyFixes(source, result.diagnostics);

      if (count > 0) {
        if (dryRun) {
          if (!quiet) {
            log.info(`\n${relPath} - ${count} fix(es) available (dry run)`);
          }
        } else {
          writeFileSync(file, fixed, 'utf-8');
          if (!quiet) {
            log.success(`\n${relPath} - ${count} fix(es) applied`);
          }
        }
        totalFixed += count;

        // Re-lint to show remaining issues
        const recheck = await lintFile(file, {});
        result.diagnostics = recheck.diagnostics;
      }
    }

    if (result.diagnostics.length > 0 && !quiet) {
      log.info(`\n${relPath}`);

      for (const diag of result.diagnostics) {
        log.info(formatDiagnostic(diag));

        switch (diag.severity) {
          case 'error': totalErrors++; break;
          case 'warning': totalWarnings++; break;
          case 'info': totalInfo++; break;
        }
      }
    }
  }

  return {
    errors: totalErrors,
    warnings: totalWarnings,
    info: totalInfo,
    fixed: totalFixed,
    elapsed: timer.elapsed()
  };
}

/**
 * Main lint command handler
 */
export async function runLint(args) {
  const { options, patterns } = parseArgs(args);
  const fix = options.fix || false;
  const dryRun = options['dry-run'] || false;
  const watchMode = options.watch || options.w || false;

  // Dry-run only makes sense with --fix
  if (dryRun && !fix) {
    log.warn('Note: --dry-run has no effect without --fix');
  }

  // Find files to lint
  const files = findPulseFiles(patterns);

  if (files.length === 0) {
    log.info('No .pulse files found to lint.');
    return;
  }

  // Initial lint run
  log.info(`Linting ${files.length} file(s)...${dryRun ? ' (dry-run)' : ''}\n`);
  const summary = await lintFiles(files, { fix, dryRun });

  // Print summary
  printLintSummary(summary, files.length);

  // Watch mode
  if (watchMode) {
    log.info('\nWatching for changes... (Ctrl+C to stop)\n');

    const watchedDirs = new Set();
    const debounceTimers = new Map();

    // Collect directories to watch
    for (const file of files) {
      watchedDirs.add(dirname(file));
    }

    // Watch each directory
    for (const dir of watchedDirs) {
      watch(dir, { recursive: false }, (_eventType, filename) => {
        if (!filename || !filename.endsWith('.pulse')) return;

        const filePath = files.find(f => f.endsWith(filename));
        if (!filePath) return;

        // Debounce rapid changes
        if (debounceTimers.has(filePath)) {
          clearTimeout(debounceTimers.get(filePath));
        }

        debounceTimers.set(filePath, setTimeout(() => {
          debounceTimers.delete(filePath);

          log.info(`\n[${new Date().toLocaleTimeString()}] File changed: ${relativePath(filePath)}`);
          lintFiles([filePath], { fix, dryRun }).then(result => {
            printLintSummary(result, 1, true);
          });
        }, 100));
      });
    }

    // Keep process running
    return new Promise(() => {});
  } else {
    // Exit with error code if errors found
    if (summary.errors > 0) {
      process.exit(1);
    }
  }
}

/**
 * Print lint summary
 */
function printLintSummary(summary, fileCount, compact = false) {
  const { errors, warnings, info, elapsed } = summary;
  const timeStr = formatDuration(elapsed);

  if (compact) {
    const parts = [];
    if (errors > 0) parts.push(`${errors} error(s)`);
    if (warnings > 0) parts.push(`${warnings} warning(s)`);
    if (parts.length === 0) {
      log.success(`✓ Passed (${timeStr})`);
    } else {
      log.error(`✗ ${parts.join(', ')} (${timeStr})`);
    }
    return;
  }

  log.info('\n' + '─'.repeat(60));
  const parts = [];
  if (errors > 0) parts.push(`${errors} error(s)`);
  if (warnings > 0) parts.push(`${warnings} warning(s)`);
  if (info > 0) parts.push(`${info} info`);

  if (parts.length === 0) {
    log.success(`✓ ${fileCount} file(s) passed (${timeStr})`);
  } else {
    log.error(`✗ ${parts.join(', ')} in ${fileCount} file(s) (${timeStr})`);
  }
}
