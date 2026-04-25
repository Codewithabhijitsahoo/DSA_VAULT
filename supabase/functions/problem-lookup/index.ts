import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Question {
  title: string;
  url: string;
  questionNumber: string;
  difficulty: string;
  source: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (nb.includes(na) || na.includes(nb)) return 0.9;
  const aw = new Set(na.split(" "));
  const bw = new Set(nb.split(" "));
  let common = 0;
  aw.forEach((w) => { if (bw.has(w)) common++; });
  return common / Math.max(aw.size, bw.size);
}

async function lookupLeetCode(title: string): Promise<Question | null> {
  const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        questions: data {
          title
          titleSlug
          questionFrontendId
          difficulty
        }
      }
    }`;

  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Referer": "https://leetcode.com",
    },
    body: JSON.stringify({
      query,
      variables: {
        categorySlug: "",
        skip: 0,
        limit: 10,
        filters: { searchKeywords: title },
      },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const questions = data?.data?.problemsetQuestionList?.questions || [];
  
  let best: any = null;
  let bestScore = 0;
  for (const q of questions) {
    const s = similarity(title, q.title);
    if (s > bestScore) { bestScore = s; best = q; }
  }

  if (!best || bestScore < 0.4) return null;

  return {
    title: best.title,
    url: `https://leetcode.com/problems/${best.titleSlug}/`,
    questionNumber: best.questionFrontendId,
    difficulty: best.difficulty.toLowerCase(),
    source: "LeetCode",
  };
}

async function lookupCodeforces(title: string): Promise<Question | null> {
  // We fetch the latest problems. This is heavy but Codeforces doesn't have a good search API.
  // In a real app, you'd cache this or use a search engine.
  const res = await fetch("https://codeforces.com/api/problemset.problems");
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK") return null;

  const problems = data.result.problems;
  let best: any = null;
  let bestScore = 0;

  // We only search the last 2000 problems to keep it relatively fast
  const searchSpace = problems.slice(0, 2000);

  for (const p of searchSpace) {
    const s = similarity(title, p.name);
    if (s > bestScore) {
      bestScore = s;
      best = p;
      if (s === 1) break; 
    }
  }

  if (!best || bestScore < 0.5) return null;

  let difficulty = "medium";
  if (best.rating) {
    if (best.rating < 1200) difficulty = "easy";
    else if (best.rating > 1900) difficulty = "hard";
  }

  return {
    title: best.name,
    url: `https://codeforces.com/problemset/problem/${best.contestId}/${best.index}`,
    questionNumber: `${best.contestId}${best.index}`,
    difficulty,
    source: "Codeforces",
  };
}

async function lookupAtCoder(title: string): Promise<Question | null> {
  const res = await fetch("https://kenkoooo.com/atcoder/resources/problems.json");
  if (!res.ok) return null;
  const problems = await res.json();

  let best: any = null;
  let bestScore = 0;

  for (const p of problems) {
    const s = similarity(title, p.name);
    if (s > bestScore) {
      bestScore = s;
      best = p;
      if (s === 1) break;
    }
  }

  if (!best || bestScore < 0.6) return null;

  // AtCoder difficulties are harder to map from this API alone, default to medium
  return {
    title: best.name,
    url: `https://atcoder.jp/contests/${best.contest_id}/tasks/${best.id}`,
    questionNumber: best.id,
    difficulty: "medium",
    source: "AtCoder",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title, platform } = await req.json();
    if (!title || !platform) throw new Error("Title and Platform required");

    let result: Question | null = null;
    if (platform === "LeetCode") result = await lookupLeetCode(title);
    else if (platform === "Codeforces") result = await lookupCodeforces(title);
    else if (platform === "AtCoder") result = await lookupAtCoder(title);

    if (result) {
      return new Response(JSON.stringify({ found: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
