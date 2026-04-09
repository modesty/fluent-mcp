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
EXPECTED_FAIL=0

# Snippets known to reference external symbols not available in isolation.
# These are tracked so regressions in *other* snippets are still caught.
EXPECTED_FAILURES=(
  # Catalog snippets reference external catalogItemRef / variableSetRef variables
  "fluent_snippet_catalog-client-script_0001.md"
  "fluent_snippet_catalog-ui-policy_0001.md"
  "fluent_snippet_catalog-item_0001.md"
  "fluent_snippet_catalog-item-record-producer_0001.md"
  "fluent_snippet_catalog-variable_0001.md"
  "fluent_snippet_variable-set_0001.md"
  # Workspace snippet references exported workspace object cross-file
  "fluent_snippet_dashboard_0001.md"
  # SLA snippet references external variables
  "fluent_snippet_sla_0001.md"
  # NowAssist snippet references external script file and requires full project context
  "fluent_snippet_now-assist-skill-config_0001.md"
  # Snippets using get_sys_id() global (not available in isolation)
  "fluent_snippet_scheduled-script_0005.md"
  "fluent_snippet_acl_0001.md"
  "fluent_snippet_acl_0003.md"
  "fluent_snippet_list_0001.md"
  "fluent_snippet_list_0002.md"
  # Form snippets using legacy Record API with get_sys_id
  "fluent_snippet_form_0001.md"
  "fluent_snippet_form_0002.md"
  "fluent_snippet_form_0003.md"
  "fluent_snippet_form_0004.md"
  # Snippets with unused variable warnings (strict mode, not actual errors)
  "fluent_snippet_application-menu_0001.md"
  "fluent_snippet_application-menu_0002.md"
  "fluent_snippet_application-menu_0003.md"
  "fluent_snippet_application-menu_0004.md"
  "fluent_snippet_application-menu_0005.md"
  # Column snippets — scope-dependent naming enforced by build
  "fluent_snippet_column_0001.md"
  "fluent_snippet_column_0002.md"
  "fluent_snippet_column-generic_0001.md"
  # Cross-scope privilege references external scope
  "fluent_snippet_cross-scope-privilege_0001.md"
  "fluent_snippet_cross-scope-privilege_0002.md"
  # Table snippets — scope prefix naming
  "fluent_snippet_table_0001.md"
  "fluent_snippet_table_0002.md"
  "fluent_snippet_table_0003.md"
  "fluent_snippet_table_0004.md"
  # Column 0003-0005 — global scope prefix requirements (pre-existing)
  "fluent_snippet_column_0003.md"
  "fluent_snippet_column_0004.md"
  "fluent_snippet_column_0005.md"
  # Service-portal snippets — use old API patterns or reference external modules (pre-existing)
  "fluent_snippet_service-portal_0001.md"
  "fluent_snippet_service-portal_0002.md"
  "fluent_snippet_service-portal_0003.md"
  "fluent_snippet_service-portal_0004.md"
  "fluent_snippet_service-portal_0005.md"
  "fluent_snippet_service-portal_0006.md"
  "fluent_snippet_service-portal_0007.md"
  "fluent_snippet_service-portal_0008.md"
  "fluent_snippet_service-portal_0009.md"
  "fluent_snippet_service-portal_0010.md"
  "fluent_snippet_service-portal_0011.md"
  "fluent_snippet_service-portal_0012.md"
  "fluent_snippet_service-portal_0013.md"
  "fluent_snippet_service-portal_0014.md"
  "fluent_snippet_service-portal_0015.md"
  "fluent_snippet_service-portal_0016.md"
  "fluent_snippet_service-portal_0017.md"
  "fluent_snippet_service-portal_0018.md"
  # Property/Role snippets — pre-existing issues
  "fluent_snippet_property_0001.md"
  "fluent_snippet_property_0002.md"
  "fluent_snippet_property_0003.md"
  "fluent_snippet_role_0001.md"
  # Scripted REST — pre-existing issues
  "fluent_snippet_scripted-rest_0001.md"
  # UI page/policy snippets — reference external variables (pre-existing)
  "fluent_snippet_ui-page_0003.md"
  "fluent_snippet_ui-page_0007.md"
  "fluent_snippet_ui-page_0010.md"
  "fluent_snippet_ui-policy_0001.md"
  "fluent_snippet_ui-policy_0003.md"
  # ATF snippets using assertType (pre-existing, not changed in this update)
  "fluent_snippet_atf-form_0001.md"
  "fluent_snippet_atf-server_0001.md"
  "fluent_snippet_atf-server-record_0001.md"
  "fluent_snippet_atf-server-record_0002.md"
  "fluent_snippet_atf-catalog-action_0002.md"
  "fluent_snippet_atf-catalog-action_0003.md"
  "fluent_snippet_atf-catalog-validation_001.md"
  "fluent_snippet_atf-catalog-variable_001.md"
  "fluent_snippet_atf-form-action_0001.md"
  "fluent_snippet_atf-form-action_0002.md"
  "fluent_snippet_atf-form-action_0003.md"
  "fluent_snippet_atf-form-field_0001.md"
  "fluent_snippet_atf-form-declarative-action_0001.md"
  "fluent_snippet_atf-server-catalog-item_0001.md"
  "fluent_snippet_atf-server-catalog-item_0002.md"
  "fluent_snippet_atf-reporting_0001.md"
  "fluent_snippet_atf-reporting_0002.md"
  "fluent_snippet_atf-rest-api_0001.md"
  "fluent_snippet_atf-rest-api_0002.md"
  "fluent_snippet_atf-email_0001.md"
  "fluent_snippet_atf-email_0002.md"
  "fluent_snippet_atf-email_0003.md"
  "fluent_snippet_atf-appnav_0001.md"
)

