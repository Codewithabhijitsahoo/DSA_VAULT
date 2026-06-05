-- Add SM-2 columns to questions table
-- These are necessary for the Spaced Repetition feature
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sm2_interval INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sm2_ease_factor FLOAT NOT NULL DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS sm2_repetitions INTEGER NOT NULL DEFAULT 0;

-- Index for revision queue
CREATE INDEX IF NOT EXISTS idx_questions_next_review ON public.questions(next_review_at) WHERE needs_revision = true OR next_review_at <= now();
