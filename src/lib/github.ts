interface GithubConfig {
  token: string;
  username: string;
  repo: string;
  branch: string;
  path: string;
}

const extensionMap: Record<string, string> = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  cpp: "cpp",
  c: "c",
  java: "java",
  csharp: "cs",
  go: "go",
  rust: "rs",
  ruby: "rb",
  swift: "swift",
  kotlin: "kt",
  sql: "sql",
  php: "php",
  html: "html",
  css: "css",
};

export function getGithubConfig(): GithubConfig | null {
  const stored = localStorage.getItem("dsa_vault_github_config");
  if (!stored) return null;
  try {
    const config = JSON.parse(stored);
    return {
      token: config.token || "",
      username: config.username || "",
      repo: config.repo || "",
      branch: config.branch || "main",
      path: config.path || "solutions",
    };
  } catch {
    return null;
  }
}

export function saveGithubConfig(config: GithubConfig) {
  localStorage.setItem("dsa_vault_github_config", JSON.stringify(config));
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")           // Replace spaces with _
    .replace(/[^\w-]+/g, "")         // Remove all non-word chars
    .replace(/__+/g, "_");          // Replace multiple _ with single _
}

export function getCommentPrefix(language: string | null): string {
  const lang = language?.toLowerCase() || "";
  if (["python", "ruby", "perl", "yaml", "bash", "r"].includes(lang)) {
    return "#";
  }
  if (["sql", "lua", "haskell"].includes(lang)) {
    return "--";
  }
  return "//";
}

export function getGithubFilePath(
  q: { title: string; platform: string | null; leetcode_number: string | null; language: string | null },
  configPath: string
) {
  const ext = extensionMap[q.language?.toLowerCase() || ""] || "txt";
  const titleSlug = slugify(q.title);
  const platformFolder = q.platform ? slugify(q.platform) : "";
  const numPrefix = q.leetcode_number ? `${q.leetcode_number}_` : "";
  
  const folder = configPath.trim().replace(/^\/+|\/+$/g, "");
  const parts = [];
  if (folder) parts.push(folder);
  if (platformFolder) parts.push(platformFolder);
  parts.push(`${numPrefix}${titleSlug}.${ext}`);
  
  return parts.join("/");
}

export function formatCodeForPush(q: {
  title: string;
  difficulty: string | null;
  platform: string | null;
  problem_link: string | null;
  time_complexity: string | null;
  space_complexity: string | null;
  code: string | null;
  language: string | null;
}) {
  const comment = getCommentPrefix(q.language);
  const lines = [
    `${comment} Title: ${q.title}`,
    q.difficulty ? `${comment} Difficulty: ${q.difficulty.toUpperCase()}` : null,
    q.platform ? `${comment} Platform: ${q.platform}` : null,
    q.problem_link ? `${comment} Link: ${q.problem_link}` : null,
    q.time_complexity ? `${comment} Time Complexity: ${q.time_complexity}` : null,
    q.space_complexity ? `${comment} Space Complexity: ${q.space_complexity}` : null,
    comment,
  ].filter(Boolean) as string[];

  const header = lines.join("\n") + "\n\n";
  return header + (q.code || "");
}

// Convert string to base64 safely supporting Unicode characters
function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export async function testGithubConnection(config: GithubConfig): Promise<{ success: boolean; message: string }> {
  if (!config.token) return { success: false, message: "Token is required." };
  if (!config.username) return { success: false, message: "Username is required." };
  if (!config.repo) return { success: false, message: "Repository name is required." };

  try {
    // 1. Test token validity & username match
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return { success: false, message: "Invalid token. Please check your token." };
      }
      return { success: false, message: `GitHub API error: ${userRes.statusText}` };
    }

    const userData = await userRes.json();
    
    // We check if username is correct or user belongs to that org, 
    // but just checking the repo exists is more definitive.
    const repoRes = await fetch(`https://api.github.com/repos/${config.username}/${config.repo}`, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (repoRes.status === 404) {
      return { 
        success: false, 
        message: `Repository "${config.repo}" not found under user/org "${config.username}". Make sure the repo exists and the token has access to it.` 
      };
    }

    if (!repoRes.ok) {
      return { success: false, message: `Error accessing repository: ${repoRes.statusText}` };
    }

    return { 
      success: true, 
      message: `Successfully connected to repository! Connected user: ${userData.login}` 
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Network error. Please try again." };
  }
}

export async function pushQuestionToGithub(
  q: {
    title: string;
    difficulty: string | null;
    platform: string | null;
    leetcode_number: string | null;
    problem_link: string | null;
    time_complexity: string | null;
    space_complexity: string | null;
    code: string | null;
    language: string | null;
  },
  config: GithubConfig,
  customCommitMessage?: string
): Promise<{ success: boolean; filePath: string; htmlUrl?: string; message?: string }> {
  const filePath = getGithubFilePath(q, config.path);
  const content = formatCodeForPush(q);
  const commitMessage = customCommitMessage?.trim() || `docs: add solution for ${q.title} (${q.platform || "DSA Vault"})`;

  try {
    // 1. Check if file already exists to get SHA
    const fileUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${filePath}?ref=${config.branch}`;
    const getFileRes = await fetch(fileUrl, {
      headers: {
        Authorization: `token ${config.token}`,
        Accept: "application/vnd.github+json",
      },
    });

    let sha: string | undefined;
    if (getFileRes.ok) {
      const fileData = await getFileRes.json();
      sha = fileData.sha;
    }

    // 2. Put file contents
    const putUrl = `https://api.github.com/repos/${config.username}/${config.repo}/contents/${filePath}`;
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: {
        Authorization: `token ${config.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: toBase64(content),
        sha,
        branch: config.branch,
      }),
    });

    if (!putRes.ok) {
      const errData = await putRes.json();
      return { 
        success: false, 
        filePath, 
        message: errData.message || `Failed to push file: ${putRes.statusText}` 
      };
    }

    const resData = await putRes.json();
    return {
      success: true,
      filePath,
      htmlUrl: resData.content?.html_url || `https://github.com/${config.username}/${config.repo}/blob/${config.branch}/${filePath}`,
    };
  } catch (error: any) {
    return {
      success: false,
      filePath,
      message: error.message || "An unexpected network error occurred while pushing to GitHub.",
    };
  }
}
