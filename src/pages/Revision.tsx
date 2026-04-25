import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/StatusBadges";
import { Sparkles, ArrowRight, TrendingDown, Brain } from "lucide-react";
import { toast } from "sonner";
import { calculateNextRevision, RATINGS } from "@/lib/revision";

export default function Revision() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("questions").select("*").eq("user_id", user.id).order("next_review_at", { ascending: true });
    setAllItems(data ?? []);
    // Show items that are either marked as needs_revision OR whose next_review_at is now/past
    const now = new Date().toISOString();
    setItems((data ?? []).filter((q) => q.needs_revision || (q.next_review_at && q.next_review_at <= now)));
  };

  useEffect(() => { load(); }, [user]);

  const weakTopics = useMemo(() => {
    const counts: Record<string, { revision: number; total: number }> = {};
    allItems.forEach((q) => {
      const t = q.topic ?? "Other";
      if (!counts[t]) counts[t] = { revision: 0, total: 0 };
      counts[t].total++;
      if (items.some(i => i.id === q.id)) counts[t].revision++;
    });
    return Object.entries(counts)
      .map(([topic, v]) => ({ topic, ...v, ratio: v.revision / v.total }))
      .filter((t) => t.revision > 0)
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 6);
  }, [allItems, items]);

  const handleRate = async (id: string, ratingValue: number) => {
    const update = calculateNextRevision(ratingValue);
    const { error } = await supabase.from("questions").update(update).eq("id", id);
    
    if (error) {
      toast.error("Failed to update revision");
      return;
    }

    setItems((prev) => prev.filter((p) => p.id !== id));
    toast.success("Scheduled for next revision!");
  };

  return (
    <div className="container max-w-6xl py-8 px-4 md:px-8 space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl gradient-card border border-primary/20 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Revision Queue</h1>
          <p className="text-muted-foreground">{items.length} question{items.length !== 1 && "s"} waiting for your attention</p>
        </div>
      </div>

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <Card className="p-6 border-border bg-card">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> Weak topics
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {weakTopics.map((t) => (
              <div key={t.topic} className="rounded-lg border border-border p-4 hover:border-primary/40 transition-colors">
                <div className="font-semibold mb-1">{t.topic}</div>
                <div className="text-xs text-muted-foreground">
                  {t.revision} of {t.total} need revision
                </div>
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full gradient-hero" style={{ width: `${t.ratio * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Queue */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Up for review</h2>
        {items.length === 0 ? (
          <Card className="p-12 text-center border-border bg-card">
            <Brain className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mb-4">Nothing to revise. Mark questions for revision from the questions list.</p>
            <Button asChild variant="outline"><Link to="/questions">Browse questions</Link></Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((q) => (
              <Card key={q.id} className="p-4 border-border bg-card hover:border-primary/40 transition-all flex items-center justify-between gap-4">
                <Link to={`/questions/${q.id}`} className="flex-1 min-w-0 group">
                  <div className="font-semibold truncate group-hover:text-primary transition-colors">{q.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <DifficultyBadge level={q.difficulty} />
                    {q.topic && <Badge variant="secondary" className="text-[10px]">{q.topic}</Badge>}
                  </div>
                </Link>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border">
                    {RATINGS.map((r) => (
                      <Button
                        key={r.value}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRate(q.id, r.value)}
                        className={`h-8 px-2 text-[10px] sm:text-xs font-semibold hover:${r.color.replace("text-", "bg-")}/10 ${r.color}`}
                      >
                        {r.label}
                      </Button>
                    ))}
                  </div>
                  <Button size="sm" asChild className="gradient-hero"><Link to={`/questions/${q.id}`}>Review <ArrowRight className="h-3 w-3 ml-1" /></Link></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
