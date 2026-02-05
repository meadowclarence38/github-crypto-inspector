"""
CLI entrypoint: argparse, token handling, output formats, charts, comparison.
"""
import argparse
import sys
from pathlib import Path

from .github_client import get_github_client, parse_repo_input
from .analyzer import analyze_repo
from .report import build_report, report_console, report_json, report_csv
from .visualizations import plot_commit_history, plot_fork_tree
from .comparison import compare_repos, comparison_console, comparison_csv


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Analyze cryptocurrency GitHub repositories: legitimacy, activity, fork vs original.",
    )
    parser.add_argument(
        "repos",
        nargs="+",
        help="Repository URL or owner/repo (e.g. ethereum/go-ethereum or https://github.com/bitcoin/bitcoin)",
    )
    parser.add_argument(
        "--token",
        "-t",
        default=None,
        help="GitHub token (or set GITHUB_TOKEN). If omitted, will prompt.",
    )
    parser.add_argument(
        "--output",
        "-o",
        choices=["console", "json", "csv"],
        default="console",
        help="Output format: console, json, or csv",
    )
    parser.add_argument(
        "--out-file",
        "-f",
        default=None,
        help="Write output to this file (default: stdout)",
    )
    parser.add_argument(
        "--chart",
        "-c",
        action="store_true",
        help="Generate commit history chart (saved to commit_history.png)",
    )
    parser.add_argument(
        "--fork-graph",
        action="store_true",
        help="Generate fork/repo relationship graph (fork_tree.png) when comparing repos",
    )
    parser.add_argument(
        "--compare",
        action="store_true",
        help="Comparison mode: analyze all given repos and output side-by-side",
    )
    parser.add_argument(
        "--sentiment",
        action="store_true",
        help="Run sentiment analysis on issue/discussion text (requires TextBlob)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Verbose console output (include raw data excerpt)",
    )
    parser.add_argument(
        "--include-raw",
        action="store_true",
        help="Include full raw data in JSON output",
    )
    args = parser.parse_args()

    gh = get_github_client(args.token)

    if args.compare and len(args.repos) >= 2:
        reports = compare_repos(gh, args.repos)
        if args.output == "console":
            text = comparison_console(reports)
        elif args.output == "csv":
            text = comparison_csv(reports)
        else:
            import json
            text = json.dumps([{k: v for k, v in r.items() if k != "raw"} for r in reports], indent=2, default=str)
        if args.out_file:
            Path(args.out_file).write_text(text, encoding="utf-8")
        else:
            print(text)
        if args.fork_graph and reports:
            plot_fork_tree([r.get("raw") or r for r in reports], output_path="fork_tree.png")
        return 0

    # Single-repo (or first repo) analysis
    repo_input = args.repos[0]
    if not parse_repo_input(repo_input):
        print("Invalid repo: expected owner/repo or GitHub URL", file=sys.stderr)
        return 1
    data = analyze_repo(gh, repo_input)
    if not data:
        print("Failed to fetch repository.", file=sys.stderr)
        return 1
    if args.sentiment:
        try:
            from .advanced.sentiment import fetch_discussion_sentiment
            repo = gh.get_repo(f"{data['full_name']}")
            data["sentiment"] = fetch_discussion_sentiment(repo)
        except Exception:
            data["sentiment"] = {"summary": "Sentiment analysis failed or skipped."}
    report = build_report(data)
    report["raw"] = data

    if args.output == "console":
        text = report_console(report, verbose=args.verbose)
    elif args.output == "json":
        text = report_json(report, include_raw=args.include_raw)
    else:
        text = report_csv(report)

    if args.out_file:
        Path(args.out_file).write_text(text, encoding="utf-8")
    else:
        print(text)

    if args.chart and data.get("activity", {}).get("commit_dates"):
        plot_commit_history(data["activity"], output_path="commit_history.png")
        print("Chart saved to commit_history.png", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
