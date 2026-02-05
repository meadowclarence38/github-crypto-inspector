"""
AI/ML code scanner: detect ML/AI-related code in repo (2026 trend).
Scans for transformers, torch, tensorflow, langchain, etc.
"""
import time
from typing import Any, Dict, List

from github import GithubException

from .config import AI_ML_SIGNATURES
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


def _list_code_paths(repo, path: str = "", limit: int = 150) -> List[str]:
    try:
        items = with_rate_limit(lambda: repo.get_contents(path))
        if not isinstance(items, list):
            items = [items]
    except GithubException:
        return []
    code_ext = {".py", ".js", ".ts", ".rs", ".go", ".sol", ".vy", ".cpp", ".c", ".h", ".ipynb"}
    out: List[str] = []
    dirs: List[str] = []
    for item in items:
        if item.type == "dir":
            dirs.append(item.path)
        elif item.type == "file":
            if any(item.path.lower().endswith(ext) for ext in code_ext):
                out.append(item.path)
    for d in dirs[:8]:
        out.extend(_list_code_paths(repo, d, limit - len(out)))
        if len(out) >= limit:
            break
    return out[:limit]


def scan_ai_ml(repo) -> Dict[str, Any]:
    """
    Scan repo for AI/ML-related code; return counts and list of signatures found.
    """
    out: Dict[str, Any] = {
        "files_scanned": 0,
        "files_with_ai_ml": 0,
        "signatures_found": [],
        "ai_ml_ratio": 0.0,
        "summary": None,
    }
    paths = _list_code_paths(repo)
    out["files_scanned"] = len(paths)
    if not paths:
        out["summary"] = "No code files to scan for AI/ML."
        return out

    found_sigs: List[str] = []
    files_with_any = 0
    for path in paths[:40]:
        content = _get_file_content(repo, path)
        time.sleep(0.08)
        if not content:
            continue
        has_any = False
        for sig in AI_ML_SIGNATURES:
            if sig in content:
                if sig not in found_sigs:
                    found_sigs.append(sig)
                has_any = True
        if has_any:
            files_with_any += 1
    out["files_with_ai_ml"] = files_with_any
    out["signatures_found"] = found_sigs
    if out["files_scanned"] > 0:
        out["ai_ml_ratio"] = round(files_with_any / out["files_scanned"], 4)
    out["summary"] = (
        f"AI/ML signatures in {files_with_any}/{out['files_scanned']} files: {', '.join(found_sigs[:10]) or 'none'}"
    )
    return out
