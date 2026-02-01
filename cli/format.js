/**
 * Pulse CLI - Format Command
 * Formats .pulse files consistently
 */

import { readFileSync, writeFileSync, watch } from 'fs';
import { dirname } from 'path';
import { findPulseFiles, parseArgs, relativePath } from './utils/file-utils.js';
import { log } from './logger.js';
import { createTimer, formatDuration } from './utils/cli-ui.js';

/**
 * Default format options
 */
export const FormatOptions = {
  indentSize: 2,
  maxLineLength: 100,
  sortImports: true,
  insertFinalNewline: true
};

/**
 * Pulse code formatter (AST-based)
 */
export class PulseFormatter {
  constructor(ast, options = {}) {
    this.ast = ast;
    this.options = { ...FormatOptions, ...options };
    this.indent = 0;
    this.output = [];
  }

  /**
   * Format the AST to string
   */
  format() {
    // Imports (sorted if option enabled)
    this.formatImports();

    // Page declaration
    if (this.ast.page) {
      this.emit(`@page ${this.ast.page.name}`);
      this.emit('');
    }

    // Route declaration
    if (this.ast.route) {
      this.emit(`@route "${this.ast.route.path}"`);
      this.emit('');
    }

    // State block
    if (this.ast.state) {
      this.formatStateBlock();
    }

    // View block
    if (this.ast.view) {
      this.formatViewBlock();
    }

    // Actions block
    if (this.ast.actions) {
      this.formatActionsBlock();
    }

    // Style block
    if (this.ast.style) {
      this.formatStyleBlock();
    }

    let result = this.output.join('\n');

    // Ensure final newline
    if (this.options.insertFinalNewline && !result.endsWith('\n')) {
      result += '\n';
    }

    return result;
  }

  /**
   * Format import statements
   */
  formatImports() {
    let imports = [...(this.ast.imports || [])];

    if (imports.length === 0) return;

    if (this.options.sortImports) {
      imports.sort((a, b) => a.source.localeCompare(b.source));
    }

    for (const imp of imports) {
      this.emit(this.formatImportStatement(imp));
    }

    this.emit('');
  }

  /**
   * Format a single import statement
   */
  formatImportStatement(imp) {
    const specifiers = imp.specifiers || [];

    if (specifiers.length === 0) {
      return `import '${imp.source}'`;
    }

    // Default import
    const defaultSpec = specifiers.find(s => s.type === 'default');
    // Named imports
    const namedSpecs = specifiers.filter(s => s.type === 'named');
    // Namespace import
    const namespaceSpec = specifiers.find(s => s.type === 'namespace');

    let parts = ['import'];

    if (defaultSpec) {
      parts.push(defaultSpec.local);
    }

    if (namespaceSpec) {
      if (defaultSpec) parts.push(',');
      parts.push(`* as ${namespaceSpec.local}`);
    }

    if (namedSpecs.length > 0) {
      if (defaultSpec || namespaceSpec) parts.push(',');

      const namedParts = namedSpecs.map(s => {
        if (s.imported && s.imported !== s.local) {
          return `${s.imported} as ${s.local}`;
        }
        return s.local;
      });

      parts.push(`{ ${namedParts.join(', ')} }`);
    }

    parts.push('from');
    parts.push(`'${imp.source}'`);

    return parts.join(' ');
  }

  /**
   * Format state block
   */
  formatStateBlock() {
    this.emit('state {');
    this.indent++;

    const properties = this.ast.state.properties || [];
    for (const prop of properties) {
      const value = this.formatValue(prop.value);
      this.emit(`${prop.name}: ${value}`);
    }

    this.indent--;
    this.emit('}');
    this.emit('');
  }

