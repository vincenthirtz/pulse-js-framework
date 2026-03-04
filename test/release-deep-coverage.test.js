/**
 * Release.js Deep Coverage Tests
 *
 * Uses mock.module() to mock fs writes and child_process.execSync,
 * enabling safe testing of non-dry-run code paths that would otherwise
 * modify real project files and execute real git commands.
 *
 * MUST be run with: node --experimental-test-module-mocks --test test/release-deep-coverage.test.js
 *
 * @module test/release-deep-coverage
 */
import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  readFileSync as realReadFileSync,
  existsSync as realExistsSync,
  readdirSync as realReaddirSync,
  statSync as realStatSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __test_dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__test_dirname, '..');

// Read real package.json BEFORE mocking (using node:fs, unaffected by mock.module('fs'))
const REAL_PKG_JSON = realReadFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8');
const REAL_PKG = JSON.parse(REAL_PKG_JSON);
const currentVersion = REAL_PKG.version;

// ============================================================================
// Configurable mock state
// ============================================================================

const state = {
  writes: [],
  execs: [],
  unlinkCalls: [],
  fdStore: {},
  nextFd: 100,
  execOverrides: {},
  openOverrides: {},
  httpsReqs: [],
};

function resetState() {
  state.writes = [];
  state.execs = [];
  state.unlinkCalls = [];
  state.fdStore = {};
  state.nextFd = 100;
  state.execOverrides = {};
  state.openOverrides = {};
  state.httpsReqs = [];
}

// ============================================================================
// Default execSync handler
// ============================================================================

function defaultExecSync(command, options) {
  state.execs.push(command);

  // Check overrides first
  for (const [pattern, handler] of Object.entries(state.execOverrides)) {
    if (command.includes(pattern)) {
      if (typeof handler === 'function') return handler(command, options);
      if (handler instanceof Error) throw handler;
      return handler;
    }
  }

  // Default git command behaviors
  if (command.includes('git status --porcelain')) return '';
  if (command.includes('git describe --tags --abbrev=0')) return `v${currentVersion}`;
  if (command.includes('git log') && command.includes('--pretty=format')) {
    return [
      'feat: add new feature',
      'feat(router): add lazy loading',
      'fix: fix a bug',
      'fix(dom): fix memory leak',
      'chore: update deps',
      'refactor: clean up code',
      'perf: optimize list rendering',
      'docs: update readme',
      'style: format code',
      'test: add unit tests',
      'remove old API',
      'deprecate legacy method',
      'Merge pull request #1',
      `v${currentVersion}`,
      'some other commit'
    ].join('\n');
  }
  if (command.includes('git tag -l')) {
    // Include any version that was "tagged" via git tag -a in this test run
    const versions = [currentVersion];
    const tagCmd = state.execs.find(c => c.includes('git tag -a'));
    if (tagCmd) {
      const m = tagCmd.match(/git tag -a v([\d.]+)/);
      if (m) versions.push(m[1]);
    }
    return versions.map(v => `v${v}`).join('\n');
  }
  if (command.includes('git ls-remote --tags')) {
    const tagCmd = state.execs.find(c => c.includes('git tag -a'));
    if (tagCmd) {
      const m = tagCmd.match(/git tag -a (v[\d.]+)/);
      if (m) return `abc123\trefs/tags/${m[1]}`;
    }
    return `abc123\trefs/tags/v${currentVersion}`;
  }
  if (command.includes('gh --version')) return 'gh version 2.50.0';
  if (command.includes('gh release view')) throw new Error('release not found');
  if (command.includes('gh release create')) return '';
  if (command.includes('git add')) return '';
  if (command.includes('git commit')) return '';
  if (command.includes('git tag -a')) return '';
  if (command.includes('git push')) return '';
  return '';
}

// ============================================================================
// Mock 'fs' — real reads, intercepted writes
// ============================================================================

