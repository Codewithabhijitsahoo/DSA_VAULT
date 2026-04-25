import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DifficultyBadge, StatusBadge } from "@/components/StatusBadges";
import { Search, PlusCircle, ExternalLink, Star, Sparkles, Trash2, Edit3, Inbox, Globe, Lock, RotateCw } from "lucide-react";
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

export default function MyQuestions() {
  const { user } = useAuth();
  const [items, setItems] = useState<Q[]>([]);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [practices, setPractices] = useState<Record<string, number>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("questions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Q[]);

    // Fetch practice counts
    const { data: practiceData } = await (supabase as any)
      .from("user_practices")
      .select("question_id, count")
      .eq("user_id", user.id);
    
    if (practiceData) {
      const map: Record<string, number> = {};
      practiceData.forEach((p: any) => {
        if (p.question_id) map[p.question_id] = p.count || 0;
      });
      setPractices(map);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const topics = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.topic && set.add(i.topic));
    return Array.from(set);
  }, [items]);

  const filtered = items.filter((q) => {
    if (search && !q.title.toLowerCase().includes(search.toLowerCase()) && !q.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))) return false;
    if (topic !== "all" && q.topic !== topic) return false;
    if (difficulty !== "all" && q.difficulty !== difficulty) return false;
    if (status !== "all" && q.status !== status) return false;
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
      // Duplicate Check for Public Library
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
          toast.error(`A question with this title/link already exists in the Public Library!`, {
            description: "Duplicates are not allowed in the community feed.",
          });
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
    toast.success("Deleted");
  };

  const handlePractice = async (qId: string) => {
    if (!user) return;
    const current = practices[qId] || 0;
    const next = current + 1;
    
    const { error } = await (supabase as any)
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
      toast.success("Practice recorded!", {
        description: `Total practices for this question: ${next}`
      });
    } else {
      toast.error("Failed to record practice");
    }
  };

  return (
    <div className="container max-w-7xl py-8 px-4 md:px-8 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Questions</h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} {filtered.length === 1 ? "question" : "questions"} in your vault
          </p>
        </div>
        <Button asChild className="gradient-hero text-primary-foreground hover:opacity-90 shadow-glow">
          <Link to="/add"><PlusCircle className="h-4 w-4 mr-1.5" /> New question</Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 border-border bg-card">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or tag..." className="pl-9" />
          </div>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="solved">Solved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="revisit">Revisit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-border bg-card">
          <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground mb-4">{items.length === 0 ? "Your vault is empty." : "No matches."}</p>
          {items.length === 0 && (
            <Button asChild>
              <Link to="/add"><PlusCircle className="h-4 w-4 mr-1.5" /> Add your first question</Link>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((q, index) => (
            <Card key={q.id} className="p-5 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between gap-3 mb-3">
                <Link to={`/questions/${q.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    <span className="text-muted-foreground/60 font-mono mr-2">{index + 1}.</span>
                    {q.title}
                  </h3>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {q.topic ?? "Uncategorized"} {q.platform && `· ${q.platform}`}
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
                    {q.is_public
                      ? <Globe className="h-3.5 w-3.5 text-success" />
                      : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <DifficultyBadge level={q.difficulty} />
                <StatusBadge status={q.status} />
                {q.is_public && (
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">
                    <Globe className="h-2.5 w-2.5 mr-0.5" /> Public
                  </Badge>
                )}
                {q.leetcode_number && (
                  q.problem_link ? (
                    <a href={q.problem_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30 hover:bg-primary/20">LC #{q.leetcode_number}</Badge>
                    </a>
                  ) : (
                    <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">LC #{q.leetcode_number}</Badge>
                  )
                )}
                {q.time_complexity && (
                  <Badge variant="outline" className="font-mono text-[10px]">{q.time_complexity}</Badge>
                )}
              </div>

              {q.tags && q.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {q.tags.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
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
                        <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
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
  );
}
