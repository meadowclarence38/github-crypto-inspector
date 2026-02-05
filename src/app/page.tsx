import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-crypto-bg flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white tracking-tight text-center">
          GitHub Crypto Inspector
        </h1>
        <p className="text-crypto-muted text-sm text-center mt-2 mb-10">
          Analyze crypto repos for activity, originality, and red flags
        </p>

        <Link
          href="/analyze"
          className="block w-full rounded-md border border-crypto-border bg-crypto-surface py-3.5 px-4 text-center text-white font-medium hover:bg-crypto-surface/80 hover:border-crypto-accent/50 transition-colors mb-4"
        >
          Paste link & choose checks →
        </Link>

        <p className="text-crypto-muted text-xs text-center mb-3">or quick inspect</p>
        <form action="/inspect" method="GET" className="flex gap-2">
          <input
            type="text"
            name="owner"
            placeholder="owner"
            required
            className="flex-1 rounded-md border border-crypto-border bg-crypto-surface px-3 py-2.5 text-white placeholder-crypto-muted text-sm focus:outline-none focus:ring-1 focus:ring-crypto-accent"
          />
          <span className="self-center text-crypto-muted">/</span>
          <input
            type="text"
            name="repo"
            placeholder="repo"
            required
            className="flex-1 rounded-md border border-crypto-border bg-crypto-surface px-3 py-2.5 text-white placeholder-crypto-muted text-sm focus:outline-none focus:ring-1 focus:ring-crypto-accent"
          />
          <button
            type="submit"
            className="rounded-md bg-crypto-accent text-white px-4 py-2.5 text-sm font-medium hover:opacity-90"
          >
            Inspect
          </button>
        </form>
        <p className="text-crypto-muted text-xs text-center mt-3">
          e.g. <Link href="/inspect?owner=bitcoin&repo=bitcoin" className="text-crypto-accent hover:underline">bitcoin/bitcoin</Link>
        </p>
      </div>
    </main>
  );
}
