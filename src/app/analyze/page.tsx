"use client";

import { useState } from "react";
import Link from "next/link";

const OPTIONS = [
  { id: "activity", label: "Activity (commits, frequency)" },
  { id: "contributors", label: "Contributors" },
  { id: "popularity", label: "Popularity (stars, forks)" },
  { id: "fork", label: "Fork & parent" },
  { id: "pow_scan", label: "PoW / template scan" },
];

interface Report {
  repo: { full_name: string; html_url: string; description: string | null; license?: string };
  metrics: Record<string, unknown>;
  redFlags: Array<{ severity: string; message: string }>;
  recommendations: string[];
  innovationScore: number;
}

function ScoreRing({ score }: { score: number }) {
  const pct = score / 100;
  const color = score >= 70 ? "text-crypto-flagGreen" : score >= 40 ? "text-crypto-gold" : "text-crypto-flagRed";
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-crypto-border"
          d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
        />
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={`${pct * 97} 97`}
          strokeLinecap="round"
          className={color}
          d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
        />
      </svg>
      <span className={`absolute text-2xl font-semibold tabular-nums ${color}`}>{score}</span>
    </div>
  );
}

export default function AnalyzePage() {
  const [repoInput, setRepoInput] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(OPTIONS.map((o) => o.id)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(OPTIONS.map((o) => o.id)));
  const deselectAll = () => setSelected(new Set());

  const run = async () => {
    const repo = repoInput.trim();
    if (!repo) {
      setError("Enter a repo URL or owner/repo");
      return;
    }
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, options: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-crypto-bg text-zinc-200">
      <div className="max-w-xl mx-auto px-5 py-10">
        <Link href="/" className="text-crypto-muted hover:text-crypto-accent text-sm transition-colors">
          ← Home
        </Link>

        <h1 className="text-xl font-semibold text-white mt-6 mb-1">Analyze repository</h1>
        <p className="text-crypto-muted text-sm mb-6">
          Paste a GitHub URL or <span className="text-zinc-400">owner/repo</span>. Select checks and run.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="ethereum/go-ethereum"
            className="w-full rounded-md border border-crypto-border bg-crypto-surface px-3 py-2.5 text-white placeholder-crypto-muted text-sm focus:outline-none focus:ring-1 focus:ring-crypto-accent focus:border-transparent"
          />

          <div className="rounded-md border border-crypto-border bg-crypto-surface/50 px-3 py-3">
            <p className="text-crypto-muted text-xs mb-2">
              <button type="button" onClick={selectAll} className="text-crypto-accent hover:underline mr-3">All</button>
              <button type="button" onClick={deselectAll} className="text-crypto-accent hover:underline">None</button>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {OPTIONS.map((o) => (
                <label key={o.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="rounded border-crypto-border bg-crypto-bg text-crypto-accent focus:ring-crypto-accent"
                  />
                  <span className="text-zinc-400 text-sm">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="w-full rounded-md bg-crypto-accent text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-950/40 border border-red-900/60 text-red-300 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {report && (
          <div className="mt-10 space-y-8">
            <div className="rounded-md border border-crypto-border bg-crypto-surface p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div>
                  <a href={report.repo.html_url} target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-crypto-accent transition-colors">
                    {report.repo.full_name}
                  </a>
                  {report.repo.description && <p className="text-crypto-muted text-sm mt-1">{report.repo.description}</p>}
                  {report.repo.license && <p className="text-crypto-muted text-xs mt-1">License: {report.repo.license}</p>}
                </div>
                <div className="flex flex-col items-center shrink-0">
                  <ScoreRing score={report.innovationScore} />
                  <p className="text-crypto-muted text-xs mt-2">Innovation & originality</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {report.metrics.activity ? (
                <div className="rounded-md border border-crypto-border bg-crypto-surface/50 p-3">
                  <h3 className="text-crypto-muted text-xs font-medium uppercase tracking-wider mb-1">Activity</h3>
                  <p className="text-zinc-300 text-sm">
                    {(report.metrics.activity as { total_commits?: number }).total_commits} commits · {(report.metrics.activity as { commits_per_week?: number }).commits_per_week}/wk
                  </p>
                  <p className="text-crypto-muted text-xs mt-0.5">Last: {(report.metrics.activity as { last_commit_date?: string }).last_commit_date?.slice(0, 10)}</p>
                </div>
              ) : null}
              {report.metrics.contributors ? (
                <div className="rounded-md border border-crypto-border bg-crypto-surface/50 p-3">
                  <h3 className="text-crypto-muted text-xs font-medium uppercase tracking-wider mb-1">Contributors</h3>
                  <p className="text-zinc-300 text-sm">{(report.metrics.contributors as { unique_contributors?: number }).unique_contributors} unique</p>
                </div>
              ) : null}
              {report.metrics.popularity ? (
                <div className="rounded-md border border-crypto-border bg-crypto-surface/50 p-3">
                  <h3 className="text-crypto-muted text-xs font-medium uppercase tracking-wider mb-1">Popularity</h3>
                  <p className="text-zinc-300 text-sm">★ {(report.metrics.popularity as { stars?: number }).stars} · Forks {(report.metrics.popularity as { forks?: number }).forks}</p>
                </div>
              ) : null}
              {report.metrics.fork ? (
                <div className="rounded-md border border-crypto-border bg-crypto-surface/50 p-3">
                  <h3 className="text-crypto-muted text-xs font-medium uppercase tracking-wider mb-1">Fork</h3>
                  <p className="text-zinc-300 text-sm">
                    {(report.metrics.fork as { is_fork?: boolean }).is_fork ? `Fork of ${(report.metrics.fork as { parent_full_name?: string }).parent_full_name ?? "—"}` : "Original repo"}
                  </p>
                </div>
              ) : null}
              {report.metrics.pow_scan ? (
                <div className="rounded-md border border-crypto-border bg-crypto-surface/50 p-3 sm:col-span-2">
                  <h3 className="text-crypto-muted text-xs font-medium uppercase tracking-wider mb-1">PoW / template</h3>
                  <p className="text-zinc-300 text-sm">
                    {(report.metrics.pow_scan as { files_scanned?: number }).files_scanned} files · similarity {(report.metrics.pow_scan as { template_similarity_ratio?: number }).template_similarity_ratio ?? 0}
                    {(report.metrics.pow_scan as { high_template_similarity?: boolean }).high_template_similarity && " (high)"}
                  </p>
                </div>
              ) : null}
            </div>

            {report.redFlags.length > 0 && (
              <div className="rounded-md border border-red-900/50 bg-red-950/20 p-4">
                <h3 className="text-red-400 text-xs font-medium uppercase tracking-wider mb-2">Red flags</h3>
                <ul className="space-y-1.5">
                  {report.redFlags.map((f, i) => (
                    <li key={i} className="text-red-200/90 text-sm flex items-start gap-2">
                      <span className="text-red-500 shrink-0">●</span>
                      <span><span className="text-crypto-muted">[{f.severity}]</span> {f.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.recommendations.length > 0 && (
              <div className="rounded-md border border-green-900/40 bg-green-950/20 p-4">
                <h3 className="text-green-400 text-xs font-medium uppercase tracking-wider mb-2">Recommendations</h3>
                <ul className="space-y-1.5">
                  {report.recommendations.map((r, i) => (
                    <li key={i} className="text-green-200/90 text-sm flex items-start gap-2">
                      <span className="text-green-500 shrink-0">●</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.redFlags.length === 0 && report.recommendations.length === 0 && (
              <p className="text-crypto-muted text-sm">No flags or recommendations for this run.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
