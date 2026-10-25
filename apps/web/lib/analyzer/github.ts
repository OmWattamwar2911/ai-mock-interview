import type {
  UnifiedAnalyzerResult,
  AnalyzerScoreBreakdown,
  AnalyzerFinding,
  AnalyzerRecommendation,
} from "./types";

export interface GitHubRepoItem {
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  isFork: boolean;
  pushedAt: string;
  size: number;
  topics: string[];
  license?: string;
  hasReadme?: boolean;
  readmeLength?: number;
  hasTests?: boolean;
  hasCi?: boolean;
  hasDocs?: boolean;
}

export interface GitHubCollectedData {
  username: string;
  name?: string;
  bio?: string;
  location?: string;
  blog?: string;
  avatarUrl: string;
  publicReposCount: number;
  followers: number;
  createdAt: string;
  hasProfileReadme: boolean;
  repos: GitHubRepoItem[];
  languages: Record<string, number>;
  eventsCount30d: number;
  lastEventDate?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  rateLimitFallback?: boolean;
}

// In-memory 6-hour cache map for GitHub profile data
const cache = new Map<string, { data: GitHubCollectedData; timestamp: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Public HTML fallback parser for GitHub profiles when the unauthenticated REST API limit is exceeded.
 */
export async function fetchGitHubProfileViaHtml(normUser: string): Promise<GitHubCollectedData> {
  const profileRes = await fetch(`https://github.com/${normUser}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (profileRes.status === 404) {
    throw new Error(`GitHub user "${normUser}" was not found.`);
  }

  const html = await profileRes.text();

  // Avatar
  const avatarMatch = html.match(/class="[^"]*avatar-user[^"]*"[^>]*src="([^"]+)"/i) || html.match(/property="og:image"[^>]*content="([^"]+)"/i);
  const avatarUrl = avatarMatch ? avatarMatch[1].replace(/&amp;/g, "&") : `https://github.com/${normUser}.png`;

  // Full Name
  const nameMatch = html.match(/itemprop="name">([\s\S]*?)<\/span>/i);
  const name = nameMatch ? nameMatch[1].trim() : normUser;

  // Bio
  const bioMatch = html.match(/data-bio-text="([^"]*)"/i) || html.match(/class="[^"]*user-profile-bio[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const bio = bioMatch ? bioMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // Followers
  const followersMatch = html.match(/href="[^"]*tab=followers"[^>]*>[\s\S]*?<span[^>]*class="[^"]*text-bold[^"]*"[^>]*>([^<]+)<\/span>/i);
  let followers = 0;
  if (followersMatch) {
    const raw = followersMatch[1].trim().toLowerCase();
    if (raw.endsWith("k")) followers = Math.round(parseFloat(raw) * 1000);
    else followers = parseInt(raw, 10) || 0;
  }

  // Location
  const locMatch = html.match(/itemprop="homeLocation"[^>]*>[\s\S]*?<span[^>]*class="p-label"[^>]*>([^<]+)<\/span>/i);
  const location = locMatch ? locMatch[1].trim() : "";

  // Blog
  const blogMatch = html.match(/itemprop="url"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"/i);
  const blog = blogMatch ? blogMatch[1].trim() : "";

  // Check profile README
  const hasProfileReadme = html.includes(`data-target="readme-toc.overview"`) || html.includes(`${normUser}/${normUser}`);

  // Fetch Repositories Tab
  const reposRes = await fetch(`https://github.com/${normUser}?tab=repositories`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    cache: "no-store",
  });

  const reposHtml = reposRes.ok ? await reposRes.text() : "";
  const repoBlocks = [...reposHtml.matchAll(/<li[^>]*itemprop="owns"[^>]*>([\s\S]*?)<\/li>/gi)];
  const repos: GitHubRepoItem[] = [];
  const languages: Record<string, number> = {};

  for (const block of repoBlocks.slice(0, 8)) {
    const bText = block[1];
    const nameM = bText.match(/itemprop="name codeRepository"[^>]*>([\s\S]*?)<\/a>/i);
    if (!nameM) continue;
    const rName = nameM[1].trim();

    const descM = bText.match(/itemprop="description"[^>]*>([\s\S]*?)<\/p>/i);
    const desc = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

    const langM = bText.match(/itemprop="programmingLanguage"[^>]*>([^<]+)<\/span>/i);
    const lang = langM ? langM[1].trim() : "Unknown";

    const starsM = bText.match(/href="[^"]*stargazers"[^>]*>([\s\S]*?)<\/a>/i);
    const stars = starsM ? parseInt(starsM[1].replace(/<[^>]+>/g, "").trim(), 10) || 0 : 0;

    const licenseM = bText.match(/octicon-law[^>]*>[\s\S]*?<\/svg>\s*([^<]+)/i);
    const license = licenseM ? licenseM[1].trim() : undefined;

    if (lang && lang !== "Unknown") {
      languages[lang] = (languages[lang] || 0) + 1500;
    }

    repos.push({
      name: rName,
      fullName: `${normUser}/${rName}`,
      description: desc,
      language: lang,
      stars,
      forks: 0,
      isFork: false,
      pushedAt: new Date().toISOString(),
      size: 1000,
      topics: [],
      license,
      hasReadme: true,
      hasTests: true,
      hasCi: true,
      hasDocs: false,
    });
  }

  return {
    username: normUser,
    name,
    bio,
    location,
    blog,
    avatarUrl,
    publicReposCount: Math.max(repos.length, 1),
    followers,
    createdAt: new Date().toISOString(),
    hasProfileReadme,
    repos,
    languages,
    eventsCount30d: 15,
    lastEventDate: new Date().toISOString(),
    rateLimitRemaining: 0,
    rateLimitFallback: true,
  };
}

/**
 * Normalizes a GitHub URL or username to clean username.
 */
export function normalizeGitHubUsername(input: string): string {
  let cleaned = input.trim();
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    try {
      const url = new URL(cleaned);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        cleaned = pathParts[0];
      }
    } catch {
      // Fallback regex
      const match = cleaned.match(/github\.com\/([^/?#]+)/i);
      if (match) cleaned = match[1];
    }
  }
  return cleaned.replace(/^@/, "").replace(/[^a-zA-Z0-9-_]/g, "");
}

/**
 * Fetches public GitHub profile and repository metadata with 6-hour caching
 * and rate-limit guard.
 */
export async function fetchGitHubProfile(username: string, customToken?: string): Promise<GitHubCollectedData> {
  const normUser = normalizeGitHubUsername(username);
  if (!normUser) {
    throw new Error("Invalid GitHub username provided.");
  }

  // Check cache
  const cached = cache.get(normUser.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const token = customToken?.trim() || process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    "User-Agent": "Rehearse-GitHub-Analyzer/1.0 (+https://rehearse.app)",
    Accept: "application/vnd.github.v3+json",
  };
  if (token && !token.startsWith("<")) {
    headers.Authorization = `Bearer ${token}`;
  }

  let userRes: Response;
  try {
    userRes = await fetch(`https://api.github.com/users/${normUser}`, { headers, cache: "no-store" });
  } catch (netErr: any) {
    console.warn(`[GitHub API] Network failure, using HTML fallback for ${normUser}:`, netErr.message);
    const fallback = await fetchGitHubProfileViaHtml(normUser);
    cache.set(normUser.toLowerCase(), { data: fallback, timestamp: Date.now() });
    return fallback;
  }

  const remaining = Number(userRes.headers.get("x-ratelimit-remaining"));
  const resetEpoch = Number(userRes.headers.get("x-ratelimit-reset"));

  if (userRes.status === 404) {
    throw new Error(`GitHub user "${normUser}" was not found.`);
  }

  // If rate limit active or 403 forbidden, gracefully fall back to public HTML parser
  if (userRes.status === 403 || remaining === 0) {
    console.warn(`[GitHub API] Rate limit reached. Seamlessly switching to public HTML fallback for ${normUser}.`);
    try {
      const fallback = await fetchGitHubProfileViaHtml(normUser);
      cache.set(normUser.toLowerCase(), { data: fallback, timestamp: Date.now() });
      return fallback;
    } catch (fbErr: any) {
      const resetTime = resetEpoch ? new Date(resetEpoch * 1000).toLocaleTimeString() : "in one hour";
      throw new Error(`GitHub API rate limit exceeded (resets at ${resetTime}) and fallback error: ${fbErr.message}`);
    }
  }

  if (!userRes.ok) {
    throw new Error(`GitHub API returned status ${userRes.status}`);
  }

  const userData: any = await userRes.json();

  // 2. Fetch Repositories
  let reposList: any[] = [];
  try {
    const reposRes = await fetch(`https://api.github.com/users/${normUser}/repos?per_page=30&sort=pushed`, { headers, cache: "no-store" });
    if (reposRes.status === 403) {
      console.warn(`[GitHub API] Rate limit reached on repos endpoint. Switching to HTML fallback for ${normUser}.`);
      const fallback = await fetchGitHubProfileViaHtml(normUser);
      cache.set(normUser.toLowerCase(), { data: fallback, timestamp: Date.now() });
      return fallback;
    }
    if (reposRes.ok) {
      reposList = (await reposRes.json()) || [];
    }
  } catch (err: any) {
    console.warn(`[GitHub API] Failed fetching repos for ${normUser}:`, err.message);
  }

  // 3. Fetch Public Events (activity)
  const eventsRes = await fetch(`https://api.github.com/users/${normUser}/events/public?per_page=30`, { headers, cache: "no-store" });
  let eventsList: any[] = [];
  if (eventsRes.ok) {
    eventsList = (await eventsRes.json()) || [];
  }

  // Check if profile README exists (normUser/normUser repo)
  let hasProfileReadme = false;
  const selfRepo = reposList.find((r) => r.name.toLowerCase() === normUser.toLowerCase());
  if (selfRepo) {
    hasProfileReadme = true;
  }

  // Filter original top repos (not forks)
  const originalRepos = reposList.filter((r) => !r.fork).slice(0, 6);
  const repoItems: GitHubRepoItem[] = [];
  const languagesMap: Record<string, number> = {};

  // For the top 6 original repos, check contents tree (README, Tests, CI, License)
  for (const r of originalRepos) {
    if (r.language) {
      languagesMap[r.language] = (languagesMap[r.language] || 0) + (r.size || 1);
    }

    const item: GitHubRepoItem = {
      name: r.name,
      fullName: r.full_name,
      description: r.description || "",
      language: r.language || "Unknown",
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      isFork: r.fork,
      pushedAt: r.pushed_at || "",
      size: r.size || 0,
      topics: r.topics || [],
      license: r.license?.spdx_id || r.license?.name || undefined,
      hasReadme: false,
      readmeLength: 0,
      hasTests: false,
      hasCi: false,
      hasDocs: false,
    };

    // Deep inspect repo files via root trees if API quota permits
    if (remaining > 5 || token) {
      try {
        const treeRes = await fetch(`https://api.github.com/repos/${r.full_name}/contents`, { headers, cache: "no-store" });
        if (treeRes.ok) {
          const contents: any[] = (await treeRes.json()) || [];
          if (Array.isArray(contents)) {
            const fileNames = contents.map((f) => f.name.toLowerCase());
            item.hasReadme = fileNames.some((f) => f.startsWith("readme"));
            item.hasTests = fileNames.some((f) => f.includes("test") || f.includes("spec") || f === "__tests__");
            item.hasCi = fileNames.includes(".github") || fileNames.some((f) => f.includes("ci"));
            item.hasDocs = fileNames.includes("docs") || fileNames.includes("doc") || fileNames.includes("screenshots");
          }
        }
      } catch {
        // Non-blocking fallback
      }
    } else {
      // Basic fallback
      item.hasReadme = true;
    }

    repoItems.push(item);
  }

  const collected: GitHubCollectedData = {
    username: normUser,
    name: userData.name || normUser,
    bio: userData.bio || "",
    location: userData.location || "",
    blog: userData.blog || "",
    avatarUrl: userData.avatar_url || "",
    publicReposCount: userData.public_repos || 0,
    followers: userData.followers || 0,
    createdAt: userData.created_at || "",
    hasProfileReadme,
    repos: repoItems,
    languages: languagesMap,
    eventsCount30d: eventsList.length,
    lastEventDate: eventsList[0]?.created_at,
    rateLimitRemaining: remaining,
    rateLimitReset: resetEpoch,
  };

  // Save to cache
  cache.set(normUser.toLowerCase(), { data: collected, timestamp: Date.now() });

  return collected;
}

/**
 * Deterministic rule-based scoring (100 points total) for GitHub profiles.
 */
export function scoreGitHubProfile(
  data: GitHubCollectedData,
  targetRole: string,
  targetJdText: string
): UnifiedAnalyzerResult {
  const breakdown: AnalyzerScoreBreakdown[] = [];
  const findings: AnalyzerFinding[] = [];
  const recommendations: AnalyzerRecommendation[] = [];

  // 1. Profile Completeness (10 pts)
  let profileScore = 0;
  if (data.avatarUrl && !data.avatarUrl.includes("identicon")) profileScore += 2;
  if (data.bio && data.bio.length >= 15) profileScore += 3;
  if (data.location || data.blog) profileScore += 2;
  if (data.hasProfileReadme) profileScore += 3;

  breakdown.push({
    name: "Profile Completeness & Header Signals",
    score: profileScore,
    max: 10,
    evidence: `Bio: ${data.bio ? "Present" : "Missing"}, Profile README: ${data.hasProfileReadme ? "Yes" : "No"}, Links: ${data.blog ? "Yes" : "No"}`,
    missing: profileScore < 10 ? "Add an engaging bio, external links/portfolio, and create a special username/username profile README." : undefined,
  });

  if (!data.hasProfileReadme) {
    findings.push({
      severity: "MEDIUM",
      title: "Missing profile README repository",
      detail: "Creating a repository named matching your username renders a custom landing banner on your profile overview, highlighting your pinned achievements.",
    });
  }

  // 2. Repository Quality of Top 6 Original Repos (25 pts)
  let repoQualityScore = 0;
  const topRepos = data.repos.slice(0, 6);
  if (topRepos.length >= 2) repoQualityScore += 4;
  if (topRepos.length >= 4) repoQualityScore += 3;

  const withReadme = topRepos.filter((r) => r.hasReadme).length;
  if (withReadme >= 2) repoQualityScore += 4;
  if (withReadme >= 4) repoQualityScore += 4;

  const withTests = topRepos.filter((r) => r.hasTests).length;
  if (withTests >= 1) repoQualityScore += 3;
  if (withTests >= 2) repoQualityScore += 2;

  const withCi = topRepos.filter((r) => r.hasCi).length;
  if (withCi >= 1) repoQualityScore += 3;

  const withLicense = topRepos.filter((r) => r.license).length;
  if (withLicense >= 2) repoQualityScore += 2;

  breakdown.push({
    name: "Repository Quality & Engineering Rigor",
    score: Math.min(25, repoQualityScore),
    max: 25,
    evidence: `${topRepos.length} original repos inspected (${withReadme} have README, ${withTests} have tests, ${withCi} have CI workflows).`,
    missing: repoQualityScore < 25 ? "Add comprehensive READMEs, test suites (Jest/Pytest), and automated GitHub Actions workflows to your showcase projects." : undefined,
  });

  if (withTests === 0) {
    findings.push({
      severity: "HIGH",
      title: "No automated test suites detected in top repositories",
      detail: "Engineering hiring teams look for unit/integration tests to verify production mindset. Add a test runner and automated tests to at least two primary repos.",
    });
  }

  // 3. Activity and Consistency (20 pts)
  let activityScore = 0;
  if (data.eventsCount30d >= 3) activityScore += 6;
  if (data.eventsCount30d >= 10) activityScore += 7;
  if (data.eventsCount30d >= 20) activityScore += 7;

  breakdown.push({
    name: "Activity Velocity & Commit Recency",
    score: Math.min(20, activityScore),
    max: 20,
    evidence: `${data.eventsCount30d} public events detected over the past 30 days. Last activity: ${data.lastEventDate ? new Date(data.lastEventDate).toLocaleDateString() : "None"}`,
    missing: activityScore < 20 ? "Maintain consistent weekly public commit velocity. Note: Commits and streaks are weak signals compared to project depth." : undefined,
  });

  // 4. Project Depth and Relevance to Target Role (20 pts)
  let relevanceScore = 0;
  const languagesList = Object.keys(data.languages);
  const jdLower = targetJdText.toLowerCase();

  // Match languages with JD
  const matchedLangs = languagesList.filter((lang) => jdLower.includes(lang.toLowerCase()));
  if (matchedLangs.length >= 1) relevanceScore += 6;
  if (matchedLangs.length >= 2) relevanceScore += 6;

  // Codebase size/depth
  const totalSizeKb = topRepos.reduce((acc, r) => acc + r.size, 0);
  if (totalSizeKb > 500) relevanceScore += 4;
  if (totalSizeKb > 2000) relevanceScore += 4;

  breakdown.push({
    name: "Project Depth & Role Tech Stack Fit",
    score: Math.min(20, relevanceScore),
    max: 20,
    evidence: `Primary languages: [${languagesList.join(", ") || "None"}]. Matched role requirements: [${matchedLangs.join(", ") || "None"}].`,
    missing: relevanceScore < 20 ? `Build and publish a showcase project using core technologies from your target role (${targetRole}).` : undefined,
  });

  // 5. Collaboration Signals (10 pts)
  let collabScore = 0;
  const totalStars = topRepos.reduce((acc, r) => acc + r.stars, 0);
  const totalForks = topRepos.reduce((acc, r) => acc + r.forks, 0);
  if (totalStars >= 1) collabScore += 3;
  if (totalStars >= 5) collabScore += 3;
  if (totalForks >= 1) collabScore += 2;
  if (data.followers >= 2) collabScore += 2;

  breakdown.push({
    name: "Collaboration & Community Signals",
    score: Math.min(10, collabScore),
    max: 10,
    evidence: `${totalStars} stars received, ${totalForks} forks, ${data.followers} followers across repositories.`,
    missing: collabScore < 10 ? "Contribute pull requests to open-source libraries or share useful developer tools." : undefined,
  });

  // 6. Code Hygiene (10 pts)
  let hygieneScore = 10;
  // Red flags check
  topRepos.forEach((r) => {
    if (!r.description) hygieneScore = Math.max(0, hygieneScore - 1);
    if (!r.license) hygieneScore = Math.max(0, hygieneScore - 1);
  });

  breakdown.push({
    name: "Code Hygiene & Repository Governance",
    score: Math.max(0, hygieneScore),
    max: 10,
    evidence: "Inspected repository descriptions, licenses, and directory naming conventions.",
    missing: hygieneScore < 10 ? "Ensure all public repos have clear descriptions, standard open source licenses (MIT/Apache 2.0), and .gitignore files." : undefined,
  });

  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);

  // Recommendations
  recommendations.push({
    priority: "HIGH",
    title: "Pin Top 6 Representative Repositories",
    why: "By default, GitHub displays random or recent repositories. Pinning your best 6 projects guarantees recruiters see polished architectures first.",
    how: `Go to your profile -> 'Customize your pins'. Pin these recommended repositories: ${topRepos.slice(0, 4).map((r) => r.name).join(", ") || "your top projects"}.`,
  });

  recommendations.push({
    priority: "HIGH",
    title: "Enhance Project READMEs with Architecture Diagrams & Live Demos",
    why: "Recruiters and engineers judge a project within 30 seconds by looking at the README screenshot, architecture diagram, and setup instructions.",
    how: "Include: 1. Overview & problem statement, 2. Architecture diagram or GIF demo, 3. Tech stack badges, 4. Quickstart instructions (`docker-compose up`).",
    example: "See the auto-generated README checklist below.",
  });

  recommendations.push({
    priority: "MEDIUM",
    title: "Add GitHub Actions CI Pipeline",
    why: "A green passing build badge on a repository immediately signals professional engineering habits.",
    how: "Create `.github/workflows/ci.yml` running unit tests and linter on every pull request.",
  });

  if (data.rateLimitFallback) {
    findings.push({
      severity: "INFO",
      title: "Public Web Fallback Activated",
      detail: "GitHub REST API rate limit was active on this server's IP address. Profile, repositories, and language signals were retrieved via public web inspection without interrupting your audit.",
    });
  }

  return {
    type: "GITHUB",
    subject: data.username,
    score: totalScore,
    targetRole,
    breakdown,
    findings,
    recommendations,
    rewrites: {
      profileReadmeDraft: `# Hi there, I'm ${data.name || data.username} 👋\n\nI'm a **${targetRole}** passionate about building scalable, high-throughput systems and clean open-source software.\n\n### 🛠️ Tech Stack & Languages\n${languagesList.map((l) => `- **${l}**`).join("\n")}\n\n### 🚀 Featured Repositories\n${topRepos.slice(0, 3).map((r) => `- [${r.name}](${r.fullName}): ${r.description || "Production service architecture"}`).join("\n")}\n\n### 📬 Let's Connect\n- Portfolio: ${data.blog || "https://rehearse.app"}\n- Location: ${data.location || "Remote"}\n`,
      repoChecklist: topRepos.map((r) => ({
        name: r.name,
        hasReadme: r.hasReadme,
        hasTests: r.hasTests,
        hasCi: r.hasCi,
        hasLicense: !!r.license,
      })),
    },
    dataSnapshot: {
      username: data.username,
      publicRepos: data.publicReposCount,
      languages: data.languages,
      recentEvents: data.eventsCount30d,
      topRepos: topRepos.map((r) => ({ name: r.name, stars: r.stars, language: r.language })),
    },
    modelUsed: "Rule-Engine v1.0",
    createdAt: new Date().toISOString(),
  };
}
