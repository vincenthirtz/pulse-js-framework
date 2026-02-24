#!/usr/bin/env node

/**
 * Validation script for lead-developer skill
 * Checks that all required files exist and are valid
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ANSI colors
const green = (msg) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg) => `\x1b[31m${msg}\x1b[0m`;
const yellow = (msg) => `\x1b[33m${msg}\x1b[0m`;
const blue = (msg) => `\x1b[34m${msg}\x1b[0m`;

console.log(blue('\n=== Lead Developer Skill Validation ===\n'));

let passed = 0;
let failed = 0;

function check(description, testFn) {
  try {
    testFn();
    console.log(green('✓'), description);
    passed++;
  } catch (err) {
    console.log(red('✗'), description);
    console.log(red('  Error:'), err.message);
    failed++;
  }
}

// Check 1: SKILL.md exists
check('SKILL.md exists', () => {
  const path = join(__dirname, 'SKILL.md');
  if (!existsSync(path)) throw new Error('SKILL.md not found');
});

// Check 2: SKILL.md has frontmatter
check('SKILL.md has valid frontmatter', () => {
  const path = join(__dirname, 'SKILL.md');
  const content = readFileSync(path, 'utf-8');
  if (!content.startsWith('---')) throw new Error('Missing frontmatter');
  if (!content.includes('name: lead-developer')) throw new Error('Missing name field');
  if (!content.includes('description:')) throw new Error('Missing description field');
});

// Check 3: SKILL.md has key sections
check('SKILL.md has required sections', () => {
  const path = join(__dirname, 'SKILL.md');
  const content = readFileSync(path, 'utf-8');
  const required = ['Plan → Execute', 'Multi-Model', 'Context Loading', 'Quality Gates'];
  for (const section of required) {
    if (!content.includes(section)) throw new Error(`Missing section: ${section}`);
  }
});

// Check 4: examples.md exists
check('examples.md exists', () => {
  const path = join(__dirname, 'examples.md');
  if (!existsSync(path)) throw new Error('examples.md not found');
});

// Check 5: examples.md has examples
check('examples.md has practical examples', () => {
  const path = join(__dirname, 'examples.md');
  const content = readFileSync(path, 'utf-8');
  if (!content.includes('Example 1:') && !content.includes('## Example 1')) {
    throw new Error('examples.md should have numbered examples');
  }
});

// Check 6: Context files exist
check('Context files directory exists', () => {
  const contextDir = join(__dirname, '..', '..', 'context');
  if (!existsSync(contextDir)) throw new Error('.claude/context/ directory not found');
});

// Check 7: Key context files present
check('Key context files present', () => {
  const contextDir = join(__dirname, '..', '..', 'context');
  const required = ['api-core.md', 'api-router-store.md', 'export-map.md', 'error-reference.md'];
  for (const file of required) {
    if (!existsSync(join(contextDir, file))) throw new Error(`Missing context file: ${file}`);
  }
});

// Check 8: Cache files exist
check('Cache system present', () => {
  const projectRoot = join(__dirname, '..', '..', '..', '..');
  const cacheDir = join(projectRoot, 'memory', 'cache');
  if (!existsSync(cacheDir)) {
    console.log(yellow('  Note: memory/cache/ not found - run .claude/scripts/refresh-cache.sh'));
    return;
  }
});

// Check 9: Delegate skills exist
check('Delegate skills available', () => {
  const skillsDir = dirname(__dirname);
  const delegates = ['software-architect', 'senior-developer', 'qa-testing', 'security-reviewer', 'docs-manager'];

  let found = 0;
  for (const skill of delegates) {
    const skillDir = join(skillsDir, skill);
    if (existsSync(skillDir) && existsSync(join(skillDir, 'SKILL.md'))) {
      found++;
    }
  }

  if (found === delegates.length) {
    console.log(green(`  Found all ${found} delegate skills`));
  } else if (found > 0) {
    console.log(yellow(`  Found ${found}/${delegates.length} delegate skills (others: autonomous mode)`));
  } else {
    console.log(yellow('  No delegate skills found (will work in autonomous mode)'));
  }
});

// Check 10: Quality gates documented
check('Quality gates documented', () => {
  const path = join(__dirname, 'SKILL.md');
  const content = readFileSync(path, 'utf-8');
  const gates = ['Architecture', 'Code Quality', 'Testing', 'Security', 'Documentation'];
  for (const gate of gates) {
    if (!content.includes(gate)) throw new Error(`Quality gate "${gate}" not mentioned`);
  }
});

// Summary
console.log('\n' + blue('=== Validation Results ==='));
console.log(green(`Passed: ${passed}`));
if (failed > 0) {
  console.log(red(`Failed: ${failed}`));
  process.exit(1);
} else {
  console.log(green('\n✓ All checks passed! The lead-developer skill is valid.\n'));
  process.exit(0);
}
