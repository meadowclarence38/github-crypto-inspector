"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalysisReport {
  version: string;
  repo: {
    full_name: string;
    html_url: string;
    description: string | null;
    license?: string;
    language?: string | null;
    stars: number;
    forks: number;
    created_at: string;
    updated_at: string;
  };
  analyses: {
    fork?: {
      isFork: boolean;
      parent?: { full_name: string; html_url: string };
      originalityScore?: number;
      uniqueCommits?: number;
      totalFiles?: number;
      modifiedFiles?: number;
      risk: string;
      message: string;
    };
    activity?: {
      totalCommits: number;
      commitsPerWeek: number;
      lastCommitDate: string;
      daysSinceLastCommit: number;
      contributorCount: number;
      topContributors: Array<{ login: string; contributions: number }>;
      commitHistory: Array<{ date: string; count: number }>;
      healthScore: number;
      flags: string[];
    };
    security?: {
      securityIssues: {
        total: number;
        open: number;
        closed: number;
        recent: Array<{ number: number; title: string; state: string }>;
      };
      languages: Record<string, number>;
      hasSolidityCode: boolean;
      securityScore: number;
      flags: string[];
      recommendations: string[];
    };
  };
  innovationScore: number;
  redFlags: Array<{ severity: string; message: string }>;
  recommendations: string[];
  timestamp: string;
}

