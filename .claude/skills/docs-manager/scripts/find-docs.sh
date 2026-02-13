#!/bin/bash

# Find Documentation Markdown Files
# Finds all .md files in docs/ that should be processed

echo "=== Documentation Markdown Files ==="
echo ""

# Find all .md files, excluding:
# - docs/src/ (documentation website source)
# - docs/adr/ (Architecture Decision Records - keep)
# - docs/milestones/ (planning docs - keep)
# - README.md, CLAUDE.md (project docs - keep)

find docs -name "*.md" \
  -not -path "docs/src/*" \
  -not -path "docs/adr/*" \
  -not -path "docs/milestones/*" \
  -not -name "README.md" \
  -not -name "CLAUDE.md" \
  | sort

echo ""
echo "=== Total files to process ==="
find docs -name "*.md" \
  -not -path "docs/src/*" \
  -not -path "docs/adr/*" \
  -not -path "docs/milestones/*" \
  -not -name "README.md" \
  -not -name "CLAUDE.md" \
  | wc -l | xargs echo "Files:"
