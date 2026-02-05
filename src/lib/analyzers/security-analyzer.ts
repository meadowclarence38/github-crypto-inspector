import {
  fetchSecurityIssues,
  fetchLanguages,
  checkVulnerabilities,
  fetchRepoDetails,
} from '../octokit-client';

export interface SecurityAnalysisResult {
  securityIssues: {
    total: number;
    open: number;
    closed: number;
    recent: Array<{ number: number; title: string; state: string; created_at: string }>;
  };
  languages: Record<string, number>;
  hasSolidityCode: boolean;
  vulnerabilityFiles: {
    hasPackageJson: boolean;
    hasRequirementsTxt: boolean;
    hasCargoToml: boolean;
  };
  securityScore: number;
  flags: string[];
  recommendations: string[];
}

/**
 * Analyze repository security and code quality
 */
export async function analyzeSecurity(owner: string, repo: string): Promise<SecurityAnalysisResult> {
  const [securityIssues, languages, vulnFiles, repoData] = await Promise.all([
    fetchSecurityIssues(owner, repo),
    fetchLanguages(owner, repo),
    checkVulnerabilities(owner, repo),
    fetchRepoDetails(owner, repo),
  ]);
  
  const openSecurityIssues = securityIssues.filter(i => i.state === 'open');
  const closedSecurityIssues = securityIssues.filter(i => i.state === 'closed');
  
  // Security score calculation
  let securityScore = 70; // Start neutral
  
  if (openSecurityIssues.length > 5) securityScore -= 30;
  else if (openSecurityIssues.length > 0) securityScore -= 15;
  
  if (closedSecurityIssues.length > openSecurityIssues.length * 2) securityScore += 15;
  
  if (repoData.open_issues_count > 50) securityScore -= 10;
  
  if (!repoData.license) securityScore -= 10;
  
  securityScore = Math.max(0, Math.min(100, securityScore));
  
  // Flags
  const flags: string[] = [];
  if (openSecurityIssues.length > 0) {
    flags.push(`${openSecurityIssues.length} unresolved security issue(s)`);
  }
  
  if (vulnFiles.hasSolidityFiles && !vulnFiles.hasPackageJson) {
    flags.push('Solidity code detected but no package.json for dependency tracking');
  }
  
  if (repoData.open_issues_count > 100) {
    flags.push('High number of open issues - may indicate poor maintenance');
  }
  
  if (!repoData.license) {
    flags.push('No license specified - legal/usage concerns');
  }
  
  // Recommendations
  const recommendations: string[] = [];
  
  if (closedSecurityIssues.length > 0) {
    recommendations.push(`Team has resolved ${closedSecurityIssues.length} security issues previously`);
  }
  
  if (repoData.license) {
    recommendations.push(`Licensed under ${repoData.license.name}`);
  }
  
  const totalLangBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  const mainLanguage = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (mainLanguage && totalLangBytes > 0) {
    const percentage = Math.round((mainLanguage[1] / totalLangBytes) * 100);
    recommendations.push(`Primary language: ${mainLanguage[0]} (${percentage}%)`);
  }
  
  return {
    securityIssues: {
      total: securityIssues.length,
      open: openSecurityIssues.length,
      closed: closedSecurityIssues.length,
      recent: securityIssues.slice(0, 5).map(issue => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        created_at: issue.created_at,
      })),
    },
    languages,
    hasSolidityCode: vulnFiles.hasSolidityFiles,
    vulnerabilityFiles: {
      hasPackageJson: vulnFiles.hasPackageJson,
      hasRequirementsTxt: vulnFiles.hasRequirementsTxt,
      hasCargoToml: vulnFiles.hasCargoToml,
    },
    securityScore,
    flags,
    recommendations,
  };
}
