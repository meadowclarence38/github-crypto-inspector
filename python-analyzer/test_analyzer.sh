#!/usr/bin/env bash
# Smoke test for the crypto repo analyzer. Run from python-analyzer/.

set -e
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python3}"
if [ -d .venv ]; then
  PYTHON=".venv/bin/python"
fi

echo "=== Help ==="
"$PYTHON" -m crypto_analyzer --help

echo ""
echo "=== Parse repo input (owner/repo) ==="
"$PYTHON" -c "
from crypto_analyzer.github_client import parse_repo_input
assert parse_repo_input('ethereum/go-ethereum') == ('ethereum', 'go-ethereum')
assert parse_repo_input('https://github.com/bitcoin/bitcoin') == ('bitcoin', 'bitcoin')
print('parse_repo_input OK')
"

echo ""
echo "=== Snyk client (no token) ==="
"$PYTHON" -c "
from crypto_analyzer.snyk_client import fetch_snyk_vulnerabilities, parse_npm_deps
r = fetch_snyk_vulnerabilities(None, None, {'package.json': '{\"dependencies\":{\"lodash\":\"^4.17.0\"}}'})
assert r['enabled'] == False
assert parse_npm_deps('{\"dependencies\":{\"a\":\"1.0.0\"}}') == [('a', '1.0.0')]
print('Snyk (no token) OK')
"

echo ""
echo "=== Report build (mock data) ==="
"$PYTHON" -c "
from crypto_analyzer.report import build_report, report_console
mock = {
    'full_name': 'test/repo',
    'html_url': 'https://github.com/test/repo',
    'description': 'Test',
    'activity': {'total_commits': 100, 'last_commit_date': '2024-01-01T00:00:00Z'},
    'contributors': {'unique_contributors': 5},
    'popularity': {'stars': 1000},
    'fork': {'is_fork': False},
    'template_scan': {},
    'issues_prs': {},
    'releases': {},
    'dependencies': {},
}
report = build_report(mock)
assert 'red_flags' in report
assert 'recommendations' in report
text = report_console(report)
assert 'test/repo' in text
print('Report OK')
"

echo ""
echo "=== Live run (1 repo, console) – requires network ==="
echo "Set GITHUB_TOKEN to avoid prompt. Skipping if NO_NETWORK=1."
if [ "${NO_NETWORK}" = "1" ]; then
  echo "Skipped (NO_NETWORK=1)."
else
  "$PYTHON" -m crypto_analyzer ethereum/go-ethereum 2>&1 | head -80
fi

echo ""
echo "=== Done ==="