function V2AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoFromUrl = searchParams.get("repo") || "";
  
  const [repoInput, setRepoInput] = useState(repoFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const [options, setOptions] = useState({
    forkAnalysis: true,
    activityMetrics: true,
    securityScan: true,
  });

  // Auto-analyze if repo is in URL
  useEffect(() => {
    if (repoFromUrl && !loading && !report && !error) {
      runAnalysis(repoFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = async (repo: string) => {
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v2/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo, options }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setReport(data);
      
      // Update URL for sharing
      const repoParam = repo.replace("https://github.com/", "").replace(/\/+$/, "");
      router.push(`/v2/analyze?repo=${encodeURIComponent(repoParam)}`, { scroll: false });
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

  const copyShareLink = () => {
    if (!report) return;
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Shareable link copied to clipboard!");
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-crypto-success";
    if (score >= 40) return "text-crypto-warning";
    return "text-crypto-danger";
  };

  const getRiskBadge = (risk: string) => {
    const colors = {
      low: "bg-crypto-successLight text-crypto-success border-crypto-success",
      medium: "bg-crypto-warningLight text-crypto-warning border-crypto-warning",
      high: "bg-crypto-dangerLight text-crypto-danger border-crypto-danger",
    };
    return colors[risk as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/"
              className="text-crypto-muted hover:text-crypto-accent text-sm font-medium"
            >
              ← Home
            </Link>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-crypto-accent text-white">
              V2.0
            </span>
          </div>
          <h1 className="text-4xl font-bold text-crypto-text">
            Advanced Repository Analysis
          </h1>
          <p className="text-crypto-textDim mt-2">
            Deep insights with fork detection, activity tracking, and security scans
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-6">
        <div className="card p-6">
          <label className="block text-crypto-text text-sm font-semibold mb-3">
            Repository
          </label>
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="ethereum/go-ethereum or paste GitHub URL"
            className="input-field"
          />
        </div>

        {/* Analysis Options */}
        <div className="card p-6">
          <h3 className="text-crypto-text text-sm font-semibold mb-4">
            Analysis Modules
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="flex items-start gap-3 p-4 rounded-lg border border-crypto-border hover:border-crypto-borderDark cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={options.forkAnalysis}
                onChange={(e) =>
                  setOptions({ ...options, forkAnalysis: e.target.checked })
                }
              />
              <div>
                <div className="text-crypto-text text-sm font-medium mb-1">
                  🔀 Fork Analysis
                </div>
                <p className="text-crypto-muted text-xs">
                  Originality score & fork detection
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-lg border border-crypto-border hover:border-crypto-borderDark cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={options.activityMetrics}
                onChange={(e) =>
                  setOptions({ ...options, activityMetrics: e.target.checked })
                }
              />
              <div>
                <div className="text-crypto-text text-sm font-medium mb-1">
                  📊 Activity Dashboard
                </div>
                <p className="text-crypto-muted text-xs">
                  Commits, contributors & health
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-lg border border-crypto-border hover:border-crypto-borderDark cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={options.securityScan}
                onChange={(e) =>
                  setOptions({ ...options, securityScan: e.target.checked })
                }
              />
              <div>
                <div className="text-crypto-text text-sm font-medium mb-1">
                  🛡️ Security Scan
                </div>
                <p className="text-crypto-muted text-xs">
                  Vulnerabilities & code quality
                </p>
              </div>
            </label>
          </div>
        </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={run}
              disabled={loading}
              className="btn-primary flex-1 py-4 text-base flex items-center justify-center gap-2"
            >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Running advanced analysis...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span>Run Analysis</span>
              </>
            )}
            </button>
            
            {report && (
              <button
                onClick={copyShareLink}
                className="px-6 py-4 rounded-lg border border-crypto-border text-crypto-text hover:bg-crypto-surfaceHover font-medium text-sm flex items-center gap-2"
                title="Copy shareable link"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            )}
          </div>
        </div>

      {error && (
        <div className="mt-6 card p-4 border-crypto-danger bg-crypto-dangerLight flex items-start gap-3">
          <svg
            className="w-5 h-5 text-crypto-danger shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-crypto-danger font-medium text-sm">{error}</span>
        </div>
      )}

      {report && (
        <div className="mt-12 space-y-6 animate-fade-in">
          {/* Repository Header */}
          <div className="card p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <a
                  href={report.repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-crypto-text text-2xl font-bold hover:text-crypto-accent transition-colors inline-flex items-center gap-2 group"
                >
                  {report.repo.full_name}
                  <svg
                    className="w-5 h-5 opacity-50 group-hover:opacity-100"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
                {report.repo.description && (
                  <p className="text-crypto-textDim text-base mt-3 leading-relaxed">
                    {report.repo.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-crypto-muted">
                  {report.repo.language && <span>📝 {report.repo.language}</span>}
                  <span>⭐ {report.repo.stars.toLocaleString()} stars</span>
                  <span>🔀 {report.repo.forks.toLocaleString()} forks</span>
                  {report.repo.license && <span>📄 {report.repo.license}</span>}
                </div>
              </div>
              <div className="flex flex-col items-center p-6 rounded-xl bg-crypto-surfaceHover border border-crypto-border">
                <div
                  className={`text-5xl font-bold ${getScoreColor(
                    report.innovationScore
                  )}`}
                >
                  {report.innovationScore}
                </div>
                <p className="text-crypto-muted text-xs mt-2 uppercase tracking-wider font-semibold">
                  Innovation Score
                </p>
              </div>
            </div>
          </div>

          {/* Fork Analysis */}
          {report.analyses.fork && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-crypto-accent/10 text-crypto-accent">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
                <h2 className="text-crypto-text text-lg font-bold">Fork Analysis</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-crypto-textDim text-sm">Status:</span>
                  <span
                    className={`px-3 py-1 rounded-lg border text-sm font-semibold ${getRiskBadge(
                      report.analyses.fork.risk
                    )}`}
                  >
                    {report.analyses.fork.isFork ? "Fork" : "Original"}
                  </span>
                </div>
                
                {report.analyses.fork.originalityScore !== undefined && (
                  <div className="flex items-center gap-4">
                    <span className="text-crypto-textDim text-sm">Originality:</span>
                    <div className="flex-1 max-w-md">
                      <div className="h-3 bg-crypto-border rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            report.analyses.fork.originalityScore >= 70
                              ? "bg-crypto-success"
                              : report.analyses.fork.originalityScore >= 40
                              ? "bg-crypto-warning"
                              : "bg-crypto-danger"
                          }`}
                          style={{ width: `${report.analyses.fork.originalityScore}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-crypto-muted mt-1 block">
                        {report.analyses.fork.originalityScore}% original code
                      </span>
                    </div>
                  </div>
                )}
                
                {report.analyses.fork.parent && (
                  <div className="p-4 rounded-lg bg-crypto-surfaceHover border border-crypto-border">
                    <p className="text-crypto-muted text-xs mb-1">Forked from:</p>
                    <a
                      href={report.analyses.fork.parent.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-crypto-accent hover:underline font-medium"
                    >
                      {report.analyses.fork.parent.full_name}
                    </a>
                    {report.analyses.fork.uniqueCommits !== undefined && (
                      <p className="text-crypto-textDim text-sm mt-2">
                        {report.analyses.fork.uniqueCommits} unique commits ·{" "}
                        {report.analyses.fork.modifiedFiles} / {report.analyses.fork.totalFiles} files modified
                      </p>
                    )}
                  </div>
                )}
                
                <p className="text-crypto-textDim text-sm leading-relaxed">
                  {report.analyses.fork.message}
                </p>
              </div>
            </div>
          )}

          {/* Activity Dashboard */}
          {report.analyses.activity && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-crypto-success/10 text-crypto-success">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-crypto-text text-lg font-bold">Activity Dashboard</h2>
                  <p className="text-crypto-muted text-sm">
                    Health Score: {report.analyses.activity.healthScore}/100
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid sm:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-crypto-surfaceHover">
                  <div className="text-2xl font-bold text-crypto-text">
                    {report.analyses.activity.totalCommits}
                  </div>
                  <div className="text-xs text-crypto-muted mt-1">Total Commits</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-crypto-surfaceHover">
                  <div className="text-2xl font-bold text-crypto-text">
                    {report.analyses.activity.commitsPerWeek}
                  </div>
                  <div className="text-xs text-crypto-muted mt-1">Commits/Week</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-crypto-surfaceHover">
                  <div className="text-2xl font-bold text-crypto-text">
                    {report.analyses.activity.contributorCount}
                  </div>
                  <div className="text-xs text-crypto-muted mt-1">Contributors</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-crypto-surfaceHover">
                  <div className="text-2xl font-bold text-crypto-text">
                    {report.analyses.activity.daysSinceLastCommit}d
                  </div>
                  <div className="text-xs text-crypto-muted mt-1">Since Last Commit</div>
                </div>
              </div>

              {/* Commit History Chart */}
              {report.analyses.activity.commitHistory.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-crypto-text text-sm font-semibold mb-3">Commit History (Last 6 Months)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={report.analyses.activity.commitHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          stroke="#6B7280"
                          fontSize={12}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis stroke="#6B7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          dot={{ fill: '#3B82F6', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top Contributors */}
              {report.analyses.activity.topContributors.length > 0 && (
                <div>
                  <h3 className="text-crypto-text text-sm font-semibold mb-3">Top Contributors</h3>
                  <div className="space-y-2">
                    {report.analyses.activity.topContributors.map((contributor, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-crypto-surfaceHover"
                      >
                        <span className="text-crypto-text text-sm font-medium">
                          {contributor.login}
                        </span>
                        <span className="text-crypto-muted text-sm">
                          {contributor.contributions} contributions
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security Analysis */}
          {report.analyses.security && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-crypto-warning/10 text-crypto-warning">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-crypto-text text-lg font-bold">Security Analysis</h2>
                  <p className="text-crypto-muted text-sm">
                    Security Score: {report.analyses.security.securityScore}/100
                  </p>
                </div>
              </div>

              {/* Security Metrics */}
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-crypto-surfaceHover border border-crypto-border">
                  <div className="text-xs text-crypto-muted mb-1">Security Issues</div>
                  <div className="text-2xl font-bold text-crypto-text">
                    {report.analyses.security.securityIssues.total}
                  </div>
                  <div className="text-xs text-crypto-textDim mt-2">
                    {report.analyses.security.securityIssues.open} open ·{" "}
                    {report.analyses.security.securityIssues.closed} resolved
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-crypto-surfaceHover border border-crypto-border">
                  <div className="text-xs text-crypto-muted mb-1">Languages</div>
                  <div className="text-2xl font-bold text-crypto-text">
                    {Object.keys(report.analyses.security.languages).length}
                  </div>
                  <div className="text-xs text-crypto-textDim mt-2">
                    {Object.keys(report.analyses.security.languages).slice(0, 2).join(", ")}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-crypto-surfaceHover border border-crypto-border">
                  <div className="text-xs text-crypto-muted mb-1">Solidity</div>
                  <div className="text-2xl font-bold text-crypto-text">
                    {report.analyses.security.hasSolidityCode ? "✓" : "✗"}
                  </div>
                  <div className="text-xs text-crypto-textDim mt-2">
                    {report.analyses.security.hasSolidityCode
                      ? "Smart contracts detected"
                      : "No smart contracts"}
                  </div>
                </div>
              </div>

              {/* Recent Security Issues */}
              {report.analyses.security.securityIssues.recent.length > 0 && (
                <div>
                  <h3 className="text-crypto-text text-sm font-semibold mb-3">
                    Recent Security Issues
                  </h3>
                  <div className="space-y-2">
                    {report.analyses.security.securityIssues.recent.map((issue) => (
                      <div
                        key={issue.number}
                        className="p-3 rounded-lg bg-crypto-surfaceHover border border-crypto-border"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-crypto-text text-sm font-medium flex-1">
                            #{issue.number}: {issue.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              issue.state === "open"
                                ? "bg-crypto-dangerLight text-crypto-danger"
                                : "bg-crypto-successLight text-crypto-success"
                            }`}
                          >
                            {issue.state}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Red Flags */}
          {report.redFlags.length > 0 && (
            <div className="card p-6 border-crypto-danger bg-crypto-dangerLight">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-crypto-danger text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="text-crypto-danger text-base font-bold">Red Flags Detected</h3>
              </div>
              <ul className="space-y-3">
                {report.redFlags.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-crypto-danger mt-2"></span>
                    <div className="flex-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide mb-1 ${
                          f.severity === "high"
                            ? "bg-crypto-danger text-white"
                            : "bg-crypto-warning text-white"
                        }`}
                      >
                        {f.severity}
                      </span>
                      <p className="text-crypto-text text-sm leading-relaxed">{f.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="card p-6 border-crypto-success bg-crypto-successLight">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-crypto-success text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="text-crypto-success text-base font-bold">Positive Signals</h3>
              </div>
              <ul className="space-y-3">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-crypto-success mt-2"></span>
                    <p className="text-crypto-text text-sm leading-relaxed flex-1">{r}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function V2AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-crypto-accent animate-pulse-soft"></div>
          <p className="text-crypto-muted">Loading...</p>
        </div>
      </div>
    }>
      <V2AnalyzeContent />
    </Suspense>
  );
}
