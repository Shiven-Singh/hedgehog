#!/usr/bin/env bash
# Run before submitting. Rule 8 requires that no credentials leave with the
# repository, and that is checked before scoring, so a hit here is a
# disqualification rather than a deduction.
set -uo pipefail
cd "$(dirname "$0")/.."

PATTERNS='sk-ant-[A-Za-z0-9_-]{10,}'          # Anthropic
PATTERNS+='|AIza[A-Za-z0-9_-]{30,}'           # Google, classic format
PATTERNS+='|AQ\.[A-Za-z0-9_-]{30,}'           # Google, newer format
PATTERNS+='|ghp_[A-Za-z0-9]{30,}'             # GitHub
PATTERNS+='|(api[_-]?key|secret|token|password)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9._-]{16,}'

hits=$(git ls-files -z | xargs -0 grep -nEI "$PATTERNS" 2>/dev/null || true)

if [ -n "$hits" ]; then
  echo "FAIL: possible credentials in tracked files"
  echo "$hits"
  exit 1
fi
echo "OK: no credentials found in tracked files"
