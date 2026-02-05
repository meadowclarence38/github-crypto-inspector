"""Popularity: stars, forks, watchers. Compare to benchmarks."""
from typing import Any, Dict

from ..config import BENCHMARKS
from ..github_client import with_rate_limit


def fetch_popularity_metrics(repo) -> Dict[str, Any]:
    """
    Stars, forks, watchers; compare to hardcoded benchmarks.
    """
    try:
        with_rate_limit(repo.get_stargazers_count)
        stars = repo.stargazers_count
        forks = repo.forks_count
        watchers = repo.watchers_count
    except Exception:
        stars = forks = watchers = 0

    out: Dict[str, Any] = {
        "stars": stars,
        "forks": forks,
        "watchers": watchers,
        "below_star_benchmark": stars < BENCHMARKS["stars_low"],
        "below_fork_benchmark": forks < BENCHMARKS["forks_low"],
        "below_watcher_benchmark": watchers < BENCHMARKS["watchers_low"],
    }
    return out
