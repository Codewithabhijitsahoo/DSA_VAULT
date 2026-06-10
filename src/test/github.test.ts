import { describe, it, expect, vi } from "vitest";
import {
  slugify,
  getCommentPrefix,
  getGithubFilePath,
  formatCodeForPush,
  pushQuestionToGithub,
} from "../lib/github";

describe("GitHub Helper Functions", () => {
  describe("slugify", () => {
    it("converts mixed case and spaces to lowercase underscores", () => {
      expect(slugify("Hello World")).toBe("hello_world");
    });

    it("removes special characters and replaces spaces with underscores", () => {
      expect(slugify("LeetCode #123: Two Sum!")).toBe("leetcode_123_two_sum");
    });

    it("handles multiple spaces and consecutive underscores", () => {
      expect(slugify("  Multiple   Spaces  ")).toBe("multiple_spaces");
      expect(slugify("Multiple__Spaces")).toBe("multiple_spaces");
    });
  });

  describe("getCommentPrefix", () => {
    it("returns # for python, ruby, etc.", () => {
      expect(getCommentPrefix("python")).toBe("#");
      expect(getCommentPrefix("Python")).toBe("#");
      expect(getCommentPrefix("ruby")).toBe("#");
    });

    it("returns -- for sql, lua, etc.", () => {
      expect(getCommentPrefix("sql")).toBe("--");
      expect(getCommentPrefix("lua")).toBe("--");
    });

    it("returns // for other languages (javascript, typescript, cpp, etc.)", () => {
      expect(getCommentPrefix("javascript")).toBe("//");
      expect(getCommentPrefix("cpp")).toBe("//");
      expect(getCommentPrefix("java")).toBe("//");
      expect(getCommentPrefix(null)).toBe("//");
    });
  });

  describe("getGithubFilePath", () => {
    it("generates correct file path with platform, number, and slugified title", () => {
      const q = {
        title: "Two Sum",
        platform: "LeetCode",
        leetcode_number: "1",
        language: "python",
      };
      expect(getGithubFilePath(q, "solutions")).toBe("solutions/leetcode/1_two_sum.py");
    });

    it("handles missing platform or leetcode_number", () => {
      const q = {
        title: "Reverse a String",
        platform: null,
        leetcode_number: null,
        language: "javascript",
      };
      expect(getGithubFilePath(q, "src/solutions")).toBe("src/solutions/reverse_a_string.js");
    });

    it("uses txt fallback extension for unknown language", () => {
      const q = {
        title: "Brainteaser",
        platform: "Custom",
        leetcode_number: null,
        language: "unknown-lang",
      };
      expect(getGithubFilePath(q, "docs")).toBe("docs/custom/brainteaser.txt");
    });
  });

  describe("formatCodeForPush", () => {
    it("returns only the code without header comments", () => {
      const q = {
        title: "Two Sum",
        difficulty: "easy",
        platform: "LeetCode",
        problem_link: "https://leetcode.com/problems/two-sum",
        time_complexity: "O(n)",
        space_complexity: "O(n)",
        code: "def twoSum(nums):\n    return []",
        language: "python",
      };

      const result = formatCodeForPush(q);
      expect(result).toBe("def twoSum(nums):\n    return []");
    });
  });

  describe("pushQuestionToGithub custom_filename", () => {
    it("uses custom filename with automatic extension when pushing", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ sha: "mock_sha", content: { html_url: "https://github.com/mock/repo/blob/main/solutions/my_solution.py" } }),
        })
      ) as any;

      const q = {
        title: "Two Sum",
        difficulty: "easy",
        platform: "LeetCode",
        leetcode_number: "1",
        problem_link: null,
        time_complexity: null,
        space_complexity: null,
        code: "print('hello')",
        language: "python",
        custom_filename: "my_solution",
      };

      const config = {
        token: "mock_token",
        username: "mock_user",
        repo: "mock_repo",
        branch: "main",
        path: "solutions",
      };

      const result = await pushQuestionToGithub(q, config);
      expect(result.success).toBe(true);
      expect(result.filePath).toBe("solutions/my_solution.py");

      global.fetch = originalFetch;
    });
  });

  describe("pushQuestionToGithub custom_commit_message", () => {
    it("uses custom commit message when pushing", async () => {
      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ sha: "mock_sha", content: { html_url: "https://github.com/mock/repo/blob/main/solutions/1_two_sum.py" } }),
        })
      );
      global.fetch = mockFetch as any;

      const q = {
        title: "Two Sum",
        difficulty: "easy",
        platform: "LeetCode",
        leetcode_number: "1",
        problem_link: null,
        time_complexity: null,
        space_complexity: null,
        code: "print('hello')",
        language: "python",
      };

      const config = {
        token: "mock_token",
        username: "mock_user",
        repo: "mock_repo",
        branch: "main",
        path: "solutions",
      };

      const customCommitMessage = "feat: initial commit for two sum";
      const result = await pushQuestionToGithub(q, config, customCommitMessage);
      expect(result.success).toBe(true);
      
      const putCall = mockFetch.mock.calls.find(call => call[1]?.method === "PUT");
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall[1].body);
      expect(body.message).toBe(customCommitMessage);

      global.fetch = originalFetch;
    });
  });
});
