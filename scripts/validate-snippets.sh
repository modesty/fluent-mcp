#!/usr/bin/env bash
#
# validate-snippets.sh — Validate that all Fluent API snippets compile
# against the installed @servicenow/sdk via `now-sdk build`.
#
# Usage:
#   bash scripts/validate-snippets.sh              # validate all snippets
#   bash scripts/validate-snippets.sh ai-agent     # validate only ai-agent snippets
#   bash scripts/validate-snippets.sh --changed    # validate only git-changed snippets
#
set -euo pipefail

# This script lives in scripts/; the repo root (res/, node_modules/,
# coverage/) is one level up.
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SNIPPET_DIR="$PROJECT_ROOT/res/snippet"
NODE_MODULES="$PROJECT_ROOT/node_modules"
WORK_DIR=""
FILTER="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Counters
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

# Report file (coverage/snippet-validation.md)
REPORT_FILE="$PROJECT_ROOT/coverage/snippet-validation.md"
PASS_LIST=()
FAIL_LIST=()
SKIP_LIST=()

# ── Setup skeleton project ──────────────────────────────────────────
setup_skeleton() {
  WORK_DIR="$(mktemp -d /tmp/fluent-snippet-validate-XXXXX)"

  mkdir -p "$WORK_DIR/src/fluent"

  configure_scope "global" "global"

  cat > "$WORK_DIR/package.json" << 'JSON'
{
  "name": "snippet-test",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@servicenow/sdk": "4.14.0"
  }
}
JSON

  # Symlink node_modules to avoid reinstalling
  ln -s "$NODE_MODULES" "$WORK_DIR/node_modules"
}

configure_scope() {
  local scope="$1"
  local scope_id="$2"

  cat > "$WORK_DIR/now.config.json" << 'JSON'
{
  "scope": "__SCOPE__",
  "scopeId": "__SCOPE_ID__",
  "fluentDir": "src/fluent",
  "clientDir": ""
}
JSON
  sed -i.bak \
    -e "s/__SCOPE__/$scope/" \
    -e "s/__SCOPE_ID__/$scope_id/" \
    "$WORK_DIR/now.config.json"
  rm -f "$WORK_DIR/now.config.json.bak"
}

