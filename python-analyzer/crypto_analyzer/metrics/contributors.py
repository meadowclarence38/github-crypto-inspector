"""Contributor analysis: unique contributors, contributions, top contributors."""
from typing import Any, Dict, List

from github import GithubException

from ..github_client import with_rate_limit


def fetch_contributor_metrics(repo) -> Dict[str, Any]:
    """
    Count unique contributors, their contributions, top contributors.
    """
    out: Dict[str, Any] = {
        "unique_contributors": 0,
        "top_contributors": [],
        "contributions_by_login": {},
    }
    try:
        contribs = with_rate_limit(lambda: list(repo.get_contributors()[:100]))
    except GithubException:
        return out

    out["unique_contributors"] = len(contribs)
    for c in contribs:
        try:
            count = with_rate_limit(lambda: c.contributions)
        except Exception:
            count = 0
        out["contributions_by_login"][c.login] = count

    sorted_contribs = sorted(
        out["contributions_by_login"].items(),
        key=lambda x: -x[1],
    )[:10]
    out["top_contributors"] = [{"login": l, "contributions": n} for l, n in sorted_contribs]
    return out
