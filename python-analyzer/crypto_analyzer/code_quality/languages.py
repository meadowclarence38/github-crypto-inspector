"""Language and dependency analyzer: detect languages (Solidity, Rust, etc.)."""
from typing import Any, Dict

from ..github_client import with_rate_limit


def fetch_language_metrics(repo) -> Dict[str, Any]:
    """
    Detect languages used in repo (GitHub languages API).
    """
    out: Dict[str, Any] = {
        "languages": {},
        "primary_language": None,
        "has_solidity": False,
        "has_rust": False,
        "language_count": 0,
    }
    try:
        langs = with_rate_limit(lambda: repo.get_languages())
    except Exception:
        return out
    out["languages"] = dict(langs)
    out["language_count"] = len(langs)
    if langs:
        out["primary_language"] = max(langs, key=langs.get)
    out["has_solidity"] = "Solidity" in langs
    out["has_rust"] = "Rust" in langs
    return out