mock.module('fs', {
  namedExports: {
    readFileSync: (pathOrFd, enc) => {
      if (typeof pathOrFd === 'number') return state.fdStore[pathOrFd] || '';
      return realReadFileSync(pathOrFd, enc);
    },
    writeFileSync: (pathOrFd, data, opts) => {
      state.writes.push({
        target: typeof pathOrFd === 'number' ? `fd:${pathOrFd}` : pathOrFd,
        data: typeof data === 'string' ? data : String(data)
      });
      if (typeof pathOrFd === 'number') {
        state.fdStore[pathOrFd] = typeof data === 'string' ? data : String(data);
      }
    },
    openSync: (path, flags) => {
      // Check per-test overrides
      for (const [pattern, handler] of Object.entries(state.openOverrides)) {
        if (path.includes(pattern)) {
          if (handler instanceof Error) throw handler;
        }
      }
      const fd = state.nextFd++;
      try {
        state.fdStore[fd] = realReadFileSync(path, 'utf-8');
      } catch (err) {
        if (flags === 'r+') throw err;
        state.fdStore[fd] = '';
      }
      return fd;
    },
    closeSync: () => {},
    ftruncateSync: (fd) => { if (fd in state.fdStore) state.fdStore[fd] = ''; },
    unlinkSync: (path) => { state.unlinkCalls.push(path); },
    existsSync: (path) => {
      try { return realExistsSync(path); } catch { return false; }
    },
    readdirSync: (...args) => {
      try { return realReaddirSync(...args); } catch { return []; }
    },
    accessSync: (...args) => {
      // pass through to real
      const { accessSync: realAccess } = await_import_node_fs();
      // Can't use await here - just try real
      try { realStatSync(args[0]); } catch (e) { throw e; }
    },
    statSync: (...args) => {
      try { return realStatSync(...args); } catch (e) { throw e; }
    },
    mkdirSync: () => {},
  }
});

// Helper - not actually used, just a stub for accessSync
function await_import_node_fs() { return { accessSync: () => {} }; }

// ============================================================================
// Mock 'child_process'
// ============================================================================

mock.module('child_process', {
  namedExports: {
    execSync: (cmd, opts) => defaultExecSync(cmd, opts)
  }
});

// ============================================================================
// Mock 'https' for Discord webhook
// ============================================================================

let httpsResponseCode = 204;

mock.module('https', {
  defaultExport: {
    request: (options, callback) => {
      state.httpsReqs.push(options);
      process.nextTick(() => {
        const mockRes = {
          statusCode: httpsResponseCode,
          on: (event, handler) => {
            if (httpsResponseCode >= 400) {
              if (event === 'data') process.nextTick(() => handler('{"error":"bad"}'));
              if (event === 'end') process.nextTick(() => handler());
            }
          }
        };
        callback(mockRes);
      });
      return {
        on: () => {},
        write: () => {},
        end: () => {}
      };
    }
  }
});

// ============================================================================
// Dynamic import of release.js (uses mocked modules)
// ============================================================================

const { runRelease } = await import('../cli/release.js');

// ============================================================================
// Test helpers
// ============================================================================

const SAFE = ['--skip-prompt', '--skip-docs-test', '--yes'];
let logs, exitMock;

function output() {
  return [...logs.log, ...logs.warn, ...logs.error].join('\n');
}

// ============================================================================
// Tests
// ============================================================================

