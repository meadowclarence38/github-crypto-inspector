"""
Dependency analyzer: scan for dependency files, simple vulnerability checks.
Snyk API integration when SNYK_TOKEN and SNYK_ORG_ID are set.
"""
import os
from typing import Any, Dict, List

from ..github_client import with_rate_limit
from ..snyk_client import fetch_snyk_vulnerabilities


def _get_file(repo, path: str) -> str:
    try:
        f = with_rate_limit(lambda: repo.get_contents(path))
        if isinstance(f, list):
            return ""
        import base64
        return base64.b64decode(f.content).decode("utf-8", errors="ignore")
    except Exception:
        return ""


# Simple patterns that might indicate risk (placeholder; real checks would use Snyk/OSV)
RISKY_PATTERNS = [
    "eval(",
    "exec(",
    "unsafe",
    "TODO: audit",
]

DEP_FILE_NAMES = [
    "package.json", "package-lock.json", "yarn.lock",
    "Cargo.toml", "Cargo.lock", "go.mod", "go.sum",
    "requirements.txt", "Pipfile", "pyproject.toml",
]


def fetch_dependency_metrics(repo) -> Dict[str, Any]:
    """
    Detect dependency files, run simple checks, and optionally Snyk (SNYK_TOKEN + SNYK_ORG_ID).
    """
    out: Dict[str, Any] = {
        "dependency_files": [],
        "vulnerability_notes": [],
        "risky_patterns_found": [],
        "snyk": None,
    }
    try:
        contents = with_rate_limit(lambda: repo.get_contents(""))
        if not isinstance(contents, list):
            contents = [contents]
        root_files = [c.path for c in contents]
    except Exception:
        return out

    dep_file_contents: Dict[str, str] = {}
    for name in DEP_FILE_NAMES:
        if name in root_files:
            out["dependency_files"].append(name)
            content = _get_file(repo, name)
            dep_file_contents[name] = content
            for pat in RISKY_PATTERNS:
                if pat in content:
                    out["risky_patterns_found"].append(f"{name}: {pat}")

    if not out["dependency_files"]:
        out["vulnerability_notes"].append("No standard dependency files found; Snyk/OSV not run.")
    else:
        snyk_token = os.environ.get("SNYK_TOKEN", "").strip()
        snyk_org = os.environ.get("SNYK_ORG_ID", "").strip()
        out["snyk"] = fetch_snyk_vulnerabilities(snyk_token, snyk_org, dep_file_contents)
        if not out["snyk"].get("enabled") or out["snyk"].get("error"):
            out["vulnerability_notes"].append(
                out["snyk"].get("error") or "Set SNYK_TOKEN and SNYK_ORG_ID for Snyk; run 'npm audit' / 'cargo audit' locally otherwise."
            )
        elif out["snyk"].get("vulnerabilities_found", 0) > 0:
            out["vulnerability_notes"].append(
                f"Snyk reported {out['snyk']['vulnerabilities_found']} vulnerability(ies) in dependencies."
            )
    return out
