import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub Crypto Inspector",
  description: "Inspect GitHub repositories for Proof-of-Work and crypto-related code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#08080c]">
      <body className="min-h-screen font-sans text-zinc-200">{children}</body>
    </html>
  );
}
