const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LCQuestion {
  title: string;
  titleSlug: string;
  questionFrontendId: string;
  difficulty: string;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { title } = await req.json();
    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const lcRes = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://leetcode.com",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify({
        query,
        variables: {
          categorySlug: "",
          skip: 0,
          limit: 20,
          filters: { searchKeywords: title.trim() },
        },
      }),
    });

    if (!lcRes.ok) {
      return new Response(JSON.stringify({ found: false, error: "LeetCode API unavailable" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await lcRes.json();
    const questions: LCQuestion[] = data?.data?.problemsetQuestionList?.questions ?? [];

    if (questions.length === 0) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick best match by similarity
    let best: LCQuestion | null = null;
    let bestScore = 0;
    for (const q of questions) {
      const s = similarity(title, q.title);
      if (s > bestScore) { bestScore = s; best = q; }
    }

    if (!best || bestScore < 0.4) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      found: true,
      questionNumber: best.questionFrontendId,
      title: best.title,
      difficulty: best.difficulty,
      url: `https://leetcode.com/problems/${best.titleSlug}/`,
      score: bestScore,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, found: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});