  /**
   * Format a value (literal, object, array)
   */
  formatValue(node) {
    if (node === null || node === undefined) {
      return 'null';
    }

    if (typeof node === 'string') {
      return `"${this.escapeString(node)}"`;
    }

    if (typeof node === 'number' || typeof node === 'boolean') {
      return String(node);
    }

    if (node.type === 'Literal') {
      if (typeof node.value === 'string') {
        return `"${this.escapeString(node.value)}"`;
      }
      return String(node.value);
    }

    if (node.type === 'Identifier') {
      return node.name;
    }

    if (node.type === 'ArrayLiteral' || Array.isArray(node.elements)) {
      const elements = node.elements || [];
      if (elements.length === 0) return '[]';

      const formatted = elements.map(el => this.formatValue(el));
      const inline = `[${formatted.join(', ')}]`;

      if (inline.length <= 60) {
        return inline;
      }

      // Multi-line array
      return `[\n${formatted.map(f => this.getIndent(1) + f).join(',\n')}\n${this.getIndent()}]`;
    }

    if (node.type === 'ObjectLiteral' || node.properties) {
      const properties = node.properties || [];
      if (properties.length === 0) return '{}';

      const formatted = properties.map(p => `${p.name}: ${this.formatValue(p.value)}`);
      const inline = `{ ${formatted.join(', ')} }`;

      if (inline.length <= 60) {
        return inline;
      }

      // Multi-line object
      return `{\n${formatted.map(f => this.getIndent(1) + f).join(',\n')}\n${this.getIndent()}}`;
    }

    // Default - return as-is
    return String(node.value || node);
  }

  /**
   * Format view block
   */
  formatViewBlock() {
    this.emit('view {');
    this.indent++;

    const children = this.ast.view.children || [];
    for (const child of children) {
      this.formatViewNode(child);
    }

    this.indent--;
    this.emit('}');
    this.emit('');
  }

  /**
   * Format a single view node
   */
  formatViewNode(node) {
    if (!node) return;

    switch (node.type) {
      case 'Element':
        this.formatElement(node);
        break;

      case 'TextNode':
        this.formatTextNode(node);
        break;

      case 'IfDirective':
        this.formatIfDirective(node);
        break;

      case 'EachDirective':
        this.formatEachDirective(node);
        break;

      case 'SlotElement':
        this.formatSlot(node);
        break;

      default:
        // Unknown node type - skip
        break;
    }
  }

  /**
   * Format an expression to string
   */
  formatExpression(expr) {
    if (!expr) return '';
    if (typeof expr === 'string') return expr;

    // Handle AST expression nodes
    switch (expr.type) {
      case 'Identifier':
        return expr.name;
      case 'Literal':
        return typeof expr.value === 'string' ? `"${expr.value}"` : String(expr.value);
      case 'MemberExpression':
        return `${this.formatExpression(expr.object)}.${this.formatExpression(expr.property)}`;
      case 'CallExpression':
        const callee = this.formatExpression(expr.callee);
        const args = (expr.arguments || []).map(a => this.formatExpression(a)).join(', ');
        return `${callee}(${args})`;
      case 'BinaryExpression':
        return `${this.formatExpression(expr.left)} ${expr.operator} ${this.formatExpression(expr.right)}`;
      case 'UpdateExpression':
        return expr.prefix
          ? `${expr.operator}${this.formatExpression(expr.argument)}`
          : `${this.formatExpression(expr.argument)}${expr.operator}`;
      case 'UnaryExpression':
        return `${expr.operator}${this.formatExpression(expr.argument)}`;
      default:
        // Fallback to raw if available
        if (expr.raw) return expr.raw;
        return String(expr);
    }
  }

  /**
   * Format an element node
   */
  formatElement(node) {
    let line = node.selector || node.tag || 'div';

    // Add inline directives
    for (const dir of node.directives || []) {
      const handler = this.formatExpression(dir.handler || dir.expression || '');
      line += ` @${dir.event || dir.name}(${handler})`;
    }

    // Get text content
    const textContent = this.getTextContent(node);
    const children = node.children || [];
    const hasChildren = children.length > 0;

    if (textContent && !hasChildren) {
      // Inline text content
      line += ` "${this.escapeString(textContent)}"`;
      this.emit(line);
    } else if (hasChildren) {
      // Block with children
      this.emit(`${line} {`);
      this.indent++;

      // Add text content as first child if present
      if (textContent) {
        this.emit(`"${this.escapeString(textContent)}"`);
      }

      for (const child of children) {
        this.formatViewNode(child);
      }

      this.indent--;
      this.emit('}');
    } else {
      // Empty element
      this.emit(line);
    }
  }

  /**
   * Format a part of an interpolated string
   */
  formatPart(p) {
    if (typeof p === 'string') return p;
    // Handle Interpolation AST node (type: 'Interpolation', expression: string)
    if (p.type === 'Interpolation') {
      const expr = typeof p.expression === 'string' ? p.expression : this.formatExpression(p.expression);
      return `{${expr}}`;
    }
    // Handle plain object with expr property
    if (p.expr) return `{${p.expr}}`;
    if (p.expression) return `{${p.expression}}`;
    return String(p);
  }

