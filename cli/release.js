/**
 * Pulse CLI - Release Command
 *
 * Handles version bumping and release automation:
 * - Bump version (patch, minor, major)
 * - Update CHANGELOG.md
 * - Update docs changelog page
 * - Update version in docs state
 * - Create git commit and tag
 * - Push to remote
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { log } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Prompt for multiline input
 */
async function promptMultiline(question) {
  log.info(question);
  log.info('(Enter each item on a new line, empty line to finish)');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const lines = [];

  return new Promise((resolve) => {
    rl.on('line', (line) => {
      if (line.trim() === '') {
        rl.close();
        resolve(lines);
      } else {
        lines.push(line.trim());
      }
    });
  });
}

/**
 * Parse version string
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid version format: ${version}`);
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

/**
 * Bump version based on type
 */
function bumpVersion(version, type) {
  const v = parseVersion(version);
  switch (type) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      throw new Error(`Unknown version type: ${type}`);
  }
}

/**
 * Get current date in YYYY-MM-DD format
 */
function getCurrentDate() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get current month and year
 */
function getCurrentMonthYear() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

/**
 * Update package.json version
 */
function updatePackageJson(newVersion) {
  const pkgPath = join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  log.info(`  Updated package.json to v${newVersion}`);
}

/**
 * Update docs/src/state.js version
 */
function updateDocsState(newVersion) {
  const statePath = join(root, 'docs/src/state.js');
  if (!existsSync(statePath)) {
    log.warn('  docs/src/state.js not found, skipping');
    return;
  }

  let content = readFileSync(statePath, 'utf-8');
  content = content.replace(
    /export const version = '[^']+'/,
    `export const version = '${newVersion}'`
  );
  writeFileSync(statePath, content);
  log.info(`  Updated docs/src/state.js to v${newVersion}`);
}

/**
 * Update CHANGELOG.md
 */
function updateChangelog(newVersion, title, changes) {
  const changelogPath = join(root, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    log.warn('  CHANGELOG.md not found, skipping');
    return;
  }

  let content = readFileSync(changelogPath, 'utf-8');

  // Build changelog entry
  const date = getCurrentDate();
  let entry = `## [${newVersion}] - ${date}\n\n`;

  if (title) {
    entry += `### ${title}\n\n`;
  }

  if (changes.added && changes.added.length > 0) {
    entry += `### Added\n\n`;
    for (const item of changes.added) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }

  if (changes.changed && changes.changed.length > 0) {
    entry += `### Changed\n\n`;
    for (const item of changes.changed) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }

  if (changes.fixed && changes.fixed.length > 0) {
    entry += `### Fixed\n\n`;
    for (const item of changes.fixed) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }

  if (changes.removed && changes.removed.length > 0) {
    entry += `### Removed\n\n`;
    for (const item of changes.removed) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }

  // Insert after the header section (after line 6)
  const lines = content.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('## ['));

  if (insertIndex !== -1) {
    lines.splice(insertIndex, 0, entry);
  } else {
    // No existing version entries, add after header
    lines.push(entry);
  }

  writeFileSync(changelogPath, lines.join('\n'));
  log.info(`  Updated CHANGELOG.md with v${newVersion}`);
}

/**
 * Update docs changelog page
 */
function updateDocsChangelog(newVersion, title, changes) {
  const changelogPagePath = join(root, 'docs/src/pages/ChangelogPage.js');
  if (!existsSync(changelogPagePath)) {
    log.warn('  docs/src/pages/ChangelogPage.js not found, skipping');
    return;
  }

  let content = readFileSync(changelogPagePath, 'utf-8');
  const monthYear = getCurrentMonthYear();

  // Build HTML changelog section
  let section = `
    <section class="doc-section changelog-section">
      <h2>v${newVersion} - ${title || 'Release'}</h2>
      <p class="release-date">${monthYear}</p>

      <div class="changelog-group">`;

  // Combine all changes into feature list
  const allChanges = [
    ...(changes.added || []).map(c => `<strong>Added:</strong> ${escapeHtml(c)}`),
    ...(changes.changed || []).map(c => `<strong>Changed:</strong> ${escapeHtml(c)}`),
    ...(changes.fixed || []).map(c => `<strong>Fixed:</strong> ${escapeHtml(c)}`),
    ...(changes.removed || []).map(c => `<strong>Removed:</strong> ${escapeHtml(c)}`)
  ];

  if (allChanges.length > 0) {
    section += `
        <ul class="feature-list">`;
    for (const change of allChanges) {
      section += `
          <li>${change}</li>`;
    }
    section += `
        </ul>`;
  }

  section += `
      </div>
    </section>
`;

  // Find where to insert (after the intro paragraph, before first section)
  const insertMarker = '<section class="doc-section changelog-section">';
  const insertIndex = content.indexOf(insertMarker);

  if (insertIndex !== -1) {
    content = content.slice(0, insertIndex) + section + content.slice(insertIndex);
  }

  writeFileSync(changelogPagePath, content);
  log.info(`  Updated docs/src/pages/ChangelogPage.js with v${newVersion}`);
}

/**
 * Escape HTML entities
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Update CLAUDE.md if needed
 */
function updateClaudeMd(newVersion) {
  // CLAUDE.md reads version from package.json, so no update needed
  log.info('  CLAUDE.md reads version from package.json (no update needed)');
}

/**
 * Update README.md if needed
 */
function updateReadme(newVersion) {
  // README.md doesn't have a version number to update
  // But we could update version-specific feature mentions if needed
  log.info('  README.md has no version-specific content to update');
}

