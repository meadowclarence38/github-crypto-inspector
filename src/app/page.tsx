import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-crypto-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-crypto-surface border border-crypto-borderLight mb-6">
            <span className="w-2 h-2 rounded-full bg-crypto-accent animate-pulse-soft"></span>
            <span className="text-crypto-textDim text-xs font-medium">Open Source Analysis Tool</span>
          </div>
          <h1 className="text-4xl font-bold text-crypto-text tracking-tight mb-3 bg-gradient-to-br from-crypto-text to-crypto-textDim bg-clip-text">
            GitHub Crypto Inspector
          </h1>
          <p className="text-crypto-muted text-base max-w-md mx-auto leading-relaxed">
            Analyze cryptocurrency repositories for activity, originality, security, and red flags
          </p>
        </div>

        {/* Main action card */}
        <div className="rounded-xl border border-crypto-border bg-gradient-to-br from-crypto-surface to-crypto-surface/50 p-8 mb-6 shadow-2xl shadow-black/40 hover:border-crypto-borderLight transition-all">
          <h2 className="text-crypto-text text-lg font-semibold mb-2">Comprehensive Analysis</h2>
          <p className="text-crypto-textDim text-sm mb-6">
            Paste any repository link and choose custom checks to run
          </p>
          <Link
            href="/analyze"
            className="group flex items-center justify-between w-full rounded-lg bg-gradient-to-r from-crypto-accent to-crypto-accentHover py-4 px-5 text-white font-medium hover:shadow-lg hover:shadow-crypto-accent/20 transition-all"
          >
            <span>Start Analysis</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Quick inspect */}
        <div className="rounded-xl border border-crypto-border bg-crypto-surface/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-crypto-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-crypto-textDim text-sm font-medium">Quick PoW Inspect</h3>
          </div>
          <form action="/inspect" method="GET" className="flex gap-2">
            <input
              type="text"
              name="owner"
              placeholder="owner"
              required
              className="flex-1 rounded-lg border border-crypto-border bg-crypto-surface px-4 py-3 text-crypto-text placeholder-crypto-muted text-sm focus:outline-none focus:ring-2 focus:ring-crypto-accent/50 focus:border-crypto-accent"
            />
            <span className="self-center text-crypto-muted font-mono">/</span>
            <input
              type="text"
              name="repo"
              placeholder="repo"
              required
              className="flex-1 rounded-lg border border-crypto-border bg-crypto-surface px-4 py-3 text-crypto-text placeholder-crypto-muted text-sm focus:outline-none focus:ring-2 focus:ring-crypto-accent/50 focus:border-crypto-accent"
            />
            <button
              type="submit"
              className="rounded-lg bg-crypto-surface border border-crypto-borderLight text-crypto-text px-5 py-3 text-sm font-medium hover:bg-crypto-surfaceHover hover:border-crypto-accent/50"
            >
              Inspect
            </button>
          </form>
          <p className="text-crypto-muted text-xs mt-3 flex items-center gap-1.5">
            <span>Try:</span>
            <Link href="/inspect?owner=bitcoin&repo=bitcoin" className="text-crypto-accentLight hover:text-crypto-accent underline decoration-crypto-accent/30 hover:decoration-crypto-accent">
              bitcoin/bitcoin
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mt-8 animate-slide-up">
          <div className="text-center">
            <div className="text-2xl mb-2">🔍</div>
            <p className="text-crypto-textDim text-xs">Deep Analysis</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-crypto-textDim text-xs">Fast Results</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-crypto-textDim text-xs">Security Focused</p>
          </div>
        </div>
      </div>
    </main>
  );
}
