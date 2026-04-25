import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, StickyNote, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
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

const noteSchema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  content: z.string().max(10000),
  category: z.string().max(80),
});

const CATEGORIES = ["Trick", "Pattern", "Common Mistake", "Formula", "Interview Tip", "General"];

interface Note { id: string; title: string; content: string | null; category: string | null; updated_at: string; }

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "General" });
  const [filter, setFilter] = useState("all");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setNotes(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try { noteSchema.parse(form); }
    catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
    }
    setLoading(true);
    const { error } = await supabase.from("notes").insert({ ...form, user_id: user.id });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Note saved");
    setForm({ title: "", content: "", category: "General" });
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success("Deleted");
  };

  const filtered = filter === "all" ? notes : notes.filter((n) => n.category === filter);
  const categories = Array.from(new Set(notes.map((n) => n.category).filter(Boolean))) as string[];

  return (
    <div className="container max-w-6xl py-8 px-4 md:px-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <StickyNote className="h-7 w-7 text-primary" /> Notes
        </h1>
        <p className="text-muted-foreground mt-1">Tricks, patterns, and tips you don't want to forget.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* New note */}
        <Card className="lg:col-span-2 p-6 border-border bg-card h-fit lg:sticky lg:top-20">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4" /> New note</h2>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ntitle" className="text-xs">Title</Label>
              <Input id="ntitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Sliding window template" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ncontent" className="text-xs">Content</Label>
              <Textarea id="ncontent" rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Use two pointers when..." />
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-hero text-primary-foreground hover:opacity-90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1.5" /> Save note</>}
            </Button>
          </form>
        </Card>

        {/* List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
            >All ({notes.length})</button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
              >{c}</button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-12 text-center border-border bg-card">
              <StickyNote className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">No notes yet. Start capturing your insights.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((n) => (
                <Card key={n.id} className="p-5 border-border bg-card hover:border-primary/40 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold flex-1 min-w-0 truncate">{n.title}</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete note?</AlertDialogTitle>
                          <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(n.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  {n.category && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent text-accent-foreground inline-block mb-2">{n.category}</span>
                  )}
                  {n.content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{n.content}</p>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border">
                    Updated {formatDistanceToNow(new Date(n.updated_at))} ago
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
