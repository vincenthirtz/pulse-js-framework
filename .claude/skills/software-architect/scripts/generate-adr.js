#!/usr/bin/env node
/**
 * Architecture Decision Record (ADR) Generator
 *
 * Generates a new ADR file from the template with a sequential number.
 * ADRs are stored in docs/adr/ directory.
 *
 * Usage:
 *   node generate-adr.js "Use LRU cache for selector parsing"
 *   node generate-adr.js "Adopt Stylus support" --status accepted
 *   node generate-adr.js "Replace router middleware" --status deprecated
 *
 * Status values: proposed (default), accepted, deprecated, superseded
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
const adrDir = path.join(projectRoot, 'docs', 'adr');
const templatePath = path.join(__dirname, '..', 'assets', 'adr.template');

// Parse args
const args = process.argv.slice(2);
let title = null;
let status = 'proposed';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--status' && args[i + 1]) {
    status = args[++i];
  } else if (!args[i].startsWith('--')) {
    title = args[i];
  }
}

if (!title) {
  console.error('Usage: node generate-adr.js "ADR Title" [--status proposed|accepted|deprecated|superseded]');
  process.exit(1);
}

const validStatuses = ['proposed', 'accepted', 'deprecated', 'superseded'];
if (!validStatuses.includes(status)) {
  console.error(`Invalid status: ${status}. Valid: ${validStatuses.join(', ')}`);
  process.exit(1);
}

// Ensure ADR directory exists
if (!fs.existsSync(adrDir)) {
  fs.mkdirSync(adrDir, { recursive: true });
}

// Find next ADR number
const existing = fs.readdirSync(adrDir)
  .filter(f => /^\d{4}-/.test(f))
  .sort();

const lastNumber = existing.length > 0
  ? parseInt(existing[existing.length - 1].split('-')[0], 10)
  : 0;

const nextNumber = String(lastNumber + 1).padStart(4, '0');

// Generate slug from title
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const filename = `${nextNumber}-${slug}.md`;
const filePath = path.join(adrDir, filename);

// Read template
let template;
if (fs.existsSync(templatePath)) {
  template = fs.readFileSync(templatePath, 'utf-8');
} else {
  // Fallback template
  template = `# ADR-{{NUMBER}}: {{TITLE}}

## Status

{{STATUS}}

## Date

{{DATE}}

## Context

What is the issue that we're seeing that is motivating this decision or change?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

### Positive

-

### Negative

-

### Neutral

-

## Alternatives Considered

### Alternative 1

Description and why it was rejected.

### Alternative 2

Description and why it was rejected.

## Related

- Related ADRs, issues, or documentation
`;
}

// Fill template
const date = new Date().toISOString().split('T')[0];
const content = template
  .replace(/\{\{NUMBER\}\}/g, nextNumber)
  .replace(/\{\{TITLE\}\}/g, title)
  .replace(/\{\{STATUS\}\}/g, status.charAt(0).toUpperCase() + status.slice(1))
  .replace(/\{\{DATE\}\}/g, date)
  .replace(/\{\{SLUG\}\}/g, slug);

// Write file
fs.writeFileSync(filePath, content, 'utf-8');

console.log('=== ADR Generated ===\n');
console.log(`\u2713 Created: docs/adr/${filename}`);
console.log(`  Title:  ${title}`);
console.log(`  Status: ${status}`);
console.log(`  Date:   ${date}`);
console.log('');
console.log('Next steps:');
console.log(`  1. Edit docs/adr/${filename} to fill in Context, Decision, and Consequences`);
console.log('  2. Discuss with the team');
console.log(`  3. Update status to 'accepted' or 'deprecated'`);

// List existing ADRs
if (existing.length > 0) {
  console.log(`\n--- Existing ADRs (${existing.length}) ---\n`);
  for (const adr of existing) {
    const adrContent = fs.readFileSync(path.join(adrDir, adr), 'utf-8');
    const statusMatch = adrContent.match(/## Status\s+(\w+)/i);
    const adrStatus = statusMatch ? statusMatch[1] : 'unknown';
    const icon = adrStatus.toLowerCase() === 'accepted' ? '\u2713'
      : adrStatus.toLowerCase() === 'deprecated' ? '\u2718'
      : '\u25CB';
    console.log(`  ${icon} ${adr} (${adrStatus})`);
  }
}
