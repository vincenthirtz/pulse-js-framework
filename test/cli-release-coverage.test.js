/**
 * CLI Release Coverage Boost Tests
 *
 * Tests cli/release.js through runRelease() with various flag combinations.
 * Uses --dry-run to exercise code paths without side effects.
 *
 * @module test/cli-release-coverage
 */
import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { runRelease } from '../cli/release.js';

const SAFE = ['--skip-prompt', '--skip-docs-test', '--yes'];
const DRY = ['--dry-run', ...SAFE];

describe('CLI Release - Coverage Boost', () => {
  let exitMock, logs;

  beforeEach(() => {
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

  function output() {
    return [...logs.log, ...logs.warn, ...logs.error].join('\n');
  }

  // ── Validation ─────────────────────────────────────────────────────
  describe('validation', () => {
    test('no args → usage + exit(1)', async () => {
      await assert.rejects(() => runRelease([]), /process\.exit\(1\)/);
      assert.ok(output().includes('Usage:'));
    });

    test('invalid type → exit(1)', async () => {
      await assert.rejects(() => runRelease(['bogus']), /process\.exit\(1\)/);
    });

    test('empty string type → exit(1)', async () => {
      await assert.rejects(() => runRelease(['']), /process\.exit\(1\)/);
    });

    test('numeric type → exit(1)', async () => {
      await assert.rejects(() => runRelease(['42']), /process\.exit\(1\)/);
    });

    test('PATCH (uppercase) → exit(1)', async () => {
      await assert.rejects(() => runRelease(['PATCH']), /process\.exit\(1\)/);
    });

    test('--help → exit(1) with usage', async () => {
      await assert.rejects(() => runRelease(['--help']), /process\.exit/);
      const o = output();
      assert.ok(o.includes('patch') && o.includes('minor') && o.includes('major'));
    });
  });

  // ── Usage text content ─────────────────────────────────────────────
  describe('usage text', () => {
    test('includes all flags and examples', async () => {
      try { await runRelease([]); } catch {}
      const o = output();
      for (const flag of [
        '--dry-run', '--no-push', '--no-gh-release', '--title', '--skip-prompt',
        '--skip-docs-test', '--from-commits', '--fc', '--yes', '-y',
        '--changes', '--added', '--changed', '--fixed', '--discord-webhook',
        'Examples:', 'pulse release patch'
      ]) {
        assert.ok(o.includes(flag), `Usage should mention ${flag}`);
      }
    });
  });

  // ── Dry-run mode ───────────────────────────────────────────────────
  describe('dry-run', () => {
    test('patch completes', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY]);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      const o = output();
      assert.ok(o.includes('DRY RUN'));
      assert.ok(o.includes('[dry-run]'));
      assert.ok(o.includes('Would update package.json'));
      assert.ok(o.includes('Would update docs/src/state.js'));
    });

    test('minor completes', { timeout: 15000 }, async () => {
      await runRelease(['minor', ...DRY]);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().includes('DRY RUN'));
    });

    test('major completes', { timeout: 15000 }, async () => {
      await runRelease(['major', ...DRY]);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('with --title', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--title', 'Test Title']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().includes('Test Title'));
    });

    test('with --changes JSON (all categories)', { timeout: 15000 }, async () => {
      const json = JSON.stringify({
        added: ['Feat 1', 'Feat 2'], changed: ['Refactor X'],
        fixed: ['Bug 1'], removed: ['Old API']
      });
      await runRelease(['patch', ...DRY, '--changes', json, '--title', 'Full']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      const o = output();
      assert.ok(o.includes('Added:'));
      assert.ok(o.includes('Changed:'));
      assert.ok(o.includes('Fixed:'));
      assert.ok(o.includes('Removed:'));
      assert.ok(o.includes('Would update CHANGELOG.md'));
      assert.ok(o.includes('Would update docs/src/pages/ChangelogPage.js'));
      assert.ok(o.includes('Feat 1'));
      assert.ok(o.includes('Old API'));
    });

    test('with --added and --fixed', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--added', 'A,B', '--fixed', 'X']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      const o = output();
      assert.ok(o.includes('A') && o.includes('B') && o.includes('X'));
      assert.ok(o.includes('- A'));
    });

    test('with --changed and --removed', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--changed', 'C1', '--removed', 'R1']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      const o = output();
      assert.ok(o.includes('C1') && o.includes('R1'));
    });

    test('with --from-commits', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--from-commits']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().match(/commit/i));
    });

    test('with --fc alias', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--fc']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().match(/commit/i));
    });

    test('with --no-push', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--no-push']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().includes('complete'));
    });

    test('with --no-gh-release', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--no-gh-release']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      const o = output();
      assert.ok(
        o.includes('[dry-run] Would create GitHub release') ||
        o.includes('Skipping GitHub release')
      );
    });

    test('with --discord-webhook', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--discord-webhook', 'https://discord.com/api/webhooks/x/y']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().includes('[dry-run] Would send Discord notification'));
    });

    test('empty changes → no CHANGELOG update', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--changes', '{"added":[],"fixed":[]}']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(!output().includes('Would update CHANGELOG.md'));
    });

    test('--changes overrides --added/--fixed', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--changes', '{"added":["From JSON"]}', '--added', 'Ignored']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().includes('From JSON'));
    });

    test('with --from-commits and --title', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--from-commits', '--title', 'Auto']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().includes('Auto'));
    });

    test('both --no-push and --no-gh-release', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--no-push', '--no-gh-release']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('-y alias works', { timeout: 15000 }, async () => {
      await runRelease(['patch', '--dry-run', '--skip-prompt', '--skip-docs-test', '-y']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('shows git commands with [dry-run] prefix', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--added', 'X']);
      const o = output();
      assert.ok(o.includes('[dry-run] git add'));
      assert.ok(o.includes('[dry-run] git commit'));
      assert.ok(o.includes('[dry-run] git tag'));
      assert.ok(o.includes('[dry-run] git push'));
    });

    test('commit message includes Co-Authored-By', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--added', 'Y']);
      assert.ok(output().includes('Co-Authored-By:'));
    });
  });

  // ── Error handling ─────────────────────────────────────────────────
  describe('errors', () => {
    test('invalid --changes JSON → exit(1)', { timeout: 15000 }, async () => {
      await assert.rejects(
        () => runRelease(['patch', '--skip-docs-test', '--yes', '--changes', 'bad']),
        /process\.exit\(1\)/
      );
      assert.ok(output().match(/Invalid JSON/i));
    });

    test('--changes with array JSON → graceful', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--changes', '[]']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('--changes with partial keys → graceful', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--changes', '{"added":["Only this"]}']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      assert.ok(output().includes('Only this'));
    });
  });

  // ── Flag edge cases ────────────────────────────────────────────────
  describe('flag edge cases', () => {
    test('--title without value', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--title']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('--discord-webhook without URL', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--discord-webhook']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('--changes without value', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--changes']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('--added without value', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--added']);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('--skip-docs-test shows skip message', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY]);
      assert.ok(output().includes('Skipping documentation tests'));
    });

    test('multiple flags in mixed order', { timeout: 15000 }, async () => {
      await runRelease([
        'minor', '--no-gh-release', '--title', 'Mix', '--dry-run',
        '--skip-docs-test', '--added', 'X', '--yes', '--skip-prompt', '--no-push'
      ]);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      const o = output();
      assert.ok(o.includes('Mix') && o.includes('X'));
    });
  });

  // ── Version bumping ────────────────────────────────────────────────
  describe('version bumping', () => {
    const vPat = /v(\d+)\.(\d+)\.(\d+)\s*->\s*v(\d+)\.(\d+)\.(\d+)/;

    test('patch increments last digit', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY]);
      const m = output().match(vPat);
      assert.ok(m, 'Should show version transition');
      assert.strictEqual(+m[6], +m[3] + 1);
      assert.strictEqual(m[1], m[4]);
      assert.strictEqual(m[2], m[5]);
    });

    test('minor increments middle, resets patch', { timeout: 15000 }, async () => {
      await runRelease(['minor', ...DRY]);
      const m = output().match(vPat);
      assert.ok(m);
      assert.strictEqual(+m[5], +m[2] + 1);
      assert.strictEqual(m[6], '0');
      assert.strictEqual(m[1], m[4]);
    });

    test('major increments first, resets others', { timeout: 15000 }, async () => {
      await runRelease(['major', ...DRY]);
      const m = output().match(vPat);
      assert.ok(m);
      assert.strictEqual(+m[4], +m[1] + 1);
      assert.strictEqual(m[5], '0');
      assert.strictEqual(m[6], '0');
    });
  });

  // ── Output formatting ─────────────────────────────────────────────
  describe('output format', () => {
    test('shows header, separator, sections, completion', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY, '--added', 'Z']);
      const o = output();
      assert.ok(o.includes('Pulse Release:'));
      assert.ok(o.includes('='.repeat(50)));
      assert.ok(o.includes('Updating files...'));
      assert.ok(o.includes('Git operations...'));
      assert.ok(o.includes('complete!'));
      assert.ok(o.includes('[dry-run] Would create GitHub release'));
    });
  });

  // ── Special characters ─────────────────────────────────────────────
  describe('special characters', () => {
    test('HTML entities in changes', { timeout: 15000 }, async () => {
      const json = JSON.stringify({ added: ['Use <div> & "quotes"'] });
      await runRelease(['patch', ...DRY, '--changes', json]);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('backticks in changes', { timeout: 15000 }, async () => {
      const json = JSON.stringify({ added: ['Support `useEffect` hook'] });
      await runRelease(['patch', ...DRY, '--changes', json]);
      assert.strictEqual(exitMock.mock.callCount(), 0);
    });

    test('20 items across categories', { timeout: 15000 }, async () => {
      const items = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`);
      const json = JSON.stringify({
        added: items.slice(0, 5), changed: items.slice(5, 10),
        fixed: items.slice(10, 15), removed: items.slice(15)
      });
      await runRelease(['patch', ...DRY, '--changes', json]);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      const o = output();
      assert.ok(o.includes('Item 1') && o.includes('Item 20'));
    });
  });

  // ── Auto-confirm ───────────────────────────────────────────────────
  describe('auto-confirm', () => {
    test('--yes auto-confirms uncommitted changes', { timeout: 15000 }, async () => {
      await runRelease(['patch', ...DRY]);
      assert.strictEqual(exitMock.mock.callCount(), 0);
      const o = output();
      if (o.includes('uncommitted changes')) {
        assert.ok(o.includes('Auto-confirming'));
      }
    });
  });
});
