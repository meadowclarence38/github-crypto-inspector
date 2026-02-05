"""
Report engine: red flags, recommendations, output to console / JSON / CSV.
"""
import json
import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .config import MIN_ACTIVE_CONTRIBUTORS


def _months_since(dt_str: Optional[str]) -> Optional[float]:
    if not dt_str:
        return None
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        delta = datetime.now(timezone.utc) - dt
        return delta.total_seconds() / (30 * 24 * 3600)
    except Exception:
        return None


def compute_red_flags(data: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    From aggregated analysis data, produce list of red flags.
    """
    flags: List[Dict[str, str]] = []
    activity = data.get("activity") or {}
    contributors = data.get("contributors") or {}
    popularity = data.get("popularity") or {}
    fork = data.get("fork") or {}
    template = data.get("template_scan") or {}
    issues_prs = data.get("issues_prs") or {}
    releases = data.get("releases") or {}

    # No commits in 6+ months
    last_commit = activity.get("last_commit_date")
    months = _months_since(last_commit)
    if months is not None and months >= 6:
        flags.append({
            "severity": "high",
            "category": "activity",
            "message": f"No commits in {int(months)} months (last: {last_commit}).",
        })
    elif months is not None and months >= 3:
        flags.append({
            "severity": "medium",
            "category": "activity",
            "message": f"Low recent activity: last commit {int(months)} months ago.",
        })

    # Few contributors
    unique = contributors.get("unique_contributors") or 0
    if unique < MIN_ACTIVE_CONTRIBUTORS:
        flags.append({
            "severity": "medium",
            "category": "contributors",
            "message": f"Few active contributors ({unique}); top projects usually have 3+.",
        })

    # Popularity below benchmarks
    if popularity.get("below_star_benchmark"):
        flags.append({
            "severity": "low",
            "category": "popularity",
            "message": f"Stars ({popularity.get('stars', 0)}) below typical crypto project benchmark.",
        })
    if popularity.get("below_fork_benchmark") and not fork.get("is_fork"):
        flags.append({
            "severity": "low",
            "category": "popularity",
            "message": f"Forks count ({popularity.get('forks', 0)}) is low.",
        })

    # Fork with low originality
    if fork.get("is_fork") and fork.get("low_originality"):
        ratio = fork.get("originality_ratio") or 0
        flags.append({
            "severity": "high",
            "category": "fork",
            "message": f"Fork with very low originality ({ratio:.1%} unique commits). Possible scam or minimal-change clone.",
        })
    if fork.get("is_fork") and fork.get("parent_full_name"):
        flags.append({
            "severity": "info",
            "category": "fork",
            "message": f"Repository is a fork of {fork['parent_full_name']}.",
        })

    # High template similarity (token fork / copy-paste)
    if template.get("high_template_similarity"):
        flags.append({
            "severity": "high",
            "category": "template",
            "message": "High similarity to common crypto templates (e.g. OpenZeppelin, ERC-20). May be pump-and-dump token.",
        })

    # Unresolved security issues
    if issues_prs.get("unresolved_security_flag"):
        flags.append({
            "severity": "high",
            "category": "security",
            "message": "Open issues labeled 'security' remain unresolved.",
        })

    # Missing changelog with releases
    if releases.get("missing_changelog_flag"):
        flags.append({
            "severity": "low",
            "category": "releases",
            "message": "Releases exist but no CHANGELOG found; transparency could be improved.",
        })

    # No license
    if data.get("license") is None:
        flags.append({
            "severity": "low",
            "category": "license",
            "message": "No detectable license (e.g. MIT, Apache); clarify reuse and liability.",
        })

    # Snyk dependency vulnerabilities
    snyk = (data.get("dependencies") or {}).get("snyk") or {}
    if snyk.get("enabled") and snyk.get("vulnerabilities_found", 0) > 0:
        by_sev = snyk.get("issues_by_severity") or {}
        high_critical = (by_sev.get("high") or 0) + (by_sev.get("critical") or 0)
        if high_critical > 0:
            flags.append({
                "severity": "high",
                "category": "dependencies",
                "message": f"Snyk reported {high_critical} high/critical vulnerability(ies) in dependencies.",
            })
        else:
            flags.append({
                "severity": "medium",
                "category": "dependencies",
                "message": f"Snyk reported {snyk['vulnerabilities_found']} vulnerability(ies) in dependencies.",
            })

    return flags


def compute_recommendations(data: Dict[str, Any], red_flags: List[Dict[str, str]]) -> List[str]:
    """
    Generate recommendations from data and red flags.
    """
    recs: List[str] = []
    if not data:
        return recs

    fork = data.get("fork") or {}
    activity = data.get("activity") or {}
    template = data.get("template_scan") or {}

    if fork.get("low_originality") and fork.get("is_fork"):
        recs.append("Treat as high risk: fork with minimal original changes. Verify team and roadmap.")
    if template.get("high_template_similarity"):
        recs.append("Code appears template-derived; check for custom logic and audits.")
    if _months_since(activity.get("last_commit_date")) and _months_since(activity.get("last_commit_date")) >= 6:
        recs.append("Project appears inactive; confirm if abandoned or maintained elsewhere.")
    if data.get("releases", {}).get("missing_changelog_flag"):
        recs.append("Request a changelog for releases to assess upgrade risk.")
    if data.get("issues_prs", {}).get("unresolved_security_flag"):
        recs.append("Address or triage open security-labeled issues before relying on this repo.")

    # Positive signals
    if not fork.get("is_fork") and (activity.get("total_commits") or 0) > 100:
        recs.append("Original repo with substantial commit history—positive signal.")
    if (data.get("contributors") or {}).get("unique_contributors", 0) >= 10:
        recs.append("Multiple contributors—community involvement is a good sign.")
    if data.get("languages", {}).get("language_count", 0) >= 2:
        recs.append("Diverse tech stack can indicate thoughtful design (e.g. Solana-style).")

    return recs


def build_report(data: Dict[str, Any], include_raw: bool = False) -> Dict[str, Any]:
    """
    Build full report dict with metrics, red_flags, recommendations.
    """
    red_flags = compute_red_flags(data)
    recommendations = compute_recommendations(data, red_flags)
    out = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repo": {
            "full_name": data.get("full_name"),
            "html_url": data.get("html_url"),
            "description": data.get("description"),
            "license": data.get("license"),
        },
        "metrics": {
            "activity": data.get("activity"),
            "contributors": data.get("contributors"),
            "popularity": data.get("popularity"),
        "fork": data.get("fork"),
        "template_scan": data.get("template_scan"),
        "ai_ml_scan": data.get("ai_ml_scan"),
        "languages": data.get("languages"),
            "dependencies": data.get("dependencies"),
            "issues_prs": data.get("issues_prs"),
            "releases": data.get("releases"),
        },
        "red_flags": red_flags,
        "recommendations": recommendations,
    }
    if include_raw:
        out["raw"] = data
    return out


def report_console(report: Dict[str, Any], verbose: bool = False) -> str:
    """
    Format report for console output.
    """
    lines: List[str] = []
    lines.append("=" * 60)
    lines.append("GITHUB CRYPTO REPOSITORY REPORT")
    lines.append("=" * 60)
    repo = report.get("repo") or {}
    lines.append(f"Repository: {repo.get('full_name')}")
    lines.append(f"URL: {repo.get('html_url')}")
    lines.append(f"Description: {repo.get('description') or 'N/A'}")
    lines.append(f"License: {repo.get('license', {}).get('name') if isinstance(repo.get('license'), dict) else repo.get('license') or 'Not detected'}")
    lines.append("")

    metrics = report.get("metrics") or {}
    act = metrics.get("activity") or {}
    lines.append("--- Activity ---")
    lines.append(f"  Total commits (sampled): {act.get('total_commits', 'N/A')}")
    lines.append(f"  Last commit: {act.get('last_commit_date', 'N/A')}")
    lines.append(f"  Commits/week (avg): {act.get('commits_per_week', 'N/A')}")
    lines.append(f"  Commits/month (avg): {act.get('commits_per_month', 'N/A')}")

    contrib = metrics.get("contributors") or {}
    lines.append("--- Contributors ---")
    lines.append(f"  Unique contributors: {contrib.get('unique_contributors', 'N/A')}")
    top = contrib.get("top_contributors") or []
    if top:
        lines.append("  Top: " + ", ".join(f"{t['login']}({t['contributions']})" for t in top[:5]))

    pop = metrics.get("popularity") or {}
    lines.append("--- Popularity ---")
    lines.append(f"  Stars: {pop.get('stars')}  Forks: {pop.get('forks')}  Watchers: {pop.get('watchers')}")

    fk = metrics.get("fork") or {}
    lines.append("--- Fork / Originality ---")
    lines.append(f"  Is fork: {fk.get('is_fork')}")
    if fk.get("parent_full_name"):
        lines.append(f"  Parent: {fk.get('parent_full_name')}")
    if fk.get("originality_ratio") is not None:
        lines.append(f"  Originality ratio: {fk.get('originality_ratio'):.2%}")
    lines.append(f"  Low originality (red flag): {fk.get('low_originality')}")
    fd = fk.get("file_diff") or {}
    if fd:
        lines.append(f"  File-level: originality={fd.get('file_originality_ratio')}, content_originality={fd.get('content_originality_ratio')}, compared={fd.get('files_compared')}")

    tmpl = metrics.get("template_scan") or {}
    lines.append("--- Template scan ---")
    lines.append(f"  Files scanned: {tmpl.get('files_scanned')}")
    lines.append(f"  Template similarity ratio: {tmpl.get('template_similarity_ratio')}")
    lines.append(f"  High template similarity: {tmpl.get('high_template_similarity')}")
    if tmpl.get("template_signatures_found"):
        lines.append(f"  Signatures found: {', '.join(tmpl['template_signatures_found'][:8])}")

    aiml = metrics.get("ai_ml_scan") or {}
    if aiml:
        lines.append("--- AI/ML scan ---")
        lines.append(f"  Files with AI/ML: {aiml.get('files_with_ai_ml')}/{aiml.get('files_scanned')}")
        if aiml.get("signatures_found"):
            lines.append(f"  Signatures: {', '.join(aiml['signatures_found'][:8])}")

    deps = metrics.get("dependencies") or {}
    snyk = deps.get("snyk") or {}
    if snyk:
        lines.append("--- Snyk (dependencies) ---")
        lines.append(f"  Enabled: {snyk.get('enabled')}")
        if snyk.get("packages_checked") is not None:
            lines.append(f"  Packages checked: {snyk.get('packages_checked')}")
        if snyk.get("vulnerabilities_found") is not None:
            lines.append(f"  Vulnerabilities: {snyk.get('vulnerabilities_found')}")
        if snyk.get("issues_by_severity"):
            lines.append(f"  By severity: {snyk.get('issues_by_severity')}")
        if snyk.get("error"):
            lines.append(f"  Note: {snyk.get('error')}")

    lines.append("")
    lines.append("--- Red flags ---")
    for f in report.get("red_flags") or []:
        lines.append(f"  [{f.get('severity', '')}] {f.get('message', '')}")
    if not report.get("red_flags"):
        lines.append("  (none)")

    lines.append("")
    lines.append("--- Recommendations ---")
    for r in report.get("recommendations") or []:
        lines.append(f"  • {r}")
    if not report.get("recommendations"):
        lines.append("  (none)")

    if verbose and report.get("raw"):
        lines.append("")
        lines.append("--- Raw data (excerpt) ---")
        lines.append(json.dumps({k: v for k, v in report["raw"].items() if k != "raw"}, indent=2, default=str)[:2000] + "...")

    lines.append("=" * 60)
    return "\n".join(lines)


def report_json(report: Dict[str, Any], include_raw: bool = False) -> str:
    """
    Output report as JSON. Optionally exclude large raw payload.
    """
    out = {k: v for k, v in report.items() if k != "raw"}
    if include_raw:
        out["raw"] = report.get("raw")
    return json.dumps(out, indent=2, default=str)


def report_csv(report: Dict[str, Any]) -> str:
    """
    Flatten key metrics and red flags into CSV (one row for repo summary, then red flags).
    """
    buf = io.StringIO()
    w = csv.writer(buf)
    repo = report.get("repo") or {}
    metrics = report.get("metrics") or {}
    act = metrics.get("activity") or {}
    contrib = metrics.get("contributors") or {}
    pop = metrics.get("popularity") or {}
    fk = metrics.get("fork") or {}
    tmpl = metrics.get("template_scan") or {}

    w.writerow([
        "full_name", "url", "stars", "forks", "watchers",
        "total_commits", "last_commit_date", "commits_per_week", "commits_per_month",
        "unique_contributors", "is_fork", "parent", "originality_ratio", "low_originality",
        "template_similarity_ratio", "high_template_similarity", "red_flag_count", "recommendations_count",
    ])
    w.writerow([
        repo.get("full_name"), repo.get("html_url"), pop.get("stars"), pop.get("forks"), pop.get("watchers"),
        act.get("total_commits"), act.get("last_commit_date"), act.get("commits_per_week"), act.get("commits_per_month"),
        contrib.get("unique_contributors"), fk.get("is_fork"), fk.get("parent_full_name"),
        fk.get("originality_ratio"), fk.get("low_originality"),
        tmpl.get("template_similarity_ratio"), tmpl.get("high_template_similarity"),
        len(report.get("red_flags") or []), len(report.get("recommendations") or []),
    ])
    w.writerow([])
    w.writerow(["red_flag_severity", "red_flag_category", "red_flag_message"])
    for f in report.get("red_flags") or []:
        w.writerow([f.get("severity"), f.get("category"), f.get("message")])
    return buf.getvalue()
