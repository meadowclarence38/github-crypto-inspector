"""Release and versioning: list releases, tags; flag missing changelog."""
from typing import Any, Dict, List

from ..github_client import with_rate_limit


def fetch_release_metrics(repo) -> Dict[str, Any]:
    """
    List releases, tags; check for changelog file.
    """
    out: Dict[str, Any] = {
        "releases": [],
        "tags_count": 0,
        "has_changelog": False,
        "changelog_files": [],
        "missing_changelog_flag": False,
    }
    try:
        releases = with_rate_limit(lambda: list(repo.get_releases()[:30]))
        out["releases"] = [
            {
                "tag_name": r.tag_name,
                "name": r.name,
                "published_at": r.published_at.isoformat() if r.published_at else None,
                "prerelease": r.prerelease,
            }
            for r in releases
        ]
    except Exception:
        pass
    try:
        tags = with_rate_limit(lambda: list(repo.get_tags()[:100]))
        out["tags_count"] = len(tags)
    except Exception:
        pass
    changelog_names = ["CHANGELOG", "CHANGELOG.md", "CHANGELOG.rst", "CHANGES", "HISTORY.md"]
    try:
        root = with_rate_limit(lambda: repo.get_contents(""))
        if isinstance(root, list):
            for f in root:
                if f.name.upper() in {c.upper() for c in changelog_names} or "changelog" in f.name.lower():
                    out["changelog_files"].append(f.path)
        out["has_changelog"] = len(out["changelog_files"]) > 0
        out["missing_changelog_flag"] = len(out["releases"]) > 0 and not out["has_changelog"]
    except Exception:
        out["missing_changelog_flag"] = True
    return out
