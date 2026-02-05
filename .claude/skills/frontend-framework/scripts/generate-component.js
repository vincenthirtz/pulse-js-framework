#!/usr/bin/env node
/**
 * Component Generator Script
 *
 * Usage:
 *   node generate-component.js ComponentName [--type component|page|form|modal|list] [--dir path]
 *
 * Examples:
 *   node generate-component.js UserProfile
 *   node generate-component.js LoginForm --type form
 *   node generate-component.js Dashboard --type page --dir src/pages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Parse arguments
const args = process.argv.slice(2);
const componentName = args[0];

if (!componentName) {
  console.error('Usage: generate-component.js <ComponentName> [--type type] [--dir path]');
  console.error('Types: component, page, form, modal, list, store');
  process.exit(1);
}

// Parse options
let type = 'component';
let outputDir = 'src/components';

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--type' && args[i + 1]) {
    type = args[++i];
  } else if (args[i] === '--dir' && args[i + 1]) {
    outputDir = args[++i];
  }
}

// Validate type
const validTypes = ['component', 'page', 'form', 'modal', 'list', 'store'];
if (!validTypes.includes(type)) {
  console.error(`Invalid type: ${type}. Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Determine template file
const templateMap = {
  component: 'component.pulse.template',
  page: 'page.pulse.template',
  form: 'form.pulse.template',
  modal: 'modal.pulse.template',
  list: 'list.pulse.template',
  store: 'store.js.template'
};

const templateFile = path.join(__dirname, '..', 'assets', templateMap[type]);

// Check template exists
if (!fs.existsSync(templateFile)) {
  console.error(`Template not found: ${templateFile}`);
  process.exit(1);
}

// Read template
let template = fs.readFileSync(templateFile, 'utf-8');

// Replace placeholders
const pascalName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
const camelName = componentName.charAt(0).toLowerCase() + componentName.slice(1);
const kebabName = componentName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

template = template
  .replace(/\{\{NAME\}\}/g, pascalName)
  .replace(/\{\{name\}\}/g, camelName)
  .replace(/\{\{kebab-name\}\}/g, kebabName);

// Determine output file
const extension = type === 'store' ? '.js' : '.pulse';
const outputFileName = type === 'store' ? `${camelName}Store${extension}` : `${pascalName}${extension}`;
const outputPath = path.join(process.cwd(), outputDir, outputFileName);

// Ensure output directory exists
const outputDirPath = path.dirname(outputPath);
if (!fs.existsSync(outputDirPath)) {
  fs.mkdirSync(outputDirPath, { recursive: true });
}

// Check if file already exists
if (fs.existsSync(outputPath)) {
  console.error(`File already exists: ${outputPath}`);
  process.exit(1);
}

// Write file
fs.writeFileSync(outputPath, template);

console.log(`✓ Created ${type}: ${outputPath}`);

// Print next steps
console.log('\nNext steps:');
if (type === 'store') {
  console.log(`  1. Import the store: import { ${camelName}Store, ${camelName}Actions } from './${camelName}Store';`);
  console.log('  2. Use in components: const items = ' + camelName + 'Store.items.get();');
} else {
  console.log(`  1. Import the component: import ${pascalName} from './${pascalName}.pulse';`);
  console.log(`  2. Use in view: ${pascalName} { ... }`);
}
