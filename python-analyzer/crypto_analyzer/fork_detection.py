"""
Fork identification and originality: check if fork, fetch parent, compute unique commits
and file-level diff (difflib) for % originality.
"""
import time
from typing import Any, Dict, List, Optional, Set, Tuple

from github import GithubException

from .github_client import with_rate_limit
from .config import LOW_ORIGINALITY_THRESHOLD, FILE_DIFF_MAX_FILES, FILE_DIFF_MAX_FILE_SIZE


def _get_tree_paths_sha(repo, branch: str, max_entries: int = 500) -> Dict[str, str]:
    """Get path -> blob sha for all files in branch (recursive tree). Returns only blob entries."""
    path_to_sha: Dict[str, str] = {}
    try:
        commit = with_rate_limit(lambda: repo.get_commit(branch))
        tree_sha = commit.commit.tree.sha
        tree = with_rate_limit(lambda: repo.get_git_tree(tree_sha, recursive=True))
        for item in (tree.tree or [])[:max_entries]:
            if item.type == "blob":
                path_to_sha[item.path] = item.sha
    except GithubException:
        pass
    return path_to_sha


def _get_blob_content(repo, sha: str) -> Optional[str]:
    try:
        blob = with_rate_limit(lambda: repo.get_git_blob(sha))
        if blob.size and blob.size > FILE_DIFF_MAX_FILE_SIZE:
            return None
        import base64
        return base64.b64decode(blob.content).decode("utf-8", errors="ignore")
    except Exception:
        return None


def _content_similarity(a: str, b: str) -> float:
    """Return ratio in [0, 1] (1 = identical). Uses difflib.SequenceMatcher."""
    from difflib import SequenceMatcher
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _file_level_originality(
    repo,
    parent,
    repo_branch: str,
    parent_branch: str,
) -> Dict[str, Any]:
    """
    Compare file trees; for common paths with different blob SHA, fetch content and
    compute similarity with difflib. Return file_originality_ratio and stats.
    """
    out: Dict[str, Any] = {
        "file_originality_ratio": None,
        "content_originality_ratio": None,
        "files_compared": 0,
        "files_only_in_repo": 0,
        "files_only_in_parent": 0,
        "files_identical_sha": 0,
        "files_modified": 0,
        "avg_content_similarity_modified": None,
    }
    repo_paths = _get_tree_paths_sha(repo, repo_branch, FILE_DIFF_MAX_FILES * 2)
    parent_paths = _get_tree_paths_sha(parent, parent_branch, FILE_DIFF_MAX_FILES * 2)
    if not repo_paths:
        return out

    only_repo = set(repo_paths) - set(parent_paths)
    only_parent = set(parent_paths) - set(repo_paths)
    common = set(repo_paths) & set(parent_paths)
    out["files_only_in_repo"] = len(only_repo)
    out["files_only_in_parent"] = len(only_parent)

    identical_sha = 0
    modified_similarities: List[float] = []
    compared = 0
    for path in list(common)[:FILE_DIFF_MAX_FILES]:
        rs, ps = repo_paths[path], parent_paths[path]
        if rs == ps:
            identical_sha += 1
            compared += 1
            continue
        repo_content = _get_blob_content(repo, rs)
        parent_content = _get_blob_content(parent, ps)
        time.sleep(0.05)
        if repo_content is not None and parent_content is not None:
            sim = _content_similarity(repo_content, parent_content)
            modified_similarities.append(sim)
            compared += 1
        else:
            identical_sha += 1  # treat as same if we couldn't fetch
            compared += 1

    out["files_compared"] = compared
    out["files_identical_sha"] = identical_sha
    out["files_modified"] = len(modified_similarities)
    if modified_similarities:
        out["avg_content_similarity_modified"] = round(sum(modified_similarities) / len(modified_similarities), 4)
        # Content originality: for modified files, 1 - avg_similarity; weight by count
        content_orig = 1.0 - (sum(modified_similarities) / len(modified_similarities))
    else:
        content_orig = 0.0

    # File-level originality: (only_in_repo + modified) / total_repo_files
    total_repo = len(repo_paths)
    unique_or_modified = len(only_repo) + (compared - identical_sha)
    out["file_originality_ratio"] = round(unique_or_modified / total_repo, 4) if total_repo else None
    # Combined: weight commit-style by file count
    if modified_similarities:
        out["content_originality_ratio"] = round(content_orig, 4)
    return out


def fetch_fork_metrics(repo) -> Dict[str, Any]:
    """
    If repo is a fork: parent info, unique commit count, % originality (commits),
    and file-level diff originality (difflib).
    """
    out: Dict[str, Any] = {
        "is_fork": False,
        "parent_full_name": None,
        "parent_html_url": None,
        "unique_commits": None,
        "total_commits_sampled": None,
        "originality_ratio": None,
        "low_originality": False,
        "file_diff": None,
    }
    try:
        is_fork = with_rate_limit(lambda: repo.fork)
    except GithubException:
        return out
    out["is_fork"] = is_fork
    if not is_fork:
        return out

    try:
        parent = with_rate_limit(lambda: repo.parent)
    except GithubException:
        return out
    if not parent:
        return out
    out["parent_full_name"] = parent.full_name
    out["parent_html_url"] = parent.html_url

    try:
        repo_branch = repo.default_branch
        parent_branch = parent.default_branch
    except Exception:
        repo_branch = parent_branch = "main"

    # Commit-based originality
    try:
        repo_commits = list(with_rate_limit(lambda: repo.get_commits(sha=repo_branch))[:500])
        parent_shas: Set[str] = set()
        parent_commits = with_rate_limit(lambda: list(parent.get_commits(sha=parent_branch)[:1000]))
        for c in parent_commits:
            parent_shas.add(c.sha)
        unique = sum(1 for c in repo_commits if c.sha not in parent_shas)
        total = len(repo_commits)
        originality = unique / total if total else 0.0
        out["unique_commits"] = unique
        out["total_commits_sampled"] = total
        out["originality_ratio"] = round(originality, 4)
        out["low_originality"] = originality < LOW_ORIGINALITY_THRESHOLD
    except GithubException:
        pass

    # File-level diff originality
    try:
        out["file_diff"] = _file_level_originality(repo, parent, repo_branch, parent_branch)
        fd = out["file_diff"]
        if fd.get("file_originality_ratio") is not None and out.get("originality_ratio") is not None:
            # Use the stricter of the two for low_originality when both available
            file_orig = fd["file_originality_ratio"]
            if file_orig < LOW_ORIGINALITY_THRESHOLD:
                out["low_originality"] = True
    except GithubException:
        pass
    return out
