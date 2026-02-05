"""
Sentiment analysis on repo discussions/comments using TextBlob (if discussions enabled).
"""
from typing import Any, Dict, List

from ..github_client import with_rate_limit


def fetch_discussion_sentiment(repo) -> Dict[str, Any]:
    """
    If repo has discussions or recent issue comments, run TextBlob sentiment.
    """
    out: Dict[str, Any] = {
        "enabled": False,
        "samples_analyzed": 0,
        "avg_polarity": None,
        "avg_subjectivity": None,
        "summary": None,
    }
    try:
        from textblob import TextBlob
    except ImportError:
        out["summary"] = "TextBlob not installed; skip sentiment."
        return out

    texts: List[str] = []
    try:
        # Recent issue comments (body text)
        issues = with_rate_limit(lambda: list(repo.get_issues(state="all")[:20]))
        for i in issues:
            if i.body and len(i.body) > 20:
                texts.append(i.body[:500])
            if len(texts) >= 30:
                break
    except Exception:
        pass

    if not texts:
        out["summary"] = "No discussion text to analyze."
        return out

    polarities = []
    subjectivities = []
    for t in texts[:50]:
        try:
            blob = TextBlob(t)
            polarities.append(blob.sentiment.polarity)
            subjectivities.append(blob.sentiment.subjectivity)
        except Exception:
            continue
    if not polarities:
        return out
    out["enabled"] = True
    out["samples_analyzed"] = len(polarities)
    out["avg_polarity"] = round(sum(polarities) / len(polarities), 4)
    out["avg_subjectivity"] = round(sum(subjectivities) / len(subjectivities), 4)
    out["summary"] = (
        f"Sentiment from {len(polarities)} samples: polarity={out['avg_polarity']}, subjectivity={out['avg_subjectivity']}"
    )
    return out
