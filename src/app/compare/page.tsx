"use client";

import { useState } from "react";
import Link from "next/link";

interface ComparisonResult {
  repo: {
    full_name: string;
    html_url: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
  };
  analyses: {
    fork?: {
      isFork: boolean;
      originalityScore?: number;
      risk: string;
    };
    activity?: {
      totalCommits: number;
      commitsPerWeek: number;
      daysSinceLastCommit: number;
      contributorCount: number;
      healthScore: number;
    };
    security?: {
      securityScore: number;
      securityIssues: {
        total: number;
        open: number;
      };
    };
  };
  innovationScore: number;
  redFlags: Array<{ severity: string; message: string }>;
  error?: string;
}

export default function ComparePage() {
  const [reposInput, setReposInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ComparisonResult[]>([]);

  const analyzeRepos = async () => {
    const lines = reposInput
      .split(/[\n,]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setError("Please enter at least one repository");
      return;
    }

    if (lines.length > 10) {
      setError("Maximum 10 repositories at a time");
      return;
    }

    setError(null);
    setResults([]);
    setLoading(true);

    try {
      // Analyze all repos in parallel
      const promises = lines.map(async (repoInput) => {
        try {
          const res = await fetch("/api/v2/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repo: repoInput,
              options: {
                forkAnalysis: true,
                activityMetrics: true,
                securityScan: true,
              },
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            return {
              repo: {
                full_name: repoInput,
                html_url: "",
                description: null,
                stars: 0,
                forks: 0,
                language: null,
              },
              analyses: {},
              innovationScore: 0,
              redFlags: [],
              error: data.error || "Analysis failed",
            };
          }

          return data;
        } catch (err) {
          return {
            repo: {
              full_name: repoInput,
              html_url: "",
              description: null,
              stars: 0,
              forks: 0,
              language: null,
            },
            analyses: {},
            innovationScore: 0,
            redFlags: [],
            error: "Request failed",
          };
        }
      });

      const allResults = await Promise.all(promises);
      setResults(allResults);
    } catch (err) {
      setError("Batch analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `crypto-comparison-${Date.now()}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const exportToCSV = () => {
    const headers = [
      "Repository",
      "Stars",
      "Forks",
      "Language",
      "Innovation Score",
      "Is Fork",
      "Originality %",
      "Health Score",
      "Security Score",
      "Contributors",
      "Commits/Week",
      "Days Since Last Commit",
      "Red Flags",
    ];

    const rows = results.map((r) => [
      r.repo.full_name,
      r.repo.stars || 0,
      r.repo.forks || 0,
      r.repo.language || "N/A",
      r.innovationScore,
      r.analyses.fork?.isFork ? "Yes" : "No",
      r.analyses.fork?.originalityScore || "N/A",
      r.analyses.activity?.healthScore || "N/A",
      r.analyses.security?.securityScore || "N/A",
      r.analyses.activity?.contributorCount || "N/A",
      r.analyses.activity?.commitsPerWeek || "N/A",
      r.analyses.activity?.daysSinceLastCommit || "N/A",
      r.redFlags.length,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const exportFileDefaultName = `crypto-comparison-${Date.now()}.csv`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-crypto-success";
    if (score >= 40) return "text-crypto-warning";
    return "text-crypto-danger";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-crypto-successLight";
    if (score >= 40) return "bg-crypto-warningLight";
    return "bg-crypto-dangerLight";
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-crypto-muted hover:text-crypto-accent text-sm font-medium">
              ← Home
            </Link>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-crypto-accent text-white">
              BATCH
            </span>
          </div>
          <h1 className="text-4xl font-bold text-crypto-text">Batch Comparison</h1>
          <p className="text-crypto-textDim mt-2">
            Compare multiple repositories side-by-side
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="space-y-6 mb-8">
        <div className="card p-6">
          <label className="block text-crypto-text text-sm font-semibold mb-3">
            Repositories (one per line or comma-separated)
          </label>
          <textarea
            value={reposInput}
            onChange={(e) => setReposInput(e.target.value)}
            placeholder={"ethereum/go-ethereum\nbitcoin/bitcoin\nhttps://github.com/solana-labs/solana"}
            className="w-full px-4 py-3 border border-crypto-border rounded-lg bg-crypto-surface text-crypto-text placeholder-crypto-muted focus:outline-none focus:ring-2 focus:ring-crypto-accent focus:border-transparent min-h-32 font-mono text-sm"
          />
          <p className="text-crypto-muted text-xs mt-2">
            Enter up to 10 repositories. Use owner/repo format or full GitHub URLs.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={analyzeRepos}
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
                <span>Analyzing {reposInput.split(/[\n,]+/).filter(l => l.trim()).length} repositories...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span>Compare Repositories</span>
              </>
            )}
          </button>

          {results.length > 0 && (
            <>
              <button
                onClick={exportToJSON}
                className="px-6 py-4 rounded-lg border border-crypto-border text-crypto-text hover:bg-crypto-surfaceHover font-medium text-sm"
              >
                Export JSON
              </button>
              <button
                onClick={exportToCSV}
                className="px-6 py-4 rounded-lg border border-crypto-border text-crypto-text hover:bg-crypto-surfaceHover font-medium text-sm"
              >
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="card p-4 border-crypto-danger bg-crypto-dangerLight flex items-start gap-3 mb-8">
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

      {/* Results Table */}
      {results.length > 0 && (
        <div className="card p-6 overflow-x-auto animate-fade-in">
          <h2 className="text-crypto-text text-lg font-bold mb-4">Comparison Results</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-crypto-border">
                <th className="text-left py-3 px-4 text-crypto-muted font-semibold">Repository</th>
                <th className="text-center py-3 px-4 text-crypto-muted font-semibold">Innovation</th>
                <th className="text-center py-3 px-4 text-crypto-muted font-semibold">Stars</th>
                <th className="text-center py-3 px-4 text-crypto-muted font-semibold">Fork</th>
                <th className="text-center py-3 px-4 text-crypto-muted font-semibold">Originality</th>
                <th className="text-center py-3 px-4 text-crypto-muted font-semibold">Health</th>
                <th className="text-center py-3 px-4 text-crypto-muted font-semibold">Security</th>
                <th className="text-center py-3 px-4 text-crypto-muted font-semibold">Contributors</th>
                <th className="text-center py-3 px-4 text-crypto-muted font-semibold">Red Flags</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, idx) => (
                <tr key={idx} className="border-b border-crypto-border hover:bg-crypto-surfaceHover">
                  <td className="py-4 px-4">
                    {result.error ? (
                      <div>
                        <div className="text-crypto-text font-medium">{result.repo.full_name}</div>
                        <div className="text-crypto-danger text-xs mt-1">{result.error}</div>
                      </div>
                    ) : (
                      <div>
                        <a
                          href={result.repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-crypto-accent hover:underline font-medium"
                        >
                          {result.repo.full_name}
                        </a>
                        {result.repo.language && (
                          <div className="text-crypto-muted text-xs mt-1">{result.repo.language}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div
                      className={`inline-flex items-center justify-center w-12 h-12 rounded-lg font-bold text-lg ${getScoreBg(
                        result.innovationScore
                      )} ${getScoreColor(result.innovationScore)}`}
                    >
                      {result.innovationScore}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center text-crypto-text">
                    {result.repo.stars?.toLocaleString() || "—"}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {result.analyses.fork?.isFork ? (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-crypto-warningLight text-crypto-warning">
                        Fork
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-crypto-successLight text-crypto-success">
                        Original
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {result.analyses.fork?.originalityScore !== undefined ? (
                      <span className={getScoreColor(result.analyses.fork.originalityScore)}>
                        {result.analyses.fork.originalityScore}%
                      </span>
                    ) : (
                      <span className="text-crypto-muted">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {result.analyses.activity?.healthScore !== undefined ? (
                      <span className={getScoreColor(result.analyses.activity.healthScore)}>
                        {result.analyses.activity.healthScore}
                      </span>
                    ) : (
                      <span className="text-crypto-muted">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {result.analyses.security?.securityScore !== undefined ? (
                      <span className={getScoreColor(result.analyses.security.securityScore)}>
                        {result.analyses.security.securityScore}
                      </span>
                    ) : (
                      <span className="text-crypto-muted">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center text-crypto-text">
                    {result.analyses.activity?.contributorCount || "—"}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {result.redFlags.length > 0 ? (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-crypto-dangerLight text-crypto-danger">
                        {result.redFlags.length}
                      </span>
                    ) : (
                      <span className="text-crypto-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Detailed flags for each repo */}
          <div className="mt-8 space-y-4">
            <h3 className="text-crypto-text font-semibold">Detailed Flags</h3>
            {results.map((result, idx) => (
              result.redFlags.length > 0 && (
                <div key={idx} className="p-4 rounded-lg bg-crypto-surfaceHover border border-crypto-border">
                  <div className="font-medium text-crypto-text mb-2">{result.repo.full_name}</div>
                  <ul className="space-y-1">
                    {result.redFlags.map((flag, fidx) => (
                      <li key={fidx} className="text-sm text-crypto-textDim flex items-start gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                          flag.severity === 'high' ? 'bg-crypto-danger text-white' : 'bg-crypto-warning text-white'
                        }`}>
                          {flag.severity}
                        </span>
                        <span className="flex-1">{flag.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
