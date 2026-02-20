#!/bin/bash
# Validates that every agent spec has all required sections.

REQUIRED_SECTIONS=(
  "## Role"
  "## Preconditions"
  "## Context Lineage"
  "## Responsibilities"
  "## Output Format"
  "## Prohibited Actions"
)

AGENTS_DIR="$(dirname "$0")/../agents"
PASS=true

shopt -s nullglob
for agent_file in "$AGENTS_DIR"/*.md; do
  agent_name=$(basename "$agent_file")
  echo "Checking $agent_name..."
  for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -q "$section" "$agent_file"; then
      echo "  ✗ MISSING: $section"
      PASS=false
    else
      echo "  ✓ $section"
    fi
  done
done

if $PASS; then
  echo ""
  echo "All agent specs are valid."
  exit 0
else
  echo ""
  echo "Validation failed. Fix missing sections above."
  exit 1
fi
