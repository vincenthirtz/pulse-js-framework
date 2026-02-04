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

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { createInterface } from 'readline';
import https from 'https';
import { log } from './logger.js';
import { runDocsTest } from './docs-test.js';

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
 * Get the last git tag
 */
function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { cwd: root, encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Get commits since the last tag (or all commits if no tag exists)
 */
function getCommitsSinceLastTag() {
  const lastTag = getLastTag();
  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';

  try {
    const output = execSync(`git log ${range} --pretty=format:"%s"`, {
      cwd: root,
      encoding: 'utf-8'
    });
    return output.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

/**
 * Parse commit messages into changelog categories
 * Supports conventional commits: feat:, fix:, docs:, chore:, refactor:, perf:, test:, style:
 */
function parseCommitMessages(commits) {
  const changes = { added: [], changed: [], fixed: [], removed: [] };

  for (const commit of commits) {
    const lowerCommit = commit.toLowerCase();

    // Skip version commits (e.g., "v1.5.0")
    if (/^v?\d+\.\d+\.\d+/.test(commit)) continue;

    // Skip merge commits
    if (lowerCommit.startsWith('merge ')) continue;

    // Parse conventional commits
    if (lowerCommit.startsWith('feat:') || lowerCommit.startsWith('feat(')) {
      changes.added.push(cleanCommitMessage(commit, 'feat'));
    } else if (lowerCommit.startsWith('fix:') || lowerCommit.startsWith('fix(')) {
      changes.fixed.push(cleanCommitMessage(commit, 'fix'));
    } else if (lowerCommit.startsWith('remove') || lowerCommit.startsWith('deprecate')) {
      changes.removed.push(commit);
    } else if (
      lowerCommit.startsWith('refactor:') ||
      lowerCommit.startsWith('perf:') ||
      lowerCommit.startsWith('chore:') ||
      lowerCommit.startsWith('docs:') ||
      lowerCommit.startsWith('style:') ||
      lowerCommit.startsWith('test:')
    ) {
      changes.changed.push(cleanCommitMessage(commit, commit.split(':')[0]));
    } else {
      // Default: treat as a change
      changes.changed.push(commit);
    }
  }

  return changes;
}

/**
 * Clean commit message by removing the conventional commit prefix
 */
function cleanCommitMessage(message, prefix) {
  // Remove "prefix:" or "prefix(scope):"
  const regex = new RegExp(`^${prefix}(\\([^)]+\\))?:\\s*`, 'i');
  return message.replace(regex, '').trim();
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
 * Escape HTML entities and convert backticks to <code> tags
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Send release notification to Discord webhook
 * @param {string} webhookUrl - Discord webhook URL
 * @param {string} version - Release version
 * @param {string} title - Release title
 * @param {Object} changes - Changelog entries
 * @returns {Promise<void>}
 */
function sendDiscordNotification(webhookUrl, version, title, changes) {
  return new Promise((resolve, reject) => {
    // Build embed fields from changes
    const fields = [];

    if (changes.added?.length > 0) {
      fields.push({
        name: '✨ Added',
        value: changes.added.map(c => `• ${c}`).join('\n').slice(0, 1024),
        inline: false
      });
    }

    if (changes.changed?.length > 0) {
      fields.push({
        name: '🔄 Changed',
        value: changes.changed.map(c => `• ${c}`).join('\n').slice(0, 1024),
        inline: false
      });
    }

    if (changes.fixed?.length > 0) {
      fields.push({
        name: '🐛 Fixed',
        value: changes.fixed.map(c => `• ${c}`).join('\n').slice(0, 1024),
        inline: false
      });
    }

    if (changes.removed?.length > 0) {
      fields.push({
        name: '🗑️ Removed',
        value: changes.removed.map(c => `• ${c}`).join('\n').slice(0, 1024),
        inline: false
      });
    }

    // Discord webhook payload with rich embed
    const payload = {
      embeds: [{
        title: `🚀 Pulse Framework v${version}`,
        description: title || 'New release available!',
        color: 0x5865F2, // Discord blurple
        fields,
        footer: {
          text: 'Pulse JS Framework'
        },
        timestamp: new Date().toISOString(),
        url: `https://github.com/vincenthirtz/pulse-js-framework/releases/tag/v${version}`
      }]
    };

    const data = JSON.stringify(payload);
    const url = new URL(webhookUrl);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        log.info('  Discord notification sent successfully');
        resolve();
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          log.error(`  Discord notification failed: ${res.statusCode} - ${body}`);
          reject(new Error(`Discord webhook failed: ${res.statusCode}`));
        });
      }
    });

    req.on('error', (error) => {
      log.error(`  Discord notification error: ${error.message}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
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
 * Build commit message from version, title, and changes
 */
function buildCommitMessage(newVersion, title, changes) {
  // Build header: "v1.5.2 - Title" or just "v1.5.2"
  let message = `v${newVersion}`;
  if (title) {
    message += ` - ${title}`;
  }
  message += '\n\n';

  // Add change items as bullet points
  const allChanges = [
    ...(changes.added || []),
    ...(changes.changed || []),
    ...(changes.fixed || []),
    ...(changes.removed || [])
  ];

  if (allChanges.length > 0) {
    for (const change of allChanges) {
      message += `- ${change}\n`;
    }
    message += '\n';
  }

  // Add co-author
  message += 'Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>';

  return message;
}

/**
 * Execute git commands
 */
function gitCommitTagPush(newVersion, title, changes, dryRun = false) {
  const commitMessage = buildCommitMessage(newVersion, title, changes);

  if (dryRun) {
    log.info('  [dry-run] git add -A');
    log.info('  [dry-run] git commit with message:');
    log.info('  ' + commitMessage.split('\n').join('\n  '));
    log.info(`  [dry-run] git tag -a v${newVersion} -m "Release v${newVersion}"`);
    log.info('  [dry-run] git push');
    log.info('  [dry-run] git push --tags');
    return;
  }

  // git add
  log.info('  Running: git add -A...');
  execSync('git add -A', { cwd: root, stdio: 'inherit' });

  // git commit using temp file for cross-platform compatibility
  log.info('  Running: git commit...');
  const tempFile = join(tmpdir(), `pulse-release-${Date.now()}.txt`);
  writeFileSync(tempFile, commitMessage, 'utf-8');
  try {
    execSync(`git commit -F "${tempFile}"`, { cwd: root, stdio: 'inherit' });
  } finally {
    unlinkSync(tempFile);
  }

  // git tag
  log.info(`  Running: git tag v${newVersion}...`);
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: root, stdio: 'inherit' });

  // git push
  log.info('  Running: git push...');
  execSync('git push', { cwd: root, stdio: 'inherit' });

  log.info('  Running: git push --tags...');
  execSync('git push --tags', { cwd: root, stdio: 'inherit' });
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
  --dry-run         Show what would be done without making changes
  --no-push         Create commit and tag but don't push
  --title <text>    Release title (e.g., "Performance Improvements")
  --skip-prompt     Use empty changelog (for automated releases)
  --skip-docs-test  Skip documentation validation before release
  --from-commits    Auto-extract changelog from git commits since last tag
  --yes, -y         Auto-confirm all prompts
  --changes <json> Pass changelog as JSON (e.g., '{"added":["Feature 1"],"fixed":["Bug 1"]}')
  --added <items>  Comma-separated list of added features
  --changed <items> Comma-separated list of changes
  --fixed <items>  Comma-separated list of fixes
  --discord-webhook <url>  Send release notification to Discord channel

Examples:
  pulse release patch
  pulse release minor --title "New Features" -y
  pulse release major --dry-run
  pulse release patch --from-commits --title "Bug Fixes" -y
  pulse release patch --title "Security" --fixed "XSS vulnerability,SQL injection" -y
  pulse release patch --title "New API" --added "Feature A,Feature B" --fixed "Bug X" -y
  pulse release patch --discord-webhook "https://discord.com/api/webhooks/..."
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
  const fromCommits = args.includes('--from-commits');
  const autoConfirm = args.includes('--yes') || args.includes('-y');
  const skipDocsTest = args.includes('--skip-docs-test');

  let title = '';
  const titleIndex = args.indexOf('--title');
  if (titleIndex !== -1 && args[titleIndex + 1]) {
    title = args[titleIndex + 1];
  }

  // Parse --discord-webhook option
  let discordWebhook = null;
  const discordIndex = args.indexOf('--discord-webhook');
  if (discordIndex !== -1 && args[discordIndex + 1]) {
    discordWebhook = args[discordIndex + 1];
  }

  // Parse --changes JSON option
  let changesFromArgs = null;
  const changesIndex = args.indexOf('--changes');
  if (changesIndex !== -1 && args[changesIndex + 1]) {
    try {
      changesFromArgs = JSON.parse(args[changesIndex + 1]);
    } catch (e) {
      log.error('Invalid JSON for --changes option');
      process.exit(1);
    }
  }

  // Parse individual change type options
  const addedIndex = args.indexOf('--added');
  const changedIndex = args.indexOf('--changed');
  const fixedIndex = args.indexOf('--fixed');
  const removedIndex = args.indexOf('--removed');

  if (!changesFromArgs && (addedIndex !== -1 || changedIndex !== -1 || fixedIndex !== -1 || removedIndex !== -1)) {
    changesFromArgs = {
      added: addedIndex !== -1 && args[addedIndex + 1] ? args[addedIndex + 1].split(',').map(s => s.trim()) : [],
      changed: changedIndex !== -1 && args[changedIndex + 1] ? args[changedIndex + 1].split(',').map(s => s.trim()) : [],
      fixed: fixedIndex !== -1 && args[fixedIndex + 1] ? args[fixedIndex + 1].split(',').map(s => s.trim()) : [],
      removed: removedIndex !== -1 && args[removedIndex + 1] ? args[removedIndex + 1].split(',').map(s => s.trim()) : []
    };
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
      if (!autoConfirm) {
        const proceed = await prompt('Continue anyway? (y/N) ');
        if (proceed.toLowerCase() !== 'y') {
          log.info('Aborted.');
          process.exit(0);
        }
      } else {
        log.info('Auto-confirming with --yes flag');
      }
    }
  } catch (error) {
    log.error('Failed to check git status');
    process.exit(1);
  }

  // Run documentation tests
  if (!skipDocsTest) {
    log.info('');
    log.info('Running documentation tests...');

    const docsTestResult = await runDocsTest({ verbose: false, httpTest: true });

    if (!docsTestResult.success) {
      log.error('Documentation tests failed. Fix errors before releasing.');
      if (!autoConfirm) {
        const proceed = await prompt('Continue anyway? (y/N) ');
        if (proceed.toLowerCase() !== 'y') {
          log.info('Aborted.');
          process.exit(1);
        }
      } else {
        log.error('Aborting release due to documentation errors.');
        process.exit(1);
      }
    }
  } else {
    log.warn('Skipping documentation tests (--skip-docs-test)');
  }

  // Collect changelog entries
  let changes = { added: [], changed: [], fixed: [], removed: [] };

  // Use changes from command-line arguments if provided
  if (changesFromArgs) {
    changes = {
      added: changesFromArgs.added || [],
      changed: changesFromArgs.changed || [],
      fixed: changesFromArgs.fixed || [],
      removed: changesFromArgs.removed || []
    };
    const totalChanges = Object.values(changes).flat().length;
    if (totalChanges > 0) {
      log.info('');
      log.info('Changelog entries from arguments:');
      if (changes.added.length) log.info(`  Added: ${changes.added.length} items`);
      if (changes.changed.length) log.info(`  Changed: ${changes.changed.length} items`);
      if (changes.fixed.length) log.info(`  Fixed: ${changes.fixed.length} items`);
      if (changes.removed.length) log.info(`  Removed: ${changes.removed.length} items`);
    }
  } else if (fromCommits) {
    // Auto-extract from git commits since last tag
    const lastTag = getLastTag();
    const commits = getCommitsSinceLastTag();

    if (commits.length === 0) {
      log.warn('No commits found since last tag');
    } else {
      log.info(`Found ${commits.length} commits since ${lastTag || 'beginning'}`);
      changes = parseCommitMessages(commits);

      // Show extracted changes
      const totalChanges = Object.values(changes).flat().length;
      if (totalChanges > 0) {
        log.info('');
        log.info('Extracted changelog entries:');
        if (changes.added.length) log.info(`  Added: ${changes.added.length} items`);
        if (changes.changed.length) log.info(`  Changed: ${changes.changed.length} items`);
        if (changes.fixed.length) log.info(`  Fixed: ${changes.fixed.length} items`);
        if (changes.removed.length) log.info(`  Removed: ${changes.removed.length} items`);
      }
    }

    if (!title && !autoConfirm) {
      title = await prompt('Release title (e.g., "Performance Improvements"): ');
    }
  } else if (!skipPrompt && !autoConfirm) {
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

  if (!hasChanges && !skipPrompt && !autoConfirm) {
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
      const commitMessage = buildCommitMessage(newVersion, title, changes);
      execSync('git add -A', { cwd: root, stdio: 'inherit' });
      const tempFile = join(tmpdir(), `pulse-release-${Date.now()}.txt`);
      writeFileSync(tempFile, commitMessage, 'utf-8');
      try {
        execSync(`git commit -F "${tempFile}"`, { cwd: root, stdio: 'inherit' });
      } finally {
        unlinkSync(tempFile);
      }
      execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: root, stdio: 'inherit' });
      log.info('  Created commit and tag (--no-push specified)');
    } else {
      gitCommitTagPush(newVersion, title, changes, false);
    }
  } else {
    gitCommitTagPush(newVersion, title, changes, true);
  }

  log.info('');
  log.info(`Release v${newVersion} complete!`);
  log.info('');

  // Send Discord notification if webhook URL provided
  if (discordWebhook && !dryRun) {
    log.info('Sending Discord notification...');
    try {
      await sendDiscordNotification(discordWebhook, newVersion, title, changes);
    } catch (error) {
      log.warn(`Discord notification failed: ${error.message}`);
      log.warn('Release was successful, but notification could not be sent.');
    }
  } else if (discordWebhook && dryRun) {
    log.info('  [dry-run] Would send Discord notification to webhook');
  }

  if (!dryRun && !noPush) {
    log.info('Next step:');
    log.info(`  Create GitHub release: https://github.com/vincenthirtz/pulse-js-framework/releases/new?tag=v${newVersion}`);
  }
}
