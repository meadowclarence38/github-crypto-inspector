# GitHub Crypto Inspector

**Analyze cryptocurrency projects via their GitHub repositories.** Evaluate legitimacy, activity, and originality—and tell apart original projects from low-effort forks (e.g. token clones).

## 🚀 Version 2.0 - Advanced Analysis

**New in V2.0:**
- **🔀 Fork Originality Score**: Compute % unique code vs parent (flags lazy forks <20%)
- **📊 Activity Dashboard**: Health metrics, commit charts, contributor analysis
- **🛡️ Security Scans**: Issue tracking, vulnerability detection, code quality scores
- **📈 Visual Charts**: Interactive commit history with Recharts
- **🔄 Batch Comparison**: Analyze multiple repos at once, compare side-by-side
- **📥 Export**: Download results as CSV or JSON
- **Enhanced Innovation Score**: Multi-factor analysis combining originality, activity, and security

**Features:**
- **V2 Advanced Analysis** (`/v2/analyze`): Deep insights with fork detection, activity dashboards, security scans
- **Batch Comparison** (`/compare`): Paste multiple GitHub links, get side-by-side comparison table with export
- **V1 Basic Analysis** (`/analyze`): Quick checks for activity, forks, and innovation scoring
- **PoW Detection** (`/inspect`): Scan for Proof-of-Work algorithms (SHA-256, Ethash, RandomX, etc.)
- **Optional Python CLI**: Full analyzer with Snyk, file-level diff, AI/ML scan

---

## Quick start (web)

1. **Use the live site** (when deployed): open the URL and paste a GitHub repo (e.g. `ethereum/go-ethereum` or `https://github.com/bitcoin/bitcoin`).
2. **Run locally**:
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Go to **Analyze**, paste a repo, select checks, and click **Analyze**.

### GitHub token (recommended)

Without a token, GitHub allows **60 requests/hour**; with a token, **5,000/hour**. If you see “rate limit exceeded”, add a token:

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token (classic)**.
2. Name it (e.g. “Crypto Inspector”), choose an expiry, then generate. No extra scopes needed for public repos.
3. **Local**: create `.env.local` in the project root and add:
   ```bash
   GITHUB_TOKEN=your_token_here
   ```
4. **Vercel**: Project → **Settings** → **Environment Variables** → add `GITHUB_TOKEN` with your token.

Never commit the token or paste it in public places.

---

## Deploy to Vercel (website for everyone)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo.
3. Leave **Framework Preset** as Next.js and **Root Directory** as `.` (or leave empty).
4. Add an **Environment Variable**: name `GITHUB_TOKEN`, value = your GitHub personal access token (so the public site can call the GitHub API without hitting the anonymous limit).
5. Deploy. Your site will be at `https://your-project.vercel.app`.

Visitors can paste any public GitHub repo URL and run the checks without installing anything.

---

## What the web app does

- **Repo info**: Name, description, stars, forks, language.
- **Activity**: Commit count, last commit date, commits per week/month; red flag if no commits in 6+ months.
- **Contributors**: Unique contributors and top list; red flag if fewer than 3.
- **Popularity**: Stars/forks vs simple benchmarks.
- **Fork & originality**: Whether the repo is a fork, parent repo, and (when run locally with Python) originality metrics.
- **PoW / template scan**: Scans code for Proof-of-Work algorithms and common crypto templates (e.g. OpenZeppelin, ERC-20); flags high template similarity.
- **Red flags & recommendations**: Summary of risks and suggested next steps.

---

## Project structure

| Path | Description |
|------|-------------|
| `src/app/` | Next.js pages and API routes (web UI + `/api/repo`, `/api/scan`, `/api/analyze`) |
| `src/lib/` | GitHub client and PoW detection (TypeScript) |
| `python-analyzer/` | Optional Python CLI and local web UI (PyGitHub, Snyk, file-level diff, AI/ML scan, Matplotlib) |

The **Vercel deployment uses only the Next.js app** in `src/`. The Python tool is for local/CLI use.

---

## Python analyzer (optional)

For the full feature set (Snyk, file-level diff, AI/ML scan, charts, comparison mode):

```bash
cd python-analyzer
pip install -r requirements.txt
python3 run_web.py   # local web UI at http://127.0.0.1:8000
# or
python3 -m crypto_analyzer ethereum/go-ethereum   # CLI report
```

See [python-analyzer/README.md](python-analyzer/README.md) for details.

---

## Contributing

Contributions are welcome. Open an issue or a pull request on GitHub. For the web app, edit `src/`; for the Python CLI and local web UI, edit `python-analyzer/`.

## License

MIT (or as specified in the repo). Use and adapt as you like; no warranty.
