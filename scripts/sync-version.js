#!/usr/bin/env node
/**
 * Sync version across all files after npm version bump
 * Called automatically by npm version hook
 *
 * This script updates version references in:
 * - docs/src/state.js (version constant for docs site)
 *
 * Note: For full release workflow with changelog updates,
 * use `pulse release` instead of `npm version`.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
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

const updatedFiles = [];

for (const file of files) {
  const filePath = join(root, file.path);

  if (!existsSync(filePath)) {
    console.log(`  Skipping ${file.path} (not found)`);
    continue;
  }

  let content = readFileSync(filePath, 'utf-8');
  const newContent = content.replace(file.pattern, file.replacement);

  if (content !== newContent) {
    writeFileSync(filePath, newContent);
    console.log(`  Updated ${file.path}`);
    updatedFiles.push(file.path);
  } else {
    console.log(`  ${file.path} already up to date`);
  }
}

// Stage the updated files
if (updatedFiles.length > 0) {
  execSync(`git add ${updatedFiles.join(' ')}`, { cwd: root });
  console.log('Version sync complete!');
} else {
  console.log('No files needed updating.');
}
