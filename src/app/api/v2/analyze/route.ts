import { NextRequest, NextResponse } from "next/server";
import { parseRepoInput } from "@/lib/github";
import { fetchRepoDetails } from "@/lib/octokit-client";
import { analyzeFork } from "@/lib/analyzers/fork-analyzer";
import { analyzeActivity } from "@/lib/analyzers/activity-analyzer";
import { analyzeSecurity } from "@/lib/analyzers/security-analyzer";

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AnalysisOptions {
  forkAnalysis?: boolean;
  activityMetrics?: boolean;
  securityScan?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const repoInput = typeof body.repo === "string" ? body.repo.trim() : "";
    const options: AnalysisOptions = body.options || {};

    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid repo. Use owner/repo or a GitHub URL." },
        { status: 400 }
      );
    }
    const [owner, repo] = parsed;

    // Fetch basic repo details
    let repoData;
    try {
      repoData = await fetchRepoDetails(owner, repo);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
        return NextResponse.json(
          { 
            error: "GitHub API rate limit exceeded. Please add a GITHUB_TOKEN environment variable for higher limits.",
            rateLimit: true 
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Repository not found or API error occurred." },
        { status: 404 }
      );
    }

    // Run selected analyses
    const analyses: Record<string, unknown> = {};
    const allFlags: string[] = [];
    const allRecommendations: string[] = [];

    // Fork Analysis (High Priority Feature #1)
    if (options.forkAnalysis !== false) {
      try {
        const forkResult = await analyzeFork(owner, repo);
        analyses.fork = forkResult;
        
        if (forkResult.isFork && forkResult.risk === 'high') {
          allFlags.push(forkResult.message);
        } else if (forkResult.isFork && forkResult.risk === 'medium') {
          allFlags.push(forkResult.message);
        } else if (!forkResult.isFork) {
          allRecommendations.push('Original repository (not a fork) - good sign of authenticity');
        } else if (forkResult.originalityScore && forkResult.originalityScore > 70) {
          allRecommendations.push(`High originality score (${forkResult.originalityScore}%) - substantial work on top of parent`);
        }
      } catch (error) {
        console.error('Fork analysis error:', error);
        analyses.fork = { error: 'Fork analysis failed' };
      }
    }

    // Activity & Health Metrics (High Priority Feature #2)
    if (options.activityMetrics !== false) {
      try {
        const activityResult = await analyzeActivity(owner, repo);
        analyses.activity = activityResult;
        
        allFlags.push(...activityResult.flags);
        
        if (activityResult.healthScore > 75) {
          allRecommendations.push(`Excellent health score (${activityResult.healthScore}/100) - active development`);
        }
        if (activityResult.contributorCount > 10) {
          allRecommendations.push(`Strong contributor base with ${activityResult.contributorCount} contributors`);
        }
      } catch (error) {
        console.error('Activity analysis error:', error);
        analyses.activity = { error: 'Activity analysis failed' };
      }
    }

    // Security Analysis (High Priority Feature #3)
    if (options.securityScan !== false) {
      try {
        const securityResult = await analyzeSecurity(owner, repo);
        analyses.security = securityResult;
        
        allFlags.push(...securityResult.flags);
        allRecommendations.push(...securityResult.recommendations);
        
        if (securityResult.securityScore < 50) {
          allFlags.push(`Low security score (${securityResult.securityScore}/100) - review carefully`);
        }
      } catch (error) {
        console.error('Security analysis error:', error);
        analyses.security = { error: 'Security analysis failed' };
      }
    }

    // Compute overall innovation score (enhanced V2)
    let innovationScore = 50;
    
    // Fork data impact
    const forkData = analyses.fork as { isFork?: boolean; originalityScore?: number; risk?: string } | undefined;
    if (forkData) {
      if (forkData.isFork && forkData.originalityScore) {
        // Use originality score directly if available
        innovationScore = Math.round(forkData.originalityScore * 0.6 + innovationScore * 0.4);
      } else if (!forkData.isFork) {
        innovationScore += 20; // Bonus for original repos
      }
    }
    
    // Activity impact
    const activityData = analyses.activity as { healthScore?: number; commitsPerWeek?: number } | undefined;
    if (activityData) {
      if (activityData.healthScore) {
        innovationScore = Math.round((innovationScore + activityData.healthScore * 0.3));
      }
    }
    
    // Security impact
    const securityData = analyses.security as { securityScore?: number } | undefined;
    if (securityData?.securityScore) {
      innovationScore = Math.round((innovationScore + securityData.securityScore * 0.2));
    }
    
    innovationScore = Math.max(1, Math.min(100, innovationScore));

    // Format red flags with severity
    const formattedFlags = allFlags.map(flag => {
      let severity: 'high' | 'medium' | 'low' = 'medium';
      if (flag.toLowerCase().includes('scam') || flag.toLowerCase().includes('lazy fork') || flag.toLowerCase().includes('unresolved security')) {
        severity = 'high';
      } else if (flag.toLowerCase().includes('inactive') || flag.toLowerCase().includes('single contributor')) {
        severity = 'medium';
      }
      return { severity, message: flag };
    });

    return NextResponse.json({
      version: '2.0',
      repo: {
        full_name: repoData.full_name,
        html_url: repoData.html_url,
        description: repoData.description,
        license: repoData.license?.name,
        language: repoData.language,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
      },
      analyses,
      innovationScore,
      redFlags: formattedFlags,
      recommendations: allRecommendations,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: "Internal server error during analysis." },
      { status: 500 }
    );
  }
}
