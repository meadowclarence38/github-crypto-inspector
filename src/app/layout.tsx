import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Crypto Inspector",
  description: "Analyze cryptocurrency repositories for activity, originality, and security",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-crypto-surface/95 backdrop-blur-sm border-b border-crypto-border shadow-subtle">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <svg className="w-6 h-6 text-crypto-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="font-semibold text-crypto-text group-hover:text-crypto-accent transition-colors">
                  GitHub Crypto Inspector
                </span>
              </Link>
              <div className="flex items-center gap-6">
                <Link href="/analyze" className="text-crypto-textDim hover:text-crypto-accent text-sm font-medium">
                  Analyze
                </Link>
                <Link href="/inspect" className="text-crypto-textDim hover:text-crypto-accent text-sm font-medium">
                  PoW Inspect
                </Link>
                <a 
                  href="https://github.com/meadowclarence38/github-crypto-inspector" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-crypto-textDim hover:text-crypto-accent text-sm font-medium flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-crypto-surface border-t border-crypto-border mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-crypto-muted text-sm">
                Built with Next.js · Analyze crypto repos for legitimacy and originality
              </p>
              <div className="flex items-center gap-6 text-sm">
                <a href="https://github.com/meadowclarence38/github-crypto-inspector" target="_blank" rel="noopener noreferrer" className="text-crypto-muted hover:text-crypto-accent">
                  Documentation
                </a>
                <a href="https://github.com/meadowclarence38/github-crypto-inspector/issues" target="_blank" rel="noopener noreferrer" className="text-crypto-muted hover:text-crypto-accent">
                  Report Issue
                </a>
                <span className="text-crypto-muted">
                  © {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
