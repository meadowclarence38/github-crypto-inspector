"""
Snyk API client for dependency vulnerability checks.
Uses REST API: GET /rest/orgs/{org_id}/packages/{purl}/issues (package-level issues).
Requires SNYK_TOKEN and SNYK_ORG_ID (Organization ID from Snyk org settings).
"""
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

import requests

SNYK_API_BASE = os.environ.get("SNYK_API_URL", "https://api.snyk.io")
SNYK_API_VERSION = "2024-10-15"


def _headers(token: str) -> Dict[str, str]:
    return {
        "Content-Type": "application/vnd.api+json",
        "Authorization": f"token {token}",
        "Accept": "application/vnd.api+json",
    }


def get_package_issues(
    token: str,
    org_id: str,
    purl: str,
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    GET /rest/orgs/{org_id}/packages/{purl}/issues
    Returns (list of issue dicts, error message if any).
    """
    encoded_purl = quote(purl, safe="")
    url = f"{SNYK_API_BASE}/rest/orgs/{org_id}/packages/{encoded_purl}/issues"
    params = {"version": SNYK_API_VERSION}
    try:
        r = requests.get(url, headers=_headers(token), params=params, timeout=30)
        if r.status_code == 401:
            return [], "Snyk token invalid or expired"
        if r.status_code == 403:
            return [], "Snyk token lacks permission or org not accessible"
        if r.status_code == 404:
            return [], None  # no issues or package not in Snyk DB
        r.raise_for_status()
        data = r.json()
        issues = data.get("data") or []
        return issues, None
    except requests.RequestException as e:
        return [], str(e)


def parse_npm_deps(package_json_content: str) -> List[Tuple[str, str]]:
    """Extract (name, version) from package.json dependencies and devDependencies."""
    import json
    deps: List[Tuple[str, str]] = []
    try:
        data = json.loads(package_json_content)
        for key in ("dependencies", "devDependencies", "peerDependencies"):
            obj = data.get(key)
            if not isinstance(obj, dict):
                continue
            for name, ver in obj.items():
                if isinstance(ver, str):
                    # strip ^ ~ >= etc
                    ver = re.sub(r"^[\^~\s>=<]+", "", ver).strip()
                    if ver and not ver.startswith("file:") and not ver.startswith("link:"):
                        deps.append((name, ver))
    except (json.JSONDecodeError, TypeError):
        pass
    return deps


def parse_pip_deps(requirements_content: str) -> List[Tuple[str, str]]:
    """Extract (name, version) from requirements.txt style (name==version or name)."""
    deps: List[Tuple[str, str]] = []
    for line in requirements_content.splitlines():
        line = line.strip().split("#")[0].strip()
        if not line or line.startswith("-"):
            continue
        if "==" in line:
            name, ver = line.split("==", 1)
            deps.append((name.strip(), ver.strip()))
        elif ">=" in line or "<=" in line:
            parts = re.split(r"([><]=?)", line, 1)
            if parts:
                deps.append((parts[0].strip(), "latest"))
        else:
            name = re.split(r"[\s><=]", line)[0].strip()
            if name:
                deps.append((name, "latest"))
    return deps


def parse_cargo_deps(cargo_toml_content: str) -> List[Tuple[str, str]]:
    """Extract (name, version) from [dependencies] in Cargo.toml (simple line-based)."""
    deps: List[Tuple[str, str]] = []
    in_deps = False
    for line in cargo_toml_content.splitlines():
        line = line.strip()
        if line == "[dependencies]":
            in_deps = True
            continue
        if in_deps:
            if line.startswith("["):
                break
            if "=" in line and not line.startswith("#"):
                name_part = line.split("=")[0].strip()
                if name_part and not name_part.startswith("#"):
                    val = line.split("=", 1)[1].strip()
                    if val.startswith('"'):
                        val = val.strip('"')
                    elif val.startswith("{"):
                        # table: get version key
                        vm = re.search(r'version\s*=\s*"([^"]+)"', line)
                        val = vm.group(1) if vm else "latest"
                    ver = re.sub(r"^[\^~\s>=<]+", "", val).strip() if isinstance(val, str) else "latest"
                    deps.append((name_part, ver or "latest"))
    return deps


def build_purl(ecosystem: str, name: str, version: str) -> str:
    """Build Package URL (purl) for Snyk. Normalize name for pypi (lowercase, underscore->dash)."""
    if ecosystem == "npm":
        return f"pkg:npm/{name}@{version}"
    if ecosystem == "pypi":
        name_norm = name.lower().replace("_", "-")
        return f"pkg:pypi/{name_norm}@{version}"
    if ecosystem == "cargo":
        return f"pkg:cargo/{name}@{version}"
    return ""


def fetch_snyk_vulnerabilities(
    token: Optional[str],
    org_id: Optional[str],
    dependency_files: Dict[str, str],
    max_packages: int = 25,
) -> Dict[str, Any]:
    """
    Parse dependency files, build purls, query Snyk package issues.
    dependency_files: { "package.json": content, "requirements.txt": content, ... }
    """
    out: Dict[str, Any] = {
        "enabled": False,
        "packages_checked": 0,
        "vulnerabilities_found": 0,
        "issues_by_severity": {},
        "issues": [],
        "error": None,
    }
    if not token or not org_id:
        out["error"] = "SNYK_TOKEN and SNYK_ORG_ID required for Snyk scan"
        return out

    all_purls: List[Tuple[str, str, str]] = []  # (purl, name, ecosystem)
    if "package.json" in dependency_files:
        for name, ver in parse_npm_deps(dependency_files["package.json"])[:max_packages]:
            purl = build_purl("npm", name, ver)
            if purl:
                all_purls.append((purl, name, "npm"))
    if "requirements.txt" in dependency_files:
        for name, ver in parse_pip_deps(dependency_files["requirements.txt"])[:max_packages]:
            purl = build_purl("pypi", name, ver)
            if purl:
                all_purls.append((purl, name, "pypi"))
    if "Cargo.toml" in dependency_files:
        for name, ver in parse_cargo_deps(dependency_files["Cargo.toml"])[:max_packages]:
            purl = build_purl("cargo", name, ver)
            if purl:
                all_purls.append((purl, name, "cargo"))

    if not all_purls:
        out["enabled"] = True
        out["error"] = "No parseable dependencies found for Snyk"
        return out

    out["enabled"] = True
    severity_counts: Dict[str, int] = {}
    issues_list: List[Dict[str, Any]] = []
    for purl, pkg_name, eco in all_purls[:max_packages]:
        issues, err = get_package_issues(token, org_id, purl)
        time.sleep(0.2)
        if err and not issues:
            out["error"] = out["error"] or err
            continue
        out["packages_checked"] += 1
        for issue in issues:
            attrs = issue.get("attributes") or {}
            sev = attrs.get("effective_severity_level") or "unknown"
            severity_counts[sev] = severity_counts.get(sev, 0) + 1
            issues_list.append({
                "package": pkg_name,
                "ecosystem": eco,
                "title": attrs.get("title"),
                "severity": sev,
            })
    out["vulnerabilities_found"] = len(issues_list)
    out["issues_by_severity"] = severity_counts
    out["issues"] = issues_list[:50]
    return out
