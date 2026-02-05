import { NextRequest, NextResponse } from "next/server";
import {
  parseRepoInput,
  fetchRepo,
  fetchCommits,
  fetchContributors,
  fetchRepoContent,
  fetchFileContent,
} from "@/lib/github";
import { detectPowAlgorithms } from "@/lib/pow-algorithms";

const CODE_EXT = new Set([
  ".c", ".cpp", ".h", ".hpp", ".rs", ".py", ".go", ".js", ".ts", ".java",
  ".sol", ".vy", ".v",
]);
const TEMPLATE_SIGS = ["openzeppelin", "OpenZeppelin", "ERC-20", "ERC20", "IERC20", "SafeMath", "Ownable"];
const MAX_FILES = 20;
const MAX_FILE_SIZE = 80_000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const repoInput = typeof body.repo === "string" ? body.repo.trim() : "";
    const options: string[] = Array.isArray(body.options) ? body.options : [];

    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid repo. Use owner/repo or a GitHub URL." },
        { status: 400 }
      );
    }
    const [owner, repo] = parsed;

    const repoData = await fetchRepo(owner, repo);
    if (!repoData) {
      return NextResponse.json(
        { error: "Repository not found or rate limit exceeded. Add GITHUB_TOKEN for higher limits." },
        { status: 404 }
      );
    }

    const metrics: Record<string, unknown> = {};
    const want = options.length ? new Set(options) : new Set(["activity", "contributors", "popularity", "fork", "pow_scan"]);

    if (want.has("activity")) {
      const commits = await fetchCommits(owner, repo, 100);
      const byWeek: Record<string, number> = {};
      let lastDate: string | null = null;
      for (const c of commits) {
        const d = c.commit?.author?.date;
        if (d) {
          lastDate = lastDate || d;
          const week = d.slice(0, 10).replace(/-/g, "").slice(0, 6);
          byWeek[week] = (byWeek[week] || 0) + 1;
        }
      }
      const weeks = Object.keys(byWeek);
      metrics.activity = {
        total_commits: commits.length,
        last_commit_date: commits[0]?.commit?.author?.date ?? lastDate,
        commits_per_week: weeks.length ? Math.round((commits.length / Math.max(weeks.length, 1)) * 10) / 10 : 0,
      };
    }

    if (want.has("contributors")) {
      const contribs = await fetchContributors(owner, repo, 30);
      metrics.contributors = {
        unique_contributors: contribs.length,
        top_contributors: contribs.slice(0, 10).map((c) => ({ login: c.login, contributions: c.contributions })),
      };
    }

    if (want.has("popularity")) {
      metrics.popularity = {
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
      };
    }

    if (want.has("fork")) {
      metrics.fork = {
        is_fork: repoData.fork ?? false,
        parent_full_name: repoData.parent?.full_name ?? null,
      };
    }

    if (want.has("pow_scan")) {
      const rootItems = await fetchRepoContent(owner, repo, "");
      const dirs = rootItems.filter((i) => i.type === "dir").map((i) => i.path);
      const preferred = ["src", "lib", "contracts"];
      const toScan = [""].concat(
        preferred.filter((d) => dirs.includes(d)),
        dirs.filter((d) => !preferred.includes(d)).slice(0, 2)
      );
      const codeFiles: { path: string; download_url: string | null }[] = [];
      for (const dir of toScan) {
        const items = await fetchRepoContent(owner, repo, dir);
        for (const i of items) {
          if (i.type === "file" && CODE_EXT.has(i.name.slice(i.name.lastIndexOf(".")).toLowerCase()))
            codeFiles.push({ path: i.path, download_url: i.download_url });
        }
        if (codeFiles.length >= MAX_FILES) break;
      }
      let combined = "";
      const filesScanned: string[] = [];
      for (const f of codeFiles.slice(0, MAX_FILES)) {
        if (!f.download_url) continue;
        const text = await fetchFileContent(f.download_url);
        combined += text.length > MAX_FILE_SIZE ? text.slice(0, MAX_FILE_SIZE) + "\n" : text + "\n";
        filesScanned.push(f.path);
      }
      const powResults = detectPowAlgorithms(combined);
      let templateFiles = 0;
      for (const sig of TEMPLATE_SIGS) if (combined.includes(sig)) templateFiles++;
      const templateRatio = filesScanned.length ? Math.min(1, (templateFiles / 3) / filesScanned.length) : 0;
      metrics.pow_scan = {
        files_scanned: filesScanned.length,
        algorithms: powResults.map((r) => ({ name: r.algorithm.name, score: r.score })),
        template_similarity_ratio: Math.round(templateRatio * 100) / 100,
        high_template_similarity: templateRatio >= 0.9,
      };
    }

    const redFlags: { severity: string; message: string }[] = [];
    const recommendations: string[] = [];

    const activity = metrics.activity as { last_commit_date?: string } | undefined;
    if (activity?.last_commit_date) {
      const last = new Date(activity.last_commit_date).getTime();
      const months = (Date.now() - last) / (30 * 24 * 60 * 60 * 1000);
      if (months >= 6) redFlags.push({ severity: "high", message: `No commits in ${Math.floor(months)} months.` });
    }
    const contribs = metrics.contributors as { unique_contributors?: number } | undefined;
    if (contribs && (contribs.unique_contributors ?? 0) < 3)
      redFlags.push({ severity: "medium", message: "Fewer than 3 contributors." });
    const fork = metrics.fork as { is_fork?: boolean; parent_full_name?: string } | undefined;
    if (fork?.is_fork && fork.parent_full_name)
      redFlags.push({ severity: "info", message: `Fork of ${fork.parent_full_name}.` });
    const pow = metrics.pow_scan as { high_template_similarity?: boolean } | undefined;
    if (pow?.high_template_similarity)
      redFlags.push({ severity: "high", message: "High similarity to common crypto templates (e.g. ERC-20)." });

    if (fork?.is_fork) recommendations.push("Verify this fork has meaningful changes vs the parent.");
    if (!repoData.fork && (metrics.activity as { total_commits?: number })?.total_commits && (metrics.activity as { total_commits: number }).total_commits > 50)
      recommendations.push("Original repo with substantial history—positive signal.");

    // Innovation & originality score 1–100 (AI/ML-style grade from metrics)
    let innovationScore = 50;
    const forkData = metrics.fork as { is_fork?: boolean } | undefined;
    if (forkData?.is_fork) innovationScore -= 22;
    const powData = metrics.pow_scan as { template_similarity_ratio?: number; high_template_similarity?: boolean } | undefined;
    if (powData) {
      if (powData.high_template_similarity) innovationScore -= 25;
      else if (typeof powData.template_similarity_ratio === "number")
        innovationScore -= Math.round(powData.template_similarity_ratio * 15);
    }
    const act = metrics.activity as { total_commits?: number; last_commit_date?: string } | undefined;
    if (act?.total_commits) {
      if (act.total_commits >= 80) innovationScore += 14;
      else if (act.total_commits >= 30) innovationScore += 10;
      else if (act.total_commits >= 10) innovationScore += 5;
    }
    if (act?.last_commit_date) {
      const months = (Date.now() - new Date(act.last_commit_date).getTime()) / (30 * 24 * 60 * 60 * 1000);
      if (months < 1) innovationScore += 8;
      else if (months < 3) innovationScore += 5;
      else if (months < 6) innovationScore += 2;
      else innovationScore -= 8;
    }
    const cont = metrics.contributors as { unique_contributors?: number } | undefined;
    if (cont?.unique_contributors !== undefined) {
      if (cont.unique_contributors >= 10) innovationScore += 10;
      else if (cont.unique_contributors >= 5) innovationScore += 6;
      else if (cont.unique_contributors >= 3) innovationScore += 2;
      else innovationScore -= 8;
    }
    if (!forkData?.is_fork && (act?.total_commits ?? 0) > 40) innovationScore += 5;
    innovationScore -= redFlags.filter((f) => f.severity === "high").length * 6;
    innovationScore -= redFlags.filter((f) => f.severity === "medium").length * 2;
    innovationScore = Math.max(1, Math.min(100, Math.round(innovationScore)));

    return NextResponse.json({
      repo: {
        full_name: repoData.full_name,
        html_url: repoData.html_url,
        description: repoData.description,
        license: repoData.license?.name,
      },
      metrics,
      redFlags,
      recommendations,
      innovationScore,
    });
  } catch (e) {
    console.error("Analyze error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