/**
 * Execute git commands
 */
function gitCommitTagPush(newVersion, dryRun = false) {
  const commands = [
    'git add -A',
    `git commit -m "$(cat <<'EOF'\nv${newVersion}\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>\nEOF\n)"`,
    `git tag -a v${newVersion} -m "Release v${newVersion}"`,
    'git push',
    'git push --tags'
  ];

  for (const cmd of commands) {
    if (dryRun) {
      log.info(`  [dry-run] ${cmd}`);
    } else {
      log.info(`  Running: ${cmd.split('\n')[0]}...`);
      try {
        execSync(cmd, { cwd: root, stdio: 'inherit', shell: '/bin/bash' });
      } catch (error) {
        log.error(`  Failed: ${error.message}`);
        throw error;
      }
    }
  }
}

/**
 * Show usage
 */
function showUsage() {
  log.info(`
Usage: pulse release <type> [options]

Types:
  patch     Bump patch version (1.0.0 -> 1.0.1)
  minor     Bump minor version (1.0.0 -> 1.1.0)
  major     Bump major version (1.0.0 -> 2.0.0)

Options:
  --dry-run       Show what would be done without making changes
  --no-push       Create commit and tag but don't push
  --title <text>  Release title (e.g., "Performance Improvements")
  --skip-prompt   Use empty changelog (for automated releases)

Examples:
  pulse release patch
  pulse release minor --title "New Features"
  pulse release major --dry-run
  `);
}

/**
 * Main release command
 */
export async function runRelease(args) {
  const type = args[0];

  if (!type || !['patch', 'minor', 'major'].includes(type)) {
    showUsage();
    process.exit(1);
  }

  // Parse options
  const dryRun = args.includes('--dry-run');
  const noPush = args.includes('--no-push');
  const skipPrompt = args.includes('--skip-prompt');

  let title = '';
  const titleIndex = args.indexOf('--title');
  if (titleIndex !== -1 && args[titleIndex + 1]) {
    title = args[titleIndex + 1];
  }

  // Read current version
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  const currentVersion = pkg.version;
  const newVersion = bumpVersion(currentVersion, type);

  log.info('');
  log.info(`Pulse Release: v${currentVersion} -> v${newVersion}`);
  log.info('='.repeat(50));

  if (dryRun) {
    log.warn('DRY RUN - No changes will be made');
    log.info('');
  }

  // Check for uncommitted changes
  try {
    const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf-8' });
    if (status.trim()) {
      log.warn('You have uncommitted changes:');
      log.info(status);
      const proceed = await prompt('Continue anyway? (y/N) ');
      if (proceed.toLowerCase() !== 'y') {
        log.info('Aborted.');
        process.exit(0);
      }
    }
  } catch (error) {
    log.error('Failed to check git status');
    process.exit(1);
  }

  // Collect changelog entries
  let changes = { added: [], changed: [], fixed: [], removed: [] };

  if (!skipPrompt) {
    if (!title) {
      title = await prompt('Release title (e.g., "Performance Improvements"): ');
    }

    log.info('');
    log.info('Enter changelog items (leave empty to skip category):');
    log.info('');

    changes.added = await promptMultiline('Added (new features):');
    changes.changed = await promptMultiline('Changed (modifications):');
    changes.fixed = await promptMultiline('Fixed (bug fixes):');
    changes.removed = await promptMultiline('Removed (deprecated features):');
  }

  const hasChanges = Object.values(changes).some(arr => arr.length > 0);

  if (!hasChanges && !skipPrompt) {
    const proceed = await prompt('No changelog entries. Continue? (y/N) ');
    if (proceed.toLowerCase() !== 'y') {
      log.info('Aborted.');
      process.exit(0);
    }
  }

  log.info('');
  log.info('Updating files...');

  if (!dryRun) {
    // 1. Update package.json
    updatePackageJson(newVersion);

    // 2. Update docs state
    updateDocsState(newVersion);

    // 3. Update CHANGELOG.md
    if (hasChanges) {
      updateChangelog(newVersion, title, changes);
    }

    // 4. Update docs changelog page
    if (hasChanges) {
      updateDocsChangelog(newVersion, title, changes);
    }

    // 5. CLAUDE.md and README.md
    updateClaudeMd(newVersion);
    updateReadme(newVersion);
  } else {
    log.info('  [dry-run] Would update package.json');
    log.info('  [dry-run] Would update docs/src/state.js');
    if (hasChanges) {
      log.info('  [dry-run] Would update CHANGELOG.md');
      log.info('  [dry-run] Would update docs/src/pages/ChangelogPage.js');
    }
  }

  log.info('');
  log.info('Git operations...');

  if (!dryRun) {
    if (noPush) {
      // Only commit and tag, no push
      execSync('git add -A', { cwd: root, stdio: 'inherit' });
      execSync(`git commit -m "v${newVersion}\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"`, {
        cwd: root,
        stdio: 'inherit',
        shell: '/bin/bash'
      });
      execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: root, stdio: 'inherit' });
      log.info('  Created commit and tag (--no-push specified)');
    } else {
      gitCommitTagPush(newVersion, false);
    }
  } else {
    gitCommitTagPush(newVersion, true);
  }

  log.info('');
  log.info(`Release v${newVersion} complete!`);
  log.info('');

  if (!dryRun && !noPush) {
    log.info('Next steps:');
    log.info(`  1. Create GitHub release: https://github.com/vincenthirtz/pulse-js-framework/releases/new?tag=v${newVersion}`);
    log.info('  2. Publish to npm: npm publish');
  }
}
