import { fetchRepoDetails, computeForkOriginality } from '../octokit-client';

export interface ForkAnalysisResult {
  isFork: boolean;
  parent?: {
    full_name: string;
    html_url: string;
  };
  originalityScore?: number;
  uniqueCommits?: number;
  totalFiles?: number;
  modifiedFiles?: number;
  risk: 'low' | 'medium' | 'high';
  message: string;
}

/**
 * Analyze if repo is a fork and compute originality score
 */
export async function analyzeFork(owner: string, repo: string): Promise<ForkAnalysisResult> {
  const repoData = await fetchRepoDetails(owner, repo);
  
  if (!repoData.fork) {
    return {
      isFork: false,
      originalityScore: 100,
      risk: 'low',
      message: 'Original repository - not a fork',
    };
  }
  
  // It's a fork, compute originality
  if (!repoData.parent) {
    return {
      isFork: true,
      originalityScore: 50,
      risk: 'medium',
      message: 'Fork detected but parent information unavailable',
    };
  }
  
  const [parentOwner, parentRepo] = repoData.parent.full_name.split('/');
  const originality = await computeForkOriginality(owner, repo, parentOwner, parentRepo);
  
  let risk: 'low' | 'medium' | 'high' = 'low';
  let message = '';
  
  if (originality.originalityScore < 20) {
    risk = 'high';
    message = `Only ${originality.originalityScore}% original - Likely lazy fork with minimal changes. High scam risk!`;
  } else if (originality.originalityScore < 50) {
    risk = 'medium';
    message = `${originality.originalityScore}% original - Some modifications but mostly forked code`;
  } else {
    risk = 'low';
    message = `${originality.originalityScore}% original - Significant modifications, likely built on top of parent`;
  }
  
  return {
    isFork: true,
    parent: repoData.parent,
    originalityScore: originality.originalityScore,
    uniqueCommits: originality.uniqueCommits,
    totalFiles: originality.totalFiles,
    modifiedFiles: originality.modifiedFiles,
    risk,
    message,
  };
}
