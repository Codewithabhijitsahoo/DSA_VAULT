import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getPlatformPrefix } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/CodeEditor";
import { DifficultyBadge, StatusBadge } from "@/components/StatusBadges";
import { ArrowLeft, ExternalLink, Edit3, Star, Sparkles, Loader2, Globe, Lock, Copy, Check, RotateCw, Github } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getGithubConfig, pushQuestionToGithub, slugify, extensionMap } from "@/lib/github";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QDetail {
  id: string;
  title: string;
  topic: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  status: "solved" | "pending" | "revisit" | null;
  platform: string | null;
  problem_link: string | null;
  leetcode_number: string | null;
  created_at: string;
  problem_statement: string | null;
  answer: string | null;
  explanation: string | null;
  code: string | null;
  language: string | null;
  time_complexity: string | null;
  space_complexity: string | null;
  tags: string[] | null;
  is_public: boolean;
  is_favorite: boolean | null;
  needs_revision: boolean | null;
}

export default function QuestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState<QDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const [pushingToGithub, setPushingToGithub] = useState(false);
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [customFilename, setCustomFilename] = useState("");

  useEffect(() => {
    if (!id) return;
    supabase.from("questions").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setQ({
          id: data.id,
          title: data.title,
          topic: data.topic,
          difficulty: data.difficulty as "easy" | "medium" | "hard" | null,
          status: data.status as "solved" | "pending" | "revisit" | null,
          platform: data.platform,
          problem_link: data.problem_link,
          leetcode_number: data.leetcode_number,
          created_at: data.created_at,
          problem_statement: data.problem_statement,
          answer: data.answer,
          explanation: data.explanation,
          code: data.code,
          language: data.language,
          time_complexity: data.time_complexity,
          space_complexity: data.space_complexity,
          tags: data.tags,
          is_public: data.is_public,
          is_favorite: data.is_favorite,
          needs_revision: data.needs_revision,
        });
        const filenameTag = (data.tags as string[] | null)?.find((t) => t.startsWith("filename:"));
        if (filenameTag) {
          setCustomFilename(filenameTag.replace("filename:", ""));
        }
      } else {
        setQ(null);
      }
      setLoading(false);
    });

    if (user) {
      supabase
        .from("user_practices")
        .select("count")
        .eq("user_id", user.id)
        .eq("question_id", id)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.count !== null) setPracticeCount(data.count);
        });
    }
  }, [id, user]);

  const togglePublic = async () => {
    if (!q) return;
    setTogglingPublic(true);
    const next = !q.is_public;
    const { error } = await supabase.from("questions").update({ is_public: next }).eq("id", q.id);
    setTogglingPublic(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setQ({ ...q, is_public: next });
    toast.success(next ? "Question is now public — share the link!" : "Question is now private");
  };

  const handlePractice = async () => {
    if (!user || !id) return;
    const next = practiceCount + 1;
    const { error } = await supabase
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

  const copyShareLink = async () => {
    const url = `${window.location.origin}/share/${q.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushClick = () => {
    if (!q) return;
    const config = getGithubConfig(user?.id);
    if (!config || !config.token || !config.username || !config.repo) {
      toast.error("GitHub is not configured. Please connect your GitHub account in Settings.");
      return;
    }
    setCommitMessage(`docs: add solution for ${q.title} (${q.platform || "DSA Vault"})`);
    if (!customFilename) {
      const ext = extensionMap[q.language?.toLowerCase() || ""] || "txt";
      const titleSlug = slugify(q.title);
      const numPrefix = q.leetcode_number ? `${q.leetcode_number}_` : "";
      setCustomFilename(`${numPrefix}${titleSlug}.${ext}`);
    }
    setIsCommitDialogOpen(true);
  };

  const pushToGithub = async () => {
    if (!q) return;
    const config = getGithubConfig(user?.id);
    if (!config || !config.token || !config.username || !config.repo) {
      toast.error("GitHub is not configured. Please connect your GitHub account in Settings.");
      return;
    }

    setPushingToGithub(true);
    const res = await pushQuestionToGithub(
      {
        title: q.title,
        difficulty: q.difficulty,
        platform: q.platform,
        leetcode_number: q.leetcode_number,
        problem_link: q.problem_link,
        time_complexity: q.time_complexity,
        space_complexity: q.space_complexity,
        code: q.code,
        language: q.language,
        custom_filename: customFilename.trim() || null,
      },
      config,
      commitMessage
    );
    setPushingToGithub(false);
    setIsCommitDialogOpen(false);

    if (res.success) {
      const baseTags = q.tags ? q.tags.filter(t => !t.startsWith("filename:")) : [];
      const updatedTags = customFilename.trim() ? [...baseTags, `filename:${customFilename.trim()}`] : baseTags;
      
      const { error: updateError } = await supabase
        .from("questions")
        .update({ tags: updatedTags })
        .eq("id", q.id);
        
      if (!updateError) {
        setQ({ ...q, tags: updatedTags });
      }

      toast.success(
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Successfully pushed code to GitHub!</span>
          <a
            href={res.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline font-mono inline-flex items-center gap-1 mt-1"
          >
            View file on GitHub <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      );
    } else {
      toast.error(res.message || "Failed to push to GitHub");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!q) {
    return (
      <div className="container max-w-3xl py-12 text-center">
        <p className="text-muted-foreground mb-4">Question not found.</p>
        <Button asChild><Link to="/questions">Back to questions</Link></Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4 md:px-8 space-y-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
      </Button>

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{q.title}</h1>
          <div className="flex items-center gap-1 shrink-0">
            {q.is_favorite && <Star className="h-5 w-5 fill-warning text-warning" />}
            {q.needs_revision && <Sparkles className="h-5 w-5 fill-info/30 text-info" />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge level={q.difficulty} />
          <StatusBadge status={q.status} />
          {q.topic && <Badge variant="secondary">{q.topic}</Badge>}
          {q.platform && <Badge variant="outline">{q.platform}</Badge>}
          {q.leetcode_number && (
            q.problem_link ? (
              <a href={q.problem_link} target="_blank" rel="noopener noreferrer" className="inline-flex">
                <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 cursor-pointer">
                  {getPlatformPrefix(q.platform)} #{q.leetcode_number} <ExternalLink className="h-3 w-3 ml-1" />
                </Badge>
              </a>
            ) : (
              <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/30">
                {getPlatformPrefix(q.platform)} #{q.leetcode_number}
              </Badge>
            )
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            Saved {format(new Date(q.created_at), "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {q.problem_link && (
            <Button variant="outline" size="sm" asChild>
              <a href={q.problem_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Original problem
              </a>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link to={`/edit/${q.id}`}><Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit</Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePractice}
            className="border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1.5" /> Practice {practiceCount > 0 && `(${practiceCount})`}
          </Button>
          {q.code && (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePushClick}
              disabled={pushingToGithub}
              className="border-secondary/20 bg-secondary/5 hover:bg-secondary/10 text-secondary font-semibold"
            >
              {pushingToGithub ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Github className="h-3.5 w-3.5 mr-1.5" />}
              Push to GitHub
            </Button>
          )}
          <Button
            size="sm"
            variant={q.is_public ? "default" : "outline"}
            onClick={togglePublic}
            disabled={togglingPublic}
            className={q.is_public ? "bg-success text-success-foreground hover:bg-success/90" : ""}
          >
            {q.is_public ? <Globe className="h-3.5 w-3.5 mr-1.5" /> : <Lock className="h-3.5 w-3.5 mr-1.5" />}
            {q.is_public ? "Public" : "Make public"}
          </Button>
          {q.is_public && (
            <Button size="sm" variant="outline" onClick={copyShareLink}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              Copy share link
            </Button>
          )}
        </div>
      </header>

      {q.is_public && (
        <Card className="p-4 border-success/30 bg-success/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-4 w-4 text-success shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              Anyone with the link can view this question:
            </span>
            <code className="text-xs px-2 py-1 rounded bg-background border border-border truncate">
              {window.location.origin}/share/{q.id}
            </code>
          </div>
        </Card>
      )}

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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Code</h2>
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

      {q.tags && q.tags.filter(t => !t.startsWith("filename:")).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {q.tags.filter(t => !t.startsWith("filename:")).map((t: string) => (
            <span key={t} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">#{t}</span>
          ))}
        </div>
      )}

      <Dialog open={isCommitDialogOpen} onOpenChange={setIsCommitDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5 text-primary" /> Push to GitHub
            </DialogTitle>
            <DialogDescription>
              Confirm or customize the filename and commit message.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="file-name" className="text-left font-medium">
                Filename
              </Label>
              <Input
                id="file-name"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="e.g. two_sum.py"
                className="col-span-3"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="commit-msg" className="text-left font-medium">
                Commit Message
              </Label>
              <Input
                id="commit-msg"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommitDialogOpen(false)} disabled={pushingToGithub}>
              Cancel
            </Button>
            <Button onClick={pushToGithub} disabled={pushingToGithub} className="gradient-hero text-primary-foreground shadow-glow">
              {pushingToGithub ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Github className="h-4 w-4 mr-1.5" />}
              {pushingToGithub ? "Pushing..." : "Confirm Push"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