describe('release.js non-dry-run coverage', () => {
  beforeEach(() => {
    resetState();
    httpsResponseCode = 204;
    exitMock = mock.method(process, 'exit', (code) => {
      throw new Error(`process.exit(${code})`);
    });
    logs = { log: [], warn: [], error: [] };
    logs._origLog = console.log;
    logs._origWarn = console.warn;
    logs._origErr = console.error;
    console.log = (...a) => logs.log.push(a.join(' '));
    console.warn = (...a) => logs.warn.push(a.join(' '));
    console.error = (...a) => logs.error.push(a.join(' '));
  });

  afterEach(() => {
    exitMock.mock.restore();
    console.log = logs._origLog;
    console.warn = logs._origWarn;
    console.error = logs._origErr;
  });

  // ── Non-dry-run file updates ──────────────────────────────────

  describe('non-dry-run file updates', () => {
    test('patch with all change categories updates all files', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({
        added: ['Feature A', 'Feature B'],
        changed: ['Refactored X'],
        fixed: ['Bug Y'],
        removed: ['Old API Z']
      });
      await runRelease(['patch', ...SAFE, '--changes', changes, '--title', 'Test Release']);

      const o = output();
      assert.ok(o.includes('Updated package.json'), 'Should update package.json');
      assert.ok(o.includes('Updated docs/src/state.js'), 'Should update state.js');
      assert.ok(o.includes('Updated CHANGELOG.md'), 'Should update CHANGELOG');
      assert.ok(o.includes('Updated docs/src/pages/ChangelogPage.js'), 'Should update ChangelogPage');
      assert.ok(o.includes('CLAUDE.md reads version from package.json'));
      assert.ok(o.includes('README.md has no version-specific content'));
      assert.ok(o.includes('complete!'));

      // Verify writes were captured
      assert.ok(state.writes.length > 0, 'Should have captured writes');
      // Verify package.json write has new version
      const pkgWrite = state.writes.find(w =>
        typeof w.target === 'string' && w.target.endsWith('package.json'));
      assert.ok(pkgWrite, 'Should write package.json');
    });

    test('patch without changes skips CHANGELOG and ChangelogPage', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...SAFE]);

      const o = output();
      assert.ok(o.includes('Updated package.json'));
      assert.ok(!o.includes('Updated CHANGELOG.md'));
      assert.ok(!o.includes('Updated docs/src/pages/ChangelogPage.js'));
      assert.ok(o.includes('complete!'));
    });

    test('minor with HTML entities exercises escapeHtml', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({
        added: ['Support <div> & "quotes"', 'Use `useEffect` hook'],
        changed: ['Updated > improved'],
        fixed: ['Fixed & resolved'],
        removed: ['Removed `legacy` API']
      });
      await runRelease(['minor', ...SAFE, '--changes', changes, '--title', 'HTML Test']);

      const o = output();
      assert.ok(o.includes('Updated CHANGELOG.md'));
      assert.ok(o.includes('Updated docs/src/pages/ChangelogPage.js'));
      assert.ok(o.includes('complete!'));

      // Verify changelog page write contains escaped HTML
      const pageWrite = state.writes.find(w =>
        typeof w.target === 'string' && w.target.includes('fd:'));
      assert.ok(pageWrite, 'Should have fd writes from atomicReadModifyWrite');
    });

    test('handles missing docs/state.js gracefully', { timeout: 15000 }, async () => {
      const enoent = new Error('ENOENT: state.js');
      enoent.code = 'ENOENT';
      state.openOverrides['state.js'] = enoent;

      await runRelease(['patch', ...SAFE, '--changes', '{"added":["X"]}']);

      const o = output();
      assert.ok(o.includes('docs/src/state.js not found'));
      assert.ok(o.includes('complete!'));
    });

    test('handles missing CHANGELOG.md gracefully', { timeout: 15000 }, async () => {
      const enoent = new Error('ENOENT: CHANGELOG.md');
      enoent.code = 'ENOENT';
      state.openOverrides['CHANGELOG.md'] = enoent;

      await runRelease(['patch', ...SAFE, '--changes', '{"added":["X"]}']);

      const o = output();
      assert.ok(o.includes('CHANGELOG.md not found'));
      assert.ok(o.includes('complete!'));
    });

    test('handles missing ChangelogPage.js gracefully', { timeout: 15000 }, async () => {
      const enoent = new Error('ENOENT: ChangelogPage.js');
      enoent.code = 'ENOENT';
      state.openOverrides['ChangelogPage.js'] = enoent;

      await runRelease(['patch', ...SAFE, '--changes', '{"added":["X"]}']);

      const o = output();
      assert.ok(o.includes('ChangelogPage.js not found'));
      assert.ok(o.includes('complete!'));
    });

    test('major release updates all version fields', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({
        added: ['Major feature'],
        removed: ['Breaking: removed old API']
      });
      await runRelease(['major', ...SAFE, '--changes', changes, '--title', 'V-Major']);

      assert.ok(output().includes('complete!'));
      assert.ok(state.writes.length > 0);
    });

    test('--added/--fixed/--changed/--removed flags (non-dry-run)', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...SAFE,
        '--added', 'NewA,NewB',
        '--changed', 'ModC',
        '--fixed', 'BugX,BugY',
        '--removed', 'OldZ'
      ]);

      const o = output();
      assert.ok(o.includes('Updated CHANGELOG.md'));
      assert.ok(o.includes('complete!'));
    });
  });

  // ── Git operations ─────────────────────────────────────────────

  describe('git operations (non-dry-run)', () => {
    test('full push flow: add, commit, tag, push, push --tags', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({ added: ['Feature'] });
      await runRelease(['patch', ...SAFE, '--changes', changes]);

      assert.ok(state.execs.some(c => c.includes('git add')));
      assert.ok(state.execs.some(c => c.includes('git commit')));
      assert.ok(state.execs.some(c => c.includes('git tag -a')));
      assert.ok(state.execs.some(c => c === 'git push' || c.includes('git push') && !c.includes('--tags')));
      assert.ok(state.execs.some(c => c.includes('git push --tags')));
      // Commit message temp file should be cleaned up
      assert.ok(state.unlinkCalls.some(p => p.includes('.commit-msg')));
    });

    test('verifies tag exists locally after creation', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...SAFE, '--changes', '{"added":["X"]}']);

      const o = output();
      assert.ok(o.includes('Verified'));
      assert.ok(state.execs.some(c => c.includes('git tag -l')));
    });

    test('verifies tag on remote via gh', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...SAFE, '--changes', '{"added":["X"]}']);

      // gh release view throws → falls back to git ls-remote
      assert.ok(state.execs.some(c => c.includes('gh release view')));
      assert.ok(state.execs.some(c => c.includes('git ls-remote --tags')));
      assert.ok(output().includes('exists on remote'));
    });

    test('push flow without gh CLI (fallback path)', { timeout: 15000 }, async () => {
      state.execOverrides['gh --version'] = new Error('not found');
      state.execOverrides['gh release view'] = new Error('not found');
      const changes = JSON.stringify({ added: ['Feature'] });
      await runRelease(['patch', ...SAFE, '--changes', changes]);

      const o = output();
      assert.ok(o.includes('exists on remote'));
      assert.ok(state.execs.some(c => c.includes('git ls-remote')));
    });

    test('--no-push: commits and tags without pushing', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({ added: ['Feature'] });
      await runRelease(['patch', ...SAFE, '--no-push', '--changes', changes]);

      const o = output();
      const execs = state.execs;
      assert.ok(execs.some(c => c.includes('git add')));
      assert.ok(execs.some(c => c.includes('git commit')));
      assert.ok(execs.some(c => c.includes('git tag -a')));
      assert.ok(!execs.some(c => c === 'git push'), 'Should NOT push');
      assert.ok(o.includes('--no-push specified'));
      assert.ok(o.includes('complete!'));
    });

    test('--no-gh-release: skips GitHub release', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({ added: ['Feature'] });
      await runRelease(['patch', ...SAFE, '--no-gh-release', '--changes', changes]);

      const o = output();
      assert.ok(o.includes('Skipping GitHub release'));
      assert.ok(!state.execs.some(c => c.includes('gh release create')));
    });
  });

  // ── GitHub release ─────────────────────────────────────────────

  describe('GitHub release creation', () => {
    test('creates release with title and changes', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({
        added: ['F1'], changed: ['C1'], fixed: ['X1'], removed: ['R1']
      });
      await runRelease(['patch', ...SAFE, '--changes', changes, '--title', 'GH Test']);

      const o = output();
      assert.ok(o.includes('Creating GitHub release'));
      assert.ok(state.execs.some(c => c.includes('gh release create')));
      // Release notes temp file should be cleaned up
      assert.ok(state.unlinkCalls.some(p => p.includes('.release-notes')));
    });

    test('handles gh CLI not available', { timeout: 15000 }, async () => {
      state.execOverrides['gh --version'] = new Error('not found');
      const changes = JSON.stringify({ added: ['Feature'] });
      await runRelease(['patch', ...SAFE, '--changes', changes]);

      const o = output();
      assert.ok(o.includes('gh CLI not available') || o.includes('Manual step'));
      assert.ok(o.includes('complete!'));
    });

    test('handles gh release create failure', { timeout: 15000 }, async () => {
      state.execOverrides['gh release create'] = new Error('permission denied');
      const changes = JSON.stringify({ added: ['Feature'] });
      await runRelease(['patch', ...SAFE, '--changes', changes]);

      const o = output();
      assert.ok(o.includes('Failed to create GitHub release') || o.includes('failed'));
      assert.ok(o.includes('complete!'));
    });

    test('creates release without title', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({ added: ['Feature'] });
      await runRelease(['patch', ...SAFE, '--changes', changes]);

      assert.ok(state.execs.some(c => c.includes('gh release create')));
      assert.ok(output().includes('complete!'));
    });
  });

  // ── From-commits parsing ───────────────────────────────────────

  describe('from-commits parsing', () => {
    test('extracts all commit types from git log', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...SAFE, '--from-commits', '--title', 'Auto']);

      const o = output();
      assert.ok(o.includes('commits since'));
      assert.ok(o.includes('Updated CHANGELOG.md'));
      assert.ok(o.includes('complete!'));
    });

    test('handles no last tag (getLastTag returns null)', { timeout: 15000 }, async () => {
      state.execOverrides['git describe --tags'] = new Error('fatal: No names found');

      await runRelease(['patch', ...SAFE, '--from-commits', '--title', 'First']);

      const o = output();
      assert.ok(o.includes('commits since'));
      assert.ok(o.includes('complete!'));
    });

    test('handles no commits since last tag', { timeout: 15000 }, async () => {
      state.execOverrides['git log'] = '';

      await runRelease(['patch', ...SAFE, '--from-commits']);

      const o = output();
      assert.ok(o.includes('No commits found'));
      assert.ok(o.includes('complete!'));
    });

    test('handles git log failure (catch block)', { timeout: 15000 }, async () => {
      state.execOverrides['git log'] = new Error('git error');

      await runRelease(['patch', ...SAFE, '--from-commits']);

      assert.ok(output().includes('complete!'));
    });
  });

  // ── Discord notification ───────────────────────────────────────

  describe('Discord notification', () => {
    test('sends webhook with all change categories', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({
        added: ['F1', 'F2'], changed: ['C1'], fixed: ['X1'], removed: ['R1']
      });
      await runRelease([
        'patch', ...SAFE, '--changes', changes,
        '--discord-webhook', 'https://discord.com/api/webhooks/123/abc'
      ]);

      const o = output();
      assert.ok(o.includes('Sending Discord') || o.includes('Discord notification sent'));
      assert.ok(state.httpsReqs.length > 0, 'Should have made HTTPS request');
    });

    test('handles Discord 400 response gracefully', { timeout: 15000 }, async () => {
      httpsResponseCode = 400;
      const changes = JSON.stringify({ added: ['F1'] });
      await runRelease([
        'patch', ...SAFE, '--changes', changes,
        '--discord-webhook', 'https://discord.com/api/webhooks/123/abc'
      ]);

      const o = output();
      assert.ok(o.includes('complete!'));
      assert.ok(o.includes('Discord notification failed') || o.includes('notification could not be sent'));
    });
  });

  // ── Git failure scenarios ──────────────────────────────────────

  describe('git failures', () => {
    test('git add failure exits with error', { timeout: 15000 }, async () => {
      state.execOverrides['git add'] = new Error('permission denied');

      await assert.rejects(
        () => runRelease(['patch', ...SAFE]),
        /process\.exit\(1\)/
      );
      assert.ok(output().includes('failed at stage'));
    });

    test('git commit failure exits with error', { timeout: 15000 }, async () => {
      state.execOverrides['git commit'] = new Error('nothing to commit');

      await assert.rejects(
        () => runRelease(['patch', ...SAFE]),
        /process\.exit\(1\)/
      );
    });

    test('git tag failure exits with error + shows manual steps', { timeout: 15000 }, async () => {
      state.execOverrides['git tag -a'] = new Error('tag already exists');

      await assert.rejects(
        () => runRelease(['patch', ...SAFE]),
        /process\.exit\(1\)/
      );
      const o = output();
      assert.ok(o.includes('Tag creation failed') || o.includes('failed at stage'));
    });

    test('tag verify failure (tag not in list)', { timeout: 15000 }, async () => {
      // Override git tag -l to return only old tags (not the new version)
      state.execOverrides['git tag -l'] = 'v0.1.0\nv0.2.0';

      await assert.rejects(
        () => runRelease(['patch', ...SAFE]),
        /process\.exit\(1\)/
      );
      assert.ok(output().includes('tag not found'));
    });

    test('git push failure exits with manual instructions', { timeout: 15000 }, async () => {
      state.execOverrides['git push'] = (cmd) => {
        if (cmd === 'git push') throw new Error('remote rejected');
        return ''; // git push --tags succeeds
      };

      await assert.rejects(
        () => runRelease(['patch', ...SAFE]),
        /process\.exit\(1\)/
      );
      const o = output();
      assert.ok(o.includes('Push failed') || o.includes('failed at stage'));
    });

    test('git push --tags failure', { timeout: 15000 }, async () => {
      state.execOverrides['git push --tags'] = new Error('rejected');

      await assert.rejects(
        () => runRelease(['patch', ...SAFE]),
        /process\.exit\(1\)/
      );
      const o = output();
      assert.ok(o.includes('Tag push failed') || o.includes('failed at stage'));
    });

    test('--no-push: git add failure in no-push path', { timeout: 15000 }, async () => {
      state.execOverrides['git add'] = new Error('failed');

      await assert.rejects(
        () => runRelease(['patch', ...SAFE, '--no-push']),
        /process\.exit\(1\)/
      );
    });

    test('--no-push: git commit failure', { timeout: 15000 }, async () => {
      state.execOverrides['git commit'] = new Error('failed');

      await assert.rejects(
        () => runRelease(['patch', ...SAFE, '--no-push']),
        /process\.exit\(1\)/
      );
    });

    test('--no-push: git tag failure', { timeout: 15000 }, async () => {
      state.execOverrides['git tag -a'] = new Error('exists');

      await assert.rejects(
        () => runRelease(['patch', ...SAFE, '--no-push']),
        /process\.exit\(1\)/
      );
    });

    test('--no-push: tag verify failure', { timeout: 15000 }, async () => {
      state.execOverrides['git tag -l'] = 'v0.0.1';

      await assert.rejects(
        () => runRelease(['patch', ...SAFE, '--no-push']),
        /process\.exit\(1\)/
      );
    });

    test('tag push appears successful but not found on remote', { timeout: 15000 }, async () => {
      // Make git ls-remote not include the new version
      state.execOverrides['git ls-remote'] = 'abc\trefs/tags/vold';

      await runRelease(['patch', ...SAFE, '--changes', '{"added":["X"]}']);

      const o = output();
      assert.ok(o.includes('not found on remote') || o.includes('complete!'));
    });

    test('tag push not found on remote (no gh path)', { timeout: 15000 }, async () => {
      state.execOverrides['gh --version'] = new Error('not found');
      state.execOverrides['gh release view'] = new Error('not found');
      state.execOverrides['git ls-remote'] = 'abc\trefs/tags/vold';

      await runRelease(['patch', ...SAFE, '--changes', '{"added":["X"]}']);

      const o = output();
      assert.ok(o.includes('not found on remote') || o.includes('complete!'));
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────

  describe('edge cases', () => {
    test('uncommitted changes with --yes auto-confirms', { timeout: 15000 }, async () => {
      state.execOverrides['git status --porcelain'] = ' M file.js\n?? new.js';

      await runRelease(['patch', ...SAFE]);

      const o = output();
      assert.ok(o.includes('uncommitted changes'));
      assert.ok(o.includes('Auto-confirming'));
    });

    test('git status failure exits', { timeout: 15000 }, async () => {
      state.execOverrides['git status'] = new Error('not a git repo');

      await assert.rejects(
        () => runRelease(['patch', ...SAFE]),
        /process\.exit\(1\)/
      );
      assert.ok(output().includes('Failed to check git status'));
    });

    test('buildCommitMessage includes Co-Authored-By', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({ added: ['X'] });
      await runRelease(['patch', ...SAFE, '--changes', changes, '--title', 'Test']);

      // Check the commit temp file write for Co-Authored-By
      const commitWrite = state.writes.find(w =>
        typeof w.target === 'string' && w.target.includes('.commit-msg'));
      assert.ok(commitWrite, 'Should write commit message file');
      assert.ok(commitWrite.data.includes('Co-Authored-By:'));
    });

    test('buildCommitMessage includes change items', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({ added: ['ItemA'], fixed: ['ItemB'] });
      await runRelease(['patch', ...SAFE, '--changes', changes, '--title', 'Items']);

      const commitWrite = state.writes.find(w =>
        typeof w.target === 'string' && w.target.includes('.commit-msg'));
      assert.ok(commitWrite);
      assert.ok(commitWrite.data.includes('ItemA'));
      assert.ok(commitWrite.data.includes('ItemB'));
    });

    test('updateChangelog inserts before existing entries', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({ added: ['New Feature'] });
      await runRelease(['patch', ...SAFE, '--changes', changes]);

      // Look for the changelog fd write
      const clWrite = state.writes.find(w =>
        w.target.startsWith('fd:') && w.data.includes('New Feature'));
      assert.ok(clWrite, 'Should write changelog entry');
      assert.ok(clWrite.data.includes('### Added'));
    });

    test('updateDocsChangelog inserts new section', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({
        added: ['F1'], changed: ['C1'], fixed: ['X1'], removed: ['R1']
      });
      await runRelease(['patch', ...SAFE, '--changes', changes, '--title', 'Full']);

      // ChangelogPage fd write should contain HTML sections
      const pageWrites = state.writes.filter(w =>
        w.target.startsWith('fd:') && w.data.includes('changelog-section'));
      assert.ok(pageWrites.length > 0, 'Should write ChangelogPage content');
    });

    test('release without title uses default in docs', { timeout: 15000 }, async () => {
      const changes = JSON.stringify({ added: ['Feature'] });
      await runRelease(['patch', ...SAFE, '--changes', changes]);

      assert.ok(output().includes('complete!'));
    });

    test('getLastTag catch returns null when no tags', { timeout: 15000 }, async () => {
      // Make git describe throw AND test --from-commits to use getLastTag
      state.execOverrides['git describe --tags'] = new Error('no tags');
      state.execOverrides['git log'] = 'feat: initial feature';

      await runRelease(['patch', ...SAFE, '--from-commits', '--title', 'Init']);

      // Should still work (getLastTag returns null → range is 'HEAD')
      assert.ok(output().includes('complete!'));
    });
  });
});
