"""
FastAPI app: paste repo link, choose checks, get report.
"""
import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel

from github import Github, GithubException

from ..analyzer import analyze_repo
from ..github_client import parse_repo_input
from ..report import build_report

app = FastAPI(title="Crypto Repo Analyzer", description="Analyze GitHub crypto repos")

# Option labels for the UI (order preserved)
OPTION_LABELS = [
    ("activity", "Activity (commits, frequency)"),
    ("contributors", "Contributors"),
    ("popularity", "Popularity (stars, forks)"),
    ("fork", "Fork & originality"),
    ("template_scan", "Template scan (ERC-20, OpenZeppelin)"),
    ("ai_ml_scan", "AI/ML code scan"),
    ("languages", "Languages"),
    ("dependencies", "Dependencies (Snyk)"),
    ("issues_prs", "Issues & PRs"),
    ("releases", "Releases & changelog"),
]


class AnalyzeRequest(BaseModel):
    repo: str
    options: List[str]
    github_token: Optional[str] = None


def _get_gh(token: Optional[str] = None):
    token = (token or "").strip() or os.environ.get("GITHUB_TOKEN", "").strip()
    return Github(token) if token else Github()


@app.get("/", response_class=HTMLResponse)
def index():
    return get_index_html()


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    """Avoid 404 in browser tab; no favicon asset."""
    return Response(status_code=204)


@app.post("/api/analyze")
def api_analyze(req: AnalyzeRequest):
    if not (req.repo or "").strip():
        raise HTTPException(status_code=400, detail="Repository URL or owner/repo is required")
    parsed = parse_repo_input(req.repo.strip())
    if not parsed:
        raise HTTPException(
            status_code=400,
            detail="Invalid repo: use owner/repo or a GitHub URL (e.g. https://github.com/ethereum/go-ethereum)",
        )
    valid = set(m[0] for m in OPTION_LABELS)
    options = [o for o in req.options if o in valid] if req.options else list(valid)
    gh = _get_gh(req.github_token)
    try:
        data = analyze_repo(gh, req.repo.strip(), only_modules=options if options else None)
    except GithubException as e:
        status = getattr(e, "status", 0)
        data = getattr(e, "data", None) or {}
        msg = data.get("message", str(e)) if isinstance(data, dict) else str(e)
        msg_lower = msg.lower()
        if status == 403 and ("rate limit" in msg_lower or "rate_limit" in str(data).lower()):
            raise HTTPException(
                status_code=429,
                detail="GitHub rate limit exceeded. Without a token you get 60 requests/hour. Add a GitHub personal access token in the optional field above for 5,000 requests/hour, then try again in a few minutes.",
            )
        raise HTTPException(status_code=400, detail=msg)
    if not data:
        raise HTTPException(status_code=404, detail="Repository not found or not accessible")
    report = build_report(data)
    # Don't include raw (has non-JSON types); frontend only needs repo, metrics, red_flags, recommendations
    return JSONResponse(content=report)


