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
import { DifficultyBadge } from "@/components/StatusBadges";
import { Search, Globe, ExternalLink, Inbox, RotateCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PublicQ {
  id: string;
  title: string;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard";
  platform: string | null;
  problem_link: string | null;
  tags: string[] | null;
  leetcode_number: string | null;
  created_at: string;
  profiles?: { display_name: string | null };
}

export default function PublicFeed() {
  const [items, setItems] = useState<PublicQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [practices, setPractices] = useState<Record<string, number>>({});
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("questions")
        .select("id,title,topic,difficulty,platform,problem_link,tags,leetcode_number,created_at, profiles(display_name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false });
      setItems((data ?? []) as any[]);

      if (user) {
        const { data: pData } = await (supabase as any)
          .from("user_practices")
          .select("question_id, count")
          .eq("user_id", user.id);
        
        if (pData) {
          const map: Record<string, number> = {};
          pData.forEach((p: any) => {
            if (p.question_id) map[p.question_id] = p.count;
          });
          setPractices(map);
        }
      }

      setLoading(false);
    })();
  }, [user]);

  const handlePractice = async (e: React.MouseEvent, qId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error("Please log in to track your practice sessions");
      return;
    }

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

    if (error) {
      console.error("Error updating practice:", error);
      toast.error("Failed to record practice");
    } else {
      setPractices(prev => ({ ...prev, [qId]: next }));
      toast.success("Practice recorded!");
    }
  };

  const topics = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.topic && set.add(i.topic));
    return Array.from(set);
  }, [items]);

  const filtered = items.filter((q) => {
    if (
      search &&
      !q.title.toLowerCase().includes(search.toLowerCase()) &&
      !q.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
      return false;
    if (topic !== "all" && q.topic !== topic) return false;
    if (difficulty !== "all" && q.difficulty !== difficulty) return false;
    return true;
  });

  return (
    <div className="container max-w-7xl py-8 px-4 md:px-8 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-5 w-5 text-success" />
            <h1 className="text-3xl font-bold">Public Library</h1>
          </div>
          <p className="text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "question" : "questions"} shared by the community
          </p>
        </div>
      </div>

      <Card className="p-4 border-border bg-card">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or tag..."
              className="pl-9"
            />
          </div>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-border bg-card">
          <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">
            {items.length === 0
              ? "No public questions yet. Be the first to share one!"
              : "No matches for your filters."}
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((q, index) => (
            <Link key={q.id} to={`/share/${q.id}`} className="group">
              <Card className="p-5 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all h-full flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    <span className="text-muted-foreground font-mono mr-2">{index + 1}.</span>
                    {q.title}
                  </h3>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
                  <span>{q.topic ?? "Uncategorized"} {q.platform && `· ${q.platform}`} · {format(new Date(q.created_at), "MMM d, yyyy")}</span>
                  <span className="font-medium text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                    by {q.profiles?.display_name || "Anonymous User"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {practices[q.id] > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-primary/20 text-primary border-primary/40 font-bold">
                      {practices[q.id]}x Practice
                    </Badge>
                  )}
                  <DifficultyBadge level={q.difficulty} />
                  {q.leetcode_number && (
                    <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">
                      LC #{q.leetcode_number}
                    </Badge>
                  )}
                </div>
                {q.tags && q.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {q.tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-border flex justify-end">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-[11px] font-semibold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary px-3 shadow-sm"
                    onClick={(e) => handlePractice(e, q.id)}
                  >
                    <RotateCw className="h-3 w-3 mr-1.5" /> Practice
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}