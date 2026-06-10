import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Save, LogOut, User as UserIcon, Github, Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getGithubConfig, saveGithubConfig, testGithubConnection } from "@/lib/github";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // GitHub States
  const [ghToken, setGhToken] = useState("");
  const [ghUser, setGhUser] = useState("");
  const [ghRepo, setGhRepo] = useState("");
  const [ghBranch, setGhBranch] = useState("main");
  const [ghPath, setGhPath] = useState("solutions");
  const [showToken, setShowToken] = useState(false);
  const [savingGithub, setSavingGithub] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.display_name ?? "");
    });

    // Load GitHub settings
    const ghConfig = getGithubConfig();
    if (ghConfig) {
      setGhToken(ghConfig.token);
      setGhUser(ghConfig.username);
      setGhRepo(ghConfig.repo);
      setGhBranch(ghConfig.branch);
      setGhPath(ghConfig.path);
    }
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  };

  const saveGithub = () => {
    setSavingGithub(true);
    saveGithubConfig({
      token: ghToken,
      username: ghUser,
      repo: ghRepo,
      branch: ghBranch || "main",
      path: ghPath || "solutions",
    });
    setSavingGithub(false);
    toast.success("GitHub configuration saved locally");
  };

  const testConnection = async () => {
    setTestingConnection(true);
    const res = await testGithubConnection({
      token: ghToken,
      username: ghUser,
      repo: ghRepo,
      branch: ghBranch || "main",
      path: ghPath || "solutions",
    });
    setTestingConnection(false);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
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

      <Card className="p-6 border-border bg-card space-y-4">
        <div className="flex items-center gap-2">
          <Github className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">GitHub Integration</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure your GitHub repository to push your code solutions directly from the vault. 
          Your token is stored <strong>locally in your browser</strong> and is only sent directly to GitHub's API.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="gh-token">Personal Access Token (PAT)</Label>
            <div className="relative">
              <Input
                id="gh-token"
                type={showToken ? "text" : "password"}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Needs <code>repo</code> permissions. Generate a PAT in{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary hover:text-primary/80 inline-flex items-center gap-0.5"
              >
                GitHub Developer Settings <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gh-user">GitHub Username / Owner</Label>
            <Input
              id="gh-user"
              placeholder="e.g. Codewithabhijitsahoo"
              value={ghUser}
              onChange={(e) => setGhUser(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gh-repo">Repository Name</Label>
            <Input
              id="gh-repo"
              placeholder="e.g. DSA_VAULT"
              value={ghRepo}
              onChange={(e) => setGhRepo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gh-branch">Branch Name</Label>
            <Input
              id="gh-branch"
              placeholder="e.g. main"
              value={ghBranch}
              onChange={(e) => setGhBranch(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gh-path">Target Folder</Label>
            <Input
              id="gh-path"
              placeholder="e.g. solutions"
              value={ghPath}
              onChange={(e) => setGhPath(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={saveGithub} disabled={savingGithub} className="gradient-hero text-primary-foreground hover:opacity-90 shadow-glow">
            <Save className="h-4 w-4 mr-1.5" /> Save Configuration
          </Button>
          <Button variant="outline" onClick={testConnection} disabled={testingConnection || !ghToken || !ghUser || !ghRepo}>
            {testingConnection ? "Testing..." : "Test Connection"}
          </Button>
        </div>
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
