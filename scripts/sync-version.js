#!/usr/bin/env node
/**
 * Sync version across all files after npm version bump
 * Called automatically by npm version hook
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Read version from package.json
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const version = pkg.version;

console.log(`Syncing version ${version} across files...`);

// Files to update with version patterns
const files = [
  {
    path: 'docs/src/state.js',
    pattern: /export const version = '[^']+'/,
    replacement: `export const version = '${version}'`
  }
];

for (const file of files) {
  const filePath = join(root, file.path);
  let content = readFileSync(filePath, 'utf-8');
  content = content.replace(file.pattern, file.replacement);
  writeFileSync(filePath, content);
  console.log(`  Updated ${file.path}`);
}

// Stage the updated files
execSync('git add docs/src/state.js', { cwd: root });
console.log('Version sync complete!');
