import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Save, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.display_name ?? "");
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  };

  return (
    <div className="container max-w-3xl py-8 px-4 md:px-8 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your vault.</p>
      </div>

      <Card className="p-6 border-border bg-card space-y-4">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Profile</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving} className="gradient-hero text-primary-foreground hover:opacity-90">
          <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving..." : "Save changes"}
        </Button>
      </Card>

      <Card className="p-6 border-border bg-card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          {theme === "dark" ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
          Appearance
        </h2>
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div>
            <div className="font-medium">Theme</div>
            <div className="text-sm text-muted-foreground capitalize">Currently: {theme}</div>
          </div>
          <Button variant="outline" onClick={toggle}>
            Switch to {theme === "dark" ? "light" : "dark"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-border bg-card border-destructive/30">
        <h2 className="font-semibold mb-4 text-destructive">Account</h2>
        <Button variant="outline" onClick={signOut} className="border-destructive/40 text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4 mr-1.5" /> Sign out
        </Button>
      </Card>
    </div>
  );
}
