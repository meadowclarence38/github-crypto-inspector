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
        <div className="max-w-xl mx-auto">
          <p className="text-crypto-muted">Missing owner or repo.</p>
          <Link href="/" className="mt-4 inline-block text-crypto-accent hover:underline text-sm">
            ← Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-crypto-bg text-zinc-200">
      <div className="max-w-xl mx-auto px-5 py-10">
        <Link href="/" className="text-crypto-muted hover:text-crypto-accent text-sm transition-colors">
          ← Home
        </Link>

        {loadingRepo ? (
          <p className="text-crypto-muted text-sm mt-6">Loading…</p>
        ) : repoInfo ? (
          <div className="rounded-md border border-crypto-border bg-crypto-surface p-4 mt-6">
            <a
              href={repoInfo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium hover:text-crypto-accent transition-colors"
            >
              {repoInfo.full_name}
            </a>
            {repoInfo.description && <p className="text-crypto-muted text-sm mt-1">{repoInfo.description}</p>}
            <div className="flex gap-4 text-crypto-muted text-xs mt-2">
              <span>★ {repoInfo.stargazers_count}</span>
              {repoInfo.language && <span>{repoInfo.language}</span>}
              <span>{repoInfo.default_branch}</span>
            </div>
          </div>
        ) : (
          <p className="text-crypto-flagRed text-sm mt-6">Repository not found.</p>
        )}

        {repoInfo && (
          <div className="mt-4">
            <button
              onClick={runScan}
              disabled={scanning}
              className="rounded-md bg-crypto-accent text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {scanning ? "Scanning…" : "Scan for PoW algorithms"}
            </button>
            {error && <p className="mt-2 text-crypto-flagRed text-sm">{error}</p>}
          </div>
        )}

        {scan && (
          <div className="rounded-md border border-crypto-border bg-crypto-surface p-4 mt-6 space-y-3">
            <h2 className="text-white font-medium text-sm">PoW scan</h2>
            <p className="text-crypto-muted text-xs">
              {scan.filesScanned.length} file(s): {scan.filesScanned.slice(0, 5).join(", ")}
              {scan.filesScanned.length > 5 && " …"}
            </p>
            {scan.algorithms.length === 0 ? (
              <p className="text-crypto-muted text-sm">No PoW signatures detected.</p>
            ) : (
              <ul className="space-y-2">
                {scan.algorithms.map((a) => (
                  <li key={a.id} className="rounded border border-crypto-border bg-crypto-bg/50 p-2.5">
                    <span className="text-white text-sm font-medium">{a.name}</span>
                    <p className="text-crypto-muted text-xs mt-0.5">{a.description}</p>
                    <p className="text-crypto-muted text-xs">Score {a.score}</p>
                  </li>
                ))}
              </ul>
            )}
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
