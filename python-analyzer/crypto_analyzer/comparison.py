"""
Comparison mode: analyze 2+ repos and output side-by-side summary.
"""
from typing import Any, Dict, List

from .analyzer import analyze_repo
from .report import build_report
from github import Github


def compare_repos(gh: Github, repo_inputs: List[str]) -> List[Dict[str, Any]]:
    """
    Run analyzer on each repo input; return list of report dicts.
    """
    reports = []
    for inp in repo_inputs:
        data = analyze_repo(gh, inp)
        if data:
            r = build_report(data)
            r["raw"] = data
            reports.append(r)
        else:
            reports.append({
                "repo": {"full_name": inp, "html_url": "", "description": "Failed to fetch"},
                "red_flags": [{"severity": "high", "category": "error", "message": "Could not load repository."}],
                "recommendations": [],
                "metrics": {},
            })
    return reports


def comparison_console(reports: List[Dict[str, Any]]) -> str:
    """
    Side-by-side (block-by-block) console output for 2+ reports.
    """
    lines = []
    lines.append("=" * 70)
    lines.append("COMPARISON MODE – multiple repositories")
    lines.append("=" * 70)
    for i, r in enumerate(reports):
        repo = r.get("repo") or {}
        lines.append(f"\n--- Repo {i + 1}: {repo.get('full_name')} ---")
        lines.append(f"  URL: {repo.get('html_url')}")
        pop = (r.get("metrics") or {}).get("popularity") or {}
        act = (r.get("metrics") or {}).get("activity") or {}
        fk = (r.get("metrics") or {}).get("fork") or {}
        lines.append(f"  Stars: {pop.get('stars')}  Forks: {pop.get('forks')}  Commits: {act.get('total_commits')}")
        lines.append(f"  Is fork: {fk.get('is_fork')}  Originality: {fk.get('originality_ratio')}")
        lines.append(f"  Red flags: {len(r.get('red_flags') or [])}")
    lines.append("\n" + "=" * 70)
    return "\n".join(lines)


def comparison_csv(reports: List[Dict[str, Any]]) -> str:
    """
    One row per repo for comparison CSV.
    """
    import csv
    import io
    buf = io.StringIO()
    w = csv.writer(buf)
    headers = [
        "full_name", "stars", "forks", "total_commits", "last_commit", "contributors",
        "is_fork", "originality_ratio", "red_flag_count",
    ]
    w.writerow(headers)
    for r in reports:
        repo = r.get("repo") or {}
        metrics = r.get("metrics") or {}
        pop = metrics.get("popularity") or {}
        act = metrics.get("activity") or {}
        contrib = metrics.get("contributors") or {}
        fk = metrics.get("fork") or {}
        w.writerow([
            repo.get("full_name"),
            pop.get("stars"),
            pop.get("forks"),
            act.get("total_commits"),
            act.get("last_commit_date"),
            contrib.get("unique_contributors"),
            fk.get("is_fork"),
            fk.get("originality_ratio"),
            len(r.get("red_flags") or []),
        ])
    return buf.getvalue()
