"""Issue and PR tracker: open/closed counts, labels (bug, security), ratios."""
from typing import Any, Dict, List

from ..github_client import with_rate_limit


def _count_issues(repo, state: str, label_filter: str = None) -> int:
    try:
        if label_filter:
            issues = with_rate_limit(
                lambda: list(repo.get_issues(state=state, labels=[label_filter])[:500])
            )
        else:
            issues = with_rate_limit(lambda: list(repo.get_issues(state=state)[:500]))
        return len(issues)
    except Exception:
        return 0


def fetch_issues_pr_metrics(repo) -> Dict[str, Any]:
    """
    Open/closed issues and PRs; security/bug labels; ratios.
    """
    out: Dict[str, Any] = {
        "open_issues": 0,
        "closed_issues": 0,
        "open_prs": 0,
        "closed_prs": 0,
        "open_security_labels": 0,
        "open_bug_labels": 0,
        "unresolved_security_flag": False,
    }
    try:
        out["open_issues"] = repo.open_issues_count  # GitHub includes PRs in this
        # Get actual PR count
        prs_open = with_rate_limit(lambda: list(repo.get_pulls(state="open")[:300]))
        prs_closed = with_rate_limit(lambda: list(repo.get_pulls(state="closed")[:100]))
        out["open_prs"] = len(prs_open)
        out["closed_prs"] = len(prs_closed)
    except Exception:
        pass

    try:
        open_security = _count_issues(repo, "open", "security")
        open_bug = _count_issues(repo, "open", "bug")
        out["open_security_labels"] = open_security
        out["open_bug_labels"] = open_bug
        out["unresolved_security_flag"] = open_security > 0
    except Exception:
        pass
    return out
