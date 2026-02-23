#!/bin/bash
# Generate missing tests based on coverage report
# Usage: ./scripts/generate-missing-tests.sh

set -e

echo "🧪 Generating missing tests based on coverage report..."

# Run tests with coverage
echo "📊 Running tests with coverage..."
npm test -- --coverage > /dev/null 2>&1 || true

# Check if coverage report exists
if [ ! -f coverage/lcov.info ]; then
  echo "❌ Coverage report not found at coverage/lcov.info"
  exit 1
fi

echo "✅ Coverage report found"

# Run Claude Code to generate tests
echo "🤖 Running Claude Code to generate missing tests..."
claude -p "Read the Codecov report at coverage/lcov.info, identify uncovered lines in runtime/, and write targeted tests using node:test. Focus on the top 5 files with lowest coverage. For each file:

1. Identify uncovered lines and branches
2. Write focused unit tests that cover those lines
3. Use descriptive test names following the pattern: 'test(\"should ...\", () => { ... })'
4. Follow existing test patterns in test/ directory
5. Import only what's needed from the module under test
6. Use node:assert for assertions
7. Run the new tests to verify they pass

After generating tests, report:
- Which files were improved
- How many new tests were added
- The coverage improvement percentage

Save a summary to coverage-fix-report.md" \
--allowedTools "Read,Write,Edit,Bash,Grep,Glob"

# Run tests again to verify
echo "✅ Running tests to verify new tests pass..."
npm test

# Show coverage improvement
echo "📊 Generating updated coverage report..."
npm test -- --coverage

echo "✅ Done! Check coverage-fix-report.md for details."