def get_index_html() -> str:
    options_html = "\n".join(
        f'<label><input type="checkbox" name="options" value="{id}" checked> {label}</label>'
        for id, label in OPTION_LABELS
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Crypto Repo Analyzer</title>
  <style>
    * {{ box-sizing: border-box; }}
    body {{ font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 1.5rem; background: #0f172a; color: #e2e8f0; min-height: 100vh; }}
    .container {{ max-width: 720px; margin: 0 auto; }}
    h1 {{ font-size: 1.5rem; margin-bottom: 0.5rem; }}
    .sub {{ color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }}
    label {{ display: block; margin: 0.4rem 0; cursor: pointer; }}
    input[type="text"] {{ width: 100%; padding: 0.6rem; border: 1px solid #334155; border-radius: 6px; background: #1e293b; color: #e2e8f0; font-size: 1rem; }}
    input[type="text"]::placeholder {{ color: #64748b; }}
    fieldset {{ border: 1px solid #334155; border-radius: 8px; padding: 1rem; margin: 1rem 0; background: #1e293b; }}
    legend {{ padding: 0 0.5rem; color: #94a3b8; }}
    button {{ padding: 0.6rem 1.2rem; background: #f59e0b; color: #0f172a; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 1rem; }}
    button:hover {{ background: #fbbf24; }}
    button:disabled {{ opacity: 0.6; cursor: not-allowed; }}
    #result {{ margin-top: 1.5rem; }}
    .report {{ background: #1e293b; border-radius: 8px; padding: 1.25rem; border: 1px solid #334155; }}
    .report h2 {{ font-size: 1.1rem; margin: 1rem 0 0.5rem; color: #f59e0b; }}
    .report h2:first-child {{ margin-top: 0; }}
    .report a {{ color: #f59e0b; }}
    .red-flag {{ background: #7f1d1d; color: #fecaca; padding: 0.4rem 0.6rem; border-radius: 4px; margin: 0.3rem 0; font-size: 0.9rem; }}
    .red-flag .sev {{ font-weight: 600; margin-right: 0.5rem; }}
    .rec {{ color: #86efac; padding: 0.3rem 0; font-size: 0.9rem; }}
    .error {{ color: #fca5a5; background: #7f1d1d; padding: 0.75rem; border-radius: 6px; margin: 1rem 0; }}
    .loading {{ color: #94a3b8; }}
    .muted {{ color: #64748b; font-size: 0.85rem; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>Crypto Repo Analyzer</h1>
    <p class="sub">Paste a GitHub repo link and choose which checks to run.</p>

    <form id="form">
      <label for="repo">Repository (URL or owner/repo)</label>
      <input type="text" id="repo" name="repo" placeholder="https://github.com/ethereum/go-ethereum or ethereum/go-ethereum" required>

      <fieldset>
        <legend>Checks to run</legend>
        <p class="muted" style="margin-bottom: 0.5rem;">
          <button type="button" onclick="document.querySelectorAll('input[name=options]').forEach(c => c.checked = true)">Select all</button>
          <button type="button" onclick="document.querySelectorAll('input[name=options]').forEach(c => c.checked = false)" style="margin-left: 0.5rem; background: #475569;">Deselect all</button>
        </p>
        {options_html}
      </fieldset>

      <label for="token" class="muted">GitHub token (optional; higher rate limits)</label>
      <input type="text" id="token" name="token" placeholder="Leave empty to use unauthenticated requests" autocomplete="off">

      <button type="submit" id="btn">Analyze</button>
    </form>

    <div id="result"></div>
  </div>

  <script>
    const form = document.getElementById('form');
    const result = document.getElementById('result');
    const btn = document.getElementById('btn');

    form.addEventListener('submit', async (e) => {{
      e.preventDefault();
      const repo = document.getElementById('repo').value.trim();
      const token = document.getElementById('token').value.trim();
      const options = Array.from(document.querySelectorAll('input[name="options"]:checked')).map(c => c.value);
      result.innerHTML = '<p class="loading">Analyzing… This may take a minute.</p>';
      btn.disabled = true;
      try {{
        const res = await fetch('/api/analyze', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ repo, options, github_token: token || undefined }})
        }});
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || res.statusText);
        result.innerHTML = renderReport(data);
      }} catch (err) {{
        result.innerHTML = '<div class="error">' + (err.message || 'Request failed') + '</div>';
      }}
      btn.disabled = false;
    }});

    function renderReport(r) {{
      const repo = r.repo || {{}};
      const metrics = r.metrics || {{}};
      const flags = r.red_flags || [];
      const recs = r.recommendations || [];
      let html = '<div class="report">';
      html += '<h2>Repository</h2>';
      html += '<p><a href="' + (repo.html_url || '') + '" target="_blank" rel="noopener">' + (repo.full_name || '') + '</a></p>';
      if (repo.description) html += '<p class="muted">' + escape(repo.description) + '</p>';
      if (repo.license && repo.license.name) html += '<p class="muted">License: ' + escape(repo.license.name) + '</p>';

      if (metrics.activity) {{
        html += '<h2>Activity</h2><p>Commits (sampled): ' + (metrics.activity.total_commits ?? '—') + ', Last: ' + (metrics.activity.last_commit_date || '—') + ', Commits/week: ' + (metrics.activity.commits_per_week ?? '—') + '</p>';
      }}
      if (metrics.contributors) {{
        html += '<h2>Contributors</h2><p>Unique: ' + (metrics.contributors.unique_contributors ?? '—') + '</p>';
      }}
      if (metrics.popularity) {{
        html += '<h2>Popularity</h2><p>Stars: ' + (metrics.popularity.stars ?? '—') + ', Forks: ' + (metrics.popularity.forks ?? '—') + '</p>';
      }}
      if (metrics.fork) {{
        const f = metrics.fork;
        html += '<h2>Fork & originality</h2><p>Is fork: ' + f.is_fork + (f.parent_full_name ? ', Parent: ' + f.parent_full_name : '') + (f.originality_ratio != null ? ', Originality: ' + (f.originality_ratio * 100).toFixed(1) + '%' : '') + '</p>';
      }}
      if (metrics.template_scan && (metrics.template_scan.files_scanned || 0) > 0) {{
        html += '<h2>Template scan</h2><p>Similarity: ' + ((metrics.template_scan.template_similarity_ratio || 0) * 100).toFixed(1) + '%, High: ' + (metrics.template_scan.high_template_similarity ? 'yes' : 'no') + '</p>';
      }}
      if (metrics.ai_ml_scan && metrics.ai_ml_scan.files_scanned) {{
        html += '<h2>AI/ML scan</h2><p>Files with AI/ML: ' + (metrics.ai_ml_scan.files_with_ai_ml || 0) + '/' + metrics.ai_ml_scan.files_scanned + '</p>';
      }}
      if (metrics.languages && Object.keys(metrics.languages.languages || {{}}).length) {{
        html += '<h2>Languages</h2><p>' + Object.keys(metrics.languages.languages).join(', ') + '</p>';
      }}
      if (metrics.dependencies) {{
        const d = metrics.dependencies;
        html += '<h2>Dependencies</h2><p>Files: ' + (d.dependency_files || []).join(', ') + (d.snyk && d.snyk.vulnerabilities_found ? ', Snyk vulns: ' + d.snyk.vulnerabilities_found : '') + '</p>';
      }}
      if (metrics.issues_prs) {{
        const i = metrics.issues_prs;
        html += '<h2>Issues & PRs</h2><p>Open issues: ' + (i.open_issues ?? '—') + ', Open PRs: ' + (i.open_prs ?? '—') + '</p>';
      }}
      if (metrics.releases) {{
        html += '<h2>Releases</h2><p>Count: ' + (metrics.releases.releases || []).length + ', Changelog: ' + (metrics.releases.has_changelog ? 'yes' : 'no') + '</p>';
      }}

      html += '<h2>Red flags</h2>';
      if (flags.length) flags.forEach(f => html += '<div class="red-flag"><span class="sev">' + (f.severity || '') + '</span>' + escape(f.message || '') + '</div>');
      else html += '<p class="muted">None</p>';

      html += '<h2>Recommendations</h2>';
      if (recs.length) recs.forEach(rec => html += '<p class="rec">• ' + escape(rec) + '</p>');
      else html += '<p class="muted">None</p>';

      html += '</div>';
      return html;
    }}
    function escape(s) {{
      if (!s) return '';
      const div = document.createElement('div');
      div.textContent = s;
      return div.innerHTML;
    }}
  </script>
</body>
</html>
"""
