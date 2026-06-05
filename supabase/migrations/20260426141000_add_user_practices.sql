-- Create user_practices table
CREATE TABLE IF NOT EXISTS public.user_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Enable RLS
ALTER TABLE public.user_practices ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own practice counts"
ON public.user_practices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own practice counts"
ON public.user_practices FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER user_practices_updated_at BEFORE UPDATE ON public.user_practices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
