#!/usr/bin/env bash
# Run before submitting. Rule 8 of the hackathon requires that no credentials
# leave with the repository, and a failed check there is a disqualification
# rather than a deduction.
set -uo pipefail
cd "$(dirname "$0")/.."

hits=$(git ls-files -z | xargs -0 grep -nEI \
  'sk-ant-[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{30,}|(api[_-]?key|secret|token|password)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9_-]{16,}' \
  2>/dev/null || true)

if [ -n "$hits" ]; then
  echo "FAIL: possible credentials in tracked files"
  echo "$hits"
  exit 1
fi
echo "OK: no credentials found in tracked files"
