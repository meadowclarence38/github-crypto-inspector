"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const OPTIONS = [
  { id: "activity", label: "Activity", desc: "commits, frequency", icon: "📊" },
  { id: "contributors", label: "Contributors", desc: "unique devs", icon: "👥" },
  { id: "popularity", label: "Popularity", desc: "stars, forks", icon: "⭐" },
  { id: "fork", label: "Fork Analysis", desc: "parent & diff", icon: "🔀" },
  { id: "pow_scan", label: "Template Scan", desc: "PoW algorithms", icon: "⚡" },
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
  const bgColor = score >= 70 ? "text-crypto-flagGreen/10" : score >= 40 ? "text-crypto-gold/10" : "text-crypto-flagRed/10";
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={bgColor}
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
          style={{ 
            filter: score >= 70 ? "drop-shadow(0 0 8px rgba(34, 197, 94, 0.4))" : 
                    score >= 40 ? "drop-shadow(0 0 8px rgba(244, 180, 97, 0.4))" : 
                    "drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))"
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold tabular-nums ${color}`}>{score}</span>
        <span className="text-crypto-muted text-[10px] uppercase tracking-wider mt-0.5">Score</span>
      </div>
    </div>
  );
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoFromUrl = searchParams.get("repo") || "";
  
  const [repoInput, setRepoInput] = useState(repoFromUrl);
  const [selected, setSelected] = useState<Set<string>>(new Set(OPTIONS.map((o) => o.id)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (repoFromUrl && !loading && !report && !error) {
      runAnalysis(repoFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const runAnalysis = async (repo: string) => {
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
      
      const repoParam = repo.replace("https://github.com/", "").replace(/\/+$/, "");
      router.push(`/analyze?repo=${encodeURIComponent(repoParam)}`, { scroll: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const run = async () => {
    const repo = repoInput.trim();
    if (!repo) {
      setError("Enter a repo URL or owner/repo");
      return;
    }
    runAnalysis(repo);
  };

  return (
    <main className="min-h-screen bg-crypto-bg text-crypto-text">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-crypto-muted hover:text-crypto-accent text-sm group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="mt-8 mb-10">
          <h1 className="text-3xl font-bold text-crypto-text mb-2">Repository Analysis</h1>
          <p className="text-crypto-textDim text-base">
            Paste a GitHub URL or enter <span className="text-crypto-accentLight font-mono text-sm">owner/repo</span> format
          </p>
        </div>

        <div className="space-y-5">
          {/* Repository input */}
          <div className="group">
            <label className="block text-crypto-textDim text-sm font-medium mb-2">Repository</label>
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="ethereum/go-ethereum or https://github.com/..."
              className="w-full rounded-lg border border-crypto-border bg-crypto-surface px-4 py-3.5 text-crypto-text placeholder-crypto-muted focus:outline-none focus:ring-2 focus:ring-crypto-accent/50 focus:border-crypto-accent"
            />
          </div>

          {/* Analysis options */}
          <div className="rounded-xl border border-crypto-border bg-gradient-to-br from-crypto-surface to-crypto-surface/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-crypto-text text-sm font-semibold">Analysis Options</h3>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={selectAll} 
                  className="text-crypto-accentLight hover:text-crypto-accent text-xs font-medium"
                >
                  Select All
                </button>
                <span className="text-crypto-muted">·</span>
                <button 
                  type="button" 
                  onClick={deselectAll} 
                  className="text-crypto-accentLight hover:text-crypto-accent text-xs font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OPTIONS.map((o) => (
                <label 
                  key={o.id} 
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selected.has(o.id) 
                      ? "border-crypto-accent/50 bg-crypto-accent/5" 
                      : "border-crypto-border bg-crypto-surface/50 hover:border-crypto-borderLight"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="mt-0.5 rounded border-crypto-border text-crypto-accent focus:ring-crypto-accent focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{o.icon}</span>
                      <span className="text-crypto-text text-sm font-medium">{o.label}</span>
                    </div>
                    <p className="text-crypto-muted text-xs mt-0.5">{o.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Run button */}
          <button
            type="button"
            onClick={run}
            disabled={loading || selected.size === 0}
            className="group w-full rounded-lg bg-gradient-to-r from-crypto-accent to-crypto-accentHover text-white py-4 font-semibold hover:shadow-lg hover:shadow-crypto-accent/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Analyzing repository...</span>
              </>
            ) : (
              <>
                <span>Run Analysis</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3.5 text-sm flex items-start gap-3 animate-slide-up">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {report && (
          <div className="mt-12 space-y-6 animate-fade-in">
            {/* Repository header with score */}
            <div className="rounded-xl border border-crypto-borderLight bg-gradient-to-br from-crypto-surface via-crypto-surface to-crypto-surface/50 p-6 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <a 
                    href={report.repo.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-crypto-text text-xl font-bold hover:text-crypto-accentLight transition-colors inline-flex items-center gap-2 group"
                  >
                    {report.repo.full_name}
                    <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {report.repo.description && (
                    <p className="text-crypto-textDim text-sm mt-2 leading-relaxed">{report.repo.description}</p>
                  )}
                  {report.repo.license && (
                    <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md bg-crypto-surface border border-crypto-border text-crypto-muted text-xs">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      {report.repo.license}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center shrink-0 bg-crypto-surface/50 rounded-xl p-6 border border-crypto-border">
                  <ScoreRing score={report.innovationScore} />
                  <p className="text-crypto-muted text-xs mt-3 font-medium uppercase tracking-wider">Innovation Score</p>
                </div>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {report.metrics.activity ? (
                <div className="group rounded-lg border border-crypto-border bg-crypto-surface/50 p-4 hover:border-crypto-borderLight transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">📊</span>
                    <h3 className="text-crypto-textDim text-xs font-semibold uppercase tracking-wider">Activity</h3>
                  </div>
                  <p className="text-crypto-text text-lg font-semibold">
                    {(report.metrics.activity as { total_commits?: number }).total_commits?.toLocaleString()} commits
                  </p>
                  <p className="text-crypto-muted text-sm mt-1">
                    ~{(report.metrics.activity as { commits_per_week?: number }).commits_per_week} per week
                  </p>
                  <p className="text-crypto-muted text-xs mt-2">
                    Last: {(report.metrics.activity as { last_commit_date?: string }).last_commit_date?.slice(0, 10)}
                  </p>
                </div>
              ) : null}
              {report.metrics.contributors ? (
                <div className="group rounded-lg border border-crypto-border bg-crypto-surface/50 p-4 hover:border-crypto-borderLight transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">👥</span>
                    <h3 className="text-crypto-textDim text-xs font-semibold uppercase tracking-wider">Contributors</h3>
                  </div>
                  <p className="text-crypto-text text-lg font-semibold">
                    {(report.metrics.contributors as { unique_contributors?: number }).unique_contributors} developers
                  </p>
                  <p className="text-crypto-muted text-sm mt-1">Unique contributors</p>
                </div>
              ) : null}
              {report.metrics.popularity ? (
                <div className="group rounded-lg border border-crypto-border bg-crypto-surface/50 p-4 hover:border-crypto-borderLight transition-all">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">⭐</span>
                    <h3 className="text-crypto-textDim text-xs font-semibold uppercase tracking-wider">Popularity</h3>
                  </div>
                  <p className="text-crypto-text text-lg font-semibold">
                    {(report.metrics.popularity as { stars?: number }).stars?.toLocaleString()} stars
                  </p>
                  <p className="text-crypto-muted text-sm mt-1">
                    {(report.metrics.popularity as { forks?: number }).forks?.toLocaleString()} forks
                  </p>
                </div>
              ) : null}
              {report.metrics.fork ? (
                <div className="group rounded-lg border border-crypto-border bg-crypto-surface/50 p-4 hover:border-crypto-borderLight transition-all sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🔀</span>
                    <h3 className="text-crypto-textDim text-xs font-semibold uppercase tracking-wider">Fork Status</h3>
                  </div>
                  <p className="text-crypto-text text-base font-medium">
                    {(report.metrics.fork as { is_fork?: boolean }).is_fork 
                      ? `Forked from ${(report.metrics.fork as { parent_full_name?: string }).parent_full_name ?? "unknown"}`
                      : "Original repository"}
                  </p>
                </div>
              ) : null}
              {report.metrics.pow_scan ? (
                <div className="group rounded-lg border border-crypto-border bg-crypto-surface/50 p-4 hover:border-crypto-borderLight transition-all sm:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">⚡</span>
                    <h3 className="text-crypto-textDim text-xs font-semibold uppercase tracking-wider">Template Scan</h3>
                  </div>
                  <p className="text-crypto-text text-base">
                    Scanned {(report.metrics.pow_scan as { files_scanned?: number }).files_scanned} files
                  </p>
                  <p className="text-crypto-muted text-sm mt-1">
                    Template similarity: {Math.round(((report.metrics.pow_scan as { template_similarity_ratio?: number }).template_similarity_ratio ?? 0) * 100)}%
                    {(report.metrics.pow_scan as { high_template_similarity?: boolean }).high_template_similarity && 
                      <span className="ml-2 text-crypto-flagRed font-medium">(High)</span>
                    }
                  </p>
                </div>
              ) : null}
            </div>

            {/* Red flags */}
            {report.redFlags.length > 0 && (
              <div className="rounded-xl border border-crypto-flagRed/30 bg-crypto-flagRed/5 p-5 shadow-lg animate-slide-up">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-crypto-flagRed" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-crypto-flagRed text-sm font-bold uppercase tracking-wider">Red Flags Detected</h3>
                </div>
                <ul className="space-y-3">
                  {report.redFlags.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-crypto-flagRed mt-2"></span>
                      <div className="flex-1">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mb-1 {f.severity === 'high' ? 'bg-crypto-flagRed/20 text-crypto-flagRed' : 'bg-orange-500/20 text-orange-400'}">
                          {f.severity}
                        </span>
                        <p className="text-red-100">{f.message}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="rounded-xl border border-crypto-flagGreen/30 bg-crypto-flagGreen/5 p-5 shadow-lg animate-slide-up">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-crypto-flagGreen" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="text-crypto-flagGreen text-sm font-bold uppercase tracking-wider">Positive Signals</h3>
                </div>
                <ul className="space-y-3">
                  {report.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-crypto-flagGreen mt-2"></span>
                      <p className="text-green-100 flex-1">{r}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.redFlags.length === 0 && report.recommendations.length === 0 && (
              <div className="text-center py-8 text-crypto-muted">
                <p>No significant flags or recommendations detected.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-crypto-bg text-zinc-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-crypto-accent animate-pulse-soft"></div>
          <p className="text-crypto-muted">Loading...</p>
        </div>
      </main>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
