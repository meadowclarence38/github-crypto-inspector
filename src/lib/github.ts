/**
 * GitHub API client and types for repository inspection.
 * Uses public API; set GITHUB_TOKEN in .env.local for higher rate limits.
 */

export interface GitHubOwner {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  language: string | null;
  license: { key: string; name: string; spdx_id: string } | null;
  owner: GitHubOwner;
  parent?: GitHubRepo;
  source?: GitHubRepo;
  topics?: string[];
  has_issues: boolean;
  has_wiki: boolean;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  author?: { login: string };
}

export interface GitHubContentItem {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  download_url: string | null;
}

const GITHUB_API = "https://api.github.com";

function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: "application/vnd.github.v3+json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export async function fetchRepo(owner: string, repo: string): Promise<GitHubRepo | null> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: getHeaders(),
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchRepoContent(
  owner: string,
  repo: string,
  path = ""
): Promise<GitHubContentItem[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`.replace(/\/+$/, "") || `${GITHUB_API}/repos/${owner}/${repo}/contents`;
  const res = await fetch(url, {
    headers: getHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchFileContent(url: string): Promise<string> {
  const res = await fetch(url, { headers: getHeaders(), next: { revalidate: 300 } });
  if (!res.ok) return "";
  return res.text();
}

export async function fetchCommits(
  owner: string,
  repo: string,
  perPage = 30
): Promise<GitHubCommit[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${perPage}`,
    { headers: getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function searchCode(
  query: string,
  repo?: string
): Promise<{ total_count: number; items: Array<{ path: string; name: string }> }> {
  const q = repo ? `${query} repo:${repo}` : query;
  const res = await fetch(
    `${GITHUB_API}/search/code?q=${encodeURIComponent(q)}&per_page=10`,
    { headers: getHeaders(), next: { revalidate: 300 } }
  );
  if (!res.ok) return { total_count: 0, items: [] };
  const data = await res.json();
  return { total_count: data.total_count ?? 0, items: data.items ?? [] };
}

export interface GitHubContributor {
  login: string;
  contributions: number;
}

/** Parse "owner/repo" or GitHub URL into [owner, repo] or null */
export function parseRepoInput(input: string): [string, string] | null {
  const s = input.trim();
  const urlMatch = s.match(
    /(?:https?:\/\/github\.com\/|git@github\.com:)([^/\s]+)\/([^/\s#?]+)/
  );
  if (urlMatch) return [urlMatch[1], urlMatch[2].replace(/\.git$/, "")];
  if (s.includes("/") && s.split("/").length === 2) {
    const [a, b] = s.split("/", 2);
    if (a && b) return [a.trim(), b.trim()];
  }
  return null;
}

export async function fetchContributors(
  owner: string,
  repo: string,
  perPage = 30
): Promise<GitHubContributor[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=${perPage}`,
    { headers: getHeaders(), next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  return res.json();
}
