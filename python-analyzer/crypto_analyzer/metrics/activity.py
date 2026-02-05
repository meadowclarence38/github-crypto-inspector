"""Activity tracking: commit frequency, last commit, total commits."""
from datetime import datetime, timezone
from typing import Any, Dict, List

from github import GithubException

from ..github_client import with_rate_limit


def fetch_activity_metrics(repo) -> Dict[str, Any]:
    """
    Compute commits per week/month, last commit date, total commits.
    Uses commit list (paginated); we sample to avoid burning rate limit.
    """
    out: Dict[str, Any] = {
        "total_commits": None,
        "last_commit_date": None,
        "commits_per_week": None,
        "commits_per_month": None,
        "commit_dates": [],  # for chart: list of (date_str, count) or weekly buckets
    }
    try:
        commits = with_rate_limit(lambda: list(repo.get_commits()[:500]))
    except GithubException:
        return out

    if not commits:
        out["total_commits"] = 0
        return out

    out["total_commits"] = len(commits)
    # Last commit
    last = commits[0]
    out["last_commit_date"] = last.commit.author.date.isoformat() if last.commit.author else None

    # Bucket by week for frequency
    from collections import defaultdict
    week_counts: Dict[str, int] = defaultdict(int)
    month_counts: Dict[str, int] = defaultdict(int)
    for c in commits:
        d = c.commit.author.date if c.commit.author else None
        if not d:
            continue
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        week_key = d.strftime("%Y-%W")
        month_key = d.strftime("%Y-%m")
        week_counts[week_key] += 1
        month_counts[month_key] += 1

    weeks = sorted(week_counts.keys())
    months = sorted(month_counts.keys())
    out["commits_per_week"] = round(sum(week_counts.values()) / max(len(weeks), 1), 1)
    out["commits_per_month"] = round(sum(month_counts.values()) / max(len(months), 1), 1)
    out["commit_dates"] = [
        {"week": w, "count": week_counts[w]} for w in weeks[-52:]
    ]  # last ~52 weeks for chart
    return out
