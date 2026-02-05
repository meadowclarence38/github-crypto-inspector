import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crypto-accent/10 border border-crypto-accent/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-crypto-accent animate-pulse-soft"></span>
            <span className="text-crypto-accent text-xs font-medium">Open Source · Free to Use</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-crypto-text tracking-tight mb-4">
            GitHub Crypto Inspector
          </h1>
          <p className="text-crypto-textDim text-lg max-w-2xl mx-auto leading-relaxed">
            Analyze cryptocurrency repositories for legitimacy, activity, and originality. Detect red flags and assess innovation scores.
          </p>
        </div>

        {/* Main CTA Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Comprehensive Analysis Card */}
          <Link href="/analyze" className="group card card-hover p-8 transition-all animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-crypto-accent/10 text-crypto-accent">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-crypto-muted group-hover:text-crypto-accent group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-crypto-text mb-2">Comprehensive Analysis</h2>
            <p className="text-crypto-muted text-sm leading-relaxed">
              Paste any GitHub repo and run custom checks: activity tracking, fork detection, contributor analysis, and innovation scoring.
            </p>
          </Link>

          {/* Quick PoW Inspect Card */}
          <Link href="/inspect" className="group card card-hover p-8 transition-all animate-slide-up">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-crypto-warning/10 text-crypto-warning">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-crypto-muted group-hover:text-crypto-accent group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-crypto-text mb-2">PoW Algorithm Inspect</h2>
            <p className="text-crypto-muted text-sm leading-relaxed">
              Quick scan to detect Proof-of-Work algorithm signatures like SHA-256, Scrypt, Ethash, and more in repository code.
            </p>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-crypto-success/10 text-crypto-success mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-crypto-text mb-1">Legitimacy Check</h3>
            <p className="text-crypto-muted text-sm">Identify forks vs. originals and detect pump-and-dump patterns</p>
          </div>
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-crypto-accent/10 text-crypto-accent mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="font-semibold text-crypto-text mb-1">Activity Tracking</h3>
            <p className="text-crypto-muted text-sm">Monitor commit frequency, contributors, and project momentum</p>
          </div>
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-crypto-warning/10 text-crypto-warning mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-crypto-text mb-1">Red Flag Detection</h3>
            <p className="text-crypto-muted text-sm">Automatic alerts for security issues and suspicious patterns</p>
          </div>
        </div>

        {/* Quick Start Example */}
        <div className="card p-6">
          <h3 className="text-crypto-text font-semibold mb-3">Try it now</h3>
          <form action="/inspect" method="GET" className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="owner"
              placeholder="repository owner"
              required
              className="input-field flex-1"
            />
            <span className="hidden sm:block self-center text-crypto-muted font-mono text-lg">/</span>
            <input
              type="text"
              name="repo"
              placeholder="repository name"
              required
              className="input-field flex-1"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Quick Inspect
            </button>
          </form>
          <p className="text-crypto-muted text-xs mt-3">
            Example: <Link href="/inspect?owner=bitcoin&repo=bitcoin" className="text-crypto-accent hover:underline">bitcoin/bitcoin</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
