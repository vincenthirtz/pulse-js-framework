/**
 * Parser extraction script - splits parser.js into sub-modules
 * Run: node compiler/parser/_extract.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(__dirname, '..', 'parser.js.original'), 'utf-8');
const lines = source.split('\n');

// Helper: extract lines (1-indexed, inclusive)
function extract(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

// Helper: extract a method body and convert to prototype assignment
function extractMethod(methodName, start, end) {
  const methodLines = lines.slice(start - 1, end);
  const body = [];

  // Find the method signature line
  let sigIdx = 0;
  for (let i = 0; i < methodLines.length; i++) {
    if (methodLines[i].match(new RegExp(`^\\s+${methodName}\\s*\\(`)) ||
        methodLines[i].match(new RegExp(`^\\s+async\\s+${methodName}\\s*\\(`))) {
      sigIdx = i;
      break;
    }
  }

  // Find where JSDoc starts (look backwards from signature)
  let docStart = sigIdx;
  for (let i = sigIdx - 1; i >= 0; i--) {
    if (methodLines[i].trim().startsWith('/**') || methodLines[i].trim().startsWith('*')) {
      docStart = i;
    } else if (methodLines[i].trim() === '') {
      // Skip blank lines before JSDoc
      if (docStart < sigIdx) break;
    } else {
      break;
    }
  }

  // Extract JSDoc (if any) - keep indentation as-is
  const jsdocLines = methodLines.slice(docStart, sigIdx);

  // Extract method signature
  const sigLine = methodLines[sigIdx];
  const isAsync = sigLine.includes('async');
  const paramsMatch = sigLine.match(/\(([^)]*)\)/);
  const params = paramsMatch ? paramsMatch[1] : '';

  // Extract body (everything after the signature line until the closing brace)
  const bodyLines = methodLines.slice(sigIdx + 1, methodLines.length);

  // Build prototype assignment
  const jsdoc = jsdocLines.length > 0 ? jsdocLines.join('\n') + '\n' : '';
  const asyncPrefix = isAsync ? 'async ' : '';

  return `${jsdoc}  ${asyncPrefix}${methodName}(${params}) {\n${bodyLines.join('\n')}`;
}

// Define module structure with method line ranges
const modules = {
  // core.js: lines 1-290 (NodeType, ASTNode, Parser class with core methods + parse())
  'core.js': {
    header: `/**
 * Pulse Parser - Core
 *
 * Parser class, AST node types, and infrastructure methods
 *
 * @module pulse-js-framework/compiler/parser/core
 */

import { TokenType } from '../lexer.js';
import { ParserError, SUGGESTIONS, getDocsUrl } from '../../runtime/errors.js';
`,
    content: extract(10, 290),
    // We'll close the class later after all methods are extracted
  },

  // imports.js: lines 300-380
  'imports.js': {
    header: `/**
 * Pulse Parser - Import Parsing
 *
 * Import, page, and route declaration parsing
 *
 * @module pulse-js-framework/compiler/parser/imports
 */

import { TokenType } from '../lexer.js';
import { Parser, NodeType, ASTNode } from './core.js';
`,
    methods: [
      { name: 'parseImportDeclaration', start: 292, end: 362 },
      { name: 'parsePageDeclaration', start: 364, end: 371 },
      { name: 'parseRouteDeclaration', start: 373, end: 380 },
    ]
  },

  // state.js: lines 389-513
  'state.js': {
    header: `/**
 * Pulse Parser - State & Props
 *
 * Props block, state block, and value/literal parsing
 *
 * @module pulse-js-framework/compiler/parser/state
 */

import { TokenType } from '../lexer.js';
import { Parser, NodeType, ASTNode } from './core.js';
`,
    methods: [
      { name: 'parsePropsBlock', start: 382, end: 400 },
      { name: 'parsePropsProperty', start: 402, end: 410 },
      { name: 'parseStateBlock', start: 412, end: 426 },
      { name: 'parseStateProperty', start: 428, end: 436 },
      { name: 'tryParseLiteral', start: 438, end: 455 },
      { name: 'parseValue', start: 457, end: 472 },
      { name: 'parseObjectLiteral', start: 474, end: 494 },
      { name: 'parseArrayLiteral', start: 496, end: 513 },
    ]
  },

  // view.js: lines 518-735 + directives 740-1133
  'view.js': {
    header: `/**
 * Pulse Parser - View & Directives
 *
 * View block, elements, text nodes, and all directive parsing
 *
 * @module pulse-js-framework/compiler/parser/view
 */

