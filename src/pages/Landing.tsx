import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Brain, Code2, Sparkles, BookOpen, Zap, ArrowRight,
  Target, CheckCircle2, PlayCircle, Globe,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedBackground } from "@/components/landing/AnimatedBackground";

const FEATURES = [
  { icon: Zap, title: "Auto-Fetch Metadata", desc: "Paste a link from LeetCode, Codeforces, or GFG. We'll automatically pull the title, difficulty, and tags for you." },
  { icon: Sparkles, title: "SM-2 Spaced Repetition", desc: "Our revision queue uses the SM-2 algorithm to surface questions exactly when you're about to forget them." },
  { icon: Globe, title: "Public Community Feed", desc: "Explore thousands of solutions shared by other students. Practice directly from the library and track your mastery." },
  { icon: Target, title: "Private Practice Tracker", desc: "Record every time you solve a problem. Build a history of your consistency and watch your skills grow." },
  { icon: Code2, title: "Monaco Code Editor", desc: "A world-class coding experience with syntax highlighting for Python, Java, C++, and JavaScript." },
  { icon: BookOpen, title: "Second Brain Notes", desc: "Capture patterns, tricks, and interview insights alongside your code. Built for deep learning." },
];

const STEPS = [
  { n: "01", title: "Save the problem", desc: "Paste the link, write your solution, tag the topic, and add complexity notes.", icon: Target },
  { n: "02", title: "Add your insight", desc: "Capture the key intuition, edge cases, and any tricks — in your own words.", icon: BookOpen },
  { n: "03", title: "Revise & remember", desc: "Mark for revision, browse by weak topic, and rebuild memory before interviews.", icon: Sparkles },
];

const FAQS = [
  { q: "Who is DSA Vault for?", a: "Students and developers preparing for coding interviews who want a single source of truth for everything they've solved." },
  { q: "Is it free?", a: "Yes — sign up and start saving your DSA questions, solutions, and notes for free." },
  { q: "What languages are supported in the code editor?", a: "Python, Java, C++, JavaScript, TypeScript, and more — full syntax highlighting via Monaco (the engine behind VS Code)." },
  { q: "Will I lose my data?", a: "No. Everything is stored securely in your private vault and only visible to you." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <AnimatedBackground />
      <div className="absolute inset-0 gradient-glow pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-md bg-background/40">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl gradient-hero flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform">
              <Brain className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-lg">DSA Vault</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="gradient-hero text-primary-foreground hover:opacity-90 shadow-glow">
              <Link to="/auth">Get started <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur-sm text-sm text-muted-foreground mb-8 animate-fade-in">
          <Zap className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
          <span>Built by students, for students</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in">
          The ultimate <br />
          <span className="text-gradient">DSA practice hub.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in">
          Save your solutions, collaborate with the community, and master algorithms with spaced repetition. Your complete second brain for coding interview preparation.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
          <Button size="lg" asChild className="gradient-hero text-primary-foreground hover:opacity-90 shadow-glow text-base h-12 px-7 hover:scale-105 transition-transform">
            <Link to="/auth">Start your vault — free <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base h-12 px-7 backdrop-blur-sm bg-card/40">
            <a href="#how"><PlayCircle className="h-4 w-4 mr-1.5" /> See how it works</a>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mt-20 animate-fade-in">
          {[
            { n: "500+", l: "Problems saved" },
            { n: "20+", l: "Topics & patterns" },
            { n: "∞", l: "Memory" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border border-border bg-card/50 backdrop-blur-md p-6 hover:border-primary/40 hover:shadow-glow transition-all duration-300 hover:-translate-y-1"
            >
              <div className="text-3xl font-bold text-gradient">{s.n}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Logos */}
      <div className="relative z-10 border-y border-border/50 bg-card/20 backdrop-blur-sm py-10">
        <div className="container mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground mb-8 font-semibold">Supported Platforms</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {["LeetCode", "Codeforces", "AtCoder", "HackerRank", "GeeksforGeeks"].map((p) => (
              <span key={p} className="text-xl md:text-2xl font-bold tracking-tight text-foreground/80">{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* What is it */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-medium mb-4">
            What is DSA Vault?
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-5">
            One home for every problem you've ever solved.
          </h2>
          <p className="text-lg text-muted-foreground">
            Stop losing your solutions in random files, Notion pages, and unnamed folders. DSA Vault is your second brain for Data Structures & Algorithms — store the problem, your code, your notes, and your insights, then search and revise them whenever you need.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mt-12 text-left">
            {[
              "Never lose a solution again",
              "Find any problem in seconds",
              "Revise weak topics with focus",
            ].map((b) => (
              <div key={b} className="flex items-start gap-3 rounded-xl border border-border bg-card/50 backdrop-blur-sm p-4">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm font-medium">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything you need to remember.</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Designed like the dev tools you already love — fast, keyboard-friendly, and built for focus.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 hover:border-primary/40 hover:shadow-glow transition-all duration-300 animate-fade-in hover:-translate-y-1"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="h-11 w-11 rounded-xl gradient-card border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">How it works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Three simple steps from "I just solved this" to "I'll remember this forever."
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-7 hover:border-primary/40 transition-all">
              <div className="text-5xl font-extrabold text-gradient mb-4">{s.n}</div>
              <div className="h-10 w-10 rounded-lg gradient-card border border-primary/20 flex items-center justify-center mb-4">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Frequently asked questions</h2>
        </div>
        <div className="max-w-3xl mx-auto grid gap-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6">
              <h3 className="font-semibold mb-1.5">{f.q}</h3>
              <p className="text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="rounded-3xl gradient-hero p-12 md:p-16 text-center shadow-glow">
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            Stop forgetting. Start remembering.
          </h2>
          <p className="text-primary-foreground/85 max-w-xl mx-auto mb-8">
            Free to start. Your vault, forever yours.
          </p>
          <Button size="lg" asChild className="bg-background text-foreground hover:bg-background/90 h-12 px-7 hover:scale-105 transition-transform">
            <Link to="/auth">Create your vault <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
          </Button>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        Built with ❤ for the next generation of problem solvers.
      </footer>
    </div>
  );
}