# ── Cleanup ─────────────────────────────────────────────────────────
cleanup() {
  if [[ -n "$WORK_DIR" && -d "$WORK_DIR" ]]; then
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

# ── Extract TypeScript from markdown ────────────────────────────────
# Extracts all ```typescript ... ``` blocks, concatenated with newlines.
extract_typescript() {
  local file="$1"
  awk '
    /^```typescript/ { capture=1; next }
    /^```$/          { if (capture) { capture=0; print "" }; next }
    capture          { print }
  ' "$file"
}

# ── Build a single snippet ──────────────────────────────────────────
build_snippet() {
  local snippet_file="$1"
  local snippet_name
  snippet_name="$(basename "$snippet_file")"

  # Extract code
  local code
  code="$(extract_typescript "$snippet_file")"

  # A snippet builds in global scope unless its code states the app scope it
  # assumes with a line `// App scope: <scope>`. The build checks table and
  # column name prefixes against the scope (`u_` in global, `<scope>_` in an
  # `x_` scope), so the marker is a precondition the reader needs too.
  local scope
  scope="$(printf '%s\n' "$code" | sed -n 's|^// App scope: \([a-z0-9_]*\).*|\1|p' | head -1)"
  if [[ -n "$scope" && "$scope" != "global" ]]; then
    configure_scope "$scope" "0123456789abcdef0123456789abcdef"
  else
    configure_scope "global" "global"
  fi

  # Skip if no typescript block found
  if [[ -z "$code" ]]; then
    printf "  ${YELLOW}[SKIP]${NC} %s (no typescript block)\n" "$snippet_name"
    SKIPPED=$((SKIPPED + 1))
    SKIP_LIST+=("$snippet_name|no typescript block")
    return 0
  fi

  # Write to skeleton
  rm -f "$WORK_DIR/src/fluent/"*.now.ts
  rm -rf "${WORK_DIR:?}/dist"
  echo "$code" > "$WORK_DIR/src/fluent/snippet.now.ts"

  # Build
  local output
  local exit_code=0
  output="$(npx now-sdk build "$WORK_DIR" 2>&1)" || exit_code=$?

  # A build can succeed yet write an unresolved value into the XML, e.g.
  # Symbol(Now.UNRESOLVED) for a reference the plugins could not resolve, or
  # Symbol(NowAttachShape) for Now.attach() as a column default (SDK 4.14.0).
  local unresolved=""
  if [[ $exit_code -eq 0 ]]; then
    unresolved="$(grep -rl 'Symbol(' "$WORK_DIR/dist" 2>/dev/null | head -1 || true)"
  fi

  if [[ $exit_code -eq 0 && -z "$unresolved" ]]; then
    printf "  ${GREEN}[PASS]${NC} %s\n" "$snippet_name"
    PASSED=$((PASSED + 1))
    PASS_LIST+=("$snippet_name")
  else
    printf "  ${RED}[FAIL]${NC} %s\n" "$snippet_name"
    local first_err
    if [[ -n "$unresolved" ]]; then
      first_err="build wrote an unresolved Symbol(...) value into ${unresolved#$WORK_DIR/}"
      printf "         %s\n" "$first_err"
    else
      # Print only the ERROR lines, strip ANSI codes
      first_err="$(echo "$output" | grep -i "error" | sed 's/\x1b\[[0-9;]*m//g' | head -1)"
      echo "$output" | grep -i "error" | sed 's/\x1b\[[0-9;]*m//g' | while IFS= read -r line; do
        printf "         %s\n" "$line"
      done
    fi
    FAILED=$((FAILED + 1))
    FAIL_LIST+=("$snippet_name|$first_err")
  fi
}

# ── Write markdown report ───────────────────────────────────────────
write_report() {
  mkdir -p "$(dirname "$REPORT_FILE")"
  {
    echo "# Snippet Validation Report"
    echo ""
    echo "Generated by \`scripts/validate-snippets.sh\` against \`@servicenow/sdk@4.14.0\` on $(date -u +"%Y-%m-%dT%H:%M:%SZ")."
    echo ""
    echo "## Summary"
    echo ""
    echo "| Status | Count |"
    echo "|--------|-------|"
    echo "| ✅ Passed | $PASSED |"
    echo "| ❌ Failed | $FAILED |"
    echo "| ⚪ Skipped (no typescript block) | $SKIPPED |"
    echo "| **Total** | **$TOTAL** |"
    echo ""
    if [[ $FAILED -gt 0 ]]; then
      echo "## Failures"
      echo ""
      for entry in "${FAIL_LIST[@]}"; do
        local name="${entry%%|*}"
        local err="${entry#*|}"
        echo "- **$name** — \`$err\`"
      done
      echo ""
    fi
    echo "## Passed (${#PASS_LIST[@]})"
    echo ""
    for name in ${PASS_LIST[@]+"${PASS_LIST[@]}"}; do
      echo "- $name"
    done
    echo ""
    echo "## Skipped (${#SKIP_LIST[@]})"
    echo ""
    # bash 3.2 + set -u: expanding an empty array is an unbound-variable error, so guard it.
    for entry in ${SKIP_LIST[@]+"${SKIP_LIST[@]}"}; do
      local name="${entry%%|*}"
      local reason="${entry#*|}"
      echo "- $name — $reason"
    done
  } > "$REPORT_FILE"
  printf "${CYAN}Report written: ${REPORT_FILE#$PROJECT_ROOT/}${NC}\n"
}

# ── Collect snippet files ───────────────────────────────────────────
collect_snippets() {
  if [[ "$FILTER" == "--changed" ]]; then
    # Only git-changed snippets
    git -C "$PROJECT_ROOT" diff --name-only HEAD -- 'res/snippet/*.md' | while read -r f; do
      echo "$PROJECT_ROOT/$f"
    done
    git -C "$PROJECT_ROOT" diff --cached --name-only -- 'res/snippet/*.md' | while read -r f; do
      echo "$PROJECT_ROOT/$f"
    done
  elif [[ -n "$FILTER" && "$FILTER" != "--"* ]]; then
    # Filter by metadata type pattern
    find "$SNIPPET_DIR" -name "fluent_snippet_${FILTER}*.md" -type f | sort
  else
    # All snippets
    find "$SNIPPET_DIR" -name "fluent_snippet_*.md" -type f | sort
  fi
}

# ── Main ────────────────────────────────────────────────────────────
main() {
  echo ""
  printf "${BOLD}Validating snippets against now-sdk v4.14.0 build...${NC}\n"
  echo ""

  # Verify SDK is available
  if [[ ! -d "$NODE_MODULES/@servicenow/sdk" ]]; then
    echo "ERROR: @servicenow/sdk not found in node_modules" >&2
    exit 1
  fi

  setup_skeleton

  local snippets
  snippets="$(collect_snippets)"

  if [[ -z "$snippets" ]]; then
    echo "No snippets found matching filter: ${FILTER:-all}"
    exit 0
  fi

  while IFS= read -r snippet_file; do
    [[ -z "$snippet_file" ]] && continue
    [[ ! -f "$snippet_file" ]] && continue
    TOTAL=$((TOTAL + 1))
    build_snippet "$snippet_file"
  done <<< "$snippets"

  # Summary
  echo ""
  printf "${BOLD}Results:${NC} "
  printf "${GREEN}%d passed${NC}, " "$PASSED"
  if [[ $FAILED -gt 0 ]]; then
    printf "${RED}%d failed${NC}, " "$FAILED"
  else
    printf "0 failed, "
  fi
  printf "%d skipped, " "$SKIPPED"
  printf "%d total\n" "$TOTAL"
  echo ""

  # Write markdown report (only when running over all snippets)
  if [[ -z "$FILTER" || "$FILTER" == "--changed" ]]; then
    write_report
  fi

  if [[ $FAILED -gt 0 ]]; then
    printf "${RED}Snippet compilation failures detected!${NC}\n"
    exit 1
  fi

  printf "${GREEN}All snippets compile successfully.${NC}\n"
  exit 0
}

main