import { TokenType } from '../lexer.js';
import { Parser, NodeType, ASTNode } from './core.js';
`,
    methods: [
      { name: 'parseViewBlock', start: 515, end: 529 },
      { name: 'parseViewChild', start: 531, end: 554 },
      { name: 'parseSlotElement', start: 556, end: 588 },
      { name: 'parseElement', start: 590, end: 652 },
      { name: 'parseComponentProp', start: 654, end: 678 },
      { name: 'couldBeElement', start: 680, end: 688 },
      { name: 'parseTextNode', start: 690, end: 697 },
      { name: 'parseInterpolatedString', start: 699, end: 735 },
      // Directives (tightly coupled with view)
      { name: 'parseDirective', start: 737, end: 821 },
      { name: 'parseInlineDirective', start: 823, end: 869 },
      { name: 'parseIfDirective', start: 871, end: 952 },
      { name: 'parseEachDirective', start: 954, end: 989 },
      { name: 'parseEventDirective', start: 991, end: 1011 },
      { name: 'parseModelDirective', start: 1013, end: 1024 },
      { name: 'parseA11yDirective', start: 1026, end: 1066 },
      { name: 'parseLiveDirective', start: 1068, end: 1083 },
      { name: 'parseFocusTrapDirective', start: 1085, end: 1124 },
      { name: 'parseSrOnlyDirective', start: 1126, end: 1133 },
    ]
  },

  // expressions.js: lines 1138-1500
  'expressions.js': {
    header: `/**
 * Pulse Parser - Expression Parsing
 *
 * Expression parsing with precedence climbing algorithm
 *
 * @module pulse-js-framework/compiler/parser/expressions
 */

import { TokenType } from '../lexer.js';
import { Parser, NodeType, ASTNode } from './core.js';
`,
    methods: [
      { name: 'parseExpression', start: 1135, end: 1140 },
      { name: 'parseAssignmentExpression', start: 1142, end: 1171 },
      { name: 'parseConditionalExpression', start: 1173, end: 1188 },
      // BINARY_OPS static property needs special handling
      { name: 'parseBinaryExpr', start: 1202, end: 1220 },
      { name: 'parseOrExpression', start: 1222, end: 1223 },
      { name: 'parseUnaryExpression', start: 1225, end: 1241 },
      { name: 'parsePostfixExpression', start: 1243, end: 1259 },
      { name: 'parsePrimaryExpression', start: 1261, end: 1326 },
      { name: 'tryParseArrowFunction', start: 1328, end: 1351 },
      { name: 'parseArrowFunction', start: 1353, end: 1394 },
      { name: 'parseArrayLiteralExpr', start: 1396, end: 1419 },
      { name: 'parseObjectLiteralExpr', start: 1421, end: 1456 },
      { name: 'parseIdentifierOrExpression', start: 1458, end: 1500 },
    ],
    extraContent: extract(1190, 1200) // BINARY_OPS static property
  },

  // style.js: lines 1584-2359
  'style.js': {
    header: `/**
 * Pulse Parser - Style Block
 *
 * CSS parsing with preprocessor support
 *
 * @module pulse-js-framework/compiler/parser/style
 */

import { TokenType } from '../lexer.js';
import { Parser, NodeType, ASTNode } from './core.js';
`,
    methods: [
      { name: 'parseStyleBlock', start: 1581, end: 1637 },
      { name: 'reconstructCSS', start: 1639, end: 1663 },
      { name: 'parseStyleRule', start: 1665, end: 1770 },
      { name: 'isNestedRule', start: 1772, end: 1822 },
      { name: 'parseStyleProperty', start: 1824, end: 2047 },
      { name: 'isPropertyStart', start: 2341, end: 2359 },
    ]
  },

  // blocks.js: lines 1505-1579 + 2063-2336
  'blocks.js': {
    header: `/**
 * Pulse Parser - Block Parsing
 *
 * Actions, router, store blocks, and function/guard parsing
 *
 * @module pulse-js-framework/compiler/parser/blocks
 */

