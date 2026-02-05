import { Octokit } from "@octokit/rest";

const token = process.env.GITHUB_TOKEN;

export const octokit = new Octokit({
  auth: token,
  userAgent: 'github-crypto-inspector/2.0',
});

export interface GitHubOwner {
  login: string;
  type: "User" | "Organization";
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
  full_name: string;
  description: string | null;
  html_url: string;
  fork: boolean;
  parent?: {
    full_name: string;
    html_url: string;
  };
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  default_branch: string;
  license: { name: string } | null;
}

export interface Commit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

export interface Contributor {
  login: string;
  contributions: number;
  avatar_url: string;
  type: string;
}

export interface SecurityIssue {
  number: number;
  title: string;
  state: string;
  created_at: string;
  labels: string[];
}

/**
 * Fetch repository details
 */
export async function fetchRepoDetails(owner: string, repo: string): Promise<GitHubRepo> {
  const { data } = await octokit.repos.get({ owner, repo });
  
  let parent;
  if (data.fork && data.parent) {
    parent = {
      full_name: data.parent.full_name,
      html_url: data.parent.html_url,
    };
  }
  
  return {
    owner: data.owner.login,
    repo: data.name,
    full_name: data.full_name,
    description: data.description,
    html_url: data.html_url,
    fork: data.fork,
    parent,
    stargazers_count: data.stargazers_count,
    forks_count: data.forks_count,
    watchers_count: data.watchers_count,
    open_issues_count: data.open_issues_count,
    language: data.language,
    created_at: data.created_at,
    updated_at: data.updated_at,
    pushed_at: data.pushed_at,
    size: data.size,
    default_branch: data.default_branch,
    license: data.license ? { name: data.license.name } : null,
  };
}

/**
 * Fetch commit history with pagination
 */
export async function fetchCommits(
  owner: string,
  repo: string,
  options: { per_page?: number; since?: string } = {}
): Promise<Commit[]> {
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: options.per_page || 100,
    ...(options.since && { since: options.since }),
  });
  
  return data.map((commit) => ({
    sha: commit.sha,
    commit: {
      author: {
        name: commit.commit.author?.name || 'Unknown',
        email: commit.commit.author?.email || '',
        date: commit.commit.author?.date || '',
      },
      message: commit.commit.message,
    },
    author: commit.author ? {
      login: commit.author.login,
      avatar_url: commit.author.avatar_url,
    } : null,
  }));
}

/**
 * Fetch contributors
 */
export async function fetchContributors(owner: string, repo: string): Promise<Contributor[]> {
  const { data } = await octokit.repos.listContributors({
    owner,
    repo,
    per_page: 100,
  });
  
  return data.map((contributor) => ({
    login: contributor.login || 'Anonymous',
    contributions: contributor.contributions,
    avatar_url: contributor.avatar_url || '',
    type: contributor.type || 'User',
  }));
}

/**
 * Fetch issues with security labels
 */
export async function fetchSecurityIssues(owner: string, repo: string): Promise<SecurityIssue[]> {
  try {
    const { data } = await octokit.issues.listForRepo({
      owner,
      repo,
      labels: 'security',
      state: 'all',
      per_page: 100,
    });
    
    return data.map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      created_at: issue.created_at,
      labels: issue.labels.map((l) => typeof l === 'string' ? l : l.name || ''),
    }));
  } catch (error) {
    // If no security issues or error, return empty array
    return [];
  }
}

/**
 * Compare fork with parent to compute originality
 */
export async function computeForkOriginality(
  owner: string,
  repo: string,
  parentOwner: string,
  parentRepo: string
): Promise<{ originalityScore: number; uniqueCommits: number; totalFiles: number; modifiedFiles: number }> {
  try {
    // Compare commits
    const { data: compareData } = await octokit.repos.compareCommitsWithBasehead({
      owner: parentOwner,
      repo: parentRepo,
      basehead: `HEAD...${owner}:${repo}:HEAD`,
    });
    
    const uniqueCommits = compareData.ahead_by || 0;
    const totalFiles = compareData.files?.length || 0;
    const modifiedFiles = compareData.files?.filter(f => f.status === 'modified' || f.status === 'added').length || 0;
    
    // Simple originality score based on unique commits and file changes
    // More commits and file changes = higher originality
    let originalityScore = 0;
    if (uniqueCommits > 0) {
      originalityScore += Math.min(uniqueCommits * 2, 50); // Up to 50 points for commits
    }
    if (totalFiles > 0) {
      const changeRatio = modifiedFiles / totalFiles;
      originalityScore += changeRatio * 50; // Up to 50 points for file changes
    }
    
    originalityScore = Math.min(Math.round(originalityScore), 100);
    
    return {
      originalityScore,
      uniqueCommits,
      totalFiles,
      modifiedFiles,
    };
  } catch (error) {
    // If comparison fails, return low score
    return {
      originalityScore: 10,
      uniqueCommits: 0,
      totalFiles: 0,
      modifiedFiles: 0,
    };
  }
}

/**
 * Fetch languages used in repository
 */
export async function fetchLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  try {
    const { data } = await octokit.repos.listLanguages({ owner, repo });
    return data;
  } catch (error) {
    return {};
  }
}

/**
 * Check for vulnerable dependencies (basic check for known files)
 */
export async function checkVulnerabilities(owner: string, repo: string): Promise<{
  hasPackageJson: boolean;
  hasRequirementsTxt: boolean;
  hasCargoToml: boolean;
  hasSolidityFiles: boolean;
}> {
  const checks = {
    hasPackageJson: false,
    hasRequirementsTxt: false,
    hasCargoToml: false,
    hasSolidityFiles: false,
  };
  
  try {
    // Check for package.json
    await octokit.repos.getContent({ owner, repo, path: 'package.json' });
    checks.hasPackageJson = true;
  } catch {}
  
  try {
    // Check for requirements.txt
    await octokit.repos.getContent({ owner, repo, path: 'requirements.txt' });
    checks.hasRequirementsTxt = true;
  } catch {}
  
  try {
    // Check for Cargo.toml
    await octokit.repos.getContent({ owner, repo, path: 'Cargo.toml' });
    checks.hasCargoToml = true;
  } catch {}
  
  try {
    // Check for Solidity files
    const { data } = await octokit.search.code({
      q: `extension:sol repo:${owner}/${repo}`,
      per_page: 1,
    });
    checks.hasSolidityFiles = data.total_count > 0;
  } catch {}
  
  return checks;
}

/**
 * Fetch detailed owner information (User or Organization)
 */
export async function fetchOwnerDetails(
  owner: string
): Promise<GitHubOwner> {
  const { data } = await octokit.users.getByUsername({
    username: owner,
  });

  return {
    login: data.login,
    type: data.type as "User" | "Organization",
    name: data.name,
    company: data.company,
    blog: data.blog,
    location: data.location,
    email: data.email,
    bio: data.bio,
    public_repos: data.public_repos,
    followers: data.followers,
    following: data.following,
    created_at: data.created_at,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
  };
}
