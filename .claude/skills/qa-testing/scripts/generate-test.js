#!/usr/bin/env node
/**
 * Test File Generator
 *
 * Generates test boilerplate from a source file or module name.
 *
 * Usage:
 *   node generate-test.js <source-file-or-module> [--type unit|integration|async|dom|compiler]
 *
 * Examples:
 *   node generate-test.js runtime/pulse.js
 *   node generate-test.js runtime/form.js --type unit
 *   node generate-test.js compiler/lexer.js --type compiler
 *   node generate-test.js MyFeature --type integration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');

// Parse arguments
const args = process.argv.slice(2);
const source = args[0];

if (!source) {
  console.error('Usage: generate-test.js <source-file-or-module> [--type unit|integration|async|dom|compiler]');
  console.error('');
  console.error('Examples:');
  console.error('  node generate-test.js runtime/http.js');
  console.error('  node generate-test.js MyModule --type integration');
  process.exit(1);
}

// Parse options
let type = 'unit';
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) {
    type = args[++i];
  }
}

const validTypes = ['unit', 'integration', 'async', 'dom', 'compiler'];
if (!validTypes.includes(type)) {
  console.error(`Invalid type: ${type}. Valid: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Derive names
let moduleName;
let kebabName;

if (source.includes('/') || source.includes('.')) {
  // Source file path: runtime/http.js -> http
  const basename = path.basename(source, path.extname(source));
  moduleName = basename.charAt(0).toUpperCase() + basename.slice(1);
  kebabName = basename;
} else {
  // Module name: MyFeature -> my-feature
  moduleName = source.charAt(0).toUpperCase() + source.slice(1);
  kebabName = source.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

const camelName = moduleName.charAt(0).toLowerCase() + moduleName.slice(1);

// Template map
const templateMap = {
  unit: 'unit-test.template',
  integration: 'integration-test.template',
  async: 'async-test.template',
  dom: 'mock-dom-test.template',
  compiler: 'compiler-test.template'
};

const templateFile = path.join(__dirname, '..', 'assets', templateMap[type]);

if (!fs.existsSync(templateFile)) {
  console.error(`Template not found: ${templateFile}`);
  process.exit(1);
}

// Read and fill template
let template = fs.readFileSync(templateFile, 'utf-8');
template = template
  .replace(/\{\{NAME\}\}/g, moduleName)
  .replace(/\{\{name\}\}/g, camelName)
  .replace(/\{\{kebab-name\}\}/g, kebabName);

// Determine output path
const suffix = type === 'unit' ? '' : `-${type}`;
const outputFileName = `${kebabName}${suffix}.test.js`;
const outputPath = path.join(projectRoot, 'test', outputFileName);

// Check existing
if (fs.existsSync(outputPath)) {
  console.error(`File already exists: ${outputPath}`);
  console.error('Delete it first or choose a different name.');
  process.exit(1);
}

// Write
fs.writeFileSync(outputPath, template);
console.log(`\u2713 Created ${type} test: ${outputPath}`);
console.log('');
console.log('Next steps:');
console.log(`  1. Edit the test file to import your module`);
console.log(`  2. Run: node --test test/${outputFileName}`);
console.log(`  3. Add to package.json: "test:${kebabName}": "node --test test/${outputFileName}"`);
