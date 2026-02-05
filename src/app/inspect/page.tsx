"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

interface RepoInfo {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  default_branch: string;
}

interface ScanResult {
  owner: string;
  repo: string;
  filesScanned: string[];
  algorithms: Array<{
    id: string;
    name: string;
    description: string;
    usedBy: string[];
    score: number;
  }>;
}

function InspectContent() {
  const searchParams = useSearchParams();
  const owner = searchParams.get("owner") ?? "";
  const repo = searchParams.get("repo") ?? "";
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [loadingRepo, setLoadingRepo] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo) {
      setLoadingRepo(false);
      return;
    }
    setError(null);
    fetch(`/api/repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setRepoInfo(data))
      .catch(() => setRepoInfo(null))
      .finally(() => setLoadingRepo(false));
  }, [owner, repo]);

  const runScan = () => {
    if (!owner || !repo) return;
    setScanning(true);
    setError(null);
    setScan(null);
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner, repo }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => Promise.reject(new Error(d.error || "Scan failed")));
        return r.json();
      })
      .then(setScan)
      .catch((e) => setError(e.message))
      .finally(() => setScanning(false));
  };

  if (!owner || !repo) {
    return (
      <main className="min-h-screen bg-crypto-bg p-6">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-crypto-muted hover:text-crypto-accent text-sm font-medium group mb-8">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <h1 className="text-4xl font-bold text-crypto-text mb-3">PoW Algorithm Inspector</h1>
          <p className="text-crypto-textDim text-base mb-8">Quick scan for Proof-of-Work algorithm signatures</p>

          <div className="card p-6">
            <h3 className="text-crypto-text text-sm font-semibold mb-4">Enter Repository</h3>
            <form action="/inspect" method="GET" className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  name="owner"
                  placeholder="repository owner"
                  required
                  className="input-field flex-1"
                />
                <span className="self-center text-crypto-muted font-mono text-lg">/</span>
                <input
                  type="text"
                  name="repo"
                  placeholder="repository name"
                  required
                  className="input-field flex-1"
                />
              </div>
              <button type="submit" className="btn-primary w-full py-3">
                Inspect Repository
              </button>
            </form>
            <p className="text-crypto-muted text-xs mt-4">
              Example: <a href="/inspect?owner=bitcoin&repo=bitcoin" className="text-crypto-accent hover:underline">bitcoin/bitcoin</a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-crypto-bg text-crypto-text">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-crypto-muted hover:text-crypto-accent text-sm group">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-bold text-crypto-text mb-2">PoW Algorithm Inspector</h1>
          <p className="text-crypto-textDim">Quick scan for Proof-of-Work algorithm signatures</p>
        </div>

        {loadingRepo ? (
          <div className="rounded-xl border border-crypto-border bg-crypto-surface p-6 flex items-center gap-3 animate-pulse-soft">
            <div className="w-2 h-2 rounded-full bg-crypto-accent"></div>
            <p className="text-crypto-muted text-sm">Loading repository...</p>
          </div>
        ) : repoInfo ? (
          <div className="rounded-xl border border-crypto-borderLight bg-gradient-to-br from-crypto-surface via-crypto-surface to-crypto-surface/50 p-6 shadow-lg animate-fade-in">
            <a
              href={repoInfo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-crypto-text text-xl font-bold hover:text-crypto-accentLight transition-colors inline-flex items-center gap-2 group"
            >
              {repoInfo.full_name}
              <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            {repoInfo.description && (
              <p className="text-crypto-textDim text-sm mt-2 leading-relaxed">{repoInfo.description}</p>
            )}
            <div className="flex gap-5 text-crypto-muted text-xs mt-4">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {repoInfo.stargazers_count.toLocaleString()}
              </span>
              {repoInfo.language && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  {repoInfo.language}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12m-8 5h8" />
                </svg>
                {repoInfo.default_branch}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-crypto-flagRed/30 bg-crypto-flagRed/5 p-6 text-center animate-fade-in">
            <svg className="w-12 h-12 text-crypto-flagRed mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-crypto-flagRed font-medium">Repository not found</p>
          </div>
        )}

        {repoInfo && (
          <div className="mt-6">
            <button
              onClick={runScan}
              disabled={scanning}
              className="group w-full rounded-lg bg-gradient-to-r from-crypto-accent to-crypto-accentHover text-white py-4 font-semibold hover:shadow-lg hover:shadow-crypto-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Scanning repository...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Scan for PoW Algorithms</span>
                </>
              )}
            </button>
            {error && (
              <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 text-sm flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {scan && (
          <div className="mt-8 space-y-5 animate-slide-up">
            <div className="rounded-xl border border-crypto-borderLight bg-crypto-surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">⚡</span>
                <h2 className="text-crypto-text font-semibold">Scan Results</h2>
              </div>
              <p className="text-crypto-muted text-sm mb-4">
                Scanned {scan.filesScanned.length} file(s): 
                <span className="text-crypto-textDim ml-1 font-mono text-xs">
                  {scan.filesScanned.slice(0, 5).join(", ")}
                  {scan.filesScanned.length > 5 && "..."}
                </span>
              </p>
              {scan.algorithms.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-crypto-muted mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-crypto-muted">No PoW algorithm signatures detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scan.algorithms.map((a) => (
                    <div key={a.id} className="rounded-lg border border-crypto-border bg-crypto-surface/50 p-4 hover:border-crypto-borderLight transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="text-crypto-text font-semibold">{a.name}</h3>
                          <p className="text-crypto-textDim text-sm mt-1 leading-relaxed">{a.description}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-crypto-gold text-lg font-bold">{a.score}</span>
                          <span className="text-crypto-muted text-[10px] uppercase">Score</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function InspectPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-crypto-bg p-6"><p className="text-crypto-muted">Loading…</p></main>}>
      <InspectContent />
    </Suspense>
  );
}
