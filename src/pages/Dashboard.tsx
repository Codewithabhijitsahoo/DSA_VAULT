import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListChecks, CheckCircle2, Clock, Sparkles, PlusCircle, Search, TrendingUp, Quote, Globe } from "lucide-react";
import { DifficultyBadge, StatusBadge } from "@/components/StatusBadges";
import { formatDistanceToNow } from "date-fns";

const QUOTES = [
  { q: "First, solve the problem. Then, write the code.", a: "John Johnson" },
  { q: "The function of good software is to make the complex appear simple.", a: "Grady Booch" },
  { q: "Talk is cheap. Show me the code.", a: "Linus Torvalds" },
  { q: "Programs must be written for people to read, and only incidentally for machines to execute.", a: "Harold Abelson" },
  { q: "It always seems impossible until it's done.", a: "Nelson Mandela" },
  { q: "Practice does not make perfect. Perfect practice makes perfect.", a: "Vince Lombardi" },
];

interface Question {
  id: string;
  title: string;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard";
  status: "solved" | "pending" | "revisit";
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, solved: 0, pending: 0, publicTotal: 0 });
  const [recent, setRecent] = useState<Question[]>([]);
  const [practices, setPractices] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const [{ data: qs }, { data: profile }, { count: publicCount }] = await Promise.all([
        supabase.from("questions").select("id,title,topic,difficulty,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("questions").select("*", { count: "exact", head: true }).eq("is_public", true),
      ]);

      const all = qs ?? [];
      setStats({
        total: all.length,
        solved: all.filter((q) => q.status === "solved").length,
        pending: all.filter((q) => q.status === "pending").length,
        publicTotal: publicCount ?? 0,
      });
      setRecent(all.slice(0, 5) as Question[]);
      setName(profile?.display_name ?? user.email?.split("@")[0] ?? "there");

      // Fetch practice counts for recent items
      const recentIds = all.slice(0, 5).map(q => q.id);
      if (recentIds.length > 0) {
        const { data: pData } = await (supabase as any)
          .from("user_practices")
          .select("question_id, count")
          .in("question_id", recentIds)
          .eq("user_id", user.id);
        
        if (pData) {
          const map: Record<string, number> = {};
          pData.forEach((p: any) => { map[p.question_id] = p.count; });
          setPractices(map);
        }
      }
    };
    load();
  }, [user]);

  const statCards = [
    { label: "Your Questions", value: stats.total, icon: ListChecks, color: "text-primary" },
    { label: "Solved by you", value: stats.solved, icon: CheckCircle2, color: "text-success" },
    { label: "Public Library", value: stats.publicTotal, icon: Globe, color: "text-info" },
  ];

  const filteredRecent = search
    ? recent.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || r.topic?.toLowerCase().includes(search.toLowerCase()))
    : recent;

  return (
    <div className="container max-w-6xl py-8 px-4 md:px-8 space-y-8 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Welcome back, <span className="text-gradient">{name}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's what's in your vault today.</p>
        </div>
        <Button asChild className="gradient-hero text-primary-foreground hover:opacity-90 shadow-glow">
          <Link to="/add"><PlusCircle className="h-4 w-4 mr-1.5" /> Save new question</Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your saved questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 text-base bg-card border-border"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-3xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Two column */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent */}
        <Card className="lg:col-span-2 p-6 border-border bg-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Recent activity
            </h2>
            <Link to="/questions" className="text-sm text-primary hover:underline">View all</Link>
          </div>

          {filteredRecent.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-4">{search ? "No matches in recent." : "Your vault is empty. Save your first question!"}</p>
              {!search && (
                <Button asChild variant="outline">
                  <Link to="/add"><PlusCircle className="h-4 w-4 mr-1.5" /> Get started</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecent.map((q) => (
                <Link
                  key={q.id}
                  to={`/questions/${q.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/40 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate group-hover:text-primary transition-colors">{q.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {q.topic ?? "Uncategorized"} · {formatDistanceToNow(new Date(q.created_at))} ago
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {practices[q.id] > 0 && (
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-bold">
                        {practices[q.id]}x
                      </span>
                    )}
                    <DifficultyBadge level={q.difficulty} />
                    <StatusBadge status={q.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Quote */}
        <Card className="p-6 border-border gradient-card relative overflow-hidden">
          <Quote className="absolute -top-2 -right-2 h-24 w-24 text-primary/10" />
          <div className="relative">
            <div className="text-xs uppercase tracking-wider text-primary mb-3 font-semibold">Daily fuel</div>
            <p className="text-base leading-relaxed font-medium">"{quote.q}"</p>
            <div className="text-sm text-muted-foreground mt-3">— {quote.a}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