  /**
   * Get text content from element
   */
  getTextContent(node) {
    const textContent = node.textContent || [];

    if (textContent.length === 0) return '';

    return textContent.map(t => {
      if (typeof t === 'string') return t;
      // Handle TextNode with parts (interpolated strings)
      if (t.type === 'TextNode' && t.parts) {
        return t.parts.map(p => this.formatPart(p)).join('');
      }
      if (t.type === 'Interpolation') {
        const expr = typeof t.expression === 'string' ? t.expression : this.formatExpression(t.expression);
        return `{${expr}}`;
      }
      if (t.type === 'TextNode') return t.value || '';
      return String(t.value || t);
    }).join('');
  }

  /**
   * Format a text node
   */
  formatTextNode(node) {
    const value = node.value || '';
    this.emit(`"${this.escapeString(value)}"`);
  }

  /**
   * Format if directive
   */
  formatIfDirective(node) {
    const condition = node.condition || 'true';
    this.emit(`@if (${condition}) {`);
    this.indent++;

    const consequent = node.consequent?.children || node.consequent || [];
    for (const child of consequent) {
      this.formatViewNode(child);
    }

    this.indent--;

    if (node.alternate) {
      this.emit('} @else {');
      this.indent++;

      const alternate = node.alternate?.children || node.alternate || [];
      for (const child of alternate) {
        this.formatViewNode(child);
      }

      this.indent--;
    }

    this.emit('}');
  }

  /**
   * Format each directive
   */
  formatEachDirective(node) {
    const item = node.item || 'item';
    const iterable = node.iterable || 'items';
    this.emit(`@each (${item} in ${iterable}) {`);
    this.indent++;

    const body = node.body?.children || node.body || [];
    for (const child of body) {
      this.formatViewNode(child);
    }

    this.indent--;
    this.emit('}');
  }

  /**
   * Format slot element
   */
  formatSlot(node) {
    const name = node.name;
    const hasFallback = node.fallback && node.fallback.length > 0;

    if (name === 'default' && !hasFallback) {
      this.emit('slot');
    } else if (!hasFallback) {
      this.emit(`slot "${name}"`);
    } else {
      this.emit(`slot "${name}" {`);
      this.indent++;

      for (const child of node.fallback) {
        this.formatViewNode(child);
      }

      this.indent--;
      this.emit('}');
    }
  }

  /**
   * Format actions block
   */
  formatActionsBlock() {
    this.emit('actions {');
    this.indent++;

    const functions = this.ast.actions.functions || [];
    for (let i = 0; i < functions.length; i++) {
      const fn = functions[i];
      this.formatFunction(fn);

      // Add blank line between functions
      if (i < functions.length - 1) {
        this.emit('');
      }
    }

    this.indent--;
    this.emit('}');
    this.emit('');
  }

  /**
   * Format a function declaration
   */
  formatFunction(fn) {
    const async = fn.async ? 'async ' : '';
    const params = (fn.params || []).join(', ');
    const body = fn.body || fn.rawBody || '';

    // Simple one-liner
    if (!body.includes('\n') && body.length < 50) {
      this.emit(`${async}${fn.name}(${params}) { ${body.trim()} }`);
    } else {
      this.emit(`${async}${fn.name}(${params}) {`);
      this.indent++;

      // Format body with proper indentation
      const lines = body.split('\n').filter(l => l.trim());
      for (const line of lines) {
        this.emit(line.trim());
      }

      this.indent--;
      this.emit('}');
    }
  }

  /**
   * Format style block
   */
  formatStyleBlock() {
    this.emit('style {');
    this.indent++;

    const rules = this.ast.style.rules || [];
    for (let i = 0; i < rules.length; i++) {
      this.formatStyleRule(rules[i]);

      // Add blank line between top-level rules
      if (i < rules.length - 1) {
        this.emit('');
      }
    }

    this.indent--;
    this.emit('}');
  }

  /**
   * Format a CSS rule
   */
  formatStyleRule(rule) {
    const selector = rule.selector || '';
    const properties = rule.properties || [];
    const nestedRules = rule.rules || [];

    if (properties.length === 0 && nestedRules.length === 0) {
      this.emit(`${selector} {}`);
      return;
    }

    this.emit(`${selector} {`);
    this.indent++;

    // Properties
    for (const prop of properties) {
      this.emit(`${prop.name}: ${prop.value}`);
    }

    // Nested rules
    for (const nested of nestedRules) {
      if (properties.length > 0) {
        this.emit('');
      }
      this.formatStyleRule(nested);
    }

    this.indent--;
    this.emit('}');
  }

