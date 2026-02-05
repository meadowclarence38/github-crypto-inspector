import { NextRequest, NextResponse } from "next/server";
import { fetchRepoContent, fetchFileContent } from "@/lib/github";
import { detectPowAlgorithms } from "@/lib/pow-algorithms";

const CODE_EXT = new Set([
  ".c", ".cpp", ".h", ".hpp", ".rs", ".py", ".go", ".js", ".ts", ".java",
  ".sol", ".vy", ".v", ".rkt", ".ml", ".hs", ".zig", ".nim", ".d",
]);

const MAX_FILES = 25;
const MAX_FILE_SIZE = 100_000;

export async function POST(req: NextRequest) {
  try {
    const { owner, repo } = await req.json();
    if (!owner || !repo || typeof owner !== "string" || typeof repo !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid owner/repo" },
        { status: 400 }
      );
    }

    const rootItems = await fetchRepoContent(owner, repo, "");
    const dirsToScan = rootItems.filter((i) => i.type === "dir").map((i) => i.path);
    const preferredDirs = ["src", "lib", "miner", "pow", "crypto", "internal"];
    const toScan = [""].concat(
      preferredDirs.filter((d) => dirsToScan.includes(d)),
      dirsToScan.filter((d) => !preferredDirs.includes(d)).slice(0, 3)
    );

    const allCodeFiles: { path: string; download_url: string | null }[] = [];
    for (const dir of toScan) {
      const items = await fetchRepoContent(owner, repo, dir);
      const files = items.filter(
        (i) =>
          i.type === "file" &&
          CODE_EXT.has(i.name.slice(i.name.lastIndexOf(".")).toLowerCase())
      );
      for (const f of files) allCodeFiles.push({ path: f.path, download_url: f.download_url });
      if (allCodeFiles.length >= MAX_FILES) break;
    }
    const toFetch = allCodeFiles.slice(0, MAX_FILES);
    let combined = "";
    const filesScanned: string[] = [];

    for (const file of toFetch) {
      if (!file.download_url) continue;
      const text = await fetchFileContent(file.download_url);
      if (text.length > MAX_FILE_SIZE) combined += text.slice(0, MAX_FILE_SIZE) + "\n";
      else combined += text + "\n";
      filesScanned.push(file.path);
    }

    const results = detectPowAlgorithms(combined);
    return NextResponse.json({
      owner,
      repo,
      filesScanned,
      algorithms: results.map((r) => ({
        id: r.algorithm.id,
        name: r.algorithm.name,
        description: r.algorithm.description,
        usedBy: r.algorithm.usedBy,
        score: r.score,
      })),
    });
  } catch (e) {
    console.error("Scan error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Scan failed" },
      { status: 500 }
    );
  }
}
