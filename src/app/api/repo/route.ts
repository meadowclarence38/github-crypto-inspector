import { NextRequest, NextResponse } from "next/server";
import { fetchRepo } from "@/lib/github";

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  const repo = req.nextUrl.searchParams.get("repo");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
  }
  const data = await fetchRepo(owner, repo);
  if (!data) {
    return NextResponse.json({ error: "Repository not found" }, { status: 404 });
  }
  return NextResponse.json({
    full_name: data.full_name,
    description: data.description,
    html_url: data.html_url,
    stargazers_count: data.stargazers_count,
    language: data.language,
    default_branch: data.default_branch,
  });
}
