"""
Main analyzer: fetch repo, run all metrics, fork detection, template scan, code quality.
Returns one aggregated data dict for report and visualization.
"""
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from github import Github, GithubException

from .config import INACTIVITY_MONTHS_RED_FLAG, MIN_ACTIVE_CONTRIBUTORS
from .github_client import parse_repo_input, with_rate_limit
from .metrics import fetch_activity_metrics, fetch_contributor_metrics, fetch_popularity_metrics
from .fork_detection import fetch_fork_metrics
from .template_scanner import scan_template_similarity
from .ai_ml_scanner import scan_ai_ml
from .code_quality import (
    fetch_language_metrics,
    fetch_dependency_metrics,
    fetch_issues_pr_metrics,
    fetch_release_metrics,
)


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


# All available analysis modules (for selective runs, e.g. web UI).
ANALYZER_MODULES = [
    "activity",
    "contributors",
    "popularity",
    "fork",
    "template_scan",
    "ai_ml_scan",
    "languages",
    "dependencies",
    "issues_prs",
    "releases",
]


def analyze_repo(
    gh: Github,
    repo_input: str,
    only_modules: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Parse repo input, get repo, run analyses. If only_modules is set, run just those;
    otherwise run all. Returns aggregated data.
    """
    parsed = parse_repo_input(repo_input)
    if not parsed:
        return None
    owner, repo_name = parsed
    try:
        repo = with_rate_limit(lambda: gh.get_repo(f"{owner}/{repo_name}"))
    except GithubException:
        return None

    want = set(only_modules) if only_modules else set(ANALYZER_MODULES)
    # Always fetch basic repo info and license
    try:
        lic = with_rate_limit(lambda: repo.get_license())
        license_info = {"key": lic.license.key, "name": lic.license.name} if lic and lic.license else None
    except Exception:
        license_info = None
    data: Dict[str, Any] = {
        "repo_input": repo_input,
        "full_name": repo.full_name,
        "html_url": repo.html_url,
        "description": repo.description,
        "default_branch": repo.default_branch,
        "created_at": repo.created_at.isoformat() if repo.created_at else None,
        "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
        "license": license_info,
    }

    if "activity" in want:
        data["activity"] = fetch_activity_metrics(repo)
        time.sleep(0.3)
    if "contributors" in want:
        data["contributors"] = fetch_contributor_metrics(repo)
        time.sleep(0.3)
    if "popularity" in want:
        data["popularity"] = fetch_popularity_metrics(repo)
        time.sleep(0.3)
    if "fork" in want:
        data["fork"] = fetch_fork_metrics(repo)
        time.sleep(0.3)
    if "template_scan" in want:
        data["template_scan"] = scan_template_similarity(repo)
        time.sleep(0.3)
    if "ai_ml_scan" in want:
        data["ai_ml_scan"] = scan_ai_ml(repo)
        time.sleep(0.2)
    if "languages" in want:
        data["languages"] = fetch_language_metrics(repo)
        time.sleep(0.2)
    if "dependencies" in want:
        data["dependencies"] = fetch_dependency_metrics(repo)
        time.sleep(0.2)
    if "issues_prs" in want:
        data["issues_prs"] = fetch_issues_pr_metrics(repo)
        time.sleep(0.2)
    if "releases" in want:
        data["releases"] = fetch_release_metrics(repo)
        time.sleep(0.2)

    return data
