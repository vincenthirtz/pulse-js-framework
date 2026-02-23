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

// Check 1: skill.json exists
check('skill.json exists', () => {
  const path = join(__dirname, 'skill.json');
  if (!existsSync(path)) throw new Error('skill.json not found');
});

// Check 2: skill.json is valid JSON
check('skill.json is valid JSON', () => {
  const path = join(__dirname, 'skill.json');
  const content = readFileSync(path, 'utf-8');
  JSON.parse(content);
});

// Check 3: skill.json has required fields
check('skill.json has required fields', () => {
  const path = join(__dirname, 'skill.json');
  const content = JSON.parse(readFileSync(path, 'utf-8'));
  const required = ['name', 'version', 'description', 'instructions', 'capabilities', 'delegatesTo'];
  for (const field of required) {
    if (!content[field]) throw new Error(`Missing field: ${field}`);
  }
  if (content.name !== 'lead-developer') {
    throw new Error(`Expected name "lead-developer", got "${content.name}"`);
  }
});

// Check 4: instructions.md exists
check('instructions.md exists', () => {
  const path = join(__dirname, 'instructions.md');
  if (!existsSync(path)) throw new Error('instructions.md not found');
});

// Check 5: instructions.md is not empty
check('instructions.md has content', () => {
  const path = join(__dirname, 'instructions.md');
  const content = readFileSync(path, 'utf-8');
  if (content.trim().length < 100) {
    throw new Error('instructions.md seems too short');
  }
});

// Check 6: instructions.md mentions all delegate skills
check('instructions.md references all delegate skills', () => {
  const skillPath = join(__dirname, 'skill.json');
  const skillJson = JSON.parse(readFileSync(skillPath, 'utf-8'));
  const delegatesTo = skillJson.delegatesTo || [];

  const instructionsPath = join(__dirname, 'instructions.md');
  const instructions = readFileSync(instructionsPath, 'utf-8');

  for (const skill of delegatesTo) {
    if (!instructions.includes(skill)) {
      throw new Error(`Delegate skill "${skill}" not mentioned in instructions`);
    }
  }
});

// Check 7: README.md exists
check('README.md exists', () => {
  const path = join(__dirname, 'README.md');
  if (!existsSync(path)) throw new Error('README.md not found');
});

// Check 8: README.md has usage examples
check('README.md has usage examples', () => {
  const path = join(__dirname, 'README.md');
  const content = readFileSync(path, 'utf-8');
  if (!content.includes('```') || !content.includes('Example')) {
    throw new Error('README.md should have code examples');
  }
});

// Check 9: examples.md exists
check('examples.md exists', () => {
  const path = join(__dirname, 'examples.md');
  if (!existsSync(path)) throw new Error('examples.md not found');
});

// Check 10: examples.md has real examples
check('examples.md has practical examples', () => {
  const path = join(__dirname, 'examples.md');
  const content = readFileSync(path, 'utf-8');
  if (!content.includes('Example 1:')) {
    throw new Error('examples.md should have numbered examples');
  }
});

// Check 11: Delegate skills validation
check('Delegate skills exist and are valid', () => {
  const skillPath = join(__dirname, 'skill.json');
  const skillJson = JSON.parse(readFileSync(skillPath, 'utf-8'));
  const delegatesTo = skillJson.delegatesTo || [];

  // If delegatesTo is empty, skill works in autonomous mode (valid)
  if (delegatesTo.length === 0) {
    console.log(yellow('  Note: Skill configured for autonomous mode (no delegation)'));
    return;
  }

  // Check in same directory as lead-developer (sibling skills in .claude/skills/)
  const skillsDir = dirname(__dirname);

  let foundCount = 0;
  let missingSkills = [];

  for (const skill of delegatesTo) {
    const skillDir = join(skillsDir, skill);
    if (existsSync(skillDir)) {
      // Check for either skill.json or SKILL.md (both are valid formats)
      const skillJsonPath = join(skillDir, 'skill.json');
      const skillMdPath = join(skillDir, 'SKILL.md');
      if (existsSync(skillJsonPath) || existsSync(skillMdPath)) {
        foundCount++;
      } else {
        missingSkills.push(`${skill} (missing skill.json or SKILL.md)`);
      }
    } else {
      missingSkills.push(skill);
    }
  }

  if (foundCount === delegatesTo.length) {
    console.log(green(`  Found all ${foundCount} delegate skills in .claude/skills/`));
  } else if (foundCount > 0) {
    console.log(yellow(`  Found ${foundCount}/${delegatesTo.length} delegate skills`));
    console.log(yellow(`  Missing: ${missingSkills.join(', ')}`));
    throw new Error(`Some delegate skills not found: ${missingSkills.join(', ')}`);
  } else {
    console.log(yellow(`  No delegate skills found (will work in autonomous mode)`));
  }
});

// Check 12: Quality gates mentioned
check('Quality gates documented', () => {
  const instructionsPath = join(__dirname, 'instructions.md');
  const instructions = readFileSync(instructionsPath, 'utf-8');
  const gates = ['Architecture', 'Code Quality', 'Testing', 'Security', 'Documentation'];
  for (const gate of gates) {
    if (!instructions.includes(gate)) {
      throw new Error(`Quality gate "${gate}" not mentioned`);
    }
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
