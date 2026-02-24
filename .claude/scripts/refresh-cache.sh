#!/bin/bash
# Refresh cache files for Claude Code token optimization
# Usage: bash .claude/scripts/refresh-cache.sh
# Run periodically or after significant changes

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CACHE_DIR="$HOME/.claude/projects/-Users-Alicia-Documents-Vincent-pulse-js-framework/memory/cache"

mkdir -p "$CACHE_DIR"

echo "Refreshing cache files..."

# === 1. Project Snapshot ===
cat > "$CACHE_DIR/project-snapshot.md" << 'HEADER'
# Project Snapshot
HEADER

echo "Generated: $(date '+%Y-%m-%d %H:%M')" >> "$CACHE_DIR/project-snapshot.md"
echo "" >> "$CACHE_DIR/project-snapshot.md"

# Version
VERSION=$(node -e "console.log(require('$PROJECT_ROOT/package.json').version)" 2>/dev/null || echo "unknown")
echo "## Version: $VERSION" >> "$CACHE_DIR/project-snapshot.md"
echo "## Node: >= 20.0.0" >> "$CACHE_DIR/project-snapshot.md"
echo "## Branch: $(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo 'unknown')" >> "$CACHE_DIR/project-snapshot.md"
echo "" >> "$CACHE_DIR/project-snapshot.md"

# Module counts
echo "## Module Counts" >> "$CACHE_DIR/project-snapshot.md"
RUNTIME_COUNT=$(find "$PROJECT_ROOT/runtime" -type f -name '*.js' 2>/dev/null | wc -l | tr -d ' ')
COMPILER_COUNT=$(find "$PROJECT_ROOT/compiler" -type f -name '*.js' 2>/dev/null | wc -l | tr -d ' ')
CLI_COUNT=$(find "$PROJECT_ROOT/cli" -type f -name '*.js' 2>/dev/null | wc -l | tr -d ' ')
LOADER_COUNT=$(find "$PROJECT_ROOT/loader" -type f -name '*.js' 2>/dev/null | wc -l | tr -d ' ')
TEST_COUNT=$(find "$PROJECT_ROOT/test" -type f \( -name '*.test.js' -o -name '*.test.mjs' \) 2>/dev/null | wc -l | tr -d ' ')
echo "- Runtime: $RUNTIME_COUNT modules" >> "$CACHE_DIR/project-snapshot.md"
echo "- Compiler: $COMPILER_COUNT modules" >> "$CACHE_DIR/project-snapshot.md"
echo "- CLI: $CLI_COUNT modules" >> "$CACHE_DIR/project-snapshot.md"
echo "- Loaders: $LOADER_COUNT integrations" >> "$CACHE_DIR/project-snapshot.md"
echo "- Tests: $TEST_COUNT test files" >> "$CACHE_DIR/project-snapshot.md"
echo "" >> "$CACHE_DIR/project-snapshot.md"

# Key files with sizes
echo "## Key Files (lines)" >> "$CACHE_DIR/project-snapshot.md"
for f in runtime/pulse.js runtime/dom.js runtime/dom-list.js runtime/router.js runtime/store.js runtime/context.js runtime/form.js runtime/async.js runtime/http.js runtime/websocket.js runtime/a11y.js runtime/ssr.js runtime/devtools.js compiler/lexer.js compiler/transformer.js cli/index.js; do
  if [ -f "$PROJECT_ROOT/$f" ]; then
    LINES=$(wc -l < "$PROJECT_ROOT/$f" | tr -d ' ')
    echo "- $f ($LINES)" >> "$CACHE_DIR/project-snapshot.md"
  fi
done
echo "" >> "$CACHE_DIR/project-snapshot.md"

# Recent commits
echo "## Recent Commits" >> "$CACHE_DIR/project-snapshot.md"
git -C "$PROJECT_ROOT" log --oneline -10 2>/dev/null >> "$CACHE_DIR/project-snapshot.md" || echo "- No git history" >> "$CACHE_DIR/project-snapshot.md"

echo "  -> project-snapshot.md updated"

# === 2. Test Status ===
cat > "$CACHE_DIR/test-status.md" << 'HEADER'
# Test Status
HEADER

echo "Updated: $(date '+%Y-%m-%d %H:%M')" >> "$CACHE_DIR/test-status.md"
echo "" >> "$CACHE_DIR/test-status.md"

# Run tests and capture output
echo "## Last Run" >> "$CACHE_DIR/test-status.md"
cd "$PROJECT_ROOT"
TEST_OUTPUT=$(npm test 2>&1 || true)
PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -c "# pass" 2>/dev/null || echo "0")
FAIL_COUNT=$(echo "$TEST_OUTPUT" | grep -c "# fail" 2>/dev/null || echo "0")
TOTAL_SUITES=$(echo "$TEST_OUTPUT" | grep -c "^# Subtest:" 2>/dev/null || echo "?")

# Extract summary from test output
echo "$TEST_OUTPUT" | tail -20 | grep -E "(pass|fail|duration|tests|suites)" >> "$CACHE_DIR/test-status.md" 2>/dev/null || echo "- Run \`npm test\` for details" >> "$CACHE_DIR/test-status.md"
echo "" >> "$CACHE_DIR/test-status.md"

# Known flaky tests
echo "## Known Flaky" >> "$CACHE_DIR/test-status.md"
echo "- graphql-subscriptions (timeout-sensitive)" >> "$CACHE_DIR/test-status.md"
echo "- websocket reconnect (timing-dependent)" >> "$CACHE_DIR/test-status.md"

echo "  -> test-status.md updated"

# === 3. Recent Work ===
cat > "$CACHE_DIR/recent-work.md" << 'HEADER'
# Recent Work
HEADER

echo "Updated: $(date '+%Y-%m-%d %H:%M')" >> "$CACHE_DIR/recent-work.md"
echo "" >> "$CACHE_DIR/recent-work.md"

echo "## Active Branch: $(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null || echo 'unknown')" >> "$CACHE_DIR/recent-work.md"
echo "" >> "$CACHE_DIR/recent-work.md"

# Recent commits with more detail
echo "## Recent Changes" >> "$CACHE_DIR/recent-work.md"
git -C "$PROJECT_ROOT" log --oneline --no-merges -15 2>/dev/null >> "$CACHE_DIR/recent-work.md" || echo "- No git history" >> "$CACHE_DIR/recent-work.md"
echo "" >> "$CACHE_DIR/recent-work.md"

# Files changed recently
echo "## Files Changed (last 5 commits)" >> "$CACHE_DIR/recent-work.md"
git -C "$PROJECT_ROOT" diff --stat HEAD~5..HEAD 2>/dev/null >> "$CACHE_DIR/recent-work.md" || echo "- Unable to diff" >> "$CACHE_DIR/recent-work.md"
echo "" >> "$CACHE_DIR/recent-work.md"

# Open PRs (if gh is available)
if command -v gh &> /dev/null; then
  echo "## Open PRs" >> "$CACHE_DIR/recent-work.md"
  gh pr list --limit 5 2>/dev/null >> "$CACHE_DIR/recent-work.md" || echo "- Unable to list PRs" >> "$CACHE_DIR/recent-work.md"
fi

echo "  -> recent-work.md updated"
echo ""
echo "Cache refresh complete!"
echo "Files: $CACHE_DIR/"
ls -la "$CACHE_DIR/"
