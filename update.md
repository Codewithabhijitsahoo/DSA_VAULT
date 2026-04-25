# Revise Wise Zone — Industry-Level Product Specification
**Version:** 1.0.0  
**Document Type:** Full Product & Engineering Specification  
**Prepared for:** Engineering Team / Antigravity Studio  
**Status:** Ready for Development  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [User Personas](#3-user-personas)
4. [Feature Specification (Detailed)](#4-feature-specification-detailed)
5. [System Architecture](#5-system-architecture)
6. [Database Schema](#6-database-schema)
7. [API Design](#7-api-design)
8. [UI/UX Guidelines](#8-uiux-guidelines)
9. [Security & Compliance](#9-security--compliance)
10. [Performance Requirements](#10-performance-requirements)
11. [Testing Strategy](#11-testing-strategy)
12. [DevOps & CI/CD](#12-devops--cicd)
13. [Monetization & Subscription Model](#13-monetization--subscription-model)
14. [Roadmap & Milestones](#14-roadmap--milestones)
15. [Open Questions & Decisions Needed](#15-open-questions--decisions-needed)

---

## 1. Executive Summary

**Revise Wise Zone** is a full-stack web application for structured DSA (Data Structures & Algorithms) preparation. It allows developers to log, categorize, review, and revise coding problems — integrated with LeetCode — with analytics, community sharing, and spaced-repetition-based revision reminders.

The goal is to become the **go-to platform for serious DSA preparation**, competing in the space occupied by tools like LeetCode Study Plans, NeetCode.io, and Notion-based trackers, by combining the depth of a personal notebook with the power of automation, gamification, and community.

---

## 2. Product Vision & Goals

### Vision Statement
> *"Turn every solved problem into lasting mastery — not just a submission."*

### Core Goals

| Priority | Goal | Success Metric |
|----------|------|----------------|
| P0 | Users can log, track, and revise DSA questions | 80% D7 retention of power users |
| P0 | Seamless LeetCode integration (auto-fill metadata) | < 3 seconds to add a question via auto-fill |
| P1 | Smart revision reminders using spaced repetition | Users solve 20% more problems after 30 days |
| P1 | Analytics dashboard that surfaces weak areas | Avg. session time > 8 minutes |
| P2 | Community feed for shared problems | 30% of users browse or contribute to public feed |
| P2 | Gamification (streaks, badges, leaderboards) | Streak feature drives 40% weekly active return |

### Non-Goals (v1)
- We are **not** building a code execution engine (no online judge).
- We are **not** building a video tutorial platform.
- We are **not** a social network — community features are secondary to personal tracking.

---

## 3. User Personas

### Persona A — "The Consistent Grinder" (Primary)
- **Profile:** Final-year CS student or early career SWE, preparing for FAANG/product company interviews
- **Behavior:** Solves 2–5 problems daily, wants to track progress and revisit hard problems
- **Pain Point:** Loses context on previously solved problems; no single place to store notes + code
- **Goal:** Build a bank of 300+ solved problems with notes before interviews

### Persona B — "The Rusty Returner" (Secondary)
- **Profile:** 2–5 years experience developer returning to job market
- **Behavior:** Has solved hundreds of problems in the past; needs to refresh quickly
- **Pain Point:** Can't remember which problems they've done or what they struggled with
- **Goal:** Quickly identify weak areas and focus revision efficiently

### Persona C — "The Competitive Programmer" (Tertiary)
- **Profile:** Competes in Codeforces/CodeChef, advanced algorithmist
- **Behavior:** Works on hard problems; tags patterns like "segment tree", "bitmask DP"
- **Pain Point:** No structured way to organize advanced topic notes
- **Goal:** Build a personal knowledge base of advanced techniques

---

## 4. Feature Specification (Detailed)

### 4.1 Authentication & User Profile

**Requirements:**
- Email/password signup via Supabase Auth
- Google OAuth social login (required for v1)
- GitHub OAuth social login (nice-to-have v1)
- Email verification on signup
- Password reset via email link
- Session persistence with refresh tokens (JWT)
- Profile fields: Display name, avatar (upload or Gravatar), target company, target date, preferred languages

**Edge Cases:**
- User signs up with Google using same email as existing email/password account → merge accounts or block with error message
- Session expiry mid-form → save draft to localStorage, restore after re-auth

---

### 4.2 Question Management

**Required Fields for Each Question:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | string | Yes | Max 200 chars |
| problem_statement | text | No | Markdown supported |
| topic | enum | Yes | See topic list below |
| difficulty | enum | Yes | Easy / Medium / Hard |
| platform | enum | Yes | LeetCode / HackerRank / Codeforces / Custom |
| status | enum | Yes | Solved / Attempted / Revisit / Skipped |
| solution_code | text | No | Stored as plain text with language tag |
| language | string | No | e.g., JavaScript, Python, Java |
| time_complexity | string | No | e.g., O(n log n) |
| space_complexity | string | No | e.g., O(n) |
| notes | text | No | Markdown supported |
| is_public | boolean | Yes | Default: false |
| tags | string[] | No | User-defined labels |
| leetcode_id | integer | No | Auto-filled via integration |
| leetcode_url | string | No | Auto-filled via integration |
| solved_at | timestamp | No | When first marked Solved |
| last_revised_at | timestamp | No | Updated on each revision |
| revision_count | integer | No | Incremented each revision |

**Topic Enum Values:**
Arrays, Strings, Linked Lists, Trees, Graphs, Dynamic Programming, Greedy, Backtracking, Binary Search, Sorting, Hashing, Heaps/Priority Queues, Stacks/Queues, Tries, Union Find, Bit Manipulation, Math, Sliding Window, Two Pointers, Divide & Conquer, Segment Trees, Monotonic Stack, Design

**Status Transitions:**
```
Skipped → Attempted → Solved → Revisit → Solved (cycle)
```

**Business Rules:**
- A question with `status = Solved` and `revision_count = 0` appears in the "needs first revision" list after 24 hours
- A question with `status = Revisit` appears in the revision queue immediately
- `is_public = true` requires `status = Solved` (enforce at API level)
- Soft delete only — no hard deletes (set `deleted_at` timestamp)

---

### 4.3 Platform Auto-Fill Integration

**How It Works:**
1. User types a question title and selects a platform (LeetCode, Codeforces, AtCoder, etc.) in the Add Question form.
2. After 500ms debounce, user clicks "Find on [Platform]" which calls the Edge Function `POST /functions/v1/problem-lookup`.
3. Edge Function queries the respective platform's API (GraphQL for LeetCode, REST for Codeforces/AtCoder).
4. Returns: `{ found: true, questionNumber, title, difficulty, url, source }`
5. UI pre-fills form fields and shows a confirmation toast.

**Edge Function Spec:**

```
Endpoint: POST /functions/v1/problem-lookup
Body: { title: string, platform: string }
Response 200 (Success): { found: true, title, url, questionNumber, difficulty, source }
Response 200 (Not Found): { found: false }
Response 500: { error: "Internal Error" }
```

**Rate Limiting:**
- Lookups are rate-limited per user to prevent abuse.
- Direct API calls to external platforms are made from the Edge Function.

---

### 4.4 Code Editor (Monaco Integration)

**Requirements:**
- Language selector (dropdown): Python, JavaScript, TypeScript, Java, C++, Go, Rust, C#
- Syntax highlighting per selected language
- Auto-indentation and bracket matching
- Theme toggle: Light / Dark (synced with global app theme)
- Font size adjustable: 12px – 20px
- Line numbers always visible
- Read-only mode when viewing public questions from community feed
- "Copy code" button
- Local auto-save every 30 seconds while editing (prevents data loss on accidental navigation)

**Out of Scope:** Code execution, linting, AI code suggestions (these are v2 features).

---

### 4.5 Spaced Repetition Revision System

This is the **key differentiator** from a simple tracker.

**Algorithm (SM-2 Simplified):**

Assign each solved question a "next review date" based on performance rating at last revision:

| User Rating (after revision session) | Next Review Interval |
|---------------------------------------|----------------------|
| Hard (1) | 1 day |
| Medium (2) | 3 days |
| Easy (3) | 7 days |
| Very Easy (4) | 14 days |

**Implementation:**
- After each revision session on a question, user rates their confidence (1–4)
- System updates `next_review_at` timestamp accordingly
- Dashboard "Revision Queue" shows questions where `next_review_at <= now()`
- Revision queue sorted by: overdue first, then by difficulty (Hard first)

**Notifications (v1.1):**
- Daily email digest: "You have X problems due for revision today"
- In-app notification badge on Revision Queue nav item

---

### 4.6 Analytics Dashboard

**Metrics to Display:**

**Overview Cards (top row):**
- Total problems solved (all time)
- Problems solved this week
- Current streak (days)
- Longest streak (days)

**Charts:**

| Chart | Type | Data |
|-------|------|------|
| Daily activity heatmap | GitHub-style calendar heatmap | Problems solved per day, last 52 weeks |
| Difficulty distribution | Donut chart | Easy / Medium / Hard counts |
| Topic breakdown | Horizontal bar chart | Problems solved per topic, sorted descending |
| Weekly progress | Line chart | Problems solved per week, last 12 weeks |
| Platform distribution | Pie chart | LeetCode / HackerRank / etc. |

**Filtering:**
- Date range filter (Last 7 days / 30 days / 90 days / All time)
- Platform filter
- Status filter

**Insight Cards (AI-generated, v1.1):**
- "Your weakest topic is Dynamic Programming — you've solved only 3 problems there."
- "You're 80% of the way to solving all Easy problems!"

---

### 4.7 Notes / Personal Mastery Notebook

**Structure:**
- Notes are separate from questions — they're general topic notes
- Fields: Title, Category (topic enum), Content (rich Markdown), Tags, Created at, Updated at
- Full Markdown editor with preview toggle (split view or tab view)
- Support for: Headers, bold/italic, code blocks (with syntax highlighting), tables, ordered/unordered lists
- Search notes by title and content (full-text search via Supabase's `tsvector`)
- Pin important notes to top
- Archive notes (soft remove from main list)

---

### 4.8 Community / Public Feed

**Feed Rules:**
- Only shows questions where `is_public = true`
- Default sort: Latest first
- Also available: Sort by Most Liked, Most Bookmarked, Difficulty
- Filter by: Topic, Difficulty, Platform

**Per Question Card in Feed:**
- Title, difficulty badge, topic tag, platform, author avatar + name
- Like button (toggle), bookmark button (save to personal collection)
- View count (incremented on detail page visit)
- "Add to My List" button (copies question to user's personal tracker with status = Pending)

**Moderation (v1):**
- Report button on each public question
- Admin dashboard to review reports and unpublish content
- Profanity filter on notes and problem statements before publishing

---

### 4.9 Search

**Global Search (cmd+K / ctrl+K):**
- Searches across: user's own questions, user's notes, public feed
- Results grouped by section (My Questions / My Notes / Community)
- Keyboard navigable
- Debounced at 300ms
- Search highlights matching terms in results

**Filters (My Questions page):**
- Difficulty: Easy / Medium / Hard / All
- Status: Solved / Attempted / Revisit / Skipped / All
- Topic: Dropdown multi-select
- Platform: Dropdown multi-select
- Date range: Last 7 / 30 / 90 days / All
- Has code: Yes / No
- Has notes: Yes / No
- Needs revision: Toggle

---

### 4.10 Gamification

| Feature | Description |
|---------|-------------|
| Daily Streak | Consecutive days with ≥1 problem solved. Displayed on dashboard. |
| Badges | Earned milestones (First 10, First 50, etc. — see badge list below) |
| XP System | Points for solving (10 Easy / 20 Medium / 40 Hard), revision (+5 each), notes (+5 each) |
| Leaderboard | Optional — users opt-in to show their XP on a global/friends leaderboard |

**Badge List (v1):**
- 🥉 First Step — Solve your first problem
- 🔥 On Fire — 7-day streak
- 💎 Diamond Grind — 30-day streak
- 🧠 DP Master — Solve 20 Dynamic Programming problems
- 🌟 Century Club — Solve 100 problems
- 📝 Notekeeper — Create 10 notes
- 🔁 Revisor — Complete 50 revisions
- 🌐 Contributor — Make 5 questions public

---

## 5. System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                       │
│          React + Vite + TypeScript + Tailwind CSS            │
│          State: Zustand / React Query (TanStack)             │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     SUPABASE PLATFORM                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │   Auth (GoTrue)  │  │  PostgREST API   │  │  Storage   │  │
│  │  JWT + OAuth     │  │  (auto-generated)│  │  (Avatars) │  │
│  └─────────────────┘  └──────────────────┘  └────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database (RLS enabled)           │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           Edge Functions (Deno runtime)               │    │
│  │  • leetcode-lookup  • send-revision-digest           │    │
│  │  • moderate-content • generate-insights              │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │    LeetCode GraphQL API  │
         │    (external, rate-ltd) │
         └─────────────────────────┘
```

### Frontend Architecture

```
src/
├── components/
│   ├── ui/                  # Reusable primitives (Button, Input, Modal, Badge...)
│   ├── layout/              # AppShell, Sidebar, Topbar, MobileNav
│   ├── questions/           # QuestionCard, QuestionForm, QuestionDetail
│   ├── editor/              # MonacoEditor wrapper, LanguageSelector
│   ├── analytics/           # Charts, HeatMap, StatCard, InsightCard
│   ├── notes/               # NoteCard, NoteEditor, NoteList
│   ├── feed/                # FeedCard, FeedFilters, LikeButton
│   └── revision/            # RevisionQueue, RevisionRater, RevisionBadge
├── pages/
│   ├── Dashboard.tsx
│   ├── Questions.tsx
│   ├── QuestionDetail.tsx
│   ├── AddQuestion.tsx
│   ├── Notes.tsx
│   ├── Community.tsx
│   ├── Revision.tsx
│   ├── Analytics.tsx
│   ├── Profile.tsx
│   ├── Leaderboard.tsx
│   └── Auth/                # Login, Signup, ForgotPassword
├── hooks/
│   ├── useQuestions.ts      # CRUD + filtering
│   ├── useRevisionQueue.ts  # SM-2 logic
│   ├── useAnalytics.ts      # Aggregated stats
│   ├── useStreak.ts         # Streak calculation
│   └── useLeetCodeLookup.ts # Debounced auto-fill
├── stores/
│   ├── authStore.ts         # Zustand store for user session
│   └── uiStore.ts           # Theme, sidebar state, modals
├── lib/
│   ├── supabase.ts          # Supabase client init
│   ├── constants.ts         # Enums, badge definitions, config
│   └── utils.ts             # Date helpers, formatters, validators
└── types/
    └── index.ts             # All shared TypeScript types/interfaces
```

---

## 6. Database Schema

### Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  target_company TEXT,
  target_date DATE,
  preferred_language TEXT DEFAULT 'Python',
  is_public BOOLEAN DEFAULT FALSE,
  xp INTEGER DEFAULT 0,
  streak_current INTEGER DEFAULT 0,
  streak_longest INTEGER DEFAULT 0,
  last_solved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `questions`
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem_statement TEXT,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  platform TEXT NOT NULL DEFAULT 'LeetCode',
  status TEXT NOT NULL DEFAULT 'Attempted' CHECK (status IN ('Solved', 'Attempted', 'Revisit', 'Skipped')),
  solution_code TEXT,
  language TEXT,
  time_complexity TEXT,
  space_complexity TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  leetcode_id INTEGER,
  leetcode_url TEXT,
  solved_at TIMESTAMPTZ,
  last_revised_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  revision_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_questions_user_id ON questions(user_id);
CREATE INDEX idx_questions_topic ON questions(topic);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_is_public ON questions(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_questions_next_review ON questions(next_review_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_search ON questions USING gin(to_tsvector('english', title || ' ' || COALESCE(notes, '')));
```

#### `notes`
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `question_likes`
```sql
CREATE TABLE question_likes (
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (question_id, user_id)
);
```

#### `question_bookmarks`
```sql
CREATE TABLE question_bookmarks (
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (question_id, user_id)
);
```

#### `badges`
```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_key)
);
```

#### `revision_sessions`
```sql
CREATE TABLE revision_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 4),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `reports` (moderation)
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id),
  question_id UUID REFERENCES questions(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

```sql
-- Questions: users can only see their own + public ones
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select own questions" ON questions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Select public questions" ON questions
  FOR SELECT USING (is_public = TRUE AND deleted_at IS NULL);

CREATE POLICY "Insert own questions" ON questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own questions" ON questions
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 7. API Design

All data access goes through Supabase's auto-generated PostgREST API. The following documents the key query patterns used by the frontend.

### Questions API

```
GET    /rest/v1/questions          → List (with filters via query params)
POST   /rest/v1/questions          → Create
PATCH  /rest/v1/questions?id=eq.{id}  → Update
DELETE /rest/v1/questions?id=eq.{id}  → Soft delete (set deleted_at)
```

**Common filters (PostgREST syntax):**
```
?difficulty=eq.Hard
?topic=eq.Dynamic Programming
?status=eq.Revisit
?next_review_at=lte.now()
?deleted_at=is.null
?is_public=eq.true
?select=id,title,difficulty,status,topic,created_at  ← always use column selection
```

### Edge Functions

| Function | Method | Purpose |
|----------|--------|---------|
| `leetcode-lookup` | GET | Fetch problem metadata from LeetCode |
| `send-revision-digest` | POST | Cron — send daily revision email |
| `award-badges` | POST | Called after any XP-earning action |
| `generate-insights` | GET | AI-generated personalized insights (v1.1) |

### Realtime Subscriptions (Supabase Realtime)

- Subscribe to `questions` table changes (user's own) → update dashboard stats in real-time without page refresh
- Subscribe to `question_likes` count changes on public feed → live like counts

---

## 8. UI/UX Guidelines

### Design Principles
- **Clarity First:** Every screen should have one primary action. No cluttered dashboards.
- **Speed:** Optimistic UI updates on all mutations. Never make users wait for the server.
- **Keyboard First:** Power users should be able to navigate entirely via keyboard shortcuts.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open global search |
| `Cmd/Ctrl + N` | New question |
| `Cmd/Ctrl + M` | New note |
| `R` (on question detail) | Start revision |
| `E` (on question detail) | Edit question |
| `Esc` | Close any modal |

### Theming
- Dark mode / Light mode toggle (persisted to localStorage + profile)
- Primary color: Customizable (user picks from 5 accent colors in settings)
- Typography: Inter (UI text), JetBrains Mono (code)

### Responsive Breakpoints
- Mobile: < 640px — bottom tab navigation, stacked layouts
- Tablet: 640–1024px — collapsible sidebar
- Desktop: > 1024px — persistent sidebar, multi-column layouts

### Accessibility (WCAG 2.1 AA)
- All interactive elements have visible focus rings
- Color is never the only differentiator (difficulty badges use icon + color + text)
- Screen reader labels on all icon-only buttons
- Minimum tap target size: 44×44px on mobile

### Loading States
- Skeleton loaders (not spinners) on all list/card views
- Inline spinner only for button-triggered actions (form submit, LeetCode lookup)
- Error states with retry buttons — never blank screens

---

## 9. Security & Compliance

### Authentication Security
- Passwords minimum 8 characters, enforced at Supabase Auth level
- Rate limit login attempts: 5 failures → 15-minute lockout
- JWT access tokens expire in 1 hour; refresh tokens in 7 days
- All OAuth tokens stored server-side only (not in localStorage)

### Data Security
- All database access restricted by RLS — no user can ever read another user's private data
- API keys (VITE_SUPABASE_PUBLISHABLE_KEY) are anon-role only — no admin keys in frontend
- Edge Functions use service-role key (server-side only, never exposed to client)
- HTTPS enforced everywhere — no HTTP fallback
- Input sanitization on all user-submitted text before storage (strip XSS vectors)
- Content-Security-Policy headers configured

### Privacy
- Users can export all their data as JSON (GDPR right to data portability)
- Users can delete their account — all personal data deleted within 30 days
- Public questions show display name, never email address
- Analytics events are anonymous (no PII in analytics)

---

## 10. Performance Requirements

### Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| First Input Delay (FID) | < 100ms | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| API response (simple CRUD) | < 300ms | P95 |
| LeetCode lookup | < 3s | P95 |
| Dashboard load (cold) | < 1.5s | Real User Monitoring |

### Optimization Strategies

- **Code splitting:** Each page is a lazy-loaded chunk (`React.lazy + Suspense`)
- **Image optimization:** Avatars served via Supabase Storage with CDN + WebP format
- **Query caching:** TanStack Query with `staleTime: 5 minutes` for non-realtime data
- **Pagination:** All list views paginate at 20 items; infinite scroll or page controls
- **Bundle size:** Monaco Editor loaded lazily only when user opens a question detail with code
- **Database:** Explain/Analyze all slow queries; add indexes before launch
- **Edge Functions:** Cached LeetCode results in Supabase for 24 hours

---

## 11. Testing Strategy

### Testing Pyramid

```
         /\
        /E2E\          ← 10% (Playwright)
       /------\
      /  Integ  \      ← 20% (Vitest + Supabase test DB)
     /------------\
    /    Unit       \  ← 70% (Vitest + React Testing Library)
   /------------------\
```

### Unit Tests (Vitest + RTL)

Every component and hook must have tests. Required coverage:
- All custom hooks (especially revision queue logic, streak calculation)
- All form components (validation, error states, submission)
- All utility functions in `lib/utils.ts`
- Target: 80% line coverage

### Integration Tests

- Question CRUD flows against a real Supabase test project
- LeetCode lookup edge function (mocked external API)
- Auth flows (signup, login, OAuth callback)
- RLS policies (verify users cannot access others' data)

### E2E Tests (Playwright)

Core happy paths:
1. User signs up → adds first question via LeetCode auto-fill → sees it on dashboard
2. User marks question as Revisit → opens Revision Queue → rates difficulty → question rescheduled
3. User makes question public → logs out → sees it in Community feed as different user
4. User deletes account → verifies all personal data removed

### Performance Tests
- Lighthouse CI in CI pipeline — fail build if LCP > 3s
- Load test edge functions: 100 concurrent users via k6

---

## 12. DevOps & CI/CD

### Repository Structure
```
revise-wise-zone/
├── src/                    # React frontend
├── supabase/
│   ├── functions/          # Edge Functions (Deno)
│   ├── migrations/         # SQL migrations (numbered)
│   └── seed.sql            # Dev seed data
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .github/
│   └── workflows/
│       ├── ci.yml          # PR checks
│       └── deploy.yml      # Main branch deploy
├── ARCHITECTURE.md
├── SPEC.md                 # This document
└── README.md
```

### CI Pipeline (GitHub Actions — every PR)

```yaml
jobs:
  lint:       ESLint + TypeScript type check
  test:       Vitest unit + integration (against test Supabase)
  e2e:        Playwright (against preview deployment)
  lighthouse: Lighthouse CI performance check
  build:      Vite production build (verify no build errors)
```

### Deployment

| Environment | Trigger | URL |
|-------------|---------|-----|
| Preview | Every PR | `pr-{number}.revisewise.app` |
| Staging | Merge to `develop` | `staging.revisewise.app` |
| Production | Merge to `main` + manual approval | `revisewise.app` |

### Database Migrations
- All schema changes as numbered SQL migration files in `supabase/migrations/`
- Applied via `supabase db push` in CI
- Never edit migrations retroactively — always add new migration files
- Migration files are reviewed as part of every PR that touches schema

### Monitoring & Observability
- Error tracking: Sentry (frontend + Edge Functions)
- Uptime monitoring: Better Uptime (ping every 60s)
- Database metrics: Supabase dashboard + custom alerts for slow queries (> 1s)
- User analytics: PostHog (self-hosted or cloud) — anonymous event tracking

---

## 13. Monetization & Subscription Model

### Tiers

| Feature | Free | Pro ($9/month) | Team ($29/month for 5 users) |
|---------|------|----------------|------------------------------|
| Questions | Up to 100 | Unlimited | Unlimited |
| Notes | Up to 20 | Unlimited | Unlimited |
| Public feed | View only | Post + like | Post + like |
| Analytics | Basic (30 days) | Full (all time) | Full + team analytics |
| Revision reminders | In-app only | Email digest | Email + Slack integration |
| Code editor | ✅ | ✅ | ✅ |
| LeetCode auto-fill | 20/day | Unlimited | Unlimited |
| Export data | ❌ | ✅ JSON/CSV | ✅ JSON/CSV |
| Custom themes | 2 | 5 + custom accent | 5 + custom accent |
| Leaderboard | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ |

**Payment:** Stripe integration. Monthly and annual billing (annual = 2 months free).

### Free Tier Strategy
The free tier is generous enough to be genuinely useful (100 questions covers most interview preps) but limited in analytics depth and community participation to drive upgrades.

---

## 14. Roadmap & Milestones

### v1.0 — MVP (Target: 8 weeks)
- [ ] Auth (email + Google OAuth)
- [ ] Question CRUD with Monaco editor
- [ ] LeetCode auto-fill
- [ ] Basic analytics dashboard (stats + donut chart)
- [ ] Community public feed (view only)
- [ ] Revision queue (manual marking, no SM-2)
- [ ] Notes (basic Markdown)
- [ ] Mobile responsive
- [ ] Core tests (unit + 3 E2E flows)

### v1.1 — Retention & Engagement (Target: +4 weeks after v1.0)
- [ ] Spaced repetition (SM-2 algorithm) for revision
- [ ] Email revision digest
- [ ] Streak system
- [ ] GitHub heatmap on dashboard
- [ ] Badges (10 initial badges)
- [ ] Like + bookmark on community feed
- [ ] Full-text search (global)

### v1.2 — Growth (Target: +4 weeks after v1.1)
- [ ] XP system + leaderboard
- [ ] Stripe subscription (Free / Pro tiers)
- [ ] Data export (JSON / CSV)
- [ ] Admin moderation dashboard
- [ ] PostHog analytics

### v2.0 — Platform Expansion (Target: Q3 2025)
- [ ] AI-powered insights ("focus on DP next based on your profile")
- [ ] AI code review (submit solution, get complexity analysis)
- [ ] Collaborative lists (share a curated problem list with a friend)
- [ ] Codeforces + HackerRank integration
- [ ] Mobile apps (React Native)
- [ ] Team tier (shared analytics for bootcamps/study groups)

---

## 15. Open Questions & Decisions Needed

| # | Question | Options | Decision Needed By |
|---|----------|---------|-------------------|
| 1 | Should we use TanStack Query or SWR for data fetching? | TanStack Query (more features) vs SWR (simpler) | Before development starts |
| 2 | Global state: Zustand vs Jotai vs Context API? | Zustand (recommended), Jotai, Context | Before development starts |
| 3 | What is the LeetCode API access strategy? | Unofficial GraphQL (fragile) vs RapidAPI proxy (costs money) vs manual entry as fallback | Sprint 1 |
| 4 | Should the public feed be paginated or infinite scroll? | Pagination (simpler, accessible) vs Infinite scroll (better UX) | Before feed development |
| 5 | Self-hosted vs Supabase Cloud? | Supabase Cloud (faster to ship) vs self-hosted (cheaper at scale) | Before infra setup |
| 6 | What is the initial target audience? Students, working SWEs, or both? | Determines marketing, onboarding flow, and default content | ASAP (affects UX copy) |
| 7 | Should streaks reset at midnight in user's local timezone or UTC? | Local timezone (user-friendly) vs UTC (simpler to implement) | Before streak implementation |
| 8 | Free tier question limit: 100 or 200? | 100 (more conversion pressure) vs 200 (more generous, better word-of-mouth) | Before launch |

---

## Appendix A — Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Supabase Edge Functions (server-side only, never in VITE_ prefix)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...        # Edge Function only
STRIPE_WEBHOOK_SECRET=whsec_...      # Edge Function only

# Monitoring
VITE_SENTRY_DSN=https://...
VITE_POSTHOG_KEY=phc_...

# Email (for revision digests)
RESEND_API_KEY=re_...               # Edge Function only
```

---

## Appendix B — Dependency List

### Production
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "@supabase/supabase-js": "^2.x",
  "@monaco-editor/react": "^4.x",
  "@tanstack/react-query": "^5.x",
  "zustand": "^4.x",
  "recharts": "^2.x",
  "react-markdown": "^9.x",
  "react-calendar-heatmap": "^1.x",
  "date-fns": "^3.x",
  "zod": "^3.x",
  "react-hot-toast": "^2.x",
  "lucide-react": "^0.x",
  "@stripe/stripe-js": "^3.x"
}
```

### Dev
```json
{
  "vite": "^5.x",
  "typescript": "^5.x",
  "tailwindcss": "^3.x",
  "vitest": "^1.x",
  "@testing-library/react": "^14.x",
  "@playwright/test": "^1.x",
  "eslint": "^8.x",
  "@sentry/vite-plugin": "^2.x"
}
```

---

*Document maintained by the Revise Wise Zone product team. All decisions made against this spec should be recorded in the project's decision log (ADR folder).*