  /**
   * Emit a line with current indentation
   */
  emit(text) {
    if (text === '') {
      this.output.push('');
    } else {
      this.output.push(this.getIndent() + text);
    }
  }

  /**
   * Get indentation string
   */
  getIndent(extra = 0) {
    return ' '.repeat((this.indent + extra) * this.options.indentSize);
  }

  /**
   * Escape string for output
   */
  escapeString(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

/**
 * Format a single file
 */
export async function formatFile(filePath, options = {}) {
  const { parse } = await import('../compiler/index.js');

  const source = readFileSync(filePath, 'utf-8');

  // Parse the file
  let ast;
  try {
    ast = parse(source);
  } catch (e) {
    return {
      file: filePath,
      error: e.message,
      formatted: null
    };
  }

  // Format
  const formatter = new PulseFormatter(ast, options);
  const formatted = formatter.format();

  return {
    file: filePath,
    original: source,
    formatted,
    changed: source !== formatted
  };
}

/**
 * Main format command handler
 */
export async function runFormat(args) {
  const { options, patterns } = parseArgs(args);
  const check = options.check || false;
  const write = !check; // Default to write unless --check is specified
  const watchMode = options.watch || options.w || false;

  // Find files to format
  const files = findPulseFiles(patterns);

  if (files.length === 0) {
    log.info('No .pulse files found to format.');
    return;
  }

  // Run initial format
  const result = await runFormatOnFiles(files, { check, write, options });

  // If watch mode, set up file watchers
  if (watchMode) {
    if (check) {
      log.warn('--watch mode is not available with --check');
      return;
    }

    log.info('\nWatching for changes... (Ctrl+C to stop)\n');

    // Get unique directories to watch
    const watchedDirs = new Set(files.map(f => dirname(f)));

    // Debounce timer
    let debounceTimer = null;
    const debounceDelay = 100;

    for (const dir of watchedDirs) {
      watch(dir, { recursive: false }, (_eventType, filename) => {
        if (!filename || !filename.endsWith('.pulse')) return;

        // Debounce rapid changes
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const changedFiles = findPulseFiles(patterns);
          runFormatOnFiles(changedFiles, { check: false, write: true, options, isRerun: true })
            .then(() => {
              log.info('Watching for changes...\n');
            });
        }, debounceDelay);
      });
    }

    // Keep process alive
    process.stdin.resume();
  } else if (check && result.changedCount > 0) {
    process.exit(1);
  }
}

/**
 * Run format on a list of files
 */
async function runFormatOnFiles(files, { check, write, options, isRerun = false }) {
  const timer = createTimer();

  if (!isRerun) {
    log.info(`${check ? 'Checking' : 'Formatting'} ${files.length} file(s)...\n`);
  }

  let changedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const result = await formatFile(file, options);
    const relPath = relativePath(file);

    if (result.error) {
      log.error(`  ${relPath} - ERROR: ${result.error}`);
      errorCount++;
      continue;
    }

    if (result.changed) {
      changedCount++;

      if (check) {
        log.warn(`  ${relPath} - needs formatting`);
      } else if (write) {
        writeFileSync(file, result.formatted);
        log.info(`  ${relPath} - formatted`);
      }
    } else {
      if (!check && !isRerun) {
        log.info(`  ${relPath} - unchanged`);
      }
    }
  }

  const elapsed = timer.elapsed();

  // Summary
  log.info('\n' + '─'.repeat(60));

  if (errorCount > 0) {
    log.error(`✗ ${errorCount} file(s) had errors`);
  }

  if (check) {
    if (changedCount > 0) {
      log.error(`✗ ${changedCount} file(s) need formatting (${formatDuration(elapsed)})`);
    } else {
      log.success(`✓ All ${files.length} file(s) are properly formatted (${formatDuration(elapsed)})`);
    }
  } else {
    if (changedCount > 0) {
      log.success(`✓ ${changedCount} file(s) formatted (${formatDuration(elapsed)})`);
    } else {
      log.success(`✓ All ${files.length} file(s) were already formatted (${formatDuration(elapsed)})`);
    }
  }

  return { changedCount, errorCount };
}
