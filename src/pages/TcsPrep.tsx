import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPlatformPrefix } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge, StatusBadge } from "@/components/StatusBadges";
import {
  Search,
  PlusCircle,
  ExternalLink,
  Star,
  Sparkles,
  Trash2,
  Edit3,
  Inbox,
  Globe,
  Lock,
  RotateCw,
  Award,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Q {
  id: string;
  title: string;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard";
  status: "solved" | "pending" | "revisit";
  platform: string | null;
  problem_link: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  needs_revision: boolean;
  created_at: string;
  time_complexity: string | null;
  leetcode_number: string | null;
  is_public: boolean;
}

export default function TcsPrep() {
  const { user } = useAuth();
  
  const [items, setItems] = useState<Q[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [practices, setPractices] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("user_id", user.id)
        .ilike("platform", "TCS")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data ?? []) as Q[]);

      // Fetch practice counts
      const { data: practiceData } = await (supabase as unknown as {
        from: (table: string) => {
          select: (columns: string) => {
            eq: (column: string, value: string) => Promise<{
              data: Array<{ question_id: string; count: number }> | null;
            }>;
          };
        };
      })
        .from("user_practices")
        .select("question_id, count")
        .eq("user_id", user.id);
      
      if (practiceData) {
        const map: Record<string, number> = {};
        practiceData.forEach((p) => {
          if (p.question_id) map[p.question_id] = p.count || 0;
        });
        setPractices(map);
      }
    } catch (e: unknown) {
      toast.error("Error loading TCS questions: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = items.length;
    const solved = items.filter((q) => q.status === "solved").length;
    return { total, solved };
  }, [items]);

  const filtered = items.filter((q) => {
    if (search) {
      const lower = search.toLowerCase();
      const matchTitle = q.title.toLowerCase().includes(lower);
      const matchTopic = (q.topic || "").toLowerCase().includes(lower);
      const matchTags = q.tags?.some((t) => t.toLowerCase().includes(lower));
      return matchTitle || matchTopic || matchTags;
    }
    return true;
  });

  const toggleFav = async (q: Q) => {
    await supabase.from("questions").update({ is_favorite: !q.is_favorite }).eq("id", q.id);
    setItems((prev) => prev.map((p) => (p.id === q.id ? { ...p, is_favorite: !p.is_favorite } : p)));
  };

  const toggleRev = async (q: Q) => {
    await supabase.from("questions").update({ needs_revision: !q.needs_revision }).eq("id", q.id);
    setItems((prev) => prev.map((p) => (p.id === q.id ? { ...p, needs_revision: !p.needs_revision } : p)));
    toast.success(q.needs_revision ? "Removed from revision" : "Added to revision queue");
  };

  const togglePublic = async (q: Q) => {
    const next = !q.is_public;
    if (next) {
      const title = (q.title || "").trim();
      let query = supabase
        .from("questions")
        .select("id, title")
        .eq("is_public", true);

      const filters = [];
      if (title) filters.push(`title.ilike."${title}"`);
      if (q.problem_link) filters.push(`problem_link.eq."${q.problem_link.trim()}"`);
      if (q.leetcode_number) filters.push(`leetcode_number.eq."${q.leetcode_number.trim()}"`);

      if (filters.length > 0) {
        query = query.or(filters.join(",")).neq("id", q.id);
        const { data: existing, error: checkError } = await query.limit(1);

        if (!checkError && existing && existing.length > 0) {
          toast.error(`A question with this title/link already exists in the Public Library!`);
          return;
        }
      }
    }

    const { error } = await supabase.from("questions").update({ is_public: next }).eq("id", q.id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((p) => (p.id === q.id ? { ...p, is_public: next } : p)));
    toast.success(next ? "Question is now public" : "Question is now private");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.filter((p) => p.id !== id));
    toast.success("Deleted from vault");
  };

  const handlePractice = async (qId: string) => {
    if (!user) return;
    const current = practices[qId] || 0;
    const next = current + 1;

    const { error } = await (supabase as unknown as {
      from: (table: string) => {
        upsert: (
          data: { user_id: string; question_id: string; count: number; updated_at: string },
          options: { onConflict: string }
        ) => Promise<{ error: Error | null }>;
      };
    })
      .from("user_practices")
      .upsert({
        user_id: user.id,
        question_id: qId,
        count: next,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,question_id'
      });

    if (!error) {
      setPractices(prev => ({ ...prev, [qId]: next }));
      toast.success("Practice recorded!");
    } else {
      toast.error("Failed to record practice");
    }
  };

  return (
    <div className="container max-w-5xl py-8 px-4 md:px-8 space-y-8 animate-fade-in">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-border p-6 md:p-8 gradient-card flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="space-y-3 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Award className="h-3.5 w-3.5" /> Exam Preparation
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">TCS Prep Vault</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Store, categorize, and master questions for TCS NQT, TCS Digital, Ninja, and TCS CodeVita.
          </p>
        </div>
        <Button asChild size="lg" className="gradient-hero text-primary-foreground hover:opacity-90 shadow-glow shrink-0">
          <Link to="/add?platform=TCS">
            <PlusCircle className="h-5 w-5 mr-2" /> Add TCS Question
          </Link>
        </Button>
      </div>

      {/* TCS Stats */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Card className="p-4 border-border bg-card text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total TCS Questions</div>
          <div className="text-2xl md:text-3xl font-extrabold text-primary">{stats.total}</div>
        </Card>
        <Card className="p-4 border-border bg-card text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Solved</div>
          <div className="text-2xl md:text-3xl font-extrabold text-success">{stats.solved}</div>
        </Card>
      </div>

      {/* Main List */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Saved Questions ({filtered.length})
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, tag, or topic..."
              className="pl-8 h-8 text-xs w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-border bg-card flex flex-col items-center justify-center">
            <Inbox className="h-12 w-12 text-muted-foreground opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {items.length === 0 ? "You haven't saved any TCS questions yet!" : "No matches found."}
            </p>
            {items.length === 0 && (
              <Button asChild variant="outline" size="sm">
                <Link to="/add?platform=TCS">
                  <PlusCircle className="h-4 w-4 mr-1.5" /> Save your first TCS question
                </Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((q, index) => (
              <Card
                key={q.id}
                className="p-5 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Link to={`/questions/${q.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors text-base">
                        <span className="text-muted-foreground/60 font-mono mr-2">{index + 1}.</span>
                        {q.title}
                      </h3>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {q.topic ?? "Uncategorized"} · {q.platform}
                      </div>
                    </Link>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleFav(q)}>
                        <Star className={`h-3.5 w-3.5 ${q.is_favorite ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleRev(q)}>
                        <Sparkles className={`h-3.5 w-3.5 ${q.needs_revision ? "fill-info/30 text-info" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => togglePublic(q)}
                        title={q.is_public ? "Public — click to make private" : "Private — click to make public"}
                      >
                        {q.is_public ? (
                          <Globe className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <DifficultyBadge level={q.difficulty} />
                    <StatusBadge status={q.status} />
                    {q.time_complexity && (
                      <Badge variant="outline" className="font-mono text-[10px]">{q.time_complexity}</Badge>
                    )}
                    {q.tags && q.tags.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border mt-4">
                  <div className="flex items-center gap-1">
                    {q.problem_link && (
                      <Button size="sm" variant="ghost" asChild className="h-7">
                        <a href={q.problem_link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Open
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild className="h-7">
                      <Link to={`/edit/${q.id}`}><Edit3 className="h-3 w-3 mr-1" /> Edit</Link>
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] font-semibold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 shadow-sm"
                      onClick={() => handlePractice(q.id)}
                    >
                      <RotateCw className="h-3 w-3 mr-1.5" /> Practice {practices[q.id] > 0 && `(${practices[q.id]})`}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                          <AlertDialogDescription>This will remove it from your vault permanently.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(q.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
