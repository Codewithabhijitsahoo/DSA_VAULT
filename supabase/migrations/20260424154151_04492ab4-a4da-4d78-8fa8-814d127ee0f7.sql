-- Add is_public column to questions
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Index for fast public lookups
CREATE INDEX IF NOT EXISTS idx_questions_is_public ON public.questions(is_public) WHERE is_public = true;

-- Allow anyone (anon + authenticated) to view a question when it's marked public
CREATE POLICY "Anyone can view public questions"
ON public.questions
FOR SELECT
TO anon, authenticated
USING (is_public = true);
