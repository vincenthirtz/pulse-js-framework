/**
 * Transformer Imports Module
 * Handles import generation for compiled Pulse components
 * @module pulse-js-framework/compiler/transformer/imports
 */

/**
 * Extract imported component names from AST imports
 * @param {Object} transformer - Transformer instance
 * @param {Array} imports - Array of import statements from AST
 */
export function extractImportedComponents(transformer, imports) {
  for (const imp of imports) {
    for (const spec of imp.specifiers) {
      transformer.importedComponents.set(spec.local, {
        source: imp.source,
        type: spec.type,
        imported: spec.imported
      });
    }
  }
}

/**
 * Generate import statements (runtime + user imports)
 * @param {Object} transformer - Transformer instance
 * @returns {string} Generated import statements
 */
export function generateImports(transformer) {
  const lines = [];
  const { ast, options } = transformer;

  // Runtime imports
  const runtimeImports = [
    'pulse',
    'computed',
    'effect',
    'batch',
    'el',
    'text',
    'on',
    'list',
    'when',
    'mount',
    'model'
  ];

  lines.push(`import { ${runtimeImports.join(', ')} } from '${options.runtime}';`);

  // A11y imports (if a11y features are used)
  const a11yImports = [];
  if (transformer.usesA11y.srOnly) {
    a11yImports.push('srOnly');
  }
  if (transformer.usesA11y.trapFocus) {
    a11yImports.push('trapFocus');
  }
  if (transformer.usesA11y.announce) {
    a11yImports.push('announce');
  }
  if (a11yImports.length > 0) {
    lines.push(`import { ${a11yImports.join(', ')} } from '${options.runtime}/a11y';`);
  }

  // Router imports (if router block exists)
  if (ast.router) {
    lines.push(`import { createRouter } from '${options.runtime}/router';`);
  }

  // Store imports (if store block exists)
  if (ast.store) {
    const storeImports = ['createStore', 'createActions', 'createGetters'];
    lines.push(`import { ${storeImports.join(', ')} } from '${options.runtime}/store';`);
  }

  // User imports from .pulse files
  if (ast.imports && ast.imports.length > 0) {
    lines.push('');
    lines.push('// Component imports');

    for (const imp of ast.imports) {
      // Handle default + named imports
      const defaultSpec = imp.specifiers.find(s => s.type === 'default');
      const namedSpecs = imp.specifiers.filter(s => s.type === 'named');
      const namespaceSpec = imp.specifiers.find(s => s.type === 'namespace');

      let importStr = 'import ';
      if (defaultSpec) {
        importStr += defaultSpec.local;
        if (namedSpecs.length > 0) {
          importStr += ', ';
        }
      }
      if (namespaceSpec) {
        importStr += `* as ${namespaceSpec.local}`;
      }
      if (namedSpecs.length > 0) {
        const named = namedSpecs.map(s =>
          s.local !== s.imported ? `${s.imported} as ${s.local}` : s.local
        );
        importStr += `{ ${named.join(', ')} }`;
      }

      // Convert .pulse extension to .js
      let source = imp.source;
      if (source.endsWith('.pulse')) {
        source = source.replace('.pulse', '.js');
      }

      importStr += ` from '${source}';`;
      lines.push(importStr);
    }
  }

  return lines.join('\n');
}
