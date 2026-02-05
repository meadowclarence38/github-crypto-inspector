"""
GitHub API client using PyGitHub.
Handles token prompt, rate limits (time.sleep), and repo parsing.
"""
import os
import re
import time
from typing import Optional, Tuple

from github import Github, RateLimitExceededException, GithubException


def parse_repo_input(input_str: str) -> Optional[Tuple[str, str]]:
    """
    Parse 'owner/repo' or GitHub URL into (owner, repo).
    """
    input_str = input_str.strip()
    # URL: https://github.com/owner/repo or git@github.com:owner/repo.git
    url_match = re.match(
        r"(?:https?://github\.com/|git@github\.com:)([^/\s]+)/([^/\s#?]+)",
        input_str,
    )
    if url_match:
        return (url_match.group(1), url_match.group(2).replace(".git", ""))
    # owner/repo
    if "/" in input_str and input_str.count("/") == 1:
        parts = input_str.split("/", 1)
        return (parts[0].strip(), parts[1].strip())
    return None


def get_github_client(token: Optional[str] = None) -> Github:
    """Build PyGitHub client. If token is None, use GITHUB_TOKEN env or prompt user."""
    if token:
        return Github(token)
    env_token = os.environ.get("GITHUB_TOKEN", "").strip()
    if env_token:
        return Github(env_token)
    try:
        t = input("GitHub token (optional; press Enter to use unauthenticated): ").strip()
        if t:
            return Github(t)
    except EOFError:
        pass
    return Github()


def with_rate_limit(fn, *args, **kwargs):
    """
    Call a GitHub API function and on RateLimitExceededException,
    sleep and retry once (or respect Retry-After if available).
    """
    try:
        return fn(*args, **kwargs)
    except RateLimitExceededException as e:
        wait = getattr(e, "retry_after", 60) or 60
        time.sleep(wait)
        return fn(*args, **kwargs)
