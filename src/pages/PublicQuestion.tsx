import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/CodeEditor";
import { DifficultyBadge, StatusBadge } from "@/components/StatusBadges";
import { ExternalLink, Loader2, Globe, ArrowLeft, RotateCw } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function PublicQuestion() {
  const { id } = useParams();
  const [q, setQ] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [practiceCount, setPracticeCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    supabase
      .from("questions")
      .select("*, profiles(display_name)")
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle()
      .then(({ data }) => {
        setQ(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    (supabase as any)
      .from("user_practices")
      .select("count")
      .eq("user_id", user.id)
      .eq("question_id", id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setPracticeCount(data.count);
      });
  }, [id, user]);

  const handlePractice = async () => {
    if (!user || !id) {
      toast.error("Please log in to track your practice sessions");
      return;
    }
    const next = practiceCount + 1;
    const { error } = await (supabase as any)
      .from("user_practices")
      .upsert({
        user_id: user.id,
        question_id: id,
        count: next,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,question_id' });
    
    if (!error) {
      setPracticeCount(next);
      toast.success("Practice recorded!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!q) {
    return (
      <div className="container max-w-3xl py-12 text-center">
        <p className="text-muted-foreground mb-4">
          This question is private or doesn't exist.
        </p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container max-w-4xl py-4 px-4 md:px-8 flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
            <Link to="/public"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Link to="/" className="font-bold text-lg">ReviseWise</Link>
        </div>
      </header>

      <div className="container max-w-4xl py-8 px-4 md:px-8 space-y-6 animate-fade-in">
        <Badge variant="outline" className="bg-success/10 text-success border-success/30">
          <Globe className="h-3 w-3 mr-1" /> Public question
        </Badge>

        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{q.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge level={q.difficulty} />
            <StatusBadge status={q.status} />
            {q.topic && <Badge variant="secondary">{q.topic}</Badge>}
            {q.platform && <Badge variant="outline">{q.platform}</Badge>}
            {q.leetcode_number && (
              q.problem_link ? (
                <a href={q.problem_link} target="_blank" rel="noopener noreferrer" className="inline-flex">
                  <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 cursor-pointer">
                    LC #{q.leetcode_number} <ExternalLink className="h-3 w-3 ml-1" />
                  </Badge>
                </a>
              ) : (
                <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30">LC #{q.leetcode_number}</Badge>
              )
            )}
            <div className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
              <span className="font-semibold text-primary/80 bg-primary/5 px-2 py-1 rounded border border-primary/10">
                Shared by {q.profiles?.display_name || "Anonymous User"}
              </span>
              <span>{format(new Date(q.created_at), "MMM d, yyyy")}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {q.problem_link && (
              <Button variant="outline" size="sm" asChild>
                <a href={q.problem_link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Original problem
                </a>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePractice}
              className="border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
            >
              <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Practice {practiceCount > 0 && `(${practiceCount})`}
            </Button>
          </div>
        </header>

        {q.problem_statement && (
          <Card className="p-6 border-border bg-card">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Problem</h2>
            <p className="whitespace-pre-wrap leading-relaxed">{q.problem_statement}</p>
          </Card>
        )}

        {(q.answer || q.explanation) && (
          <Card className="p-6 border-border bg-card space-y-4">
            {q.answer && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Approach</h2>
                <p className="whitespace-pre-wrap leading-relaxed">{q.answer}</p>
              </div>
            )}
            {q.explanation && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Explanation</h2>
                <p className="whitespace-pre-wrap leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </Card>
        )}

        {q.code && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Original Solution</h2>
            <CodeEditor value={q.code} onChange={() => {}} language={q.language ?? "python"} onLanguageChange={() => {}} height="400px" />
          </div>
        )}

        {(q.time_complexity || q.space_complexity) && (
          <Card className="p-6 border-border bg-card">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Complexity</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Time</div>
                <div className="font-mono text-lg font-semibold">{q.time_complexity || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Space</div>
                <div className="font-mono text-lg font-semibold">{q.space_complexity || "—"}</div>
              </div>
            </div>
          </Card>
        )}

        {q.tags && q.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {q.tags.map((t: string) => (
              <span key={t} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">#{t}</span>
            ))}
          </div>
        )}

        <Card className="p-6 border-border bg-gradient-to-br from-primary/10 to-transparent text-center">
          <p className="text-sm text-muted-foreground mb-3">Want to organize and share your own coding solutions?</p>
          <Button asChild className="gradient-hero text-primary-foreground hover:opacity-90">
            <Link to="/auth">Get started free</Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}