import { TokenType } from '../lexer.js';
import { Parser, NodeType, ASTNode } from './core.js';
`,
    methods: [
      { name: 'parseActionsBlock', start: 1502, end: 1516 },
      { name: 'parseFunctionDeclaration', start: 1518, end: 1555 },
      { name: 'parseFunctionBody', start: 1557, end: 1579 },
      { name: 'parseRouterBlock', start: 2049, end: 2110 },
      { name: 'parseRoutesBlock', start: 2112, end: 2133 },
      { name: 'parseGuardHook', start: 2135, end: 2159 },
      { name: 'parseStoreBlock', start: 2161, end: 2237 },
      { name: 'parseGettersBlock', start: 2239, end: 2256 },
      { name: 'parseGetterDeclaration', start: 2258, end: 2270 },
      { name: 'parseLinkDirective', start: 2272, end: 2304 },
      { name: 'parseOutletDirective', start: 2306, end: 2319 },
      { name: 'parseNavigateDirective', start: 2321, end: 2336 },
    ]
  }
};

// Process core.js specially (it keeps the class definition open for prototype extensions)
const coreContent = modules['core.js'].content;
// The core.js content includes lines 10-290, which ends with parse() method
// We need to close the class properly
const coreFile = modules['core.js'].header + '\n' + coreContent + '\n}\n';
fs.writeFileSync(path.join(__dirname, 'core.js'), coreFile);
console.log('✓ core.js written');

// Process each sub-module
for (const [filename, config] of Object.entries(modules)) {
  if (filename === 'core.js') continue;

  let content = config.header + '\n';

  // Add extra content (like BINARY_OPS)
  if (config.extraContent) {
    content += '// Static properties\n';
    content += config.extraContent + '\n\n';
  }

  // Extract each method and convert to prototype assignment
  for (const method of config.methods) {
    const methodLines = lines.slice(method.start - 1, method.end);

    // Find the actual method signature
    let sigIdx = -1;
    for (let i = 0; i < methodLines.length; i++) {
      const line = methodLines[i].trimStart();
      if (line.startsWith(`${method.name}(`) || line.startsWith(`async ${method.name}(`)) {
        sigIdx = i;
        break;
      }
    }

    if (sigIdx === -1) {
      console.error(`  ✗ Could not find method signature for ${method.name} in lines ${method.start}-${method.end}`);
      // Try broader search
      for (let i = 0; i < methodLines.length; i++) {
        if (methodLines[i].includes(method.name)) {
          console.error(`    Found "${methodLines[i].trim()}" at offset ${i} (line ${method.start + i})`);
        }
      }
      continue;
    }

    // Get JSDoc (lines before signature)
    let docStart = sigIdx;
    for (let i = sigIdx - 1; i >= 0; i--) {
      const trimmed = methodLines[i].trim();
      if (trimmed.startsWith('/**') || trimmed.startsWith('*') || trimmed.startsWith('*/')) {
        docStart = i;
      } else if (trimmed === '') {
        continue; // skip blank lines between JSDoc blocks
      } else {
        break;
      }
    }

    // Build JSDoc as standalone comment
    const jsdocLines = methodLines.slice(docStart, sigIdx);
    const jsdoc = jsdocLines.map(l => l.replace(/^  /, '')).join('\n');

    // Parse method signature
    const sigLine = methodLines[sigIdx];
    const isAsync = sigLine.trimStart().startsWith('async');

    // Extract parameter string
    const paramMatch = sigLine.match(/\(([^)]*)\)/);
    const params = paramMatch ? paramMatch[1] : '';

    // Extract body (everything from line after signature to end, minus last closing brace)
    const bodyLines = methodLines.slice(sigIdx + 1);

    // Remove the last closing brace (which was the method's closing brace)
    let bodyStr = bodyLines.join('\n');
    // Find last } and remove it
    const lastBraceIdx = bodyStr.lastIndexOf('}');
    if (lastBraceIdx >= 0) {
      bodyStr = bodyStr.substring(0, lastBraceIdx) + bodyStr.substring(lastBraceIdx + 1);
    }

    // Build prototype assignment
    if (jsdoc.trim()) {
      content += `${jsdoc}\n`;
    }
    content += `Parser.prototype.${method.name} = ${isAsync ? 'async ' : ''}function(${params}) {\n`;
    content += bodyStr;
    content += '};\n\n';
  }

  fs.writeFileSync(path.join(__dirname, filename), content);
  console.log(`✓ ${filename} written (${config.methods.length} methods)`);
}

// Create index.js barrel export
const indexContent = `/**
 * Pulse Parser - Main Entry Point
 *
 * Barrel export for all parser modules.
 * Sub-modules extend Parser.prototype with their methods.
 *
 * @module pulse-js-framework/compiler/parser
 */

import { tokenize } from '../lexer.js';

// Core must be imported first (defines the Parser class)
export { NodeType, ASTNode, Parser } from './core.js';
import { Parser } from './core.js';

// Each sub-module extends Parser.prototype with its methods
import './imports.js';
import './state.js';
import './view.js';
import './expressions.js';
import './style.js';
import './blocks.js';

// Re-export NodeType for convenience
export { NodeType } from './core.js';

/**
 * Parse a .pulse source string into an AST
 * @param {string} source - Source code
 * @returns {ASTNode} Program AST node
 */
export function parse(source) {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}

export default {
  NodeType: (await import('./core.js')).NodeType,
  ASTNode: (await import('./core.js')).ASTNode,
  Parser,
  parse
};
`;

fs.writeFileSync(path.join(__dirname, 'index.js'), indexContent);
console.log('✓ index.js written');

console.log('\nExtraction complete!');