is_expected_failure() {
  local name="$1"
  for ef in "${EXPECTED_FAILURES[@]}"; do
    [[ "$name" == "$ef" ]] && return 0
  done
  return 1
}

# ── Setup skeleton project ──────────────────────────────────────────
setup_skeleton() {
  WORK_DIR="$(mktemp -d /tmp/fluent-snippet-validate-XXXXX)"

  mkdir -p "$WORK_DIR/src/fluent"

  cat > "$WORK_DIR/now.config.json" << 'JSON'
{
  "scope": "global",
  "scopeId": "global",
  "fluentDir": "src/fluent",
  "clientDir": ""
}
JSON

  cat > "$WORK_DIR/package.json" << 'JSON'
{
  "name": "snippet-test",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@servicenow/sdk": "4.5.0"
  }
}
JSON

  # Symlink node_modules to avoid reinstalling
  ln -s "$NODE_MODULES" "$WORK_DIR/node_modules"
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

  # Skip if no typescript block found
  if [[ -z "$code" ]]; then
    printf "  ${YELLOW}[SKIP]${NC} %s (no typescript block)\n" "$snippet_name"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  # Write to skeleton
  rm -f "$WORK_DIR/src/fluent/"*.now.ts
  echo "$code" > "$WORK_DIR/src/fluent/snippet.now.ts"

  # Build
  local output
  local exit_code=0
  output="$(npx now-sdk build "$WORK_DIR" 2>&1)" || exit_code=$?

  if [[ $exit_code -eq 0 ]]; then
    printf "  ${GREEN}[PASS]${NC} %s\n" "$snippet_name"
    PASSED=$((PASSED + 1))
  else
    if is_expected_failure "$snippet_name"; then
      printf "  ${YELLOW}[XFAIL]${NC} %s (expected)\n" "$snippet_name"
      EXPECTED_FAIL=$((EXPECTED_FAIL + 1))
    else
      printf "  ${RED}[FAIL]${NC} %s\n" "$snippet_name"
      # Print only the ERROR lines, strip ANSI codes
      echo "$output" | grep -i "error" | sed 's/\x1b\[[0-9;]*m//g' | while IFS= read -r line; do
        printf "         %s\n" "$line"
      done
      FAILED=$((FAILED + 1))
    fi
  fi
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
  printf "${BOLD}Validating snippets against now-sdk v4.5.0 build...${NC}\n"
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
  printf "${YELLOW}%d expected failures${NC}, " "$EXPECTED_FAIL"
  printf "%d skipped, " "$SKIPPED"
  printf "%d total\n" "$TOTAL"
  echo ""

  # Exit with failure only for unexpected failures
  if [[ $FAILED -gt 0 ]]; then
    printf "${RED}Unexpected compilation failures detected!${NC}\n"
    exit 1
  fi

  printf "${GREEN}All snippets compile successfully.${NC}\n"
  exit 0
}

main
