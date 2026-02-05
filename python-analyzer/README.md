# Crypto Repository Analyzer (Python CLI)

Python CLI tool for analyzing cryptocurrency projects via their GitHub repositories. Helps evaluate legitimacy, activity, and originality—especially distinguishing **original** projects from **forks** with minimal changes (potential scams).

## Requirements

- Python 3.9+
- GitHub token (optional but recommended for higher rate limits)

## Install

```bash
cd python-analyzer
pip install -r requirements.txt
```

For editable install from repo root:

```bash
pip install -e ./python-analyzer
```

## Usage

**Basic (single repo, console output):**
```bash
python -m crypto_analyzer ethereum/go-ethereum
# or
python -m crypto_analyzer https://github.com/bitcoin/bitcoin
```

You will be prompted for a GitHub token if not provided (press Enter to skip and use unauthenticated requests).

**With token:**
```bash
python -m crypto_analyzer --token YOUR_GITHUB_TOKEN bitcoin/bitcoin
# or set env: export GITHUB_TOKEN=...
```

**Output formats:**
```bash
python -m crypto_analyzer -o json bitcoin/bitcoin -f report.json
python -m crypto_analyzer -o csv ethereum/go-ethereum -f report.csv
```

**Commit history chart (Matplotlib):**
```bash
python -m crypto_analyzer -c ethereum/go-ethereum
# creates commit_history.png
```

**Comparison mode (2+ repos):**
```bash
python -m crypto_analyzer --compare bitcoin/bitcoin ethereum/go-ethereum solana-labs/solana -o console
python -m crypto_analyzer --compare repo1 repo2 -o csv -f comparison.csv
python -m crypto_analyzer --compare repo1 repo2 --fork-graph   # fork_tree.png
```

**Web UI (paste link, choose checks):**

From the **repo root** (e.g. `github-crypto-inspector/`):
```bash
cd /path/to/github-crypto-inspector
./run-web.sh
```

Or from **inside** `python-analyzer`:
```bash
cd /path/to/github-crypto-inspector/python-analyzer
pip install -r requirements.txt   # once; includes fastapi, uvicorn
python3 run_web.py
```
On macOS use `python3` if `python` is not available. If you have a venv: `source .venv/bin/activate` then `python run_web.py`.

Then open **http://127.0.0.1:8000** — paste a GitHub repo URL, select which checks to run, and click Analyze.

**Sentiment analysis (issue/discussion text, TextBlob):**
```bash
python -m crypto_analyzer --sentiment owner/repo
```

**Verbose / include raw in JSON:**
```bash
python -m crypto_analyzer -v owner/repo
python -m crypto_analyzer -o json --include-raw owner/repo
```

## What it does

- **Core metrics:** Activity (commits per week/month, last commit), contributors (count, top list), popularity (stars, forks, watchers vs benchmarks).
- **Fork vs original:** Detects fork, parent repo, unique commits, originality ratio. **File-level diff** (Git tree + difflib) for content originality. Flags low-originality forks as potential scams.
- **Template scanner:** Scans code for OpenZeppelin, ERC-20, and other common templates; flags high similarity.
- **Snyk (dependencies):** If `SNYK_TOKEN` and `SNYK_ORG_ID` are set, parses package.json/requirements.txt/Cargo.toml and queries Snyk REST API for package vulnerabilities. Red-flag if high/critical vulns found.
- **AI/ML scan:** Scans for AI/ML-related code (transformers, torch, langchain, etc.) as a 2026 trend signal.
- **Code quality:** Languages (Solidity, Rust, etc.), dependency files, open/closed issues and PRs, security labels, releases and changelog.
- **Red flags:** No commits in 6+ months, &lt;3 contributors, low stars/forks, fork with low originality, template-heavy code, Snyk high/critical vulns, unresolved security issues, missing changelog.
- **Recommendations:** Short list of actions and positive signals (e.g. original repo with many commits, diverse stack).
- **Visualizations:** Commit history line chart (Matplotlib), fork/repo relationship graph (NetworkX) in comparison mode.
- **Optional:** Sentiment on issue text (TextBlob), comparison of multiple repos (console/JSON/CSV).

### Snyk setup

1. Create a [Snyk](https://snyk.io) account and obtain an API token (Account Settings → API token).
2. Get your **Organization ID** from Snyk (Organization Settings → General).
3. Set env vars: `export SNYK_TOKEN=...` and `export SNYK_ORG_ID=...`.  
   Snyk API access may require a paid plan; without them, the tool still runs and suggests local `npm audit` / `cargo audit`.

## Testing

From the `python-analyzer` directory with a venv and dependencies installed:

```bash
# 1. Quick run (no token – may hit rate limit on first call)
python -m crypto_analyzer ethereum/go-ethereum

# 2. With GitHub token (recommended for multiple runs)
export GITHUB_TOKEN=your_github_token
python -m crypto_analyzer bitcoin/bitcoin

# 3. Output to JSON and generate commit chart
python -m crypto_analyzer -o json -f report.json -c ethereum/go-ethereum

# 4. Compare two repos
python -m crypto_analyzer --compare bitcoin/bitcoin ethereum/go-ethereum -o console

# 5. Snyk (only if you have SNYK_TOKEN + SNYK_ORG_ID)
export SNYK_TOKEN=...
export SNYK_ORG_ID=...
python -m crypto_analyzer ethereum/go-ethereum   # will include Snyk vuln check

# 6. Run the test script (smoke test)
./test_analyzer.sh
```

Or use the test script (see below).

## Rate limits

The tool uses `time.sleep` between some API calls and retries once on `RateLimitExceededException`. For heavy use, provide a GitHub token (Settings → Developer settings → Personal access tokens).
