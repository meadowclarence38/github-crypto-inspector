"""
Code origin scanner: scan for common crypto templates (OpenZeppelin, ERC-20, etc.).
Flag if >90% similarity to known templates/forks.
"""
import time
from typing import Any, Dict, List

from github import GithubException

from .config import CRYPTO_TEMPLATE_SIGNATURES, TEMPLATE_SIMILARITY_RED_FLAG
from .github_client import with_rate_limit


def _get_file_content(repo, path: str) -> str:
    try:
        f = with_rate_limit(lambda: repo.get_contents(path))
        if isinstance(f, list):
            return ""
        import base64
        return base64.b64decode(f.content).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _list_code_paths(repo, path: str = "", limit: int = 200) -> List[str]:
    """Recursively list code file paths (shallow: one level of dirs)."""
    try:
        items = with_rate_limit(lambda: repo.get_contents(path))
        if not isinstance(items, list):
            items = [items]
    except GithubException:
        return []
    code_ext = {".sol", ".vy", ".rs", ".go", ".py", ".js", ".ts", ".c", ".cpp", ".h"}
    out: List[str] = []
    dirs: List[str] = []
    for item in items:
        if item.type == "dir":
            dirs.append(item.path)
        elif item.type == "file":
            if any(item.path.lower().endswith(ext) for ext in code_ext):
                out.append(item.path)
    for d in dirs[:10]:  # limit dirs to avoid rate limit
        out.extend(_list_code_paths(repo, d, limit - len(out)))
        if len(out) >= limit:
            break
    return out[:limit]


def scan_template_similarity(repo) -> Dict[str, Any]:
    """
    Scan repo code for template signatures; compute ratio of template-like content.
    """
    out: Dict[str, Any] = {
        "files_scanned": 0,
        "total_matches": 0,
        "template_signatures_found": [],
        "template_similarity_ratio": 0.0,
        "high_template_similarity": False,
    }
    paths = _list_code_paths(repo)
    out["files_scanned"] = len(paths)
    if not paths:
        return out

    files_with_template = 0
    found_sigs: List[str] = []

    for path in paths[:30]:  # limit to avoid rate limit
        content = _get_file_content(repo, path)
        time.sleep(0.1)  # be nice to API
        if not content:
            continue
        has_any = False
        for sig in CRYPTO_TEMPLATE_SIGNATURES:
            if sig in content:
                has_any = True
                if sig not in found_sigs:
                    found_sigs.append(sig)
        if has_any:
            files_with_template += 1

    out["template_signatures_found"] = found_sigs
    out["files_with_template"] = files_with_template
    if out["files_scanned"] > 0:
        ratio = files_with_template / out["files_scanned"]
        out["template_similarity_ratio"] = round(ratio, 4)
    out["high_template_similarity"] = out["template_similarity_ratio"] >= TEMPLATE_SIMILARITY_RED_FLAG
    return out
