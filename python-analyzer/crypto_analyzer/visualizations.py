"""
Visualizations: Matplotlib (commit history), NetworkX (contributor/fork graph).
"""
from typing import Any, Dict, List, Optional

def plot_commit_history(activity: Dict[str, Any], output_path: Optional[str] = None) -> None:
    """
    Line chart of commits per week. Uses matplotlib.
    """
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.dates as mdates
        from datetime import datetime
    except ImportError:
        return
    commit_dates = activity.get("commit_dates") or []
    if not commit_dates:
        return
    weeks = [d["week"] for d in commit_dates]
    counts = [d["count"] for d in commit_dates]
    # Convert week (e.g. 2024-32) to a display label
    x = list(range(len(weeks)))
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(x, counts, marker="o", markersize=3, linewidth=1.5)
    ax.set_xlabel("Week (recent)")
    ax.set_ylabel("Commits")
    ax.set_title("Commit activity (last 52 weeks)")
    ax.set_xticks(x[:: max(1, len(x) // 12)])
    ax.set_xticklabels([weeks[i] for i in range(0, len(weeks), max(1, len(weeks) // 12))], rotation=45)
    fig.tight_layout()
    if output_path:
        fig.savefig(output_path, dpi=100)
        plt.close(fig)
    else:
        plt.show()
        plt.close(fig)


def build_contributor_network(report: Dict[str, Any]) -> Optional[Any]:
    """
    Build a simple contributor network (repo node + contributor nodes).
    Returns NetworkX graph or None if not available.
    """
    try:
        import networkx as nx
    except ImportError:
        return None
    G = nx.Graph()
    repo_name = (report.get("repo") or {}).get("full_name") or "repo"
    G.add_node(repo_name, node_type="repo")
    contrib = (report.get("metrics") or {}).get("contributors") or {}
    for c in contrib.get("top_contributors") or []:
        login = c.get("login")
        if login:
            G.add_node(login, node_type="contributor", contributions=c.get("contributions"))
            G.add_edge(repo_name, login, weight=c.get("contributions", 0))
    return G


def plot_fork_tree(reports: List[Dict[str, Any]], output_path: Optional[str] = None) -> None:
    """
    If multiple repos or fork data: nodes = repos, edges = fork relationship.
    """
    try:
        import networkx as nx
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        return
    G = nx.DiGraph()
    for r in reports:
        data = r.get("raw") or r
        full_name = data.get("full_name")
        if not full_name:
            continue
        G.add_node(full_name, is_fork=data.get("fork", {}).get("is_fork"))
        parent = (data.get("fork") or {}).get("parent_full_name")
        if parent:
            G.add_edge(parent, full_name)
    if not G.nodes():
        return
    pos = nx.spring_layout(G, k=1.5, iterations=50)
    fig, ax = plt.subplots(figsize=(8, 6))
    nx.draw_networkx_nodes(G, pos, node_color="lightblue", node_size=800, ax=ax)
    nx.draw_networkx_edges(G, pos, ax=ax, arrows=True)
    nx.draw_networkx_labels(G, pos, font_size=8, ax=ax)
    ax.set_title("Fork / repo relationship")
    ax.axis("off")
    fig.tight_layout()
    if output_path:
        fig.savefig(output_path, dpi=100)
        plt.close(fig)
    else:
        plt.show()
        plt.close(fig)
