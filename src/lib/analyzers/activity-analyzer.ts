import { fetchCommits, fetchContributors, fetchRepoDetails } from '../octokit-client';

export interface ActivityMetrics {
  totalCommits: number;
  commitsPerWeek: number;
  lastCommitDate: string;
  daysSinceLastCommit: number;
  contributorCount: number;
  topContributors: Array<{ login: string; contributions: number }>;
  commitHistory: Array<{ date: string; count: number }>;
  healthScore: number;
  flags: string[];
}

/**
 * Analyze repository activity and health
 */
export async function analyzeActivity(owner: string, repo: string): Promise<ActivityMetrics> {
  const repoData = await fetchRepoDetails(owner, repo);
  
  // Fetch commits from last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const commits = await fetchCommits(owner, repo, {
    since: sixMonthsAgo.toISOString(),
    per_page: 100,
  });
  
  const contributors = await fetchContributors(owner, repo);
  
  // Calculate metrics
  const lastCommitDate = repoData.pushed_at;
  const daysSinceLastCommit = Math.floor(
    (Date.now() - new Date(lastCommitDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  const weeksSinceCreation = Math.max(
    1,
    Math.floor((Date.now() - new Date(repoData.created_at).getTime()) / (1000 * 60 * 60 * 24 * 7))
  );
  
  const commitsPerWeek = commits.length / Math.min(26, weeksSinceCreation); // Last 6 months or since creation
  
  // Group commits by week for chart
  const commitHistory: Array<{ date: string; count: number }> = [];
  const weeklyCommits = new Map<string, number>();
  
  commits.forEach((commit) => {
    const week = new Date(commit.commit.author.date);
    week.setDate(week.getDate() - week.getDay()); // Start of week
    const weekKey = week.toISOString().split('T')[0];
    weeklyCommits.set(weekKey, (weeklyCommits.get(weekKey) || 0) + 1);
  });
  
  weeklyCommits.forEach((count, date) => {
    commitHistory.push({ date, count });
  });
  
  commitHistory.sort((a, b) => a.date.localeCompare(b.date));
  
  // Health score calculation
  let healthScore = 50;
  
  if (daysSinceLastCommit < 7) healthScore += 20;
  else if (daysSinceLastCommit < 30) healthScore += 10;
  else if (daysSinceLastCommit > 180) healthScore -= 20;
  
  if (commitsPerWeek > 5) healthScore += 15;
  else if (commitsPerWeek > 2) healthScore += 10;
  else if (commitsPerWeek < 0.5) healthScore -= 15;
  
  if (contributors.length > 10) healthScore += 15;
  else if (contributors.length > 5) healthScore += 10;
  else if (contributors.length === 1) healthScore -= 20;
  
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  // Flags
  const flags: string[] = [];
  if (daysSinceLastCommit > 180) {
    flags.push('Inactive: No commits in 6+ months');
  }
  if (contributors.length === 1) {
    flags.push('Single contributor: High centralization risk');
  }
  if (commitsPerWeek < 0.5) {
    flags.push('Low activity: Less than 1 commit per 2 weeks');
  }
  if (contributors.length > 0 && contributors[0].contributions > commits.length * 0.8) {
    flags.push('Dominated by single contributor');
  }
  
  return {
    totalCommits: commits.length,
    commitsPerWeek: Math.round(commitsPerWeek * 10) / 10,
    lastCommitDate,
    daysSinceLastCommit,
    contributorCount: contributors.length,
    topContributors: contributors.slice(0, 5).map(c => ({
      login: c.login,
      contributions: c.contributions,
    })),
    commitHistory,
    healthScore,
    flags,
  };
}
